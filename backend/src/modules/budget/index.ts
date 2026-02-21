/**
 * Budget Controller
 *
 * Elysia routes for budget management with recurring budgets support.
 */

import { Elysia, t } from "elysia";
import { BudgetService } from "./service";
import { BudgetRepository } from "./repository";
import { BudgetPeriodRepository } from "./period-repository";
import { UserRepository } from "../user/repository";
import { MovementRepository } from "../movement/repository";
import { BudgetModel } from "./model";
import { db } from "../../shared/db";
import { authPlugin } from "../../shared/plugins";
import {
  ok,
  created,
  okPaginated,
  successSchema, 
  paginatedSuccessSchema,
  errorSchema,
  validationErrorSchema,
} from "../../shared/responses";

const budgetRepo = new BudgetRepository(db);
const periodRepo = new BudgetPeriodRepository(db);
const userRepo = new UserRepository(db);
const movementRepo = new MovementRepository(db);

export const budget = new Elysia({ prefix: "/budgets" })
  .use(authPlugin)

  /**
   * POST /budgets - Create a new budget with periods
   */
  .post(
    "/",
    async ({ body, set, userId }) => {
      const data = await BudgetService.create(
        userId,
        body,
        budgetRepo,
        userRepo,
        periodRepo,
      );
      set.status = 201;
      return created(data, "Budget created successfully");
    },
    {
      auth: true,
      body: BudgetModel.createBody,
      response: {
        201: successSchema(BudgetModel.budgetWithPeriodsResponse, "Budget created"),
        400: errorSchema("Invalid date range or amount"),
        404: errorSchema("User not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * GET /budgets - Get all budgets for authenticated user (paginated)
   */
  .get(
    "/",
    async ({ query, userId }) => {
      const result = await BudgetService.getUserBudgets(
        userId,
        query,
        budgetRepo,
      );
      return okPaginated(result.items, result.meta, "Budgets retrieved");
    },
    {
      auth: true,
      query: BudgetModel.queryParams,
      response: {
        200: paginatedSuccessSchema(
          BudgetModel.budgetCardResponse,
          "Budgets retrieved",
        ),
        401: errorSchema("Unauthorized"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * GET /budgets/:id - Get budget by ID
   */
  .get(
    "/:id",
    async ({ params, userId }) => {
      const data = await BudgetService.getById(
        params.id,
        userId,
        budgetRepo,
      );
      return ok(data, "Budget retrieved");
    },
    {
      auth: true,
      response: {
        200: successSchema(BudgetModel.budgetResponse, "Budget retrieved"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget not found"),
      },
    },
  )

  /**
   * GET /budgets/:id/summary - Get budget summary with current period
   */
  .get(
    "/:id/summary",
    async ({ params, userId }) => {
      const data = await BudgetService.getSummary(
        params.id,
        userId,
        budgetRepo,
        movementRepo,
        periodRepo,
      );
      return ok(data, "Budget summary retrieved");
    },
    {
      auth: true,
      response: {
        200: successSchema(BudgetModel.budgetSummaryResponse, "Summary retrieved"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget not found"),
      },
    },
  )

  /**
   * GET /budgets/:id/periods - Get all periods for a budget
   */
  .get(
    "/:id/periods",
    async ({ params, query, userId }) => {
      const data = await BudgetService.getPeriods(
        params.id,
        userId,
        query,
        budgetRepo,
        periodRepo,
      );
      return ok(data, "Periods retrieved");
    },
    {
      auth: true,
      query: BudgetModel.getPeriodsQueryParams,
      response: {
        200: successSchema(t.Array(BudgetModel.periodResponse), "Periods retrieved"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget not found"),
      },
    },
  )

  /**
   * PATCH /budgets/:id/periods/:periodId - Update a specific period
   */
  .patch(
    "/:id/periods/:periodId",
    async ({ params, body, userId }) => {
      const data = await BudgetService.updatePeriod(
        params.id,
        params.periodId,
        userId,
        body,
        budgetRepo,
        periodRepo,
      );
      return ok(data, "Period updated");
    },
    {
      auth: true,
      body: BudgetModel.updatePeriodBody,
      response: {
        200: successSchema(BudgetModel.periodResponse, "Period updated"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget or period not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * POST /budgets/:id/periods/extend - Generate more periods
   */
  .post(
    "/:id/periods/extend",
    async ({ params, body, userId }) => {
      const data = await BudgetService.extendPeriods(
        params.id,
        userId,
        body,
        budgetRepo,
        periodRepo,
      );
      return ok(data, "Periods extended");
    },
    {
      auth: true,
      body: BudgetModel.extendPeriodsBody,
      response: {
        200: successSchema(t.Array(BudgetModel.periodResponse), "Periods extended"),
        400: errorSchema("Cannot extend NONE recurrence"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget not found"),
        422: validationErrorSchema(),
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
        periodRepo,
      );
      return ok(data, "Budget updated");
    },
    {
      auth: true,
      body: BudgetModel.updateBody,
      response: {
        200: successSchema(BudgetModel.budgetResponse, "Budget updated"),
        400: errorSchema("Invalid amount"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * DELETE /budgets/:id - Delete budget (soft delete)
   */
  .delete(
    "/:id",
    async ({ params, userId }) => {
      await BudgetService.delete(params.id, userId, budgetRepo);
      return ok(null, "Budget deleted");
    },
    {
      auth: true,
      response: {
        200: successSchema(BudgetModel.deleteResponse, "Budget deleted"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget not found"),
      },
    },
  );
