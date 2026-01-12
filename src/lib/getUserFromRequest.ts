/**
 * Helper function to get authenticated user from Next.js request
 * Works in API routes by extracting session from cookies
 * 
 * Supabase stores sessions in cookies. For local development, the cookie
 * name pattern is: sb-<project-ref>-auth-token
 * The cookie value is a JSON string containing the session data.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function getUserFromRequest(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: new Error('Supabase environment variables not configured') };
  }

  // Extract project ref from URL to build cookie name
  // For local: http://localhost:54321 -> project ref is typically 'localhost'
  // For production: https://<project-ref>.supabase.co
  const url = new URL(supabaseUrl);
  const projectRef = url.hostname.split('.')[0] || 'localhost';
  
  // Supabase cookie name pattern: sb-<project-ref>-auth-token
  // For local, it might be: sb-localhost-auth-token or sb-127.0.0.1-auth-token
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieNameAlt = `sb-127.0.0.1-auth-token`; // Alternative for local
  
  // Get cookie value
  const cookieValue = request.cookies.get(cookieName)?.value || 
                      request.cookies.get(cookieNameAlt)?.value ||
                      request.cookies.get('sb-access-token')?.value ||
                      request.cookies.get('supabase-auth-token')?.value;

  let accessToken: string | null = null;

  if (cookieValue) {
    try {
      // Cookie value is JSON encoded session data
      const sessionData = JSON.parse(decodeURIComponent(cookieValue));
      accessToken = sessionData.access_token || sessionData.accessToken;
    } catch {
      // If not JSON, might be the token directly
      accessToken = cookieValue;
    }
  }

  // Also check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.replace('Bearer ', '');
  }

  if (!accessToken) {
    // Try to get from all cookies (fallback)
    const allCookies = request.headers.get('cookie') || '';
    const cookieMatch = allCookies.match(/sb-[^=]+-auth-token=([^;]+)/);
    if (cookieMatch) {
      try {
        const sessionData = JSON.parse(decodeURIComponent(cookieMatch[1]));
        accessToken = sessionData.access_token || sessionData.accessToken;
      } catch {
        accessToken = cookieMatch[1];
      }
    }
  }

  if (!accessToken) {
    // Debug: log available cookies to help troubleshoot
    if (process.env.NODE_ENV === 'development') {
      const allCookies = request.headers.get('cookie') || '';
      const cookieNames = allCookies.split(';').map(c => c.trim().split('=')[0]).filter(Boolean);
      logger.debug('Available cookies for getUserFromRequest', { cookieNames, cookieName, cookieNameAlt });
    }
    return { user: null, error: new Error('No access token found in cookies or headers') };
  }

  // Create Supabase client with the access token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  // Get user from the token
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return { user: null, error: error || new Error('User not found') };
  }

  return { user, error: null };
}
