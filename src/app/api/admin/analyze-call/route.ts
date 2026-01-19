/**
 * Analyze Call for AI Training API
 *
 * Analyzes real calls (acquisition or disposition) to extract
 * training insights like successful rebuttals, techniques, and patterns.
 *
 * POST /api/admin/analyze-call
 * Body: { callId: string, mode?: 'acquisition' | 'disposition' }
 *
 * POST /api/admin/analyze-call?batch=true
 * Body: { callIds: string[], mode: 'acquisition' | 'disposition' }
 *
 * GET /api/admin/analyze-call/stats
 * Query: ?mode=acquisition|disposition
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';
import {
  analyzeCallForTraining,
  saveCallAnalysis,
  analyzeCallsBatch,
  getUnanalyzedCalls,
  getAnalysisStats,
  getTopInsightsByCategory,
  generateInsightInjection,
  CallMode,
} from '@/lib/callAnalyzer';

/**
 * Verify admin access
 */
async function verifyAdmin(request: NextRequest): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const { user, error: authError } = await getUserFromRequest(request);
  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized' };
  }

  if (!supabaseAdmin) {
    return { authorized: false, error: 'Database not available' };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !(profile as any).is_admin) {
    return { authorized: false, error: 'Forbidden - Admin access required' };
  }

  return { authorized: true, userId: user.id };
}

/**
 * POST - Analyze a call or batch of calls
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { authorized, error: authError } = await verifyAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: authError }, { status: authError === 'Unauthorized' ? 401 : 403 });
    }

    const body = await request.json();
    const isBatch = request.nextUrl.searchParams.get('batch') === 'true';

    if (isBatch) {
      // Batch analysis
      const { callIds, mode } = body;

      if (!callIds || !Array.isArray(callIds) || callIds.length === 0) {
        return NextResponse.json({ error: 'callIds array is required' }, { status: 400 });
      }

      if (!mode || !['acquisition', 'disposition'].includes(mode)) {
        return NextResponse.json({ error: 'mode must be "acquisition" or "disposition"' }, { status: 400 });
      }

      // Limit batch size
      const limitedCallIds = callIds.slice(0, 20);

      const results = await analyzeCallsBatch(limitedCallIds, mode as CallMode);

      return NextResponse.json({
        success: true,
        analyzed: results.length,
        results: results.map(r => ({
          callId: r.callId,
          overallScore: r.overallScore,
          insightCount: r.insights.length,
          recommendedForTraining: r.recommendedForTraining,
        })),
      });
    } else {
      // Single call analysis
      const { callId, mode: providedMode } = body;

      if (!callId) {
        return NextResponse.json({ error: 'callId is required' }, { status: 400 });
      }

      // Fetch call from database
      if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database not available' }, { status: 500 });
      }

      const { data: call, error: callError } = await (supabaseAdmin as any)
        .from('calls')
        .select('transcript, persona_mode, goat_score, training_analysis')
        .eq('id', callId)
        .single();

      if (callError || !call) {
        return NextResponse.json({ error: 'Call not found' }, { status: 404 });
      }

      if (!call.transcript) {
        return NextResponse.json({ error: 'Call has no transcript' }, { status: 400 });
      }

      // Determine mode from call or provided parameter
      const mode = (providedMode || call.persona_mode || 'acquisition') as CallMode;

      // Analyze the call
      const analysis = await analyzeCallForTraining(callId, call.transcript, mode);

      // Save the analysis
      await saveCallAnalysis(analysis);

      return NextResponse.json({
        success: true,
        analysis: {
          callId: analysis.callId,
          mode: analysis.mode,
          overallScore: analysis.overallScore,
          summary: analysis.summary,
          strengthAreas: analysis.strengthAreas,
          improvementAreas: analysis.improvementAreas,
          recommendedForTraining: analysis.recommendedForTraining,
          insightCount: analysis.insights.length,
          insights: analysis.insights,
        },
      });
    }
  } catch (error) {
    logger.error('Error in analyze-call API', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET - Get analysis stats or unanalyzed calls
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { authorized, error: authError } = await verifyAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: authError }, { status: authError === 'Unauthorized' ? 401 : 403 });
    }

    const action = request.nextUrl.searchParams.get('action') || 'stats';
    const mode = request.nextUrl.searchParams.get('mode') as CallMode | null;

    if (action === 'stats') {
      // Get analysis statistics
      const stats = await getAnalysisStats(mode || undefined);
      return NextResponse.json({ success: true, stats });
    }

    if (action === 'unanalyzed') {
      // Get unanalyzed calls
      if (!mode) {
        return NextResponse.json({ error: 'mode parameter required for unanalyzed action' }, { status: 400 });
      }

      const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
      const minScore = request.nextUrl.searchParams.get('minScore')
        ? parseInt(request.nextUrl.searchParams.get('minScore')!)
        : undefined;

      const calls = await getUnanalyzedCalls(mode, limit, minScore);
      return NextResponse.json({
        success: true,
        count: calls.length,
        calls: calls.map(c => ({
          id: c.id,
          goat_score: c.goat_score,
          hasTranscript: !!c.transcript,
        })),
      });
    }

    if (action === 'insights') {
      // Get top insights by category
      const category = request.nextUrl.searchParams.get('category');
      if (!mode || !category) {
        return NextResponse.json({ error: 'mode and category parameters required' }, { status: 400 });
      }

      const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5');
      const insights = await getTopInsightsByCategory(mode, category, limit);
      return NextResponse.json({ success: true, insights });
    }

    if (action === 'injection') {
      // Generate prompt injection from top insights
      if (!mode) {
        return NextResponse.json({ error: 'mode parameter required' }, { status: 400 });
      }

      const categoriesParam = request.nextUrl.searchParams.get('categories');
      const categories = categoriesParam ? categoriesParam.split(',') : undefined;

      const injection = await generateInsightInjection(mode, categories);
      return NextResponse.json({ success: true, injection });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Error in analyze-call GET API', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
