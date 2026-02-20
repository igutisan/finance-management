/**
 * Token Utility
 * 
 * Handles refresh token generation and hashing.
 */

import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

export abstract class TokenUtil {
  /**
   * Generate a new refresh token (UUID v4)
   */
  static generateRefreshToken(): string {
    return randomUUID();
  }

  /**
   * Hash a token using SHA-256
   * Returns hex string (64 characters)
   */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(token: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(token);
  }
}
