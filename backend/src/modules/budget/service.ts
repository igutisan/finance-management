/**
 * Budget Service
 *
 * Business logic for budget management with recurring budgets.
 */

import type { BudgetRepository } from "./repository";
import type { UserRepository } from "../user/repository";
import type { MovementRepository } from "../movement/repository";
import { BudgetPeriodRepository } from "./period-repository";
import type { BudgetModel } from "./model";
import { ApiError, ErrorCode } from "../../shared/responses";
import {
  type PaginatedResult,
  buildPaginationMeta,
} from "../../shared/types/pagination.types";
import { generatePeriods, type RecurrenceType } from "./period-generator";
import type { BudgetPeriod } from "../../shared/db/schema";

export abstract class BudgetService {
  /**
   * Create a new budget with period generation
   */
  static async create(
    userId: string,
    data: BudgetModel.CreateBody,
    budgetRepo: BudgetRepository,
    userRepo: UserRepository,
    periodRepo: BudgetPeriodRepository,
  ): Promise<BudgetModel.BudgetWithPeriodsResponse> {
    const userExists = await userRepo.exists(userId);
    if (!userExists) {
      throw new ApiError(ErrorCode.USER_NOT_FOUND);
    }

    // Validate recurrence + dates
    if (data.recurrence === "NONE" && !data.endDate) {
      throw new ApiError(ErrorCode.INVALID_DATE_RANGE, {
        message: "endDate is required for NONE recurrence",
      });
    }

    // Validate amount
    const parsedAmount = Number(data.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new ApiError(ErrorCode.INVALID_AMOUNT);
    }

    // Create budget
    const budget = await budgetRepo.create({
      userId,
      name: data.name,
      description: data.description,
      recurrence: data.recurrence,
      currency: data.currency || "USD",
    });

    // Generate periods
    const periodsToGenerate = data.periodsToGenerate || 12;
    const periodData = generatePeriods(
      data.startDate,
      data.endDate || null,
      data.recurrence as RecurrenceType,
      data.amount,
      periodsToGenerate,
    );

    const periods = await periodRepo.createMany(
      periodData.map((p) => ({
        budgetId: budget.id,
        startDate: p.startDate,
        endDate: p.endDate,
        amount: p.amount,
      }))
    );

    return {
      budget: this.toBudgetResponse(budget),
      periods: periods.map(this.toPeriodResponse),
    };
  }

  /**
   * Get budget by ID
   */
  static async getById(
    budgetId: string,
    userId: string,
    budgetRepo: BudgetRepository,
  ): Promise<BudgetModel.BudgetResponse> {
    const budget = await budgetRepo.findById(budgetId);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }
    if (budget.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Budget does not belong to user",
      });
    }
    return this.toBudgetResponse(budget);
  }

  /**
   * Get all budgets for a user (paginated) — enriched with current period spending.
   *
   */
  static async getUserBudgets(
    userId: string,
    options: BudgetModel.QueryParams,
    budgetRepo: BudgetRepository,
  ): Promise<PaginatedResult<BudgetModel.BudgetCardResponse>> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const { items, total } = await budgetRepo.findByUserIdPaginatedWithSpending(
      userId,
      { page, limit, isActive: options.isActive },
    );

    const enriched: BudgetModel.BudgetCardResponse[] = items.map((item) => {
      const periodAmount = item.currentPeriod
        ? Number(item.currentPeriod.amount)
        : 0;
      const remaining = periodAmount - item.totalSpent;
      const percentageUsed =
        periodAmount > 0
          ? Math.round((item.totalSpent / periodAmount) * 100 * 10) / 10
          : 0;

      return {
        id: item.id,
        userId: item.userId,
        name: item.name,
        description: item.description,
        recurrence: item.recurrence,
        currency: item.currency,
        isActive: item.isActive,
        currentPeriod: item.currentPeriod,
        totalSpent: item.totalSpent,
        remaining,
        percentageUsed,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    return {
      items: enriched,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Update budget
   */
  static async update(
    budgetId: string,
    userId: string,
    data: BudgetModel.UpdateBody,
    budgetRepo: BudgetRepository,
    periodRepo: BudgetPeriodRepository,
  ): Promise<BudgetModel.BudgetResponse> {
    const existingBudget = await budgetRepo.findById(budgetId);
    if (!existingBudget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }
    if (existingBudget.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Budget does not belong to user",
      });
    }

    const budget = await budgetRepo.update(budgetId, data);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }

    return this.toBudgetResponse(budget);
  }

  /**
   * Delete budget (soft delete)
   */
  static async delete(
    budgetId: string,
    userId: string,
    budgetRepo: BudgetRepository,
  ): Promise<void> {
    const budget = await budgetRepo.findById(budgetId);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }
    if (budget.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Budget does not belong to user",
      });
    }
    await budgetRepo.softDelete(budgetId);
  }

  /**
   * Get budget summary with current period spending
   */
  static async getSummary(
    budgetId: string,
    userId: string,
    budgetRepo: BudgetRepository,
    movementRepo: MovementRepository,
    periodRepo: BudgetPeriodRepository,
  ): Promise<BudgetModel.BudgetSummaryResponse> {
    const budget = await budgetRepo.findById(budgetId);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }
    if (budget.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Budget does not belong to user",
      });
    }

    // Find current period
    const currentPeriod = await periodRepo.findCurrentPeriod(budgetId, new Date());

    if (!currentPeriod) {
      // No active period for current date, hence no budget limit active
      return {
        budget: this.toBudgetResponse(budget),
        currentPeriod: null,
        totalSpent: 0,
        remaining: 0,
        percentageUsed: 0,
      };
    }

    // Get total spent for current period
    const totalSpent = await movementRepo.getPeriodTotalSpent(currentPeriod.id, userId);
    const periodAmount = Number(currentPeriod.amount);
    const remaining = periodAmount - totalSpent;
    const percentageUsed = periodAmount > 0 ? (totalSpent / periodAmount) * 100 : 0;

    return {
      budget: this.toBudgetResponse(budget),
      currentPeriod: this.toPeriodResponse(currentPeriod),
      totalSpent,
      remaining,
      percentageUsed,
    };
  }

  /**
   * Get all periods for a budget
   */
  static async getPeriods(
    budgetId: string,
    userId: string,
    query: { year?: number; month?: number },
    budgetRepo: BudgetRepository,
    periodRepo: BudgetPeriodRepository,
  ): Promise<BudgetModel.PeriodResponse[]> {
    const budget = await budgetRepo.findById(budgetId);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }
    if (budget.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN);
    }

    const periods = await periodRepo.findByBudgetId(budgetId, query);
    return periods.map(this.toPeriodResponse);
  }

  /**
   * Update a specific period
   */
  static async updatePeriod(
    budgetId: string,
    periodId: string,
    userId: string,
    data: BudgetModel.UpdatePeriodBody,
    budgetRepo: BudgetRepository,
    periodRepo: BudgetPeriodRepository,
  ): Promise<BudgetModel.PeriodResponse> {
    const budget = await budgetRepo.findById(budgetId);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }
    if (budget.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN);
    }

    const period = await periodRepo.findById(periodId);
    if (!period || period.budgetId !== budgetId) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: "Period not found" });
    }

    // Prevent updating past periods
    const today = new Date().toISOString().split('T')[0];
    if (period.endDate < today) {
      throw new ApiError(ErrorCode.BAD_REQUEST, {
        message: "Cannot update periods that have already ended",
      });
    }

    // Validate amount if provided
    if (data.amount !== undefined) {
      const parsedAmount = Number(data.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new ApiError(ErrorCode.INVALID_AMOUNT);
      }
    }

    const { updateFuturePeriods, ...updateData } = data;

    const updated = await periodRepo.update(periodId, updateData);
    if (!updated) {
      throw new ApiError(ErrorCode.NOT_FOUND);
    }

    // If requested, cascade the amount change to all periods starting from this one.
    if (data.amount !== undefined && updateFuturePeriods) {
      await periodRepo.updateFuturePeriodsAmountFromDate(budgetId, data.amount, period.startDate);
    }

    return this.toPeriodResponse(updated);
  }

  /**
   * Extend periods (generate more)
   */
  static async extendPeriods(
    budgetId: string,
    userId: string,
    data: BudgetModel.ExtendPeriodsBody,
    budgetRepo: BudgetRepository,
    periodRepo: BudgetPeriodRepository,
  ): Promise<BudgetModel.PeriodResponse[]> {
    const budget = await budgetRepo.findById(budgetId);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }
    if (budget.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN);
    }
    if (budget.recurrence === "NONE") {
      throw new ApiError(ErrorCode.BAD_REQUEST, {
        message: "Cannot extend periods for NONE recurrence",
      });
    }

    const lastPeriod = await periodRepo.findLastPeriod(budgetId);
    if (!lastPeriod) {
      throw new ApiError(ErrorCode.NOT_FOUND, { message: "No periods found" });
    }

    // Generate new periods starting from day after last period
    const nextStart = new Date(lastPeriod.endDate);
    nextStart.setDate(nextStart.getDate() + 1);

    const periodData = generatePeriods(
      nextStart.toISOString().split("T")[0],
      null,
      budget.recurrence as RecurrenceType,
      lastPeriod.amount, // Use the amount of the last period as template
      data.periodsToGenerate,
    );

    const newPeriods = await periodRepo.createMany(
      periodData.map((p) => ({
        budgetId: budget.id,
        startDate: p.startDate,
        endDate: p.endDate,
        amount: p.amount,
      }))
    );

    return newPeriods.map(this.toPeriodResponse);
  }

  /**
   * Transform Budget entity to response DTO
   */
  private static toBudgetResponse(budget: any): BudgetModel.BudgetResponse {
    return {
      id: budget.id,
      userId: budget.userId,
      name: budget.name,
      description: budget.description,
      recurrence: budget.recurrence,
      currency: budget.currency,
      isActive: budget.isActive,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }

  /**
   * Transform BudgetPeriod entity to response DTO
   */
  private static toPeriodResponse(period: BudgetPeriod): BudgetModel.PeriodResponse {
    return {
      id: period.id,
      budgetId: period.budgetId,
      startDate: period.startDate,
      endDate: period.endDate,
      amount: period.amount,
      isActive: period.isActive,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    };
  }
}
