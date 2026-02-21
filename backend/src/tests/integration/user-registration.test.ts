/**
 * UC-001: User Registration - Integration Tests
 * 
 * Uses the real Elysia app via app.handle().
 * Response shape: { success, status, message, data }
 * Error shape:    { error: { code, message } }
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { user } from '../../modules/user';
import { db } from '../../shared/db';
import { users } from '../../shared/db/schema';
import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';

describe('UC-001: User Registration', () => {
  let app: Elysia;

  beforeAll(() => {
    app = new Elysia().use(user);
  });

  beforeEach(async () => {
    await db.delete(users).where(eq(users.email, 'usuario@example.com'));
    await db.delete(users).where(eq(users.email, 'deleted@example.com'));
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, 'usuario@example.com'));
    await db.delete(users).where(eq(users.email, 'deleted@example.com'));
  });

  describe('Flujo Principal: Registro Exitoso', () => {
    it('should register a new user successfully with valid data', async () => {
      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const envelope = await response.json();
      const data = envelope.data;

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.email).toBe('usuario@example.com');
      expect(data.firstName).toBe('Juan');
      expect(data.lastName).toBe('Pérez');
      expect(data.isActive).toBe(true);
      expect(data.emailVerified).toBe(false);
      expect(data).not.toHaveProperty('password');
      expect(data).not.toHaveProperty('passwordHash');
    });

    it('should hash the password using Argon2', async () => {
      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const envelope = await response.json();
      const data = envelope.data;

      const userInDb = await db.query.users.findFirst({
        where: eq(users.id, data.id),
      });

      expect(userInDb?.passwordHash).toBeDefined();
      expect(userInDb?.passwordHash).not.toBe('SecurePass123!');
      expect(userInDb?.passwordHash).toMatch(/^\$argon2id?\$/);
    });

    it('should create user with correct default values', async () => {
      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const envelope = await response.json();
      const data = envelope.data;

      const userInDb = await db.query.users.findFirst({
        where: eq(users.id, data.id),
      });

      expect(userInDb?.isActive).toBe(true);
      expect(userInDb?.emailVerified).toBe(false);
      expect(userInDb?.deletedAt).toBeNull();
    });
  });

  describe('A1: Email Ya Existe', () => {
    it('should return 409 when email exists and is active', async () => {
      await db.insert(users).values({
        email: 'usuario@example.com',
        passwordHash: 'existing-hash',
        firstName: 'Existing',
        lastName: 'User',
      });

      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.status).toBe(409);
    });

    it('should allow registration when email exists but is deleted', async () => {
      await db.insert(users).values({
        email: 'deleted@example.com',
        passwordHash: 'deleted-hash',
        firstName: 'Deleted',
        lastName: 'User',
        deletedAt: new Date(),
      });

      const requestBody = {
        email: 'deleted@example.com',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const envelope = await response.json();
      const data = envelope.data;

      expect(response.status).toBe(201);
      expect(data.email).toBe('deleted@example.com');
    });
  });

  describe('A2: Datos Inválidos', () => {
    const invalidCases = [
      { label: 'invalid email format', body: { email: 'invalid-email', password: 'SecurePass123!', firstName: 'Juan', lastName: 'Pérez' } },
      { label: 'password less than 8 characters', body: { email: 'usuario@example.com', password: 'Short1!', firstName: 'Juan', lastName: 'Pérez' } },
      { label: 'empty firstName', body: { email: 'usuario@example.com', password: 'SecurePass123!', firstName: '', lastName: 'Pérez' } },
      { label: 'empty lastName', body: { email: 'usuario@example.com', password: 'SecurePass123!', firstName: 'Juan', lastName: '' } },
      { label: 'missing required fields', body: { email: 'usuario@example.com' } },
    ];

    for (const { label, body } of invalidCases) {
      it(`should return 422 when ${label}`, async () => {
        const response = await app.handle(
          new Request('http://localhost/users/register', {
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
    it('should allow user to login after successful registration', async () => {
      const registerBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerBody),
        })
      );

      const loginBody = { email: 'usuario@example.com', password: 'SecurePass123!' };
      const loginResponse = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginBody),
        })
      );

      expect(loginResponse.status).toBe(200);
      const loginEnvelope = await loginResponse.json();
      expect(loginEnvelope.data.user.email).toBe('usuario@example.com');
    });
  });
});
