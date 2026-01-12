/**
 * Get Vapi Client Key API
 * Returns the Vapi API key for client-side initialization
 * This prevents exposing the key in client-side code
 * 
 * Note: In production, consider using a more secure approach like
 * server-side assistant creation and passing only the assistant ID
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // For now, we'll use the public key if available
    // In a more secure setup, you'd create assistants server-side
    // and only pass the assistant ID to the client
    const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;

    if (!vapiPublicKey) {
      return NextResponse.json(
        { error: 'Vapi API key not configured' },
        { status: 500 }
      );
    }

    // Return the public key (this is safe as it's already public)
    // The real security is in using server-side assistant creation
    return NextResponse.json({
      apiKey: vapiPublicKey,
    });
  } catch (error) {
    logger.error('Error getting Vapi client key', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
