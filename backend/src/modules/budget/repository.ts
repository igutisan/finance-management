/**
 * Budget Repository
 * 
 * Data access layer for Budget entity using Drizzle ORM.
 */

import { eq, and, isNull, gte, lte, count, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../../shared/db';
import { budgets } from '../../shared/db/schema';
import type { Budget, NewBudget } from '../../shared/db/schema';

/** Raw row shape returned by the spending query */
type BudgetWithSpendingRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  recurrence: 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  currency: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  period_id: string | null;
  period_start_date: string | null;
  period_end_date: string | null;
  period_amount: string | null;
  period_is_active: boolean | null;
  period_created_at: Date | null;
  period_updated_at: Date | null;
  total_spent: string;
};

/** Mapped result with camelCase keys */
export interface BudgetWithSpending {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  recurrence: 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  currentPeriod: {
    id: string;
    budgetId: string;
    startDate: string;
    endDate: string;
    amount: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  totalSpent: number;
}

export class BudgetRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Budget | null> {
    const result = await this.db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)))
      .limit(1);
    
    return result[0] || null;
  }

  async findAll(): Promise<Budget[]> {
    return await this.db
      .select()
      .from(budgets)
      .where(isNull(budgets.deletedAt));
  }

  async findByUserId(userId: string): Promise<Budget[]> {
    return await this.db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), isNull(budgets.deletedAt)));
  }
  /**
   * Paginated + filtered query for user budgets.
   *
   * Filters: isActive.
   * Orders by createdAt DESC.
   */
  async findByUserIdPaginated(
    userId: string,
    options: {
      page: number;
      limit: number;
      isActive?: boolean;
    },
  ): Promise<{ items: Budget[]; total: number }> {
    const { page, limit, isActive } = options;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      eq(budgets.userId, userId),
      isNull(budgets.deletedAt),
    ];

    if (isActive !== undefined) {
      conditions.push(eq(budgets.isActive, isActive));
    }

    const whereClause = and(...conditions);

    const countResult = await this.db
      .select({ total: count() })
      .from(budgets)
      .where(whereClause);

    const total = Number(countResult[0]?.total || 0);

    const items = await this.db
      .select()
      .from(budgets)
      .where(whereClause)
      .orderBy(budgets.createdAt)
      .limit(limit)
      .offset(offset);

    return { items, total };
  }

  /**
   * Paginated budgets with current period + total spent in a SINGLE query.
   *
   * Uses LEFT JOINs to budget_periods (filtered by today) and an
   * aggregated subquery on movements to avoid N+1.
   */
  async findByUserIdPaginatedWithSpending(
    userId: string,
    options: {
      page: number;
      limit: number;
      isActive?: boolean;
    },
  ): Promise<{ items: BudgetWithSpending[]; total: number }> {
    const { page, limit, isActive } = options;
    const offset = (page - 1) * limit;
    const today = new Date().toISOString().split("T")[0];

    // Build WHERE clause
    let activeFilter = sql``;
    if (isActive !== undefined) {
      activeFilter = sql` AND b.is_active = ${isActive}`;
    }

    // Count query
    const countResult = await this.db.execute<{ total: string }>(sql`
      SELECT COUNT(*) AS total
      FROM budgets b
      WHERE b.user_id = ${userId}
        AND b.deleted_at IS NULL
        ${activeFilter}
    `);
    const total = Number(countResult[0]?.total || 0);

    // Main query: budgets + current period + total spent
    const rows = await this.db.execute<BudgetWithSpendingRow>(sql`
      SELECT
        b.id,
        b.user_id,
        b.name,
        b.description,
        b.recurrence,
        b.currency,
        b.is_active,
        b.created_at,
        b.updated_at,
        bp.id         AS period_id,
        bp.start_date  AS period_start_date,
        bp.end_date    AS period_end_date,
        bp.amount      AS period_amount,
        bp.is_active   AS period_is_active,
        bp.created_at  AS period_created_at,
        bp.updated_at  AS period_updated_at,
        COALESCE(spent.total, 0) AS total_spent
      FROM budgets b
      LEFT JOIN budget_periods bp
        ON bp.budget_id = b.id
        AND bp.start_date <= ${today}
        AND bp.end_date   >= ${today}
        AND bp.is_active = true
      LEFT JOIN (
        SELECT m.period_id, SUM(m.amount) AS total
        FROM movements m
        WHERE m.type = 'EXPENSE'
          AND m.deleted_at IS NULL
        GROUP BY m.period_id
      ) spent ON spent.period_id = bp.id
      WHERE b.user_id = ${userId}
        AND b.deleted_at IS NULL
        ${activeFilter}
      ORDER BY b.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const items: BudgetWithSpending[] = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      recurrence: row.recurrence,
      currency: row.currency,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      currentPeriod: row.period_id
        ? {
            id: row.period_id,
            budgetId: row.id,
            startDate: row.period_start_date!,
            endDate: row.period_end_date!,
            amount: row.period_amount!,
            isActive: row.period_is_active!,
            createdAt: row.period_created_at!,
            updatedAt: row.period_updated_at!,
          }
        : null,
      totalSpent: Number(row.total_spent),
    }));

    return { items, total };
  }

  async findActiveByUserId(userId: string): Promise<Budget[]> {
    return await this.db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.isActive, true),
          isNull(budgets.deletedAt)
        )
      );
  }

  async create(data: NewBudget): Promise<Budget> {
    const result = await this.db
      .insert(budgets)
      .values(data)
      .returning();
    
    return result[0];
  }

  async update(id: string, data: Partial<NewBudget>): Promise<Budget | null> {
    const result = await this.db
      .update(budgets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)))
      .returning();
    
    return result[0] || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.db
      .update(budgets)
      .set({ deletedAt: new Date() })
      .where(eq(budgets.id, id))
      .returning();
    
    return result.length > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(budgets)
      .where(eq(budgets.id, id))
      .returning();
    
    return result.length > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ id: budgets.id })
      .from(budgets)
      .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)))
      .limit(1);
    
    return result.length > 0;
  }
}
