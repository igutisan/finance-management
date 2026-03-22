/**
 * Bot Controller
 *
 * Elysia routes for the WhatsApp bot integration.
 * All routes are prefixed with /bot and protected by X-Bot-Api-Key.
 *
 * Endpoints:
 *   POST /bot/identify   — Check if phone exists (public to bot)
 *   POST /bot/verify-pin — Validate PIN, get short-lived token
 *   POST /bot/movements  — Register expense/income (no PIN needed)
 *   POST /bot/budgets    — List active budgets (PIN token required)
 *   POST /bot/analytics  — Get balance summary (PIN token required)
 */

import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { BotService } from "./service";
import { BotModel } from "./model";
import { botAuthPlugin } from "./bot-auth.plugin";
import { UserRepository } from "../user/repository";
import { MovementRepository } from "../movement/repository";
import { BudgetRepository } from "../budget/repository";
import { BudgetPeriodRepository } from "../budget/period-repository";
import { db } from "../../shared/db";
import { jwtConfig } from "../../shared/config/jwt.config";
import { ApiError, ErrorCode } from "../../shared/responses";
import {
  ok,
  created,
  successSchema,
  errorSchema,
  validationErrorSchema,
} from "../../shared/responses";

const userRepo = new UserRepository(db);
const movementRepo = new MovementRepository(db);
const budgetRepo = new BudgetRepository(db);
const periodRepo = new BudgetPeriodRepository(db);

export const bot = new Elysia({ prefix: "/bot" })
  .use(botAuthPlugin)
  .use(
    jwt({
      name: "botJwt",
      secret: jwtConfig.secret,
    }),
  )

  /**
   * POST /bot/identify — Check if a phone number is registered
   */
  .post(
    "/identify",
    async ({ body }) => {
      const data = await BotService.identify(body.phone, userRepo);
      return ok(data, "User identification complete");
    },
    {
      botAuth: true,
      body: BotModel.identifyBody,
      response: {
        200: successSchema(BotModel.identifyResponse, "Identify user"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * POST /bot/verify-pin — Validate bot PIN and get short-lived token
   */
  .post(
    "/verify-pin",
    async ({ body, botJwt }) => {
      const data = await BotService.verifyPin(
        body.phone,
        body.pin,
        userRepo,
        botJwt,
      );
      return ok(data, "PIN verified successfully");
    },
    {
      botAuth: true,
      body: BotModel.verifyPinBody,
      response: {
        200: successSchema(BotModel.verifyPinResponse, "PIN verified"),
        400: errorSchema("Bot PIN not configured"),
        401: errorSchema("Invalid PIN"),
        404: errorSchema("Phone not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * POST /bot/movements — Create a movement (no PIN required)
   */
  .post(
    "/movements",
    async ({ body, set }) => {
      const data = await BotService.createMovement(
        body,
        userRepo,
        movementRepo,
        periodRepo,
      );
      set.status = 201;
      return created(data, "Movement registered via bot");
    },
    {
      botAuth: true,
      body: BotModel.createMovementBody,
      response: {
        201: successSchema(
          BotModel.movementCreatedResponse,
          "Movement created",
        ),
        400: errorSchema("Invalid amount"),
        404: errorSchema("Phone not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * POST /bot/budgets/list — List budget names (no PIN required)
   * Returns only id + name for the budget selection menu.
   */
  .post(
    "/budgets/list",
    async ({ body }) => {
      const data = await BotService.listBudgetNames(
        body.phone,
        userRepo,
        budgetRepo,
      );
      return ok(data, "Budget names retrieved");
    },
    {
      botAuth: true,
      body: BotModel.phoneBody,
      response: {
        200: successSchema(BotModel.budgetNamesResponse, "Budget names"),
        404: errorSchema("Phone not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * POST /bot/budgets — Get active budgets (PIN token required)
   */
  .post(
    "/budgets",
    async ({ body, headers, botJwt }) => {
      // Validate PIN session token
      await validateBotPinToken(headers, botJwt);

      const data = await BotService.getBudgets(
        body.phone,
        userRepo,
        budgetRepo,
      );
      return ok(data, "Budgets retrieved");
    },
    {
      botAuth: true,
      body: BotModel.phoneBody,
      response: {
        200: successSchema(BotModel.budgetsListResponse, "Budgets retrieved"),
        401: errorSchema("PIN verification required"),
        404: errorSchema("Phone not found"),
        422: validationErrorSchema(),
      },
    },
  )

  /**
   * POST /bot/analytics — Get financial summary (PIN token required)
   */
  .post(
    "/analytics",
    async ({ body, headers, botJwt }) => {
      // Validate PIN session token
      await validateBotPinToken(headers, botJwt);

      const data = await BotService.getAnalytics(
        body.phone,
        userRepo,
        movementRepo,
      );
      return ok(data, "Analytics retrieved");
    },
    {
      botAuth: true,
      body: BotModel.phoneBody,
      response: {
        200: successSchema(BotModel.analyticsResponse, "Analytics retrieved"),
        401: errorSchema("PIN verification required"),
        404: errorSchema("Phone not found"),
        422: validationErrorSchema(),
      },
    },
  );

/**
 * Validate the short-lived bot PIN token from X-Bot-Pin-Token header.
 */
async function validateBotPinToken(
  headers: Record<string, string | undefined>,
  jwt: { verify: (token: string) => Promise<any> },
): Promise<void> {
  const token = headers["x-bot-pin-token"];

  if (!token) {
    throw new ApiError(ErrorCode.BOT_PIN_INVALID, {
      message: "PIN verification token is missing",
    });
  }

  const payload = await jwt.verify(token);

  if (!payload || payload.type !== "bot-pin") {
    throw new ApiError(ErrorCode.BOT_PIN_INVALID, {
      message: "PIN verification token is invalid or expired",
    });
  }
}
