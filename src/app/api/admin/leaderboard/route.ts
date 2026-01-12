/**
 * Admin Leaderboard API
 * Returns sales rep performance data
 */

import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // OPTIMIZED: Use the leaderboard_view for pre-calculated data
    const { data: leaderboardData, error: viewError } = await supabaseAdmin
      .from('leaderboard_view')
      .select('user_id, name, email, total_calls, avg_goat_score, last_call_date')
      .order('avg_goat_score', { ascending: false });

    if (viewError) {
      // Fallback to manual calculation if view doesn't exist
      logger.warn('leaderboard_view not available, using fallback', { error: viewError });
      return await getLeaderboardFallback();
    }

    // OPTIMIZED: Fetch all profiles in one query instead of N queries
    const userIds = (leaderboardData as any[])?.map((l: any) => l.user_id) || [];
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds);

    const profilesMap = new Map((profiles as any[])?.map((p: any) => [p.id, p]) || []);

    // OPTIMIZED: Fetch all recent calls in one query, grouped by user
    const { data: allRecentCalls } = await supabaseAdmin
      .from('calls')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(1000); // Get recent calls for all users

    // Group calls by user_id
    const callsByUser = new Map<string, any[]>();
    (allRecentCalls as any[])?.forEach((call: any) => {
      if (!call.user_id) return;
      if (!callsByUser.has(call.user_id)) {
        callsByUser.set(call.user_id, []);
      }
      callsByUser.get(call.user_id)!.push(call);
    });

    // Calculate daily streaks for all users
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leaderboard = ((leaderboardData as any[]) || []).map((stats: any) => {
      const profile = profilesMap.get(stats.user_id);
      const userCalls = callsByUser.get(stats.user_id) || [];
      
      // Calculate daily streak
      let streak = 0;
      for (let i = 0; i < userCalls.length; i++) {
        const callDate = new Date(userCalls[i].created_at);
        callDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === i) {
          streak++;
        } else {
          break;
        }
      }

      return {
        userId: stats.user_id,
        name: profile?.name || profile?.email || 'Unknown User',
        email: profile?.email || '',
        dailyStreak: streak,
        totalCalls: stats.total_calls || 0,
        averageScore: stats.avg_goat_score || 0,
      };
    });

    return NextResponse.json({ leaderboard });
  } catch (error) {
    logger.error('Error fetching leaderboard', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Fallback leaderboard calculation if view doesn't exist
 */
async function getLeaderboardFallback() {
  const { supabaseAdmin } = await import('@/lib/supabase');
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not available' }, { status: 500 });
  }
  const { data: calls } = await supabaseAdmin
    .from('calls')
    .select('user_id, goat_score, created_at')
    .not('goat_score', 'is', null)
    .order('created_at', { ascending: false });

  const userStats: Record<string, {
    userId: string;
    totalCalls: number;
    totalScore: number;
    averageScore: number;
    lastCallDate: string;
  }> = {};

  (calls as any[])?.forEach((call: any) => {
    if (!call.user_id) return;
    if (!userStats[call.user_id]) {
      userStats[call.user_id] = {
        userId: call.user_id,
        totalCalls: 0,
        totalScore: 0,
        averageScore: 0,
        lastCallDate: call.created_at,
      };
    }
    userStats[call.user_id].totalCalls += 1;
    userStats[call.user_id].totalScore += call.goat_score || 0;
    userStats[call.user_id].lastCallDate = call.created_at > userStats[call.user_id].lastCallDate
      ? call.created_at
      : userStats[call.user_id].lastCallDate;
  });

  const userIds = Object.keys(userStats);
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, email')
    .in('id', userIds);

  const profilesMap = new Map((profiles as any[])?.map((p: any) => [p.id, p]) || []);

  const leaderboard = Object.values(userStats).map((stats) => {
    stats.averageScore = Math.round(stats.totalScore / stats.totalCalls);
    const profile = profilesMap.get(stats.userId);
    return {
      userId: stats.userId,
      name: profile?.name || profile?.email || 'Unknown User',
      email: profile?.email || '',
      dailyStreak: 0, // Simplified for fallback
      totalCalls: stats.totalCalls,
      averageScore: stats.averageScore,
    };
  });

  leaderboard.sort((a, b) => b.averageScore - a.averageScore);
  return NextResponse.json({ leaderboard });
}
