/**
 * Budget Controller
 *
 * Elysia routes for budget management.
 *
 * Following Elysia's official best practice:
 *   - Repositories instantiated at module level
 *   - Passed as parameters to static service methods
 *   - Success responses wrapped in the generic envelope via ok() / created()
 *   - Errors thrown as ApiError are handled by the error-handler plugin
 *   - Protected routes use the authPlugin macro (`auth: true`)
 *     which injects `userId` into the handler context
 */

import { Elysia } from "elysia";
import { BudgetService } from "./service";
import { BudgetRepository } from "./repository";
import { UserRepository } from "../user/repository";
import { MovementRepository } from "../movement/repository";
import { BudgetModel } from "./model";
import { db } from "../../shared/db";
import { authPlugin } from "../../shared/plugins";
import {
  ok,
  created,
  successSchema,
  errorSchema,
  validationErrorSchema,
} from "../../shared/responses";

const budgetRepo = new BudgetRepository(db);
const userRepo = new UserRepository(db);
const movementRepo = new MovementRepository(db);

export const budget = new Elysia({ prefix: "/budgets" })
  .use(authPlugin)

  /**
   * POST /budgets - Create a new budget
   */
  .post(
    "/",
    async ({ body, set, userId }) => {
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
      auth: true,
      body: BudgetModel.createBody,
      response: {
        201: successSchema(BudgetModel.budgetResponse, "Budget created"),
        400: errorSchema("Invalid date range or amount"),
        404: errorSchema("User not found"),
        401: errorSchema("Authentication required"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * GET /budgets - Get all user budgets
   */
  .get(
    "/",
    async ({ userId }) => {
      const data = await BudgetService.getUserBudgets(userId, budgetRepo);
      return ok(data, "Budgets fetched successfully");
    },
    {
      auth: true,
      response: {
        200: successSchema(BudgetModel.budgetListResponse, "Budgets fetched"),
        401: errorSchema("Authentication required"),
      },
    },
  )

  /**
   * GET /budgets/:id - Get budget by ID
   */
  .get(
    "/:id",
    async ({ params, userId }) => {
      const data = await BudgetService.getById(params.id, userId, budgetRepo);
      return ok(data, "Budget fetched successfully");
    },
    {
      auth: true,
      response: {
        200: successSchema(BudgetModel.budgetResponse, "Budget fetched"),
        401: errorSchema("Authentication required"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget not found"),
      },
    },
  )

  /**
   * GET /budgets/:id/summary - Get budget summary
   */
  .get(
    "/:id/summary",
    async ({ params, userId }) => {
      const data = await BudgetService.getSummary(
        params.id,
        userId,
        budgetRepo,
        movementRepo,
      );
      return ok(data, "Budget summary fetched successfully");
    },
    {
      auth: true,
      response: {
        200: successSchema(
          BudgetModel.budgetSummaryResponse,
          "Budget summary fetched",
        ),
        401: errorSchema("Authentication required"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget not found"),
      },
    },
  )

  /**
   * PATCH /budgets/:id - Update budget
   */
  .patch(
    "/:id",
    async ({ params, body, userId }) => {
      const data = await BudgetService.update(
        params.id,
        userId,
        body,
        budgetRepo,
      );
      return ok(data, "Budget updated successfully");
    },
    {
      auth: true,
      body: BudgetModel.updateBody,
      response: {
        200: successSchema(BudgetModel.budgetResponse, "Budget updated"),
        400: errorSchema("Invalid date range or amount"),
        401: errorSchema("Authentication required"),
        403: errorSchema("Budget does not belong to user"),
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
    async ({ params, userId }) => {
      await BudgetService.delete(params.id, userId, budgetRepo);
      return ok(null, "Budget deleted successfully");
    },
    {
      auth: true,
      response: {
        200: successSchema(BudgetModel.deleteResponse, "Budget deleted"),
        401: errorSchema("Authentication required"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget not found"),
      },
    },
  );
