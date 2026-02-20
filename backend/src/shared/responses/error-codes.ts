/**
 * Error Codes
 *
 * Centralized error codes for the entire API.
 * Each code maps to a specific HTTP status and default message.
 */

export enum ErrorCode {
  // ===== Generic =====
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_FOUND = "NOT_FOUND",
  BAD_REQUEST = "BAD_REQUEST",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
 
  // ===== Auth =====
  TOKEN_MISSING = "TOKEN_MISSING",
  TOKEN_INVALID = "TOKEN_INVALID",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_REVOKED = "TOKEN_REVOKED",
  TOKEN_REUSE_DETECTED = "TOKEN_REUSE_DETECTED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",

  // ===== User =====
  USER_NOT_FOUND = "USER_NOT_FOUND",
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",

  // ===== Budget =====
  BUDGET_NOT_FOUND = "BUDGET_NOT_FOUND",
  INVALID_DATE_RANGE = "INVALID_DATE_RANGE",
  INVALID_AMOUNT = "INVALID_AMOUNT",

  // ===== Movement =====
  MOVEMENT_NOT_FOUND = "MOVEMENT_NOT_FOUND",
  BUDGET_OWNERSHIP = "BUDGET_OWNERSHIP",
}

/**
 * Default HTTP status and message for each error code.
 */
export const ErrorDefaults: Record<
  ErrorCode,
  { status: number; message: string }
> = {
  // Generic
  [ErrorCode.INTERNAL_ERROR]: {
    status: 500,
    message: "Internal server error",
  },
  [ErrorCode.NOT_FOUND]: {
    status: 404,
    message: "Resource not found",
  },
  [ErrorCode.BAD_REQUEST]: {
    status: 400,
    message: "Bad request",
  },
  [ErrorCode.VALIDATION_ERROR]: {
    status: 422,
    message: "Validation failed",
  },
  [ErrorCode.UNAUTHORIZED]: {
    status: 401,
    message: "Authentication required",
  },
  [ErrorCode.FORBIDDEN]: {
    status: 403,
    message: "Access denied",
  },

  // Auth
  [ErrorCode.TOKEN_MISSING]: {
    status: 401,
    message: "Authentication token is missing",
  },
  [ErrorCode.TOKEN_INVALID]: {
    status: 401,
    message: "Authentication token is invalid",
  },
  [ErrorCode.TOKEN_EXPIRED]: {
    status: 401,
    message: "Authentication token has expired",
  },
  [ErrorCode.TOKEN_REVOKED]: {
    status: 401,
    message: "Token has been revoked",
  },
  [ErrorCode.TOKEN_REUSE_DETECTED]: {
    status: 401,
    message:
      "Token reuse detected — all sessions have been revoked for security",
  },
  [ErrorCode.INVALID_CREDENTIALS]: {
    status: 401,
    message: "Invalid email or password",
  },

  // User
  [ErrorCode.USER_NOT_FOUND]: {
    status: 404,
    message: "User not found",
  },
  [ErrorCode.EMAIL_ALREADY_EXISTS]: {
    status: 409,
    message: "Email already exists",
  },

  // Budget
  [ErrorCode.BUDGET_NOT_FOUND]: {
    status: 404,
    message: "Budget not found",
  },
  [ErrorCode.INVALID_DATE_RANGE]: {
    status: 400,
    message: "End date must be after start date",
  },
  [ErrorCode.INVALID_AMOUNT]: {
    status: 400,
    message: "Amount must be positive",
  },

  // Movement
  [ErrorCode.MOVEMENT_NOT_FOUND]: {
    status: 404,
    message: "Movement not found",
  },
  [ErrorCode.BUDGET_OWNERSHIP]: {
    status: 403,
    message: "Budget does not belong to user",
  },
};
