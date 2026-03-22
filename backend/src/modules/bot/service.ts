/**
 * Bot Service
 *
 * Business logic for bot-specific operations.
 * Reuses existing repositories but with phone-based identification.
 */

import type { UserRepository } from "../user/repository";
import type { MovementRepository } from "../movement/repository";
import type { BudgetRepository } from "../budget/repository";
import type { BudgetPeriodRepository } from "../budget/period-repository";
import type { BotModel } from "./model";
import { PasswordUtil } from "../../shared/utils/password.util";
import { ApiError, ErrorCode } from "../../shared/responses";

export abstract class BotService {
  /**
   * Identify a user by phone number.
   * Returns exists: false if no user found (bot will redirect to web registration).
   */
  static async identify(
    phone: string,
    userRepo: UserRepository,
  ): Promise<BotModel.IdentifyResponse> {
    const user = await userRepo.findByPhone(phone);

    if (!user) {
      return { exists: false };
    }

    return {
      exists: true,
      firstName: user.firstName,
      hasBotPin: !!user.botPin,
    };
  }

  /**
   * Verify user's bot PIN and return a short-lived token.
   * The token is a simple signed payload (not a full JWT session).
   */
  static async verifyPin(
    phone: string,
    pin: string,
    userRepo: UserRepository,
    jwt: { sign: (payload: any) => Promise<string> },
  ): Promise<BotModel.VerifyPinResponse> {
    const user = await userRepo.findByPhone(phone);

    if (!user) {
      throw new ApiError(ErrorCode.PHONE_NOT_FOUND);
    }

    if (!user.botPin) {
      throw new ApiError(ErrorCode.BOT_PIN_NOT_SET);
    }

    const isValid = await PasswordUtil.verify(user.botPin, pin);
    if (!isValid) {
      throw new ApiError(ErrorCode.BOT_PIN_INVALID);
    }

    // Short-lived token (5 minutes) for protected bot queries
    const token = await jwt.sign({
      sub: user.id,
      type: "bot-pin",
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    });

    return {
      token,
      expiresIn: 300,
    };
  }

  /**
   * Create a movement from the bot (identified by phone number).
   * Automatically resolves the current date and active period.
   */
  static async createMovement(
    data: BotModel.CreateMovementBody,
    userRepo: UserRepository,
    movementRepo: MovementRepository,
    periodRepo: BudgetPeriodRepository,
  ): Promise<BotModel.MovementCreatedResponse> {
    const user = await userRepo.findByPhone(data.phone);
    if (!user) {
      throw new ApiError(ErrorCode.PHONE_NOT_FOUND);
    }

    // Validate amount
    const parsedAmount = Number(data.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new ApiError(ErrorCode.INVALID_AMOUNT);
    }

    // Resolve period from budget if provided
    let resolvedPeriodId: string | null = null;

    if (data.budgetId) {
      const now = new Date();
      const activePeriod = await periodRepo.findCurrentPeriod(
        data.budgetId,
        now,
      );
      if (activePeriod) {
        resolvedPeriodId = activePeriod.id;
      }
    }

    const movement = await movementRepo.create({
      userId: user.id,
      periodId: resolvedPeriodId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: new Date(),
      isRecurring: false,
      tags: [],
    });

    return {
      id: movement.id,
      type: movement.type,
      amount: movement.amount,
      description: movement.description,
      budgetName: null,
    };
  }

  /**
   * Get active budgets with current period spending for a user (by phone).
   */
  static async getBudgets(
    phone: string,
    userRepo: UserRepository,
    budgetRepo: BudgetRepository,
  ): Promise<BotModel.BudgetsListResponse> {
    const user = await userRepo.findByPhone(phone);
    if (!user) {
      throw new ApiError(ErrorCode.PHONE_NOT_FOUND);
    }

    const { items } = await budgetRepo.findByUserIdPaginatedWithSpending(
      user.id,
      { page: 1, limit: 50, isActive: true },
    );

    return items.map((b: any) => {
      const periodAmount = b.currentPeriod ? Number(b.currentPeriod.amount) : 0;
      const totalSpent = b.totalSpent ?? 0;
      const remaining = periodAmount - totalSpent;
      const percentageUsed =
        periodAmount > 0
          ? Math.round((totalSpent / periodAmount) * 100 * 10) / 10
          : 0;

      return {
        id: b.id,
        name: b.name,
        amount: periodAmount.toString(),
        spent: totalSpent.toString(),
        remaining,
        percentageUsed,
      };
    });
  }

  /**
   * List active budget names for a user (by phone).
   * Returns only id and name — no sensitive spending data.
   * Used by the bot to show a budget selection menu when registering movements.
   */
  static async listBudgetNames(
    phone: string,
    userRepo: UserRepository,
    budgetRepo: BudgetRepository,
  ): Promise<BotModel.BudgetNamesResponse> {
    const user = await userRepo.findByPhone(phone);
    if (!user) {
      throw new ApiError(ErrorCode.PHONE_NOT_FOUND);
    }

    const { items } = await budgetRepo.findByUserIdPaginatedWithSpending(
      user.id,
      { page: 1, limit: 50, isActive: true },
    );

    return items.map((b: any) => ({
      id: b.id,
      name: b.name,
    }));
  }

  /**
   * Get financial analytics for a user (by phone).
   */
  static async getAnalytics(
    phone: string,
    userRepo: UserRepository,
    movementRepo: MovementRepository,
  ): Promise<BotModel.AnalyticsResponse> {
    const user = await userRepo.findByPhone(phone);
    if (!user) {
      throw new ApiError(ErrorCode.PHONE_NOT_FOUND);
    }

    const totalIncome = await movementRepo.getTotalByType(user.id, "INCOME");
    const totalExpenses = await movementRepo.getTotalByType(user.id, "EXPENSE");
    const balance = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, balance };
  }
}
