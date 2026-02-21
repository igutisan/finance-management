/**
 * Movement Repository
 * 
 * Data access layer for Movement entity using Drizzle ORM.
 */

import { eq, and, isNull, gte, lte, sum, count, type SQL } from 'drizzle-orm';
import type { Database } from '../../shared/db';
import { movements, budgetPeriods, budgets } from '../../shared/db/schema';
import type { Movement, NewMovement } from '../../shared/db/schema';

/** Movement enriched with the parent budget name (null if not linked to a period) */
export type MovementWithBudget = Movement & { budgetName: string | null };

export class MovementRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Movement | null> {
    const result = await this.db
      .select()
      .from(movements)
      .where(and(eq(movements.id, id), isNull(movements.deletedAt)))
      .limit(1);
    
    return result[0] || null;
  }

  async findAll(): Promise<Movement[]> {
    return await this.db
      .select()
      .from(movements)
      .where(isNull(movements.deletedAt));
  }

  async findByUserId(userId: string): Promise<Movement[]> {
    return await this.db
      .select()
      .from(movements)
      .where(and(eq(movements.userId, userId), isNull(movements.deletedAt)));
  }

  /**
   * Paginated + filtered query for user movements.
   *
   * Filters: type (INCOME | EXPENSE | TRANSFER), month + year.
   * Orders by date DESC (most recent first).
   */
  async findByUserIdPaginated(
    userId: string,
    options: {
      page: number;
      limit: number;
      type?: string;
      month?: number;
      year?: number;
      budgetId?: string;
    },
  ): Promise<{ items: MovementWithBudget[]; total: number }> {
    const { page, limit, type, month, year, budgetId } = options;
    const offset = (page - 1) * limit;

    // Build dynamic conditions
    const conditions: SQL[] = [
      eq(movements.userId, userId),
      isNull(movements.deletedAt),
    ];

    if (type) {
      conditions.push(eq(movements.type, type as 'INCOME' | 'EXPENSE' | 'TRANSFER'));
    }

    if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      conditions.push(gte(movements.date, startOfMonth));
      conditions.push(lte(movements.date, endOfMonth));
    }
    
    if (budgetId) {
      conditions.push(eq(budgetPeriods.budgetId, budgetId));
    }

    const whereClause = and(...conditions);

    // Count total matching records
    const countResult = await this.db
      .select({ total: count() })
      .from(movements)
      .leftJoin(budgetPeriods, eq(movements.periodId, budgetPeriods.id))
      .where(whereClause);

    const total = Number(countResult[0]?.total || 0);

    // Fetch paginated items with budget name via JOIN
    const rows = await this.db
      .select({
        id: movements.id,
        userId: movements.userId,
        periodId: movements.periodId,
        type: movements.type,
        amount: movements.amount,
        description: movements.description,
        date: movements.date,
        paymentMethod: movements.paymentMethod,
        isRecurring: movements.isRecurring,
        tags: movements.tags,
        createdAt: movements.createdAt,
        updatedAt: movements.updatedAt,
        deletedAt: movements.deletedAt,
        budgetName: budgets.name,
      })
      .from(movements)
      .leftJoin(budgetPeriods, eq(movements.periodId, budgetPeriods.id))
      .leftJoin(budgets, eq(budgetPeriods.budgetId, budgets.id))
      .where(whereClause)
      .orderBy(movements.date)
      .limit(limit)
      .offset(offset);

    const items: MovementWithBudget[] = rows.map((row) => ({
      ...row,
      budgetName: row.budgetName ?? null,
    }));

    return { items, total };
  }

  async findByPeriodId(periodId: string, userId: string): Promise<Movement[]> {
    return await this.db
      .select()
      .from(movements)
      .where(and(eq(movements.periodId, periodId), eq(movements.userId, userId), isNull(movements.deletedAt)));
  }

  async findByType(type: 'INCOME' | 'EXPENSE' | 'TRANSFER'): Promise<Movement[]> {
    return await this.db
      .select()
      .from(movements)
      .where(and(eq(movements.type, type), isNull(movements.deletedAt)));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Movement[]> {
    return await this.db
      .select()
      .from(movements)
      .where(
        and(
          gte(movements.date, startDate),
          lte(movements.date, endDate),
          isNull(movements.deletedAt)
        )
      );
  }

  async getTotalByType(userId: string, type: 'INCOME' | 'EXPENSE' | 'TRANSFER'): Promise<number> {
    const result = await this.db
      .select({ total: sum(movements.amount) })
      .from(movements)
      .where(
        and(
          eq(movements.userId, userId),
          eq(movements.type, type),
          isNull(movements.deletedAt)
        )
      );
    
    return Number(result[0]?.total || 0);
  }

  async getPeriodTotalSpent(periodId: string, userId: string): Promise<number> {
    const result = await this.db
      .select({ total: sum(movements.amount) })
      .from(movements)
      .where(
        and(
          eq(movements.periodId, periodId),
          eq(movements.userId, userId),
          eq(movements.type, 'EXPENSE'),
          isNull(movements.deletedAt)
        )
      );
    
    return Number(result[0]?.total || 0);
  }

  async create(data: NewMovement): Promise<Movement> {
    const result = await this.db
      .insert(movements)
      .values(data)
      .returning();
    
    return result[0];
  }

  async update(id: string, data: Partial<NewMovement>): Promise<Movement | null> {
    const result = await this.db
      .update(movements)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(movements.id, id), isNull(movements.deletedAt)))
      .returning();
    
    return result[0] || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.db
      .update(movements)
      .set({ deletedAt: new Date() })
      .where(eq(movements.id, id))
      .returning();
    
    return result.length > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(movements)
      .where(eq(movements.id, id))
      .returning();
    
    return result.length > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ id: movements.id })
      .from(movements)
      .where(and(eq(movements.id, id), isNull(movements.deletedAt)))
      .limit(1);
    
    return result.length > 0;
  }
}
