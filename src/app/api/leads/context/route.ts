/**
 * Lead Context API
 * Returns fact-finding data and history for a phone number
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phone');

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize phone number (remove formatting)
    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    // Search for calls with this phone number
    // Note: This assumes phone numbers are stored in calls table or a separate leads table
    // Adjust based on your schema
    const { data: calls } = await supabaseAdmin
      .from('calls')
      .select('id, transcript, goat_score, logic_gates, created_at')
      .ilike('transcript', `%${normalizedPhone}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    // Extract fact-finding data from transcripts
    let factFinding = null;
    let previousCalls = 0;
    let lastScore = null;

    if (calls && calls.length > 0) {
      previousCalls = calls.length;
      lastScore = calls[0].goat_score;

      // Try to extract "The Why" from logic gates or transcript
      const latestCall = calls[0];
      if (latestCall.logic_gates) {
        const whyGate = (latestCall.logic_gates as Array<any>).find(
          (gate) => gate.name?.includes('Why') || gate.name?.includes('Fact-Finding')
        );
        if (whyGate?.passed && latestCall.transcript) {
          // Extract motivation from transcript (simplified - could use AI)
          const transcript = latestCall.transcript.toLowerCase();
          if (transcript.includes('tax')) factFinding = 'Tax burden';
          else if (transcript.includes('probate')) factFinding = 'Probate';
          else if (transcript.includes('moving')) factFinding = 'Moving';
          else if (transcript.includes('divorce')) factFinding = 'Divorce';
          else factFinding = 'Motivation identified in previous call';
        }
      }
    }

    // If you have a separate leads/contacts table, query that too
    // const { data: lead } = await supabaseAdmin
    //   .from('leads')
    //   .select('*')
    //   .eq('phone_number', normalizedPhone)
    //   .single();

    return NextResponse.json({
      phoneNumber: normalizedPhone,
      factFinding,
      previousCalls,
      lastScore,
      // lead: lead || null,
    });
  } catch (error) {
    console.error('Error fetching lead context:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
