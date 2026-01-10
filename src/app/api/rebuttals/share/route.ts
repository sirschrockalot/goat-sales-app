/**
 * Share Rebuttal API
 * Adds a rebuttal to the community library
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Supabase auth
    const supabase = createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const body = await request.json();
    const { callId, rebuttalText } = body;

    if (!callId || !rebuttalText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the call to verify score and ownership
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select('goat_score, persona_mode, user_id')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Verify the call belongs to the authenticated user
    if (call.user_id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - Call does not belong to you' },
        { status: 403 }
      );
    }

    if (call.goat_score <= 85) {
      return NextResponse.json(
        { error: 'Score must be above 85 to share rebuttal' },
        { status: 403 }
      );
    }

    // Insert into rebuttals table
    const { data, error } = await supabaseAdmin
      .from('rebuttals')
      .insert({
        rebuttal_text: rebuttalText,
        context: `From ${call.persona_mode} mode call`,
        source: 'user_shared',
        user_id: userId,
        call_id: callId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sharing rebuttal:', error);
      return NextResponse.json(
        { error: 'Failed to share rebuttal' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      message: 'Rebuttal shared to community library',
    });
  } catch (error) {
    console.error('Error in POST /api/rebuttals/share:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
