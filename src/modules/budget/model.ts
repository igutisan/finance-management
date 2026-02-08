/**
 * Budget Model
 *
 * Defines validation schemas and types for budget-related requests and responses.
 */

import { t } from "elysia";

export namespace BudgetModel {
  // ===== Request DTOs =====

  export const createBody = t.Object({
    name: t.String({ minLength: 1 }),
    description: t.Optional(t.String()),
    amount: t.String(), // Numeric as string
    category: t.String({ minLength: 1 }),
    startDate: t.String(), // ISO date string
    endDate: t.String(),
    currency: t.Optional(t.String({ maxLength: 3 })),
  });

  export type CreateBody = typeof createBody.static;

  export const updateBody = t.Object({
    name: t.Optional(t.String()),
    description: t.Optional(t.String()),
    amount: t.Optional(t.String()),
    category: t.Optional(t.String()),
    startDate: t.Optional(t.String()),
    endDate: t.Optional(t.String()),
    isActive: t.Optional(t.Boolean()),
  });

  export type UpdateBody = typeof updateBody.static;

  // ===== Response DTOs =====

  export const budgetResponse = t.Object({
    id: t.String(),
    userId: t.String(),
    name: t.String(),
    description: t.Nullable(t.String()),
    amount: t.String(),
    category: t.String(),
    startDate: t.String(),
    endDate: t.String(),
    currency: t.String(),
    isActive: t.Boolean(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  });

  export type BudgetResponse = typeof budgetResponse.static;

  export const budgetSummaryResponse = t.Object({
    budget: budgetResponse,
    totalSpent: t.Number(),
    remaining: t.Number(),
    percentageUsed: t.Number(),
  });

  export type BudgetSummaryResponse = typeof budgetSummaryResponse.static;

  /**
   * Delete response (null data — the message lives in the envelope)
   */
  export const deleteResponse = t.Null();
  export type DeleteResponse = typeof deleteResponse.static;
}
