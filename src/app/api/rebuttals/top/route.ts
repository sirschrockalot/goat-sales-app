/**
 * Top Rebuttals API
 * Returns the best rebuttals of the day from the database
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('id, rebuttal_of_the_day, goat_score, persona_mode, created_at, user_id')
      .not('rebuttal_of_the_day', 'is', null)
      .neq('rebuttal_of_the_day', 'None')
      .order('goat_score', { ascending: false })
      .limit(5);

    if (error) {
      logger.error('Error fetching top rebuttals', { error });
      return NextResponse.json(
        { error: 'Failed to fetch rebuttals' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('Error in GET /api/rebuttals/top', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
