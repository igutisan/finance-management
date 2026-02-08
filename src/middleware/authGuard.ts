/**
 * Auth Guard Middleware
 *
 * Validates the JWT token from the Authorization header.
 * Throws ApiError for missing or invalid tokens so the
 * global error handler can return the generic error envelope.
 */

import { ApiError, ErrorCode } from "../shared/responses";

interface AuthGuardContext {
  jwt: {
    verify: (token?: string) => Promise<false | Record<string, unknown>>;
  };
  headers: Record<string, string | undefined>;
}

export const authGuard = async ({ jwt, headers }: AuthGuardContext) => {
  const token = headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new ApiError(ErrorCode.TOKEN_MISSING);
  }

  const payload = await jwt.verify(token);

  if (!payload) {
    throw new ApiError(ErrorCode.TOKEN_INVALID);
  }

  return { user: payload };
};
