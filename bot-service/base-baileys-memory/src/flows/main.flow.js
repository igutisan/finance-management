/**
 * Main Flow — Entry point for all WhatsApp messages
 *
 * Uses EVENTS.WELCOME to capture every incoming message.
 * Flow:
 *   1. Identify user by phone number (ctx.from)
 *   2. If not registered → send link to web app
 *   3. If registered → send message to Gemini AI for intent detection
 *   4. Based on intent, dispatch to the appropriate flow via gotoFlow
 */

const { addKeyword, EVENTS } = require('@bot-whatsapp/bot')
const { identifyUser } = require('../services/api.service')
const { detectIntent } = require('../services/ai.service')

const WEB_APP_URL = process.env.WEB_APP_URL || 'https://tu-app.com'

const mainFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx, { state, gotoFlow, flowDynamic, endFlow }) => {
    const phone = ctx.from
    const message = ctx.body

    // Skip empty or media-only messages
    if (!message || message.trim() === '') {
      return endFlow()
    }

    // Step 1: Identify user
    try {
      
      const userData = await identifyUser(phone)

      if (!userData.exists) {
        await flowDynamic(
          `👋 ¡Hola! No te tengo registrado.\n\n` +
          `Para usar el bot, primero crea tu cuenta en:\n` +
          `🔗 ${WEB_APP_URL}\n\n` +
          `Cuando te registres, asegúrate de:\n` +
          `1️⃣ Usar este número de teléfono\n` +
          `2️⃣ Configurar tu PIN de 6 dígitos para consultas`
        )
        return endFlow()
      }

      // Step 2: Detect intent with AI
      const intentData = await detectIntent(message)

      // Save intent data in state for the next flow
      await state.update({ intentData })

      // Step 3: Route to the appropriate flow
      switch (intentData.intent) {
        case 'REGISTER_EXPENSE':
        case 'REGISTER_INCOME':
          // Import here to avoid circular dependency
          const { registerMovementFlow } = require('./register-movement.flow')
          return gotoFlow(registerMovementFlow)

        case 'QUERY_BALANCE':
        case 'QUERY_BUDGET':
          const { protectedActionFlow } = require('./protected-action.flow')
          return gotoFlow(protectedActionFlow)

        case 'GREETING':
        case 'HELP':
          const { greetingFlow } = require('./greeting.flow')
          return gotoFlow(greetingFlow)

        case 'OUT_OF_SCOPE':
          await flowDynamic(
            `🚫 Solo puedo ayudarte con temas de *finanzas personales*.\n\n` +
            `Prueba con algo como:\n` +
            `📝 "Gasté 5000 en café"\n` +
            `💰 "¿Cuánto tengo?"\n` +
            `📊 "¿Cómo van mis presupuestos?"`
          )
          return endFlow()

        case 'UNKNOWN':
        default:
          await flowDynamic(
            `🤔 No entendí tu mensaje.\n\n` +
            `Prueba con algo como:\n` +
            `📝 "Gasté 5000 en café"\n` +
            `💰 "¿Cuánto tengo?"\n` +
            `📊 "¿Cómo van mis presupuestos?"`
          )
          return endFlow()
      }
    } catch (error) {
      console.error('❌ Error in main flow:', error.message)
      await flowDynamic('⚠️ Hubo un error procesando tu mensaje. Intenta de nuevo en un momento.')
      return endFlow()
    }
  })

module.exports = { mainFlow }
