/**
 * Sandbox Battles API
 * Returns autonomous battle data for the training monitor dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch battles with persona information
    const { data: battles, error: battlesError } = await supabaseAdmin
      .from('sandbox_battles')
      .select(`
        id,
        persona_id,
        referee_score,
        referee_feedback,
        math_defense_score,
        humanity_score,
        success_score,
        verbal_yes_to_memorandum,
        winning_rebuttal,
        turns,
        token_usage,
        cost_usd,
        created_at,
        ended_at,
        transcript,
        sandbox_personas!inner(
          id,
          name,
          persona_type,
          description
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (battlesError) {
      logger.error('Error fetching sandbox battles', { error: battlesError });
      return NextResponse.json(
        { error: 'Failed to fetch battles' },
        { status: 500 }
      );
    }

    // Format response
    const formattedBattles = (battles || []).map((battle: any) => ({
      id: battle.id,
      personaId: battle.persona_id,
      personaName: battle.sandbox_personas?.name || 'Unknown',
      personaType: battle.sandbox_personas?.persona_type || 'unknown',
      personaDescription: battle.sandbox_personas?.description || '',
      refereeScore: battle.referee_score || 0,
      refereeFeedback: battle.referee_feedback || '',
      mathDefenseScore: battle.math_defense_score || 0,
      humanityScore: battle.humanity_score || 0,
      successScore: battle.success_score || 0,
      verbalYesToMemorandum: battle.verbal_yes_to_memorandum || false,
      winningRebuttal: battle.winning_rebuttal || null,
      turns: battle.turns || 0,
      tokenUsage: battle.token_usage || 0,
      costUsd: battle.cost_usd || 0,
      createdAt: battle.created_at,
      endedAt: battle.ended_at,
      transcript: battle.transcript || '',
    }));

    return NextResponse.json({
      battles: formattedBattles,
      total: formattedBattles.length,
    });
  } catch (error) {
    logger.error('Error in GET /api/sandbox/battles', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
