/**
 * Budget Status API
 * Returns current budget status for training dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBudgetSummary } from '@/lib/budgetMonitor';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const { user, error: authError } = await getUserFromRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const summary = await getBudgetSummary();

    return NextResponse.json(summary);
  } catch (error) {
    logger.error('Error in GET /api/sandbox/budget-status', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
