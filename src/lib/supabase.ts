/**
 * Supabase Clients
 * Separate clients for server-side (admin) and client-side (public) operations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Server-side client with service role key (bypasses RLS)
// Used ONLY in API routes for admin operations
// Only create if both variables are available (server-side only)
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

if (typeof window === 'undefined') {
  // Server-side only - lazy load logger to avoid winston in client bundles
  if (!supabaseUrl || !supabaseServiceKey) {
    // Use console for client-safe error logging
    console.error('Missing Supabase environment variables', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey 
    });
  } else {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}

// Export - will be null on client-side (which is correct, as it should never be used client-side)
export const supabaseAdmin = supabaseAdminInstance;

// Client-side Supabase client singleton (for browser use)
// Uses anon key and respects RLS policies
// Singleton pattern to prevent multiple instances
let supabaseClientInstance: ReturnType<typeof createClient> | null = null;

export const createSupabaseClient = () => {
  // Only use singleton on client-side (browser)
  // On server-side, each call should create a new instance for SSR safety
  if (typeof window !== 'undefined') {
    // Return existing instance if available (singleton pattern for client-side)
    if (supabaseClientInstance) {
      return supabaseClientInstance;
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = 'Missing client-side Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)';
    // Use console for client-safe error logging
    console.error('Supabase admin client creation error', { error });
    // Throw error so it's clear what's missing
    throw new Error(error);
  }
  
  // Create instance (singleton on client, new on server)
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });

  // Store as singleton only on client-side
  if (typeof window !== 'undefined') {
    supabaseClientInstance = client as ReturnType<typeof createClient>;
  }

  return client;
};
