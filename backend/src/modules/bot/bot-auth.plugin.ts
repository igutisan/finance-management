/**
 * Bot Auth Plugin
 *
 * Elysia plugin that validates bot requests via X-Bot-Api-Key header.
 * This is separate from the user JWT auth — it only verifies that
 * the request comes from the trusted WhatsApp bot service.
 */

import { Elysia } from "elysia";
import { envConfig } from "../../shared/config/env.config";
import { ApiError, ErrorCode } from "../../shared/responses";

export const botAuthPlugin = new Elysia({ name: "plugin.bot-auth" })
  .macro({
    botAuth: {
      async resolve({ headers }) {
        const apiKey = headers["x-bot-api-key"];

        if (!apiKey || apiKey !== envConfig.get("BOT_API_KEY")) {
          throw new ApiError(ErrorCode.BOT_API_KEY_INVALID);
        }

        return {};
      },
    },
  });
