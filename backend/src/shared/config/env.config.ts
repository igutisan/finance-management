/**
 * Environment Configuration (Singleton)
 * 
 * Centralized environment variable management.
 * Loads and validates env vars on first access.
 */

interface EnvConfig {
  // Database
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;

  // Application
  APP_PORT: number;
  APP_ENV: 'development' | 'production' | 'test';
  
  // Security
  JWT_SECRET: string;
}

class EnvironmentConfiguration {
  private static instance: EnvironmentConfiguration;
  private config: EnvConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EnvironmentConfiguration {
    if (!EnvironmentConfiguration.instance) {
      EnvironmentConfiguration.instance = new EnvironmentConfiguration();
    }
    return EnvironmentConfiguration.instance;
  }

  /**
   * Load and validate environment variables
   */
  private loadConfig(): EnvConfig {
    return {
      // Database
      DATABASE_HOST: process.env.DATABASE_HOST ?? 'localhost',
      DATABASE_PORT: parseInt(process.env.DATABASE_PORT ?? '5432'),
      DATABASE_NAME: process.env.DATABASE_NAME ?? 'budget_db',
      DATABASE_USER: process.env.DATABASE_USER ?? 'postgres',
      DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ?? '',

      // Application
      APP_PORT: parseInt(process.env.APP_PORT ?? '3000'),
      APP_ENV: (process.env.APP_ENV as any) ?? 'development',

      // Security
      JWT_SECRET: process.env.JWT_SECRET ?? 'change-me-in-production',
    };
  }

  /**
   * Get configuration
   */
  public getConfig(): EnvConfig {
    return this.config;
  }

  /**
   * Get specific config value
   */
  public get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }
}

// Export singleton instance
export const envConfig = EnvironmentConfiguration.getInstance();
export type { EnvConfig };
