/**
 * Goat Mode XP Award API
 * Awards experience points with 2x multiplier during Goat Mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createSupabaseClient } from '@/lib/supabase';

const BASE_XP_PER_SECOND = 1; // Base XP per second of call
const GOAT_MODE_MULTIPLIER = 2; // 2x XP during Goat Mode

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
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
    const { callDuration, goatModeDuration, goatScore } = body;

    if (!callDuration) {
      return NextResponse.json(
        { error: 'callDuration is required' },
        { status: 400 }
      );
    }

    // Calculate XP
    const baseXP = Math.floor(callDuration * BASE_XP_PER_SECOND);
    const goatModeXP = Math.floor(goatModeDuration * BASE_XP_PER_SECOND * GOAT_MODE_MULTIPLIER);
    const bonusXP = goatScore >= 90 ? Math.floor(goatScore - 90) : 0; // Bonus for high scores
    
    const totalXP = baseXP + goatModeXP + bonusXP;

    // Get current profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('experience_points, goat_mode_time')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Update XP and Goat Mode time
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        experience_points: (profile.experience_points || 0) + totalXP,
        goat_mode_time: (profile.goat_mode_time || 0) + Math.floor(goatModeDuration),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating XP:', updateError);
      return NextResponse.json(
        { error: 'Failed to update XP' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      xpAwarded: totalXP,
      breakdown: {
        baseXP,
        goatModeXP,
        bonusXP,
      },
      newTotalXP: (profile.experience_points || 0) + totalXP,
    });
  } catch (error) {
    console.error('Error awarding XP:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
