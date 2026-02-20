/**
 * Movement Service Tests
 * 
 * Unit tests for MovementService with periodId support.
 */

import { describe, expect, it, mock, beforeEach } from "bun:test";
import { MovementService } from "../../../modules/movement/service";
import { ApiError, ErrorCode } from "../../../shared/responses";
import type { MovementRepository } from "../../../modules/movement/repository";
import type { UserRepository } from "../../../modules/user/repository";
import type { BudgetPeriodRepository } from "../../../modules/budget/period-repository";

describe("MovementService", () => {
  // --- Setup Mocks ---
  let mockUserRepo: UserRepository;
  let mockMovementRepo: MovementRepository;
  let mockPeriodRepo: BudgetPeriodRepository;

  beforeEach(() => {
    mockUserRepo = {
      exists: mock(() => Promise.resolve(true)),
    } as unknown as UserRepository;

    mockMovementRepo = {
      create: mock((data: any) =>
        Promise.resolve({
          id: "movement-1",
          userId: data.userId,
          periodId: data.periodId,
          type: data.type,
          amount: data.amount,
          description: data.description,
          date: data.date,
          paymentMethod: data.paymentMethod,
          isRecurring: data.isRecurring,
          tags: data.tags,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      findById: mock((id: string) =>
        Promise.resolve({
          id,
          userId: "user-1",
          periodId: "period-1",
          type: "EXPENSE",
          amount: "50",
          description: "Test movement",
          date: new Date(),
          paymentMethod: null,
          isRecurring: false,
          tags: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      update: mock((id: string, data: any) =>
        Promise.resolve({
          id,
          userId: "user-1",
          periodId: data.periodId || "period-1",
          type: data.type || "EXPENSE",
          amount: data.amount || "50",
          description: data.description || "Updated",
          date: data.date || new Date(),
          paymentMethod: data.paymentMethod || null,
          isRecurring: data.isRecurring !== undefined ? data.isRecurring : false,
          tags: data.tags || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      softDelete: mock(() => Promise.resolve()),
      findByUserIdPaginated: mock(() =>
        Promise.resolve({ items: [], total: 0 })
      ),
      findByPeriodId: mock(() => Promise.resolve([])),
      getTotalByType: mock(() => Promise.resolve(1000)),
    } as unknown as MovementRepository;

    mockPeriodRepo = {
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
    } as unknown as BudgetPeriodRepository;
  });

  // --- Tests ---

  describe("create", () => {
    it("should create a movement with periodId", async () => {
      const result = await MovementService.create(
        "user-1",
        {
          periodId: "period-1",
          type: "EXPENSE",
          amount: "50",
          description: "Lunch",
          date: "2026-02-15",
        },
        mockMovementRepo,
        mockUserRepo,
        mockPeriodRepo
      );

      expect(result.id).toBe("movement-1");
      expect(result.periodId).toBe("period-1");
      expect(result.type).toBe("EXPENSE");
      expect(result.amount).toBe("50");
      expect(result.description).toBe("Lunch");
    });

    it("should create a movement without periodId", async () => {
      const result = await MovementService.create(
        "user-1",
        {
          type: "INCOME",
          amount: "1000",
          description: "Salary",
          date: "2026-02-01",
        },
        mockMovementRepo,
        mockUserRepo,
        mockPeriodRepo
      );

      expect(result.periodId).toBeNull();
      expect(result.type).toBe("INCOME");
    });

    it("should throw error if period does not exist", async () => {
      const periodRepoOverride = {
        findById: mock(() => Promise.resolve(undefined)),
      } as unknown as BudgetPeriodRepository;

      expect(
        MovementService.create(
          "user-1",
          {
            periodId: "invalid-period",
            type: "EXPENSE",
            amount: "50",
            description: "Test",
            date: "2026-02-15",
          },
          mockMovementRepo,
          mockUserRepo,
          periodRepoOverride
        )
      ).rejects.toThrow(ApiError);
    });

    it("should throw USER_NOT_FOUND if user does not exist", async () => {
      const userRepoOverride = {
        exists: mock(() => Promise.resolve(false)),
      } as unknown as UserRepository;

      expect(
        MovementService.create(
          "user-1",
          {
            type: "EXPENSE",
            amount: "50",
            description: "Test",
            date: "2026-02-15",
          },
          mockMovementRepo,
          userRepoOverride,
          mockPeriodRepo
        )
      ).rejects.toThrow(ApiError);
    });

    it("should throw INVALID_AMOUNT for negative amount", async () => {
      expect(
        MovementService.create(
          "user-1",
          {
            type: "EXPENSE",
            amount: "-50",
            description: "Test",
            date: "2026-02-15",
          },
          mockMovementRepo,
          mockUserRepo,
          mockPeriodRepo
        )
      ).rejects.toThrow(ApiError);
    });

    it("should throw INVALID_AMOUNT for non-numeric amount", async () => {
      expect(
        MovementService.create(
          "user-1",
          {
            type: "EXPENSE",
            amount: "abc",
            description: "Test",
            date: "2026-02-15",
          },
          mockMovementRepo,
          mockUserRepo,
          mockPeriodRepo
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getById", () => {
    it("should return movement by id", async () => {
      const result = await MovementService.getById(
        "movement-1",
        "user-1",
        mockMovementRepo
      );

      expect(result.id).toBe("movement-1");
      expect(result.userId).toBe("user-1");
    });

    it("should throw FORBIDDEN if movement does not belong to user", async () => {
      const movementRepoOverride = {
        findById: mock(() =>
          Promise.resolve({
            id: "movement-1",
            userId: "other-user",
            periodId: "period-1",
            type: "EXPENSE",
            amount: "50",
            description: "Test",
            date: new Date(),
            paymentMethod: null,
            isRecurring: false,
            tags: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      } as unknown as MovementRepository;

      expect(
        MovementService.getById("movement-1", "user-1", movementRepoOverride)
      ).rejects.toThrow(ApiError);
    });

    it("should throw MOVEMENT_NOT_FOUND if movement does not exist", async () => {
      const movementRepoOverride = {
        findById: mock(() => Promise.resolve(null)),
      } as unknown as MovementRepository;

      expect(
        MovementService.getById("movement-1", "user-1", movementRepoOverride)
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getPeriodMovements", () => {
    it("should return all movements for a period", async () => {
      const movements = [
        {
          id: "m1",
          userId: "user-1",
          periodId: "period-1",
          type: "EXPENSE" as const,
          amount: "50",
          description: "Lunch",
          date: new Date(),
          paymentMethod: null,
          isRecurring: false,
          tags: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "m2",
          userId: "user-1",
          periodId: "period-1",
          type: "EXPENSE" as const,
          amount: "30",
          description: "Coffee",
          date: new Date(),
          paymentMethod: null,
          isRecurring: false,
          tags: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const movementRepoOverride = {
        findByPeriodId: mock(() => Promise.resolve(movements)),
      } as unknown as MovementRepository;

      const result = await MovementService.getPeriodMovements(
        "period-1",
        "user-1",
        movementRepoOverride,
        mockPeriodRepo
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("m1");
      expect(result[1].id).toBe("m2");
    });

    it("should throw error if period does not exist", async () => {
      const periodRepoOverride = {
        findById: mock(() => Promise.resolve(undefined)),
      } as unknown as BudgetPeriodRepository;

      expect(
        MovementService.getPeriodMovements(
          "invalid-period",
          "user-1",
          mockMovementRepo,
          periodRepoOverride
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe("update", () => {
    it("should update movement periodId", async () => {
      const result = await MovementService.update(
        "movement-1",
        "user-1",
        { periodId: "period-2" },
        mockMovementRepo,
        mockPeriodRepo
      );

      expect(result.periodId).toBe("period-2");
    });

    it("should update movement amount", async () => {
      const result = await MovementService.update(
        "movement-1",
        "user-1",
        { amount: "75" },
        mockMovementRepo,
        mockPeriodRepo
      );

      expect(result.amount).toBe("75");
    });

    it("should throw error if new periodId does not exist", async () => {
      const periodRepoOverride = {
        findById: mock(() => Promise.resolve(undefined)),
      } as unknown as BudgetPeriodRepository;

      expect(
        MovementService.update(
          "movement-1",
          "user-1",
          { periodId: "invalid-period" },
          mockMovementRepo,
          periodRepoOverride
        )
      ).rejects.toThrow(ApiError);
    });

    it("should throw INVALID_AMOUNT for negative amount", async () => {
      expect(
        MovementService.update(
          "movement-1",
          "user-1",
          { amount: "-50" },
          mockMovementRepo,
          mockPeriodRepo
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe("delete", () => {
    it("should soft delete movement", async () => {
      await MovementService.delete("movement-1", "user-1", mockMovementRepo);
      expect(mockMovementRepo.softDelete).toHaveBeenCalledWith("movement-1");
    });

    it("should throw FORBIDDEN if movement does not belong to user", async () => {
      const movementRepoOverride = {
        findById: mock(() =>
          Promise.resolve({
            id: "movement-1",
            userId: "other-user",
            periodId: "period-1",
            type: "EXPENSE",
            amount: "50",
            description: "Test",
            date: new Date(),
            paymentMethod: null,
            isRecurring: false,
            tags: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
        softDelete: mock(() => Promise.resolve()),
      } as unknown as MovementRepository;

      expect(
        MovementService.delete("movement-1", "user-1", movementRepoOverride)
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getAnalytics", () => {
    it("should return income, expenses, and balance", async () => {
      const movementRepoOverride = {
        getTotalByType: mock((userId: string, type: string) => {
          if (type === "INCOME") return Promise.resolve(5000);
          if (type === "EXPENSE") return Promise.resolve(3000);
          return Promise.resolve(0);
        }),
      } as unknown as MovementRepository;

      const result = await MovementService.getAnalytics(
        "user-1",
        movementRepoOverride
      );

      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpenses).toBe(3000);
      expect(result.balance).toBe(2000);
    });
  });
});
