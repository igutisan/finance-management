/**
 * Movement Model
 *
 * Defines validation schemas and types for movement-related requests and responses.
 */

import { t } from "elysia";

export namespace MovementModel {
  // ===== Request DTOs =====

  export const createBody = t.Object({
    budgetId: t.Optional(t.String()),
    type: t.Union([
      t.Literal("INCOME"),
      t.Literal("EXPENSE"),
      t.Literal("TRANSFER"),
    ]),
    amount: t.String(), // Numeric as string
    description: t.String({ minLength: 1 }),
    category: t.String({ minLength: 1 }),
    date: t.String(), // ISO date string
    paymentMethod: t.Optional(t.String()),
    isRecurring: t.Optional(t.Boolean()),
    tags: t.Optional(t.Array(t.String())),
  });

  export type CreateBody = typeof createBody.static;

  export const updateBody = t.Object({
    budgetId: t.Optional(t.String()),
    type: t.Optional(
      t.Union([
        t.Literal("INCOME"),
        t.Literal("EXPENSE"),
        t.Literal("TRANSFER"),
      ]),
    ),
    amount: t.Optional(t.String()),
    description: t.Optional(t.String()),
    category: t.Optional(t.String()),
    date: t.Optional(t.String()),
    paymentMethod: t.Optional(t.String()),
    isRecurring: t.Optional(t.Boolean()),
    tags: t.Optional(t.Array(t.String())),
  });

  export type UpdateBody = typeof updateBody.static;

  // ===== Response DTOs =====

  export const movementResponse = t.Object({
    id: t.String(),
    userId: t.String(),
    budgetId: t.Nullable(t.String()),
    type: t.Union([
      t.Literal("INCOME"),
      t.Literal("EXPENSE"),
      t.Literal("TRANSFER"),
    ]),
    amount: t.String(),
    description: t.String(),
    category: t.String(),
    date: t.Date(),
    paymentMethod: t.Nullable(t.String()),
    isRecurring: t.Boolean(),
    tags: t.Nullable(t.Array(t.String())),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  });

  export type MovementResponse = typeof movementResponse.static;

  export const analyticsResponse = t.Object({
    totalIncome: t.Number(),
    totalExpenses: t.Number(),
    balance: t.Number(),
  });

  export type AnalyticsResponse = typeof analyticsResponse.static;

  /**
   * Delete response (null data — the message lives in the envelope)
   */
  export const deleteResponse = t.Null();
  export type DeleteResponse = typeof deleteResponse.static;
}
