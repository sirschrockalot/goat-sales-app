/**
 * Breakthroughs API
 * Returns pending review breakthroughs and notification status
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
    const status = searchParams.get('status') || 'pending_review';

    // Get pending review breakthroughs
    const { data: breakthroughs, error } = await supabaseAdmin
      .from('sandbox_battles')
      .select(`
        id,
        referee_score,
        humanity_grade,
        closeness_to_cline,
        persona_id,
        winning_rebuttal,
        defining_moment,
        tactical_snippet,
        breakthrough_detected_at,
        created_at,
        sandbox_personas!inner(
          name,
          persona_type
        )
      `)
      .eq('status', status)
      .order('breakthrough_detected_at', { ascending: false })
      .order('referee_score', { ascending: false });

    if (error) {
      logger.error('Error fetching breakthroughs', { error });
      return NextResponse.json(
        { error: 'Failed to fetch breakthroughs' },
        { status: 500 }
      );
    }

    // Format response
    const formatted = (breakthroughs || []).map((b: any) => ({
      battleId: b.id,
      refereeScore: b.referee_score,
      humanityGrade: b.humanity_grade,
      closenessToCline: b.closeness_to_cline,
      personaName: b.sandbox_personas?.name || 'Unknown',
      personaType: b.sandbox_personas?.persona_type || 'unknown',
      winningRebuttal: b.winning_rebuttal,
      definingMoment: b.defining_moment,
      tacticalSnippet: b.tactical_snippet,
      detectedAt: b.breakthrough_detected_at,
      createdAt: b.created_at,
    }));

    // Count unread (detected in last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const unreadCount = formatted.filter(
      (b) => b.detectedAt && new Date(b.detectedAt) > oneDayAgo
    ).length;

    return NextResponse.json({
      breakthroughs: formatted,
      unreadCount,
      total: formatted.length,
    });
  } catch (error) {
    logger.error('Error in GET /api/sandbox/breakthroughs', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { battleId, action } = body; // action: 'mark_reviewed', 'promote', 'reject'

    if (!battleId || !action) {
      return NextResponse.json(
        { error: 'battleId and action are required' },
        { status: 400 }
      );
    }

    let newStatus: string;
    switch (action) {
      case 'mark_reviewed':
        newStatus = 'reviewed';
        break;
      case 'promote':
        newStatus = 'promoted';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: mark_reviewed, promote, or reject' },
          { status: 400 }
        );
    }

    const { error: updateError } = await (supabaseAdmin as any)
      .from('sandbox_battles')
      .update({ status: newStatus } as any)
      .eq('id', battleId);

    if (updateError) {
      logger.error('Error updating breakthrough status', { error: updateError });
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      battleId,
      status: newStatus,
    });
  } catch (error) {
    logger.error('Error in POST /api/sandbox/breakthroughs', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
