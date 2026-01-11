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
import { getAmbientNoiseConfig, calculateResponseDelay } from '@/lib/vapiConfig';

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

    const body = await request.json();
    const { difficulty, personaMode, voiceHintsEnabled, gauntletLevel, roleReversal, exitStrategy, propertyLocation } = body;

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
        const acqLevel = getGauntletLevel(validGauntletLevel, exitStrategy);
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

    // Create assistant via Vapi API
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: assistantName,
        model: {
          provider: 'openai',
          model: persona.model, // GPT-4o
          temperature: persona.temperature,
          messages: [
            {
              role: 'system',
              content: persona.systemPrompt,
            },
          ],
        },
        voice: {
          provider: '11labs',
          voiceId: persona.voice,
          ...(persona.voiceStability !== undefined && {
            stability: persona.voiceStability,
          }),
        },
        firstMessage: persona.firstMessage || 'Hello, how can I help you today?',
        maxDurationSeconds: persona.maxDuration || 600,
        // Enable fillers and backchanneling for more human-like conversation
        fillersEnabled: true,
        backchannelingEnabled: true,
        backchannelingPhrases: [
          'Yeah',
          'Mhm',
          'I see',
          'Right',
          'Got it',
          'Interesting',
          'Uh-huh',
          'Sure',
          'I understand',
          'That makes sense',
        ],
        // Advanced interruption logic for human-like conversation
        interruptionThreshold: 50, // 50ms - makes AI "feel" user's voice instantly
        // Barge-in protection: if AI is mid-sentence about something important (like an objection),
        // wait for 200ms of sustained speech before stopping (allows for natural overlaps)
        bargeInProtection: {
          enabled: true,
          sustainedSpeechThreshold: 200, // 200ms of sustained speech before interrupting important points
        },
        // Humanized endpointing - prevents AI from "jumping the gun" on tiny pauses
        // Note: Dynamic timeout based on sentiment is handled via system prompt logic
        // The AI will naturally pause longer (1500ms) when processing heavy/negative sentiment
        endOfTurnDetectionTimeout: 700, // 700ms default - AI will extend to 1500ms for heavy sentiment
        silenceTimeout: 400, // 400ms - detects pauses for backchanneling
        // Dynamic response delay based on sentiment (handled via system prompt)
        // Heavy sentiment = 1500ms, Transactional = 400ms, Default = 700ms
        // Note: Vapi may not support replyDelay directly, but the AI is instructed to pause accordingly
        replyDelay: 700, // Default delay - AI will adjust based on sentiment (400ms-1500ms)
        // Background ambience - "Quiet Office" room tone at 2% volume (removes "digital silence")
        // Note: Vapi may not support ambientNoise directly, but we configure it if available
        ...(getAmbientNoiseConfig().enabled && {
          ambientNoise: {
            type: getAmbientNoiseConfig().type, // 'quiet_office'
            volume: getAmbientNoiseConfig().volume, // 0.02 (2%)
          },
        }),
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
          ...(propertyLocation && { propertyLocation }),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Vapi API error:', error);
      return NextResponse.json(
        { error: 'Failed to create Vapi assistant', details: error },
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
