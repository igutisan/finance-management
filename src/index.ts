/**
 * Budget API - Main Entry Point
 *
 * Elysia application with feature-based architecture.
 * Error handling is centralised in the errorHandler plugin.
 */

import { Elysia } from "elysia";
import { user } from "./modules/user";
import { budget } from "./modules/budget";
import { movement } from "./modules/movement";
import { token } from "./modules/token";
import { errorHandler } from "./shared/plugins";

const app = new Elysia()
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

  // ── Feature modules ─────────────────────────────────────────────────
  .use(user)
  .use(budget)
  .use(movement)
  .use(token)

  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
