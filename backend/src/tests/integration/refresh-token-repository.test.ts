/**
 * Refresh Token Repository - Integration Tests
 * 
 * Tests for database operations on refresh tokens.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { RefreshTokenRepository } from "../../modules/token/repository";
import { db } from '../../shared/db';
import { refreshTokens, users } from '../../shared/db/schema';
import { eq } from 'drizzle-orm';
import { TokenUtil } from '../../shared/utils/token.util';

describe('RefreshTokenRepository', () => {
  const repo = new RefreshTokenRepository(db);
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user
    const result = await db.insert(users).values({
      email: 'tokentest@example.com',
      passwordHash: 'hash',
      firstName: 'Token',
      lastName: 'Test',
    }).returning();
    
    testUserId = result[0].id;
  });

  beforeEach(async () => {
    // Clean up refresh tokens before each test
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, testUserId));
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, testUserId));
    await db.delete(users).where(eq(users.email, 'tokentest@example.com'));
  });

  describe('create()', () => {
    it('should create a new refresh token', async () => {
      // Arrange
      const token = TokenUtil.generateRefreshToken();
      const tokenHash = TokenUtil.hashToken(token);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Act
      const result = await repo.create({
        userId: testUserId,
        tokenHash,
        expiresAt,
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.tokenHash).toBe(tokenHash);
      expect(result.isRevoked).toBe(false);
    });

    it('should create token with default values', async () => {
      // Arrange
      const token = TokenUtil.generateRefreshToken();
      const tokenHash = TokenUtil.hashToken(token);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Act
      const result = await repo.create({
        userId: testUserId,
        tokenHash,
        expiresAt,
      });

      // Assert
      expect(result.isRevoked).toBe(false);
      expect(result.createdAt).toBeDefined();
    });
  });

  describe('findValidByHash()', () => {
    it('should find a valid token by hash', async () => {
      // Arrange
      const token = TokenUtil.generateRefreshToken();
      const tokenHash = TokenUtil.hashToken(token);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await repo.create({
        userId: testUserId,
        tokenHash,
        expiresAt,
      });

      // Act
      const result = await repo.findValidByHash(tokenHash);

      // Assert
      expect(result).toBeDefined();
      expect(result?.tokenHash).toBe(tokenHash);
      expect(result?.userId).toBe(testUserId);
    });

    it('should return null for revoked token', async () => {
      // Arrange
      const token = TokenUtil.generateRefreshToken();
      const tokenHash = TokenUtil.hashToken(token);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await repo.create({
        userId: testUserId,
        tokenHash,
        expiresAt,
        isRevoked: true,
      });

      // Act
      const result = await repo.findValidByHash(tokenHash);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      // Arrange
      const token = TokenUtil.generateRefreshToken();
      const tokenHash = TokenUtil.hashToken(token);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1); // Yesterday

      await repo.create({
        userId: testUserId,
        tokenHash,
        expiresAt,
      });

      // Act
      const result = await repo.findValidByHash(tokenHash);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for non-existent token', async () => {
      // Act
      const result = await repo.findValidByHash('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('revokeToken()', () => {
    it('should revoke a token', async () => {
      // Arrange
      const token = TokenUtil.generateRefreshToken();
      const tokenHash = TokenUtil.hashToken(token);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await repo.create({
        userId: testUserId,
        tokenHash,
        expiresAt,
      });

      // Act
      const revoked = await repo.revokeToken(tokenHash);

      // Assert
      expect(revoked).toBe(true);
      
      // Verify it's revoked
      const result = await repo.findValidByHash(tokenHash);
      expect(result).toBeNull();
    });

    it('should return false for non-existent token', async () => {
      // Act
      const revoked = await repo.revokeToken('nonexistent');

      // Assert
      expect(revoked).toBe(false);
    });
  });

  describe('revokeAllUserTokens()', () => {
    it('should revoke all active tokens for a user', async () => {
      // Arrange - Create 3 tokens
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      for (let i = 0; i < 3; i++) {
        const token = TokenUtil.generateRefreshToken();
        const tokenHash = TokenUtil.hashToken(token);
        await repo.create({
          userId: testUserId,
          tokenHash,
          expiresAt,
        });
      }

      // Act
      const revokedCount = await repo.revokeAllUserTokens(testUserId);

      // Assert
      expect(revokedCount).toBe(3);
      
      // Verify all are revoked
      const activeTokens = await repo.findActiveByUserId(testUserId);
      expect(activeTokens).toHaveLength(0);
    });

    it('should not revoke already revoked tokens', async () => {
      // Arrange - Create 2 active, 1 revoked
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      for (let i = 0; i < 2; i++) {
        const token = TokenUtil.generateRefreshToken();
        const tokenHash = TokenUtil.hashToken(token);
        await repo.create({
          userId: testUserId,
          tokenHash,
          expiresAt,
        });
      }

      const revokedToken = TokenUtil.generateRefreshToken();
      const revokedHash = TokenUtil.hashToken(revokedToken);
      await repo.create({
        userId: testUserId,
        tokenHash: revokedHash,
        expiresAt,
        isRevoked: true,
      });

      // Act
      const revokedCount = await repo.revokeAllUserTokens(testUserId);

      // Assert
      expect(revokedCount).toBe(2); // Only active tokens
    });
  });

  describe('cleanupExpired()', () => {
    it.skip('should delete expired tokens (cleanupExpired is not yet implemented)', async () => {
      // cleanupExpired() is currently commented out in the repository
      expect(true).toBe(true);
    });
  });

  describe('findActiveByUserId()', () => {
    it('should find all active tokens for a user', async () => {
      // Arrange
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create 3 active tokens
      for (let i = 0; i < 3; i++) {
        const token = TokenUtil.generateRefreshToken();
        const tokenHash = TokenUtil.hashToken(token);
        await repo.create({
          userId: testUserId,
          tokenHash,
          expiresAt,
        });
      }

      // Act
      const tokens = await repo.findActiveByUserId(testUserId);

      // Assert
      expect(tokens).toHaveLength(3);
      tokens.forEach(token => {
        expect(token.userId).toBe(testUserId);
        expect(token.isRevoked).toBe(false);
      });
    });

    it('should not return revoked or expired tokens', async () => {
      // Arrange
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 7);

      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      // 1 active
      const activeToken = TokenUtil.generateRefreshToken();
      await repo.create({
        userId: testUserId,
        tokenHash: TokenUtil.hashToken(activeToken),
        expiresAt: validDate,
      });

      // 1 revoked
      const revokedToken = TokenUtil.generateRefreshToken();
      await repo.create({
        userId: testUserId,
        tokenHash: TokenUtil.hashToken(revokedToken),
        expiresAt: validDate,
        isRevoked: true,
      });

      // 1 expired
      const expiredToken = TokenUtil.generateRefreshToken();
      await repo.create({
        userId: testUserId,
        tokenHash: TokenUtil.hashToken(expiredToken),
        expiresAt: expiredDate,
      });

      // Act
      const tokens = await repo.findActiveByUserId(testUserId);

      // Assert
      expect(tokens).toHaveLength(1);
    });
  });
});
