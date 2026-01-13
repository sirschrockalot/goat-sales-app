/**
 * Application Configuration
 * Centralized config management with environment-based switching
 * Priority: Doppler (process.env) > Docker/Supabase defaults
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
 * Get environment variable with priority: Doppler > Docker > Default
 * Doppler injects secrets into process.env at runtime
 */
function getEnvVar(key: string, defaultValue: string): string {
  // Priority 1: Doppler-injected env vars (process.env)
  if (process.env[key]) {
    return process.env[key];
  }
  
  // Priority 2: Docker/Supabase defaults (for local development)
  // Priority 3: Fallback to provided default
  return defaultValue;
}

/**
 * Get application configuration
 * Priority: Doppler (process.env) > Docker/Supabase defaults
 */
export function getAppConfig(): AppConfig {
  const envConfig = getEnvironmentConfig();
  
  // Check if using local Docker database
  const useLocalDb = getEnvVar('USE_LOCAL_DB', 'false') === 'true';
  
  // Database URL priority: Doppler > Docker > Supabase
  const localDbUrl = getEnvVar(
    'LOCAL_DB_URL',
    'postgresql://postgres:postgres@localhost:5432/sandbox' // Docker default
  );
  
  const sandboxUrl = getEnvVar(
    'SUPABASE_SANDBOX_URL',
    getEnvVar('SANDBOX_SUPABASE_URL', envConfig.supabase.url)
  );

  return {
    database: {
      url: useLocalDb ? localDbUrl : sandboxUrl,
      useLocalDb,
      sandboxUrl: sandboxUrl || undefined,
    },
    training: {
      batchSize: parseInt(getEnvVar('TRAINING_BATCH_SIZE', '5'), 10),
      maxBatchSize: parseInt(getEnvVar('MAX_TRAINING_BATCH_SIZE', '10'), 10),
      maxExecutionTimeMs: parseInt(getEnvVar('MAX_TRAINING_EXECUTION_TIME_MS', '50000'), 10),
    },
    environment: envConfig,
  };
}

/**
 * Check if running in cloud environment (Heroku)
 */
export function isCloudEnvironment(): boolean {
  return !!(
    process.env.DYNO || // Heroku dyno indicator
    process.env.HEROKU_APP_NAME ||
    process.env.NODE_ENV === 'production'
  );
}

/**
 * Get database connection string based on environment
 */
export function getDatabaseUrl(): string {
  const config = getAppConfig();
  return config.database.url;
}
