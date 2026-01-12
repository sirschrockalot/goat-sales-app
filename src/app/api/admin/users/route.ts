/**
 * Admin Users API
 * Fetches all users and pending invites for user management
 * SECURITY: Strictly checks is_admin flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createSupabaseClient } from '@/lib/supabase';
import logger from '@/lib/logger';

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
      logger.warn('Non-admin user attempted to access user management', { userId: user.id });
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all users from auth.users
    // Note: listUsers() may return paginated results, fetch with reasonable page size
    const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();

    if (authUsersError) {
      logger.error('Error fetching auth users', { error: authUsersError });
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    const allUsers = authUsersData?.users || [];

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, is_admin, gauntlet_level, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      logger.error('Error fetching profiles', { error: profilesError });
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }

    // Get last active date from calls table for each user
    const { data: lastActiveData, error: lastActiveError } = await supabaseAdmin
      .from('calls')
      .select('user_id, created_at')
      .order('created_at', { ascending: false });

    // Create a map of user_id to last active date
    const lastActiveMap = new Map<string, string>();
    if (lastActiveData) {
      lastActiveData.forEach((call) => {
        if (!lastActiveMap.has(call.user_id)) {
          lastActiveMap.set(call.user_id, call.created_at);
        }
      });
    }

    // Separate pending invites (users without confirmed email) from active users
    const pendingInvites = allUsers
      .filter((authUser) => !authUser.email_confirmed_at)
      .map((authUser) => ({
        id: authUser.id,
        email: authUser.email || 'No email',
        invitedAt: authUser.created_at,
        confirmedAt: null,
      }));

    // Map active users with profile data
    const activeUsers = allUsers
      .filter((authUser) => authUser.email_confirmed_at)
      .map((authUser) => {
        const profile = profiles?.find((p) => p.id === authUser.id);
        const lastActive = lastActiveMap.get(authUser.id);

        return {
          id: authUser.id,
          name: profile?.name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || 'No email',
          isAdmin: profile?.is_admin || false,
          gauntletLevel: profile?.gauntlet_level || 1,
          lastActive: lastActive || profile?.updated_at || profile?.created_at || null,
          createdAt: authUser.created_at,
        };
      })
      .sort((a, b) => {
        // Sort by last active (most recent first), then by created date
        const aDate = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const bDate = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        return bDate - aDate;
      });

    return NextResponse.json({
      pendingInvites,
      activeUsers,
    });
  } catch (error) {
    logger.error('Error in GET /api/admin/users', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
