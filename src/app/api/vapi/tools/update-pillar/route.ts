/**
 * Vapi Tool: update_pillar
 * Allows AI to update pillar status as discovery progresses
 * Tracks: motivation, timeline, condition, priceAnchor
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getSalesEngine } from '@/lib/salesEngine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callId, pillar, value } = body;

    if (!callId || !pillar || typeof value !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing callId, pillar, or invalid value' },
        { status: 400 }
      );
    }

    const validPillars = ['motivation', 'timeline', 'condition', 'priceAnchor'];
    if (!validPillars.includes(pillar)) {
      return NextResponse.json(
        { error: `Invalid pillar. Must be one of: ${validPillars.join(', ')}` },
        { status: 400 }
      );
    }

    const engine = getSalesEngine(callId);
    engine.updatePillar(pillar as 'motivation' | 'timeline' | 'condition' | 'priceAnchor', value);

    const pillars = engine.getPillars();
    const allComplete = engine.arePillarsComplete();

    logger.info('Pillar updated', {
      callId,
      pillar,
      value,
      allPillarsComplete: allComplete,
      currentState: engine.getCurrentState(),
    });

    return NextResponse.json({
      success: true,
      pillar,
      value,
      allPillars: pillars,
      allComplete,
      currentState: engine.getCurrentState(),
      nextAction: allComplete
        ? 'Proceed to underwriting sync: "I have everything I need. I\'m going to run this by my underwriting team/partners real quick..."'
        : `Continue discovery. Missing: ${Object.entries(pillars).filter(([_, v]) => !v).map(([k]) => k).join(', ')}`,
    });

  } catch (error: any) {
    logger.error('Error updating pillar', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
