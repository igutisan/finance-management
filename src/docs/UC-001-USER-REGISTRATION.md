# UC-001: User Registration - TDD Implementation

## 📋 Use Case Summary

**Actor:** Usuario no autenticado  
**Endpoint:** `POST /users/register`

### Input Data
```json
{
  "email": "usuario@example.com",
  "password": "SecurePass123!",
  "firstName": "Juan",
  "lastName": "Pérez"
}
```

### Response Data
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "isActive": true,
    "emailVerified": false,
    "createdAt": "2024-02-05T10:00:00Z",
    "updatedAt": "2024-02-05T10:00:00Z"
  },
  "token": "jwt-token"
}
```

---

## ✅ Implementation Complete

### 1. **Argon2 Password Hashing** 
- ✅ Created `PasswordUtil` with Argon2id hashing
- ✅ Updated `UserService.register()` to hash passwords
- ✅ Updated `UserService.login()` to verify passwords
- ✅ Updated `UserService.update()` to hash new passwords

**Configuration:**
- Algorithm: Argon2id
- Memory cost: 64 MB
- Time cost: 3
- Parallelism: 4

### 2. **JWT Authentication**
- ✅ Installed `@elysiajs/jwt`
- ✅ Created JWT configuration
- ✅ Updated `/register` to return JWT token
- ✅ Updated `/login` to return JWT token

**JWT Payload:**
```typescript
{
  userId: string,
  email: string
}
```

### 3. **Test Suite Created**
File: [`src/tests/integration/user-registration.test.ts`](file:///home/igutisan/budget-project/app/src/tests/integration/user-registration.test.ts)

**Test Coverage:**

✅ **Flujo Principal**
- Register user successfully with valid data
- Hash password using Argon2
- Create user with correct default values

✅ **A1: Email Ya Existe**
- Return 409 when email exists and `deleted_at IS NULL`
- Allow registration when email exists but `deleted_at NOT NULL`

✅ **A2: Datos Inválidos**
- Return 400 for invalid email format
- Return 400 for password < 8 characters
- Return 400 for empty firstName
- Return 400 for empty lastName
- Return 400 for missing required fields

✅ **Postcondiciones**
- User can login after successful registration

✅ **Edge Cases**
- Handle email with different casing
- Trim whitespace from email

---

## 🔧 Files Modified/Created

### Created:
- [`src/shared/utils/password.util.ts`](file:///home/igutisan/budget-project/app/src/shared/utils/password.util.ts) - Argon2 utility
- [`src/shared/config/jwt.config.ts`](file:///home/igutisan/budget-project/app/src/shared/config/jwt.config.ts) - JWT config
- [`src/tests/integration/user-registration.test.ts`](file:///home/igutisan/budget-project/app/src/tests/integration/user-registration.test.ts) - TDD tests

### Modified:
- [`src/modules/user/service.ts`](file:///home/igutisan/budget-project/app/src/modules/user/service.ts) - Argon2 hashing implemented
- [`src/modules/user/index.ts`](file:///home/igutisan/budget-project/app/src/modules/user/index.ts) - JWT tokens added

---

## 🧪 Running Tests

```bash
bun test src/tests/integration/user-registration.test.ts
```

---

## 📊 Dependencies Added

```json
{
  "argon2": "^0.44.0",
  "@elysiajs/jwt": "^1.4.0"
}
```

---

## 🚀 Next Steps

1. Run tests to verify implementation
2. Set up test database
3. Add authentication middleware
4. Implement email verification flow
5. Add password reset functionality
