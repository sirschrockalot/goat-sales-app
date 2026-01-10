/**
 * Next.js Middleware
 * Protects admin routes from unauthorized access
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    // In production, you would check the user's session/token here
    // For now, we'll let the client-side check handle it
    // This middleware can be extended to check JWT tokens or session cookies
    
    // Example: Check for admin cookie or header
    // const isAdmin = request.cookies.get('is_admin')?.value === 'true';
    // if (!isAdmin) {
    //   return NextResponse.redirect(new URL('/', request.url));
    // }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
