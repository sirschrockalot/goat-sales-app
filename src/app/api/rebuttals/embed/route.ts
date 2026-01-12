/**
 * Rebuttal Embedding API Route
 * Generates AI embeddings for new rebuttals via Supabase webhook
 * 
 * This route is called automatically when a new row is inserted into the rebuttals table.
 * It generates an embedding using OpenAI and updates the row with the embedding vector.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';
import logger from '@/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Optional: Add a secret header for additional security
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET;

interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    rebuttal_text: string;
    embedding?: number[] | null;
    [key: string]: any;
  };
  old_record?: {
    id: string;
    [key: string]: any;
  };
}

/**
 * Generate embedding using OpenAI text-embedding-3-small model
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    logger.error('Error generating embedding', { error });
    throw new Error('Failed to generate embedding');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify webhook secret for security
    if (WEBHOOK_SECRET) {
      const secretHeader = request.headers.get('x-webhook-secret');
      if (secretHeader !== WEBHOOK_SECRET) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const payload: SupabaseWebhookPayload = await request.json();

    // Validate payload structure
    if (!payload.type || !payload.table || !payload.record) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Only process INSERT events for the rebuttals table
    if (payload.type !== 'INSERT' || payload.table !== 'rebuttals') {
      return NextResponse.json(
        { received: true, message: 'Event ignored' },
        { status: 200 }
      );
    }

    const { id, rebuttal_text } = payload.record;

    // Validate required fields
    if (!id || !rebuttal_text) {
      return NextResponse.json(
        { error: 'Missing required fields: id or rebuttal_text' },
        { status: 400 }
      );
    }

    // Check if embedding already exists (skip if present)
    if (payload.record.embedding && Array.isArray(payload.record.embedding)) {
      return NextResponse.json(
        { received: true, message: 'Embedding already exists' },
        { status: 200 }
      );
    }

    // Generate embedding
    const embedding = await generateEmbedding(rebuttal_text);

    // Update the row with the embedding using Supabase Admin client (bypasses RLS)
    const { error: updateError } = await supabaseAdmin
      .from('rebuttals')
      .update({ embedding })
      .eq('id', id);

    if (updateError) {
      logger.error('Error updating embedding', { error: updateError, rebuttalId: id });
      return NextResponse.json(
        { error: 'Failed to update embedding', details: updateError.message },
        { status: 500 }
      );
    }


    return NextResponse.json({
      success: true,
      id,
      embedding_length: embedding.length,
      message: 'Embedding generated and stored successfully',
    });
  } catch (error) {
    logger.error('Error processing webhook', { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification/testing)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Rebuttal embedding webhook endpoint is active',
    model: 'text-embedding-3-small',
    vector_dimension: 1536,
  });
}
