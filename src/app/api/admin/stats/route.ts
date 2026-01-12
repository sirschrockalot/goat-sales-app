/**
 * Admin Stats API
 * Returns high-level metrics for the manager dashboard
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

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total Calls Today
    const { count: totalCallsToday } = await supabaseAdmin
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Average Team Score
    const { data: allCalls } = await supabaseAdmin
      .from('calls')
      .select('goat_score')
      .not('goat_score', 'is', null);

    const averageScore = allCalls && allCalls.length > 0
      ? Math.round(allCalls.reduce((sum, call) => sum + (call.goat_score || 0), 0) / allCalls.length)
      : 0;

    // Top Objection (from last 7 days)
    // Note: This assumes objection_type is stored in calls table or metadata
    // Adjust based on your actual schema
    const { data: recentCalls } = await supabaseAdmin
      .from('calls')
      .select('transcript, logic_gates')
      .gte('created_at', sevenDaysAgo.toISOString());

    // Extract objections from transcripts (simplified - you may want to use AI to categorize)
    const objectionCounts: Record<string, number> = {};
    recentCalls?.forEach((call) => {
      const transcript = call.transcript?.toLowerCase() || '';
      if (transcript.includes('price') || transcript.includes('too low') || transcript.includes('offer')) {
        objectionCounts['Price Too Low'] = (objectionCounts['Price Too Low'] || 0) + 1;
      }
      if (transcript.includes('spouse') || transcript.includes('wife') || transcript.includes('husband') || transcript.includes('partner')) {
        objectionCounts['Need to Talk to Spouse'] = (objectionCounts['Need to Talk to Spouse'] || 0) + 1;
      }
      if (transcript.includes('think') || transcript.includes('consider')) {
        objectionCounts['Need Time to Think'] = (objectionCounts['Need Time to Think'] || 0) + 1;
      }
    });

    const topObjection = Object.entries(objectionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None detected';

    // Total Clinches (step 5 passed)
    // Get all calls and filter for those with clinch passed
    const { data: allCallsForClinches } = await supabaseAdmin
      .from('calls')
      .select('logic_gates')
      .not('logic_gates', 'is', null);

    const totalClinches = allCallsForClinches?.filter((call) => {
      const gates = call.logic_gates as Array<{ name: string; passed: boolean }>;
      return gates?.some((gate) => 
        gate.name === 'The Clinch' || gate.name.includes('Clinch')
      ) && gates?.find((gate) => 
        gate.name === 'The Clinch' || gate.name.includes('Clinch')
      )?.passed === true;
    }).length || 0;

    return NextResponse.json({
      totalCallsToday: totalCallsToday || 0,
      averageTeamScore: averageScore,
      topObjection,
      totalClinches: totalClinches || 0,
    });
  } catch (error) {
    logger.error('Error fetching admin stats', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
