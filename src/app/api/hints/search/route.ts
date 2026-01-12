/**
 * Hint Search API
 * Uses Supabase match_rebuttals function to find relevant Eric Cline responses
 */

import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 1 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      );
    }

    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Call the match_rebuttals function in Supabase
    // This function performs similarity search on the rebuttals table
    // Adjust parameters based on your actual function signature
    const { data, error } = await (supabaseAdmin as any).rpc('match_rebuttals', {
      query_text: query, // Text query for similarity search
      match_threshold: 0.7, // Similarity threshold (0-1)
      match_count: limit, // Number of results to return
    } as any);

    if (error) {
      logger.error('Error calling match_rebuttals', { error, query });
      
      // Fallback: If the function doesn't exist or uses different parameters,
      // try a text-based search on the rebuttals table
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('rebuttals')
        .select('*')
        .ilike('content', `%${query}%`)
        .limit(limit);

      if (fallbackError) {
        return NextResponse.json(
          { error: 'Failed to search rebuttals' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        hints: fallbackData || [],
      });
    }

    return NextResponse.json({
      hints: data || [],
    });
  } catch (error) {
    logger.error('Error in POST /api/hints/search', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
