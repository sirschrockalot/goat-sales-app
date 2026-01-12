/**
 * Rebuttal Search API Route
 * Searches for similar Eric Cline rebuttals using embeddings and match_rebuttals RPC
 * Optimized for Edge Runtime for lowest latency
 */

import { NextRequest, NextResponse } from 'next/server';

import OpenAI from 'openai';

import logger from '@/lib/logger';

// Note: Removed Edge Runtime due to winston/logger dependency
// Using Node.js runtime for full compatibility

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SearchRequest {
  query: string;
  limit?: number;
}

interface RebuttalResult {
  id: string;
  rebuttal_text: string;
  context?: string;
  similarity?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const { query, limit = 3 } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the query text
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.trim(),
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Call the match_rebuttals RPC function in Supabase
    const { data, error } = await (supabaseAdmin as any).rpc('match_rebuttals', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5, // Lower threshold to get more results
      match_count: limit,
    } as any);

    if (error) {
      logger.error('Error calling match_rebuttals', { error, query });
      
      // Fallback: Try text-based search if RPC fails
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('rebuttals')
        .select('id, rebuttal_text, context')
        .ilike('rebuttal_text', `%${query}%`)
        .limit(limit);

      if (fallbackError) {
        return NextResponse.json(
          { error: 'Failed to search rebuttals', details: fallbackError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        results: ((fallbackData as any[]) || []).map((r: any) => ({
          id: r.id,
          rebuttal_text: r.rebuttal_text,
          context: r.context || null,
        })),
      });
    }

    // Format results
    const results: RebuttalResult[] = (data || []).map((item: any) => ({
      id: item.id || item.rebuttal_id,
      rebuttal_text: item.rebuttal_text || item.content || item.text,
      context: item.context || item.situation || null,
      similarity: item.similarity || null,
    }));

    return NextResponse.json({
      results,
      query: query.substring(0, 100), // Return truncated query for reference
    });
  } catch (error) {
    logger.error('Error in POST /api/rebuttals/search', { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Rebuttal search endpoint is active',
    model: 'text-embedding-3-small',
  });
}
