/**
 * Next.js Middleware
 * Protects admin routes and cron jobs from unauthorized access
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
        console.error('Supabase environment variables not configured');
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
          );
        }
        return NextResponse.redirect(new URL('/login', request.url), { status: 307 });
      }

      // Extract project ref from URL to build cookie name
      const url = new URL(supabaseUrl);
      const projectRef = url.hostname.split('.')[0] || 'localhost';
      const cookieName = `sb-${projectRef}-auth-token`;
      const cookieNameAlt = `sb-127.0.0.1-auth-token`;
      
      // Get auth token from cookies (Supabase uses sb-<project-ref>-auth-token pattern)
      // Also check for session cookies which may contain the token
      let accessToken: string | undefined;
      
      // Try primary cookie name
      let cookieValue = request.cookies.get(cookieName)?.value;
      
      // Try alternative cookie names
      if (!cookieValue) {
        cookieValue = request.cookies.get(cookieNameAlt)?.value ||
                      request.cookies.get('sb-access-token')?.value ||
                      request.cookies.get('supabase-auth-token')?.value;
      }
      
      // Try all cookies that might contain session data
      if (!cookieValue) {
        const allCookies = request.cookies.getAll();
        for (const cookie of allCookies) {
          if (cookie.name.includes('auth') || cookie.name.includes('session') || cookie.name.startsWith('sb-')) {
            cookieValue = cookie.value;
            console.log('Middleware: Found potential auth cookie:', cookie.name);
            break;
          }
        }
      }
      
      if (cookieValue) {
        try {
          // Cookie value is JSON encoded session data
          const sessionData = JSON.parse(decodeURIComponent(cookieValue));
          accessToken = sessionData.access_token || sessionData.accessToken;
        } catch {
          // If not JSON, might be the token directly
          accessToken = cookieValue;
        }
      }
      
      // Also check Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.replace('Bearer ', '');
      }

      if (!accessToken) {
        console.warn('Middleware: No access token found for admin route', { pathname });
        // Redirect to login for admin routes, return 401 for API routes
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        }
        // Use 307 (temporary redirect) for login - 308 gets cached and prevents login
        const response = NextResponse.redirect(new URL('/login', request.url), { status: 307 });
        // Prevent caching of redirect
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return response;
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
        return NextResponse.redirect(new URL('/login', request.url), { status: 307 });
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      const profileData = profile as any;
      if (profileError) {
        console.error('Middleware profile error:', profileError.message, 'User ID:', user.id);
        // If profile doesn't exist, allow access and let the app handle it
        // This prevents blocking legitimate users whose profiles haven't been created yet
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Profile not found' },
            { status: 404 }
          );
        }
        // For pages, allow access - the page component will handle the redirect
        return NextResponse.next();
      }
      
      if (!profileData || !profileData.is_admin) {
        console.warn('Middleware: User is not admin', { 
          userId: user.id, 
          email: user.email, 
          isAdmin: profileData?.is_admin,
          pathname,
          hasProfile: !!profileData
        });
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Forbidden - Admin access required' },
            { status: 403 }
          );
        }
        // For pages, redirect to home
        // But log the issue for debugging
        console.error('Middleware blocking admin route access:', {
          userId: user.id,
          email: user.email,
          pathname,
          profileExists: !!profileData,
          isAdmin: profileData?.is_admin
        });
        // Use 307 (temporary) for non-admin redirect
        return NextResponse.redirect(new URL('/', request.url), { status: 307 });
      }
      
      // Log successful admin access for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Middleware: Admin access granted', { userId: user.id, email: user.email, pathname });
      }

      // User is authenticated and is admin - allow access
      return NextResponse.next();
    } catch (error) {
      console.error('Middleware auth error', { error, pathname });
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      }
        return NextResponse.redirect(new URL('/login', request.url), { status: 307 });
    }
  }

  // Protect gauntlet route (requires authentication)
  if (pathname.startsWith('/gauntlet')) {
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase environment variables not configured');
        return NextResponse.redirect(new URL('/login', request.url), { status: 307 });
      }

      // Extract project ref from URL to build cookie name
      const url = new URL(supabaseUrl);
      const projectRef = url.hostname.split('.')[0] || 'localhost';
      const cookieName = `sb-${projectRef}-auth-token`;
      const cookieNameAlt = `sb-127.0.0.1-auth-token`;
      
      // Get auth token from cookies
      let accessToken: string | undefined;
      const cookieValue = request.cookies.get(cookieName)?.value || 
                         request.cookies.get(cookieNameAlt)?.value ||
                         request.cookies.get('sb-access-token')?.value ||
                         request.cookies.get('supabase-auth-token')?.value;
      
      if (cookieValue) {
        try {
          const sessionData = JSON.parse(decodeURIComponent(cookieValue));
          accessToken = sessionData.access_token || sessionData.accessToken;
        } catch {
          accessToken = cookieValue;
        }
      }
      
      // Also check Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.replace('Bearer ', '');
      }

      if (!accessToken) {
        return NextResponse.redirect(new URL('/login', request.url), { status: 307 });
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
        return NextResponse.redirect(new URL('/login', request.url), { status: 307 });
      }

      // User is authenticated - allow access to gauntlet
      return NextResponse.next();
    } catch (error) {
      console.error('Middleware auth error for gauntlet', { error });
      return NextResponse.redirect(new URL('/login', request.url), { status: 307 });
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
