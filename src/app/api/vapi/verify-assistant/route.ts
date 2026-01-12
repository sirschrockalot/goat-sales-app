/**
 * Verify Vapi Assistant API
 * Checks if an assistant exists and is published before starting a call
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let assistantId: string | null = null;
  try {
    assistantId = searchParams.get('assistantId');

    if (!assistantId) {
      return NextResponse.json(
        { error: 'assistantId is required' },
        { status: 400 }
      );
    }

    const vapiSecretKey = process.env.VAPI_SECRET_KEY;
    if (!vapiSecretKey) {
      return NextResponse.json(
        { error: 'VAPI_SECRET_KEY not configured' },
        { status: 500 }
      );
    }

    // Verify assistant exists and get its status
    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({
          exists: false,
          published: false,
          error: 'Assistant not found',
        });
      }
      
      const errorText = await response.text();
      return NextResponse.json({
        exists: false,
        published: false,
        error: `API error: ${response.status} - ${errorText}`,
      }, { status: response.status });
    }

    const assistant = await response.json();
    
    return NextResponse.json({
      exists: true,
      published: assistant.published || false,
      name: assistant.name,
      voice: assistant.voice,
      status: assistant.status,
      // Include any error messages from the assistant
      error: assistant.error,
    });
  } catch (error) {
    logger.error('Error verifying assistant', { error, assistantId });
    return NextResponse.json(
      {
        exists: false,
        published: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
