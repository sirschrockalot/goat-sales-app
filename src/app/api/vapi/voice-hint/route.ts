/**
 * Voice Hint API
 * Sends voice hints to live Vapi calls using Control URL
 */

import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';

interface VoiceHintRequest {
  callId: string;
  message: string;
}

export async function POST(request: NextRequest) {
  let callId: string | undefined;
  let message: string | undefined;
  try {
    const body: VoiceHintRequest = await request.json();
    callId = body.callId;
    message = body.message;

    if (!callId || !message) {
      return NextResponse.json(
        { error: 'callId and message are required' },
        { status: 400 }
      );
    }

    // Get Vapi secret key
    const vapiSecretKey = process.env.VAPI_SECRET_KEY;
    if (!vapiSecretKey) {
      return NextResponse.json(
        { error: 'VAPI_SECRET_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch call record to get control URL
    // Note: In production, you might store controlUrl in the calls table or get it from Vapi API
    // For now, we'll construct it from the callId
    const controlUrl = `https://api.vapi.ai/call/${callId}/control`;

    // Send control message to Vapi
    const response = await fetch(controlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'say',
        content: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Vapi control API error', { error: errorText, callId });
      return NextResponse.json(
        { error: 'Failed to send voice hint', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Optionally log the hint in the database
    try {
      // Get supabaseAdmin
      const { supabaseAdmin } = await import('@/lib/supabase');
      if (!supabaseAdmin) {
        // If database not available, still return success for the voice hint
        return NextResponse.json({ success: true, message: 'Voice hint sent' });
      }

      const { data: existingCall } = await supabaseAdmin
        .from('calls')
        .select('metadata')
        .eq('id', callId)
        .single();

      await (supabaseAdmin as any)
        .from('calls')
        .update({
          metadata: {
            ...((existingCall as any)?.metadata || {}),
            lastVoiceHint: {
              message,
              timestamp: new Date().toISOString(),
            },
          },
        } as any)
        .eq('id', callId);
    } catch (dbError) {
      // Non-critical - log but don't fail
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error logging voice hint', { error: dbError, callId });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Voice hint sent',
      result,
    });
  } catch (error) {
    logger.error('Error sending voice hint', { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
