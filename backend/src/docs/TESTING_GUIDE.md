# Testing Guide - Modern TDD Best Practices

## Overview
This guide outlines the testing strategies and Test-Driven Development (TDD) practices for the Budget API.

**Testing Philosophy:** Write tests designed to protect business outcomes, not to execute libraries.

---

## Strategy & Paradigms

### What NOT to test: Repositories
We explicitly **do not write Unit Tests for repositories**. 
- Mocking the ORM (Drizzle) to assert that a repository function calls `db.insert(...)` correctly is an **anti-pattern**.
- Repository tests simply mirror Drizzle documentation and add fragile boilerplate.
- Data logic is best verified during Integration testing natively against Postgres.

### End-to-End & Integration First (`tests/integration/`)
**Purpose:** Verify the actual backend contracts and the database layers.

**Characteristics:**
- Tests spin up real HTTP requests (via `app.handle()`).
- The test database connects actively to Postgres.
- Verifies cascades, constraints, soft-deletes, and JSON API payloads.

**Example scenarios tested:**
- Registering with an existing email throws a `409` envelope.
- Failing a validation block returns `422`.
- Hashing collisions or token revokes function correctly natively.

### Core Business Logic (`tests/unit/services/`)
**Purpose:** Ensure complex domain rules behave natively and strictly without depending on the API runtime or the database.

**Characteristics:**
- The dependencies (Repositories, JWT context) are abstracted.
- Services compute business mathematics quickly and statelessly.

**Example scenarios testing:**
- Verifying a `MovementService` denies negative values or returns the correct `balance`.
- Verifying the `BudgetService` generates precisely 12 `BudgetPeriods` when recurrence is `"MONTHLY"`.

---

## Test Execution

### Bun Test Commands
Fast execution using the native Bun runtime. Parallelisation is supported.

```bash
# Run all tests
bun test

# Run a specific domain suite
bun test src/tests/unit/services/budget.service.test.ts

# Run tests filtering by description
bun test --testNamePattern="should return valid JWT"
```

### Environment Settings
Integration tests require a live database. Tests connect using the `DATABASE_URL` or standard postgres environment variables detailed in the `.env` root. Ensure `bun` is run under an active docker context or local postgres engine.

---

## Security In Parallel Test Execution
Integration tests are structurally isolated or uniquely scoped to prevent **flakiness**.
- Users logging in rapidly over identical milliseconds in a test loop will generate identical JWT strings.
- We implement `jti` (UUID) injection to JWTs so that rapid loop authentication tests natively pass hashing tests without unique-constraint closures on the database end.

---

## The TDD Flow

We execute code modifications using standard **Red-Green-Refactor**.

1. **RED:** Write the assertion verifying the new feature or isolating fixing a bug.
   - Example: Expect an HTTP 500 when accessing `/budgets/:id` if it's unauthorized.
2. **GREEN:** Alter the service, payload model, or controller macro (e.g., `auth: true`) until the response strictly conforms.
3. **REFACTOR:** Enhance variables, dry code, or extract shared structures without the test suite changing from Green to Red.
   - Example: Replace deep nesting logic with simpler database-level SQL extracts.

---

**Last Updated:** 2026-02-21
