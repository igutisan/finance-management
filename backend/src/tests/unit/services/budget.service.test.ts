/**
 * Budget Service Tests
 * 
 * Unit tests for BudgetService with recurring budgets support.
 */

import { describe, expect, it, mock, beforeEach } from "bun:test";
import { BudgetService } from "../../../modules/budget/service";
import { ApiError, ErrorCode } from "../../../shared/responses";
import type { BudgetRepository } from "../../../modules/budget/repository";
import type { UserRepository } from "../../../modules/user/repository";
import type { MovementRepository } from "../../../modules/movement/repository";
import type { BudgetPeriodRepository } from "../../../modules/budget/period-repository";

describe("BudgetService", () => {
  // --- Setup Mocks ---
  let mockUserRepo: UserRepository;
  let mockBudgetRepo: BudgetRepository;
  let mockMovementRepo: MovementRepository;
  let mockPeriodRepo: BudgetPeriodRepository;

  beforeEach(() => {
    mockUserRepo = {
      exists: mock(() => Promise.resolve(true)),
    } as unknown as UserRepository;

    mockBudgetRepo = {
      create: mock((data: any) =>
        Promise.resolve({
          id: "budget-1",
          userId: data.userId,
          name: data.name,
          description: data.description,
          amount: data.amount,
          recurrence: data.recurrence,
          currency: data.currency,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      findById: mock((id: string) =>
        Promise.resolve({
          id,
          userId: "user-1",
          name: "Test Budget",
          amount: "1000",
          recurrence: "MONTHLY",
          currency: "USD",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      update: mock((id: string, data: any) =>
        Promise.resolve({
          id,
          userId: "user-1",
          name: data.name || "Updated Budget",
          amount: data.amount || "1000",
          recurrence: "MONTHLY",
          currency: "USD",
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      softDelete: mock(() => Promise.resolve()),
      findByUserIdPaginated: mock(() =>
        Promise.resolve({ items: [], total: 0 })
      ),
    } as unknown as BudgetRepository;

    mockPeriodRepo = {
      createMany: mock((periods: any[]) =>
        Promise.resolve(
          periods.map((p, idx) => ({
            id: `period-${idx}`,
            budgetId: p.budgetId,
            startDate: p.startDate,
            endDate: p.endDate,
            amount: p.amount,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        )
      ),
      findById: mock((id: string) =>
        Promise.resolve({
          id,
          budgetId: "budget-1",
          startDate: "2026-02-01",
          endDate: "2026-02-28",
          amount: "500",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      findByBudgetId: mock(() => Promise.resolve([])),
      findCurrentPeriod: mock(() =>
        Promise.resolve({
          id: "period-current",
          budgetId: "budget-1",
          startDate: "2026-02-01",
          endDate: "2026-02-28",
          amount: "500",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      findLastPeriod: mock(() =>
        Promise.resolve({
          id: "period-last",
          budgetId: "budget-1",
          startDate: "2027-01-01",
          endDate: "2027-01-31",
          amount: "500",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      update: mock((id: string, data: any) =>
        Promise.resolve({
          id,
          budgetId: "budget-1",
          startDate: "2026-02-01",
          endDate: "2026-02-28",
          amount: data.amount || "500",
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    } as unknown as BudgetPeriodRepository;

    mockMovementRepo = {
      getPeriodTotalSpent: mock(() => Promise.resolve(250)),
    } as unknown as MovementRepository;
  });

  // --- Tests ---

  describe("create", () => {
    it("should create a MONTHLY budget with 12 periods by default", async () => {
      const result = await BudgetService.create(
        "user-1",
        {
          name: "Food Budget",
          amount: "500",
          recurrence: "MONTHLY",
          startDate: "2026-02-01",
        },
        mockBudgetRepo,
        mockUserRepo,
        mockPeriodRepo
      );

      expect(result.budget.name).toBe("Food Budget");
      expect(result.budget.amount).toBe("500");
      expect(result.budget.recurrence).toBe("MONTHLY");
      expect(result.periods).toHaveLength(12);
      expect(mockPeriodRepo.createMany).toHaveBeenCalledTimes(1);
    });

    it("should create a WEEKLY budget with custom period count", async () => {
      const result = await BudgetService.create(
        "user-1",
        {
          name: "Weekly Budget",
          amount: "100",
          recurrence: "WEEKLY",
          startDate: "2026-02-01",
          periodsToGenerate: 4,
        },
        mockBudgetRepo,
        mockUserRepo,
        mockPeriodRepo
      );

      expect(result.budget.recurrence).toBe("WEEKLY");
      expect(result.periods).toHaveLength(4);
    });

    it("should create a NONE budget with exactly 1 period", async () => {
      const result = await BudgetService.create(
        "user-1",
        {
          name: "Vacation",
          amount: "2000",
          recurrence: "NONE",
          startDate: "2026-03-01",
          endDate: "2026-03-15",
        },
        mockBudgetRepo,
        mockUserRepo,
        mockPeriodRepo
      );

      expect(result.budget.recurrence).toBe("NONE");
      expect(result.periods).toHaveLength(1);
      expect(result.periods[0].startDate).toBe("2026-03-01");
      expect(result.periods[0].endDate).toBe("2026-03-15");
    });

    it("should throw error if NONE recurrence missing endDate", async () => {
      expect(
        BudgetService.create(
          "user-1",
          {
            name: "Invalid",
            amount: "1000",
            recurrence: "NONE",
            startDate: "2026-02-01",
          },
          mockBudgetRepo,
          mockUserRepo,
          mockPeriodRepo
        )
      ).rejects.toThrow(ApiError);
    });

    it("should throw USER_NOT_FOUND if user does not exist", async () => {
      const userRepoOverride = {
        exists: mock(() => Promise.resolve(false)),
      } as unknown as UserRepository;

      expect(
        BudgetService.create(
          "user-1",
          {
            name: "Test",
            amount: "1000",
            recurrence: "MONTHLY",
            startDate: "2026-02-01",
          },
          mockBudgetRepo,
          userRepoOverride,
          mockPeriodRepo
        )
      ).rejects.toThrow(ApiError);
    });

    it("should throw INVALID_AMOUNT for negative amount", async () => {
      expect(
        BudgetService.create(
          "user-1",
          {
            name: "Test",
            amount: "-100",
            recurrence: "MONTHLY",
            startDate: "2026-02-01",
          },
          mockBudgetRepo,
          mockUserRepo,
          mockPeriodRepo
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getSummary", () => {
    it("should return summary with current period spending", async () => {
      const result = await BudgetService.getSummary(
        "budget-1",
        "user-1",
        mockBudgetRepo,
        mockMovementRepo,
        mockPeriodRepo
      );

      expect(result.budget.id).toBe("budget-1");
      expect(result.currentPeriod).not.toBeNull();
      expect(result.currentPeriod?.id).toBe("period-current");
      expect(result.totalSpent).toBe(250);
      expect(result.remaining).toBe(250); // 500 - 250
      expect(result.percentageUsed).toBe(50);
    });

    it("should return null currentPeriod if no active period", async () => {
      const periodRepoOverride = {
        findCurrentPeriod: mock(() => Promise.resolve(undefined)),
      } as unknown as BudgetPeriodRepository;

      const result = await BudgetService.getSummary(
        "budget-1",
        "user-1",
        mockBudgetRepo,
        mockMovementRepo,
        periodRepoOverride
      );

      expect(result.currentPeriod).toBeNull();
      expect(result.totalSpent).toBe(0);
      expect(result.remaining).toBe(1000);
    });

    it("should throw FORBIDDEN if budget does not belong to user", async () => {
      const budgetRepoOverride = {
        findById: mock(() =>
          Promise.resolve({
            id: "budget-1",
            userId: "other-user",
            name: "Test",
            amount: "1000",
            recurrence: "MONTHLY",
            currency: "USD",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      } as unknown as BudgetRepository;

      expect(
        BudgetService.getSummary(
          "budget-1",
          "user-1",
          budgetRepoOverride,
          mockMovementRepo,
          mockPeriodRepo
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getPeriods", () => {
    it("should return all periods for a budget", async () => {
      const periods = [
        {
          id: "p1",
          budgetId: "budget-1",
          startDate: "2026-02-01",
          endDate: "2026-02-28",
          amount: "500",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "p2",
          budgetId: "budget-1",
          startDate: "2026-03-01",
          endDate: "2026-03-31",
          amount: "500",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const periodRepoOverride = {
        findByBudgetId: mock(() => Promise.resolve(periods)),
      } as unknown as BudgetPeriodRepository;

      const result = await BudgetService.getPeriods(
        "budget-1",
        "user-1",
        mockBudgetRepo,
        periodRepoOverride
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("p1");
      expect(result[1].id).toBe("p2");
    });
  });

  describe("updatePeriod", () => {
    it("should update period amount", async () => {
      const result = await BudgetService.updatePeriod(
        "budget-1",
        "period-1",
        "user-1",
        { amount: "600" },
        mockBudgetRepo,
        mockPeriodRepo
      );

      expect(result.amount).toBe("600");
      expect(mockPeriodRepo.update).toHaveBeenCalledWith("period-1", {
        amount: "600",
      });
    });

    it("should throw error if period does not belong to budget", async () => {
      const periodRepoOverride = {
        findById: mock(() =>
          Promise.resolve({
            id: "period-1",
            budgetId: "other-budget",
            startDate: "2026-02-01",
            endDate: "2026-02-28",
            amount: "500",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
        update: mock(() => Promise.resolve(null)),
      } as unknown as BudgetPeriodRepository;

      expect(
        BudgetService.updatePeriod(
          "budget-1",
          "period-1",
          "user-1",
          { amount: "600" },
          mockBudgetRepo,
          periodRepoOverride
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe("extendPeriods", () => {
    it("should generate additional periods for recurring budget", async () => {
      const result = await BudgetService.extendPeriods(
        "budget-1",
        "user-1",
        { periodsToGenerate: 6 },
        mockBudgetRepo,
        mockPeriodRepo
      );

      expect(result).toHaveLength(6);
      expect(mockPeriodRepo.createMany).toHaveBeenCalledTimes(1);
    });

    it("should throw error for NONE recurrence", async () => {
      const budgetRepoOverride = {
        findById: mock(() =>
          Promise.resolve({
            id: "budget-1",
            userId: "user-1",
            name: "Test",
            amount: "1000",
            recurrence: "NONE",
            currency: "USD",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      } as unknown as BudgetRepository;

      expect(
        BudgetService.extendPeriods(
          "budget-1",
          "user-1",
          { periodsToGenerate: 6 },
          budgetRepoOverride,
          mockPeriodRepo
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe("update", () => {
    it("should update budget name and amount", async () => {
      const result = await BudgetService.update(
        "budget-1",
        "user-1",
        { name: "New Name", amount: "1500" },
        mockBudgetRepo
      );

      expect(result.name).toBe("New Name");
      expect(result.amount).toBe("1500");
    });

    it("should throw INVALID_AMOUNT for negative amount", async () => {
      expect(
        BudgetService.update(
          "budget-1",
          "user-1",
          { amount: "-100" },
          mockBudgetRepo
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe("delete", () => {
    it("should soft delete budget", async () => {
      await BudgetService.delete("budget-1", "user-1", mockBudgetRepo);
      expect(mockBudgetRepo.softDelete).toHaveBeenCalledWith("budget-1");
    });

    it("should throw FORBIDDEN if budget does not belong to user", async () => {
      const budgetRepoOverride = {
        findById: mock(() =>
          Promise.resolve({
            id: "budget-1",
            userId: "other-user",
            name: "Test",
            amount: "1000",
            recurrence: "MONTHLY",
            currency: "USD",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
        softDelete: mock(() => Promise.resolve()),
      } as unknown as BudgetRepository;

      expect(
        BudgetService.delete("budget-1", "user-1", budgetRepoOverride)
      ).rejects.toThrow(ApiError);
    });
  });
});
