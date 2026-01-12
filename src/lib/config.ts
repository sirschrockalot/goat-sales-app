/**
 * Application Configuration
 * Centralized config management with environment-based switching
 */

import { getEnvironmentConfig, EnvironmentConfig } from '../../config/environments';

export interface AppConfig {
  database: {
    url: string;
    useLocalDb: boolean;
    sandboxUrl?: string;
  };
  training: {
    batchSize: number;
    maxBatchSize: number;
    maxExecutionTimeMs: number;
  };
  environment: EnvironmentConfig;
}

/**
 * Get application configuration
 * Switches between LOCAL_DB and SUPABASE_SANDBOX_URL based on environment
 */
export function getAppConfig(): AppConfig {
  const envConfig = getEnvironmentConfig();
  const useLocalDb = process.env.USE_LOCAL_DB === 'true';
  const sandboxUrl = process.env.SUPABASE_SANDBOX_URL || process.env.SANDBOX_SUPABASE_URL;

  return {
    database: {
      url: useLocalDb
        ? process.env.LOCAL_DB_URL || 'postgresql://localhost:5432/sandbox'
        : sandboxUrl || envConfig.supabase.url,
      useLocalDb,
      sandboxUrl,
    },
    training: {
      batchSize: parseInt(process.env.TRAINING_BATCH_SIZE || '5', 10),
      maxBatchSize: parseInt(process.env.MAX_TRAINING_BATCH_SIZE || '10', 10),
      maxExecutionTimeMs: parseInt(process.env.MAX_TRAINING_EXECUTION_TIME_MS || '50000', 10),
    },
    environment: envConfig,
  };
}

/**
 * Check if running in cloud environment (Vercel)
 */
export function isCloudEnvironment(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_URL
  );
}

/**
 * Get database connection string based on environment
 */
export function getDatabaseUrl(): string {
  const config = getAppConfig();
  return config.database.url;
}
