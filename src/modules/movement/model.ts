/**
 * Movement Model
 *
 * Defines validation schemas and types for movement-related requests and responses.
 */

import { t } from "elysia";
import { paginationQuerySchema } from "../../shared/types/pagination.types";

export namespace MovementModel {
  // ===== Request DTOs =====

  /**
   * Query params for GET /movements (pagination + filters)
   */
  export const queryParams = t.Object({
    ...paginationQuerySchema,
    type: t.Optional(
      t.Union([
        t.Literal("INCOME"),
        t.Literal("EXPENSE"),
        t.Literal("TRANSFER"),
      ]),
    ),
    month: t.Optional(t.Numeric({ minimum: 1, maximum: 12 })),
    year: t.Optional(t.Numeric({ minimum: 2000, maximum: 2100 })),
  });

  export type QueryParams = typeof queryParams.static;


  export const createBody = t.Object({
    periodId: t.Optional(t.String()),
    type: t.Union([
      t.Literal("INCOME"),
      t.Literal("EXPENSE"),
      t.Literal("TRANSFER"),
    ]),
    amount: t.String({ pattern: "^\\d+(\\.\\d{1,2})?$", minLength: 1 }),
    description: t.String({ minLength: 1 }),
    date: t.String(), // ISO date string
    paymentMethod: t.Optional(t.String()),
    isRecurring: t.Optional(t.Boolean()),
    tags: t.Optional(t.Array(t.String())),
  });

  export type CreateBody = typeof createBody.static;

  export const updateBody = t.Object({
    periodId: t.Optional(t.String()),
    type: t.Optional(
      t.Union([
        t.Literal("INCOME"),
        t.Literal("EXPENSE"),
        t.Literal("TRANSFER"),
      ]),
    ),
    amount: t.Optional(t.String({ pattern: "^\\d+(\\.\\d{1,2})?$", minLength: 1 })),
    description: t.Optional(t.String()),
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
    periodId: t.Nullable(t.String()),
    type: t.Union([
      t.Literal("INCOME"),
      t.Literal("EXPENSE"),
      t.Literal("TRANSFER"),
    ]),
    amount: t.String(),
    description: t.String(),
    date: t.Date(),
    paymentMethod: t.Nullable(t.String()),
    isRecurring: t.Boolean(),
    tags: t.Nullable(t.Array(t.String())),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  });

  export type MovementResponse = typeof movementResponse.static;

  /**
   * Movement list response (array of movements)
   */
  export const movementListResponse = t.Array(movementResponse);
  export type MovementListResponse = typeof movementListResponse.static;

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
