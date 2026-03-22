/**
 * API Service — HTTP client for the backend
 *
 * Communicates with the Elysia backend via fetch (native in Bun).
 * All requests include the X-Bot-Api-Key header.
 */

const { env } = require('../config/env')

const BASE_URL = env.API_BASE_URL

/**
 * Make an authenticated request to the backend.
 */
async function botFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const response = await fetch(url, {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Bot-Api-Key': env.BOT_API_KEY,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    const errorMessage = data?.error?.message || `HTTP ${response.status}`
    throw new Error(errorMessage)
  }

  return data
}

/**
 * Identify a user by phone number.
 * @returns {{ exists: boolean, firstName?: string, hasBotPin?: boolean }}
 */
async function identifyUser(phone) {
  const res = await botFetch('/bot/identify', { body: { phone } })
  console.log("User identified:", res.data);
  return res.data
}

/**
 * Verify user's bot PIN.
 * @returns {{ token: string, expiresIn: number }}
 */
async function verifyPin(phone, pin) {
  const res = await botFetch('/bot/verify-pin', { body: { phone, pin } })
  return res.data
}

/**
 * Create a movement (expense or income).
 * @returns {{ id: string, type: string, amount: string, description: string, budgetName: string|null }}
 */
async function createMovement(phone, { type, amount, description, budgetId}) {
  const body = { phone, type, amount: String(amount), description }
  if (budgetId) body.budgetId = budgetId

  const res = await botFetch('/bot/movements', { body })
  return res.data
}

/**
 * Get active budgets for a user (protected — requires PIN token).
 * @returns {Array<{ id: string, name: string, amount: string, spent: string, remaining: number, percentageUsed: number }>}
 */
async function getBudgets(phone, pinToken) {
  const res = await botFetch('/bot/budgets', {
    body: { phone },
    headers: { 'X-Bot-Pin-Token': pinToken },
  })
  return res.data
}

/**
 * Get financial analytics for a user (protected — requires PIN token).
 * @returns {{ totalIncome: number, totalExpenses: number, balance: number }}
 */
async function getAnalytics(phone, pinToken) {
  const res = await botFetch('/bot/analytics', {
    body: { phone },
    headers: { 'X-Bot-Pin-Token': pinToken },
  })
  return res.data
}

/**
 * List active budget names for a user (no PIN required).
 * @returns {Array<{ id: string, name: string }>}
 */
async function listBudgetNames(phone) {
  const res = await botFetch('/bot/budgets/list', { body: { phone } })
  return res.data
}

module.exports = {
  identifyUser,
  verifyPin,
  createMovement,
  getBudgets,
  getAnalytics,
  listBudgetNames,
}
