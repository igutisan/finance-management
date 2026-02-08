/**
 * Budget Controller
 *
 * Elysia routes for budget management.
 *
 * All success responses are wrapped in the generic envelope via ok() / created().
 * Errors are thrown as ApiError and handled by the global error handler.
 */

import { Elysia } from "elysia";
import { BudgetService } from "./service";
import { BudgetRepository } from "./repository";
import { UserRepository } from "../user/repository";
import { MovementRepository } from "../movement/repository";
import { BudgetModel } from "./model";
import { db } from "../../shared/db";
import {
  ok,
  created,
  successSchema,
  errorSchema,
  validationErrorSchema,
} from "../../shared/responses";

// Initialize repositories
const budgetRepo = new BudgetRepository(db);
const userRepo = new UserRepository(db);
const movementRepo = new MovementRepository(db);

export const budget = new Elysia({ prefix: "/budgets" })
  /**
   * POST /budgets - Create a new budget
   * TODO: Get userId from auth token
   */
  .post(
    "/",
    async ({ body, set }) => {
      // TODO: Extract userId from JWT token
      const userId = "temp-user-id";
      const data = await BudgetService.create(
        userId,
        body,
        budgetRepo,
        userRepo,
      );
      set.status = 201;
      return created(data, "Budget created successfully");
    },
    {
      body: BudgetModel.createBody,
      response: {
        201: successSchema(BudgetModel.budgetResponse, "Budget created"),
        400: errorSchema("Invalid date range or amount"),
        404: errorSchema("User not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * GET /budgets - Get all user budgets
   * TODO: Get userId from auth token
   */
  .get("/", async () => {
    const userId = "temp-user-id";
    const data = await BudgetService.getUserBudgets(userId, budgetRepo);
    return ok(data, "Budgets fetched successfully");
  })

  /**
   * GET /budgets/:id - Get budget by ID
   */
  .get(
    "/:id",
    async ({ params }) => {
      const data = await BudgetService.getById(params.id, budgetRepo);
      return ok(data, "Budget fetched successfully");
    },
    {
      response: {
        200: successSchema(BudgetModel.budgetResponse, "Budget fetched"),
        404: errorSchema("Budget not found"),
      },
    },
  )

  /**
   * GET /budgets/:id/summary - Get budget summary
   */
  .get(
    "/:id/summary",
    async ({ params }) => {
      const data = await BudgetService.getSummary(
        params.id,
        budgetRepo,
        movementRepo,
      );
      return ok(data, "Budget summary fetched successfully");
    },
    {
      response: {
        200: successSchema(
          BudgetModel.budgetSummaryResponse,
          "Budget summary fetched",
        ),
        404: errorSchema("Budget not found"),
      },
    },
  )

  /**
   * PATCH /budgets/:id - Update budget
   */
  .patch(
    "/:id",
    async ({ params, body }) => {
      const data = await BudgetService.update(params.id, body, budgetRepo);
      return ok(data, "Budget updated successfully");
    },
    {
      body: BudgetModel.updateBody,
      response: {
        200: successSchema(BudgetModel.budgetResponse, "Budget updated"),
        400: errorSchema("Invalid date range or amount"),
        404: errorSchema("Budget not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * DELETE /budgets/:id - Delete budget
   */
  .delete(
    "/:id",
    async ({ params }) => {
      await BudgetService.delete(params.id, budgetRepo);
      return ok(null, "Budget deleted successfully");
    },
    {
      response: {
        200: successSchema(BudgetModel.deleteResponse, "Budget deleted"),
        404: errorSchema("Budget not found"),
      },
    },
  );
