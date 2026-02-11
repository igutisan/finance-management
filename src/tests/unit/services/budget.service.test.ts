
import { describe, expect, it, mock } from "bun:test";
import { BudgetService } from "../../../modules/budget/service";
import { ApiError, ErrorCode } from "../../../shared/responses";
import type { BudgetRepository } from "../../../modules/budget/repository";
import type { UserRepository } from "../../../modules/user/repository";
import type { MovementRepository } from "../../../modules/movement/repository";

describe("BudgetService", () => {
    // --- Setup Mocks ---
    const mockUserRepo = {
        exists: mock(() => Promise.resolve(true)),
    } as unknown as UserRepository;

    const mockBudgetRepo = {
        create: mock((data: any) => Promise.resolve({
            id: "budget-1",
            userId: data.userId,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        })),
        findById: mock((id: string) => Promise.resolve({
            id,
            userId: "user-1",
            name: "Test Budget",
            amount: "1000",
            startDate: new Date(),
            endDate: new Date(),
            isActive: true,
        })),
        update: mock((id: string, data: any) => Promise.resolve({
            id,
            userId: "user-1",
             name: "Updated Budget",
            amount: "1000",
            startDate: new Date(),
            endDate: new Date(),
            ...data,
        })),
        softDelete: mock((id: string) => Promise.resolve(true)),
        findByUserId: mock((userId: string) => Promise.resolve([])),
        findByUserIdPaginated: mock(() => Promise.resolve({ items: [], total: 0 })),
    } as unknown as BudgetRepository;

    const mockMovementRepo = {
        findByBudgetId: mock(() => Promise.resolve([])),
        getBudgetTotalSpent: mock(() => Promise.resolve(0)),
    } as unknown as MovementRepository;

    // Reset mocks before each test if needed
    // However, for simple mocks like this, re-creating or resetting per test case is cleaner if complexity grows.
    
    // --- Tests ---

    describe("create", () => {
        it("should create a budget successfully", async () => {
            const result = await BudgetService.create(
                "user-1",
                {
                    name: "My Budget",
                    description: "Test",
                    amount: "1000",
                    category: "General",
                    startDate: "2024-01-01",
                    endDate: "2024-12-31",
                    currency: "USD",
                },
                mockBudgetRepo,
                mockUserRepo
            );

            expect(result.id).toBe("budget-1");
            expect(result.userId).toBe("user-1");
            expect(result.amount).toBe("1000");
        });

        it("should throw USER_NOT_FOUND if user does not exist", async () => {
            const userRepoOverride = {
                exists: mock(() => Promise.resolve(false))
            } as unknown as UserRepository;

            expect(BudgetService.create(
                "user-404",
                {
                    name: "My Budget",
                    description: "Test",
                    amount: "1000",
                    category: "General",
                    startDate: "2024-01-01",
                    endDate: "2024-12-31",
                },
                mockBudgetRepo,
                userRepoOverride
            )).rejects.toThrow(ApiError);
        });

        it("should throw INVALID_AMOUNT if amount is <= 0", async () => {
             expect(BudgetService.create(
                "user-1",
                {
                    name: "My Budget",
                    description: "Test",
                    amount: "-100", 
                    category: "General",
                    startDate: "2024-01-01",
                    endDate: "2024-12-31",
                },
                mockBudgetRepo,
                mockUserRepo
            )).rejects.toThrow(ApiError);
        });

        it("should throw INVALID_DATE_RANGE if end date < start date", async () => {
            expect(BudgetService.create(
               "user-1",
               {
                   name: "My Budget",
                   description: "Test",
                   amount: "1000", 
                   category: "General",
                   startDate: "2024-12-31",
                   endDate: "2024-01-01",
               },
               mockBudgetRepo,
               mockUserRepo
           )).rejects.toThrow(ApiError);
       });
    });

    describe("getById", () => {
        it("should return budget if user owns it", async () => {
            const result = await BudgetService.getById("budget-1", "user-1", mockBudgetRepo);
            expect(result.id).toBe("budget-1");
        });

        it("should throw FORBIDDEN if user does not own it", async () => {
            expect(BudgetService.getById("budget-1", "user-2", mockBudgetRepo)).rejects.toThrow(ApiError);
        });

        it("should throw BUDGET_NOT_FOUND if not found", async () => {
            const budgetRepoOverride = {
                findById: mock(() => Promise.resolve(null))
            } as unknown as BudgetRepository;

            expect(BudgetService.getById("budget-999", "user-1", budgetRepoOverride)).rejects.toThrow(ApiError);
        });
    });

    describe("update", () => {
        it("should update budget successfully", async () => {
            const result = await BudgetService.update(
                "budget-1",
                "user-1",
                { name: "Updated Name" },
                mockBudgetRepo
            );
            expect(result.name).toBe("Updated Name");
        });

        it("should throw FORBIDDEN if user does not own it", async () => {
             expect(BudgetService.update(
                "budget-1",
                "user-2",
                { name: "Updated Name" },
                mockBudgetRepo
            )).rejects.toThrow(ApiError);
        });
    });

    describe("delete", () => {
        it("should delete budget successfully", async () => {
            const result = await BudgetService.delete("budget-1", "user-1", mockBudgetRepo);
            expect(result).toBe(true);
        });

        it("should throw FORBIDDEN if user does not own it", async () => {
            expect(BudgetService.delete("budget-1", "user-2", mockBudgetRepo)).rejects.toThrow(ApiError);
        });
    });
    
    describe("getSummary", () => {
        it("should return summary with correct calculations", async () => {
             const movementRepoWithData = {
                getBudgetTotalSpent: mock(() => Promise.resolve(150)) // Return pre-calculated sum
            } as unknown as MovementRepository;

            const result = await BudgetService.getSummary(
                "budget-1",
                "user-1",
                mockBudgetRepo,
                movementRepoWithData
            );

            // Total spent = 100 + 50 = 150
            // Budget amount mock is 1000
            expect(result.totalSpent).toBe(150);
            expect(result.remaining).toBe(850);
            expect(result.percentageUsed).toBe(15);
        });
    });
});
