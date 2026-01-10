/**
 * Create Vapi Assistant API
 * Creates dynamic Vapi assistants with persona configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePersona, type DifficultyLevel } from '@/lib/generatePersona';
import type { PersonaMode } from '@/lib/vapi-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { difficulty, personaMode, voiceHintsEnabled } = body;

    if (!difficulty || !personaMode) {
      return NextResponse.json(
        { error: 'difficulty and personaMode are required' },
        { status: 400 }
      );
    }

    const validDifficulty = Math.max(1, Math.min(10, parseInt(difficulty))) as DifficultyLevel;
    const validPersonaMode = personaMode as PersonaMode;

    // Get Vapi secret key
    const vapiSecretKey = process.env.VAPI_SECRET_KEY;
    if (!vapiSecretKey) {
      return NextResponse.json(
        { error: 'VAPI_SECRET_KEY not configured' },
        { status: 500 }
      );
    }

    // Generate persona configuration
    const persona = generatePersona(validDifficulty, validPersonaMode);

    // Create assistant via Vapi API
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Sales Goat ${validPersonaMode} - Level ${validDifficulty}`,
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
        },
        firstMessage: persona.firstMessage,
        maxDurationSeconds: persona.maxDuration || 600,
        // Enable control API for voice hints
        serverUrl: process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi-webhook`
          : undefined,
        // Store metadata for later reference
        metadata: {
          difficulty: validDifficulty,
          personaMode: validPersonaMode,
          voiceHintsEnabled: voiceHintsEnabled || false,
          behaviors: persona.behaviors,
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
        difficulty: validDifficulty,
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
