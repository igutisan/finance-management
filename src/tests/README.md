# Test Suite

## Overview
This directory contains the complete test suite for the Budget API, organized by test type.

## Structure

```
tests/
├── unit/              # Unit tests (isolated components)
│   ├── services/      # Service layer tests
│   └── repositories/  # Repository layer tests
├── integration/       # Integration tests (multiple layers)
└── e2e/              # End-to-end tests (full API)
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific test type
bun test tests/unit/
bun test tests/integration/
bun test tests/e2e/

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

## Writing Tests

See [`../docs/TESTING_GUIDE.md`](../docs/TESTING_GUIDE.md) for:
- TDD workflow
- Testing patterns
- Mocking strategies
- Best practices
- Examples

## Test Files

### Unit Tests
- `unit/services/user.service.test.ts`: User business logic
- `unit/repositories/user.repository.test.ts`: User data access

### Integration Tests
- `integration/user.integration.test.ts`: Service + Repository integration

### E2E Tests
- `e2e/user.e2e.test.ts`: Complete HTTP API flows

## Coverage Goals

- **Overall:** 80%+
- **Services:** 90%+ (critical business logic)
- **Repositories:** 70%+
- **Controllers:** 80%+

## Next Steps

1. Implement actual test logic (currently boilerplate)
2. Set up test database
3. Add more test cases
4. Integrate with CI/CD
