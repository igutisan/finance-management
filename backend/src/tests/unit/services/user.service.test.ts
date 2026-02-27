/**
 * User Service Unit Tests
 * 
 * Tests business logic in isolation with mocked dependencies.
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { UserService } from "../../../modules/user/service";
import type { UserRepository } from "../../../modules/user/repository";
import type { RefreshTokenRepository } from "../../../modules/token/repository";

describe("UserService", () => {
  let mockUserRepo: any;
  let mockTokenRepo: any;
  let mockJwt: any;

  beforeEach(() => {
    mockUserRepo = {
      emailExists: mock(() => Promise.resolve(false)),
      create: mock((data: any) =>
        Promise.resolve({
          id: "user-1",
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          botPin: data.botPin || null,
          isActive: true,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      findByEmail: mock(() =>
        Promise.resolve(null)
      ),
      findById: mock(() =>
        Promise.resolve(null)
      ),
      update: mock((id: string, data: any) =>
        Promise.resolve({
          id,
          email: "test@example.com",
          passwordHash: data.passwordHash || "hashed_password",
          firstName: data.firstName || "John",
          lastName: data.lastName || "Doe",
          phone: data.phone || "+1234567890",
          botPin: data.botPin || null,
          isActive: true,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      softDelete: mock(() => Promise.resolve(true)),
      findByEmailIncludeDeleted: mock(() => Promise.resolve(null)),
      restore: mock((id: string, data: any) =>
        Promise.resolve({
          id,
          email: "test@example.com",
          passwordHash: data.passwordHash || "hashed_password",
          firstName: data.firstName || "John",
          lastName: data.lastName || "Doe",
          phone: data.phone || "+1234567890",
          botPin: data.botPin || null,
          isActive: true,
          emailVerified: false,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
    } as unknown as UserRepository;

    mockTokenRepo = {
      create: mock(() => Promise.resolve({ id: "token-1" })),
    } as unknown as RefreshTokenRepository;

    mockJwt = {
      sign: mock(() => Promise.resolve("mock.jwt.token")),
    };
  });

  describe("register", () => {
    test("should create a new user successfully", async () => {
      const dto = {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        phone: "+123456789",
      };
      const result = await UserService.register(dto, mockUserRepo);

      expect(result.email).toBe(dto.email);
      expect(result.phone).toBe(dto.phone);
      expect(mockUserRepo.create).toHaveBeenCalledTimes(1);
    });

    test("should throw error if email already exists", async () => {
      mockUserRepo.emailExists = mock(() => Promise.resolve(true));

      const dto = {
        email: "deleted@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
        phone: "+5555555",
      };
      expect(UserService.register(dto, mockUserRepo)).rejects.toThrow();
    });

    test("should hash password before storing", async () => {
      const dto = {
        email: "test@example.com",
        password: "plaintext",
        firstName: "John",
        lastName: "Doe",
        phone: "+999999999",
      };

      await UserService.register(dto, mockUserRepo);
      const createCall = (mockUserRepo.create as any).mock.calls[0][0];
      expect(createCall.passwordHash).not.toBe("plaintext");
    });
  });

  describe("login", () => {
    test("should return user on valid credentials", async () => {
      mockUserRepo.findByEmail = mock(() =>
        Promise.resolve({
          id: "user-1",
          email: "test@example.com",
          passwordHash: "$argon2id$v=19$m=4096,t=3,p=1$SALT$HASH", // Mock hash
          firstName: "John",
          lastName: "Doe",
          isActive: true,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
      
      expect(
        UserService.login(
          { email: "test@example.com", password: "password123" },
          mockUserRepo,
          mockTokenRepo,
          mockJwt
        )
      ).rejects.toThrow();
    });

    test("should return error on invalid password", async () => {
      expect(
        UserService.login(
          { email: "test@example.com", password: "wrong" },
          mockUserRepo,
          mockTokenRepo,
          mockJwt
        )
      ).rejects.toThrow();
    });

    test("should return error on non-existent email", async () => {
      expect(
        UserService.login(
          { email: "missing@example.com", password: "password123" },
          mockUserRepo,
          mockTokenRepo,
          mockJwt
        )
      ).rejects.toThrow();
    });
  });
});
