/**
 * Database Connection
 * 
 * Drizzle ORM database instance using postgres.js.
 * Singleton pattern for connection management.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { envConfig } from '../config/env.config';

// Create postgres.js connection
const connectionString = `postgresql://${envConfig.get('DATABASE_USER')}:${envConfig.get('DATABASE_PASSWORD')}@${envConfig.get('DATABASE_HOST')}:${envConfig.get('DATABASE_PORT')}/${envConfig.get('DATABASE_NAME')}`;

const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export types
export type Database = typeof db;
