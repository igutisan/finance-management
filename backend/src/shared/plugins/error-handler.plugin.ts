/**
 * Error Handler Plugin
 *
 * Centralised Elysia plugin that intercepts every exception thrown
 * anywhere in the application and maps it to the generic error
 * envelope the API returns.
 *
 * Follows the official Elysia error-handling pattern:
 *   1. Register the custom error class with `.error()` so the
 *      framework assigns it a type-safe code string.
 *   2. Use `.onError()` and match on `code` for type narrowing
 *      and auto-completion.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Error type          │  HTTP   │  Envelope                  │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ApiError            │  *      │  { error: { code, message } }          │
 * │  ApiError (valid.)   │  422    │  { error: { code, message, details } } │
 * │  Elysia VALIDATION   │  422    │  { error: { code, message, details } } │
 * │  Elysia NOT_FOUND    │  404    │  { error: { code, message } }          │
 * │  Unhandled / unknown │  500    │  { error: { code, message } }          │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   import { errorHandler } from './shared/plugins/error-handler.plugin';
 *
 *   const app = new Elysia()
 *     .use(errorHandler)
 *     .use(user)
 *     ...
 */

import { Elysia } from "elysia";
import { ApiError, ErrorCode, ErrorDefaults } from "../responses";

// ──────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === "production";

/**
 * Build the standard error envelope returned by the API.
 */
function buildErrorEnvelope(
  code: string,
  message: string,
  details?: Record<string, string>,
) {
  const envelope: {
    error: { code: string; message: string; details?: Record<string, string> };
  } = {
    error: { code, message },
  };

  if (details && Object.keys(details).length > 0) {
    envelope.error.details = details;
  }

  return envelope;
}

/**
 * Try to extract field-level details from an Elysia validation error.
 *
 * Elysia exposes an `all` array on its validation error objects where
 * each item may have a `path` (e.g. "/email") and a `message`.
 */
function extractValidationDetails(error: unknown): Record<string, string> {
  const details: Record<string, string> = {};

  const allErrors = (error as any)?.all;
  if (!Array.isArray(allErrors)) return details;

  for (const err of allErrors) {
    const path = String(err.path ?? "")
      .replace(/^\//, "")
      .replace(/\//g, ".");

    const key = path || "unknown";
    details[key] = err.message ?? "Invalid value";
  }

  return details;
}

// ──────────────────────────────────────────────────────────
//  Plugin
// ──────────────────────────────────────────────────────────

export const errorHandler = new Elysia({ name: "plugin.errorHandler" })
  // Register ApiError so Elysia assigns it the type-safe code "API_ERROR".
  // This enables `code === 'API_ERROR'` in `onError` with full
  // auto-completion and type narrowing — the pattern recommended
  // by the official Elysia documentation.
  .error({
    API_ERROR: ApiError,
  })
  .onError(({ code, error, set }) => {
    // ── 1. Our custom ApiError (type-safe match) ───────────
    if (code === "API_ERROR") {
      set.status = error.status;
      return error.toResponse();
    }

    // ── 2. Elysia built-in validation errors ───────────────
    if (code === "VALIDATION") {
      set.status = 422;

      const details = extractValidationDetails(error);

      return buildErrorEnvelope(
        ErrorCode.VALIDATION_ERROR,
        ErrorDefaults[ErrorCode.VALIDATION_ERROR].message,
        details,
      );
    }

    // ── 3. Elysia 404 (NOT_FOUND) ─────────────────────────
    if (code === "NOT_FOUND") {
      set.status = 404;

      return buildErrorEnvelope(
        ErrorCode.NOT_FOUND,
        "The requested resource was not found",
      );
    }

    // ── 4. Catch-all for unexpected / unhandled errors ─────
    console.error("[UNHANDLED ERROR]", error);

    set.status = 500;

    return buildErrorEnvelope(
      ErrorCode.INTERNAL_ERROR,
      isProduction
        ? "Internal server error"
        : (error as Error)?.message || "Internal server error",
    );
  });
