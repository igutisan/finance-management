/**
 * Movement Service
 *
 * Business logic for movement (transaction) management.
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
 *   - A user can only access/modify their own movements
 *   - Budget ownership is validated when creating movements
 */

import type { MovementRepository } from "./repository";
import type { UserRepository } from "../user/repository";
import type { BudgetRepository } from "../budget/repository";
import type { MovementModel } from "./model";
import { ApiError, ErrorCode } from "../../shared/responses";

export abstract class MovementService {
  /**
   * Create a new movement
   *
   * Validates:
   *   - User exists
   *   - Budget exists and belongs to user (if budgetId provided)
   *   - Amount is positive
   */
  static async create(
    userId: string,
    data: MovementModel.CreateBody,
    movementRepo: MovementRepository,
    userRepo: UserRepository,
    budgetRepo: BudgetRepository,
  ): Promise<MovementModel.MovementResponse> {
    // Verify user exists
    const userExists = await userRepo.exists(userId);
    if (!userExists) {
      throw new ApiError(ErrorCode.USER_NOT_FOUND);
    }

    // Verify budget exists and belongs to user (if specified)
    if (data.budgetId) {
      const budget = await budgetRepo.findById(data.budgetId);
      if (!budget) {
        throw new ApiError(ErrorCode.BUDGET_NOT_FOUND);
      }
      if (budget.userId !== userId) {
        throw new ApiError(ErrorCode.BUDGET_OWNERSHIP);
      }
    }

    // Validate amount
    if (Number(data.amount) <= 0) {
      throw new ApiError(ErrorCode.INVALID_AMOUNT);
    }

    // Create movement
    const movement = await movementRepo.create({
      userId,
      budgetId: data.budgetId || null,
      type: data.type,
      amount: data.amount,
      description: data.description,
      category: data.category,
      date: new Date(data.date),
      paymentMethod: data.paymentMethod,
      isRecurring: data.isRecurring || false,
      tags: data.tags || [],
    });

    return this.toMovementResponse(movement);
  }

  /**
   * Get movement by ID
   *
   * Security: validates that the movement belongs to the requesting user
   */
  static async getById(
    id: string,
    userId: string,
    movementRepo: MovementRepository,
  ): Promise<MovementModel.MovementResponse> {
    const movement = await movementRepo.findById(id);
    if (!movement) {
      throw new ApiError(ErrorCode.MOVEMENT_NOT_FOUND);
    }

    // Validate ownership
    if (movement.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Movement does not belong to user",
      });
    }

    return this.toMovementResponse(movement);
  }

  /**
   * Get all movements for a user
   */
  static async getUserMovements(
    userId: string,
    movementRepo: MovementRepository,
  ): Promise<MovementModel.MovementResponse[]> {
    const movements = await movementRepo.findByUserId(userId);
    return movements.map((m) => this.toMovementResponse(m));
  }

  /**
   * Get all movements for a budget
   *
   * Note: This should only be called after validating the budget
   * belongs to the user (done by the controller or calling code)
   */
  static async getBudgetMovements(
    budgetId: string,
    userId: string,
    movementRepo: MovementRepository,
  ): Promise<MovementModel.MovementResponse[]> {
    const movements = await movementRepo.findByBudgetId(budgetId, userId);
    return movements.map((m) => this.toMovementResponse(m));
  }

  /**
   * Update movement
   *
   * Security: validates that the movement belongs to the requesting user
   * before applying any updates
   */
  static async update(
    id: string,
    userId: string,
    data: MovementModel.UpdateBody,
    movementRepo: MovementRepository,
  ): Promise<MovementModel.MovementResponse> {
    // Fetch the existing movement first
    const existingMovement = await movementRepo.findById(id);
    if (!existingMovement) {
      throw new ApiError(ErrorCode.MOVEMENT_NOT_FOUND);
    }

    // Validate ownership BEFORE allowing any modification
    if (existingMovement.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Movement does not belong to user",
      });
    }

    // Validate amount if provided
    if (data.amount && Number(data.amount) <= 0) {
      throw new ApiError(ErrorCode.INVALID_AMOUNT);
    }

    const updateData: any = { ...data };
    if (data.date) {
      updateData.date = new Date(data.date);
    }

    const movement = await movementRepo.update(id, updateData);
    if (!movement) {
      throw new ApiError(ErrorCode.MOVEMENT_NOT_FOUND);
    }

    return this.toMovementResponse(movement);
  }

  /**
   * Delete movement (soft delete)
   *
   * Security: validates that the movement belongs to the requesting user
   * before allowing deletion
   */
  static async delete(
    id: string,
    userId: string,
    movementRepo: MovementRepository,
  ): Promise<boolean> {
    // Fetch the existing movement first
    const existingMovement = await movementRepo.findById(id);
    if (!existingMovement) {
      throw new ApiError(ErrorCode.MOVEMENT_NOT_FOUND);
    }

    // Validate ownership BEFORE allowing deletion
    if (existingMovement.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Movement does not belong to user",
      });
    }

    const deleted = await movementRepo.softDelete(id);
    if (!deleted) {
      throw new ApiError(ErrorCode.MOVEMENT_NOT_FOUND);
    }

    return true;
  }

  /**
   * Get user analytics (total income and expenses)
   */
  static async getUserAnalytics(
    userId: string,
    movementRepo: MovementRepository,
  ): Promise<MovementModel.AnalyticsResponse> {
    const totalIncome = await movementRepo.getTotalByType(userId, "INCOME");
    const totalExpenses = await movementRepo.getTotalByType(userId, "EXPENSE");
    const balance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      balance,
    };
  }

  /**
   * Transform Movement entity to response DTO
   */
  private static toMovementResponse(
    movement: any,
  ): MovementModel.MovementResponse {
    return {
      id: movement.id,
      userId: movement.userId,
      budgetId: movement.budgetId,
      type: movement.type,
      amount: movement.amount,
      description: movement.description,
      category: movement.category,
      date: movement.date,
      paymentMethod: movement.paymentMethod,
      isRecurring: movement.isRecurring,
      tags: movement.tags,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
    };
  }
}
