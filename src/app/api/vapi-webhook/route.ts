/**
 * Vapi Webhook Handler
 * Listens for end-of-call-report from Vapi
 */

import { NextRequest, NextResponse } from 'next/server';
import { gradeCall } from '@/lib/grading';
import { gradeDispoCall } from '@/lib/dispoGrading';
import { analyzeDeviation } from '@/lib/analyzeDeviation';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

interface VapiWebhookPayload {
  type: string;
  call?: {
    id: string;
    status: string;
    transcript?: string;
    recordingUrl?: string;
    metadata?: {
      userId?: string;
      personaMode?: string;
      personaId?: string;
      source?: 'vapi' | 'aircall'; // Track source
      aircallCallId?: string; // Aircall call ID if from extension
      phoneNumber?: string;
    };
  };
  // Aircall webhook format (alternative)
  aircallCallId?: string;
  phoneNumber?: string;
  recordingUrl?: string;
  transcript?: string;
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify webhook secret at the very beginning
    // Extract the secret from headers (Vapi sends it as x-vapi-secret)
    const vapiSecret = request.headers.get('x-vapi-secret') || 
                       request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedSecret = process.env.VAPI_SECRET_KEY || process.env.VAPI_WEBHOOK_SECRET;

    // If a secret is configured, validate it
    if (expectedSecret) {
      if (!vapiSecret || vapiSecret !== expectedSecret) {
        // Log failed attempt (without logging the actual key)
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                        request.headers.get('x-real-ip') || 
                        'unknown';
        
        console.warn(`[SECURITY] Invalid Vapi webhook secret attempt from IP: ${clientIP}`, {
          timestamp: new Date().toISOString(),
          hasSecret: !!vapiSecret,
          secretLength: vapiSecret?.length || 0,
          userAgent: request.headers.get('user-agent')?.substring(0, 50) || 'unknown',
        });

        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Log successful validation (optional, can be removed in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('[SECURITY] Vapi webhook secret validated successfully');
      }
    } else {
      // Warn if no secret is configured (security risk)
      console.warn('[SECURITY] VAPI_SECRET_KEY not configured - webhook is unsecured!');
    }

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`webhook:${clientIP}`, {
      limit: 100, // 100 requests per hour
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

    const body: VapiWebhookPayload = await request.json();

    // Handle Aircall webhook format (from Chrome Extension)
    if (body.aircallCallId || body.type === 'aircall_call_end') {
      const transcript = body.transcript || '';
      const userId = body.userId || body.metadata?.userId || 'aircall-user';
      const phoneNumber = body.phoneNumber || body.metadata?.phoneNumber;
      const recordingUrl = body.recordingUrl || body.recording_url;
      const aircallCallId = body.aircallCallId || body.call?.id;

      if (!transcript) {
        return NextResponse.json({ received: true, message: 'No transcript provided' }, { status: 200 });
      }

      // Determine persona mode (default to acquisition for Aircall calls)
      const personaMode = body.personaMode || body.metadata?.personaMode || 'acquisition';

      // Grade the call using appropriate grading function
      const gradingResult = personaMode === 'disposition' 
        ? await gradeDispoCall(transcript)
        : await gradeCall(transcript);

      // Analyze script deviation (pass mode for correct table selection)
      const deviationAnalysis = await analyzeDeviation(transcript, personaMode);

      // Calculate logic gates based on mode
      const logicGates = personaMode === 'disposition' ? [
        {
          name: 'The Hook (The Numbers)',
          passed: gradingResult.logicGates.hook === 'pass',
        },
        {
          name: 'The Narrative (Comp Analysis)',
          passed: gradingResult.logicGates.narrative === 'pass',
        },
        {
          name: 'The Scarcity Anchor',
          passed: gradingResult.logicGates.scarcity === 'pass',
        },
        {
          name: 'The Terms',
          passed: gradingResult.logicGates.terms === 'pass',
        },
        {
          name: 'The Clinch (Assignment)',
          passed: gradingResult.logicGates.clinch === 'pass',
        },
        {
          name: 'Tonality',
          passed: gradingResult.logicGates.tonality >= 7,
          score: gradingResult.logicGates.tonality,
        },
      ] : [
        {
          name: 'Approval/Denial Intro',
          passed: gradingResult.logicGates.intro === 'pass',
        },
        {
          name: 'Fact-Finding',
          passed: gradingResult.logicGates.why === 'found',
        },
        {
          name: 'Property Condition',
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

      // Store in database
      const { data, error } = await supabaseAdmin
        .from('calls')
        .insert({
          user_id: userId,
          transcript: transcript,
          goat_score: gradingResult.goatScore,
          recording_url: recordingUrl || null,
          persona_mode: 'acquisition', // Default for real calls
          call_status: 'ended',
          logic_gates: logicGates,
          rebuttal_of_the_day: gradingResult.rebuttalOfTheDay,
          script_adherence: deviationAnalysis, // Store deviation analysis
          ended_at: new Date().toISOString(),
          // Store Aircall metadata
          persona_id: `aircall-${body.aircallCallId}`,
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing Aircall call:', error);
        return NextResponse.json(
          { error: 'Failed to store call' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        callId: data.id,
        goatScore: gradingResult.goatScore,
        source: 'aircall',
      });
    }

    // Handle Vapi webhook format
    // Only process end-of-call-report events
    if (body.type !== 'end-of-call-report' || !body.call) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { call } = body;
    const transcript = call.transcript || '';
    const userId = call.metadata?.userId;
    const personaMode = call.metadata?.personaMode || 'acquisition';
    const personaId = call.metadata?.personaId;

    if (!transcript || !userId) {
      console.warn('Missing transcript or userId in webhook payload');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Grade the call using OpenAI
    const gradingResult = await gradeCall(transcript);

      // Analyze script deviation (pass mode for correct table selection)
      const deviationAnalysis = await analyzeDeviation(transcript, personaMode);

      // Grade the call using appropriate grading function
      const gradingResult = personaMode === 'disposition' 
        ? await gradeDispoCall(transcript)
        : await gradeCall(transcript);

      // Calculate logic gates array for database based on mode
      const logicGates = personaMode === 'disposition' ? [
        {
          name: 'The Hook (The Numbers)',
          passed: gradingResult.logicGates.hook === 'pass',
        },
        {
          name: 'The Narrative (Comp Analysis)',
          passed: gradingResult.logicGates.narrative === 'pass',
        },
        {
          name: 'The Scarcity Anchor',
          passed: gradingResult.logicGates.scarcity === 'pass',
        },
        {
          name: 'The Terms',
          passed: gradingResult.logicGates.terms === 'pass',
        },
        {
          name: 'The Clinch (Assignment)',
          passed: gradingResult.logicGates.clinch === 'pass',
        },
        {
          name: 'Tonality',
          passed: gradingResult.logicGates.tonality >= 7,
          score: gradingResult.logicGates.tonality,
        },
      ] : [
        {
          name: 'Approval/Denial Intro',
          passed: gradingResult.logicGates.intro === 'pass',
        },
        {
          name: 'Fact-Finding',
          passed: gradingResult.logicGates.why === 'found',
        },
        {
          name: 'Property Condition',
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

        // Extract gauntlet level from metadata if present
        const gauntletLevel = call.metadata?.gauntletLevel || 
          (personaId?.includes('gauntlet') ? parseInt(personaId.split('-')[1]) : null);

        // Calculate call duration and Goat Mode duration from metadata
        const callStartTime = call.metadata?.callStartTime 
          ? new Date(call.metadata.callStartTime).getTime()
          : Date.now() - 300000; // Default 5 minutes if not provided
        const callEndTime = Date.now();
        const callDuration = Math.floor((callEndTime - callStartTime) / 1000); // Duration in seconds
        const goatModeDuration = call.metadata?.goatModeDuration || 0; // Seconds in Goat Mode

        // Award XP if Goat Mode was active
        if (goatModeDuration > 0) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/goat-mode/award-xp`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                callDuration,
                goatModeDuration,
                goatScore: gradingResult.goatScore,
              }),
            });
          } catch (error) {
            // Silently fail - XP awarding is not critical
            if (process.env.NODE_ENV === 'development') {
              console.error('Error awarding XP:', error);
            }
          }
        }

        // Store in database
        const { data, error } = await supabaseAdmin
          .from('calls')
          .insert({
            user_id: userId,
            transcript: transcript,
            goat_score: gradingResult.goatScore,
            recording_url: call.recordingUrl || null,
            persona_mode: personaMode,
            persona_id: personaId,
            call_status: 'ended',
            logic_gates: logicGates,
            rebuttal_of_the_day: gradingResult.rebuttalOfTheDay,
            script_adherence: deviationAnalysis, // Store deviation analysis
            metadata: {
              ...(gauntletLevel ? { gauntlet_level: gauntletLevel } : {}),
              callDuration,
              goatModeDuration,
            },
            ended_at: new Date().toISOString(),
          })
          .select()
          .single();

    if (error) {
      console.error('Error storing call in database:', error);
      return NextResponse.json(
        { error: 'Failed to store call' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      callId: data.id,
      goatScore: gradingResult.goatScore,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
