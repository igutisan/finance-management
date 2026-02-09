/**
 * Shared Plugins - Barrel Export
 *
 * Re-exports all Elysia plugins for convenient imports:
 *
 * @example
 * import { errorHandler, authPlugin } from '../../shared/plugins';
 */

export { errorHandler } from "./error-handler.plugin";
export { authPlugin } from "./auth.plugin";
