/**
 * Dependency Injection Container
 *
 * Single place where every repository and service is instantiated
 * and wired together.  The rest of the application imports from here
 * instead of manually newing-up dependencies.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │                        Container                            │
 * │                                                             │
 * │  db ──► Repositories ──► Services                           │
 * │                           ├─ userService(userRepo, …)       │
 * │                           ├─ budgetService(budgetRepo, …)   │
 * │                           └─ movementService(movementRepo,  │
 * │                                budgetRepo, userRepo, …)     │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Usage in a controller:
 *
 *   import { container } from '../../shared/container';
 *
 *   const { userService } = container;
 *
 *   .post('/register', async ({ body, set }) => {
 *     const data = await userService.register(body);
 *     set.status = 201;
 *     return created(data, 'User registered');
 *   })
 *
 * Usage for testing (override any dependency):
 *
 *   import { createContainer } from '../../shared/container';
 *
 *   const testContainer = createContainer(testDb);
 */

import { db, type Database } from "./db";

// ── Repositories ──────────────────────────────────────────────
import { UserRepository } from "../modules/user/repository";
import { BudgetRepository } from "../modules/budget/repository";
import { MovementRepository } from "../modules/movement/repository";

// ── Services ──────────────────────────────────────────────────
import { UserService } from "../modules/user/service";
import { BudgetService } from "../modules/budget/service";
import { MovementService } from "../modules/movement/service";

// ──────────────────────────────────────────────────────────────
//  Container interface
// ──────────────────────────────────────────────────────────────

export interface Container {
  // Repositories
  userRepo: UserRepository;
  budgetRepo: BudgetRepository;
  movementRepo: MovementRepository;

  // Services
  userService: UserService;
  budgetService: BudgetService;
  movementService: MovementService;
}

// ──────────────────────────────────────────────────────────────
//  Factory – builds a fresh container from any Database instance
// ──────────────────────────────────────────────────────────────

/**
 * Create a fully wired container.
 *
 * Accepts an optional `Database` instance so you can pass a
 * test/transaction-scoped connection during tests.
 */
export function createContainer(database: Database = db): Container {
  // 1. Repositories (depend only on the database)
  const userRepo = new UserRepository(database);
  const budgetRepo = new BudgetRepository(database);
  const movementRepo = new MovementRepository(database);

  // 2. Services (depend on repositories and/or other services)
  //
  //    The order matters: if ServiceA needs ServiceB, create
  //    ServiceB first.  For circular deps, use lazy getters or
  //    a `setXService()` method (see docs in the README).
  const userService = new UserService(userRepo);
  const budgetService = new BudgetService(budgetRepo, userRepo, movementRepo);
  const movementService = new MovementService(
    movementRepo,
    userRepo,
    budgetRepo,
  );

  return {
    userRepo,
    budgetRepo,
    movementRepo,
    userService,
    budgetService,
    movementService,
  };
}

// ──────────────────────────────────────────────────────────────
//  Default singleton used by the application at runtime
// ──────────────────────────────────────────────────────────────

export const container = createContainer();
