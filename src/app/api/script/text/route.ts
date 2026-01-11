/**
 * Get Script Text API
 * Returns the script text for a specific gate
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error: authError } = await getUserFromRequest(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const gateNumberParam = searchParams.get('gateNumber');
    const mode = (searchParams.get('mode') || 'acquisition') as 'acquisition' | 'disposition';

    // Select the correct table based on mode
    const tableName = mode === 'disposition' ? 'dispo_script_segments' : 'script_segments';

    // If gateNumber is "all", return all segments
    if (gateNumberParam === 'all') {
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('gate_number, gate_name, script_text, keywords')
        .order('gate_number', { ascending: true });

      if (error || !data) {
        return NextResponse.json(
          { error: 'Scripts not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        segments: data.map(segment => ({
          gate_number: segment.gate_number,
          gate_name: segment.gate_name,
          script_text: segment.script_text,
          keywords: segment.keywords || [],
        })),
      });
    }

    // Otherwise, get a specific gate
    const gateNumber = parseInt(gateNumberParam || '1');

    if (gateNumber < 1 || gateNumber > 8) {
      return NextResponse.json(
        { error: 'Invalid gate number' },
        { status: 400 }
      );
    }

    // Get script text for the specified gate
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('gate_number, gate_name, script_text')
      .eq('gate_number', gateNumber)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      gate_number: data.gate_number,
      gate_name: data.gate_name,
      script_text: data.script_text,
    });
  } catch (error) {
    console.error('Error fetching script text:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
