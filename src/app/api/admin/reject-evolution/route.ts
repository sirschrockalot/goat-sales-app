/**
 * Reject Evolution API
 * Rejects a pending prompt evolution
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { evolutionId, reason } = body;

    if (!evolutionId) {
      return NextResponse.json(
        { error: 'evolutionId is required' },
        { status: 400 }
      );
    }

    // Update the evolution to rejected
    const { error: updateError } = await supabaseAdmin
      .from('prompt_versions')
      .update({
        status: 'rejected',
        is_active: false,
        rollback_reason: reason || 'Rejected by admin',
        rolled_back_at: new Date().toISOString(),
      })
      .eq('id', evolutionId);

    if (updateError) {
      logger.error('Error rejecting evolution', { error: updateError, evolutionId });
      return NextResponse.json(
        { error: 'Failed to reject evolution' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Evolution rejected',
      evolutionId,
    });
  } catch (error) {
    logger.error('Error rejecting evolution', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
