/**
 * Get Call Result API
 * Fetches a specific call result by ID
 * Triggers grading if goat_score is missing
 */

import { NextRequest, NextResponse } from 'next/server';

import { judgeCall } from '@/lib/judge';
import { analyzeDeviation } from '@/lib/analyzeDeviation';
import { decryptTranscript } from '@/lib/encryption';
import logger from '@/lib/logger';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting for grading endpoint
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`judge:${clientIP}`, {
      limit: 50, // 50 requests per hour
      window: '1h',
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.reset },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    const { id: callId } = await params;

    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (error) {
      logger.error('Error fetching call', { error, callId });
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Decrypt transcript if encrypted
    const callData: any = data as any;
    if (callData.transcript_encrypted) {
      try {
        callData.transcript = await decryptTranscript(callData.transcript_encrypted);
        // Remove encrypted version from response for security
        delete callData.transcript_encrypted;
      } catch (decryptError) {
        logger.error('Failed to decrypt transcript', { error: decryptError, callId });
        // If decryption fails, check if plain transcript exists as fallback
        if (!callData.transcript) {
          logger.warn('No plaintext transcript available and decryption failed', { callId });
        }
      }
    }

    // Generate signed URL for recording if it exists
    if (callData.recording_url) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        
        // If it's a Supabase storage URL, create a signed URL
        if (callData.recording_url.includes(supabaseUrl)) {
          const urlMatch = callData.recording_url.match(/\/storage\/v1\/object\/(public|sign)\/([^\/]+)\/(.+)/);
          
          if (urlMatch) {
            const [, , bucket, path] = urlMatch;
            
            // Generate signed URL with 60 minute expiration
            const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin!.storage
              .from(bucket)
              .createSignedUrl(path, 3600); // 60 minutes

            if (!signedUrlError && signedUrlData) {
              callData.recording_url = signedUrlData.signedUrl;
            }
          }
        }
        // External URLs (e.g., Vapi) are returned as-is
      } catch (signedUrlError) {
        logger.error('Error generating signed URL', { error: signedUrlError, callId });
        // Continue with original URL if signed URL generation fails
      }
    }

    // If goat_score is missing, trigger grading
    if (!callData.goat_score && callData.transcript) {
      
      try {
        const gradingResult = await judgeCall(callData.transcript);
        
        // Analyze script deviation if not already present
        let deviationAnalysis = callData.script_adherence;
        if (!deviationAnalysis && callData.transcript) {
          deviationAnalysis = await analyzeDeviation(callData.transcript);
        }

        // Calculate logic gates array
        const logicGates = [
          {
            name: 'Approval/Denial Intro',
            passed: gradingResult.logicGates.intro === 'pass',
          },
          {
            name: 'Fact-Finding (The Why)',
            passed: gradingResult.logicGates.motivation === 'found',
          },
          {
            name: 'Property Condition (The House)',
            passed: gradingResult.logicGates.condition === 'pass',
          },
          {
            name: 'Tone',
            passed: gradingResult.logicGates.tone >= 7,
            score: gradingResult.logicGates.tone,
          },
          {
            name: 'The Clinch',
            passed: gradingResult.logicGates.commitment === 'pass',
          },
        ];

        // Update the call record
        const { error: updateError } = await (supabaseAdmin as any)
          .from('calls')
          .update({
            goat_score: gradingResult.goatScore,
            rebuttal_of_the_day: gradingResult.rebuttalOfTheDay,
            logic_gates: logicGates,
            feedback: gradingResult.feedback,
            script_adherence: deviationAnalysis, // Update script adherence
          } as any)
          .eq('id', callId);

        if (updateError) {
          logger.error('Error updating call with grade', { error: updateError, callId });
        } else {
          // Update callData object with new values
          callData.goat_score = gradingResult.goatScore;
          callData.rebuttal_of_the_day = gradingResult.rebuttalOfTheDay;
          callData.logic_gates = logicGates;
          callData.feedback = gradingResult.feedback;
          callData.script_adherence = deviationAnalysis; // Store deviation analysis
        }
      } catch (gradingError) {
        logger.error('Error grading call', { error: gradingError, callId });
        // Continue with existing data even if grading fails
      }
    }

    return NextResponse.json(callData);
  } catch (error) {
    logger.error('Error in GET /api/calls/[id]', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
