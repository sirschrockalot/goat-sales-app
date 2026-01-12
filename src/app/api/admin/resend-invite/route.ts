/**
 * Admin Resend Invite API
 * Resends an invitation email to a pending user
 * SECURITY: Strictly checks is_admin flag
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
      logger.warn('Non-admin user attempted to resend invite', { userId: user.id });
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Check if user exists and is pending
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = usersList?.users?.find((u: any) => u.email === email);

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has already confirmed email
    if ((existingUser as any).email_confirmed_at) {
      return NextResponse.json(
        { error: 'User has already confirmed their email' },
        { status: 400 }
      );
    }

    // Preserve existing training_path from user metadata if it exists
    const existingTrainingPath = (existingUser as any).user_metadata?.training_path || null;

    // Resend invitation via Supabase Admin SDK
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          resent: true,
          training_path: existingTrainingPath, // Preserve training path
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding`,
      }
    );

    if (inviteError) {
      logger.error('Error resending invitation', { error: inviteError, email });
      return NextResponse.json(
        { error: 'Failed to resend invitation', details: inviteError.message },
        { status: 500 }
      );
    }

    // Log successful resend (for audit trail)
    logger.info('Admin resent invitation', { adminId: user.id, adminEmail: user.email, invitedEmail: email });

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      email: email,
      resentAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in POST /api/admin/resend-invite', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
