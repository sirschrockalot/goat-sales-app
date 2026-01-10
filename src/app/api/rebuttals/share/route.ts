/**
 * Share Rebuttal API
 * Adds a rebuttal to the community library
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callId, rebuttalText, userId } = body;

    if (!callId || !rebuttalText || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the call to verify score
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select('goat_score, persona_mode')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
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
