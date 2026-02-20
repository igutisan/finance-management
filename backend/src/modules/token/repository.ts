/**
 * Refresh Token Repository
 *
 * Data access layer for refresh tokens using Drizzle ORM.
 */

import { eq, and, gt } from "drizzle-orm";
import type { Database } from "../../shared/db";
import { refreshTokens } from "../../shared/db/schema";
import type { Token, NewToken } from "../../shared/db/schema";

export class RefreshTokenRepository {
  constructor(private readonly db: Database) {}

  /**
   * Create a new refresh token
   */
  async create(data: NewToken): Promise<Token> {
    const result = await this.db.insert(refreshTokens).values(data).returning();

    return result[0];
  }

  /**
   * Find a token by its hash regardless of revocation status.
   * Used for reuse detection: if a revoked token is presented
   * again, it means the token was likely stolen.
   */
  async findByHash(tokenHash: string): Promise<Token | null> {
    const result = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find a valid refresh token by its hash
   * Returns null if token doesn't exist, is revoked, or expired
   */
  async findValidByHash(tokenHash: string): Promise<Token | null> {
    const result = await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.isRevoked, false),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Revoke a specific token
   */
  async revokeToken(tokenHash: string): Promise<boolean> {
    const result = await this.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .returning();

    return result.length > 0;
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await this.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.isRevoked, false),
        ),
      )
      .returning();

    return result.length;
  }

  /**
   * Clean up expired tokens (for maintenance)
   */
  //async cleanupExpired(): Promise<number> {
  //   const result = await this.db
  //     .delete(refreshTokens)
  //     .where(gt(new Date(), refreshTokens.expiresAt))
  //     .returning();

  //   return result.length;
  // }

  /**
   * Get all active tokens for a user (for debugging/admin)
   */
  async findActiveByUserId(userId: string): Promise<Token[]> {
    return await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.isRevoked, false),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      );
  }
}
