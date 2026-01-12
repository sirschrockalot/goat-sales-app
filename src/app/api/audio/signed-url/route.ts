/**
 * Generate Signed URL for Audio Recording
 * Creates a temporary signed URL that expires after 60 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordingUrl = searchParams.get('url');

    if (!recordingUrl) {
      return NextResponse.json(
        { error: 'Recording URL is required' },
        { status: 400 }
      );
    }

    // If the URL is already a Supabase storage URL, create a signed URL
    // Otherwise, return the URL as-is (external URLs like Vapi recordings)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    
    if (recordingUrl.includes(supabaseUrl)) {
      // Extract bucket and path from Supabase storage URL
      // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      // or: https://[project].supabase.co/storage/v1/object/sign/[bucket]/[path]
      const urlMatch = recordingUrl.match(/\/storage\/v1\/object\/(public|sign)\/([^\/]+)\/(.+)/);
      
      if (urlMatch) {
        const [, , bucket, path] = urlMatch;
        
        // Generate signed URL with 60 minute expiration
        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 60 minutes = 3600 seconds

        if (error) {
          logger.error('Error creating signed URL', { error, recordingUrl });
          return NextResponse.json(
            { error: 'Failed to generate signed URL' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          signedUrl: data.signedUrl,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        });
      }
    }

    // For external URLs (e.g., Vapi recordings), return as-is
    // In production, you might want to proxy these through your server
    return NextResponse.json({
      signedUrl: recordingUrl,
      expiresAt: null, // External URLs don't expire
    });
  } catch (error) {
    logger.error('Error generating signed URL', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
