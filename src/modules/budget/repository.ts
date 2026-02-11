/**
 * Budget Repository
 * 
 * Data access layer for Budget entity using Drizzle ORM.
 */

import { eq, and, isNull, gte, lte, count, type SQL } from 'drizzle-orm';
import type { Database } from '../../shared/db';
import { budgets } from '../../shared/db/schema';
import type { Budget, NewBudget } from '../../shared/db/schema';

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
   * Filters: category, isActive.
   * Orders by createdAt DESC.
   */
  async findByUserIdPaginated(
    userId: string,
    options: {
      page: number;
      limit: number;
      category?: string;
      isActive?: boolean;
    },
  ): Promise<{ items: Budget[]; total: number }> {
    const { page, limit, category, isActive } = options;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      eq(budgets.userId, userId),
      isNull(budgets.deletedAt),
    ];

    if (category) {
      conditions.push(eq(budgets.category, category));
    }

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

  async findByCategory(category: string): Promise<Budget[]> {
    return await this.db
      .select()
      .from(budgets)
      .where(and(eq(budgets.category, category), isNull(budgets.deletedAt)));
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

  async findByDateRange(startDate: Date, endDate: Date): Promise<Budget[]> {
    return await this.db
      .select()
      .from(budgets)
      .where(
        and(
          gte(budgets.startDate, startDate.toISOString().split('T')[0]),
          lte(budgets.endDate, endDate.toISOString().split('T')[0]),
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
