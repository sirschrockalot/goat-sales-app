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
      console.error('Failed to parse request body:', error);
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
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: assistantName,
        model: useCentralizedConfig && centralizedConfig
          ? {
              provider: centralizedConfig.model.provider,
              model: selectedModel, // Optimized model (GPT-4o or GPT-4o-Mini)
              temperature: centralizedConfig.model.temperature,
              messages: [
                {
                  role: 'system',
                  content: centralizedConfig.systemPrompt, // Full 2.0 script + PA Summary
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
                  content: persona.systemPrompt,
                },
              ],
            },
        voice: (() => {
          // Learning Mode (roleReversal=true): Use centralized config with test stability for A/B testing
          if (useCentralizedConfig && centralizedConfig) {
            return {
              provider: centralizedConfig.voice.provider,
              voiceId: centralizedConfig.voice.voiceId, // nPczCjzI2devNBz1zWls (Brian)
              model: centralizedConfig.voice.model,
              stability: testStabilityValue, // Use test stability for A/B testing (overrides context-aware)
              similarityBoost: centralizedConfig.voice.similarityBoost, // 0.8
              ...(centralizedConfig.voice.style !== undefined && {
                style: centralizedConfig.voice.style, // Context-aware: 0.15 (rapport) or 0.05 (contract)
              }),
            };
          }
          
          // Learning Mode (roleReversal=true): AI is acquisition agent, use Brian - Professional Closer with test stability
          if (isRoleReversal && validPersonaMode === 'acquisition') {
            const closerConfig = getElevenLabsCloserConfig();
            return {
              provider: closerConfig.provider,
              voiceId: closerConfig.voiceId,
              model: closerConfig.model,
              stability: testStabilityValue, // Use test stability for A/B testing
              similarityBoost: closerConfig.similarityBoost,
              ...(voiceSettings.style !== undefined && {
                style: voiceSettings.style, // Context-aware style
              }),
            };
          }
          
          // Practice Mode (roleReversal=false, acquisition): Use regional voice if propertyLocation provided
          if (!isRoleReversal && validPersonaMode === 'acquisition' && propertyLocation) {
            const regionalConfig = getRegionalVoiceConfig(propertyLocation);
            return {
              provider: 'elevenlabs',
              voiceId: regionalConfig.voiceId,
              model: 'eleven_turbo_v2_5',
              stability: testStabilityValue, // Use test stability for A/B testing
              similarityBoost: regionalConfig.similarityBoost || 0.75,
              // Note: speed is not directly supported in Vapi voice config, but can be adjusted via SSML
            };
          }
          
          // Practice Mode (roleReversal=false, acquisition): AI is seller, use Stella for fast responses (no propertyLocation)
          if (!isRoleReversal && validPersonaMode === 'acquisition') {
            const sellerConfig = getElevenLabsSellerConfig();
            return {
              provider: sellerConfig.provider,
              voiceId: sellerConfig.voiceId,
              model: sellerConfig.model,
              stability: testStabilityValue, // Use test stability for A/B testing
              similarityBoost: sellerConfig.similarityBoost,
            };
          }
          
          // Acquisitions Gauntlet: Use regional voice if propertyLocation provided
          if (gauntletLevel && validPersonaMode === 'acquisition' && propertyLocation) {
            const regionalConfig = getRegionalVoiceConfig(propertyLocation);
            return {
              provider: 'elevenlabs',
              voiceId: regionalConfig.voiceId,
              model: 'eleven_turbo_v2_5',
              stability: testStabilityValue, // Use test stability for A/B testing
              similarityBoost: regionalConfig.similarityBoost || 0.75,
            };
          }
          
          // Acquisitions Gauntlet: AI is seller, use Stella for fast responses (no propertyLocation)
          if (gauntletLevel && validPersonaMode === 'acquisition') {
            const sellerConfig = getElevenLabsSellerConfig();
            return {
              provider: sellerConfig.provider,
              voiceId: sellerConfig.voiceId,
              model: sellerConfig.model,
              stability: testStabilityValue, // Use test stability for A/B testing
              similarityBoost: sellerConfig.similarityBoost,
            };
          }
          
          // Default: Use persona voice with test stability for A/B testing
          return {
            provider: '11labs',
            voiceId: persona.voice,
            stability: testStabilityValue, // Use test stability for A/B testing
          };
        })(),
        // Configure Deepgram STT for fast transcription (250ms endpointing)
        transcriber: (() => {
          const deepgramConfig = getDeepgramSTTConfig();
          return {
            provider: deepgramConfig.provider,
            model: deepgramConfig.model,
            endpointing: deepgramConfig.endpointing,
          };
        })(),
        firstMessage: useCentralizedConfig && centralizedConfig
          ? centralizedConfig.firstMessage // Dynamic firstMessage with seller name and property address
          : persona.firstMessage || 'Hello, how can I help you today?',
        maxDurationSeconds: persona.maxDuration || 600,
        // Enable fillers and backchanneling for more human-like conversation
        // Note: These properties are configured via the Vapi SDK on the client-side, not in the assistant creation API
        fillersEnabled: true,
        backchannelingEnabled: true,
        // Configure background sound to allow ambient noise
        // "off" disables noise filtering, allowing ambient sounds to be heard
        // This enables the "quiet office" ambient noise effect
        backgroundSound: 'off',
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
        },
      }),
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
        console.error('Vapi API error (JSON):', errorJson);
      } catch {
        const errorText = await response.text();
        errorDetails = errorText || `HTTP ${response.status} ${response.statusText}`;
        errorMessage = errorText || `HTTP ${response.status} ${response.statusText}`;
        console.error('Vapi API error (text):', errorDetails);
      }
      return NextResponse.json(
        { 
          error: 'Failed to create Vapi assistant',
          message: errorMessage,
          details: errorDetails,
          status: response.status,
          statusText: response.statusText
        },
        { status: response.status }
      );
    }

    const assistant = await response.json();

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
    console.error('Error creating Vapi assistant:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
