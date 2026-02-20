/**
 * User Controller
 *
 * Elysia routes for user management.
 * Handles HTTP routing, validation, and delegates to UserService.
 *
 * Following Elysia's official best practice:
 *   - Repositories instantiated at module level
 *   - Passed as parameters to static service methods
 *   - Success responses wrapped in the generic envelope via ok() / created()
 *   - Errors thrown as ApiError are handled by the error-handler plugin
 *   - Protected routes use the authPlugin macro (`auth: true`)
 *     which injects `userId` into the handler context
 */

import { Elysia } from "elysia";
import { UserService } from "./service";
import { UserRepository } from "./repository";
import { RefreshTokenRepository } from "../token/repository";
import { UserModel } from "./model";
import { db } from "../../shared/db";
import { authPlugin } from "../../shared/plugins";
import {
  ok,
  created,
  successSchema,
  errorSchema,
  validationErrorSchema,
} from "../../shared/responses";

const userRepo = new UserRepository(db);
const tokenRepo = new RefreshTokenRepository(db);

export const user = new Elysia({ prefix: "/users" })
  .use(authPlugin)

  /**
   * POST /users/register - Register a new user (public)
   */
  .post(
    "/register",
    async ({ body, set }) => {
      const userData = await UserService.register(body, userRepo);
      set.status = 201;
      return created(userData, "User registered successfully");
    },
    {
      body: UserModel.registerBody,
      response: {
        201: successSchema(UserModel.userResponse, "User registered"),
        409: errorSchema("Email already exists"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * POST /users/login - Login user (public)
   */
  .post(
    "/login",
    async ({ body, jwt }) => {
      const data = await UserService.login(body, userRepo, tokenRepo, jwt);
      return ok(data, "Login successful");
    },
    {
      body: UserModel.loginBody,
      response: {
        200: successSchema(UserModel.loginResponse, "Login successful"),
        401: errorSchema("Invalid credentials"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * GET /users/me - Get current authenticated user (protected)
   */
  .get(
    "/me",
    async ({ userId }) => {
      const userData = await UserService.getById(userId, userRepo);
      return ok(userData, "User fetched successfully");
    },
    {
      auth: true,
      response: {
        200: successSchema(UserModel.userResponse, "User fetched"),
        401: errorSchema("Authentication required"),
        404: errorSchema("User not found"),
      },
    },
  )

  /**
   * PATCH /users/me - Update current authenticated user (protected)
   */
  .patch(
    "/me",
    async ({ userId, body }) => {
      const userData = await UserService.update(userId, body, userRepo);
      return ok(userData, "User updated successfully");
    },
    {
      auth: true,
      body: UserModel.updateBody,
      response: {
        200: successSchema(UserModel.userResponse, "User updated"),
        401: errorSchema("Authentication required"),
        404: errorSchema("User not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * DELETE /users/me - Delete current authenticated user (protected)
   */
  .delete(
    "/me",
    async ({ userId }) => {
      await UserService.delete(userId, userRepo);
      return ok(null, "User deleted successfully");
    },
    {
      auth: true,
      response: {
        200: successSchema(UserModel.deleteResponse, "User deleted"),
        401: errorSchema("Authentication required"),
        404: errorSchema("User not found"),
      },
    },
  );
