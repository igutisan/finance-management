/**
 * Token Controller
 *
 * Elysia routes for token management (refresh, logout).
 *
 * Following Elysia's official best practice:
 *   - Repositories instantiated at module level
 *   - Passed as parameters to static service methods
 *   - Success responses wrapped in the generic envelope via ok()
 *   - Errors thrown as ApiError are handled by the error-handler plugin
 */

import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { RefreshTokenService } from "./service";
import { RefreshTokenRepository } from "./repository";
import { TokenModel } from "./model";
import { db } from "../../shared/db";
import { jwtConfig } from "../../shared/config/jwt.config";
import {
  ApiError,
  ErrorCode,
  ok,
  successSchema,
  errorSchema,
  validationErrorSchema,
} from "../../shared/responses";

const tokenRepo = new RefreshTokenRepository(db);

export const token = new Elysia({ prefix: "/auth" })
  // Add JWT plugin (same secret as user module)
  .use(
    jwt({
      name: "jwt",
      secret: jwtConfig.secret,
    }),
  )

  /**
   * POST /auth/refresh - Refresh token pair (token rotation)
   *
   * Validates the incoming refresh token, revokes it, and issues
   * a brand-new access + refresh pair.  If the token was already
   * revoked (reuse detection), ALL tokens for that user are
   * revoked as a security precaution.
   */
  .post(
    "/refresh",
    async ({ body, jwt }) => {
      const tokens = await RefreshTokenService.refresh(
        body.refresh_token,
        jwt,
        tokenRepo,
      );
      return ok(tokens, "Tokens refreshed successfully");
    },
    {
      body: TokenModel.refreshBody,
      response: {
        200: successSchema(
          TokenModel.tokenPairResponse,
          "Tokens refreshed successfully",
        ),
        401: errorSchema("Invalid or revoked refresh token"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * POST /auth/logout - Revoke a single refresh token
   *
   * The client sends the refresh token it wants to invalidate.
   * Typically called when the user logs out from the current device.
   */
  .post(
    "/logout",
    async ({ body }) => {
      await RefreshTokenService.revokeToken(body.refresh_token, tokenRepo);
      return ok(null, "Logged out successfully");
    },
    {
      body: TokenModel.refreshBody,
      response: {
        200: successSchema(TokenModel.logoutResponse, "Logged out"),
        401: errorSchema("Token not found or already revoked"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * POST /auth/logout-all - Revoke all refresh tokens for a user
   *
   * Requires a valid refresh token to identify the user.
   * Revokes every active refresh token for that user — effectively
   * logging them out from all devices.
   */
  .post(
    "/logout-all",
    async ({ body, jwt }) => {
      // Verify the token to extract the userId
      const payload = await jwt.verify(body.refresh_token);

      if (!payload || !payload.sub) {
        throw new ApiError(ErrorCode.TOKEN_INVALID);
      }

      const count = await RefreshTokenService.revokeAllUserTokens(
        payload.sub as string,
        tokenRepo,
      );

      return ok({ revoked_count: count }, "All sessions revoked successfully");
    },
    {
      body: TokenModel.refreshBody,
      response: {
        200: successSchema(
          TokenModel.logoutAllResponse,
          "All sessions revoked",
        ),
        401: errorSchema("Invalid token"),
        422: validationErrorSchema(),
      },
    },
  );
