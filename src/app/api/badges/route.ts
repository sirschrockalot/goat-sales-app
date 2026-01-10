/**
 * Badges API
 * Handles badge fetching and unlocking
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get user badges
    const { data: badges, error } = await supabaseAdmin
      .from('badges')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching badges:', error);
      return NextResponse.json(
        { error: 'Failed to fetch badges' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      badges: badges || [],
    });
  } catch (error) {
    console.error('Error in GET /api/badges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, badgeType, badgeName, badgeDescription, metadata } = body;

    if (!userId || !badgeType || !badgeName) {
      return NextResponse.json(
        { error: 'userId, badgeType, and badgeName are required' },
        { status: 400 }
      );
    }

    // Check if badge already exists
    const { data: existing } = await supabaseAdmin
      .from('badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_type', badgeType)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Badge already unlocked',
        badge: existing,
      });
    }

    // Insert new badge
    const { data: badge, error } = await supabaseAdmin
      .from('badges')
      .insert({
        user_id: userId,
        badge_type: badgeType,
        badge_name: badgeName,
        badge_description: badgeDescription || '',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating badge:', error);
      return NextResponse.json(
        { error: 'Failed to create badge' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      badge,
    });
  } catch (error) {
    console.error('Error in POST /api/badges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
