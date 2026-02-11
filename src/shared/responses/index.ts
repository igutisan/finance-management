/**
 * Shared Responses - Barrel Export
 *
 * Re-exports everything from the responses module for convenient imports:
 *
 * @example
 * import { ApiError, ErrorCode, ok, created, successSchema, errorSchema } from '../../shared/responses';
 */

export { ApiError } from "./api-error";
export { ErrorCode, ErrorDefaults } from "./error-codes";
export {
  ok,
  created,
  okPaginated,
  successSchema,
  paginatedSuccessSchema,
  errorSchema,
  validationErrorSchema,
  type SuccessEnvelope,
  type PaginatedSuccessEnvelope,
  type ErrorEnvelope,
} from "./api-response";
