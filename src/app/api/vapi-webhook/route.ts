/**
 * Vapi Webhook Handler
 * Listens for end-of-call-report from Vapi
 */

import { NextRequest, NextResponse } from 'next/server';
import { gradeCall } from '@/lib/grading';
import { analyzeDeviation } from '@/lib/analyzeDeviation';
import { supabaseAdmin } from '@/lib/supabase';

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

      // Grade the call
      const gradingResult = await gradeCall(transcript);

      // Calculate logic gates
      const logicGates = [
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

    // Analyze script deviation
    const deviationAnalysis = await analyzeDeviation(transcript);

    // Calculate logic gates array for database
    const logicGates = [
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
