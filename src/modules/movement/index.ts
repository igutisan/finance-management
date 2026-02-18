/**
 * Movement Controller
 *
 * Elysia routes for movement management.
 */

import { Elysia } from "elysia";
import { MovementService } from "./service";
import { MovementRepository } from "./repository";
import { BudgetPeriodRepository } from "../budget/period-repository";
import { UserRepository } from "../user/repository";
import { MovementModel } from "./model";
import { db } from "../../shared/db";
import { authPlugin } from "../../shared/plugins";
import {
  ok,
  created,
  okPaginated,
  successSchema,
  paginatedSuccessSchema,
  errorSchema,
  validationErrorSchema,
} from "../../shared/responses";

const movementRepo = new MovementRepository(db);
const periodRepo = new BudgetPeriodRepository(db);
const userRepo = new UserRepository(db);

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
        periodRepo,
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
        403: errorSchema("Period does not belong to user"),
        404: errorSchema("User or period not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * GET /movements - Get all movements for authenticated user (paginated)
   */
  .get(
    "/",
    async ({ query, userId }) => {
      const result = await MovementService.getUserMovements(
        userId,
        query,
        movementRepo,
      );
      return okPaginated(result.items, result.meta, "Movements retrieved");
    },
    {
      auth: true,
      query: MovementModel.queryParams,
      response: {
        200: paginatedSuccessSchema(
          MovementModel.movementResponse,
          "Movements retrieved",
        ),
        401: errorSchema("Unauthorized"),
        422: validationErrorSchema(),
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
      return ok(data, "Movement retrieved");
    },
    {
      auth: true,
      response: {
        200: successSchema(MovementModel.movementResponse, "Movement retrieved"),
        403: errorSchema("Movement does not belong to user"),
        404: errorSchema("Movement not found"),
      },
    },
  )

  /**
   * GET /movements/analytics - Get analytics (income, expenses, balance)
   */
  .get(
    "/analytics",
    async ({ userId }) => {
      const data = await MovementService.getAnalytics(userId, movementRepo);
      return ok(data, "Analytics retrieved");
    },
    {
      auth: true,
      response: {
        200: successSchema(
          MovementModel.analyticsResponse,
          "Analytics retrieved",
        ),
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
        periodRepo,
      );
      return ok(data, "Movement updated");
    },
    {
      auth: true,
      body: MovementModel.updateBody,
      response: {
        200: successSchema(MovementModel.movementResponse, "Movement updated"),
        400: errorSchema("Invalid amount"),
        403: errorSchema("Movement does not belong to user"),
        404: errorSchema("Movement or period not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * DELETE /movements/:id - Delete movement (soft delete)
   */
  .delete(
    "/:id",
    async ({ params, userId }) => {
      await MovementService.delete(params.id, userId, movementRepo);
      return ok(null, "Movement deleted");
    },
    {
      auth: true,
      response: {
        200: successSchema(MovementModel.deleteResponse, "Movement deleted"),
        403: errorSchema("Movement does not belong to user"),
        404: errorSchema("Movement not found"),
      },
    },
  );
