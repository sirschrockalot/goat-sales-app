/**
 * Environment Manager
 * Toggles between LOCAL, SANDBOX, and PROD environments
 * Links Production to "Goat Sales App-Prod" Supabase project
 */
import { createClient } from '@supabase/supabase-js';
import logger from './logger';
/**
 * Get current environment from process.env
 * Priority: EXPLICIT_ENV > NODE_ENV > default to 'sandbox'
 */
function getCurrentEnvironment() {
    // Explicit environment override (highest priority)
    const explicitEnv = process.env.EXPLICIT_ENV?.toLowerCase();
    if (explicitEnv && ['local', 'sandbox', 'prod'].includes(explicitEnv)) {
        return explicitEnv;
    }
    // NODE_ENV based detection
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    if (nodeEnv === 'production') {
        return 'prod';
    }
    // USE_LOCAL_DB flag for local development
    if (process.env.USE_LOCAL_DB === 'true') {
        return 'local';
    }
    // Default to sandbox for safety
    return 'sandbox';
}
/**
 * Get environment configuration
 * Links Production to "Goat Sales App-Prod" Supabase project
 */
export function getEnvironmentConfig() {
    const env = getCurrentEnvironment();
    const isProduction = env === 'prod';
    const isSandbox = env === 'sandbox';
    const isLocal = env === 'local';
    logger.info('Environment detected', { environment: env });
    // ============================================================================
    // PRODUCTION CONFIGURATION
    // ============================================================================
    if (isProduction) {
        return {
            environment: 'prod',
            supabase: {
                url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.PROD_SUPABASE_URL || '',
                serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PROD_SUPABASE_SERVICE_ROLE_KEY || '',
                anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.PROD_SUPABASE_ANON_KEY || '',
                projectName: 'Goat Sales App-Prod',
            },
            openai: {
                apiKey: process.env.OPENAI_API_KEY || '',
                closerModel: 'gpt-4o', // Full GPT-4o for Production Closer
                sellerModel: 'gpt-4o-mini', // Mini for cost optimization
            },
            vapi: {
                apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY || '',
                secretKey: process.env.VAPI_SECRET_KEY || '',
                model: 'eleven_turbo_v2_5', // ElevenLabs Turbo v2.5
                sttProvider: 'deepgram',
                sttModel: 'nova-2-general', // Deepgram Nova-2 General
            },
            elevenlabs: {
                apiKey: process.env.ELEVEN_LABS_API_KEY || '',
                model: 'eleven_turbo_v2_5',
            },
            deepgram: {
                apiKey: process.env.DEEPGRAM_API_KEY || '',
                model: 'nova-2-general',
            },
            isProduction: true,
            isSandbox: false,
            isLocal: false,
        };
    }
    // ============================================================================
    // SANDBOX CONFIGURATION
    // ============================================================================
    if (isSandbox) {
        return {
            environment: 'sandbox',
            supabase: {
                url: process.env.SUPABASE_SANDBOX_URL || process.env.SANDBOX_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
                serviceRoleKey: process.env.SANDBOX_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
                anonKey: process.env.SANDBOX_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                projectName: 'Goat Sales App-Sandbox',
            },
            openai: {
                apiKey: process.env.SANDBOX_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
                closerModel: 'gpt-4o', // GPT-4o for Closer in Sandbox
                sellerModel: 'gpt-4o-mini', // GPT-4o-mini for Sellers/Referees
            },
            vapi: {
                apiKey: process.env.SANDBOX_VAPI_API_KEY || process.env.NEXT_PUBLIC_VAPI_API_KEY || '',
                secretKey: process.env.SANDBOX_VAPI_SECRET_KEY || process.env.VAPI_SECRET_KEY || '',
                model: 'eleven_turbo_v2_5',
                sttProvider: 'deepgram',
                sttModel: 'nova-2-general',
            },
            elevenlabs: {
                apiKey: process.env.ELEVEN_LABS_API_KEY || '',
                model: 'eleven_turbo_v2_5',
            },
            deepgram: {
                apiKey: process.env.DEEPGRAM_API_KEY || '',
                model: 'nova-2-general',
            },
            isProduction: false,
            isSandbox: true,
            isLocal: false,
        };
    }
    // ============================================================================
    // LOCAL CONFIGURATION
    // ============================================================================
    return {
        environment: 'local',
        supabase: {
            url: process.env.LOCAL_SUPABASE_URL || 'http://localhost:54321',
            serviceRoleKey: process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
            anonKey: process.env.LOCAL_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
            projectName: 'Local Supabase',
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY || '',
            closerModel: 'gpt-4o',
            sellerModel: 'gpt-4o-mini',
        },
        vapi: {
            apiKey: process.env.NEXT_PUBLIC_VAPI_API_KEY || '',
            secretKey: process.env.VAPI_SECRET_KEY || '',
            model: 'eleven_turbo_v2_5',
            sttProvider: 'deepgram',
            sttModel: 'nova-2-general',
        },
        elevenlabs: {
            apiKey: process.env.ELEVEN_LABS_API_KEY || '',
            model: 'eleven_turbo_v2_5',
        },
        deepgram: {
            apiKey: process.env.DEEPGRAM_API_KEY || '',
            model: 'nova-2-general',
        },
        isProduction: false,
        isSandbox: false,
        isLocal: true,
    };
}
/**
 * Get Supabase client for current environment
 * Uses serviceRoleKey for admin operations, falls back to anonKey for read-only
 */
export function getSupabaseClient() {
    const config = getEnvironmentConfig();
    const key = config.supabase.serviceRoleKey || config.supabase.anonKey;
    if (!key) {
        throw new Error('Missing Supabase key (serviceRoleKey or anonKey)');
    }
    return createClient(config.supabase.url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
/**
 * Get Supabase client for specific environment
 * Uses serviceRoleKey for admin operations, falls back to anonKey for read-only
 */
export function getSupabaseClientForEnv(env) {
    const originalEnv = process.env.EXPLICIT_ENV;
    process.env.EXPLICIT_ENV = env;
    try {
        const config = getEnvironmentConfig();
        const key = config.supabase.serviceRoleKey || config.supabase.anonKey;
        if (!key) {
            throw new Error(`Missing Supabase key for ${env} environment (serviceRoleKey or anonKey)`);
        }
        return createClient(config.supabase.url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    finally {
        if (originalEnv) {
            process.env.EXPLICIT_ENV = originalEnv;
        }
        else {
            delete process.env.EXPLICIT_ENV;
        }
    }
}
/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(config) {
    const errors = [];
    if (!config.supabase.url) {
        errors.push(`Missing Supabase URL for ${config.environment}`);
    }
    if (!config.supabase.serviceRoleKey) {
        errors.push(`Missing Supabase Service Role Key for ${config.environment}`);
    }
    if (!config.openai.apiKey) {
        errors.push(`Missing OpenAI API Key for ${config.environment}`);
    }
    if (config.environment !== 'local' && !config.vapi.secretKey) {
        errors.push(`Missing Vapi Secret Key for ${config.environment}`);
    }
    if (errors.length > 0) {
        throw new Error(`Environment configuration errors (${config.environment}):\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    }
}
/**
 * Safety check: Ensure we're in the correct environment
 */
export function assertEnvironment(expectedEnv) {
    const config = getEnvironmentConfig();
    if (config.environment !== expectedEnv) {
        throw new Error(`⚠️  ENVIRONMENT MISMATCH: Expected ${expectedEnv}, but current environment is ${config.environment}.\n` +
            `Set EXPLICIT_ENV=${expectedEnv} or adjust NODE_ENV/USE_LOCAL_DB.`);
    }
}
/**
 * Safety check: Prevent production writes from sandbox/local
 */
export function assertNotProduction() {
    const config = getEnvironmentConfig();
    if (config.isProduction) {
        throw new Error('⚠️  SAFETY CHECK FAILED: Attempting to run sandbox/local operation in PRODUCTION mode.\n' +
            'Set EXPLICIT_ENV=sandbox or EXPLICIT_ENV=local.');
    }
}
/**
 * Get OpenAI model for specific role
 */
export function getOpenAIModel(role) {
    const config = getEnvironmentConfig();
    if (role === 'closer') {
        return config.openai.closerModel;
    }
    // Sellers and Referees use mini for cost optimization
    return config.openai.sellerModel;
}
