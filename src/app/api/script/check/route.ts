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
    const body: ScriptCheckRequest = await request.json();
    const { transcript, currentGate, mode = 'acquisition' } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript text is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the transcript
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: transcript.trim(),
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Use appropriate RPC function based on mode
    const rpcFunction = mode === 'disposition' ? 'match_dispo_script_segments' : 'match_script_segments';

    // Call the appropriate RPC function in Supabase
    const { data, error } = await supabaseAdmin.rpc(rpcFunction, {
      query_embedding: queryEmbedding,
      match_threshold: 0.3, // Lower threshold to get all gates
      match_count: 5, // Get all 5 gates
    });

    if (error) {
      console.error('Error calling match_script_segments:', error);
      return NextResponse.json(
        { error: 'Failed to check script adherence', details: error.message },
        { status: 500 }
      );
    }

    // Format results - ensure we have all 5 gates
    const gateNames = mode === 'disposition'
      ? [
          'The Intro (Value Proposition)',
          'Fact Find (ARV & Condition)',
          'The Pitch (Neighborhood Context)',
          'The Offer (Timeline & Terms)',
          'The Close (Agreement & Next Steps)',
        ]
      : [
          'The Intro (Approval/Denial)',
          'Fact Find (The Why)',
          'The Pitch (Inside/Outside)',
          'The Offer (Virtual Withdraw)',
          'The Close (Agreement)',
        ];

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
          ? Math.min(5, currentGate + 1)
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
