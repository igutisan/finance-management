/**
 * User Service
 *
 * Business logic for user management.
 * Decoupled from HTTP/Elysia context.
 *
 * Following Elysia's official best practice:
 *   - abstract class with static methods (no class allocation)
 *   - Repositories passed as parameters from the controller
 *   - Throws ApiError so the error-handler plugin produces the
 *     generic error envelope automatically
 *   - Returns raw data — the controller wraps it with ok() / created()
 */

import type { UserRepository } from "./repository";
import type { RefreshTokenRepository } from "../token/repository";
import type { UserModel } from "./model";
import type { JwtContext } from "../../shared/types/jwt.types";
import { PasswordUtil } from "../../shared/utils/password.util";
import { RefreshTokenService } from "../token/service";
import { ApiError, ErrorCode } from "../../shared/responses";

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

    return this.toUserResponse(user);
  }

  /**
   * Authenticate a user and generate JWT tokens
   *
   * Delegates token generation entirely to RefreshTokenService
   * so all token logic (hashing, persistence, expiry) is centralised.
   */
  static async login(
    data: UserModel.LoginBody,
    userRepo: UserRepository,
    tokenRepo: RefreshTokenRepository,
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

    const tokens = await RefreshTokenService.createTokenPair(
      user.id,
      jwt,
      tokenRepo,
    );

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      user: this.toUserResponse(user),
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

    return this.toUserResponse(user);
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

    return this.toUserResponse(user);
  }

  /**
   * Delete user (soft delete with cascade)
   */
  static async delete(id: string, userRepo: UserRepository): Promise<boolean> {
    const deleted = await userRepo.softDelete(id);
    if (!deleted) {
      throw new ApiError(ErrorCode.USER_NOT_FOUND);
    }

    return true;
  }

  /**
   * Transform User entity to response DTO
   */
  private static toUserResponse(user: any): UserModel.UserResponse {
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
}
