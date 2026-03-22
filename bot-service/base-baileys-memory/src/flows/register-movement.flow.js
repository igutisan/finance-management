/**
 * Register Movement Flow
 *
 * Handles expense and income registration.
 * Called from main flow after AI detects REGISTER_EXPENSE or REGISTER_INCOME intent.
 *
 * Flow:
 *   1. Confirms the detected amount and description
 *   2. Fetches active budgets from backend (public endpoint, no PIN)
 *   3. Shows numeric menu for budget assignment
 *   4. Captures selection and sends movement to backend
 *   5. Confirms with summary
 */

const { addKeyword, EVENTS } = require('@bot-whatsapp/bot')
const { createMovement, listBudgetNames } = require('../services/api.service')

const registerMovementFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { state, flowDynamic }) => {
    const intentData = state.getMyState()?.intentData
    if (!intentData) {
      await flowDynamic('❌ No pude procesar tu solicitud. Intenta de nuevo.')
      return
    }

    const { intent, amount, description } = intentData
    const phone = ctx.from
    const type = intent === 'REGISTER_INCOME' ? 'INCOME' : 'EXPENSE'
    const emoji = type === 'INCOME' ? '💰' : '💸'
    const label = type === 'INCOME' ? 'ingreso' : 'gasto'

    // Confirm what we detected
    await flowDynamic(
      `${emoji} Detecté un ${label}:\n\n` +
      `*Monto:* $${Number(amount).toLocaleString('es-CO')}\n` +
      `*Descripción:* ${description}`
    )

    // Fetch active budgets to show assignment options
    try {
      const budgets = await listBudgetNames(phone)

      // Store pending movement data and budgets list in state
      await state.update({
        pendingMovement: { type, amount: String(amount), description, phone },
        budgetOptions: budgets,
        awaitingBudgetSelection: true,
      })

      if (budgets.length === 0) {
        // No budgets — register directly
        await flowDynamic('No tienes presupuestos activos. Registrando sin presupuesto...')
        await registerMovement(phone, type, amount, description, null, flowDynamic, state)
        return
      }

      // Build the menu
      const menuLines = budgets.map((b, i) => `*${i + 1}* — ${b.name}`)
      menuLines.push('*0* — No asignar')

      await flowDynamic(
        `¿Deseas asignar este movimiento a algún presupuesto?\n\n` +
        `${menuLines.join('\n')}\n\n` +
        `_Responde con el número de tu elección_`
      )
    } catch (error) {
      console.error('Error fetching budgets:', error.message)
      // Fallback: register without budget
      await registerMovement(phone, type, amount, description, null, flowDynamic, state)
    }
  })
  .addAction({ capture: true }, async (ctx, { state, flowDynamic }) => {
    const myState = state.getMyState()
    if (!myState?.awaitingBudgetSelection) return

    const pending = myState.pendingMovement
    const budgets = myState.budgetOptions || []
    const selection = ctx.body.trim()
    const selectionNum = parseInt(selection, 10)

    // Validate selection
    if (isNaN(selectionNum) || selectionNum < 0 || selectionNum > budgets.length) {
      await flowDynamic(
        `❌ Opción inválida. Responde con un número del *0* al *${budgets.length}*`
      )
      return // stays in capture mode for retry
    }

    // Resolve budgetId
    const budgetId = selectionNum === 0 ? null : budgets[selectionNum - 1]?.id
    const budgetName = selectionNum === 0 ? null : budgets[selectionNum - 1]?.name

    await registerMovement(
      pending.phone,
      pending.type,
      pending.amount,
      pending.description,
      budgetId,
      flowDynamic,
      state,
      budgetName,
    )
  })

/**
 * Register the movement in the backend and confirm to user.
 */
async function registerMovement(phone, type, amount, description, budgetId, flowDynamic, state, budgetName) {
  try {
    await createMovement(phone, {
      type,
      amount: String(amount),
      description,
      budgetId: budgetId || undefined,
    })

    const emoji = type === 'INCOME' ? '✅💰' : '✅💸'
    const label = type === 'INCOME' ? 'Ingreso' : 'Gasto'
    let msg =
      `${emoji} ¡${label} registrado!\n\n` +
      `*Monto:* $${Number(amount).toLocaleString('es-CO')}\n` +
      `*Descripción:* ${description}`

    if (budgetName) {
      msg += `\n*Presupuesto:* ${budgetName}`
    }

    await flowDynamic(msg)
  } catch (error) {
    console.error('Error creating movement:', error.message)
    await flowDynamic(`❌ Error al registrar: ${error.message}`)
  }

  // Clean up state
  await state.update({
    pendingMovement: null,
    budgetOptions: null,
    awaitingBudgetSelection: false,
    intentData: null,
  })
}

module.exports = { registerMovementFlow }
