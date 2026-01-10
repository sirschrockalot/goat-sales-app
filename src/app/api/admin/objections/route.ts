/**
 * Admin Objections API
 * Returns objection trend data for the last 7 days
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { data: recentCalls } = await supabaseAdmin
      .from('calls')
      .select('transcript')
      .gte('created_at', sevenDaysAgo.toISOString())
      .not('transcript', 'is', null);

    // Categorize objections from transcripts
    const objectionCounts: Record<string, number> = {
      'Price Too Low': 0,
      'Need to Talk to Spouse': 0,
      'Need Time to Think': 0,
      'Not Ready to Sell': 0,
      'Other': 0,
    };

    recentCalls?.forEach((call) => {
      const transcript = call.transcript?.toLowerCase() || '';
      let categorized = false;

      if (transcript.includes('price') || transcript.includes('too low') || transcript.includes('offer') || transcript.includes('worth more')) {
        objectionCounts['Price Too Low']++;
        categorized = true;
      }
      if (transcript.includes('spouse') || transcript.includes('wife') || transcript.includes('husband') || transcript.includes('partner') || transcript.includes('talk to')) {
        objectionCounts['Need to Talk to Spouse']++;
        categorized = true;
      }
      if (transcript.includes('think') || transcript.includes('consider') || transcript.includes('decide')) {
        objectionCounts['Need Time to Think']++;
        categorized = true;
      }
      if (transcript.includes('not ready') || transcript.includes('not selling') || transcript.includes('not interested')) {
        objectionCounts['Not Ready to Sell']++;
        categorized = true;
      }
      if (!categorized) {
        objectionCounts['Other']++;
      }
    });

    const trends = Object.entries(objectionCounts)
      .map(([objection, count]) => ({ objection, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Error fetching objection trends:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
