/**
 * Humanity Grades API
 * Returns vocal soul analysis and humanity grades for battles
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
    const battleId = searchParams.get('battleId');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabaseAdmin
      .from('sandbox_battles')
      .select(`
        id,
        referee_score,
        humanity_grade,
        closeness_to_cline,
        prosody_features,
        robotic_gap_report,
        created_at,
        sandbox_personas!inner(name, persona_type)
      `)
      .not('humanity_grade', 'is', null)
      .order('humanity_grade', { ascending: false });

    if (battleId) {
      query = query.eq('id', battleId);
    } else {
      query = query.limit(limit);
    }

    const { data: battles, error } = await query;

    if (error) {
      logger.error('Error fetching humanity grades', { error });
      return NextResponse.json(
        { error: 'Failed to fetch humanity grades' },
        { status: 500 }
      );
    }

    // Format response
    const formatted = (battles || []).map((battle: any) => ({
      battleId: battle.id,
      refereeScore: battle.referee_score || 0,
      humanityGrade: battle.humanity_grade || 0,
      closenessToCline: battle.closeness_to_cline || 0,
      prosodyFeatures: battle.prosody_features || null,
      roboticGapReport: battle.robotic_gap_report || null,
      personaName: battle.sandbox_personas?.name || 'Unknown',
      personaType: battle.sandbox_personas?.persona_type || 'unknown',
      createdAt: battle.created_at,
    }));

    // Calculate averages
    const avgHumanityGrade = formatted.length > 0
      ? formatted.reduce((sum, b) => sum + b.humanityGrade, 0) / formatted.length
      : 0;
    const avgClosenessToCline = formatted.length > 0
      ? formatted.reduce((sum, b) => sum + (b.closenessToCline || 0), 0) / formatted.length
      : 0;

    return NextResponse.json({
      battles: formatted,
      averages: {
        humanityGrade: Math.round(avgHumanityGrade * 10) / 10,
        closenessToCline: Math.round(avgClosenessToCline * 10) / 10,
      },
      total: formatted.length,
    });
  } catch (error) {
    logger.error('Error in GET /api/sandbox/humanity-grades', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
