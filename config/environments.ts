/**
 * Environment Configuration
 * Manages PROD and SANDBOX credentials with safety checks
 */

export interface EnvironmentConfig {
  supabase: {
    url: string;
    serviceRoleKey: string;
    anonKey: string;
  };
  openai: {
    apiKey: string;
  };
  vapi: {
    apiKey: string;
    secretKey: string;
  };
  slack?: {
    webhookUrl: string;
  };
  isProduction: boolean;
}

/**
 * Get environment configuration based on NODE_ENV
 * Throws error if attempting to use production in development
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // Safety check: Prevent accidental production writes in development
  if (!isProduction && process.env.FORCE_PRODUCTION === undefined) {
    // In development, default to sandbox unless explicitly overridden
    console.log('⚠️  Running in SANDBOX mode. Set NODE_ENV=production for PROD.');
  }

  // Production configuration
  if (isProduction) {
    return {
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
      },
      vapi: {
        apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY || '',
        secretKey: process.env.VAPI_SECRET_KEY || '',
      },
      slack: process.env.SLACK_WEBHOOK_URL
        ? { webhookUrl: process.env.SLACK_WEBHOOK_URL }
        : undefined,
      isProduction: true,
    };
  }

  // Sandbox/Development configuration
  // Use SANDBOX_ prefixed env vars if available, otherwise fall back to regular vars
  // Also support SUPABASE_SANDBOX_URL for cloud deployments
  return {
    supabase: {
      url: process.env.SUPABASE_SANDBOX_URL || process.env.SANDBOX_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceRoleKey: process.env.SANDBOX_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      anonKey: process.env.SANDBOX_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    openai: {
      apiKey: process.env.SANDBOX_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
    },
    vapi: {
      apiKey: process.env.SANDBOX_VAPI_API_KEY || process.env.NEXT_PUBLIC_VAPI_API_KEY || '',
      secretKey: process.env.SANDBOX_VAPI_SECRET_KEY || process.env.VAPI_SECRET_KEY || '',
    },
    slack: process.env.SLACK_WEBHOOK_URL
      ? { webhookUrl: process.env.SLACK_WEBHOOK_URL }
      : undefined,
    isProduction: false,
  };
}

/**
 * Validate that required environment variables are present
 */
export function validateEnvironmentConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];

  if (!config.supabase.url) {
    errors.push('Missing Supabase URL');
  }
  if (!config.supabase.serviceRoleKey) {
    errors.push('Missing Supabase Service Role Key');
  }
  if (!config.openai.apiKey) {
    errors.push('Missing OpenAI API Key');
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}

/**
 * Safety check: Ensure we're not accidentally writing to production
 */
export function assertSandboxMode(config: EnvironmentConfig): void {
  if (config.isProduction) {
    throw new Error(
      '⚠️  SAFETY CHECK FAILED: Attempting to run sandbox operation in PRODUCTION mode.\n' +
        'Set NODE_ENV=development or use SANDBOX_ prefixed environment variables.'
    );
  }
}
