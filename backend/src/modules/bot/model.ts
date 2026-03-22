/**
 * Bot Model
 *
 * Validation schemas and types for bot-specific endpoints.
 */

import { t } from "elysia";

export namespace BotModel {
  // ===== Request DTOs =====

  export const identifyBody = t.Object({
    phone: t.String({ minLength: 5, maxLength: 20 }),
  });

  export type IdentifyBody = typeof identifyBody.static;

  export const verifyPinBody = t.Object({
    phone: t.String({ minLength: 5, maxLength: 20 }),
    pin: t.String({ pattern: "^\\d{6}$" }),
  });

  export type VerifyPinBody = typeof verifyPinBody.static;

  export const createMovementBody = t.Object({
    phone: t.String({ minLength: 5, maxLength: 20 }),
    type: t.Union([t.Literal("INCOME"), t.Literal("EXPENSE")]),
    amount: t.String({ pattern: "^\\d+(\\.\\d{1,2})?$", minLength: 1 }),
    description: t.String({ minLength: 1 }),
    budgetId: t.Optional(t.String()),
  });

  export type CreateMovementBody = typeof createMovementBody.static;

  export const phoneBody = t.Object({
    phone: t.String({ minLength: 5, maxLength: 20 }),
  });

  export type PhoneBody = typeof phoneBody.static;

  // ===== Response DTOs =====

  export const identifyResponse = t.Object({
    exists: t.Boolean(),
    firstName: t.Optional(t.String()),
    hasBotPin: t.Optional(t.Boolean()),
  });

  export type IdentifyResponse = typeof identifyResponse.static;

  export const verifyPinResponse = t.Object({
    token: t.String(),
    expiresIn: t.Number(),
  });

  export type VerifyPinResponse = typeof verifyPinResponse.static;

  export const movementCreatedResponse = t.Object({
    id: t.String(),
    type: t.String(),
    amount: t.String(),
    description: t.String(),
    budgetName: t.Nullable(t.String()),
  });

  export type MovementCreatedResponse = typeof movementCreatedResponse.static;

  export const budgetItemResponse = t.Object({
    id: t.String(),
    name: t.String(),
    amount: t.String(),
    spent: t.String(),
    remaining: t.Number(),
    percentageUsed: t.Number(),
  });

  export type BudgetItemResponse = typeof budgetItemResponse.static;

  export const budgetsListResponse = t.Array(budgetItemResponse);
  export type BudgetsListResponse = typeof budgetsListResponse.static;

  export const budgetNameItem = t.Object({
    id: t.String(),
    name: t.String(),
  });

  export type BudgetNameItem = typeof budgetNameItem.static;

  export const budgetNamesResponse = t.Array(budgetNameItem);
  export type BudgetNamesResponse = typeof budgetNamesResponse.static;

  export const analyticsResponse = t.Object({
    totalIncome: t.Number(),
    totalExpenses: t.Number(),
    balance: t.Number(),
  });

  export type AnalyticsResponse = typeof analyticsResponse.static;
}
