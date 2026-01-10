/**
 * Admin Invite API
 * Allows admins to invite new users via email
 * SECURITY: Strictly checks is_admin flag before allowing invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from request
    const supabase = createSupabaseClient();
    
    // Extract auth token from cookies or headers
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '') || 
                       request.cookies.get('sb-access-token')?.value ||
                       request.cookies.get('supabase-auth-token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token' },
        { status: 401 }
      );
    }

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
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
      console.warn(`[SECURITY] Non-admin user ${user.id} attempted to invite user`);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, training_path } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Validate training_path if provided
    if (training_path && !['acquisitions', 'dispositions'].includes(training_path)) {
      return NextResponse.json(
        { error: 'training_path must be either "acquisitions" or "dispositions"' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (existingUser?.user) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Invite user via Supabase Admin SDK
    // Store training_path in user metadata so it can be extracted by the profile trigger
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          training_path: training_path || null, // Store training path in metadata
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding`,
      }
    );

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      return NextResponse.json(
        { error: 'Failed to send invitation', details: inviteError.message },
        { status: 500 }
      );
    }

    // Log successful invitation (for audit trail)
    console.log(`[ADMIN] User ${user.id} (${user.email}) invited ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      email: email,
      invitedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in POST /api/admin/invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
