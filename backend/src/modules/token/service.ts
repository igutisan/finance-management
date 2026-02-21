/**
 * Refresh Token Service
 *
 * Centralises all token generation and refresh logic.
 *
 * Following Elysia's official best practice:
 *   - abstract class with static methods (no class allocation)
 *   - Repositories passed as parameters from the controller
 *   - Throws ApiError so the error-handler plugin produces the
 *     generic error envelope automatically
 *   - Returns raw data — the controller wraps it with ok() / created()
 *
 * Security features:
 *   - Refresh tokens are hashed with SHA-256 before persistence;
 *     only the hash is stored — the raw JWT is never saved.
 *   - Token rotation: every refresh invalidates the old token
 *     and issues a brand-new pair.
 *   - Reuse detection: if a revoked token is presented again,
 *     ALL tokens for that user are revoked as a precaution
 *     (the token may have been stolen).
 */

import type { JwtContext } from "../../shared/types/jwt.types";
import type { RefreshTokenRepository } from "./repository";
import type { TokenModel } from "./model";
import { jwtConfig } from "../../shared/config/jwt.config";
import { TokenUtil } from "../../shared/utils/token.util";
import { ApiError, ErrorCode } from "../../shared/responses";
import crypto from 'crypto';

export abstract class RefreshTokenService {
  /**
   * Generate a new access + refresh token pair and persist
   * the refresh token hash in the database.
   *
   * Called by UserService.login after credentials are verified.
   */
  static async createTokenPair(
    userId: string,
    jwt: JwtContext,
    tokenRepo: RefreshTokenRepository,
  ): Promise<TokenModel.TokenPairResponse> {
    const now = Math.floor(Date.now() / 1000);
    const jtiAccess = crypto.randomUUID();
    const jtiRefresh = crypto.randomUUID();

    // Generate access token (short-lived)
    const accessToken = await jwt.sign({
      sub: userId,
      jti: jtiAccess,
      type: "access",
      exp: now + jwtConfig.accessToken.expiresIn,
    });

    // Generate refresh token (long-lived)
    const refreshToken = await jwt.sign({
      sub: userId,
      jti: jtiRefresh,
      type: "refresh",
      exp: now + jwtConfig.refreshToken.expiresIn,
    });

    // Store only the SHA-256 hash — never the raw JWT
    const tokenHash = TokenUtil.hashToken(refreshToken);

    await tokenRepo.create({
      userId,
      tokenHash,
      expiresAt: new Date((now + jwtConfig.refreshToken.expiresIn) * 1000),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: jwtConfig.accessToken.expiresIn,
    };
  }

  /**
   * Refresh an existing token pair (token rotation).
   *
   * Flow:
   *   1. Verify the JWT signature and decode the payload.
   *   2. Hash the incoming token and look it up in the DB.
   *   3. If NOT found → check if it was previously revoked
   *      (reuse detection).  If so, revoke ALL user tokens.
   *   4. If found → validate ownership (payload.sub === record.userId).
   *   5. Revoke the old token.
   *   6. Issue a fresh token pair and persist the new refresh hash.
   */
  static async refresh(
    refreshToken: string,
    jwt: JwtContext,
    tokenRepo: RefreshTokenRepository,
  ): Promise<TokenModel.TokenPairResponse> {
    // ── 1. Verify JWT signature ──────────────────────────────
    const payload = await jwt.verify(refreshToken);

    if (!payload) {
      throw new ApiError(ErrorCode.TOKEN_INVALID);
    }

    // Ensure it's actually a refresh token, not an access token
    if (payload.type !== "refresh") {
      throw new ApiError(ErrorCode.TOKEN_INVALID, {
        message: "Expected a refresh token",
      });
    }

    const userId = payload.sub as string;
    if (!userId) {
      throw new ApiError(ErrorCode.TOKEN_INVALID);
    }

    // ── 2. Hash and look up in DB ────────────────────────────
    const tokenHash = TokenUtil.hashToken(refreshToken);
    const validToken = await tokenRepo.findValidByHash(tokenHash);

    // ── 3. Reuse detection ───────────────────────────────────
    if (!validToken) {
      // Check if this token existed but was already revoked
      const revokedToken = await tokenRepo.findByHash(tokenHash);

      if (revokedToken && revokedToken.isRevoked) {
        // Token reuse detected — revoke ALL tokens for this user
        await tokenRepo.revokeAllUserTokens(revokedToken.userId);
        throw new ApiError(ErrorCode.TOKEN_REUSE_DETECTED);
      }

      // Token never existed in our DB, or it expired
      throw new ApiError(ErrorCode.TOKEN_INVALID);
    }

    // ── 4. Validate ownership ────────────────────────────────
    if (validToken.userId !== userId) {
      // Payload sub doesn't match the token's owner in the DB
      await tokenRepo.revokeToken(tokenHash);
      throw new ApiError(ErrorCode.TOKEN_INVALID);
    }

    // ── 5. Revoke the old token ──────────────────────────────
    await tokenRepo.revokeToken(tokenHash);

    // ── 6. Issue new pair ────────────────────────────────────
    return await this.createTokenPair(userId, jwt, tokenRepo);
  }

  /**
   * Revoke a specific refresh token (e.g. on logout).
   */
  static async revokeToken(
    refreshToken: string,
    tokenRepo: RefreshTokenRepository,
  ): Promise<boolean> {
    const tokenHash = TokenUtil.hashToken(refreshToken);
    const revoked = await tokenRepo.revokeToken(tokenHash);

    if (!revoked) {
      throw new ApiError(ErrorCode.TOKEN_INVALID, {
        message: "Token not found or already revoked",
      });
    }

    return true;
  }

  /**
   * Revoke all refresh tokens for a user (e.g. logout from all devices,
   * password change, account compromise).
   */
  static async revokeAllUserTokens(
    userId: string,
    tokenRepo: RefreshTokenRepository,
  ): Promise<number> {
    return await tokenRepo.revokeAllUserTokens(userId);
  }
}
