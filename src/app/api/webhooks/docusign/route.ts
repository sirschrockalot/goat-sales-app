/**
 * DocuSign Connect Webhook Handler
 * Listens for DocuSign envelope events (recipient-delivered, recipient-completed, etc.)
 * Updates call records and triggers real-time AI responses via Vapi
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { sendVictorySMS } from '@/lib/victoryNotification';
import { getActiveMonitor, registerMonitor, startSignatureMonitoring } from '@/lib/signatureMonitor';
import { supabaseAdmin } from '@/lib/supabase';

interface DocuSignWebhookPayload {
  event: string; // 'envelope-sent', 'recipient-delivered', 'recipient-viewed', 'recipient-completed', etc.
  data: {
    envelopeId: string;
    status: string; // 'sent', 'delivered', 'completed', etc.
    recipients?: Array<{
      recipientId: string;
      email: string;
      status: string;
      deliveredDateTime?: string;
      viewedDateTime?: string;
      signedDateTime?: string;
    }>;
    eventDateTime: string;
    userId?: string; // Our internal user ID
    callId?: string; // Vapi call ID
    signedPdfUrl?: string; // URL to signed PDF document
    propertyAddress?: string; // Property address for notification
    dealProfit?: number; // Deal profit for notification
  };
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify webhook secret
    const docusignSecret = request.headers.get('x-docusign-secret') || 
                          request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedSecret = process.env.DOCUSIGN_WEBHOOK_SECRET;

    if (expectedSecret) {
      if (!docusignSecret || docusignSecret !== expectedSecret) {
        const clientIP = getClientIP(request);
        logger.warn('Invalid DocuSign webhook secret attempt', {
          clientIP,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      logger.warn('DOCUSIGN_WEBHOOK_SECRET not configured - webhook is unsecured');
    }

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`docusign-webhook:${clientIP}`, {
      limit: 200, // 200 requests per hour
      window: '1h',
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const payload: DocuSignWebhookPayload = await request.json();
    const { event, data } = payload;

    logger.info('DocuSign webhook received', {
      event,
      envelopeId: data.envelopeId,
      status: data.status,
      callId: data.callId,
    });

    // Check Supabase client
    if (!supabaseAdmin) {
      logger.error('Supabase admin client not available');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Update call record with last_docusign_event
    if (data.callId) {
      const { error: updateError } = await (supabaseAdmin as any)
        .from('calls')
        .update({
          last_docusign_event: event,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.callId);

      if (updateError) {
        logger.error('Error updating call with DocuSign event', {
          error: updateError,
          callId: data.callId,
          event,
        });
      } else {
        logger.info('Call updated with DocuSign event', {
          callId: data.callId,
          event,
        });
      }
    }

    // Handle specific events
    switch (event) {
      case 'recipient-delivered':
        // Document was delivered to recipient
        // Trigger AI response: "I see you've got it open! Perfect. Page 1 is just the price we discussed..."
        await handleRecipientDelivered(data);
        break;

      case 'recipient-viewed':
        // Recipient opened the document
        await handleRecipientViewed(data);
        break;

      case 'recipient-completed':
        // Document was signed (ULTIMATE SUCCESS)
        // Trigger AI celebration: "Perfect, I see the signature just came through! My partners are going to start the title search..."
        await handleRecipientCompleted(data);
        break;

      case 'envelope-sent':
        // Envelope was sent
        logger.info('DocuSign envelope sent', { envelopeId: data.envelopeId });
        break;

      default:
        logger.debug('Unhandled DocuSign event', { event, envelopeId: data.envelopeId });
    }

    return NextResponse.json({ 
      status: 'ok',
      event,
      envelopeId: data.envelopeId,
    });

  } catch (error: any) {
    logger.error('Error processing DocuSign webhook', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle recipient-delivered event
 * AI should say: "I see you've got it open! Perfect. Page 1 is just the price we discussed. Page 3 is the signature line."
 * Starts the contract walkthrough
 */
async function handleRecipientDelivered(data: DocuSignWebhookPayload['data']) {
  logger.info('Recipient delivered - triggering AI response and walkthrough', {
    envelopeId: data.envelopeId,
    callId: data.callId,
  });

  // Start signature monitoring and walkthrough
  if (data.callId) {
    try {
      // Get call data for walkthrough initialization
      if (supabaseAdmin) {
        const { data: callData } = await (supabaseAdmin as any)
          .from('calls')
          .select('property_address, final_offer_price, metadata')
          .eq('id', data.callId)
          .single();

        if (callData) {
          const callDataTyped = callData as any;
          // Start signature monitor with walkthrough
          const monitor = await startSignatureMonitoring({
            callId: data.callId,
            envelopeId: data.envelopeId,
            recipientEmail: data.recipients?.[0]?.email || '',
            vapiCallId: callDataTyped?.metadata?.vapiCallId,
            onStatusChange: async (status) => {
              // Update database when status changes
              if (supabaseAdmin) {
                await (supabaseAdmin as any)
                  .from('calls')
                  .update({
                    last_docusign_event: status.status,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', data.callId);
              }
            },
          });

          // Initialize walkthrough with deal details
          if (callDataTyped.property_address && callDataTyped.final_offer_price) {
            monitor.initializeWalkthrough(
              'Seller', // Could be extracted from call metadata
              callDataTyped.property_address,
              callDataTyped.final_offer_price,
              100 // Earnest money
            );
          }

          registerMonitor(data.callId, monitor);
        }
      }

      // Update sandbox_battles if this is a training battle
      if (supabaseAdmin) {
        const { error } = await (supabaseAdmin as any)
          .from('sandbox_battles')
          .update({
            document_status: 'delivered',
            updated_at: new Date().toISOString(),
          })
          .eq('closer_thread_id', data.callId);

        if (error && !error.message.includes('No rows')) {
          logger.error('Error updating battle with delivered status', { error });
        }
      }
    } catch (error) {
      logger.error('Error starting signature monitor', { error, callId: data.callId });
    }
  }
}

/**
 * Handle recipient-viewed event
 */
async function handleRecipientViewed(data: DocuSignWebhookPayload['data']) {
  logger.info('Recipient viewed document', {
    envelopeId: data.envelopeId,
    callId: data.callId,
  });

  // Update document status
  if (data.callId) {
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (supabaseAdmin) {
      const { error } = await (supabaseAdmin as any)
        .from('sandbox_battles')
        .update({
          document_status: 'viewed',
          updated_at: new Date().toISOString(),
        })
        .eq('closer_thread_id', data.callId);

      if (error && !error.message.includes('No rows')) {
        logger.error('Error updating battle with viewed status', { error });
      }
    }

    // Notify active signature monitor
    const { getActiveMonitor } = await import('@/lib/signatureMonitor');
    const monitor = getActiveMonitor(data.callId);
    if (monitor) {
      await monitor.updateStatusFromWebhook({
        envelopeId: data.envelopeId,
        status: 'viewed',
        callId: data.callId,
        viewedAt: new Date(data.eventDateTime),
      });
    }
  }
}

/**
 * Handle recipient-completed event (ULTIMATE SUCCESS)
 * AI should celebrate: "Perfect, I see the signature just came through! My partners are going to start the title search immediately."
 */
async function handleRecipientCompleted(data: DocuSignWebhookPayload['data']) {
  logger.info('🎉 RECIPIENT COMPLETED - ULTIMATE SUCCESS!', {
    envelopeId: data.envelopeId,
    callId: data.callId,
  });

  const { supabaseAdmin } = await import('@/lib/supabase');
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available');
    return;
  }

  // Get call data to calculate time_to_sign
  let callData: any = null;
  if (data.callId) {
    const { data: call, error: callError } = await (supabaseAdmin as any)
      .from('calls')
      .select('created_at, property_address, final_offer_price, suggested_buy_price')
      .eq('id', data.callId)
      .single();

    if (!callError && call) {
      callData = call;
    }
  }

  // Calculate time_to_sign (from call start to signature completion)
  const timeToSign = callData?.created_at
    ? Math.floor((new Date(data.eventDateTime).getTime() - new Date(callData.created_at).getTime()) / 1000)
    : null;

  // Update calls table with signed PDF URL and time_to_sign
  if (data.callId) {
    const updateData: any = {
      last_docusign_event: 'recipient-completed',
      updated_at: new Date().toISOString(),
    };

    if (data.signedPdfUrl) {
      updateData.signed_pdf_url = data.signedPdfUrl;
    }

    if (timeToSign !== null) {
      updateData.time_to_sign = timeToSign; // in seconds
    }

    const { error: updateError } = await (supabaseAdmin as any)
      .from('calls')
      .update(updateData)
      .eq('id', data.callId);

    if (updateError) {
      logger.error('Error updating call with signature data', {
        error: updateError,
        callId: data.callId,
      });
    } else {
      logger.info('✅ Call updated with signature data', {
        callId: data.callId,
        timeToSign,
        hasPdfUrl: !!data.signedPdfUrl,
      });
    }
  }

  // Update sandbox_battles with completed status
  if (data.callId) {
    const { error } = await (supabaseAdmin as any)
      .from('sandbox_battles')
      .update({
        document_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('closer_thread_id', data.callId);

    if (error && !error.message.includes('No rows')) {
      logger.error('Error updating battle with completed status', { error });
    } else {
      logger.info('✅ Battle marked as completed (ULTIMATE SUCCESS)');
    }
  }

  // Send victory SMS notification
  if (data.callId && data.propertyAddress && data.dealProfit) {
    await sendVictorySMS({
      callId: data.callId,
      propertyAddress: data.propertyAddress,
      dealProfit: data.dealProfit,
      envelopeId: data.envelopeId,
      signedPdfUrl: data.signedPdfUrl,
    });
  } else if (callData && data.callId) {
    // Try to calculate profit from call data
    const profit = callData.final_offer_price && callData.suggested_buy_price
      ? callData.final_offer_price - callData.suggested_buy_price
      : data.dealProfit || 0;

    if (callData.property_address && profit > 0) {
      await sendVictorySMS({
        callId: data.callId,
        propertyAddress: callData.property_address,
        dealProfit: profit,
        envelopeId: data.envelopeId,
        signedPdfUrl: data.signedPdfUrl,
      });
    }
  }

  // Notify active signature monitor of completion
  if (data.callId) {
    const { getActiveMonitor } = await import('@/lib/signatureMonitor');
    const monitor = getActiveMonitor(data.callId);
    if (monitor) {
    await monitor.updateStatusFromWebhook({
      envelopeId: data.envelopeId,
      status: 'completed',
      callId: data.callId,
      completedAt: new Date(data.eventDateTime),
      signedPdfUrl: data.signedPdfUrl,
    });
    }
  }

  // TODO: Send real-time celebration message to Vapi call
  // This will trigger the AI to say the celebration script
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'DocuSign webhook endpoint is active',
  });
}
