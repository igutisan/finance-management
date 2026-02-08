/**
 * Drizzle ORM Schema
 * 
 * Database schema definitions for all tables.
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, numeric, date, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Movement type enum
export const movementTypeEnum = pgEnum('movement_type', ['INCOME', 'EXPENSE', 'TRANSFER']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Refresh Tokens table
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(), // SHA-256 hash (64 hex chars)
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 max length
  userAgent: text('user_agent'),
}, (table) => ({
  tokenHashIdx: index('idx_refresh_tokens_token_hash').on(table.tokenHash),
  userIdIdx: index('idx_refresh_tokens_user_id').on(table.userId),
  expiresAtIdx: index('idx_refresh_tokens_expires_at').on(table.expiresAt),
}));

// Budgets table
export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Movements table
export const movements = pgTable('movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  budgetId: uuid('budget_id').references(() => budgets.id, { onDelete: 'set null' }),
  type: movementTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  date: timestamp('date').notNull(),
  paymentMethod: varchar('payment_method', { length: 100 }),
  isRecurring: boolean('is_recurring').default(false).notNull(),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  budgets: many(budgets),
  movements: many(movements),
}));

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.id],
  }),
  movements: many(movements),
}));

export const movementsRelations = relations(movements, ({ one }) => ({
  user: one(users, {
    fields: [movements.userId],
    references: [users.id],
  }),
  budget: one(budgets, {
    fields: [movements.budgetId],
    references: [budgets.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

export type Movement = typeof movements.$inferSelect;
export type NewMovement = typeof movements.$inferInsert;
