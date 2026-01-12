/**
 * AI Optimizations API
 * Fetches and manages AI learning moments and prompt optimizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !(profile as any).is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('assistantId');
    const applied = searchParams.get('applied');
    const priority = searchParams.get('priority');

    // Build query
    let query = supabaseAdmin!
      .from('ai_optimizations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (assistantId) {
      query = query.eq('assistant_id', assistantId);
    }

    if (applied !== null) {
      query = query.eq('applied', applied === 'true');
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching AI optimizations', { error });
      return NextResponse.json(
        { error: 'Failed to fetch optimizations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ optimizations: data || [] });
  } catch (error) {
    logger.error('Error in AI optimizations API', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
