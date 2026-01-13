/**
 * Vapi Tool: trigger_offer
 * Gatekeeper that prevents premature offers
 * Only allows offer reveal if discovery_complete == true AND all pillars are met
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { canTriggerOffer as canTriggerFromEngine, getSalesEngine, getDeflectResponseForCall } from '@/lib/salesEngine';
import { canTriggerOffer as canTriggerFromAudit, getDeflectMessage } from '@/lib/pillarAudit';

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

    // Check if offer can be triggered (gatekeeper)
    // Must pass BOTH sales engine check AND pillar audit check
    const canTriggerEngine = canTriggerFromEngine(callId);
    const canTriggerAudit = canTriggerFromAudit(callId);
    const canTrigger = canTriggerEngine && canTriggerAudit;

    if (!canTrigger) {
      // Get deflect response - prioritize pillar audit message
      let deflectResponse: string;
      let reason: string;

      if (!canTriggerAudit) {
        // Pillar audit failed - use pillar-specific deflect
        deflectResponse = getDeflectMessage(callId);
        reason = 'pillars_incomplete';
      } else {
        // Sales engine failed - use engine deflect
        deflectResponse = getDeflectResponseForCall(callId);
        reason = 'discovery_incomplete';
      }
      
      logger.warn('⚠️ Premature offer attempt blocked', {
        callId,
        canTriggerEngine,
        canTriggerAudit,
        deflectResponse: deflectResponse.substring(0, 50) + '...',
      });

      return NextResponse.json({
        allowed: false,
        message: deflectResponse,
        reason,
        instruction: 'Use the deflect response to continue discovery',
      });
    }

    // Offer can be revealed - get sales engine state and pillar audit
    const engine = getSalesEngine(callId);
    const state = engine.getCurrentState();
    const enginePillars = engine.getPillars();
    
    // Get pillar audit flags
    const { getPillarAuditor } = await import('@/lib/pillarAudit');
    const auditor = getPillarAuditor(callId);
    const auditFlags = auditor.getFlags();

    logger.info('✅ Offer trigger approved', {
      callId,
      state,
      enginePillars,
      auditFlags,
    });

    // Mark offer as revealed
    engine.revealOffer();

    return NextResponse.json({
      allowed: true,
      state: 'OFFER_STAGE',
      message: 'Offer can now be revealed to seller',
      enginePillars: {
        motivation: enginePillars.motivation,
        timeline: enginePillars.timeline,
        condition: enginePillars.condition,
        priceAnchor: enginePillars.priceAnchor,
      },
      auditFlags: {
        motivation: auditFlags.motivation,
        condition: auditFlags.condition,
        timeline: auditFlags.timeline,
        priceAnchor: auditFlags.priceAnchor,
      },
    });

  } catch (error: any) {
    logger.error('Error in trigger_offer tool', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error', allowed: false },
      { status: 500 }
    );
  }
}

/**
 * Check offer readiness (for AI to query before attempting)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { error: 'Missing callId' },
        { status: 400 }
      );
    }

    const canTriggerEngine = canTriggerFromEngine(callId);
    const canTriggerAudit = canTriggerFromAudit(callId);
    const canTrigger = canTriggerEngine && canTriggerAudit;
    
    const engine = getSalesEngine(callId);
    const enginePillars = engine.getPillars();
    
    // Get pillar audit flags
    const { getPillarAuditor } = await import('@/lib/pillarAudit');
    const auditor = getPillarAuditor(callId);
    const auditFlags = auditor.getFlags();
    const missingPillars = auditor.getMissingPillars();

    return NextResponse.json({
      canTrigger,
      canTriggerEngine,
      canTriggerAudit,
      currentState: engine.getCurrentState(),
      enginePillars,
      auditFlags,
      missingPillars,
      discoveryComplete: engine.isDiscoveryComplete(),
    });

  } catch (error: any) {
    logger.error('Error checking offer readiness', {
      error: error.message,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
