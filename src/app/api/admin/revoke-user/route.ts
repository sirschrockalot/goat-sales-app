/**
 * Admin Revoke User API
 * Deletes a user from the system (Access Kill Switch)
 * SECURITY: Strictly checks is_admin flag and prevents self-deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
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

    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    // SECURITY: Strictly check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !(profile as any).is_admin) {
      logger.warn('Non-admin user attempted to revoke user access', { userId: user.id });
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // SAFETY CHECK: Prevent admin from deleting their own account
    if (userId === user.id) {
      logger.warn('Admin attempted to delete their own account', { adminId: user.id });
      return NextResponse.json(
        { error: 'Cannot revoke your own access' },
        { status: 403 }
      );
    }

    // Delete user via Supabase Admin SDK
    // This will cascade delete their profile and calls due to foreign key constraints
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      logger.error('Error deleting user', { error: deleteError, userId });
      return NextResponse.json(
        { error: 'Failed to revoke user access', details: deleteError.message },
        { status: 500 }
      );
    }

    // Log successful deletion (for audit trail)
    logger.info('Admin revoked user access', { adminId: user.id, adminEmail: user.email, revokedUserId: userId });

    return NextResponse.json({
      success: true,
      message: 'User access revoked successfully',
      userId: userId,
    });
  } catch (error) {
    logger.error('Error in POST /api/admin/revoke-user', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
