/**
 * ApiError
 *
 * Custom error class used across all services.
 * Carries a structured error code, HTTP status, message,
 * and optional validation details so the global error handler
 * can build the generic response envelope automatically.
 */

import { ErrorCode, ErrorDefaults } from "./error-codes";

export class ApiError extends Error {
  /** Machine-readable error code (e.g. USER_NOT_FOUND) */
  public readonly code: ErrorCode;

  /** HTTP status code to return */
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

  /**
   * Convenience factory – throws a validation error with field details.
   *
   * @example
   * throw ApiError.validation({ email: "Invalid email format" });
   */
  static validation(details: Record<string, string>, message?: string): ApiError {
    return new ApiError(ErrorCode.VALIDATION_ERROR, {
      message: message ?? ErrorDefaults[ErrorCode.VALIDATION_ERROR].message,
      details,
    });
  }

  /**
   * Serialise to the API error envelope.
   *
   * Standard error:
   * ```
   * { error: { code: "USER_NOT_FOUND", message: "User not found" } }
   * ```
   *
   * Validation error:
   * ```
   * { error: { code: "VALIDATION_ERROR", details: { email: "Invalid email format" } } }
   * ```
   */
  toJSON(): Record<string, unknown> {
    if (this.details) {
      return {
        error: {
          code: this.code,
          message: this.message,
          details: this.details,
        },
      };
    }

    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}
