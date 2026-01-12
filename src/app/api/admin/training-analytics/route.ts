/**
 * Training Analytics API
 * Returns comprehensive training progress data for admin dashboard
 * SECURITY: Strictly checks is_admin flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, createSupabaseClient } from '@/lib/supabase';
import { getTrainingAnalytics } from '@/lib/getTrainingAnalytics';
import logger from '@/lib/logger';

// Cache configuration
const CACHE_DURATION = 60; // Cache for 60 seconds
const cache = new Map<string, { data: any; timestamp: number }>();

/**
 * Get cached data or fetch fresh
 */
function getCachedData(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 1000) {
    return cached.data;
  }
  return null;
}

/**
 * Set cached data
 */
function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
  
  // Clean up old cache entries (keep only last 10)
  if (cache.size > 10) {
    const entries = Array.from(cache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp);
    cache.clear();
    entries.slice(0, 10).forEach(([k, v]) => cache.set(k, v));
  }
}

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
      logger.warn('Non-admin user attempted to access training analytics', { userId: user.id });
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Check cache first (Stale-While-Revalidate pattern)
    const cacheKey = 'training-analytics';
    const cachedData = getCachedData(cacheKey);
    
    // Return cached data immediately if available
    if (cachedData) {
      // Revalidate in background (don't await)
      getTrainingAnalytics()
        .then((freshData) => setCachedData(cacheKey, freshData))
        .catch((error) => logger.error('Background cache refresh failed', { error }));
      
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=300`,
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch fresh data
    const analytics = await getTrainingAnalytics();
    
    // Cache the result
    setCachedData(cacheKey, analytics);

    return NextResponse.json(analytics, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=300`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    logger.error('Error in GET /api/admin/training-analytics', { error });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
