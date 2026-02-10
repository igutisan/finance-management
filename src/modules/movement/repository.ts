/**
 * Movement Repository
 * 
 * Data access layer for Movement entity using Drizzle ORM.
 */

import { eq, and, isNull, gte, lte, sum } from 'drizzle-orm';
import type { Database } from '../../shared/db';
import { movements } from '../../shared/db/schema';
import type { Movement, NewMovement } from '../../shared/db/schema';

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

  async findByBudgetId(budgetId: string, userId: string): Promise<Movement[]> {
    return await this.db
      .select()
      .from(movements)
      .where(and(eq(movements.budgetId, budgetId), eq(movements.userId, userId), isNull(movements.deletedAt)));
  }

  async findByType(type: 'INCOME' | 'EXPENSE' | 'TRANSFER'): Promise<Movement[]> {
    return await this.db
      .select()
      .from(movements)
      .where(and(eq(movements.type, type), isNull(movements.deletedAt)));
  }

  async findByCategory(category: string): Promise<Movement[]> {
    return await this.db
      .select()
      .from(movements)
      .where(and(eq(movements.category, category), isNull(movements.deletedAt)));
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

  async getBudgetTotalSpent(budgetId: string, userId: string): Promise<number> {
    const result = await this.db
      .select({ total: sum(movements.amount) })
      .from(movements)
      .where(
        and(
          eq(movements.budgetId, budgetId),
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
