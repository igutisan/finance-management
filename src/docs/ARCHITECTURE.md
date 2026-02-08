# Budget API - Architecture Documentation

## Overview
This document describes the architecture of the Budget API, a layered backend application built with Elysia runtime (Bun), TypeScript, and PostgreSQL.

**Architecture Pattern:** Layered Architecture  
**Design Patterns:** Repository, Unit of Work, Singleton  
**Framework:** Elysia (Bun runtime)  
**Database:** PostgreSQL  
**Language:** TypeScript (Strict mode)

---

## System Architecture

### Layer Overview
The application follows a strict layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         HTTP Layer (Elysia)             │  ← Entry Point
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│     Controllers (Route Handlers)        │  ← HTTP Concerns
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    Services (Business Logic)            │  ← Business Rules
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Unit of Work (Transaction Manager)     │  ← Transaction Boundary
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│   Repositories (Data Access)            │  ← Data Layer
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    Entities (Domain Models)             │  ← Domain Layer
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      Config + Database Pool             │  ← Infrastructure
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      PostgreSQL Database                │  ← Persistence
└─────────────────────────────────────────┘
```

### Data Flow
**Request Flow:**
```
HTTP Request → Controller → Service → Unit of Work → Repository → Database
```

**Response Flow:**
```
Database → Repository → Entity → Service → DTO → Controller → HTTP Response
```

---

## Layer Descriptions

### 1. Entities Layer (`src/entities/`)
**Pure domain models** matching database schema.

**Responsibilities:**
- Define data structure
- Type safety for domain objects
- No business logic
- Map to database tables

**Key Files:**
- `base/base.entity.ts`: Common properties (id, timestamps, deletedAt)
- `user.entity.ts`: User domain model
- `budget.entity.ts`: Budget domain model
- `movement.entity.ts`: Movement domain model with MovementType enum

**Design Principle:** Single source of truth for domain structure.

### 2. DTOs Layer (`src/dtos/`)
**Data Transfer Objects** for API contracts.

**Responsibilities:**
- Define request/response structures
- Separate internal models from API contracts
- Validate input data
- Exclude sensitive information

**Naming Convention:**
- Request DTOs: `*.request.dto.ts`
- Response DTOs: `*.response.dto.ts`

**Design Principle:** Never expose entities directly; always use DTOs.

### 3. Repositories Layer (`src/repositories/`)
**Data access** using Repository and Unit of Work patterns.

**Responsibilities:**
- Abstract database operations
- CRUD operations per entity
- Custom query methods
- Transaction participation

**Pattern: Repository**
- Interface: `IBaseRepository<T>`
- Implementations: `UserRepository`, `BudgetRepository`, `MovementRepository`

**Pattern: Unit of Work**
- Interface: `IUnitOfWork`
- Implementation: `UnitOfWork`
- Coordinates repositories in transactions

**Design Principle:** Encapsulate all data access logic.

### 4. Services Layer (`src/services/`)
**Business logic** orchestration.

**Responsibilities:**
- Implement business rules
- Coordinate repository operations
- Manage transactions via Unit of Work
- Transform entities ↔ DTOs
- Validation and error handling

**Key Services:**
- `UserService`: Authentication, user management
- `BudgetService`: Budget CRUD, validation, summaries
- `MovementService`: Movement CRUD, analytics

**Design Principle:** Services contain business logic, not data access.

### 5. Controllers Layer (`src/controllers/`)
**HTTP request handling** with Elysia.

**Responsibilities:**
- Define API routes
- Validate requests (Elysia schemas)
- Call service methods
- Format responses
- HTTP status codes

**Key Controllers:**
- `userController`: `/users/*` endpoints
- `budgetController`: `/budgets/*` endpoints
- `movementController`: `/movements/*` endpoints

**Design Principle:** Thin controllers; delegate to services.

### 6. Config Layer (`src/config/`)
**Configuration management** using Singleton pattern.

**Responsibilities:**
- Load environment variables
- Database connection pool
- Centralized configuration access

**Pattern: Singleton**
- `envConfig`: Environment variables (single instance)
- `databaseConfig`: DB pool (single instance)

**Design Principle:** Single instance for resources, lazy initialization.

---

## Design Patterns

### Repository Pattern
**Purpose:** Abstract data access from business logic.

**Benefits:**
- Centralized data access logic
- Easy to mock for testing
- Database-agnostic interface
- Query reusability

**Implementation:**
```typescript
interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  create(data: ...): Promise<T>;
  // ... other CRUD methods
}
```

### Unit of Work Pattern
**Purpose:** Manage transactions across multiple repositories.

**Benefits:**
- Atomic operations
- Transactional consistency
- Coordinated commits/rollbacks
- Single transaction context

**Implementation:**
```typescript
await uow.executeInTransaction(async (uow) => {
  await uow.users.create(...);
  await uow.budgets.create(...);
  // Commits together or rolls back together
});
```

### Singleton Pattern
**Purpose:** Ensure single instance of configuration and resources.

**Benefits:**
- Single database pool
- Consistent configuration
- Resource efficiency

**Implementation:**
```typescript
class Config {
  private static instance: Config;
  static getInstance() { ... }
}
```

---

## Folder Structure
```
src/
├── config/                  # Configuration (Singleton)
│   ├── README.md
│   ├── database.config.ts   # DB pool
│   └── env.config.ts        # Environment vars
├── entities/                # Domain Models
│   ├── README.md
│   ├── base/
│   │   └── base.entity.ts
│   ├── user.entity.ts
│   ├── budget.entity.ts
│   └── movement.entity.ts
├── dtos/                    # Data Transfer Objects
│   ├── README.md
│   ├── user/
│   │   ├── *.request.dto.ts
│   │   └── *.response.dto.ts
│   ├── budget/
│   └── movement/
├── repositories/            # Data Access (Repository + UoW)
│   ├── README.md
│   ├── interfaces/
│   │   ├── base-repository.interface.ts
│   │   └── unit-of-work.interface.ts
│   ├── unit-of-work.ts
│   ├── user.repository.ts
│   ├── budget.repository.ts
│   └── movement.repository.ts
├── services/                # Business Logic
│   ├── README.md
│   ├── user.service.ts
│   ├── budget.service.ts
│   └── movement.service.ts
├── controllers/             # HTTP Handlers
│   ├── README.md
│   ├── user.controller.ts
│   ├── budget.controller.ts
│   └── movement.controller.ts
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # This file
│   ├── TESTING_GUIDE.md
│   └── diagrams/
│       ├── architecture-flow.mmd
│       ├── layer-interaction.mmd
│       └── unit-of-work.mmd
├── tests/                   # Test Suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── index.ts                 # Application Entry
```

---

## Technology Stack

### Runtime & Framework
- **Bun**: Fast JavaScript runtime
- **Elysia**: Web framework optimized for Bun
- **TypeScript**: Strict mode for type safety

### Database
- **PostgreSQL 16**: Relational database
- **pg** (or bun-postgres): Database client

### Development
- **Bun test**: Testing framework
- **Docker**: Containerization
- **Docker Compose**: Multi-service orchestration

---

## Key Design Decisions

### Why Layered Architecture?
- Clear separation of concerns
- Easy to test each layer
- Scalable and maintainable
- Industry-standard pattern

### Why Unit of Work?
- Ensures transactional integrity
- Simplifies complex operations
- Reduces boilerplate
- Single transaction context

### Why DTOs?
- API versioning flexibility
- Security (hide sensitive data)
- Validation at API boundary
- Decouples API from domain

### Why Singleton for Config?
- Single database pool
- Efficient resource usage
- Consistent configuration
- Prevents multiple connections

---

## Diagrams

See `docs/diagrams/` for visual representations:
- **architecture-flow.mmd**: Complete request/response flow
- **layer-interaction.mmd**: Layer dependencies
- **unit-of-work.mmd**: Transaction management visualization

---

## Next Steps

### Implementation
1. Implement database client integration (pg or bun-postgres)
2. Complete repository implementations
3. Add authentication middleware
4. Implement password hashing (bcrypt)
5. Add JWT token generation/validation

### Testing
1. Write unit tests for services
2. Add integration tests for repositories
3. Create E2E tests for API endpoints
4. Set up test database

### Deployment
1. Containerize with Docker
2. Set up Docker Compose
3. Configure environment variables
4. Add health checks
5. Implement logging

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-06
