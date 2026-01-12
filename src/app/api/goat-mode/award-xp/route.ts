/**
 * Goat Mode XP Award API
 * Awards experience points with 2x multiplier during Goat Mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import logger from '@/lib/logger';

const BASE_XP_PER_SECOND = 1; // Base XP per second of call
const GOAT_MODE_MULTIPLIER = 2; // 2x XP during Goat Mode
const PRO_MODE_MULTIPLIER = 1.5; // 1.5x XP for time spent in Pro Mode (script hidden)

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
    const { callDuration, goatModeDuration, goatScore, scriptHiddenDuration = 0 } = body;

    if (!callDuration) {
      return NextResponse.json(
        { error: 'callDuration is required' },
        { status: 400 }
      );
    }

    // Calculate XP
    const baseXP = Math.floor(callDuration * BASE_XP_PER_SECOND);
    const goatModeXP = Math.floor(goatModeDuration * BASE_XP_PER_SECOND * GOAT_MODE_MULTIPLIER);
    const proModeXP = Math.floor(scriptHiddenDuration * BASE_XP_PER_SECOND * PRO_MODE_MULTIPLIER);
    const bonusXP = goatScore >= 90 ? Math.floor(goatScore - 90) : 0; // Bonus for high scores
    
    const totalXP = baseXP + goatModeXP + proModeXP + bonusXP;

    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

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

    const profileData = profile as any;

    // Update XP and Goat Mode time
    const { error: updateError } = await (supabaseAdmin as any)
      .from('profiles')
      .update({
        experience_points: (profileData.experience_points || 0) + totalXP,
        goat_mode_time: (profileData.goat_mode_time || 0) + Math.floor(goatModeDuration),
      } as any)
      .eq('id', userId);

    if (updateError) {
      logger.error('Error updating XP', { error: updateError, userId });
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
        proModeXP,
        bonusXP,
      },
      newTotalXP: (profileData.experience_points || 0) + totalXP,
    });
  } catch (error) {
    logger.error('Error awarding XP', { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
