/**
 * Admin Leaderboard API
 * Returns sales rep performance data
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get all users with their call stats
    const { data: calls } = await supabaseAdmin
      .from('calls')
      .select('user_id, goat_score, created_at')
      .not('goat_score', 'is', null)
      .order('created_at', { ascending: false });

    // Group by user_id and calculate stats
    const userStats: Record<string, {
      userId: string;
      totalCalls: number;
      totalScore: number;
      averageScore: number;
      lastCallDate: string;
    }> = {};

    calls?.forEach((call) => {
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

    // Calculate averages and daily streaks
    const leaderboard = await Promise.all(
      Object.values(userStats).map(async (stats) => {
        stats.averageScore = Math.round(stats.totalScore / stats.totalCalls);

        // Calculate daily streak
        const { data: recentCalls } = await supabaseAdmin
          .from('calls')
          .select('created_at')
          .eq('user_id', stats.userId)
          .order('created_at', { ascending: false })
          .limit(30);

        let streak = 0;
        if (recentCalls && recentCalls.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          for (let i = 0; i < recentCalls.length; i++) {
            const callDate = new Date(recentCalls[i].created_at);
            callDate.setHours(0, 0, 0, 0);
            
            const daysDiff = Math.floor((today.getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === i) {
              streak++;
            } else {
              break;
            }
          }
        }

        // Get user profile for name
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('name, email')
          .eq('id', stats.userId)
          .single();

        return {
          userId: stats.userId,
          name: profile?.name || profile?.email || 'Unknown User',
          email: profile?.email || '',
          dailyStreak: streak,
          totalCalls: stats.totalCalls,
          averageScore: stats.averageScore,
        };
      })
    );

    // Sort by average score (descending)
    leaderboard.sort((a, b) => b.averageScore - a.averageScore);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
