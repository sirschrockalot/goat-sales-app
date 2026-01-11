/**
 * Vapi Webhook Handler
 * Listens for end-of-call-report from Vapi
 */

import { NextRequest, NextResponse } from 'next/server';
import { gradeCall } from '@/lib/grading';
import { gradeDispoCall } from '@/lib/dispoGrading';
import { analyzeDeviation } from '@/lib/analyzeDeviation';
import { analyzeSentiment } from '@/lib/analyzeSentiment';
import { analyzeVoicePerformance } from '@/lib/voicePerformance';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { getUserFromRequest } from '@/lib/getUserFromRequest';

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
        : await gradeCall(transcript, false); // Aircall doesn't support role reversal

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
    let transcript = call.transcript || '';
    let userId = call.metadata?.userId;
    const personaMode = call.metadata?.personaMode || 'acquisition';
    const personaId = call.metadata?.personaId;
    const manuallyTriggered = call.metadata?.manuallyTriggered || false;
    const roleReversal = call.metadata?.roleReversal === true || call.metadata?.learningMode === true;

    // If manually triggered and missing userId, try to get from auth
    if (!userId && manuallyTriggered) {
      try {
        const { user } = await getUserFromRequest(request);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        console.warn('Could not get userId from request:', error);
      }
    }

    if (!transcript || !userId) {
      console.warn('Missing transcript or userId in webhook payload', {
        hasTranscript: !!transcript,
        hasUserId: !!userId,
        transcriptLength: transcript.length,
        manuallyTriggered,
      });
      return NextResponse.json({ 
        received: true, 
        message: 'Missing transcript or userId',
        hasTranscript: !!transcript,
        hasUserId: !!userId,
      }, { status: 200 });
    }

    // Analyze script deviation (pass mode for correct table selection)
    const deviationAnalysis = await analyzeDeviation(transcript, personaMode);

    // Grade the call using appropriate grading function (pass roleReversal for Learning Mode)
      // Get exit strategy from metadata if available
      const exitStrategy = (call.metadata as any)?.exitStrategy || 'fix_and_flip';
      
      // Calculate rep talk time from transcript (estimate based on transcript length and call duration)
      // This is an approximation - in production, you'd track this from Vapi SDK events
      const callDurationSeconds = callDuration || (transcript.length > 0 ? Math.ceil(transcript.length / 10) : 0); // Rough estimate: 10 chars per second
      const repTranscript = transcript.split('\n').filter(line => 
        line.toLowerCase().includes('rep:') || 
        line.toLowerCase().includes('user:') ||
        (!line.toLowerCase().includes('ai:') && !line.toLowerCase().includes('seller:'))
      ).join(' ');
      const repTalkTimeSeconds = repTranscript.length > 0 ? Math.ceil(repTranscript.length / 10) : Math.ceil(callDurationSeconds * 0.5); // Estimate 50% if no clear markers
      
      // Grade the call with neural coaching metrics
      const gradingResult = personaMode === 'disposition' 
        ? await gradeDispoCall(transcript, userId, callId, gauntletLevel)
        : await gradeCall(
            transcript, 
            userId, 
            callId, 
            gauntletLevel, 
            roleReversal,
            callDurationSeconds,
            repTalkTimeSeconds
          );

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
        const scriptHiddenDuration = call.metadata?.scriptHiddenDuration || 0; // Pro Mode duration

        // Award XP if Goat Mode was active or Pro Mode time was spent
        if (goatModeDuration > 0 || scriptHiddenDuration > 0) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/goat-mode/award-xp`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                callDuration,
                goatModeDuration,
                scriptHiddenDuration, // Include Pro Mode duration for 1.5x XP multiplier
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

        // CONTINUOUS LEARNING LOOP: Analyze sentiment BEFORE saving call
        // This allows us to store sentiment_score in metadata for prompt evolution
        let sentimentAnalysis: any = null;
        if (transcript && transcript.length > 100) {
          try {
            sentimentAnalysis = await analyzeSentiment(transcript);
            
            // If humanity score is below 80%, log optimizations
            if (sentimentAnalysis.humanityScore < 80) {
              const assistantId = personaId || 'unknown';
              
              // Save each suggested improvement to ai_optimizations table
              for (const improvement of sentimentAnalysis.suggestedImprovements) {
                try {
                  await supabaseAdmin
                    .from('ai_optimizations')
                    .insert({
                      assistant_id: assistantId,
                      call_id: null, // Will be updated after call is saved
                      detected_weakness: improvement.weakness,
                      suggested_prompt_tweak: improvement.suggestion,
                      sentiment_score: sentimentAnalysis.humanityScore,
                      humanity_score: sentimentAnalysis.humanityScore,
                      priority: improvement.priority,
                      applied: false,
                    });
                } catch (error) {
                  console.error('Error saving AI optimization:', error);
                }
              }
            }
          } catch (error) {
            // Silently fail - sentiment analysis is not critical
            if (process.env.NODE_ENV === 'development') {
              console.error('Error analyzing sentiment:', error);
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
            script_hidden_duration: scriptHiddenDuration, // Pro Mode duration for XP multiplier
            // Deal tracking fields
            contract_signed: gradingResult.dealTracking?.contractSigned || false,
            suggested_buy_price: gradingResult.dealTracking?.suggestedBuyPrice || null,
            final_offer_price: gradingResult.dealTracking?.finalOfferPrice || null,
            price_variance: gradingResult.dealTracking?.priceVariance || null,
            test_stability_value: call.metadata?.testStabilityValue || null, // Save test stability for A/B testing
            metadata: {
              ...(gauntletLevel ? { gauntlet_level: gauntletLevel } : {}),
              callDuration,
              goatModeDuration,
              scriptHiddenDuration,
              // Store sentiment analysis results for prompt evolution
              sentiment_score: sentimentAnalysis?.humanityScore || null,
              humanity_score: sentimentAnalysis?.humanityScore || null,
              // Store exit strategy for negotiation precision scoring
              exitStrategy: exitStrategy,
              // Store negotiation precision scores
              negotiationPrecision: gradingResult.negotiationPrecision || null,
              // Store hold data for validation
              holdDuration: call.metadata?.holdDuration || 0,
              holdCount: call.metadata?.holdCount || 0,
              priceChangesWithoutHold: gradingResult.advocacy?.holdUtilization?.priceChangesWithoutHold || 0,
            },
            ended_at: new Date().toISOString(),
          })
          .select()
          .single();

    if (error) {
      console.error('Error storing call in database:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to store call',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    // Update optimizations with call_id now that we have it
    if (sentimentAnalysis && sentimentAnalysis.humanityScore < 80) {
      try {
        await supabaseAdmin
          .from('ai_optimizations')
          .update({ call_id: data.id })
          .is('call_id', null)
          .eq('assistant_id', personaId || 'unknown')
          .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Last minute
      } catch (error) {
        // Silently fail - not critical
        if (process.env.NODE_ENV === 'development') {
          console.error('Error updating optimization call_id:', error);
        }
      }
    }

    // Analyze voice performance for A/B testing (runs asynchronously)
    // This correlates test_stability_value with Humanity Score and Contract Signed
    if (data.test_stability_value) {
      analyzeVoicePerformance(
        data.test_stability_value,
        sentimentAnalysis?.humanityScore || null,
        data.contract_signed || false,
        data.final_offer_price || null
      ).catch(err => {
        console.error('Error analyzing voice performance:', err);
      });
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
