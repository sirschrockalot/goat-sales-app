/**
 * Admin Rebuttals API
 * Returns high-scoring rebuttals for curation
 */

import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get rebuttals from calls with score > 90
    const { data: highScoreCalls } = await supabaseAdmin
      .from('calls')
      .select('id, rebuttal_of_the_day, goat_score, user_id, created_at')
      .gt('goat_score', 90)
      .not('rebuttal_of_the_day', 'is', null)
      .neq('rebuttal_of_the_day', 'None')
      .order('goat_score', { ascending: false })
      .limit(50);

    // Get user names
    const rebuttals = await Promise.all(
      ((highScoreCalls as any[]) || []).map(async (call: any) => {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('name, email')
          .eq('id', call.user_id)
          .single();

        // Check if this rebuttal is already in the rebuttals table
        const { data: existingRebuttal } = await supabaseAdmin
          .from('rebuttals')
          .select('id, is_verified')
          .eq('rebuttal_text', call.rebuttal_of_the_day)
          .single();

        return {
          id: (existingRebuttal as any)?.id || null,
          callId: call.id,
          rebuttalText: call.rebuttal_of_the_day,
          score: call.goat_score,
          userName: (profile as any)?.name || (profile as any)?.email || 'Unknown',
          createdAt: call.created_at,
          isVerified: (existingRebuttal as any)?.is_verified || false,
        };
      })
    );

    return NextResponse.json({ rebuttals });
  } catch (error) {
    logger.error('Error fetching admin rebuttals', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json();
    const { rebuttalId } = body;

    if (!rebuttalId) {
      return NextResponse.json(
        { error: 'rebuttalId is required' },
        { status: 400 }
      );
    }

    // Verify the rebuttal
    const { error } = await (supabaseAdmin as any)
      .from('rebuttals')
      .update({ is_verified: true } as any)
      .eq('id', rebuttalId);

    if (error) {
      logger.error('Error verifying rebuttal', { error, rebuttalId });
      return NextResponse.json(
        { error: 'Failed to verify rebuttal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const body = await request.json().catch(() => ({}));
    const rebuttalId = (body as any)?.rebuttalId;
    logger.error('Error verifying rebuttal', { error, rebuttalId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
