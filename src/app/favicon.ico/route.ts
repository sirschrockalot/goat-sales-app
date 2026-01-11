/**
 * Favicon Route Handler
 * Returns a simple SVG favicon to prevent 404 errors
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Return a simple SVG favicon
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#0B0E14"/>
  <text x="16" y="22" font-family="Arial" font-size="20" font-weight="bold" text-anchor="middle" fill="#22C55E">🐐</text>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
