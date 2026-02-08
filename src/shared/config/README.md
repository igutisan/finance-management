# Config Layer

## Purpose
The **Config Layer** manages application configuration and external resource connections using the **Singleton pattern** to ensure single instances across the application.

## Responsibilities
- Load and validate environment variables
- Manage database connection pool
- Provide centralized configuration access
- Ensure consistent configuration throughout the application lifecycle

## Design Pattern: Singleton
Both configuration modules use the Singleton pattern to guarantee:
- Only one instance exists
- Global point of access
- Lazy initialization
- Thread-safe in JavaScript (single-threaded)

## Files

### `env.config.ts`
Manages environment variables with type safety.

**Features:**
- Validates and types all environment variables
- Provides defaults for development
- Single source of truth for configuration
- Type-safe access to config values

**Usage:**
```typescript
import { envConfig } from '../config/env.config';

const port = envConfig.get('APP_PORT');
const dbHost = envConfig.get('DATABASE_HOST');
```

### `database.config.ts`
Manages PostgreSQL connection pool.

**Features:**
- Singleton database pool
- Connection pooling for performance
- Centralized query execution
- Automatic connection management

**Usage:**
```typescript
import { databaseConfig } from '../config/database.config';

// Get pool
const pool = databaseConfig.getPool();

// Execute query
const result = await databaseConfig.query('SELECT * FROM users WHERE id = $1', [userId]);

// Get client for transactions
const client = await databaseConfig.getClient();
```

## Dependencies
- **None** (config is the foundation layer)
- Used by: All other layers

## Testing
- Mock Singleton instances for testing
- Use test-specific environment variables
- Create separate test database configuration

## Example
```typescript
// Application startup
import { envConfig } from './config/env.config';
import { databaseConfig } from './config/database.config';

// Config is automatically initialized on first import
console.log(`Starting app on port ${envConfig.get('APP_PORT')}`);

// Database pool is ready to use
const pool = databaseConfig.getPool();
```
