# Test Suite

## Overview
This directory contains the complete test suite for the Budget API, organized by test type.

## Structure

```
tests/
├── unit/              # Core business rules mapped out statelessly
│   └── services/      # Service layer logic
├── integration/       # Database-connected end-to-end API suites
└── e2e/              # Dedicated environment testing
```



## Running Tests

```bash
# Run all tests
bun test

# Run specific test type
bun test src/tests/unit/
bun test src/tests/integration/

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

## Detailed Documentation

Please refer to [`../docs/TESTING_GUIDE.md`](../docs/TESTING_GUIDE.md) for complete instructions regarding:
- Red-Green-Refactor logic
- Addressing test parallelization (`jti` UUIDs)
- Identifying anti-patterns
- Coverage benchmarks
