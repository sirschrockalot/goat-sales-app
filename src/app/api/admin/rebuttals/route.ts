/**
 * Admin Rebuttals API
 * Returns high-scoring rebuttals for curation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
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
      (highScoreCalls || []).map(async (call) => {
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
          id: existingRebuttal?.id || null,
          callId: call.id,
          rebuttalText: call.rebuttal_of_the_day,
          score: call.goat_score,
          userName: profile?.name || profile?.email || 'Unknown',
          createdAt: call.created_at,
          isVerified: existingRebuttal?.is_verified || false,
        };
      })
    );

    return NextResponse.json({ rebuttals });
  } catch (error) {
    console.error('Error fetching admin rebuttals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rebuttalId } = body;

    if (!rebuttalId) {
      return NextResponse.json(
        { error: 'rebuttalId is required' },
        { status: 400 }
      );
    }

    // Verify the rebuttal
    const { error } = await supabaseAdmin
      .from('rebuttals')
      .update({ is_verified: true })
      .eq('id', rebuttalId);

    if (error) {
      console.error('Error verifying rebuttal:', error);
      return NextResponse.json(
        { error: 'Failed to verify rebuttal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying rebuttal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
