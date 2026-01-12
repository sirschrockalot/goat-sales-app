/**
 * Next.js Middleware
 * Protects admin routes and cron jobs from unauthorized access
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import logger from './lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const publicRoutes = ['/login', '/api/auth'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Protect cron routes with CRON_SECRET
  if (pathname.startsWith('/api/cron')) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    // Vercel Cron sends Authorization header with Bearer token
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // Protect admin routes and admin API routes with session and is_admin check
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        logger.error('Supabase environment variables not configured');
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
          );
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Get auth token from cookies
      const accessToken = request.cookies.get('sb-access-token')?.value ||
                         request.cookies.get('supabase-auth-token')?.value ||
                         request.headers.get('authorization')?.replace('Bearer ', '');

      if (!accessToken) {
        // Redirect to login for admin routes, return 401 for API routes
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Verify session with Supabase
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || !profile.is_admin) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Forbidden - Admin access required' },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL('/', request.url));
      }

      // User is authenticated and is admin - allow access
      return NextResponse.next();
    } catch (error) {
      logger.error('Middleware auth error', { error, pathname });
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Protect gauntlet route (requires authentication)
  if (pathname.startsWith('/gauntlet')) {
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        logger.error('Supabase environment variables not configured');
        return NextResponse.redirect(new URL('/login', request.url));
      }

      const accessToken = request.cookies.get('sb-access-token')?.value ||
                         request.cookies.get('supabase-auth-token')?.value ||
                         request.headers.get('authorization')?.replace('Bearer ', '');

      if (!accessToken) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Verify session with Supabase
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

      if (authError || !user) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // User is authenticated - allow access to gauntlet
      return NextResponse.next();
    } catch (error) {
      logger.error('Middleware auth error for gauntlet', { error });
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/cron/:path*',
    '/api/admin/:path*',
    '/gauntlet/:path*', // Protect gauntlet route (requires authentication)
    // Add other protected routes here
  ],
};
