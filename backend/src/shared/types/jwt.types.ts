/**
 * JWT Types
 *
 * Shared type definitions for the Elysia JWT plugin context.
 * Lives here so both the user and token modules can import it
 * without creating circular dependencies.
 */

/**
 * Represents the JWT context object provided by @elysiajs/jwt.
 *
 * Elysia's `jwt` plugin decorates the request context with an
 * object that exposes `sign` and `verify`.  This interface
 * mirrors that shape so our services can accept it as a
 * parameter without depending on the Elysia framework directly.
 */
export interface JwtContext {
  sign: (payload: Record<string, string | number>) => Promise<string>;
  verify: (token?: string) => Promise<false | Record<string, unknown>>;
}
