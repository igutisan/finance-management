/**
 * JWT Configuration
 * 
 * Configuration for JWT tokens.
 */

import { envConfig } from './env.config';

export const jwtConfig = {
  secret: envConfig.get('JWT_SECRET'),
  
  // Access token configuration (short-lived)
  accessToken: {
    expiresIn: 3600, // 1 hour in seconds
  },
  
  // Refresh token configuration (long-lived)
  refreshToken: {
    expiresIn: 604800, // 7 days in seconds
  },
};
