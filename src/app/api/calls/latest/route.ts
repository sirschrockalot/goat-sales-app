/**
 * Get Latest Call API
 * Returns the most recent call for the current user
 */

import { NextRequest, NextResponse } from 'next/server';

import { getUserFromRequest } from '@/lib/getUserFromRequest';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from request
    const { user, error: authError } = await getUserFromRequest(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      logger.error('Error fetching latest call', { error, userId });
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error in GET /api/calls/latest', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
