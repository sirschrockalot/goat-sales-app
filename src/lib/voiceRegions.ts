/**
 * Geographic Voice Mirroring
 * Maps US states/regions to ElevenLabs Voice IDs for territory-based rapport
 */

export type USRegion = 'northeast' | 'south' | 'midwest' | 'west' | 'default';

export interface RegionalVoiceConfig {
  voiceId: string;
  name: string;
  region: USRegion;
  stability: number; // 0-1, lower = more variation
  speed?: number; // 0.8-1.2, speech rate multiplier
  similarityBoost?: number; // 0-1, higher = more consistent
  description: string;
}

/**
 * State to Region Mapping
 */
const STATE_TO_REGION: Record<string, USRegion> = {
  // Northeast
  'NY': 'northeast',
  'NEW YORK': 'northeast',
  'NJ': 'northeast',
  'NEW JERSEY': 'northeast',
  'MA': 'northeast',
  'MASSACHUSETTS': 'northeast',
  'CT': 'northeast',
  'CONNECTICUT': 'northeast',
  'PA': 'northeast',
  'PENNSYLVANIA': 'northeast',
  'RI': 'northeast',
  'RHODE ISLAND': 'northeast',
  'VT': 'northeast',
  'VERMONT': 'northeast',
  'NH': 'northeast',
  'NEW HAMPSHIRE': 'northeast',
  'ME': 'northeast',
  'MAINE': 'northeast',
  
  // Deep South
  'GA': 'south',
  'GEORGIA': 'south',
  'AL': 'south',
  'ALABAMA': 'south',
  'MS': 'south',
  'MISSISSIPPI': 'south',
  'TX': 'south',
  'TEXAS': 'south',
  'LA': 'south',
  'LOUISIANA': 'south',
  'AR': 'south',
  'ARKANSAS': 'south',
  'TN': 'south',
  'TENNESSEE': 'south',
  'SC': 'south',
  'SOUTH CAROLINA': 'south',
  'NC': 'south',
  'NORTH CAROLINA': 'south',
  'FL': 'south',
  'FLORIDA': 'south',
  
  // Midwest
  'OH': 'midwest',
  'OHIO': 'midwest',
  'IN': 'midwest',
  'INDIANA': 'midwest',
  'IL': 'midwest',
  'ILLINOIS': 'midwest',
  'MO': 'midwest',
  'MISSOURI': 'midwest',
  'MI': 'midwest',
  'MICHIGAN': 'midwest',
  'WI': 'midwest',
  'WISCONSIN': 'midwest',
  'MN': 'midwest',
  'MINNESOTA': 'midwest',
  'IA': 'midwest',
  'IOWA': 'midwest',
  'KS': 'midwest',
  'KANSAS': 'midwest',
  'NE': 'midwest',
  'NEBRASKA': 'midwest',
  'ND': 'midwest',
  'NORTH DAKOTA': 'midwest',
  'SD': 'midwest',
  'SOUTH DAKOTA': 'midwest',
  
  // West Coast
  'CA': 'west',
  'CALIFORNIA': 'west',
  'AZ': 'west',
  'ARIZONA': 'west',
  'NV': 'west',
  'NEVADA': 'west',
  'OR': 'west',
  'OREGON': 'west',
  'WA': 'west',
  'WASHINGTON': 'west',
  'UT': 'west',
  'UTAH': 'west',
  'CO': 'west',
  'COLORADO': 'west',
  'ID': 'west',
  'IDAHO': 'west',
  'MT': 'west',
  'MONTANA': 'west',
  'WY': 'west',
  'WYOMING': 'west',
  'NM': 'west',
  'NEW MEXICO': 'west',
};

/**
 * Regional Voice Configurations
 */
const REGIONAL_VOICES: Record<USRegion, RegionalVoiceConfig> = {
  northeast: {
    voiceId: 'z9fAnlkSqcjBvSqfU6nc', // Marcus - Direct/Assertive
    name: 'Marcus',
    region: 'northeast',
    stability: 0.6, // Faster, direct business culture
    speed: 1.1, // 10% faster speech rate
    similarityBoost: 0.8,
    description: 'Northeast Specialist - Direct & Assertive',
  },
  south: {
    voiceId: 'ErXw7SAsm4Li4Hq6msJp', // Clyde - Warm/Southern Drawl
    name: 'Clyde',
    region: 'south',
    stability: 0.4, // More emotional variation for Southern Hospitality
    speed: 0.9, // 10% slower for warmer, more deliberate speech
    similarityBoost: 0.7,
    description: 'Southern Specialist - Warm & Hospitable',
  },
  midwest: {
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel - Friendly/Neutral
    name: 'Rachel',
    region: 'midwest',
    stability: 0.5, // Balanced
    speed: 1.0, // Standard pace
    similarityBoost: 0.75,
    description: 'Midwest Specialist - Friendly & Neutral',
  },
  west: {
    voiceId: 'Lcf7u9O9v039i2kE53L7', // River - Relaxed/Modern
    name: 'River',
    region: 'west',
    stability: 0.5, // Relaxed, modern tone
    speed: 1.0, // Standard pace
    similarityBoost: 0.75,
    description: 'West Coast Specialist - Relaxed & Modern',
  },
  default: {
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel - Default friendly voice
    name: 'Rachel',
    region: 'default',
    stability: 0.5,
    speed: 1.0,
    similarityBoost: 0.75,
    description: 'National Specialist - Friendly & Professional',
  },
};

/**
 * Extract state from property location string
 * Handles formats like "Atlanta, GA", "GA", "Georgia", "123 Main St, Atlanta, GA 30309"
 */
export function extractStateFromLocation(location?: string | null): string | null {
  if (!location) return null;
  
  const upperLocation = location.toUpperCase().trim();
  
  // Try direct state code match first (e.g., "GA", "NY")
  const stateCode = upperLocation.match(/\b([A-Z]{2})\b/);
  if (stateCode) {
    const code = stateCode[1];
    if (STATE_TO_REGION[code]) {
      return code;
    }
  }
  
  // Try full state name match (e.g., "GEORGIA", "NEW YORK")
  for (const [stateName, region] of Object.entries(STATE_TO_REGION)) {
    if (stateName.length > 2 && upperLocation.includes(stateName)) {
      return stateName;
    }
  }
  
  return null;
}

/**
 * Get region from state code or name
 */
export function getRegionFromState(state: string | null): USRegion {
  if (!state) return 'default';
  
  const upperState = state.toUpperCase().trim();
  return STATE_TO_REGION[upperState] || 'default';
}

/**
 * Get regional voice configuration based on property location
 */
export function getRegionalVoiceConfig(propertyLocation?: string | null): RegionalVoiceConfig {
  const state = extractStateFromLocation(propertyLocation);
  const region = getRegionFromState(state);
  return REGIONAL_VOICES[region];
}

/**
 * Get voice persona label for HUD display
 */
export function getVoicePersonaLabel(propertyLocation?: string | null): string {
  const config = getRegionalVoiceConfig(propertyLocation);
  return config.description;
}

/**
 * Get all regional voice configurations (for admin/testing)
 */
export function getAllRegionalVoices(): RegionalVoiceConfig[] {
  return Object.values(REGIONAL_VOICES);
}
