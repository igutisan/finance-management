/**
 * User Service
 *
 * Business logic for user management.
 * Decoupled from HTTP/Elysia context.
 *
 * Throws ApiError instead of Elysia's status() so the global
 * error handler can produce the generic error envelope automatically.
 * Returns raw data — the controller wraps it with ok() / created().
 */

import { UserRepository } from "./repository";
import { db } from "../../shared/db";
import type { UserModel } from "./model";
import { PasswordUtil } from "../../shared/utils/password.util";
import { jwtConfig } from "../../shared/config/jwt.config";
import { ApiError, ErrorCode } from "../../shared/responses";

/**
 * Represents the Elysia JWT context object provided by @elysiajs/jwt.
 */
interface JwtContext {
  sign: (payload: Record<string, string | number>) => Promise<string>;
  verify: (token?: string) => Promise<false | Record<string, unknown>>;
}

export abstract class UserService {
  /**
   * Register a new user
   */
  static async register(
    data: UserModel.RegisterBody,
    userRepo: UserRepository,
  ): Promise<UserModel.UserResponse> {
    const emailExist = await userRepo.emailExists(data.email);
    if (emailExist) {
      throw new ApiError(ErrorCode.EMAIL_ALREADY_EXISTS);
    }

    const hashedPassword = await PasswordUtil.hash(data.password);
    const user = await userRepo.create({
      email: data.email,
      passwordHash: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Authenticate a user and generate JWT tokens
   */
  static async login(
    data: UserModel.LoginBody,
    userRepo: UserRepository,
    jwt: JwtContext,
  ): Promise<UserModel.LoginResponse> {
    const user = await userRepo.findByEmail(data.email);

    if (!user) {
      throw new ApiError(ErrorCode.INVALID_CREDENTIALS);
    }

    const isValid = await PasswordUtil.verify(user.passwordHash, data.password);
    if (!isValid) {
      throw new ApiError(ErrorCode.INVALID_CREDENTIALS);
    }

    const now = Math.floor(Date.now() / 1000);

    // Generate access token (short-lived)
    const accessToken = await jwt.sign({
      sub: user.id,
      type: "access",
      exp: now + jwtConfig.accessToken.expiresIn,
    });

    // Generate refresh token (long-lived)
    const refreshToken = await jwt.sign({
      sub: user.id,
      type: "refresh",
      exp: now + jwtConfig.refreshToken.expiresIn,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: jwtConfig.accessToken.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  /**
   * Get user by ID
   */
  static async getById(
    id: string,
    userRepo: UserRepository,
  ): Promise<UserModel.UserResponse> {
    const user = await userRepo.findById(id);
    if (!user) {
      throw new ApiError(ErrorCode.USER_NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user
   */
  static async update(
    id: string,
    data: UserModel.UpdateBody,
    userRepo: UserRepository,
  ): Promise<UserModel.UserResponse> {
    const updateData: any = { ...data };

    // If password is being updated, hash it using Argon2
    if (data.password) {
      updateData.passwordHash = await PasswordUtil.hash(data.password);
      delete updateData.password;
    }

    const user = await userRepo.update(id, updateData);
    if (!user) {
      throw new ApiError(ErrorCode.USER_NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Delete user (soft delete with cascade)
   */
  static async delete(id: string, userRepo: UserRepository): Promise<boolean> {
    return await db.transaction(async () => {
      const deleted = await userRepo.softDelete(id);
      if (!deleted) {
        throw new ApiError(ErrorCode.USER_NOT_FOUND);
      }

      // Database CASCADE handles related records
      return true;
    });
  }
}
