/**
 * Greeting Flow
 *
 * Shows welcome message and usage instructions when intent is GREETING or HELP.
 */

const { addKeyword, EVENTS } = require('@bot-whatsapp/bot')

const greetingFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { flowDynamic }) => {
    await flowDynamic([
      '👋 ¡Hola! Soy tu *asistente financiero*.\n',
      'Esto es lo que puedo hacer por ti:\n',
      '📝 *Registrar gasto:* "Gasté 5000 en café"',
      '📝 *Registrar ingreso:* "Me pagaron 2M de salario"',
      '💰 *Ver saldo:* "¿Cuánto tengo?"',
      '📊 *Ver presupuestos:* "¿Cómo voy en mis presupuestos?"',
      '\nSolo escríbeme con naturalidad y yo me encargo 😉',
    ].join('\n'))
  })

module.exports = { greetingFlow }
