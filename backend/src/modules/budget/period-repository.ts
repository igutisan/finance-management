/**
 * Budget Period Repository
 * 
 * Data access layer for budget_periods table.
 */

import { eq, and, isNull, gte, lte, sql, getTableColumns } from 'drizzle-orm';
import type { Database } from '../../shared/db';
import { budgetPeriods, movements, type BudgetPeriod, type NewBudgetPeriod } from '../../shared/db/schema';

export class BudgetPeriodRepository {
  constructor(private db: Database) {}

  /**
   * Create a single budget period
   */
  async create(data: NewBudgetPeriod): Promise<BudgetPeriod> {
    const [period] = await this.db.insert(budgetPeriods).values(data).returning();
    return period;
  }

  /**
   * Batch create multiple periods (for period generation)
   */
  async createMany(periods: NewBudgetPeriod[]): Promise<BudgetPeriod[]> {
    if (periods.length === 0) return [];
    return await this.db.insert(budgetPeriods).values(periods).returning();
  }

  /**
   * Find period by ID
   */
  async findById(id: string): Promise<BudgetPeriod | undefined> {
    const [period] = await this.db
      .select()
      .from(budgetPeriods)
      .where(eq(budgetPeriods.id, id));
    return period;
  }

  /**
   * Find all periods for a budget (with optional year and month filters)
   * Automatically joins and sums movements to provide 'spent' amount.
   */
  async findByBudgetId(
    budgetId: string,
    options?: { year?: number; month?: number }
  ): Promise<(BudgetPeriod & { spent: string })[]> {
    const conditions = [
      eq(budgetPeriods.budgetId, budgetId)
    ];

    if (options?.year) {
      conditions.push(sql`EXTRACT(YEAR FROM ${budgetPeriods.startDate}) = ${options.year}`);
    }

    if (options?.month) {
      conditions.push(sql`EXTRACT(MONTH FROM ${budgetPeriods.startDate}) = ${options.month}`);
    }

    // Only fetch periods that have already started
    conditions.push(
      sql`${budgetPeriods.startDate} <= CURRENT_DATE`
    );

    // Fetch periods with spent amount
    const result = await this.db
      .select({
        ...getTableColumns(budgetPeriods),
        spent: sql<string>`COALESCE(SUM(${movements.amount}) FILTER (WHERE ${movements.type} = 'EXPENSE' AND ${movements.deletedAt} IS NULL), '0')`,
      })
      .from(budgetPeriods)
      .leftJoin(
        movements,
        eq(budgetPeriods.id, movements.periodId)
      )
      .where(and(...conditions))
      .groupBy(budgetPeriods.id)
      .orderBy(budgetPeriods.startDate);
      
    return result;
  }

  /**
   * Find the current period for a budget based on a date
   * Returns the period where startDate <= date <= endDate
   */
  async findCurrentPeriod(budgetId: string, date: Date): Promise<BudgetPeriod | undefined> {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const [period] = await this.db
      .select()
      .from(budgetPeriods)
      .where(
        and(
          eq(budgetPeriods.budgetId, budgetId),
          lte(budgetPeriods.startDate, dateString),
          gte(budgetPeriods.endDate, dateString),
          eq(budgetPeriods.isActive, true)
        )
      );
    return period;
  }

  /**
   * Find periods by budget ID with pagination
   */
  async findByBudgetIdPaginated(
    budgetId: string,
    options: {
      page: number;
      limit: number;
    }
  ): Promise<{ items: BudgetPeriod[]; total: number }> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;
    const today = new Date().toISOString().split('T')[0];

    const whereClause = and(
      eq(budgetPeriods.budgetId, budgetId),
      lte(budgetPeriods.startDate, today)
    );

    const items = await this.db
      .select()
      .from(budgetPeriods)
      .where(whereClause)
      .orderBy(budgetPeriods.startDate)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(budgetPeriods)
      .where(whereClause);

    return { items, total: count };
  }

  /**
   * Update a period (e.g., override amount)
   */
  async update(id: string, data: Partial<NewBudgetPeriod>): Promise<BudgetPeriod | undefined> {
    const [period] = await this.db
      .update(budgetPeriods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(budgetPeriods.id, id))
      .returning();
    return period;
  }

  /**
   * Update the amount for the current and all future periods of a budget
   */
  async updateFuturePeriodsAmount(budgetId: string, amount: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.db
      .update(budgetPeriods)
      .set({ amount, updatedAt: new Date() })
      .where(
        and(
          eq(budgetPeriods.budgetId, budgetId),
          gte(budgetPeriods.endDate, today) // Only active and future periods
        )
      );
  }

  /**
   * Update the amount for periods starting from a specific date onwards
   */
  async updateFuturePeriodsAmountFromDate(budgetId: string, amount: string, fromDate: string): Promise<void> {
    await this.db
      .update(budgetPeriods)
      .set({ amount, updatedAt: new Date() })
      .where(
        and(
          eq(budgetPeriods.budgetId, budgetId),
          gte(budgetPeriods.startDate, fromDate)
        )
      );
  }

  /**
   * Get the last period for a budget (by endDate)
   * Used for extending periods
   */
  async findLastPeriod(budgetId: string): Promise<BudgetPeriod | undefined> {
    const [period] = await this.db
      .select()
      .from(budgetPeriods)
      .where(eq(budgetPeriods.budgetId, budgetId))
      .orderBy(sql`${budgetPeriods.endDate} DESC`)
      .limit(1);
    return period;
  }
}
