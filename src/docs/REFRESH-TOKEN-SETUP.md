# Refresh Token Infrastructure

## 📋 Setup Completado

### Base de Datos
- ✅ Tabla `refresh_tokens` con schema Drizzle
- ✅ Índices para performance (token_hash, user_id, expires_at)
- ✅ Foreign key a `users` con CASCADE

### Utilidades
- ✅ `TokenUtil.generateRefreshToken()` - Genera UUID v4
- ✅ `TokenUtil.hashToken()` - Hash SHA-256
- ✅ `TokenUtil.isValidUUID()` - Validación de formato

### Repository
- ✅ `create()` - Almacenar token
- ✅ `findValidByHash()` - Buscar token válido
- ✅ `revokeToken()` - Revocar token individual
- ✅ `revokeAllUserTokens()` - Revocar todos los tokens de un usuario
- ✅ `cleanupExpired()` - Limpieza de tokens expirados
- ✅ `findActiveByUserId()` - Listar tokens activos

### Tests
- ✅ Test suite completo para `RefreshTokenRepository`
- ✅ 100% cobertura de métodos

---

## 🔧 Migración de Base de Datos

```bash
# Generar migración
bun drizzle-kit generate:pg

# Aplicar migración
bun drizzle-kit push:pg
```

---

## 💡 Implementación de Servicios (Para ti)

### 1. Actualizar Login (`UserService.login()`)

```typescript
// En UserService.login()
import { RefreshTokenRepository } from '../refresh-token/repository';
import { TokenUtil } from '../../shared/utils/token.util';

// Después de verificar credenciales...
const refreshTokenRepo = new RefreshTokenRepository(db);

// Generar token UUID
const refreshToken = TokenUtil.generateRefreshToken();
const tokenHash = TokenUtil.hashToken(refreshToken);

// Calcular expiración
const expiresAt = new Date();
expiresAt.setSeconds(expiresAt.getSeconds() + jwtConfig.refreshToken.expiresIn);

// Guardar en BD
await refreshTokenRepo.create({
  userId: user.id,
  tokenHash,
  expiresAt,
  ipAddress: context.request.headers.get('x-forwarded-for') || 'unknown',
  userAgent: context.request.headers.get('user-agent') || 'unknown',
});

// Retornar token plano al cliente
return {
  access_token: accessToken,
  refresh_token: refreshToken, // UUID, no JWT
  expires_in: 3600,
  user: {...}
};
```

### 2. Crear Endpoint Refresh

```typescript
// POST /users/refresh
.post('/refresh', async ({ body, jwt }) => {
  const { refresh_token } = body;
  
  // 1. Validar formato UUID
  if (!TokenUtil.isValidUUID(refresh_token)) {
    throw status(401, 'Invalid token');
  }
  
  // 2. Hash y buscar en BD
  const tokenHash = TokenUtil.hashToken(refresh_token);
  const tokenData = await refreshTokenRepo.findValidByHash(tokenHash);
  
  if (!tokenData) {
    throw status(401, 'Invalid or expired token');
  }
  
  // 3. Verificar usuario activo
  const user = await userRepo.findById(tokenData.userId);
  if (!user || user.deletedAt) {
    throw status(401, 'Invalid user');
  }
  
  // 4. Generar nuevo access token
  const access_token = await jwt.sign({
    userId: user.id,
    email: user.email,
    type: 'access',
  }, {
    expiresIn: jwtConfig.accessToken.expiresIn,
  });
  
  // 5. OPCIONAL: Rotar refresh token
  // await refreshTokenRepo.revokeToken(tokenHash);
  // const newRefreshToken = ... (generar nuevo)
  
  return {
    access_token,
    expires_in: 3600,
  };
});
```

### 3. Crear Endpoint Logout

```typescript
// POST /users/logout
.post('/logout', async ({ body }) => {
  const { refresh_token } = body;
  
  if (!TokenUtil.isValidUUID(refresh_token)) {
    return { message: 'Invalid token' };
  }
  
  const tokenHash = TokenUtil.hashToken(refresh_token);
  await refreshTokenRepo.revokeToken(tokenHash);
  
  return { message: 'Logged out successfully' };
});
```

### 4. Crear Endpoint Logout All

```typescript
// POST /users/logout-all
.post('/logout-all', async ({ jwt, headers }) => {
  // Extraer userId del access token
  const authorization = headers.authorization;
  const token = authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw status(401, 'Unauthorized');
  }
  
  const payload = await jwt.verify(token);
  const userId = payload.userId;
  
  // Revocar todos los tokens del usuario
  const count = await refreshTokenRepo.revokeAllUserTokens(userId);
  
  return {
    message: 'Logged out from all devices',
    revoked_count: count,
  };
});
```

---

## 📝 Notas Importantes

1. **Token Format**: El refresh token ahora es un UUID, no un JWT
2. **Storage**: Se almacena el hash SHA-256, no el token plano
3. **Revocation**: Ahora es posible revocar tokens (logout funciona realmente)
4. **Audit**: Se guarda IP y user agent para auditoría
5. **Cleanup**: Ejecutar `refreshTokenRepo.cleanupExpired()` periódicamente

---

## 🧪 Testing

```bash
# Test del repository
bun test src/tests/integration/refresh-token-repository.test.ts
```
