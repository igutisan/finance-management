/**
 * Movement Controller
 *
 * Elysia routes for movement (transaction) management.
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
import { MovementService } from "./service";
import { MovementRepository } from "./repository";
import { UserRepository } from "../user/repository";
import { BudgetRepository } from "../budget/repository";
import { MovementModel } from "./model";
import { db } from "../../shared/db";
import { authPlugin } from "../../shared/plugins";
import {
  ok,
  created,
  successSchema,
  errorSchema,
  validationErrorSchema,
} from "../../shared/responses";

const movementRepo = new MovementRepository(db);
const userRepo = new UserRepository(db);
const budgetRepo = new BudgetRepository(db);

export const movement = new Elysia({ prefix: "/movements" })
  .use(authPlugin)

  /**
   * POST /movements - Create a new movement
   */
  .post(
    "/",
    async ({ body, set, userId }) => {
      const data = await MovementService.create(
        userId,
        body,
        movementRepo,
        userRepo,
        budgetRepo,
      );
      set.status = 201;
      return created(data, "Movement created successfully");
    },
    {
      auth: true,
      body: MovementModel.createBody,
      response: {
        201: successSchema(MovementModel.movementResponse, "Movement created"),
        400: errorSchema("Invalid amount"),
        401: errorSchema("Authentication required"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget or user not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * GET /movements - Get all user movements
   */
  .get(
    "/",
    async ({ userId }) => {
      const data = await MovementService.getUserMovements(userId, movementRepo);
      return ok(data, "Movements fetched successfully");
    },
    {
      auth: true,
      response: {
        200: successSchema(
          MovementModel.movementListResponse,
          "Movements fetched",
        ),
        401: errorSchema("Authentication required"),
      },
    },
  )

  /**
   * GET /movements/:id - Get movement by ID
   */
  .get(
    "/:id",
    async ({ params, userId }) => {
      const data = await MovementService.getById(
        params.id,
        userId,
        movementRepo,
      );
      return ok(data, "Movement fetched successfully");
    },
    {
      auth: true,
      response: {
        200: successSchema(MovementModel.movementResponse, "Movement fetched"),
        401: errorSchema("Authentication required"),
        404: errorSchema("Movement not found"),
      },
    },
  )

  /**
   * GET /movements/analytics - Get user analytics
   */
  .get(
    "/analytics",
    async ({ userId }) => {
      const data = await MovementService.getUserAnalytics(userId, movementRepo);
      return ok(data, "Analytics fetched successfully");
    },
    {
      auth: true,
      response: {
        200: successSchema(
          MovementModel.analyticsResponse,
          "Analytics fetched",
        ),
        401: errorSchema("Authentication required"),
      },
    },
  )

  /**
   * PATCH /movements/:id - Update movement
   */
  .patch(
    "/:id",
    async ({ params, body, userId }) => {
      const data = await MovementService.update(
        params.id,
        userId,
        body,
        movementRepo,
      );
      return ok(data, "Movement updated successfully");
    },
    {
      auth: true,
      body: MovementModel.updateBody,
      response: {
        200: successSchema(MovementModel.movementResponse, "Movement updated"),
        400: errorSchema("Invalid amount"),
        401: errorSchema("Authentication required"),
        403: errorSchema("Movement does not belong to user"),
        404: errorSchema("Movement not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * DELETE /movements/:id - Delete movement
   */
  .delete(
    "/:id",
    async ({ params, userId }) => {
      await MovementService.delete(params.id, userId, movementRepo);
      return ok(null, "Movement deleted successfully");
    },
    {
      auth: true,
      response: {
        200: successSchema(MovementModel.deleteResponse, "Movement deleted"),
        401: errorSchema("Authentication required"),
        403: errorSchema("Movement does not belong to user"),
        404: errorSchema("Movement not found"),
      },
    },
  );
