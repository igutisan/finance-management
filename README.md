# Budget API

A modern REST API for budget and financial management built with **Elysia** (Bun runtime), **TypeScript**, and **PostgreSQL**.

## 🏗️ Architecture

This project follows a **Layered Architecture** pattern with clear separation of concerns:

- **Entities**: Domain models
- **DTOs**: Request/Response data transfer objects
- **Repositories**: Data access with Unit of Work pattern
- **Services**: Business logic layer
- **Controllers**: HTTP request handling
- **Config**: Singleton configuration management

📚 **[Full Architecture Documentation](./app/src/docs/ARCHITECTURE.md)**

## 🚀 Quick Start

### Prerequisites
- **Docker** & **Docker Compose**
- (Optional) **Bun** runtime for local development

### Using Docker (Recommended)

1. **Clone and navigate to the project:**
   ```bash
   cd budget-project
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start all services:**
   ```bash
   docker-compose up --build
   ```

4. **Access the API:**
   - API: http://localhost:3000
   - Health check: http://localhost:3000/health

### Local Development

1. **Install dependencies:**
   ```bash
   cd app
   bun install
   ```

2. **Start PostgreSQL** (via Docker or locally)

3. **Run the dev server:**
   ```bash
   bun run dev
   ```

## 📁 Project Structure

```
budget-project/
├── app/                        # Backend application
│   ├── src/
│   │   ├── config/            # Configuration (Singleton)
│   │   ├── entities/          # Domain models
│   │   ├── dtos/              # Request/Response DTOs
│   │   ├── repositories/      # Data access + Unit of Work
│   │   ├── services/          # Business logic
│   │   ├── controllers/       # HTTP handlers
│   │   ├── tests/             # Test suite (TDD)
│   │   └── docs/              # Documentation
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml          # Multi-service orchestration
└── .env.example                # Environment template
```

## 🧪 Testing

This project follows **Test-Driven Development (TDD)** principles.

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test types
bun test tests/unit/
bun test tests/integration/
bun test tests/e2e/
```

📚 **[Testing Guide](./app/src/docs/TESTING_GUIDE.md)**

## 📖 Documentation

- **[Architecture Documentation](./app/src/docs/ARCHITECTURE.md)**: Complete system architecture
- **[Testing Guide](./app/src/docs/TESTING_GUIDE.md)**: TDD practices and examples
- **Layer READMEs**: Each layer has its own README with patterns and examples
  - [Config Layer](./app/src/config/README.md)
  - [Entities Layer](./app/src/entities/README.md)
  - [DTOs Layer](./app/src/dtos/README.md)
  - [Repositories Layer](./app/src/repositories/README.md)
  - [Services Layer](./app/src/services/README.md)
  - [Controllers Layer](./app/src/controllers/README.md)

## 🔧 API Endpoints

### Users
- `POST /users/register` - Register new user
- `POST /users/login` - Login user
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user (soft delete)

### Budgets
- `POST /budgets` - Create budget
- `GET /budgets` - Get all user budgets
- `GET /budgets/:id` - Get budget by ID
- `GET /budgets/:id/summary` - Get budget summary
- `PATCH /budgets/:id` - Update budget
- `DELETE /budgets/:id` - Delete budget

### Movements
- `POST /movements` - Create movement
- `GET /movements` - Get all user movements
- `GET /movements/:id` - Get movement by ID
- `GET /movements/analytics` - Get user analytics
- `PATCH /movements/:id` - Update movement
- `DELETE /movements/:id` - Delete movement

## 🎯 Design Patterns

- **Repository Pattern**: Abstracts data access
- **Unit of Work Pattern**: Manages transactions
- **Singleton Pattern**: Single config/DB instances
- **DTO Pattern**: Separates API contracts from domain

## 🛠️ Technology Stack

- **Runtime**: Bun
- **Framework**: Elysia
- **Language**: TypeScript (Strict mode)
- **Database**: PostgreSQL 16
- **Testing**: Bun test
- **Containerization**: Docker + Docker Compose

## 🔐 Environment Variables

See [.env.example](./.env.example) for all available environment variables.

Key variables:
- Database connection (host, port, name, user, password)
- Application configuration (port, environment)
- Security (JWT secret)

## 📝 Development Status

**Current Status**: ✅ Boilerplate Complete

This is a complete boilerplate with:
- ✅ Layered architecture structure
- ✅ All design patterns implemented (interfaces)
- ✅ Comprehensive documentation
- ✅ Test structure (TDD ready)
- ✅ Docker configuration
- ⏳ Implementation pending (marked with TODO)

**Next Steps:**
1. Implement database client (pg or bun-postgres)
2. Complete repository implementations
3. Add authentication & JWT handling
4. Implement password hashing
5. Write actual tests
6. Add API documentation (OpenAPI/Swagger)

## 🤝 Contributing

This project follows industry best practices:
- TDD workflow (Red-Green-Refactor)
- Clean architecture principles
- TypeScript strict mode
- Comprehensive documentation

## 📄 License

[Add your license here]

---

**Built with ❤️ using Bun and Elysia**
