/**
 * ApiError
 *
 * Custom error class adapted to Elysia's error handling pattern.
 *
 * Elysia recognises two conventions on error classes:
 *   1. A `status` property  → used as the HTTP status code automatically.
 *   2. A `toResponse()` method → called by the framework to serialise
 *      the error when it is NOT intercepted by an `onError` hook.
 *
 * This class carries a machine-readable `code` (from the ErrorCode enum),
 * a human-readable `message`, an HTTP `status`, and optional field-level
 * `details` for validation errors — everything the global error handler
 * needs to produce the generic error envelope.
 *
 * @example
 * // Simple error (uses defaults from ErrorDefaults)
 * throw new ApiError(ErrorCode.USER_NOT_FOUND);
 *
 * // Custom message
 * throw new ApiError(ErrorCode.USER_NOT_FOUND, {
 *   message: 'No user with that ID exists',
 * });
 *
 * // Validation error with field-level details
 * throw ApiError.validation({ email: 'Invalid email format' });
 */

import { ErrorCode, ErrorDefaults } from "./error-codes";

export class ApiError extends Error {
  /** Machine-readable error code (e.g. USER_NOT_FOUND) */
  public readonly code: ErrorCode;

  /** HTTP status code — Elysia reads this automatically */
  public readonly status: number;

  /**
   * Optional field-level validation details.
   * Example: { email: "Invalid email format", password: "Too short" }
   */
  public readonly details?: Record<string, string>;

  constructor(
    code: ErrorCode,
    options?: {
      message?: string;
      status?: number;
      details?: Record<string, string>;
    },
  ) {
    const defaults = ErrorDefaults[code];
    const message = options?.message ?? defaults.message;

    super(message);

    this.code = code;
    this.status = options?.status ?? defaults.status;
    this.details = options?.details;

    // Preserve the correct prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "ApiError";
  }

  // ── Factories ─────────────────────────────────────────────

  /**
   * Convenience factory — creates a validation error with field details.
   *
   * @example
   * throw ApiError.validation({ email: "Invalid email format" });
   */
  static validation(
    details: Record<string, string>,
    message?: string,
  ): ApiError {
    return new ApiError(ErrorCode.VALIDATION_ERROR, {
      message: message ?? ErrorDefaults[ErrorCode.VALIDATION_ERROR].message,
      details,
    });
  }

  // ── Serialisation ─────────────────────────────────────────

  /**
   * Called by Elysia when the error is thrown and not caught
   * by an `onError` hook.  Returns the generic error envelope.
   */
  toResponse() {
    return this.toJSON();
  }

  /**
   * Serialise to the API error envelope.
   *
   * Standard error:
   * {
   *   "error": {
   *     "code": "USER_NOT_FOUND",
   *     "message": "User not found"
   *   }
   * }
   *
   * Validation error:
   * {
   *   "error": {
   *     "code": "VALIDATION_ERROR",
   *     "message": "Validation failed",
   *     "details": { "email": "Invalid email format" }
   *   }
   * }
   */
  toJSON() {
    const envelope: {
      error: {
        code: string;
        message: string;
        details?: Record<string, string>;
      };
    } = {
      error: {
        code: this.code,
        message: this.message,
      },
    };

    if (this.details && Object.keys(this.details).length > 0) {
      envelope.error.details = this.details;
    }

    return envelope;
  }
}
