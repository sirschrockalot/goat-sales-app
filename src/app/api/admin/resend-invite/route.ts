/**
 * Admin Resend Invite API
 * Resends an invitation email to a pending user
 * SECURITY: Strictly checks is_admin flag
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
      console.warn(`[SECURITY] Non-admin user ${user.id} attempted to resend invite`);
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
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (getUserError || !existingUser?.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has already confirmed email
    if (existingUser.user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'User has already confirmed their email' },
        { status: 400 }
      );
    }

    // Preserve existing training_path from user metadata if it exists
    const existingTrainingPath = existingUser.user.user_metadata?.training_path || null;

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
      console.error('Error resending invitation:', inviteError);
      return NextResponse.json(
        { error: 'Failed to resend invitation', details: inviteError.message },
        { status: 500 }
      );
    }

    // Log successful resend (for audit trail)
    console.log(`[ADMIN] User ${user.id} (${user.email}) resent invitation to ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      email: email,
      resentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in POST /api/admin/resend-invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
