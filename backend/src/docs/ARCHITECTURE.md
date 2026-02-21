# Budget API - Architecture Documentation

## Overview
This document describes the architecture of the Budget API, a layered backend application built with Elysia runtime (Bun), TypeScript, and PostgreSQL.

**Architecture Pattern:** Layered Architecture  
**Design Patterns:** Repository, Dependency Injection (via function parameters), Singleton  
**Framework:** Elysia (Bun runtime) + Elysia TypeBox/t for validation  
**Database/ORM:** PostgreSQL + Drizzle ORM  
**Language:** TypeScript (Strict mode)

---

## System Architecture

### Layer Overview
The application follows a strict layered architecture with clear separation of concerns:

```text
┌─────────────────────────────────────────┐
│         HTTP Layer (Elysia plugins)     │  ← Entry Point (index.ts)
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    Controllers (Route Handlers)         │  ← HTTP Concerns, Schemas, & Plugins
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    Services (Business Logic)            │  ← Core Business Rules & Validations
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│   Repositories (Data Access)            │  ← Database Operations (Drizzle ORM)
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│        Drizzle Schema Models            │  ← Domain Layer / Database Layout
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      PostgreSQL Database                │  ← Persistence
└─────────────────────────────────────────┘
```

---

## Layer Descriptions

### 1. Schema Layer (`src/shared/db/schema.ts`)
**Database schemas define the true data shape**.
Instead of abstract Class-based Entities, the source of truth is the Drizzle ORM schema mapping.
- `users`: Core account data
- `refresh_tokens`: Hashes for JWT security
- `budgets`: Recurring templates (MONTHLY, WEEKLY, NONE)
- `budget_periods`: Time-bound chunks of a budget
- `movements`: Individual financial transactions linked to periods.

### 2. DTOs / Models (`src/modules/*/model.ts`)
**Data Exchange structures representing the API interfaces.**
Created using `Elysia t` (TypeBox) to automatically generate swagger docs and intercept/validate bad JSON payloads at the routing level.

### 3. Repositories Layer (`src/modules/*/repository.ts`)
**Data access layer completely obscuring Drizzle from the business logic.**

**Responsibilities:**
- Wrap database interactions behind clean async methods.
- Provide simple semantic queries e.g. `findByEmailIncludeDeleted()`
- Accept `typeof db` injected from the controller to perform operations.

### 4. Services Layer (`src/modules/*/service.ts`)
**Pure stateless business logic orchestrators.**

**Responsibilities:**
- Validate complex temporal constraints (e.g. cross-referencing movement times with budget period boundaries).
- Dispatch emails or trigger side effects.
- Hash passwords (Argon2) or sign JWTs via `JwtContext`.
- Compute financial summaries dynamically.

*Note:* Services are static classes. They do not maintain instance state. They receive all dependencies (Repositories, JWT context) as arguments from the Controller.

### 5. Controllers Layer (`src/modules/*/index.ts`)
**Elysia Route Handlers.**

**Responsibilities:**
- Mount paths (`/users`, `/budgets`).
- Validate incoming schemas (Body, Path, Query).
- Apply macros (e.g. `auth: true` to require JWT validation).
- Send specific success or error envelopes (`{ success: true, data: ... }`).

---

## Technical Flow & Domain Logic

### The Budget & Movement Relationship
Unlike standard systems where a Movement links directly to a Budget causing historical data loss when budgets change, this architecture uses **BudgetPeriods**:

1. A `Budget` has a `recurrence` (e.g. MONTHLY) and acts as an infinite template.
2. The system auto-generates `BudgetPeriods` covering physical date ranges (e.g. Feb 01 to Feb 28).
3. `Movements` attach to a specific `BudgetPeriod`. 
This allows previous months to freeze completely, preventing historical anomalies when the user raises their budget allowance next year.

### JWT Rotation & Authentication
Authentication relies on the `authPlugin` macro via Elysia. 
Refreshed access tokens rotate upon use, invalidating previous refresh tokens. Token Hashes are strictly checked for collision via a `jti` (unique JWT id) and verified against `refresh_tokens` tables.

---

## Folder Structure
```text
src/
├── docs/                    # Architecture and Testing docs
├── modules/                 # Modular, feature-driven grouping
│   ├── budget/              # Budgets & Periods sub-module
│   ├── movement/            # Transactions sub-module
│   ├── token/               # JWT security sub-module
│   └── user/                # Auth & Identity sub-module
├── shared/
│   ├── config/              # Environment (Zod) validation
│   ├── db/                  # Drizzle ORM schemas & postgres pool
│   ├── plugins/             # Elysia extensions (Auth macro, Error Handlers)
│   ├── responses/           # Unified API response formats
│   └── utils/
├── tests/                   # TDD Suite
│   ├── integration/         # DB-connected API tests
│   └── unit/                # Mocked Service rules
└── index.ts                 # Elysia startup
```

---

**Last Updated:** 2026-02-21
