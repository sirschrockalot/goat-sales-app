/**
 * Script Adherence Check API
 * Checks transcript similarity against script segments using embeddings
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ScriptCheckRequest {
  transcript: string;
  currentGate?: number; // Optional: current gate to focus on
  mode?: 'acquisition' | 'disposition'; // Script mode
}

interface GateSimilarity {
  gate: number;
  gateName: string;
  similarity: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_') || process.env.OPENAI_API_KEY.includes('placeholder')) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured', details: 'OPENAI_API_KEY is missing or invalid' },
        { status: 500 }
      );
    }

    const body: ScriptCheckRequest = await request.json();
    const { transcript, currentGate, mode = 'acquisition' } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript text is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the transcript
    let queryEmbedding: number[];
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: transcript.trim(),
      });

      if (!embeddingResponse.data || !embeddingResponse.data[0] || !embeddingResponse.data[0].embedding) {
        throw new Error('Invalid embedding response from OpenAI');
      }

      queryEmbedding = embeddingResponse.data[0].embedding;
    } catch (embeddingError) {
      console.error('Error generating embedding:', embeddingError);
      return NextResponse.json(
        { 
          error: 'Failed to generate embedding', 
          details: embeddingError instanceof Error ? embeddingError.message : 'Unknown embedding error',
          hint: 'Check OPENAI_API_KEY and OpenAI API status'
        },
        { status: 500 }
      );
    }

    // Define gate names before using them (needed for error handling)
    const gateNames = mode === 'disposition'
      ? [
          'The Intro (Value Proposition)',
          'Fact Find (ARV & Condition)',
          'The Pitch (Neighborhood Context)',
          'The Offer (Timeline & Terms)',
          'The Close (Agreement & Next Steps)',
        ]
      : [
          'Intro (Contact/Credibility)',
          'Fact Find - Motivation',
          'Fact Find - Condition',
          'Transition to Numbers',
          'Running Comps / Hold',
          'The Offer',
          'The Close - Expectations',
          'Final Commitment',
        ];

    // Use appropriate RPC function based on mode
    const rpcFunction = mode === 'disposition' ? 'match_dispo_script_segments' : 'match_script_segments';
    
    // Helper function to return empty results (used when RPC function doesn't exist)
    const returnEmptyResults = (warning?: string) => {
      return NextResponse.json({
        gates: gateNames.map((name, index) => ({
          gate: index + 1,
          gateName: name,
          similarity: 0,
        })),
        adherenceScore: 0,
        recommendedGate: currentGate || 1,
        currentGate: currentGate || 1,
        ...(warning && { warning }),
      });
    };

    // Call the appropriate RPC function in Supabase
    let data: any;
    let error: any;
    try {
      const result = await supabaseAdmin.rpc(rpcFunction, {
        query_embedding: queryEmbedding,
        match_threshold: 0.3, // Lower threshold to get all gates
        match_count: 8, // Get all 8 gates
      });
      data = result.data;
      error = result.error;
    } catch (rpcError) {
      console.error('Error calling RPC function:', rpcError);
      
      // If RPC function doesn't exist, return empty results instead of error
      // This allows the UI to continue working even if script tracking isn't fully set up
      const errorMessage = rpcError instanceof Error ? rpcError.message : String(rpcError);
      if (errorMessage.includes('function') && (errorMessage.includes('does not exist') || errorMessage.includes('not found'))) {
        console.warn(`RPC function ${rpcFunction} does not exist. Returning empty results.`);
        return returnEmptyResults(`Script tracking RPC function "${rpcFunction}" not found in database. This feature requires database setup.`);
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to call Supabase RPC function', 
          details: errorMessage,
          rpcFunction,
          hint: `The RPC function "${rpcFunction}" may not exist in Supabase. Check your database migrations.`
        },
        { status: 500 }
      );
    }

    if (error) {
      console.error(`Error calling ${rpcFunction}:`, error);
      
      // If RPC function doesn't exist, return empty results instead of error
      // This allows the UI to continue working even if script tracking isn't fully set up
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('function') && (errorMessage.includes('does not exist') || errorMessage.includes('not found'))) {
        console.warn(`RPC function ${rpcFunction} does not exist. Returning empty results.`);
        return returnEmptyResults(`Script tracking RPC function "${rpcFunction}" not found in database. This feature requires database setup.`);
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to check script adherence', 
          details: errorMessage,
          rpcFunction,
          hint: `The RPC function "${rpcFunction}" may not exist or may have incorrect parameters. Check your Supabase database.`
        },
        { status: 500 }
      );
    }

    // Format results - ensure we have all gates (gateNames already defined above)
    const results: GateSimilarity[] = gateNames.map((name, index) => {
      const gateNumber = index + 1;
      // Find matching result from RPC
      const match = (data || []).find((item: any) => 
        item.gate === gateNumber || item.gate_number === gateNumber
      );

      return {
        gate: gateNumber,
        gateName: name,
        similarity: match?.similarity || 0,
      };
    });

    // Sort by similarity (descending)
    results.sort((a, b) => b.similarity - a.similarity);

    // Calculate overall adherence score (average of all gates)
    const adherenceScore = Math.round(
      results.reduce((sum, r) => sum + r.similarity, 0) / results.length * 100
    );

    // Determine recommended next gate
    const recommendedGate = currentGate 
      ? (results.find(r => r.gate === currentGate)?.similarity || 0) > 0.75
          ? Math.min(mode === 'disposition' ? 5 : 8, currentGate + 1)
          : currentGate
      : results[0]?.gate || 1;

    return NextResponse.json({
      gates: results,
      adherenceScore,
      recommendedGate,
      currentGate: currentGate || 1,
    });
  } catch (error) {
    console.error('Error in POST /api/script/check:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
