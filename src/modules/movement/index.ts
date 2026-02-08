/**
 * Movement Controller
 *
 * Elysia routes for movement (transaction) management.
 *
 * All success responses are wrapped in the generic envelope via ok() / created().
 * Errors are thrown as ApiError and handled by the global error handler.
 */

import { Elysia } from "elysia";
import { MovementService } from "./service";
import { MovementRepository } from "./repository";
import { UserRepository } from "../user/repository";
import { BudgetRepository } from "../budget/repository";
import { MovementModel } from "./model";
import { db } from "../../shared/db";
import {
  ok,
  created,
  successSchema,
  errorSchema,
  validationErrorSchema,
} from "../../shared/responses";

// Initialize repositories
const movementRepo = new MovementRepository(db);
const userRepo = new UserRepository(db);
const budgetRepo = new BudgetRepository(db);

export const movement = new Elysia({ prefix: "/movements" })
  /**
   * POST /movements - Create a new movement
   * TODO: Get userId from auth token
   */
  .post(
    "/",
    async ({ body, set }) => {
      // TODO: Extract userId from JWT token
      const userId = "temp-user-id";
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
      body: MovementModel.createBody,
      response: {
        201: successSchema(MovementModel.movementResponse, "Movement created"),
        400: errorSchema("Invalid amount"),
        403: errorSchema("Budget does not belong to user"),
        404: errorSchema("Budget or user not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * GET /movements - Get all user movements
   * TODO: Get userId from auth token
   */
  .get("/", async () => {
    const userId = "temp-user-id";
    const data = await MovementService.getUserMovements(userId, movementRepo);
    return ok(data, "Movements fetched successfully");
  })

  /**
   * GET /movements/:id - Get movement by ID
   */
  .get(
    "/:id",
    async ({ params }) => {
      const data = await MovementService.getById(params.id, movementRepo);
      return ok(data, "Movement fetched successfully");
    },
    {
      response: {
        200: successSchema(MovementModel.movementResponse, "Movement fetched"),
        404: errorSchema("Movement not found"),
      },
    },
  )

  /**
   * GET /movements/analytics - Get user analytics
   * TODO: Get userId from auth token
   */
  .get(
    "/analytics",
    async () => {
      const userId = "temp-user-id";
      const data = await MovementService.getUserAnalytics(userId, movementRepo);
      return ok(data, "Analytics fetched successfully");
    },
    {
      response: {
        200: successSchema(
          MovementModel.analyticsResponse,
          "Analytics fetched",
        ),
      },
    },
  )

  /**
   * PATCH /movements/:id - Update movement
   */
  .patch(
    "/:id",
    async ({ params, body }) => {
      const data = await MovementService.update(params.id, body, movementRepo);
      return ok(data, "Movement updated successfully");
    },
    {
      body: MovementModel.updateBody,
      response: {
        200: successSchema(MovementModel.movementResponse, "Movement updated"),
        400: errorSchema("Invalid amount"),
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
    async ({ params }) => {
      await MovementService.delete(params.id, movementRepo);
      return ok(null, "Movement deleted successfully");
    },
    {
      response: {
        200: successSchema(MovementModel.deleteResponse, "Movement deleted"),
        404: errorSchema("Movement not found"),
      },
    },
  );
