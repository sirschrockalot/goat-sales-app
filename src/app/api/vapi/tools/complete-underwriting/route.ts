/**
 * Vapi Tool: complete_underwriting
 * Completes underwriting and transitions to OFFER_STAGE
 * Enables offer reveal
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

    // Verify we're in underwriting sync state
    if (engine.getCurrentState() !== 'UNDERWRITING_SYNC') {
      return NextResponse.json({
        allowed: false,
        error: 'Not in UNDERWRITING_SYNC state',
        currentState: engine.getCurrentState(),
        message: 'Must call start_underwriting first',
      });
    }

    // Complete underwriting
    engine.completeUnderwriting();

    logger.info('✅ Underwriting complete - ready for OFFER_STAGE', {
      callId,
      state: engine.getCurrentState(),
    });

    return NextResponse.json({
      success: true,
      state: 'OFFER_STAGE',
      message: 'Underwriting complete. You can now reveal the offer using trigger_offer.',
      canRevealOffer: true,
    });

  } catch (error: any) {
    logger.error('Error completing underwriting', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
