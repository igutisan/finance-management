/**
 * Budget Service
 *
 * Business logic for budget management.
 *
 * Following Elysia's official best practice:
 *   - abstract class with static methods (no class allocation)
 *   - Repositories passed as parameters from the controller
 *   - Throws ApiError so the error-handler plugin produces the
 *     generic error envelope automatically
 *   - Returns raw data — the controller wraps it with ok() / created()
 *
 * Security:
 *   - ALL operations (read, update, delete) validate ownership
 *   - A user can only access/modify their own budgets
 */

import type { BudgetRepository } from "./repository";
import type { UserRepository } from "../user/repository";
import type { MovementRepository } from "../movement/repository";
import type { BudgetModel } from "./model";
import { ApiError, ErrorCode } from "../../shared/responses";
import {
  type PaginatedResult,
  buildPaginationMeta,
} from "../../shared/types/pagination.types";

export abstract class BudgetService {
  /**
   * Create a new budget
   *
   * Validates:
   *   - User exists
   *   - End date is after start date
   *   - Amount is positive
   */
  static async create(
    userId: string,
    data: BudgetModel.CreateBody,
    budgetRepo: BudgetRepository,
    userRepo: UserRepository,
  ): Promise<BudgetModel.BudgetResponse> {
    // Verify user exists
    const userExists = await userRepo.exists(userId);
    if (!userExists) {
      throw new ApiError(ErrorCode.USER_NOT_FOUND);
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate < startDate) {
      throw new ApiError(ErrorCode.INVALID_DATE_RANGE);
    }

    // Validate amount is a valid positive number
    const parsedAmount = Number(data.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new ApiError(ErrorCode.INVALID_AMOUNT);
    }

    // Create budget
    const budget = await budgetRepo.create({
      userId,
      name: data.name,
      description: data.description,
      amount: data.amount,
      category: data.category,
      startDate: data.startDate,
      endDate: data.endDate,
      currency: data.currency || "USD",
    });

    return this.toBudgetResponse(budget);
  }

  /**
   * Get budget by ID
   *
   * Security: validates that the budget belongs to the requesting user
   */
  static async getById(
    id: string,
    userId: string,
    budgetRepo: BudgetRepository,
  ): Promise<BudgetModel.BudgetResponse> {
    const budget = await budgetRepo.findById(id);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }

    // Validate ownership
    if (budget.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Budget does not belong to user",
      });
    }

    return this.toBudgetResponse(budget);
  }

  /**
   * Get all budgets for a user (paginated + filtered)
   */
  static async getUserBudgets(
    userId: string,
    options: {
      page: number;
      limit: number;
      category?: string;
      isActive?: boolean;
    },
    budgetRepo: BudgetRepository,
  ): Promise<PaginatedResult<BudgetModel.BudgetResponse>> {
    const { items, total } = await budgetRepo.findByUserIdPaginated(
      userId,
      options,
    );

    return {
      items: items.map((b) => this.toBudgetResponse(b)),
      meta: buildPaginationMeta(total, options.page, options.limit),
    };
  }

  /**
   * Update budget
   *
   * Security: validates that the budget belongs to the requesting user
   * before applying any updates
   */
  static async update(
    id: string,
    userId: string,
    data: BudgetModel.UpdateBody,
    budgetRepo: BudgetRepository,
  ): Promise<BudgetModel.BudgetResponse> {
    // Fetch the existing budget first
    const existingBudget = await budgetRepo.findById(id);
    if (!existingBudget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }

    // Validate ownership BEFORE allowing any modification
    if (existingBudget.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Budget does not belong to user",
      });
    }

    // Validate dates if both are provided
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      if (endDate < startDate) {
        throw new ApiError(ErrorCode.INVALID_DATE_RANGE);
      }
    }

    // Validate amount if provided
    if (data.amount !== undefined) {
      const parsedAmount = Number(data.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new ApiError(ErrorCode.INVALID_AMOUNT);
      }
    }

    const budget = await budgetRepo.update(id, data);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }

    return this.toBudgetResponse(budget);
  }

  /**
   * Delete budget (soft delete)
   *
   * Security: validates that the budget belongs to the requesting user
   * before allowing deletion
   */
  static async delete(
    id: string,
    userId: string,
    budgetRepo: BudgetRepository,
  ): Promise<boolean> {
    // Fetch the existing budget first
    const existingBudget = await budgetRepo.findById(id);
    if (!existingBudget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }

    // Validate ownership BEFORE allowing deletion
    if (existingBudget.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Budget does not belong to user",
      });
    }

    const deleted = await budgetRepo.softDelete(id);
    if (!deleted) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }

    return true;
  }

  /**
   * Get budget summary with total spent vs budgeted
   *
   * Security: validates that the budget belongs to the requesting user
   */
  static async getSummary(
    budgetId: string,
    userId: string,
    budgetRepo: BudgetRepository,
    movementRepo: MovementRepository,
  ): Promise<BudgetModel.BudgetSummaryResponse> {
    const budget = await budgetRepo.findById(budgetId);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }

    // Validate ownership
    if (budget.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Budget does not belong to user",
      });
    }

    // Get total spent directly from DB (more efficient)
    const totalSpent = await movementRepo.getBudgetTotalSpent(budgetId, userId);

    const budgetAmount = Number(budget.amount);
    const remaining = budgetAmount - totalSpent;
    const percentageUsed =
      budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

    return {
      budget: this.toBudgetResponse(budget),
      totalSpent,
      remaining,
      percentageUsed,
    };
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
      amount: budget.amount,
      category: budget.category,
      startDate: budget.startDate,
      endDate: budget.endDate,
      currency: budget.currency,
      isActive: budget.isActive,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }
}
