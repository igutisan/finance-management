/**
 * Budget Model
 *
 * Defines validation schemas and types for budget-related requests and responses.
 */

import { t } from "elysia";
import { paginationQuerySchema } from "../../shared/types/pagination.types";

export namespace BudgetModel {
  // ===== Request DTOs =====

  /**
   * Query params for GET /budgets (pagination + filters)
   */
  export const queryParams = t.Object({
    ...paginationQuerySchema,
    isActive: t.Optional(t.BooleanString()),
  });

  export type QueryParams = typeof queryParams.static;

  export const createBody = t.Object({
    name: t.String({ minLength: 1 }),
    description: t.Optional(t.String()),
    amount: t.String({ pattern: "^\\d+(\\.\\d{1,2})?$", minLength: 1 }),
    recurrence: t.Union([
      t.Literal("NONE"),
      t.Literal("WEEKLY"),
      t.Literal("BIWEEKLY"),
      t.Literal("MONTHLY"),
    ]),
    startDate: t.String(), // ISO date string - first period start
    endDate: t.Optional(t.String()), // Only required for NONE recurrence
    periodsToGenerate: t.Optional(t.Number({ minimum: 1, maximum: 100 })), // Default 12, ignored for NONE
    currency: t.Optional(t.String({ maxLength: 3 })),
  });

  export type CreateBody = typeof createBody.static;

  export const updateBody = t.Object({
    name: t.Optional(t.String()),
    description: t.Optional(t.String()),
    amount: t.Optional(t.String({ pattern: "^\\d+(\\.\\d{1,2})?$", minLength: 1 })),
    isActive: t.Optional(t.Boolean()),
  });

  export type UpdateBody = typeof updateBody.static;

  /**
   * Request body for extending periods
   */
  export const extendPeriodsBody = t.Object({
    periodsToGenerate: t.Number({ minimum: 1, maximum: 100 }),
  });

  export type ExtendPeriodsBody = typeof extendPeriodsBody.static;

  /**
   * Request body for updating a specific period
   */
  export const updatePeriodBody = t.Object({
    amount: t.Optional(t.String({ pattern: "^\\d+(\\.\\d{1,2})?$", minLength: 1 })),
    isActive: t.Optional(t.Boolean()),
  });

  export type UpdatePeriodBody = typeof updatePeriodBody.static;

  // ===== Response DTOs =====

  export const budgetResponse = t.Object({
    id: t.String(),
    userId: t.String(),
    name: t.String(),
    description: t.Nullable(t.String()),
    amount: t.String(),
    recurrence: t.Union([
      t.Literal("NONE"),
      t.Literal("WEEKLY"),
      t.Literal("BIWEEKLY"),
      t.Literal("MONTHLY"),
    ]),
    currency: t.String(),
    isActive: t.Boolean(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  });

  export type BudgetResponse = typeof budgetResponse.static;

  export const periodResponse = t.Object({
    id: t.String(),
    budgetId: t.String(),
    startDate: t.String(),
    endDate: t.String(),
    amount: t.String(),
    isActive: t.Boolean(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  });

  export type PeriodResponse = typeof periodResponse.static;

  export const budgetWithPeriodsResponse = t.Object({
    budget: budgetResponse,
    periods: t.Array(periodResponse),
  });

  export type BudgetWithPeriodsResponse = typeof budgetWithPeriodsResponse.static;

  export const budgetSummaryResponse = t.Object({
    budget: budgetResponse,
    currentPeriod: t.Nullable(periodResponse),
    totalSpent: t.Number(),
    remaining: t.Number(),
    percentageUsed: t.Number(),
  });

  export type BudgetSummaryResponse = typeof budgetSummaryResponse.static;

  /**
   * Budget list response (array of budgets)
   */
  export const budgetListResponse = t.Array(budgetResponse);
  export type BudgetListResponse = typeof budgetListResponse.static;

  /**
   * Enriched budget for list view — includes current period spending
   * so the frontend can render progress bars without extra requests.
   */
  export const budgetCardResponse = t.Object({
    id: t.String(),
    userId: t.String(),
    name: t.String(),
    description: t.Nullable(t.String()),
    amount: t.String(),
    recurrence: t.Union([
      t.Literal("NONE"),
      t.Literal("WEEKLY"),
      t.Literal("BIWEEKLY"),
      t.Literal("MONTHLY"),
    ]),
    currency: t.String(),
    isActive: t.Boolean(),
    currentPeriod: t.Nullable(periodResponse),
    totalSpent: t.Number(),
    remaining: t.Number(),
    percentageUsed: t.Number(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  });

  export type BudgetCardResponse = typeof budgetCardResponse.static;

  /**
   * Delete response (null data — the message lives in the envelope)
   */
  export const deleteResponse = t.Null();
  export type DeleteResponse = typeof deleteResponse.static;
}
