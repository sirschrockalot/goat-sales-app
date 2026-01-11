/**
 * User Profile API
 * Returns user profile data including admin status
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

export async function GET(request: NextRequest) {
  try {
    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('supabaseAdmin not initialized - missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get authenticated user from request cookies
    const { user, error: authError } = await getUserFromRequest(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, is_admin, gauntlet_level, gauntlet_progress')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      // If no profile, create a basic one
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          name: user.email?.split('@')[0] || 'User',
          email: user.email,
          is_admin: false,
          gauntlet_level: 1,
          gauntlet_progress: {},
        })
        .select('id, name, email, is_admin, gauntlet_level, gauntlet_progress')
        .single();

      if (insertError || !newProfile) {
        return NextResponse.json(
          { error: 'Profile not found or created' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ...newProfile,
        daily_streak: 0,
        total_calls: 0,
        average_score: 0,
      });
    }

    // Calculate daily streak
    const { data: recentCalls } = await supabaseAdmin
      .from('calls')
      .select('created_at, goat_score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    let dailyStreak = 0;
    if (recentCalls && recentCalls.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < recentCalls.length; i++) {
        const callDate = new Date(recentCalls[i].created_at);
        callDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today.getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === i) {
          dailyStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate total calls and average score
    const { data: allCalls } = await supabaseAdmin
      .from('calls')
      .select('goat_score')
      .eq('user_id', user.id)
      .not('goat_score', 'is', null);

    const totalCalls = allCalls?.length || 0;
    const totalScore = allCalls?.reduce((sum, call) => sum + (call.goat_score || 0), 0) || 0;
    const averageScore = totalCalls > 0 ? Math.round(totalScore / totalCalls) : 0;

    return NextResponse.json({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      is_admin: profile.is_admin || false,
      daily_streak: dailyStreak,
      total_calls: totalCalls,
      average_score: averageScore,
      gauntlet_level: profile.gauntlet_level || 1,
      gauntlet_progress: profile.gauntlet_progress || {},
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
