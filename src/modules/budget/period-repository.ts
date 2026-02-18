/**
 * Budget Period Repository
 * 
 * Data access layer for budget_periods table.
 */

import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm';
import type { Database } from '../../shared/db';
import { budgetPeriods, type BudgetPeriod, type NewBudgetPeriod } from '../../shared/db/schema';

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
   * Find all periods for a budget
   */
  async findByBudgetId(budgetId: string): Promise<BudgetPeriod[]> {
    return await this.db
      .select()
      .from(budgetPeriods)
      .where(eq(budgetPeriods.budgetId, budgetId))
      .orderBy(budgetPeriods.startDate);
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

    const items = await this.db
      .select()
      .from(budgetPeriods)
      .where(eq(budgetPeriods.budgetId, budgetId))
      .orderBy(budgetPeriods.startDate)
      .limit(limit)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(budgetPeriods)
      .where(eq(budgetPeriods.budgetId, budgetId));

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
