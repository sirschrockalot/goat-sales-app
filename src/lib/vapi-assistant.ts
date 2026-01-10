/**
 * Vapi Assistant Creation
 * Creates and configures Vapi assistants with dynamic personas
 */

import { generatePersona, type DifficultyLevel, type PersonaConfig } from './generatePersona';
import type { PersonaMode } from './vapi-client';

export interface AssistantConfig {
  name: string;
  persona: PersonaConfig;
  difficulty: DifficultyLevel;
  personaMode: PersonaMode;
  voiceHintsEnabled?: boolean;
}

/**
 * Create Vapi assistant configuration
 * This would be called server-side to create the assistant via Vapi API
 */
export async function createVapiAssistant(config: AssistantConfig): Promise<{
  assistantId: string;
  controlUrl?: string;
}> {
  const vapiSecretKey = process.env.VAPI_SECRET_KEY;
  if (!vapiSecretKey) {
    throw new Error('VAPI_SECRET_KEY not configured');
  }

  const { persona, name } = config;

  // Create assistant via Vapi API
  const response = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vapiSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name || `Sales Goat Trainer - ${config.difficulty}/10`,
      model: {
        provider: 'openai',
        model: persona.model,
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
        difficulty: config.difficulty,
        personaMode: config.personaMode,
        voiceHintsEnabled: config.voiceHintsEnabled || false,
        behaviors: persona.behaviors,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Vapi assistant: ${error}`);
  }

  const assistant = await response.json();

  return {
    assistantId: assistant.id,
    controlUrl: assistant.controlUrl,
  };
}

/**
 * Get or create assistant for a difficulty level
 * Caches assistants to avoid recreating them
 */
const assistantCache = new Map<string, string>();

export async function getOrCreateAssistant(
  difficulty: DifficultyLevel,
  personaMode: PersonaMode,
  voiceHintsEnabled: boolean = false
): Promise<string> {
  const cacheKey = `${personaMode}-${difficulty}-${voiceHintsEnabled}`;
  
  // Check cache first
  if (assistantCache.has(cacheKey)) {
    return assistantCache.get(cacheKey)!;
  }

  // Generate persona
  const persona = generatePersona(difficulty, personaMode);

  // Create assistant
  const { assistantId } = await createVapiAssistant({
    name: `Sales Goat ${personaMode} - Level ${difficulty}`,
    persona,
    difficulty,
    personaMode,
    voiceHintsEnabled,
  });

  // Cache it
  assistantCache.set(cacheKey, assistantId);

  return assistantId;
}

/**
 * Update assistant for voice hints mode
 * Modifies the assistant to enable/disable coaching hints
 */
export async function updateAssistantForVoiceHints(
  assistantId: string,
  voiceHintsEnabled: boolean
): Promise<void> {
  const vapiSecretKey = process.env.VAPI_SECRET_KEY;
  if (!vapiSecretKey) {
    throw new Error('VAPI_SECRET_KEY not configured');
  }

  // Update assistant metadata
  await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${vapiSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      metadata: {
        voiceHintsEnabled,
      },
    }),
  });
}
