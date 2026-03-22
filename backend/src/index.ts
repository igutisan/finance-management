/**
 * Budget API - Main Entry Point
 *
 * Elysia application with feature-based architecture.
 * Error handling is centralised in the errorHandler plugin.
 */

import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { user } from "./modules/user";
import { budget } from "./modules/budget";
import { movement } from "./modules/movement";
import { token } from "./modules/token";
import { bot } from "./modules/bot";
import { errorHandler } from "./shared/plugins";

const app = new Elysia()
  .use(cors())
  // ── Documentation ───────────────────────────────────────────────────
  .use(
    swagger({
      path: "/doc",
      documentation: {
        info: {
          title: "Budget API",
          version: "1.0.0",
        },
      },
    }),
  )

  // ── Centralised error handling ──────────────────────────────────────
  .use(errorHandler)



  // ── Health check ────────────────────────────────────────────────────
  .get("/health", () => ({
    success: true as const,
    status: 200,
    message: "OK",
    data: {
      status: "OK",
      timestamp: new Date().toISOString(),
    },
  }))

  // ── Feature modules (grouped under /api) ───────────────────────────
  .group("/api", (app) =>
    app
      .use(user)
      .use(budget)
      .use(movement)
      .use(token)
      .use(bot)
  )

  .listen(process.env.APP_PORT || 3002);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
