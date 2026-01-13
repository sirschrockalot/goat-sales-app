/**
 * Create Vapi Assistant API
 * Creates dynamic Vapi assistants with persona configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePersona, type DifficultyLevel } from '@/lib/generatePersona';
import { getGauntletLevel } from '@/lib/gauntletLevels';
import { getDispoGauntletLevel } from '@/lib/dispoGauntletLevels';
import { getUserFromRequest } from '@/lib/getUserFromRequest';
import type { PersonaMode } from '@/lib/vapi-client';
import type { GauntletLevel } from '@/lib/gauntletLevels';
import { getElevenLabsCloserConfig, getElevenLabsSellerConfig, getDeepgramSTTConfig, getCentralizedAssistantConfig, getVoiceSettings, getTestStability, type ScriptGate } from '@/lib/vapiConfig';
import { getRegionalVoiceConfig, getVoicePersonaLabel } from '@/lib/voiceRegions';
import { getOptimalModel, determineSessionType, formatModelSelectionForLogging } from '@/lib/modelSwitcher';
import { prepareCallWithNeighborhoodContext } from '@/lib/neighborhoodPulse';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from request
    const { user, error: authError } = await getUserFromRequest(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      logger.error('Failed to parse request body', { error });
      return NextResponse.json(
        { error: 'Invalid request body', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }
    
    const { difficulty, personaMode, voiceHintsEnabled, gauntletLevel, roleReversal, exitStrategy, propertyLocation, sellerName, propertyAddress, currentGate, apexLevel, battleTestMode } = body;

    if (!personaMode) {
      return NextResponse.json(
        { error: 'personaMode is required' },
        { status: 400 }
      );
    }

    const validPersonaMode = personaMode as PersonaMode;

    // Get Vapi secret key
    const vapiSecretKey = process.env.VAPI_SECRET_KEY;
    if (!vapiSecretKey) {
      return NextResponse.json(
        { error: 'VAPI_SECRET_KEY not configured' },
        { status: 500 }
      );
    }

    // Determine persona configuration
    let persona: {
      systemPrompt: string;
      model: string;
      voice: string;
      temperature: number;
      firstMessage?: string;
      maxDuration?: number;
      behaviors?: any;
      voiceStability?: number;
    };

    // If gauntletLevel is provided, use Gauntlet personas
    if (gauntletLevel && (gauntletLevel >= 1 && gauntletLevel <= 5)) {
      const validGauntletLevel = gauntletLevel as GauntletLevel;
      
      if (validPersonaMode === 'disposition') {
        const dispoLevel = getDispoGauntletLevel(validGauntletLevel);
        persona = {
          systemPrompt: dispoLevel.systemPrompt,
          model: dispoLevel.model,
          voice: dispoLevel.voice,
          temperature: dispoLevel.temperature,
          firstMessage: dispoLevel.firstMessage,
          voiceStability: dispoLevel.voiceStability,
          behaviors: dispoLevel.behaviors,
        };
      } else {
        // Determine apex level: battle-test > apex > standard
        const finalApexLevel = battleTestMode === true || battleTestMode === 'true' 
          ? 'battle-test' 
          : (apexLevel || 'standard');
        
        const acqLevel = getGauntletLevel(validGauntletLevel, exitStrategy, finalApexLevel, propertyLocation);
        persona = {
          systemPrompt: acqLevel.systemPrompt,
          model: acqLevel.model,
          voice: acqLevel.voice,
          temperature: acqLevel.temperature,
          behaviors: acqLevel.behaviors,
        };
      }
    } else {
      // Use dynamic persona generation for non-gauntlet calls
      if (!difficulty) {
        return NextResponse.json(
          { error: 'difficulty is required when not using gauntletLevel' },
          { status: 400 }
        );
      }
      const validDifficulty = Math.max(1, Math.min(10, parseInt(difficulty))) as DifficultyLevel;
      const isRoleReversal = roleReversal === true || roleReversal === 'true';
      persona = generatePersona(validDifficulty, validPersonaMode, isRoleReversal, propertyLocation, exitStrategy);
      
      // Store roleReversal in persona for voice selection logic
      (persona as any).roleReversal = isRoleReversal;
    }

    // Check if we should use a pre-created assistant ID for acquisitions gauntlet
    if (gauntletLevel && validPersonaMode === 'acquisition') {
      const acquisitionsAssistantId = process.env.ACQUISITIONS_ASSISTANT_ID;
      
      if (acquisitionsAssistantId) {
        // Use the pre-created "Hard-to-Get" Acquisitions Assistant
        // Return the assistant ID without creating a new one
        return NextResponse.json({
          success: true,
          assistantId: acquisitionsAssistantId,
          controlUrl: undefined, // Control URL is managed by Vapi for pre-created assistants
          persona: {
            gauntletLevel,
            personaMode: validPersonaMode,
            model: persona.model,
            voice: persona.voice,
          },
        });
      }
    }

    // Create assistant name
    const assistantName = gauntletLevel
      ? `Sales Goat ${validPersonaMode === 'disposition' ? 'Dispo' : 'Acquisition'} - Gauntlet Level ${gauntletLevel}`
      : `Sales Goat ${validPersonaMode} - Level ${difficulty}`;

    // Check if we should use centralized config for Learning Mode
    const isRoleReversal = roleReversal === true || roleReversal === 'true';
    let useCentralizedConfig = false;
    let centralizedConfig: Awaited<ReturnType<typeof getCentralizedAssistantConfig>> | null = null;

    // Inject neighborhood context if property address is provided
    let enhancedSystemPrompt = persona.systemPrompt;
    let neighborhoodContext = null;
    if (propertyAddress && !isRoleReversal) {
      // Extract zip code from address or use propertyLocation
      const zipMatch = propertyAddress.match(/\b\d{5}(-\d{4})?\b/);
      const zipCode = zipMatch ? zipMatch[0] : propertyLocation?.match(/\b\d{5}\b/)?.[0] || '';
      
      if (zipCode) {
        try {
          const contextResult = await prepareCallWithNeighborhoodContext(
            persona.systemPrompt,
            propertyAddress,
            zipCode,
            propertyLocation?.split(',')[0]?.trim(),
            propertyLocation?.split(',')[1]?.trim()
          );
          enhancedSystemPrompt = contextResult.enhancedPrompt;
          neighborhoodContext = contextResult.context;
          logger.info('Neighborhood context injected', {
            address: propertyAddress,
            zipCode,
            compsCount: contextResult.context.cashComps.length,
          });
        } catch (error) {
          logger.warn('Error injecting neighborhood context', { error, propertyAddress });
          // Continue with original prompt if context injection fails
        }
      }
    }

    if (isRoleReversal && validPersonaMode === 'acquisition') {
      // Use centralized config for Learning Mode (roleReversal)
      // Pass currentGate for context-aware voice settings (defaults to 'Introduction' for initial setup)
      useCentralizedConfig = true;
      centralizedConfig = await getCentralizedAssistantConfig(
        userId,
        propertyLocation,
        sellerName,
        propertyAddress,
        currentGate || 'Introduction' // Default to Introduction gate for initial call setup
      );
    }

    // Get context-aware voice settings for non-centralized configs
    // This allows all modes to benefit from phase-based voice settings
    const voiceSettings = getVoiceSettings(currentGate || 'Introduction');
    
    // Get test stability value for A/B testing (randomly assigns 0.35, 0.45, or 0.55)
    // This will be saved to the calls table to track performance
    const testStabilityValue = getTestStability();

    // Model Selection: Optimize costs based on daily spend and session type
    const sessionType = determineSessionType(battleTestMode, apexLevel, gauntletLevel, roleReversal);
    const modelSelection = await getOptimalModel(sessionType, battleTestMode);
    
    // Override model based on cost optimization
    const selectedModel = modelSelection.model;
    const modelSelectionLog = formatModelSelectionForLogging(modelSelection);

    // Create assistant via Vapi API
    // Note: Vapi automatically publishes assistants when they're created successfully
    // We don't need to set a 'published' field - it's not accepted by the API
    const assistantPayload: any = {
        name: assistantName,
        model: useCentralizedConfig && centralizedConfig
          ? {
              provider: centralizedConfig.model.provider,
              model: selectedModel, // Optimized model (GPT-4o or GPT-4o-Mini)
              temperature: centralizedConfig.model.temperature,
              messages: [
                {
                  role: 'system',
                  content: neighborhoodContext
                    ? await prepareCallWithNeighborhoodContext(
                        centralizedConfig.systemPrompt,
                        propertyAddress || '',
                        propertyLocation?.match(/\b\d{5}\b/)?.[0] || '',
                        propertyLocation?.split(',')[0]?.trim(),
                        propertyLocation?.split(',')[1]?.trim()
                      ).then((r) => r.enhancedPrompt)
                    : centralizedConfig.systemPrompt, // Full 2.0 script + PA Summary + Market Intelligence
                },
              ],
            }
          : {
              provider: 'openai',
              model: selectedModel, // Optimized model (GPT-4o or GPT-4o-Mini)
              temperature: persona.temperature,
              messages: [
                {
                  role: 'system',
                  content: enhancedSystemPrompt, // Includes neighborhood context if available
                },
              ],
            },
        voice: (() => {
          // Helper function to add fallback to any voice config
          const addVoiceFallback = (voiceConfig: any) => {
            return {
              ...voiceConfig,
              // Add fallback plan for reliability (Vapi uses fallbackPlan, not fallback)
              // This ensures calls can continue even if ElevenLabs has issues
              fallbackPlan: {
                voices: [
                  {
                    provider: 'openai',
                    voiceId: 'alloy', // OpenAI's professional voice (available without additional config)
                  },
                ],
              },
            };
          };

          // Learning Mode (roleReversal=true): Use centralized config with test stability for A/B testing
          if (useCentralizedConfig && centralizedConfig) {
            // Full voice configuration with ElevenLabs settings (model, stability, similarityBoost)
            // Now that ElevenLabs integration is back, we can use full voice control
            return addVoiceFallback({
              provider: '11labs',
              voiceId: centralizedConfig.voice.voiceId, // Brian - Deep, Resonant and Comforting (from vapiConfig)
              model: centralizedConfig.voice.model, // eleven_turbo_v2_5
              stability: centralizedConfig.voice.stability, // Context-aware stability
              similarityBoost: centralizedConfig.voice.similarityBoost, // 0.8 for consistency
            });
          }
          
          // Learning Mode (roleReversal=true): AI is acquisition agent, use Brian - Professional Closer
          if (isRoleReversal && validPersonaMode === 'acquisition') {
            const closerConfig = getElevenLabsCloserConfig();
            return addVoiceFallback({
              provider: closerConfig.provider,
              voiceId: closerConfig.voiceId,
              model: closerConfig.model,
              stability: closerConfig.stability,
              similarityBoost: closerConfig.similarityBoost,
            });
          }
          
          // Practice Mode (roleReversal=false, acquisition): Use regional voice if propertyLocation provided
          if (!isRoleReversal && validPersonaMode === 'acquisition' && propertyLocation) {
            const regionalConfig = getRegionalVoiceConfig(propertyLocation);
            // Regional voices use default ElevenLabs settings
            return addVoiceFallback({
              provider: '11labs',
              voiceId: regionalConfig.voiceId,
              model: 'eleven_turbo_v2_5',
              stability: 0.5,
              similarityBoost: 0.75,
            });
          }
          
          // Practice Mode (roleReversal=false, acquisition): AI is seller, use Stella for fast responses
          if (!isRoleReversal && validPersonaMode === 'acquisition') {
            const sellerConfig = getElevenLabsSellerConfig();
            return addVoiceFallback({
              provider: sellerConfig.provider,
              voiceId: sellerConfig.voiceId,
              model: sellerConfig.model,
              stability: sellerConfig.stability,
              similarityBoost: sellerConfig.similarityBoost,
            });
          }
          
          // Acquisitions Gauntlet: Use regional voice if propertyLocation provided
          if (gauntletLevel && validPersonaMode === 'acquisition' && propertyLocation) {
            const regionalConfig = getRegionalVoiceConfig(propertyLocation);
            return addVoiceFallback({
              provider: '11labs',
              voiceId: regionalConfig.voiceId,
              model: 'eleven_turbo_v2_5',
              stability: 0.5,
              similarityBoost: 0.75,
            });
          }
          
          // Acquisitions Gauntlet: AI is seller, use Stella for fast responses
          if (gauntletLevel && validPersonaMode === 'acquisition') {
            const sellerConfig = getElevenLabsSellerConfig();
            return addVoiceFallback({
              provider: sellerConfig.provider,
              voiceId: sellerConfig.voiceId,
              model: sellerConfig.model,
              stability: sellerConfig.stability,
              similarityBoost: sellerConfig.similarityBoost,
            });
          }
          
          // Default: Use persona voice with full ElevenLabs configuration
          return addVoiceFallback({
            provider: '11labs',
            voiceId: persona.voice,
            model: 'eleven_turbo_v2_5',
            stability: 0.5,
            similarityBoost: 0.75,
          });
        })(),
        // Configure Deepgram STT for fast transcription with improved sensitivity
        // Uses nova-2-general model for production (better accuracy)
        // Add OpenAI as fallback for reliability
        // Note: Vapi API maximum endpointing is 500ms, so we use that for both modes
        // The prompt instructions ensure Learning Mode pauses and waits for responses
        transcriber: (() => {
          const deepgramConfig = getDeepgramSTTConfig();
          // Vapi API maximum is 500ms - use that for both Learning and Practice modes
          // The system prompt instructions handle pausing behavior in Learning Mode
          return {
            provider: deepgramConfig.provider,
            model: deepgramConfig.model, // nova-2-general for production
            endpointing: deepgramConfig.endpointing, // 500ms (Vapi maximum) - gives time for speech completion
            language: deepgramConfig.language, // en-US for better accuracy
            // Note: punctuate and smart_format are not supported in Vapi API
            // These may be configured via Deepgram directly or in Vapi Dashboard settings
            // Add fallback plan for reliability (Vapi uses fallbackPlan, not fallback)
            // Vapi requires specific OpenAI transcriber models: gpt-4o-transcribe or gpt-4o-mini-transcribe
            fallbackPlan: {
              transcribers: [
                {
                  provider: 'openai',
                  model: 'gpt-4o-mini-transcribe', // Vapi's required format for OpenAI transcriber fallback
                },
              ],
            },
          };
        })(),
        firstMessage: useCentralizedConfig && centralizedConfig
          ? centralizedConfig.firstMessage // Dynamic firstMessage with seller name and property address
          : persona.firstMessage || 'Hello, how can I help you today?',
        maxDurationSeconds: persona.maxDuration || 600,
        // CRITICAL: Enable clientMessages to receive transcriptions on the client side
        // Without this, the app won't receive transcription events even if the microphone is working
        clientMessages: [
          'conversation-update',
          'function-call',
          'hang',
          'model-output',
          'speech-update',
          'status-update',
          'transfer-update',
          'transcript', // REQUIRED: Enables client to receive transcription events
          'tool-calls',
          'user-interrupted',
          'voice-input',
          'workflow.node.started',
        ],
        // Enable fillers and backchanneling for more human-like conversation
        // Note: These properties are configured via the Vapi SDK on the client-side, not in the assistant creation API
        fillersEnabled: true,
        backchannelingEnabled: true, // Enable backchanneling so AI can say "Mm-hmm" or "Okay" while caller speaks
        // Configure turn-taking to prevent AI from steamrolling the caller
        // Start Speaking Plan: Controls when AI begins speaking after caller finishes
        startSpeakingPlan: {
          waitSeconds: 0.8, // Wait 800ms after caller finishes before responding (prevents interruption)
        },
        // Stop Speaking Plan: Controls when AI stops if caller interrupts
        stopSpeakingPlan: {
          voiceSeconds: 0.2, // Stop if caller speaks for 0.2 seconds (allows natural interruption)
        },
        // Configure background speech denoising to filter out user's background noise
        // This prevents background noise from interrupting the AI agent
        // NOTE: Re-enabled because background noise was causing the agent to stop talking
        backgroundSpeechDenoisingPlan: {
          smartDenoisingPlan: {
            enabled: true, // Enable intelligent noise reduction using Krisp
          },
          fourierDenoisingPlan: {
            enabled: true, // Enable additional noise filtering
            mediaDetectionEnabled: true, // Detect and filter media-related noise
            baselineOffsetDb: -10, // Noise reduction level (-10dB)
            windowSizeMs: 2000, // Adaptation speed to noise changes (2 seconds)
            baselinePercentile: 90, // Focus on clear speech by setting noise threshold
          },
        },
        // Note: backgroundSound is kept disabled to avoid adding artificial noise
        // Enable control API for voice hints
        serverUrl: process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi-webhook`
          : undefined,
        // Store metadata for later reference (including userId for webhook)
        metadata: {
          userId: userId, // Include userId so webhook can associate call with user
          ...(gauntletLevel ? { gauntletLevel } : { difficulty }),
          personaMode: validPersonaMode,
          voiceHintsEnabled: voiceHintsEnabled || false,
          behaviors: persona.behaviors,
          ...(exitStrategy && { exitStrategy }),
          ...(propertyLocation && { 
            propertyLocation,
            voicePersona: getVoicePersonaLabel(propertyLocation), // Store voice persona label for HUD
          }),
          testStabilityValue: testStabilityValue, // Save test stability for A/B testing analysis
          // Model selection logging for cost optimization audit
          model_used: modelSelectionLog.model_used,
          reason_for_selection: modelSelectionLog.reason_for_selection,
          daily_spend_at_selection: modelSelectionLog.daily_spend,
          session_type: modelSelectionLog.session_type,
          selectedModel: selectedModel, // Store the actual model used
        },
      };

    // Validate voice provider is correct format
    if (assistantPayload.voice && assistantPayload.voice.provider !== '11labs') {
      logger.warn('Voice provider mismatch, forcing to 11labs', {
        originalProvider: assistantPayload.voice.provider,
      });
      assistantPayload.voice.provider = '11labs';
    }

    // Validate and ensure all required voice fields are present
    if (assistantPayload.voice) {
      // Validate voice ID exists (not a name)
      if (!assistantPayload.voice.voiceId) {
        logger.error('Voice ID is missing - assistant creation will fail');
      } else if (assistantPayload.voice.voiceId.length < 10 || !/^[a-zA-Z0-9_-]+$/.test(assistantPayload.voice.voiceId)) {
        logger.warn('Voice ID may be invalid', {
          voiceId: assistantPayload.voice.voiceId,
          expectedFormat: 'alphanumeric string',
        });
      }
      
      // Ensure all required ElevenLabs fields are present for full voice control
      // With custom ElevenLabs credentials, we can use the full configuration
      if (!assistantPayload.voice.model) {
        assistantPayload.voice.model = 'eleven_turbo_v2_5';
      }
      if (assistantPayload.voice.stability === undefined) {
        assistantPayload.voice.stability = 0.5;
      }
      if (assistantPayload.voice.similarityBoost === undefined) {
        assistantPayload.voice.similarityBoost = 0.75;
      }
      
      logger.debug('Using full ElevenLabs voice configuration', {
        provider: assistantPayload.voice.provider,
        voiceId: assistantPayload.voice.voiceId,
        model: assistantPayload.voice.model,
        stability: assistantPayload.voice.stability,
        similarityBoost: assistantPayload.voice.similarityBoost,
      });
    }

    // Log the payload for debugging (sensitive data auto-redacted by logger)
    logger.debug('Creating Vapi assistant', {
      payload: {
        ...assistantPayload,
        model: { ...assistantPayload.model, messages: '[REDACTED]' },
        voice: assistantPayload.voice,
      },
    });
    
    // Log voice configuration for troubleshooting
    logger.debug('Voice configuration details', {
      provider: assistantPayload.voice?.provider,
      voiceId: assistantPayload.voice?.voiceId,
      model: assistantPayload.voice?.model,
      stability: assistantPayload.voice?.stability,
      similarityBoost: assistantPayload.voice?.similarityBoost,
    });

    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assistantPayload),
    });

    if (!response.ok) {
      let errorDetails: string;
      let errorMessage: string = 'Unknown error';
      try {
        const errorJson = await response.json();
        errorDetails = JSON.stringify(errorJson);
        // Try to extract a meaningful error message from the JSON response
        if (errorJson.message) {
          errorMessage = errorJson.message;
        } else if (errorJson.error) {
          errorMessage = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
        } else if (errorJson.details) {
          errorMessage = typeof errorJson.details === 'string' ? errorJson.details : JSON.stringify(errorJson.details);
        }
        logger.error('Vapi API error', { errorJson });
      } catch {
        const errorText = await response.text();
        errorDetails = errorText || `HTTP ${response.status} ${response.statusText}`;
        errorMessage = errorText || `HTTP ${response.status} ${response.statusText}`;
        logger.error('Vapi API error (text response)', { errorDetails });
      }
      // Enhanced error message for voice-related errors
      let enhancedMessage = errorMessage;
      if (errorMessage.includes('11labs Voice') || errorMessage.includes('Couldn\'t Find')) {
        enhancedMessage = `${errorMessage}\n\n🔧 TROUBLESHOOTING:\n` +
          `Voice ID "${assistantPayload.voice?.voiceId}" is correct in your ElevenLabs account, but Vapi can't find it.\n\n` +
          `This usually means:\n` +
          `1. The voice sync hasn't completed yet (wait 1-2 minutes after resetting API key)\n` +
          `2. Your ElevenLabs API key might not have the right permissions\n` +
          `3. There's a mismatch between Vapi's voice library and your account\n\n` +
          `SOLUTIONS (try in order):\n` +
          `1. Wait 2-3 minutes after syncing, then try again\n` +
          `2. Verify your ElevenLabs API key has "Unrestricted" permissions (not "Limited")\n` +
          `3. Remove custom credentials temporarily to test:\n` +
          `   - Go to Vapi Dashboard → Settings → Integrations → ElevenLabs\n` +
          `   - Remove/Disconnect your ElevenLabs API key\n` +
          `   - Try creating an assistant (this will use Vapi's default voices)\n` +
          `   - If that works, the issue is with your custom credentials setup\n\n` +
          `Current voice config: provider="${assistantPayload.voice?.provider}", voiceId="${assistantPayload.voice?.voiceId}"`;
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create Vapi assistant',
          message: enhancedMessage,
          details: errorDetails,
          status: response.status,
          statusText: response.statusText,
          voiceConfig: {
            provider: assistantPayload.voice?.provider,
            voiceId: assistantPayload.voice?.voiceId,
            troubleshooting: 'See message above for troubleshooting steps'
          }
        },
        { status: response.status }
      );
    }

    const assistant = await response.json();
    
    // Set context for subsequent logs
    logger.setContext({
      assistantId: assistant.id,
      userId,
    });
    
    logger.info('Vapi assistant created successfully', {
      assistantId: assistant.id,
      personaMode: validPersonaMode,
      model: selectedModel,
      modelSelection: modelSelectionLog,
    });

    // After assistant creation, update it to ensure background speech denoising is enabled
    // This prevents background noise from interrupting the AI agent
    // Some settings may need to be set via PATCH if they weren't accepted in POST
    try {
      const updatePayload: any = {
        backgroundSpeechDenoisingPlan: {
          smartDenoisingPlan: {
            enabled: true,
          },
          fourierDenoisingPlan: {
            enabled: true,
            mediaDetectionEnabled: true,
            baselineOffsetDb: -10,
            windowSizeMs: 2000,
            baselinePercentile: 90,
          },
        },
      };

      const updateResponse = await fetch(`https://api.vapi.ai/assistant/${assistant.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${vapiSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (updateResponse.ok) {
        logger.info('Background speech denoising settings updated successfully', {
          assistantId: assistant.id,
        });
      } else {
        // Log but don't fail - assistant was created successfully
        const updateError = await updateResponse.text();
        logger.warn('Could not update background denoising settings (assistant created successfully)', {
          assistantId: assistant.id,
          error: updateError,
        });
      }
    } catch (updateError) {
      // Log but don't fail - assistant was created successfully
      logger.warn('Error updating background denoising settings (assistant created successfully)', {
        assistantId: assistant.id,
        error: updateError,
      });
    }

    return NextResponse.json({
      success: true,
      assistantId: assistant.id,
      controlUrl: assistant.controlUrl,
      persona: {
        ...(gauntletLevel ? { gauntletLevel } : { difficulty }),
        personaMode: validPersonaMode,
        model: persona.model,
        voice: persona.voice,
      },
    });
  } catch (error) {
    logger.error('Error creating Vapi assistant', { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
