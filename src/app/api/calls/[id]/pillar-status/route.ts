/**
 * Get pillar compliance status for a call
 * Used by PillarDashboard for real-time monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import logger from '@/lib/logger';
import { auditPillars, getPillarAuditor } from '@/lib/pillarAudit';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const callId = params.id;

    // Get Supabase client
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get call transcript
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select('transcript, metadata')
      .eq('id', callId)
      .single();

    if (callError) {
      logger.error('Error fetching call for pillar audit', {
        error: callError,
        callId,
      });
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Audit transcript for pillar compliance
    const transcript = call.transcript || '';
    const auditResult = auditPillars(callId, transcript);

    // Get walkthrough progress from metadata
    const walkthroughProgress = (call.metadata as any)?.walkthroughProgress || 0;

    return NextResponse.json({
      flags: auditResult.flags,
      allPillarsMet: auditResult.allPillarsMet,
      missingPillars: auditResult.missingPillars,
      walkthroughProgress,
      lastUpdated: auditResult.lastUpdated,
    });

  } catch (error: any) {
    logger.error('Error in GET /api/calls/[id]/pillar-status', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
