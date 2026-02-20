/**
 * User Repository
 * 
 * Data access layer for User entity using Drizzle ORM.
 */

import { eq, and, isNull, or } from 'drizzle-orm';
import type { Database } from '../../shared/db';
import { users } from '../../shared/db/schema';
import type { User, NewUser } from '../../shared/db/schema';

export class UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    
    return result[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    
    return result[0] || null;
  }

  async findAll(): Promise<User[]> {
    return await this.db
      .select()
      .from(users)
      .where(isNull(users.deletedAt));
  }

  async findActive(): Promise<User[]> {
    return await this.db
      .select()
      .from(users)
      .where(and(eq(users.isActive, true), isNull(users.deletedAt)));
  }

  async create(data: NewUser): Promise<User> {
    const result = await this.db
      .insert(users)
      .values(data)
      .returning();
    
    return result[0];
  }

  async update(id: string, data: Partial<NewUser>): Promise<User | null> {
    const result = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    
    return result[0] || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return result.length > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    
    return result.length > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    
    return result.length > 0;
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    
    return result.length > 0;
  }
}
