/**
 * Scenario Status API
 * Returns the status of a scenario injection and its breakthroughs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabase';
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
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'scenarioId is required' },
        { status: 400 }
      );
    }

    // Get scenario status
    const { data: scenario, error: scenarioError } = await supabaseAdmin
      .from('scenario_injections')
      .select('*')
      .eq('id', scenarioId)
      .single();

    if (scenarioError || !scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Get top 3 breakthroughs
    const { data: breakthroughs, error: breakthroughsError } = await supabaseAdmin
      .from('scenario_breakthroughs')
      .select(`
        *,
        sandbox_battles!inner(
          id,
          referee_score,
          transcript
        )
      `)
      .eq('scenario_injection_id', scenarioId)
      .order('rank', { ascending: true });

    if (breakthroughsError) {
      logger.error('Error fetching breakthroughs', { error: breakthroughsError });
    }

    return NextResponse.json({
      scenario: {
        id: scenario.id,
        rawObjection: scenario.raw_objection,
        status: scenario.status,
        totalSessions: scenario.total_sessions,
        completedSessions: scenario.completed_sessions,
        top3Identified: scenario.top_3_identified,
        createdAt: scenario.created_at,
        completedAt: scenario.completed_at,
        progress: scenario.total_sessions > 0
          ? Math.round((scenario.completed_sessions / scenario.total_sessions) * 100)
          : 0,
      },
      breakthroughs: (breakthroughs || []).map((b: any) => ({
        id: b.id,
        rank: b.rank,
        refereeScore: b.referee_score,
        conflictResolved: b.conflict_resolved,
        priceMaintained: b.price_maintained,
        winningRebuttal: b.winning_rebuttal,
        breakthroughInsight: b.breakthrough_insight,
        battleId: b.battle_id,
      })),
    });
  } catch (error) {
    logger.error('Error fetching scenario status', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
