/**
 * Movement Service
 *
 * Business logic for movement management.
 */

import type { MovementRepository } from "./repository";
import type { UserRepository } from "../user/repository";
import { BudgetPeriodRepository } from "../budget/period-repository";
import type { MovementModel } from "./model";
import { ApiError, ErrorCode } from "../../shared/responses";
import {
  type PaginatedResult,
  buildPaginationMeta,
} from "../../shared/types/pagination.types";

export abstract class MovementService {
  /**
   * Create a new movement.
   *
   * If `budgetId` is provided (and no `periodId`), automatically resolves
   * the active period for the movement's date — so the frontend only needs
   * to know the budget, not the specific period.
   */
  static async create(
    userId: string,
    data: MovementModel.CreateBody,
    movementRepo: MovementRepository,
    userRepo: UserRepository,
    periodRepo: BudgetPeriodRepository,
  ): Promise<MovementModel.MovementResponse> {
    const userExists = await userRepo.exists(userId);
    if (!userExists) {
      throw new ApiError(ErrorCode.USER_NOT_FOUND);
    }

    // Validate amount
    const parsedAmount = Number(data.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new ApiError(ErrorCode.INVALID_AMOUNT);
    }

    // Resolve periodId: prefer explicit periodId, else auto-detect from budgetId + date
    let resolvedPeriodId: string | null = data.periodId || null;

    if (!resolvedPeriodId && data.budgetId) {
      const movementDate = new Date(data.date);
      const activePeriod = await periodRepo.findCurrentPeriod(
        data.budgetId,
        movementDate,
      );
      if (!activePeriod) {
        throw new ApiError(ErrorCode.NOT_FOUND, {
          message: "No active period found for this budget on the given date",
        });
      }
      resolvedPeriodId = activePeriod.id;
    } else if (resolvedPeriodId) {
      // Validate explicit periodId exists
      const period = await periodRepo.findById(resolvedPeriodId);
      if (!period) {
        throw new ApiError(ErrorCode.NOT_FOUND, { message: "Period not found" });
      }
    }

    const movement = await movementRepo.create({
      userId,
      periodId: resolvedPeriodId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: new Date(data.date),
      paymentMethod: data.paymentMethod,
      isRecurring: data.isRecurring || false,
      tags: data.tags || [],
    });

    return this.toMovementResponse(movement);
  }

  /**
   * Get movement by ID
   */
  static async getById(
    movementId: string,
    userId: string,
    movementRepo: MovementRepository,
  ): Promise<MovementModel.MovementResponse> {
    const movement = await movementRepo.findById(movementId);
    if (!movement) {
      throw new ApiError(ErrorCode.MOVEMENT_NOT_FOUND);
    }
    if (movement.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Movement does not belong to user",
      });
    }
    return this.toMovementResponse(movement);
  }

  /**
   * Get all movements for a user (paginated)
   */
  static async getUserMovements(
    userId: string,
    options: MovementModel.QueryParams,
    movementRepo: MovementRepository,
  ): Promise<PaginatedResult<MovementModel.MovementResponse>> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const { items, total } = await movementRepo.findByUserIdPaginated(userId, {
      page,
      limit,
      type: options.type,
      month: options.month,
      year: options.year,
      budgetId: options.budgetId,
    });

    return {
      items: items.map(this.toMovementResponse),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Get movements for a specific period
   */
  static async getPeriodMovements(
    periodId: string,
    userId: string,
    movementRepo: MovementRepository,
    periodRepo: BudgetPeriodRepository,
  ): Promise<MovementModel.MovementResponse[]> {
    // Verify period exists
    const period = await periodRepo.findById(periodId);
    if (!period) {
      throw new ApiError(ErrorCode.NOT_FOUND, {
        message: "Period not found",
      });
    }

    const movements = await movementRepo.findByPeriodId(periodId, userId);
    return movements.map(this.toMovementResponse);
  }

  /**
   * Update movement
   */
  static async update(
    movementId: string,
    userId: string,
    data: MovementModel.UpdateBody,
    movementRepo: MovementRepository,
    periodRepo: BudgetPeriodRepository,
  ): Promise<MovementModel.MovementResponse> {
    const existingMovement = await movementRepo.findById(movementId);
    if (!existingMovement) {
      throw new ApiError(ErrorCode.MOVEMENT_NOT_FOUND);
    }
    if (existingMovement.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Movement does not belong to user",
      });
    }

    // Verify new period if provided
    if (data.periodId) {
      const period = await periodRepo.findById(data.periodId);
      if (!period) {
        throw new ApiError(ErrorCode.NOT_FOUND, {
          message: "Period not found",
        });
      }
    }

    // Validate amount if provided
    if (data.amount !== undefined) {
      const parsedAmount = Number(data.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new ApiError(ErrorCode.INVALID_AMOUNT);
      }
    }

    const updateData: any = { ...data };
    if (data.date) {
      updateData.date = new Date(data.date);
    }

    const movement = await movementRepo.update(movementId, updateData);
    if (!movement) {
      throw new ApiError(ErrorCode.MOVEMENT_NOT_FOUND);
    }
    return this.toMovementResponse(movement);
  }

  /**
   * Delete movement (soft delete)
   */
  static async delete(
    movementId: string,
    userId: string,
    movementRepo: MovementRepository,
  ): Promise<void> {
    const movement = await movementRepo.findById(movementId);
    if (!movement) {
      throw new ApiError(ErrorCode.MOVEMENT_NOT_FOUND);
    }
    if (movement.userId !== userId) {
      throw new ApiError(ErrorCode.FORBIDDEN, {
        message: "Movement does not belong to user",
      });
    }
    await movementRepo.softDelete(movementId);
  }

  /**
   * Get analytics (total income, expenses, balance)
   */
  static async getAnalytics(
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
  private static toMovementResponse(movement: any): MovementModel.MovementResponse {
    return {
      id: movement.id,
      userId: movement.userId,
      periodId: movement.periodId,
      type: movement.type,
      amount: movement.amount,
      description: movement.description,
      date: movement.date,
      paymentMethod: movement.paymentMethod,
      isRecurring: movement.isRecurring,
      budgetName: movement.budgetName,
      tags: movement.tags,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
    };
  }
}
