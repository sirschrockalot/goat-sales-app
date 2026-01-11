/**
 * Voice Performance API
 * Returns voice performance statistics for the Admin Dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getVoicePerformanceStats, getOptimalStability } from '@/lib/voicePerformance';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin status
    const { user, error: authError } = await getUserFromRequest(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get voice performance stats
    const stats = await getVoicePerformanceStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching voice performance stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to enable/disable auto-optimize
 * When enabled, sets global stability to optimal value
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin status
    const { user, error: authError } = await getUserFromRequest(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { autoOptimize } = body;

    if (typeof autoOptimize !== 'boolean') {
      return NextResponse.json(
        { error: 'autoOptimize must be a boolean' },
        { status: 400 }
      );
    }

    // Get optimal stability if auto-optimize is enabled
    let optimalStability: number | null = null;
    if (autoOptimize) {
      optimalStability = await getOptimalStability(100);
    }

    // Store auto-optimize setting in a config table or environment variable
    // For now, we'll return the optimal stability value
    // In production, you might want to store this in a settings table

    return NextResponse.json({
      success: true,
      autoOptimize,
      optimalStability,
    });
  } catch (error) {
    console.error('Error updating auto-optimize setting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
