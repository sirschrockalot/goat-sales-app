/**
 * Training Analytics API
 * Returns comprehensive training progress data for admin dashboard
 * SECURITY: Strictly checks is_admin flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createSupabaseClient } from '@/lib/supabase';
import { getTrainingAnalytics } from '@/lib/getTrainingAnalytics';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // SECURITY: Strictly check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      console.warn(`[SECURITY] Non-admin user ${user.id} attempted to access training analytics`);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get training analytics
    const analytics = await getTrainingAnalytics();

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error in GET /api/admin/training-analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
