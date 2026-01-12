/**
 * Scenario Status API
 * Returns the status of a scenario injection and its breakthroughs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !(profile as any)?.is_admin) {
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

    const scenarioData = scenario as any;
    if (scenarioError || !scenarioData) {
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
        id: scenarioData.id,
        rawObjection: scenarioData.raw_objection,
        status: scenarioData.status,
        totalSessions: scenarioData.total_sessions,
        completedSessions: scenarioData.completed_sessions,
        top3Identified: scenarioData.top_3_identified,
        createdAt: scenarioData.created_at,
        completedAt: scenarioData.completed_at,
        progress: scenarioData.total_sessions > 0
          ? Math.round((scenarioData.completed_sessions / scenarioData.total_sessions) * 100)
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
