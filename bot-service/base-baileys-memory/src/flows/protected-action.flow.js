/**
 * Protected Action Flow
 *
 * Handles actions that require PIN verification:
 * - QUERY_BALANCE: Shows total income, expenses, and balance
 * - QUERY_BUDGET: Shows active budgets with spending progress
 *
 * Flow:
 *   1. Check if there's an active PIN session in state (valid for 5 min)
 *   2. If no session → ask for 6-digit PIN
 *   3. Verify PIN with backend → store token in state
 *   4. Execute the protected query and show formatted results
 */

const { addKeyword, EVENTS } = require('@bot-whatsapp/bot')
const { verifyPin, getBudgets, getAnalytics } = require('../services/api.service')

const PIN_SESSION_DURATION_MS = 5 * 60 * 1000 // 5 minutes

const protectedActionFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { state, flowDynamic }) => {
    const myState = state.getMyState() || {}
    const intentData = myState.intentData
    if (!intentData) {
      await flowDynamic('❌ No pude procesar tu solicitud.')
      return
    }

    const phone = ctx.from

    // Check if we have a valid PIN session
    const pinToken = myState.pinToken
    const pinExpiry = myState.pinExpiry || 0

    if (pinToken && Date.now() < pinExpiry) {
      // Session still valid — execute query directly
      await executeProtectedQuery(phone, intentData.intent, pinToken, flowDynamic, state)
      return
    }

    // No valid session — ask for PIN
    await state.update({ awaitingPin: true, protectedIntent: intentData.intent })
    await flowDynamic('🔐 Esta consulta requiere verificación.\n\nIngresa tu *PIN de 6 dígitos*:')
  })
  .addAction({ capture: true }, async (ctx, { state, flowDynamic }) => {
    const myState = state.getMyState() || {}
    if (!myState.awaitingPin) return

    const phone = ctx.from
    const pin = ctx.body.trim()

    // Validate PIN format
    if (!/^\d{6}$/.test(pin)) {
      await flowDynamic('❌ El PIN debe ser de *6 dígitos numéricos*. Intenta de nuevo:')
      // Keep awaitingPin: true so the capture triggers again
      return
    }

    try {
      // Verify PIN with backend
      const { token, expiresIn } = await verifyPin(phone, pin)

      // Store session
      await state.update({
        pinToken: token,
        pinExpiry: Date.now() + (expiresIn * 1000),
        awaitingPin: false,
      })

      // Execute the protected query
      await executeProtectedQuery(phone, myState.protectedIntent, token, flowDynamic, state)
    } catch (error) {
      console.error('PIN verification failed:', error.message)

      if (error.message.includes('Invalid bot PIN') || error.message.includes('invalid')) {
        await flowDynamic('❌ PIN incorrecto. Intenta de nuevo:')
        // Keep awaitingPin: true for retry
        return
      }

      if (error.message.includes('not been configured')) {
        await flowDynamic('⚠️ No tienes un PIN configurado. Configúralo desde la app web para acceder a consultas protegidas.')
        await state.update({ awaitingPin: false, intentData: null })
        return
      }

      await flowDynamic(`❌ Error de verificación: ${error.message}`)
      await state.update({ awaitingPin: false, intentData: null })
    }
  })

/**
 * Execute a protected query with a valid PIN token.
 */
async function executeProtectedQuery(phone, intent, token, flowDynamic, state) {
  try {
    if (intent === 'QUERY_BALANCE') {
      const data = await getAnalytics(phone, token)

      const income = Number(data.totalIncome).toLocaleString('es-CO')
      const expenses = Number(data.totalExpenses).toLocaleString('es-CO')
      const balance = Number(data.balance).toLocaleString('es-CO')
      const balanceEmoji = data.balance >= 0 ? '🟢' : '🔴'

      await flowDynamic(
        `📊 *Tu resumen financiero*\n\n` +
        `💰 Ingresos: $${income}\n` +
        `💸 Gastos: $${expenses}\n` +
        `${balanceEmoji} Balance: *$${balance}*`
      )
    } else if (intent === 'QUERY_BUDGET') {
      const budgets = await getBudgets(phone, token)

      if (!budgets || budgets.length === 0) {
        await flowDynamic('📋 No tienes presupuestos activos. Créalos desde la app web.')
      } else {
        const lines = budgets.map((b) => {
          const bar = getProgressBar(b.percentageUsed)
          return `📌 *${b.name}*\n   ${bar} ${b.percentageUsed}%\n   Gastado: $${Number(b.spent).toLocaleString('es-CO')} / $${Number(b.amount).toLocaleString('es-CO')}`
        })

        await flowDynamic(`📊 *Tus presupuestos*\n\n${lines.join('\n\n')}`)
      }
    }

    // Clean up intent data
    await state.update({ intentData: null, protectedIntent: null })
  } catch (error) {
    console.error('Protected query failed:', error.message)
    await flowDynamic(`❌ Error al consultar: ${error.message}`)
    await state.update({ intentData: null, protectedIntent: null })
  }
}

/**
 * Generate a text-based progress bar.
 */
function getProgressBar(percentage) {
  const total = 10
  const filled = Math.min(Math.round((percentage / 100) * total), total)
  const empty = total - filled
  return '▓'.repeat(filled) + '░'.repeat(empty)
}

module.exports = { protectedActionFlow }
