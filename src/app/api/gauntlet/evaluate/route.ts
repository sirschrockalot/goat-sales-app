/**
 * Gauntlet Evaluation API
 * Checks if user has achieved required score to unlock next level
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGauntletLevel } from '@/lib/gauntletLevels';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, callId } = body;

    if (!userId || !callId) {
      return NextResponse.json(
        { error: 'userId and callId are required' },
        { status: 400 }
      );
    }

    // Get the call record
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select('goat_score, persona_id, metadata')
      .eq('id', callId)
      .eq('user_id', userId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    const goatScore = call.goat_score;
    if (!goatScore) {
      return NextResponse.json(
        { error: 'Call has not been graded yet' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('gauntlet_level, gauntlet_progress')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const currentLevel = profile.gauntlet_level || 1;
    const progress = (profile.gauntlet_progress as Record<string, number>) || {};

    // Extract gauntlet level from call metadata or persona_id
    let callLevel: number | null = null;
    if (call.metadata && typeof call.metadata === 'object') {
      callLevel = (call.metadata as any).gauntlet_level || null;
    }
    if (!callLevel && call.persona_id) {
      // Try to extract from persona_id (e.g., "gauntlet-3")
      const match = call.persona_id.match(/gauntlet[_-]?(\d+)/i);
      if (match) {
        callLevel = parseInt(match[1]);
      }
    }

    if (!callLevel) {
      return NextResponse.json({
        success: false,
        message: 'Call is not a gauntlet challenge',
        leveledUp: false,
      });
    }

    // Update progress for this level
    const levelKey = callLevel.toString();
    const currentBest = progress[levelKey] || 0;
    const newBest = Math.max(currentBest, goatScore);
    progress[levelKey] = newBest;

    let leveledUp = false;
    let newLevel = currentLevel;

    // Check if user can level up
    if (goatScore >= 90 && callLevel === currentLevel && currentLevel < 5) {
      // User passed current level, unlock next level
      newLevel = currentLevel + 1;
      leveledUp = true;
    }

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        gauntlet_level: newLevel,
        gauntlet_progress: progress,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating gauntlet progress:', updateError);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      leveledUp,
      newLevel: leveledUp ? newLevel : currentLevel,
      score: goatScore,
      levelBest: newBest,
      message: leveledUp
        ? `Congratulations! You've unlocked Level ${newLevel}!`
        : goatScore >= 90
        ? `Great job! You passed Level ${callLevel} with a score of ${goatScore}.`
        : `You scored ${goatScore}. You need 90+ to unlock the next level.`,
    });
  } catch (error) {
    console.error('Error evaluating gauntlet:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
