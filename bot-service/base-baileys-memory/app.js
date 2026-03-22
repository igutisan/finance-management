/**
 * WhatsApp Budget Bot — Entry Point
 *
 * Sets up the bot with Baileys provider and wires all conversation flows.
 * Uses Gemini AI for intent detection and connects to the Elysia backend
 * for data operations.
 */

const { createBot, createProvider, createFlow } = require('@bot-whatsapp/bot')
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')

// Flows
const { mainFlow } = require('./src/flows/main.flow')
const { registerMovementFlow } = require('./src/flows/register-movement.flow')
const { protectedActionFlow } = require('./src/flows/protected-action.flow')
const { greetingFlow } = require('./src/flows/greeting.flow')

// Config
const { env } = require('./src/config/env')

const main = async () => {
  const adapterDB = new MockAdapter()
  const adapterFlow = createFlow([
    mainFlow,
    registerMovementFlow,
    protectedActionFlow,
    greetingFlow,
  ])
  const adapterProvider = createProvider(BaileysProvider)

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  QRPortalWeb({ port: env.BOT_PORT })

  console.log(`🤖 Bot running — QR portal at http://localhost:${env.BOT_PORT}`)
  console.log(`🔗 Backend: ${env.API_BASE_URL}`)
}

main()
