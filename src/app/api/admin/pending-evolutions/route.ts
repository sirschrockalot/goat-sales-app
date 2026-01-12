/**
 * Pending Evolutions API
 * Fetches prompt versions pending admin review
 */

import { NextRequest, NextResponse } from 'next/server';

import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { getPendingEvolutions, getVersionHistory } from '@/lib/getPendingEvolutions';
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

    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('assistantId');
    const type = searchParams.get('type') || 'pending'; // 'pending' or 'history'

    if (type === 'history' && assistantId) {
      const history = await getVersionHistory(assistantId);
      return NextResponse.json({ evolutions: history });
    }

    const pending = await getPendingEvolutions();
    return NextResponse.json({ evolutions: pending });
  } catch (error) {
    logger.error('Error in pending evolutions API', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
