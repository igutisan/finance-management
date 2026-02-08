# UC-002: User Login - TDD Implementation

## 📋 Use Case Summary

**Actor:** Usuario registrado  
**Endpoint:** `POST /users/login`

### Input Data
```json
{
  "email": "usuario@example.com",
  "password": "SecurePass123!"
}
```

### Response Data
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "isActive": true,
    "emailVerified": false
  }
}
```

---

## ✅ Implementation Complete

### 1. **Dual Token Strategy**
- ✅ **Access Token**: Expires in 1 hour (3600 seconds)
- ✅ **Refresh Token**: Expires in 7 days (604800 seconds)
- ✅ Both tokens signed with JWT
- ✅ Tokens include user info and type

**Token Payload:**
```typescript
{
  userId: string,
  email: string,
  type: 'access' | 'refresh'
}
```

### 2. **Password Verification**
- ✅ Uses Argon2 to verify password
- ✅ Returns 401 for invalid credentials (same error for wrong password or non-existent user)
- ✅ Checks `deleted_at IS NULL` before allowing login

### 3. **Test Suite Created**
File: [`src/tests/integration/user-login.test.ts`](file:///home/igutisan/budget-project/app/src/tests/integration/user-login.test.ts)

**Test Coverage:**

✅ **Flujo Principal**
- Login successfully with valid credentials
- Return valid JWT tokens (access + refresh)
- Verify password using Argon2

✅ **A1: Email No Existe**
- Return 401 when email doesn't exist

✅ **A2: Contraseña Incorrecta**
- Return 401 when password is incorrect

✅ **A3: Usuario Eliminado**
- Return 401 when user is deleted (`deleted_at NOT NULL`)

✅ **Validación de Datos**
- Return 400 for invalid email format
- Return 400 for missing password
- Return 400 for missing email

✅ **Edge Cases**
- Handle email with different casing
- Trim whitespace from email

✅ **Postcondiciones**
- Tokens are valid JWT format
- Can be used for authentication

---

## 🔧 Files Modified/Created

### Created:
- [`src/tests/integration/user-login.test.ts`](file:///home/igutisan/budget-project/app/src/tests/integration/user-login.test.ts) - TDD tests

### Modified:
- [`src/shared/config/jwt.config.ts`](file:///home/igutisan/budget-project/app/src/shared/config/jwt.config.ts) - Dual token config
- [`src/modules/user/index.ts`](file:///home/igutisan/budget-project/app/src/modules/user/index.ts) - Access & refresh tokens

---

## 🧪 Running Tests

```bash
bun test src/tests/integration/user-login.test.ts
```

---

## 🔑 JWT Configuration

```typescript
{
  accessToken: {
    expiresIn: 3600  // 1 hour
  },
  refreshToken: {
    expiresIn: 604800  // 7 days
  }
}
```

---

## 🎯 Security Features

1. **Password Hashing**: Argon2id with secure parameters
2. **Generic Error Messages**: Same error for wrong password/email (prevents enumeration)
3. **Soft Delete Check**: Deleted users cannot login
4. **Token Types**: Separate access and refresh tokens
5. **Short-Lived Access Tokens**: 1 hour expiration reduces risk

---

## 📊 Test Results

- **13 test cases** covering all scenarios
- **100% flow coverage** (main + alternates)
- **Edge cases** handled
