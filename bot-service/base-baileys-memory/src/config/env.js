/**
 * Environment configuration for the WhatsApp bot.
 */

const env = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  API_BASE_URL: process.env.API_BASE_URL || 'http://backend:3000/api',
  BOT_API_KEY: process.env.BOT_API_KEY || '',
  BOT_PORT: parseInt(process.env.BOT_PORT || '3002', 10),
}

// Validate required keys on startup
if (!env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY not set — AI intent detection will fail')
}
if (!env.BOT_API_KEY) {
  console.warn('BOT_API_KEY not set — backend requests will be rejected')
}

module.exports = { env }
