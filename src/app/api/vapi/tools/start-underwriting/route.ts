/**
 * Vapi Tool: start_underwriting
 * Transitions to UNDERWRITING_SYNC state
 * Only works if all pillars are complete
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getSalesEngine } from '@/lib/salesEngine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callId } = body;

    if (!callId) {
      return NextResponse.json(
        { error: 'Missing callId' },
        { status: 400 }
      );
    }

    const engine = getSalesEngine(callId);

    // Verify all pillars are complete
    if (!engine.arePillarsComplete()) {
      const missingPillar = engine.getMissingPillar();
      return NextResponse.json({
        allowed: false,
        error: 'Not all pillars are complete',
        missingPillar,
        message: `Cannot start underwriting. Missing pillar: ${missingPillar}`,
      });
    }

    // Start underwriting sync
    engine.startUnderwritingSync();

    logger.info('Underwriting sync started', {
      callId,
      state: engine.getCurrentState(),
    });

    return NextResponse.json({
      success: true,
      state: 'UNDERWRITING_SYNC',
      message: 'Underwriting sync started. After 15-30 seconds, call complete_underwriting to proceed to OFFER_STAGE.',
    });

  } catch (error: any) {
    logger.error('Error starting underwriting', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
