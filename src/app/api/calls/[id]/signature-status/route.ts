/**
 * Get signature status for a call
 * Used by ClosingTable component for real-time status polling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import logger from '@/lib/logger';

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

    // Get call data with signature status
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select('id, last_docusign_event, signed_pdf_url, time_to_sign, created_at, property_address, final_offer_price, suggested_buy_price')
      .eq('id', callId)
      .single();

    if (callError) {
      logger.error('Error fetching call signature status', {
        error: callError,
        callId,
      });
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Map last_docusign_event to document_status
    let status: 'sent' | 'delivered' | 'viewed' | 'completed' = 'sent';
    
    if (call.last_docusign_event) {
      switch (call.last_docusign_event) {
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

    // Calculate deal profit if available
    const dealProfit = call.final_offer_price && call.suggested_buy_price
      ? call.final_offer_price - call.suggested_buy_price
      : null;

    return NextResponse.json({
      status,
      signedPdfUrl: call.signed_pdf_url,
      timeToSign: call.time_to_sign,
      propertyAddress: call.property_address,
      dealProfit,
      callStartTime: call.created_at,
    });

  } catch (error: any) {
    logger.error('Error in GET /api/calls/[id]/signature-status', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
