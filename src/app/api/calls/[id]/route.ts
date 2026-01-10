/**
 * Get Call Result API
 * Fetches a specific call result by ID
 * Triggers grading if goat_score is missing
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { judgeCall } from '@/lib/judge';
import { analyzeDeviation } from '@/lib/analyzeDeviation';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const callId = params.id;

    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (error) {
      console.error('Error fetching call:', error);
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Generate signed URL for recording if it exists
    if (data.recording_url) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        
        // If it's a Supabase storage URL, create a signed URL
        if (data.recording_url.includes(supabaseUrl)) {
          const urlMatch = data.recording_url.match(/\/storage\/v1\/object\/(public|sign)\/([^\/]+)\/(.+)/);
          
          if (urlMatch) {
            const [, , bucket, path] = urlMatch;
            
            // Generate signed URL with 60 minute expiration
            const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
              .from(bucket)
              .createSignedUrl(path, 3600); // 60 minutes

            if (!signedUrlError && signedUrlData) {
              data.recording_url = signedUrlData.signedUrl;
            }
          }
        }
        // External URLs (e.g., Vapi) are returned as-is
      } catch (signedUrlError) {
        console.error('Error generating signed URL:', signedUrlError);
        // Continue with original URL if signed URL generation fails
      }
    }

    // If goat_score is missing, trigger grading
    if (!data.goat_score && data.transcript) {
      
      try {
        const gradingResult = await judgeCall(data.transcript);
        
        // Analyze script deviation if not already present
        let deviationAnalysis = data.script_adherence;
        if (!deviationAnalysis && data.transcript) {
          deviationAnalysis = await analyzeDeviation(data.transcript);
        }

        // Calculate logic gates array
        const logicGates = [
          {
            name: 'Approval/Denial Intro',
            passed: gradingResult.logicGates.intro === 'pass',
          },
          {
            name: 'Fact-Finding (The Why)',
            passed: gradingResult.logicGates.why === 'found',
          },
          {
            name: 'Property Condition (The House)',
            passed: gradingResult.logicGates.propertyCondition === 'pass',
          },
          {
            name: 'Tone',
            passed: gradingResult.logicGates.tone >= 7,
            score: gradingResult.logicGates.tone,
          },
          {
            name: 'The Clinch',
            passed: gradingResult.logicGates.clinch === 'pass',
          },
        ];

        // Update the call record
        const { error: updateError } = await supabaseAdmin
          .from('calls')
          .update({
            goat_score: gradingResult.goatScore,
            rebuttal_of_the_day: gradingResult.rebuttalOfTheDay,
            logic_gates: logicGates,
            feedback: gradingResult.feedback,
            script_adherence: deviationAnalysis, // Update script adherence
          })
          .eq('id', callId);

        if (updateError) {
          console.error('Error updating call with grade:', updateError);
        } else {
          // Update data object with new values
          data.goat_score = gradingResult.goatScore;
          data.rebuttal_of_the_day = gradingResult.rebuttalOfTheDay;
          data.logic_gates = logicGates;
          data.feedback = gradingResult.feedback;
          data.script_adherence = deviationAnalysis; // Store deviation analysis
        }
      } catch (gradingError) {
        console.error('Error grading call:', gradingError);
        // Continue with existing data even if grading fails
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/calls/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
