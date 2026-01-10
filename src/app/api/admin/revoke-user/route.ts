/**
 * Admin Revoke User API
 * Deletes a user from the system (Access Kill Switch)
 * SECURITY: Strictly checks is_admin flag and prevents self-deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createSupabaseClient } from '@/lib/supabase';

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

    // SECURITY: Strictly check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      console.warn(`[SECURITY] Non-admin user ${user.id} attempted to revoke user access`);
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
      console.warn(`[SECURITY] Admin ${user.id} attempted to delete their own account`);
      return NextResponse.json(
        { error: 'Cannot revoke your own access' },
        { status: 403 }
      );
    }

    // Delete user via Supabase Admin SDK
    // This will cascade delete their profile and calls due to foreign key constraints
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to revoke user access', details: deleteError.message },
        { status: 500 }
      );
    }

    // Log successful deletion (for audit trail)
    console.log(`[ADMIN] User ${user.id} (${user.email}) revoked access for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'User access revoked successfully',
      userId: userId,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/revoke-user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
