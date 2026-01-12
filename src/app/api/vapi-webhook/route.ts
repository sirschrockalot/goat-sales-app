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

import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import { processCallCompletion } from '@/lib/callActions';
import { processEscalation } from '@/lib/escalationService';
import logger from '@/lib/logger';

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
        
        logger.warn('Invalid Vapi webhook secret attempt', {
          clientIP,
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
      logger.debug('Vapi webhook secret validated successfully');
    } else {
      // Warn if no secret is configured (security risk)
      logger.warn('VAPI_SECRET_KEY not configured - webhook is unsecured');
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
    const bodyData = body as any;
    if (bodyData.aircallCallId || bodyData.type === 'aircall_call_end') {
      const transcript = bodyData.transcript || '';
      const userId = bodyData.userId || bodyData.metadata?.userId || 'aircall-user';
      const phoneNumber = bodyData.phoneNumber || bodyData.metadata?.phoneNumber;
      const recordingUrl = bodyData.recordingUrl || bodyData.recording_url;
      const aircallCallId = bodyData.aircallCallId || bodyData.call?.id;

      if (!transcript) {
        return NextResponse.json({ received: true, message: 'No transcript provided' }, { status: 200 });
      }

      // Determine persona mode (default to acquisition for Aircall calls)
      const personaMode = bodyData.personaMode || bodyData.metadata?.personaMode || 'acquisition';

      // Grade the call using appropriate grading function
      const gradingResult = personaMode === 'disposition' 
        ? await gradeDispoCall(transcript)
        : await gradeCall(transcript, undefined, undefined, undefined, false); // Aircall doesn't support role reversal

      // Analyze script deviation (pass mode for correct table selection)
      const deviationAnalysis = await analyzeDeviation(transcript, personaMode);

      // Calculate logic gates based on mode
      const gradingResultData = gradingResult as any;
      const logicGates = personaMode === 'disposition' ? [
        {
          name: 'The Hook (The Numbers)',
          passed: gradingResultData.logicGates.hook === 'pass',
        },
        {
          name: 'The Narrative (Comp Analysis)',
          passed: gradingResultData.logicGates.narrative === 'pass',
        },
        {
          name: 'The Scarcity Anchor',
          passed: gradingResultData.logicGates.scarcity === 'pass',
        },
        {
          name: 'The Terms',
          passed: gradingResultData.logicGates.terms === 'pass',
        },
        {
          name: 'The Clinch (Assignment)',
          passed: gradingResultData.logicGates.clinch === 'pass',
        },
        {
          name: 'Tonality',
          passed: gradingResultData.logicGates.tonality >= 7,
          score: gradingResultData.logicGates.tonality,
        },
      ] : [
        {
          name: 'Approval/Denial Intro',
          passed: gradingResultData.logicGates.intro === 'pass',
        },
        {
          name: 'Fact-Finding',
          passed: gradingResultData.logicGates.motivation === 'found',
        },
        {
          name: 'Property Condition',
          passed: gradingResultData.logicGates.condition === 'pass',
        },
        {
          name: 'Tone',
          passed: gradingResultData.logicGates.tone >= 7,
          score: gradingResultData.logicGates.tone,
        },
        {
          name: 'The Clinch',
          passed: gradingResultData.logicGates.commitment === 'pass',
        },
      ];

      // Get supabaseAdmin
      const { supabaseAdmin } = await import('@/lib/supabase');
      if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Database not available' }, { status: 500 });
      }

      // Store in database
      const { data, error } = await (supabaseAdmin as any)
        .from('calls')
        .insert({
          user_id: userId,
          transcript: transcript,
          goat_score: gradingResultData.goatScore,
          recording_url: recordingUrl || null,
          persona_mode: 'acquisition', // Default for real calls
          call_status: 'ended',
          logic_gates: logicGates,
          rebuttal_of_the_day: gradingResultData.rebuttalOfTheDay,
          script_adherence: deviationAnalysis, // Store deviation analysis
          ended_at: new Date().toISOString(),
          // Store Aircall metadata
          persona_id: `aircall-${bodyData.aircallCallId}`,
        } as any)
        .select()
        .single();

      if (error) {
        logger.error('Error storing Aircall call', { error, callId: body.aircallCallId });
        return NextResponse.json(
          { error: 'Failed to store call' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        callId: data.id,
        goatScore: gradingResultData.goatScore,
        source: 'aircall',
      });
    }

    // Handle Vapi webhook format
    // Only process end-of-call-report events
    if (body.type !== 'end-of-call-report' || !body.call) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { call } = body;
    const callData = call as any;
    
    // Set context for logging
    logger.setContext({
      callId: callData.id,
      assistantId: callData.metadata?.personaId,
      userId: callData.metadata?.userId,
    });
    let transcript = callData.transcript || '';
    let userId = callData.metadata?.userId;
    const personaMode = callData.metadata?.personaMode || 'acquisition';
    const personaId = callData.metadata?.personaId;
    const manuallyTriggered = callData.metadata?.manuallyTriggered || false;
    const roleReversal = callData.metadata?.roleReversal === true || callData.metadata?.learningMode === true;

    // If manually triggered and missing userId, try to get from auth
    if (!userId && manuallyTriggered) {
      try {
        const { user } = await getUserFromRequest(request);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        logger.warn('Could not get userId from request', { error });
      }
    }

    if (!transcript || !userId) {
      logger.warn('Missing transcript or userId in webhook payload', {
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

    // Get supabaseAdmin for Vapi path
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Analyze script deviation (pass mode for correct table selection)
    const deviationAnalysis = await analyzeDeviation(transcript, personaMode);

    // Grade the call using appropriate grading function (pass roleReversal for Learning Mode)
      // Get exit strategy from metadata if available
      // Extract exit strategy from metadata or determine from transcript
      let exitStrategy = callData.metadata?.exitStrategy || 'fix_and_flip';
      
      // Try to extract exit strategy from transcript if not in metadata
      if (!exitStrategy || exitStrategy === 'fix_and_flip') {
        const lowerTranscript = transcript.toLowerCase();
        if (lowerTranscript.includes('subject to') || lowerTranscript.includes('subject-to') || lowerTranscript.includes('sub-to')) {
          exitStrategy = 'subject_to';
        } else if (lowerTranscript.includes('seller finance') || lowerTranscript.includes('seller financing') || lowerTranscript.includes('seller carry')) {
          exitStrategy = 'seller_finance';
        } else if (lowerTranscript.includes('creative finance') || lowerTranscript.includes('creative financing')) {
          exitStrategy = 'creative_finance';
        } else if (lowerTranscript.includes('buy and hold') || lowerTranscript.includes('rental')) {
          exitStrategy = 'buy_and_hold';
        } else if (lowerTranscript.includes('cash') || lowerTranscript.includes('cash offer')) {
          exitStrategy = 'cash';
        }
      }
      
      // Normalize exit strategy values for database
      const normalizedExitStrategy = exitStrategy
        .replace(/-/g, '_')
        .replace('sub_to', 'subject_to')
        .replace('seller_carry', 'seller_finance');
      
      // Calculate call duration from metadata (needed before grading)
      const callStartTime = callData.metadata?.callStartTime 
        ? new Date(callData.metadata.callStartTime).getTime()
        : Date.now() - 300000; // Default 5 minutes if not provided
      const callEndTime = Date.now();
      const callDuration = Math.floor((callEndTime - callStartTime) / 1000); // Duration in seconds
      
      // Calculate rep talk time from transcript (estimate based on transcript length and call duration)
      // This is an approximation - in production, you'd track this from Vapi SDK events
      const callDurationSeconds = callDuration || (transcript.length > 0 ? Math.ceil(transcript.length / 10) : 0); // Rough estimate: 10 chars per second
      const repTranscript = transcript.split('\n').filter((line: string) => 
        line.toLowerCase().includes('rep:') || 
        line.toLowerCase().includes('user:') ||
        (!line.toLowerCase().includes('ai:') && !line.toLowerCase().includes('seller:'))
      ).join(' ');
      const repTalkTimeSeconds = repTranscript.length > 0 ? Math.ceil(repTranscript.length / 10) : Math.ceil(callDurationSeconds * 0.5); // Estimate 50% if no clear markers
      
      // Extract gauntlet level and callId (needed for grading)
      const gauntletLevel = callData.metadata?.gauntletLevel || 
        (personaId?.includes('gauntlet') ? parseInt(personaId.split('-')[1]) : null);
      const callId = callData.id;
      
      // Grade the call with neural coaching metrics
      const gradingResult = personaMode === 'disposition' 
        ? await gradeDispoCall(transcript)
        : await gradeCall(
            transcript, 
            userId, 
            callId, 
            gauntletLevel, 
            roleReversal,
            callDurationSeconds,
            repTalkTimeSeconds
          );

      const gradingResultData = gradingResult as any;

      // Calculate logic gates array for database based on mode
      const logicGates = personaMode === 'disposition' ? [
        {
          name: 'The Hook (The Numbers)',
          passed: gradingResultData.logicGates.hook === 'pass',
        },
        {
          name: 'The Narrative (Comp Analysis)',
          passed: gradingResultData.logicGates.narrative === 'pass',
        },
        {
          name: 'The Scarcity Anchor',
          passed: gradingResultData.logicGates.scarcity === 'pass',
        },
        {
          name: 'The Terms',
          passed: gradingResultData.logicGates.terms === 'pass',
        },
        {
          name: 'The Clinch (Assignment)',
          passed: gradingResultData.logicGates.clinch === 'pass',
        },
        {
          name: 'Tonality',
          passed: gradingResultData.logicGates.tonality >= 7,
          score: gradingResultData.logicGates.tonality,
        },
      ] : [
        {
          name: 'Approval/Denial Intro',
          passed: gradingResultData.logicGates.intro === 'pass',
        },
        {
          name: 'Fact-Finding',
          passed: gradingResultData.logicGates.why === 'found',
        },
        {
          name: 'Property Condition',
          passed: gradingResultData.logicGates.propertyCondition === 'pass',
        },
        {
          name: 'Tone',
          passed: gradingResultData.logicGates.tone >= 7,
          score: gradingResultData.logicGates.tone,
        },
        {
          name: 'The Clinch',
          passed: gradingResultData.logicGates.commitment === 'pass',
        },
      ];

        // Goat Mode duration from metadata (callDuration already calculated above)
        const goatModeDuration = callData.metadata?.goatModeDuration || 0; // Seconds in Goat Mode
        const scriptHiddenDuration = callData.metadata?.scriptHiddenDuration || 0; // Pro Mode duration

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
                goatScore: gradingResultData.goatScore,
              }),
            });
          } catch (error) {
            // Silently fail - XP awarding is not critical
            logger.debug('Error awarding XP (non-critical)', { error, userId });
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
                  await (supabaseAdmin as any)
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
                    } as any);
                } catch (error) {
                  logger.error('Error saving AI optimization', { error, assistantId });
                }
              }
            }
          } catch (error) {
            // Silently fail - sentiment analysis is not critical
            logger.debug('Error analyzing sentiment (non-critical)', { error, callId: callData.id });
          }
        }

        // Store in database
        const { data, error } = await (supabaseAdmin as any)
          .from('calls')
          .insert({
            user_id: userId,
            transcript: transcript,
            goat_score: gradingResultData.goatScore,
            recording_url: callData.recordingUrl || null,
            persona_mode: personaMode,
            persona_id: personaId,
            call_status: 'ended',
            logic_gates: logicGates,
            rebuttal_of_the_day: gradingResultData.rebuttalOfTheDay,
            script_adherence: deviationAnalysis, // Store deviation analysis
            script_hidden_duration: scriptHiddenDuration, // Pro Mode duration for XP multiplier
            // Deal tracking fields
            contract_signed: gradingResultData.dealTracking?.contractSigned || false,
            suggested_buy_price: gradingResultData.dealTracking?.suggestedBuyPrice || null,
            final_offer_price: gradingResultData.dealTracking?.finalOfferPrice || null,
            price_variance: gradingResultData.dealTracking?.priceVariance || null,
            test_stability_value: callData.metadata?.testStabilityValue || null, // Save test stability for A/B testing
            exit_strategy_chosen: normalizedExitStrategy || null, // Store exit strategy for auditing "Top Earner" decision-making
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
              negotiationPrecision: gradingResultData.negotiationPrecision || null,
              // Store hold data for validation
              holdDuration: callData.metadata?.holdDuration || 0,
              holdCount: callData.metadata?.holdCount || 0,
              priceChangesWithoutHold: gradingResultData.advocacy?.holdUtilization?.priceChangesWithoutHold || 0,
              // Model selection logging for cost optimization audit
              model_used: callData.metadata?.model_used || null,
              reason_for_selection: callData.metadata?.reason_for_selection || null,
              daily_spend_at_selection: callData.metadata?.daily_spend_at_selection || null,
              session_type: callData.metadata?.session_type || null,
            },
            ended_at: new Date().toISOString(),
          })
          .select()
          .single();

    if (error) {
      logger.error('Error storing call in database', { error, callId: callData.id });
      return NextResponse.json(
        { 
          error: 'Failed to store call',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    // Process call completion: detect commitment and trigger contract if needed
    try {
      const propertyAddress = callData.metadata?.propertyAddress || transcript.match(/address[:\s]+([^\n]+)/i)?.[1] || 'Unknown';
      const sellerName = callData.metadata?.sellerName || transcript.match(/(?:hi|hello|this is)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i)?.[1] || 'Seller';
      const sellerEmail = callData.metadata?.sellerEmail || null;
      const offerPrice = gradingResultData.dealTracking?.finalOfferPrice || gradingResultData.dealTracking?.suggestedBuyPrice || null;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const transcriptUrl = `${appUrl}/calls/${(data as any).id}`;

      // Extract ARV and repairs from transcript or metadata
      const estimatedARV = callData.metadata?.estimatedARV || callData.metadata?.arv || null;
      const estimatedRepairs = callData.metadata?.estimatedRepairs || callData.metadata?.repairs || null;

      // Process standard call completion (contract generation)
      const callActions = await processCallCompletion(
        callData.id,
        transcript,
        propertyAddress,
        sellerName,
        sellerEmail || undefined,
        offerPrice || undefined,
        normalizedExitStrategy || undefined,
        {
          callId: callData.id,
          userId: userId,
          contractSigned: gradingResultData.dealTracking?.contractSigned || false,
        }
      );

      // Process escalation for high-margin deals ($15k+ spread)
      if (callActions.commitmentDetected && offerPrice && sellerEmail) {
        const escalationResult = await processEscalation(
          callData.id,
          transcript,
          propertyAddress,
          sellerName,
          sellerEmail,
          offerPrice,
          normalizedExitStrategy || 'cash',
          estimatedARV || undefined,
          estimatedRepairs || undefined,
          transcriptUrl
        );

        if (escalationResult.smsSent || escalationResult.contractSent) {
          logger.info('Escalation processed', {
            callId: callData.id,
            smsSent: escalationResult.smsSent,
            contractSent: escalationResult.contractSent,
            contractUrl: escalationResult.contractUrl,
          });
        }
      }

      if (callActions.commitmentDetected) {
        logger.info('Commitment detected in call', {
          callId: callData.id,
          contractTriggered: callActions.contractTriggered,
          contractUrl: callActions.contractUrl,
        });
      }
    } catch (actionError) {
      logger.error('Error processing call actions', { error: actionError, callId: callData.id });
      // Don't fail the webhook if action processing fails
    }

    // Update optimizations with call_id now that we have it
    if (sentimentAnalysis && sentimentAnalysis.humanityScore < 80) {
      try {
        await (supabaseAdmin as any)
          .from('ai_optimizations')
          .update({ call_id: (data as any).id } as any)
          .is('call_id', null)
          .eq('assistant_id', personaId || 'unknown')
          .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Last minute
      } catch (error) {
        // Silently fail - not critical
        logger.debug('Error updating optimization call_id (non-critical)', { error, callId: data.id });
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
        logger.error('Error analyzing voice performance', { error: err, callId: data.id });
      });
    }

    return NextResponse.json({
      success: true,
      callId: data.id,
      goatScore: gradingResultData.goatScore,
    });
  } catch (error) {
    logger.error('Error processing webhook', { error });
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
