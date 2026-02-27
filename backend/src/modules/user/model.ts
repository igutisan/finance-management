/**
 * User Model
 *
 * Defines validation schemas and types for user-related requests and responses.
 * Uses Elysia.t for both runtime validation and compile-time type inference.
 */

import { t } from "elysia";

export namespace UserModel {
  // ===== Request DTOs =====

  /**
   * Register new user
   */
  export const registerBody = t.Object({
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 8 }),
    firstName: t.String({ minLength: 1 }),
    lastName: t.String({
      minLength: 2,
      maxLength: 100,
      error: "Last name must be between 2 and 100 characters",
    }),
    phone: t.String({
      minLength: 5,
      maxLength: 20,
      error: "Phone must be a valid number length",
    }),
    botPin: t.Optional(t.String({
      pattern: "^\\d{6}$",
      error: "Bot PIN must be exactly 6 digits",
    })),
  });

  export type RegisterBody = typeof registerBody.static;

  /**
   * Login user
   */
  export const loginBody = t.Object({
    email: t.String({ format: "email" }),
    password: t.String(),
  });

  export type LoginBody = typeof loginBody.static;

  /**
   * Update user
   */
  export const updateBody = t.Object({
    email: t.Optional(t.String({ format: "email" })),
    password: t.Optional(t.String({ minLength: 8 })),
    firstName: t.Optional(t.String()),
    lastName: t.Optional(t.String({
      minLength: 2,
      maxLength: 100,
    })),
    phone: t.Optional(t.String({
      minLength: 5,
      maxLength: 20,
    })),
    botPin: t.Optional(t.String({
      pattern: "^\\d{6}$",
      error: "Bot PIN must be exactly 6 digits",
    })),
    isActive: t.Optional(t.Boolean()),
  });

  export type UpdateBody = typeof updateBody.static;

  // ===== Response DTOs =====

  /**
   * User response (excludes sensitive data)
   */
  export const userResponse = t.Object({
    id: t.String(),
    email: t.String({ format: "email" }),
    firstName: t.String(),
    lastName: t.String(),
    phone: t.String(),
    isActive: t.Boolean(),
    emailVerified: t.Boolean(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  });

  export type UserResponse = typeof userResponse.static;

  /**
   * Login response (includes tokens + user data)
   */
  export const loginResponse = t.Object({
    access_token: t.String(),
    refresh_token: t.String(),
    expires_in: t.Number(),
    user: userResponse,
  });

  export type LoginResponse = typeof loginResponse.static;

  /**
   * Delete response (null data — the message lives in the envelope)
   */
  export const deleteResponse = t.Null();
  export type DeleteResponse = typeof deleteResponse.static;
}
