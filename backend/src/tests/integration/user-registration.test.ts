/**
 * UC-001: User Registration - Integration Tests
 * 
 * Test suite following TDD for user registration use case.
 * Tests all scenarios: happy path, email conflicts, validation errors.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { user } from '../../../modules/user';
import { db } from '../../../shared/db';
import { users } from '../../../shared/db/schema';
import { eq } from 'drizzle-orm';

describe('UC-001: User Registration', () => {
  let app: Elysia;

  beforeAll(() => {
    // Initialize Elysia app with user module
    app = new Elysia().use(user);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.delete(users).where(eq(users.email, 'usuario@example.com'));
    await db.delete(users).where(eq(users.email, 'deleted@example.com'));
  });

  afterAll(async () => {
    // Final cleanup
    await db.delete(users).where(eq(users.email, 'usuario@example.com'));
    await db.delete(users).where(eq(users.email, 'deleted@example.com'));
  });

  describe('Flujo Principal: Registro Exitoso', () => {
    it('should register a new user successfully with valid data', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data.email).toBe('usuario@example.com');
      expect(data.firstName).toBe('Juan');
      expect(data.lastName).toBe('Pérez');
      expect(data.isActive).toBe(true);
      expect(data.emailVerified).toBe(false);
      expect(data).toHaveProperty('createdAt');
      expect(data).toHaveProperty('updatedAt');
      expect(data).not.toHaveProperty('password');
      expect(data).not.toHaveProperty('passwordHash');
    });

    it('should hash the password using Argon2', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert - Verify password is hashed in database
      const data = await response.json();
      const userInDb = await db.query.users.findFirst({
        where: eq(users.id, data.id),
      });

      expect(userInDb?.passwordHash).toBeDefined();
      expect(userInDb?.passwordHash).not.toBe('SecurePass123!');
      expect(userInDb?.passwordHash).toMatch(/^\$argon2id?\$/); // Argon2 hash format
    });

    it('should create user with correct default values', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert
      const data = await response.json();
      const userInDb = await db.query.users.findFirst({
        where: eq(users.id, data.id),
      });

      expect(userInDb?.isActive).toBe(true);
      expect(userInDb?.emailVerified).toBe(false);
      expect(userInDb?.deletedAt).toBeNull();
    });
  });

  describe('A1: Email Ya Existe', () => {
    it('should return 409 when email exists and is active (deleted_at IS NULL)', async () => {
      // Arrange - Create existing user
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

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Email already exists');
    });

    it('should allow registration when email exists but is deleted (deleted_at NOT NULL)', async () => {
      // Arrange - Create deleted user
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

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.email).toBe('deleted@example.com');
      expect(data.firstName).toBe('Juan');
      expect(data.lastName).toBe('Pérez');
    });
  });

  describe('A2: Datos Inválidos', () => {
    it('should return 400 when email format is invalid', async () => {
      // Arrange
      const requestBody = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when password is less than 8 characters', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
        password: 'Short1!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when firstName is empty', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
        firstName: '',
        lastName: 'Pérez',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when lastName is empty', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: '',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const requestBody = {
        email: 'usuario@example.com',
        // Missing password, firstName, lastName
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Postcondiciones', () => {
    it('should allow user to login after successful registration', async () => {
      // Arrange - Register user
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

      // Act - Try to login
      const loginBody = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
      };

      const loginResponse = await app.handle(
        new Request('http://localhost/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginBody),
        })
      );

      // Assert
      expect(loginResponse.status).toBe(200);
      const loginData = await loginResponse.json();
      expect(loginData.email).toBe('usuario@example.com');
    });
  });

  describe('Edge Cases', () => {
    it('should handle email with different casing', async () => {
      // Arrange - Register with lowercase
      const requestBody1 = {
        email: 'usuario@example.com',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody1),
        })
      );

      // Act - Try to register with uppercase
      const requestBody2 = {
        email: 'USUARIO@EXAMPLE.COM',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody2),
        })
      );

      // Assert - Should be rejected (email exists)
      expect(response.status).toBe(409);
    });

    it('should trim whitespace from email', async () => {
      // Arrange
      const requestBody = {
        email: '  usuario@example.com  ',
        password: 'SecurePass123!',
        firstName: 'Juan',
        lastName: 'Pérez',
      };

      // Act
      const response = await app.handle(
        new Request('http://localhost/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );

      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.email).toBe('usuario@example.com');
    });
  });
});
