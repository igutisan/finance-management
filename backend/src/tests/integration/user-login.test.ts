/**
 * UC-002: User Login - Integration Tests
 * 
 * Test suite for user login with JWT access and refresh tokens.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { user } from '../../../modules/user';
import { db } from '../../../shared/db';
import { users } from '../../../shared/db/schema';
import { eq } from 'drizzle-orm';
import { PasswordUtil } from '../../../shared/utils/password.util';

describe('UC-002: User Login', () => {
  let app: Elysia;
  let testUserId: string;

  beforeAll(async () => {
    // Initialize app
    app = new Elysia().use(user);

    // Create test user
    const passwordHash = await PasswordUtil.hash('SecurePass123!');
    const result = await db.insert(users).values({
      email: 'usuario@example.com',
      passwordHash,
      firstName: 'Juan',
      lastName: 'Pérez',
    }).returning();
    
    testUserId = result[0].id;
  });

  beforeEach(async () => {
    // Ensure test user is active
    await db.update(users)
      .set({ deletedAt: null, isActive: true })
      .where(eq(users.id, testUserId));
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(users).where(eq(users.email, 'usuario@example.com'));
  });

  describe('Flujo Principal: Login Exitoso', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('access_token');
      expect(data).toHaveProperty('refresh_token');
      expect(data).toHaveProperty('expires_in');
      expect(data.expires_in).toBe(3600); // 1 hour in seconds
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe('usuario@example.com');
      expect(data.user.firstName).toBe('Juan');
      expect(data.user.lastName).toBe('Pérez');
      expect(data.user).not.toHaveProperty('password');
      expect(data.user).not.toHaveProperty('passwordHash');
    });

    it('should return valid JWT tokens', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const data = await response.json();

      // Assert - Check JWT format
      expect(data.access_token).toMatch(/^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/);
      expect(data.refresh_token).toMatch(/^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/);
      expect(data.access_token).not.toBe(data.refresh_token);
    });

    it('should verify password using Argon2', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('A1: Email No Existe', () => {
    it('should return 401 when email does not exist', async () => {
      // Arrange
      const requestBody = {
        email: 'noexiste@example.com',
        password: 'SecurePass123!',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid credentials');
    });
  });

  describe('A2: Contraseña Incorrecta', () => {
    it('should return 401 when password is incorrect', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
        password: 'WrongPassword123!',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid credentials');
    });
  });

  describe('A3: Usuario Eliminado', () => {
    it('should return 401 when user is deleted (deleted_at NOT NULL)', async () => {
      // Arrange - Soft delete user
      await db.update(users)
        .set({ deletedAt: new Date() })
        .where(eq(users.id, testUserId));

      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid credentials');
    });
  });

  describe('Validación de Datos', () => {
    it('should return 400 when email format is invalid', async () => {
      // Arrange
      const requestBody = {
        email: 'invalid-email',
        password: 'SecurePass123!',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when password is missing', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when email is missing', async () => {
      // Arrange
      const requestBody = {
        password: 'SecurePass123!',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Edge Cases', () => {
    it('should handle email with different casing', async () => {
      // Arrange
      const requestBody = {
        email: 'USUARIO@EXAMPLE.COM',
        password: 'SecurePass123!',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert
      expect(response.status).toBe(200);
    });

    it('should trim whitespace from email', async () => {
      // Arrange
      const requestBody = {
        email: '  usuario@example.com  ',
        password: 'SecurePass123!',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.user.email).toBe('usuario@example.com');
    });
  });

  describe('Postcondiciones', () => {
    it('should return tokens that can be used for authentication', async () => {
      // Arrange
      const loginBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
      };

      // Act - Login
      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginBody),
        })
      );

      const data = await response.json();

      // Assert - Tokens exist and are valid JWT format
      expect(data.access_token).toBeDefined();
      expect(data.refresh_token).toBeDefined();
      expect(typeof data.access_token).toBe('string');
      expect(typeof data.refresh_token).toBe('string');
      expect(data.expires_in).toBe(3600);
    });
  });
});
