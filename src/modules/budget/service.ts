/**
 * Budget Service
 *
 * Business logic for budget management.
 *
 * Throws ApiError instead of Elysia's status() so the global
 * error handler can produce the generic error envelope automatically.
 * Returns raw data — the controller wraps it with ok() / created().
 */

import { BudgetRepository } from "./repository";
import { UserRepository } from "../user/repository";
import { MovementRepository } from "../movement/repository";
import type { BudgetModel } from "./model";
import { ApiError, ErrorCode } from "../../shared/responses";

export abstract class BudgetService {
  /**
   * Create a new budget
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

    // Validate amount
    if (Number(data.amount) <= 0) {
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
   */
  static async getById(
    id: string,
    budgetRepo: BudgetRepository,
  ): Promise<BudgetModel.BudgetResponse> {
    const budget = await budgetRepo.findById(id);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }

    return this.toBudgetResponse(budget);
  }

  /**
   * Get all budgets for a user
   */
  static async getUserBudgets(
    userId: string,
    budgetRepo: BudgetRepository,
  ): Promise<BudgetModel.BudgetResponse[]> {
    const budgets = await budgetRepo.findByUserId(userId);
    return budgets.map((b) => this.toBudgetResponse(b));
  }

  /**
   * Update budget
   */
  static async update(
    id: string,
    data: BudgetModel.UpdateBody,
    budgetRepo: BudgetRepository,
  ): Promise<BudgetModel.BudgetResponse> {
    // Validate dates if both are provided
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      if (endDate < startDate) {
        throw new ApiError(ErrorCode.INVALID_DATE_RANGE);
      }
    }

    // Validate amount if provided
    if (data.amount && Number(data.amount) <= 0) {
      throw new ApiError(ErrorCode.INVALID_AMOUNT);
    }

    const budget = await budgetRepo.update(id, data);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }

    return this.toBudgetResponse(budget);
  }

  /**
   * Delete budget (soft delete)
   */
  static async delete(
    id: string,
    budgetRepo: BudgetRepository,
  ): Promise<boolean> {
    const deleted = await budgetRepo.softDelete(id);
    if (!deleted) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }
    return true;
  }

  /**
   * Get budget summary with total spent vs budgeted
   */
  static async getSummary(
    budgetId: string,
    budgetRepo: BudgetRepository,
    movementRepo: MovementRepository,
  ): Promise<BudgetModel.BudgetSummaryResponse> {
    const budget = await budgetRepo.findById(budgetId);
    if (!budget) {
      throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
    }

    // Get all movements for this budget
    const movements = await movementRepo.findByBudgetId(budgetId);

    // Calculate total spent (EXPENSE movements)
    const totalSpent = movements
      .filter((m) => m.type === "EXPENSE")
      .reduce((sum, m) => sum + Number(m.amount), 0);

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
