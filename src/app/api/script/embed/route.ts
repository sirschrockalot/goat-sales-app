/**
 * Script Segment Embedding API
 * Generates embeddings for script segments (called via webhook when segments are inserted)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { segmentId, scriptText } = body;

    if (!segmentId || !scriptText) {
      return NextResponse.json(
        { error: 'segmentId and scriptText are required' },
        { status: 400 }
      );
    }

    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: scriptText.trim(),
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Determine which table to update based on table parameter or segmentId lookup
    const { table = 'script_segments' } = body;
    const tableName = table === 'dispo' ? 'dispo_script_segments' : 'script_segments';

    // Update the segment with the embedding
    const { error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({ embedding })
      .eq('id', segmentId);

    if (updateError) {
      console.error('Error updating script segment embedding:', updateError);
      return NextResponse.json(
        { error: 'Failed to update embedding' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      segmentId,
      embedding_length: embedding.length,
    });
  } catch (error) {
    console.error('Error generating script segment embedding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
