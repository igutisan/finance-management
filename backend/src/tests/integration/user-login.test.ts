/**
 * UC-002: User Login - Integration Tests
 * 
 * Response shape: { success, status, message, data }
 * Error shape:    { error: { code, message } }
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { user } from '../../modules/user';
import { db } from '../../shared/db';
import { users } from '../../shared/db/schema';
import { eq } from 'drizzle-orm';
import { PasswordUtil } from '../../shared/utils/password.util';

describe('UC-002: User Login', () => {
  let app: Elysia;
  let testUserId: string;

  beforeAll(async () => {
    app = new Elysia().use(user);

    const passwordHash = await PasswordUtil.hash('SecurePass123!');
    const result = await db.insert(users).values({
      email: 'login-test@example.com',
      passwordHash,
      firstName: 'Juan',
      lastName: 'Pérez',
    }).returning();

    testUserId = result[0].id;
  });

  beforeEach(async () => {
    await db.update(users)
      .set({ deletedAt: null, isActive: true })
      .where(eq(users.id, testUserId));
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, 'login-test@example.com'));
  });

  describe('Flujo Principal: Login Exitoso', () => {
    it('should login successfully with valid credentials', async () => {
      const requestBody = { email: 'login-test@example.com', password: 'SecurePass123!' };

      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const envelope = await response.json();
      const data = envelope.data;

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('access_token');
      expect(data).toHaveProperty('refresh_token');
      expect(data).toHaveProperty('expires_in');
      expect(data.user.email).toBe('login-test@example.com');
      expect(data.user).not.toHaveProperty('passwordHash');
    });

    it('should return valid JWT tokens', async () => {
      const requestBody = { email: 'login-test@example.com', password: 'SecurePass123!' };

      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const envelope = await response.json();
      const data = envelope.data;

      // access_token is a JWT, refresh_token is an opaque token
      expect(data.access_token).toMatch(/^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/);
      expect(data.access_token).not.toBe(data.refresh_token);
    });
  });

  describe('A1: Email No Existe', () => {
    it('should return 401 when email does not exist', async () => {
      const requestBody = { email: 'noexiste@example.com', password: 'SecurePass123!' };

      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('A2: Contraseña Incorrecta', () => {
    it('should return 401 when password is incorrect', async () => {
      const requestBody = { email: 'login-test@example.com', password: 'WrongPassword123!' };

      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('A3: Usuario Eliminado', () => {
    it('should return 401 when user is deleted', async () => {
      await db.update(users)
        .set({ deletedAt: new Date() })
        .where(eq(users.id, testUserId));

      const requestBody = { email: 'login-test@example.com', password: 'SecurePass123!' };

      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Validación de Datos', () => {
    const invalidCases = [
      { label: 'invalid email format', body: { email: 'invalid-email', password: 'SecurePass123!' } },
      { label: 'password missing', body: { email: 'login-test@example.com' } },
      { label: 'email missing', body: { password: 'SecurePass123!' } },
    ];

    for (const { label, body } of invalidCases) {
      it(`should return 422 when ${label}`, async () => {
        const response = await app.handle(
          new Request('http://localhost/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        );
        expect(response.status).toBe(422);
      });
    }
  });

  describe('Postcondiciones', () => {
    it('should return tokens that can be used for authentication', async () => {
      const loginBody = { email: 'login-test@example.com', password: 'SecurePass123!' };

      const response = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginBody),
        })
      );

      expect(response.status).toBe(200);
      const envelope = await response.json();
      const data = envelope.data;

      expect(data.access_token).toBeDefined();
      expect(data.refresh_token).toBeDefined();
      expect(typeof data.access_token).toBe('string');
      expect(data.expires_in).toBe(3600);
    });
  });
});
