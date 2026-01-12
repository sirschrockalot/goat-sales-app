/**
 * Admin Calls API
 * Returns call history for a specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .single();

    // Get calls for this user
    const { data: calls } = await supabaseAdmin
      .from('calls')
      .select('id, goat_score, created_at, persona_mode, rebuttal_of_the_day')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      calls: calls || [],
      userName: (profile as any)?.name || (profile as any)?.email || 'Unknown User',
    });
  } catch (error) {
    const userId = new URL(request.url).searchParams.get('userId');
    logger.error('Error fetching admin calls', { error, userId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
