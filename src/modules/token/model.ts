/**
 * Token Model
 *
 * Defines validation schemas and types for token-related requests and responses.
 * Uses Elysia.t for both runtime validation and compile-time type inference.
 */

import { t } from "elysia";

export namespace TokenModel {
  // ===== Request DTOs =====

  /**
   * Refresh token request body
   */
  export const refreshBody = t.Object({
    refresh_token: t.String({ minLength: 1 }),
  });

  export type RefreshBody = typeof refreshBody.static;

  // ===== Response DTOs =====

  /**
   * Token pair response (access + refresh)
   */
  export const tokenPairResponse = t.Object({
    access_token: t.String(),
    refresh_token: t.String(),
    expires_in: t.Number(),
  });

  export type TokenPairResponse = typeof tokenPairResponse.static;

  /**
   * Logout response (null data — the message lives in the envelope)
   */
  export const logoutResponse = t.Null();
  export type LogoutResponse = typeof logoutResponse.static;

  /**
   * Logout-all response (returns the count of revoked tokens)
   */
  export const logoutAllResponse = t.Object({
    revoked_count: t.Number(),
  });

  export type LogoutAllResponse = typeof logoutAllResponse.static;
}
