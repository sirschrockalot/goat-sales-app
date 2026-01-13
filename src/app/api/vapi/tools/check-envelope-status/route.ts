/**
 * Vapi Tool: check_envelope_status
 * Allows AI to check DocuSign envelope status in real-time
 * Called every 30 seconds if seller is silent, or immediately when webhook hits
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getActiveMonitor } from '@/lib/signatureMonitor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callId, envelopeId } = body;

    if (!callId || !envelopeId) {
      return NextResponse.json(
        { error: 'Missing callId or envelopeId' },
        { status: 400 }
      );
    }

    // Get active monitor for this call
    const monitor = getActiveMonitor(callId);
    
    if (!monitor) {
      logger.warn('No active monitor found for call', { callId });
      return NextResponse.json({
        status: 'not_monitoring',
        message: 'Signature monitoring not active for this call',
      });
    }

    // Get current status from database
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select('last_docusign_event, signed_pdf_url, time_to_sign')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      logger.error('Error fetching call status', { error: callError, callId });
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Map last_docusign_event to status
    let status: 'sent' | 'delivered' | 'viewed' | 'completed' = 'sent';
    const callData = call as any;
    
    if (callData.last_docusign_event) {
      switch (callData.last_docusign_event) {
        case 'envelope-sent':
          status = 'sent';
          break;
        case 'recipient-delivered':
          status = 'delivered';
          break;
        case 'recipient-viewed':
          status = 'viewed';
          break;
        case 'recipient-completed':
          status = 'completed';
          break;
        default:
          status = 'sent';
      }
    }

    // Return status for AI to use
    return NextResponse.json({
      status,
      envelopeId,
      signed: status === 'completed',
      message: status === 'completed' 
        ? 'Document has been signed successfully!'
        : status === 'delivered'
        ? 'Document has been delivered to recipient'
        : status === 'viewed'
        ? 'Recipient has viewed the document'
        : 'Document status: sent',
    });

  } catch (error: any) {
    logger.error('Error in check_envelope_status tool', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
