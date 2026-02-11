
import { describe, expect, it, mock } from "bun:test";
import { MovementService } from "../../../modules/movement/service";
import  { ApiError, ErrorCode, ErrorDefaults } from "../../../shared/responses";
import type { MovementRepository } from "../../../modules/movement/repository";
import type { UserRepository } from "../../../modules/user/repository";
import type { BudgetRepository } from "../../../modules/budget/repository";

describe("MovementService", () => {
    // --- Setup Mocks ---
    const mockUserRepo = {
        exists: mock((id) => Promise.resolve(id === "user-1")),
    } as unknown as UserRepository;

    const mockBudgetRepo = {
        findById: mock((id) => {
            if (id === "budget-1") return Promise.resolve({ userId: "user-1", id: "budget-1" });
            if (id === "budget-2") return Promise.resolve({ userId: "user-2", id: "budget-2" }); // Not owned by user-1
            return Promise.resolve(null);
        }),
    } as unknown as BudgetRepository;

    const mockMovementRepo = {
        create: mock((data: any) => Promise.resolve({
            id: "move-1",
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        })),
        findById: mock((id) => {
            if (id === "move-1") return Promise.resolve({ id: "move-1", userId: "user-1", amount: "100" });
             if (id === "move-2") return Promise.resolve({ id: "move-2", userId: "user-2", amount: "100" });
            return Promise.resolve(null);
        }),
        update: mock((id, data) => Promise.resolve({
            id,
            userId: "user-1",
            amount: "100",
            ...data
        })),
        softDelete: mock((id) => Promise.resolve(true)),
        findByUserId: mock(() => Promise.resolve([])),
        findByUserIdPaginated: mock(() => Promise.resolve({ items: [], total: 0 })),
    } as unknown as MovementRepository;


    // --- Tests ---

    describe("create", () => {
        it("should create movement successfully without budget", async () => {
            const result = await MovementService.create(
                "user-1",
                {
                    amount: "100",
                    type: "EXPENSE",
                    description: "Test",
                    category: "Food",
                    date: new Date().toISOString(),
                },
                mockMovementRepo,
                mockUserRepo,
                mockBudgetRepo
            );
            expect(result.id).toBe("move-1");
            expect(result.userId).toBe("user-1");
        });

        it("should create movement successfully WITH valid budget", async () => {
            const result = await MovementService.create(
                "user-1",
                {
                    amount: "100",
                    type: "EXPENSE",
                    description: "Test",
                    category: "Food",
                    date: new Date().toISOString(),
                    budgetId: "budget-1" // belongs to user-1
                },
                mockMovementRepo,
                mockUserRepo,
                mockBudgetRepo
            );
            expect(result.budgetId).toBe("budget-1");
        });

        it("should throw BUDGET_OWNERSHIP if budget belongs to another user", async () => {
            expect(MovementService.create(
                "user-1",
                {
                    amount: "100",
                    type: "EXPENSE",
                    description: "Test",
                    category: "Food",
                    date: new Date().toISOString(),
                    budgetId: "budget-2" // belongs to user-2
                },
                mockMovementRepo,
                mockUserRepo,
                mockBudgetRepo
            )).rejects.toThrow(ApiError);
        });

         it("should throw BUDGET_NOT_FOUND if budget does not exist", async () => {
            expect(MovementService.create(
                "user-1",
                {
                    amount: "100",
                    type: "EXPENSE",
                    description: "Test",
                    category: "Food",
                    date: new Date().toISOString(),
                    budgetId: "budget-999"
                },
                mockMovementRepo,
                mockUserRepo,
                mockBudgetRepo
            )).rejects.toThrow(ApiError);
        });

        it("should throw INVALID_AMOUNT if amount <= 0", async () => {
             expect(MovementService.create(
                "user-1",
                {
                    amount: "-50",
                    type: "EXPENSE",
                    description: "Test",
                    category: "Food",
                    date: new Date().toISOString(),
                },
                mockMovementRepo,
                mockUserRepo,
                mockBudgetRepo
            )).rejects.toThrow(ApiError);
        });
    });

    describe("getById", () => {
        it("should return movement if user owns it", async () => {
            const result = await MovementService.getById("move-1", "user-1", mockMovementRepo);
            expect(result.id).toBe("move-1");
        });

        it("should throw FORBIDDEN if user does not own it", async () => {
             expect(MovementService.getById("move-1", "user-2", mockMovementRepo)).rejects.toThrow(ApiError);
        });
    });

    describe("update", () => {
         it("should update and return movement", async () => {
            const result = await MovementService.update(
                "move-1",
                "user-1",
                { description: "New Desc" },
                mockMovementRepo
            );
            expect(result.description).toBe("New Desc");
         });

         it("should throw FORBIDDEN if user does not own it", async () => {
             expect(MovementService.update(
                "move-1",
                "user-2",
                { description: "New Desc" },
                mockMovementRepo
            )).rejects.toThrow(ApiError);
         });
    });

    describe("delete", () => {
        it("should delete successfully", async () => {
             const result = await MovementService.delete("move-1", "user-1", mockMovementRepo);
             expect(result).toBe(true);
        });

         it("should throw FORBIDDEN if user does not own it", async () => {
             expect(MovementService.delete("move-1", "user-2", mockMovementRepo)).rejects.toThrow(ApiError);
         });
    });
});
