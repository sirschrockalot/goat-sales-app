/**
 * Get Vapi Client Key API
 * Returns the Vapi API key for client-side initialization
 *
 * SECURITY: This API route returns the VAPI API key to authenticated users only.
 * The key is stored server-side and never exposed in client bundle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('Unauthorized attempt to get VAPI key');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Get VAPI key from server-side environment variable (no NEXT_PUBLIC_ prefix)
    const vapiApiKey = process.env.VAPI_API_KEY;

    if (!vapiApiKey) {
      logger.error('VAPI_API_KEY not configured in environment');
      return NextResponse.json(
        { error: 'Vapi API key not configured' },
        { status: 500 }
      );
    }

    // Log access for security audit
    logger.info('VAPI key accessed', { userId: user.id });

    // Return the key to authenticated user
    return NextResponse.json({
      apiKey: vapiApiKey,
    });
  } catch (error) {
    logger.error('Error getting Vapi client key', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
