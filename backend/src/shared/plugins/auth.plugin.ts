/**
 * Auth Plugin
 *
 * Elysia plugin that provides authentication via JWT using the
 * framework's recommended macro + resolve pattern.
 *
 * How it works:
 *   1. Registers the JWT plugin (same secret used everywhere).
 *   2. Defines an `auth` macro.  When a route sets `auth: true`
 *      in its options, the macro's `resolve` runs **before** the
 *      handler — it extracts the Bearer token from the
 *      Authorization header, verifies it with `jwt.verify()`,
 *      and injects `userId` into the handler's context.
 *   3. If the token is missing, invalid, or not an access token,
 *      an ApiError is thrown and caught by the error-handler plugin.
 *
 * Usage in a controller:
 *
 *   import { authPlugin } from '../../shared/plugins';
 *
 *   export const budget = new Elysia({ prefix: '/budgets' })
 *     .use(authPlugin)
 *
 *     // Protected route — just add `auth: true`
 *     .get('/', ({ userId }) => {
 *       //         ^^^^^^ string, type-safe, autocomplete
 *       return BudgetService.getUserBudgets(userId, budgetRepo);
 *     }, { auth: true })
 *
 *     // Public route — no `auth` option, no token required
 *     .get('/public', () => 'anyone can see this')
 */

import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { jwtConfig } from "../config/jwt.config";
import { ApiError, ErrorCode } from "../responses";

export const authPlugin = new Elysia({ name: "plugin.auth" })
  // ── JWT plugin (shared secret) ────────────────────────────
  .use(
    jwt({
      name: "jwt",
      secret: jwtConfig.secret,
    }),
  )

  // ── Auth macro ────────────────────────────────────────────
  .macro({
    /**
     * When a route declares `auth: true`, this resolve runs
     * before the handler.  It:
     *   1. Extracts the Bearer token from the Authorization header.
     *   2. Verifies the JWT signature.
     *   3. Ensures the token is an access token (not a refresh token).
     *   4. Returns `{ userId }` which merges into the route context.
     *
     * If any check fails an ApiError is thrown and the
     * error-handler plugin takes care of the response.
     */
    auth: {
      async resolve({ jwt, headers, status }) {
        // ── Extract Bearer token ──────────────────────────
        const raw = headers.authorization;

        if (!raw) {
          throw new ApiError(ErrorCode.TOKEN_MISSING);
        }

        const token = raw.replace(/^Bearer\s+/i, "");

        if (!token) {
          throw new ApiError(ErrorCode.TOKEN_MISSING);
        }

        // ── Verify JWT signature ──────────────────────────
        const payload = await jwt.verify(token);

        if (!payload) {
          throw new ApiError(ErrorCode.TOKEN_INVALID);
        }

        // ── Ensure it's an access token ───────────────────
        if (payload.type !== "access") {
          throw new ApiError(ErrorCode.TOKEN_INVALID, {
            message: "Expected an access token",
          });
        }

        // ── Extract userId ────────────────────────────────
        const userId = payload.sub as string | undefined;

        if (!userId) {
          throw new ApiError(ErrorCode.TOKEN_INVALID, {
            message: "Token payload is missing the sub claim",
          });
        }

        // ── Inject into context ───────────────────────────
        return { userId };
      },
    },
  });
