/**
 * Password Utility
 * 
 * Handles password hashing and verification using Argon2.
 */

import * as argon2 from 'argon2';

export abstract class PasswordUtil {
  /**
   * Hash a password using Argon2id
   */
  static async hash(password: string): Promise<string> {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Verify a password against a hash
   */
  static async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
