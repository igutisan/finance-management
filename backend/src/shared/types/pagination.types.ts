/**
 * Pagination Types & Schemas
 *
 * Shared interfaces and Elysia validation schemas for
 * offset-based pagination across all modules.
 */

import { t } from "elysia";

// ──────────────────────────────────────────────
//  TypeScript interfaces
// ──────────────────────────────────────────────

export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

// ──────────────────────────────────────────────
//  Elysia schemas (for validation & OpenAPI)
// ──────────────────────────────────────────────

export const paginationQuerySchema = {
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
};

export const paginationMetaSchema = t.Object({
  page: t.Number(),
  limit: t.Number(),
  total: t.Number(),
  totalPages: t.Number(),
});

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

/**
 * Build pagination meta from total count and query params.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
