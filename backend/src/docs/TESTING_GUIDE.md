# Testing Guide - TDD Best Practices

## Overview
This guide outlines testing strategies and Test-Driven Development (TDD) practices for the Budget API.

**Testing Philosophy:** Write tests first, implement later.

---

## Test Structure

### Test Types

#### 1. Unit Tests (`tests/unit/`)
**Purpose:** Test individual components in isolation.

**Characteristics:**
- Fast execution
- No external dependencies
- Mock all dependencies
- High code coverage

**What to test:**
- Services (business logic)
- Repositories (data access logic)
- Utility functions
- Transformations (Entity ↔ DTO)

**Examples:**
- `tests/unit/services/user.service.test.ts`
- `tests/unit/repositories/user.repository.test.ts`

#### 2. Integration Tests (`tests/integration/`)
**Purpose:** Test multiple layers working together.

**Characteristics:**
- Test layer interactions
- Use test database
- Verify data persistence
- Test transactions

**What to test:**
- Service + Repository integration
- Unit of Work transactions
- Database constraints
- Cascade operations

**Example:**
- `tests/integration/user.integration.test.ts`

#### 3. E2E Tests (`tests/e2e/`)
**Purpose:** Test complete user flows via HTTP.

**Characteristics:**
- Full application stack
- Real HTTP requests
- Test database
- Verify complete workflows

**What to test:**
- API endpoints
- Authentication flows
- Error responses
- Complete user stories

**Example:**
- `tests/e2e/user.e2e.test.ts`

---

## TDD Workflow

### Red-Green-Refactor Cycle

**1. Red - Write failing test:**
```typescript
test('UserService.register should create a new user', async () => {
  const dto = { email: 'test@example.com', password: 'password123', ... };
  const result = await userService.register(dto);
  expect(result.email).toBe('test@example.com');
});
// Test fails because method not implemented
```

**2. Green - Write minimum code to pass:**
```typescript
async register(dto: CreateUserRequestDTO): Promise<UserResponseDTO> {
  // Minimal implementation to pass test
  return { id: '1', email: dto.email, ... };
}
```

**3. Refactor - Improve code quality:**
```typescript
async register(dto: CreateUserRequestDTO): Promise<UserResponseDTO> {
  // Add validation
  // Add password hashing
  // Implement proper repository call
  // Return proper DTO
}
```

### TDD Benefits
- **Better design:** Tests force modular code
- **Confidence:** Changes don't break existing features
- **Documentation:** Tests serve as examples
- **Faster debugging:** Failing tests pinpoint issues

---

## Running Tests

### Bun Test Commands
```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/services/user.service.test.ts

# Run with watch mode
bun test --watch

# Run with coverage
bun test --coverage
```

### Test Database Setup
```bash
# Create test database
docker exec -it budget-db psql -U postgres -c "CREATE DATABASE budget_test;"

# Run migrations for test DB
# TODO: Add migration script

# Set test environment
export DATABASE_NAME=budget_test
```

---

## Writing Tests

### Unit Test Example
```typescript
import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { UserService } from '../../src/services/user.service';

describe('UserService', () => {
  let userService: UserService;
  let mockUnitOfWork: any;

  beforeEach(() => {
    // Mock dependencies
    mockUnitOfWork = {
      users: {
        findByEmail: mock(() => Promise.resolve(null)),
        create: mock((data) => Promise.resolve({ id: '1', ...data })),
      },
      executeInTransaction: mock((fn) => fn(mockUnitOfWork)),
    };

    userService = new UserService(mockUnitOfWork);
  });

  test('register should create a new user', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    const result = await userService.register(dto);

    expect(result.email).toBe(dto.email);
    expect(mockUnitOfWork.users.create).toHaveBeenCalled();
  });

  test('register should fail if email exists', async () => {
    mockUnitOfWork.users.findByEmail = mock(() => 
      Promise.resolve({ id: '1', email: 'test@example.com' })
    );

    const dto = { email: 'test@example.com', password: '123', ... };

    await expect(userService.register(dto)).rejects.toThrow('Email already exists');
  });
});
```

### Integration Test Example
```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { UnitOfWork } from '../../src/repositories/unit-of-work';
import { databaseConfig } from '../../src/config/database.config';

describe('User Integration Tests', () => {
  let uow: UnitOfWork;

  beforeAll(async () => {
    // Setup test database
    await databaseConfig.query('TRUNCATE TABLE users CASCADE');
  });

  afterAll(async () => {
    // Cleanup
    await databaseConfig.close();
  });

  test('should create and retrieve user', async () => {
    uow = new UnitOfWork();
    
    const userData = {
      email: 'integration@test.com',
      passwordHash: 'hashed',
      firstName: 'Test',
      lastName: 'User',
    };

    const created = await uow.users.create(userData);
    const retrieved = await uow.users.findById(created.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.email).toBe(userData.email);
  });
});
```

### E2E Test Example  
```typescript
import { describe, test, expect } from 'bun:test';

describe('User E2E Tests', () => {
  const baseUrl = 'http://localhost:3000';

  test('POST /users/register should create user', async () => {
    const response = await fetch(`${baseUrl}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'e2e@test.com',
        password: 'password123',
        firstName: 'E2E',
        lastName: 'Test',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.email).toBe('e2e@test.com');
  });
});
```

---

## Mocking Strategies

### Mock Repositories
```typescript
const mockUserRepo = {
  findById: mock(() => Promise.resolve(mockUser)),
  create: mock(() => Promise.resolve(mockUser)),
  update: mock(() => Promise.resolve(mockUser)),
};
```

### Mock Unit of Work
```typescript
const mockUnitOfWork = {
  users: mockUserRepo,
  budgets: mockBudgetRepo,
  movements: mockMovementRepo,
  executeInTransaction: mock((fn) => fn(mockUnitOfWork)),
};
```

### Mock Database
For integration tests, use a test database, not mocks.

---

## Coverage Goals

**Target Coverage:**
- **Overall:** 80%+ code coverage
- **Services:** 90%+ (business logic is critical)
- **Repositories:** 70%+ (integration tests cover more)
- **Controllers:** 80%+ (E2E tests help)

**Run coverage:**
```bash
bun test --coverage
```

---

## Best Practices

### DO:
✅ Write tests before implementation (TDD)  
✅ Test one thing per test  
✅ Use descriptive test names  
✅ Mock external dependencies  
✅ Test edge cases and errors  
✅ Keep tests independent  
✅ Use beforeEach for setup  
✅ Clean up after tests  

### DON'T:
❌ Test implementation details  
❌ Write tests that depend on each other  
❌ Skip error case testing  
❌ Use production database for tests  
❌ Write tests after implementation  
❌ Mock everything (integration tests need real components)  

---

## Test Organization

```
tests/
├── unit/
│   ├── services/
│   │   ├── user.service.test.ts
│   │   ├── budget.service.test.ts
│   │   └── movement.service.test.ts
│   └── repositories/
│       ├── user.repository.test.ts
│       ├── budget.repository.test.ts
│       └── movement.repository.test.ts
├── integration/
│   ├── user.integration.test.ts
│   ├── budget.integration.test.ts
│   └── movement.integration.test.ts
└── e2e/
    ├── user.e2e.test.ts
    ├── budget.e2e.test.ts
    └── movement.e2e.test.ts
```

---

## Continuous Integration

**TODO:** Set up CI/CD pipeline
- Run tests on every commit
- Block merges if tests fail
- Generate coverage reports
- Test against multiple Node/Bun versions

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-06
