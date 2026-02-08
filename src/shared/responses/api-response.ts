/**
 * API Response Builders & Elysia Schemas
 *
 * Provides:
 * - Runtime helper functions to build success/error response envelopes.
 * - Elysia `t` schemas so every endpoint can declare its response shape
 *   for validation and OpenAPI documentation.
 *
 * ────────────────────────────────────────────
 * Success envelope
 * ────────────────────────────────────────────
 * {
 *   "success": true,
 *   "status": 200,
 *   "message": "User created successfully",
 *   "data": { … }
 * }
 *
 * ────────────────────────────────────────────
 * Error envelope
 * ────────────────────────────────────────────
 * {
 *   "error": {
 *     "code": "USER_NOT_FOUND",
 *     "message": "User not found"
 *   }
 * }
 *
 * ────────────────────────────────────────────
 * Validation error envelope
 * ────────────────────────────────────────────
 * {
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Validation failed",
 *     "details": {
 *       "email": "Invalid email format"
 *     }
 *   }
 * }
 */

import { t, type TSchema } from "elysia";

// ──────────────────────────────────────────────
//  Runtime helpers
// ──────────────────────────────────────────────

export interface SuccessEnvelope<T = unknown> {
  success: true;
  status: number;
  message: string;
  data: T;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

/**
 * Build a success response envelope.
 *
 * @param data    - The payload to return.
 * @param message - Human-readable description (defaults to "OK").
 * @param status  - HTTP status code (defaults to 200).
 */
export function ok<T>(
  data: T,
  message = "OK",
  status = 200,
): SuccessEnvelope<T> {
  return {
    success: true,
    status,
    message,
    data,
  };
}

/**
 * Shorthand for 201 Created responses.
 */
export function created<T>(
  data: T,
  message = "Created successfully",
): SuccessEnvelope<T> {
  return ok(data, message, 201);
}

// ──────────────────────────────────────────────
//  Elysia schemas
// ──────────────────────────────────────────────

/**
 * Wraps any data schema inside the standard success envelope.
 *
 * @example
 * response: { 200: successSchema(UserModel.userResponse, "User fetched") }
 */
export function successSchema(dataSchema: TSchema, description?: string) {
  return t.Object(
    {
      success: t.Literal(true),
      status: t.Number(),
      message: t.String(),
      data: dataSchema,
    },
    { description },
  );
}

/**
 * Generic error response schema (non-validation).
 *
 * @example
 * response: { 404: errorSchema("Resource not found") }
 */
export function errorSchema(description?: string) {
  return t.Object(
    {
      error: t.Object({
        code: t.String(),
        message: t.String(),
      }),
    },
    { description },
  );
}

/**
 * Validation error response schema (includes field-level details).
 *
 * @example
 * response: { 422: validationErrorSchema() }
 */
export function validationErrorSchema(description = "Validation failed") {
  return t.Object(
    {
      error: t.Object({
        code: t.Literal("VALIDATION_ERROR"),
        message: t.String(),
        details: t.Record(t.String(), t.String()),
      }),
    },
    { description },
  );
}
