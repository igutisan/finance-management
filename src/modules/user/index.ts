/**
 * User Controller
 *
 * Elysia routes for user management.
 * Handles HTTP routing, validation, and delegates to UserService.
 *
 * All success responses are wrapped in the generic envelope via ok() / created().
 * Errors are thrown as ApiError and handled by the global error handler.
 */

import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { UserService } from "./service";
import { UserRepository } from "./repository";
import { UserModel } from "./model";
import { db } from "../../shared/db";
import { jwtConfig } from "../../shared/config/jwt.config";
import {
  ok,
  created,
  successSchema,
  errorSchema,
  validationErrorSchema,
} from "../../shared/responses";

const userRepo = new UserRepository(db);

export const user = new Elysia({ prefix: "/users" })
  // Add JWT plugin
  .use(
    jwt({
      name: "jwt",
      secret: jwtConfig.secret,
    }),
  )

  /**
   * POST /users/register - Register a new user
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
   * POST /users/login - Login user
   */
  .post(
    "/login",
    async ({ body, jwt }) => {
      const data = await UserService.login(body, userRepo, jwt);
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
   * GET /users/:id - Get user by ID
   */
  .get(
    "/:id",
    async ({ params }) => {
      const userData = await UserService.getById(params.id, userRepo);
      return ok(userData, "User fetched successfully");
    },
    {
      response: {
        200: successSchema(UserModel.userResponse, "User fetched"),
        404: errorSchema("User not found"),
      },
    },
  )

  /**
   * PATCH /users/:id - Update user
   */
  .patch(
    "/:id",
    async ({ params, body }) => {
      const userData = await UserService.update(params.id, body, userRepo);
      return ok(userData, "User updated successfully");
    },
    {
      body: UserModel.updateBody,
      response: {
        200: successSchema(UserModel.userResponse, "User updated"),
        404: errorSchema("User not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * DELETE /users/:id - Delete user (soft delete)
   */
  .delete(
    "/:id",
    async ({ params }) => {
      await UserService.delete(params.id, userRepo);
      return ok(null, "User deleted successfully");
    },
    {
      response: {
        200: successSchema(UserModel.deleteResponse, "User deleted"),
        404: errorSchema("User not found"),
      },
    },
  );
