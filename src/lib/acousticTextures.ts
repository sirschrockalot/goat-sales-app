/**
 * Acoustic Texture Library
 * Humanity tags that the AI can inject into its speech to achieve "Vocal Soul"
 */

export type AcousticTextureType = 'filler' | 'acoustic-cue' | 'transition';

export interface AcousticTexture {
  tag: string;
  type: AcousticTextureType;
  context: string[]; // When to use this texture
  frequency: 'common' | 'occasional' | 'rare';
}

/**
 * Fillers - Natural speech disfluencies
 */
export const FILLERS: AcousticTexture[] = [
  {
    tag: '[uh]',
    type: 'filler',
    context: ['thinking', 'calculating', 'considering'],
    frequency: 'common',
  },
  {
    tag: '[um]',
    type: 'filler',
    context: ['thinking', 'transitioning', 'searching-for-words'],
    frequency: 'common',
  },
  {
    tag: '[well...]',
    type: 'filler',
    context: ['introducing-rebuttal', 'acknowledging-objection', 'transitioning'],
    frequency: 'common',
  },
  {
    tag: '[I mean...]',
    type: 'filler',
    context: ['clarifying', 'correcting', 'emphasizing'],
    frequency: 'occasional',
  },
  {
    tag: '[you know]',
    type: 'filler',
    context: ['building-rapport', 'seeking-agreement', 'explaining'],
    frequency: 'occasional',
  },
  {
    tag: '[like]',
    type: 'filler',
    context: ['giving-example', 'comparing', 'explaining'],
    frequency: 'rare',
  },
];

/**
 * Acoustic Cues - Non-verbal sounds and behaviors
 */
export const ACOUSTIC_CUES: AcousticTexture[] = [
  {
    tag: '[sigh]',
    type: 'acoustic-cue',
    context: ['empathizing', 'acknowledging-difficulty', 'showing-understanding'],
    frequency: 'occasional',
  },
  {
    tag: '[clears throat]',
    type: 'acoustic-cue',
    context: ['preparing-important-statement', 'transitioning-to-serious-topic'],
    frequency: 'rare',
  },
  {
    tag: '[soft chuckle]',
    type: 'acoustic-cue',
    context: ['building-rapport', 'lightening-mood', 'acknowledging-humor'],
    frequency: 'occasional',
  },
  {
    tag: '[quick inhale]',
    type: 'acoustic-cue',
    context: ['about-to-speak', 'preparing-rebuttal', 'taking-information'],
    frequency: 'common',
  },
  {
    tag: '[exhales]',
    type: 'acoustic-cue',
    context: ['relieved', 'acknowledging-agreement', 'transitioning'],
    frequency: 'occasional',
  },
  {
    tag: '[hmm]',
    type: 'acoustic-cue',
    context: ['thinking', 'considering', 'processing'],
    frequency: 'common',
  },
];

/**
 * Transitions - Pauses and thinking indicators
 */
export const TRANSITIONS: AcousticTexture[] = [
  {
    tag: '[pause]',
    type: 'transition',
    context: ['after-question', 'before-important-statement', 'creating-suspense'],
    frequency: 'common',
  },
  {
    tag: '[thinking...]',
    type: 'transition',
    context: ['calculating', 'considering-options', 'processing-information'],
    frequency: 'occasional',
  },
  {
    tag: '[adjusts tone]',
    type: 'transition',
    context: ['shifting-to-empathy', 'becoming-more-serious', 'softening-approach'],
    frequency: 'rare',
  },
  {
    tag: '[long pause]',
    type: 'transition',
    context: ['after-objection', 'before-rebuttal', 'creating-impact'],
    frequency: 'rare',
  },
  {
    tag: '[slight pause]',
    type: 'transition',
    context: ['natural-break', 'breathing', 'collecting-thoughts'],
    frequency: 'common',
  },
];

/**
 * All acoustic textures combined
 */
export const ALL_ACOUSTIC_TEXTURES: AcousticTexture[] = [
  ...FILLERS,
  ...ACOUSTIC_CUES,
  ...TRANSITIONS,
];

/**
 * Get textures by context
 */
export function getTexturesByContext(context: string): AcousticTexture[] {
  return ALL_ACOUSTIC_TEXTURES.filter((texture) =>
    texture.context.some((c) => c.includes(context.toLowerCase()))
  );
}

/**
 * Get textures by type
 */
export function getTexturesByType(type: AcousticTextureType): AcousticTexture[] {
  return ALL_ACOUSTIC_TEXTURES.filter((texture) => texture.type === type);
}

/**
 * Get random texture for a context
 */
export function getRandomTextureForContext(context: string): AcousticTexture | null {
  const textures = getTexturesByContext(context);
  if (textures.length === 0) return null;

  // Weight by frequency
  const weightedTextures: AcousticTexture[] = [];
  textures.forEach((texture) => {
    const weight = texture.frequency === 'common' ? 3 : texture.frequency === 'occasional' ? 2 : 1;
    for (let i = 0; i < weight; i++) {
      weightedTextures.push(texture);
    }
  });

  return weightedTextures[Math.floor(Math.random() * weightedTextures.length)];
}

/**
 * Get current texture injection probability from config
 */
export async function getTextureInjectionProbability(): Promise<number> {
  // Default probability
  let probability = 0.3;

  // Check for adjusted probability from feedback injection
  try {
    const { supabaseAdmin } = await import('./supabase');
    if (supabaseAdmin) {
      const { data: config } = await supabaseAdmin
        .from('sandbox_config')
        .select('value')
        .eq('key', 'acoustic_texture_frequency')
        .single();

      if (config?.value) {
        const configValue = config.value as any;
        if (configValue.sessionsRemaining > 0) {
          probability = configValue.adjusted || 0.3;
          // Decrement sessions remaining
          await supabaseAdmin
            .from('sandbox_config')
            .update({
              value: {
                ...configValue,
                sessionsRemaining: configValue.sessionsRemaining - 1,
              },
            })
            .eq('key', 'acoustic_texture_frequency');
        } else {
          // Reset to base after sessions complete
          probability = configValue.base || 0.3;
        }
      }
    }
  } catch (error) {
    // Fallback to default if config not available
  }

  return probability;
}

/**
 * Inject textures into text based on context
 */
export function injectTextures(
  text: string,
  context: string,
  probability: number = 0.3
): string {
  // Don't inject if random chance doesn't hit
  if (Math.random() > probability) return text;

  const texture = getRandomTextureForContext(context);
  if (!texture) return text;

  // Inject at strategic points:
  // 1. Start of rebuttal
  // 2. Before price mention
  // 3. After objection acknowledgment

  if (context.includes('rebuttal') || context.includes('responding')) {
    return `${texture.tag} ${text}`;
  }

  if (context.includes('price') || context.includes('calculating')) {
    const priceMatch = text.match(/\$[\d,]+/);
    if (priceMatch) {
      const index = text.indexOf(priceMatch[0]);
      return text.slice(0, index) + `${texture.tag} ` + text.slice(index);
    }
  }

  return text;
}

/**
 * Strip all texture tags from text (for final output)
 */
export function stripTextures(text: string): string {
  let cleaned = text;
  ALL_ACOUSTIC_TEXTURES.forEach((texture) => {
    cleaned = cleaned.replace(new RegExp(texture.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  });
  return cleaned.trim();
}

/**
 * Get texture tags as string array (for prompt injection)
 */
export function getTextureTagsAsString(): string {
  return ALL_ACOUSTIC_TEXTURES.map((t) => t.tag).join(', ');
}
