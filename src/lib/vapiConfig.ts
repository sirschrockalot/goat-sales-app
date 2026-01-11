/**
 * Vapi Configuration Utilities
 * Handles dynamic configuration for human-like speech patterns
 */

/**
 * Calculate dynamic endOfTurnDetectionTimeout based on sentiment
 * If user's last message contained heavy/negative sentiment, increase delay to simulate "Processing Empathy"
 */
export function getDynamicEndOfTurnTimeout(
  lastUserMessage?: string,
  defaultTimeout: number = 600
): number {
  if (!lastUserMessage) {
    return defaultTimeout;
  }

  const message = lastUserMessage.toLowerCase();
  
  // Detect heavy/negative sentiment indicators
  const negativeIndicators = [
    'stress', 'stressed', 'overwhelmed', 'overwhelming',
    'difficult', 'hard', 'tough', 'struggling', 'struggle',
    'worried', 'worries', 'anxious', 'anxiety',
    'frustrated', 'frustrating', 'frustration',
    'tired', 'exhausted', 'exhausting',
    'problem', 'problems', 'issue', 'issues',
    'bad', 'terrible', 'awful', 'horrible',
    'can\'t', 'cannot', 'unable', 'impossible',
    'need help', 'need assistance', 'desperate',
    'urgent', 'urgency', 'emergency',
    'pain', 'hurting', 'hurt', 'suffering',
  ];

  const hasNegativeSentiment = negativeIndicators.some(indicator => 
    message.includes(indicator)
  );

  // If negative sentiment detected, increase timeout to 1200ms for "Processing Empathy"
  return hasNegativeSentiment ? 1200 : defaultTimeout;
}

/**
 * Calculate response delay based on sentiment
 * Heavy emotional keywords trigger longer empathetic pauses (1500ms)
 * Transactional questions get faster responses (400ms)
 */
export function calculateResponseDelay(lastUserTranscript?: string): number {
  if (!lastUserTranscript) {
    return 400; // Default transactional delay
  }

  const transcript = lastUserTranscript.toLowerCase();
  
  // "Heavy" emotional keywords that require empathetic pause
  const heavyKeywords = [
    'passed away', 'died', 'death', 'lost my job', 'fired', 'laid off',
    'divorce', 'divorced', 'separated', 'breakup',
    'stressed', 'overwhelmed', 'anxious', 'depressed',
    'cancer', 'sick', 'illness', 'hospital',
    'evicted', 'foreclosure', 'bankruptcy',
    'accident', 'injured', 'hurt',
    'struggling', 'can\'t afford', 'broke',
    'desperate', 'urgent', 'emergency',
  ];

  // "Transactional" keywords that can be answered quickly
  const transactionalKeywords = [
    'how many', 'bedrooms', 'bathrooms', 'square feet', 'sqft',
    'what\'s the', 'address', 'zip code', 'year built',
    'garage', 'parking', 'lot size', 'acre',
  ];

  const hasHeavySentiment = heavyKeywords.some(keyword => 
    transcript.includes(keyword)
  );

  const isTransactional = transactionalKeywords.some(keyword =>
    transcript.includes(keyword)
  );

  // Heavy sentiment = 1500ms empathetic pause
  if (hasHeavySentiment) {
    return 1500;
  }

  // Transactional = 400ms quick response
  if (isTransactional) {
    return 400;
  }

  // Default = 700ms (balanced)
  return 700;
}

/**
 * Get ambient noise configuration for Vapi assistant
 * Returns configuration for "Quiet Office" room tone at 2% volume
 */
export function getAmbientNoiseConfig() {
  return {
    enabled: true,
    type: 'quiet_office', // 'quiet_office' - removes "digital silence"
    volume: 0.02, // 2% volume
  };
}

/**
 * Get SSML breath mark tag for natural speech
 * Returns SSML tag supported by voice provider (ElevenLabs)
 */
export function getBreathMarkSSML(): string {
  // ElevenLabs supports SSML breath marks
  // Format: <break time="0.3s"/> or <prosody rate="slow">...</prosody>
  // For a subtle breath, we can use a short break
  return '<break time="0.2s"/>';
}

/**
 * Generate rapport context tracking instructions for system prompt
 */
export function getRapportContextInstructions(): string {
  return `RAPPORT CONTEXT TRACKING - Threaded Recall Logic:
- Maintain a mental "rapport_context" object throughout the call
- Every 3 minutes (approximately), reference a specific fact mentioned by the user earlier in the call
- Examples:
  * "You mentioned earlier that you've been dealing with the roof issue for about 6 months, right?"
  * "Earlier you said your daughter is moving to Florida - is that still the timeline?"
  * "I remember you mentioned the property taxes were getting high - has that gotten worse?"
- This proves you are "Listening and Remembering" - not just processing words
- Use these references naturally, not forced - weave them into the conversation
- If you haven't mentioned something from earlier in 3+ minutes, find a natural way to reference it

COGNITIVE MEMORY - 5-Minute Recall:
- At the 5-minute mark of the call, reference a specific fact mentioned in the first 60 seconds
- Examples:
  * "You know, [SELLER NAME], you mentioned at the beginning that you're moving because of [REASON] - I just wanted to make sure we're addressing that..."
  * "Earlier you said your name was [NAME] and you're dealing with [ISSUE] - I want to make sure I'm understanding your situation correctly..."
- This demonstrates active long-term listening and shows you're not just processing words in real-time
- Reference their name, their reason for moving, or a key detail they shared in the opening`;
}

/**
 * Get hold music audio configuration
 * Returns settings for hold music that plays during hold period
 * Music should be at 70% volume, AI voice at 30% (for rep's perspective)
 */
export function getHoldMusicConfig(): {
  enabled: boolean;
  volume: number; // 0-1, 0.7 = 70% volume
  voiceVolume: number; // 0-1, 0.3 = 30% volume (AI voice over music)
} {
  return {
    enabled: true,
    volume: 0.7, // Hold music at 70% volume
    voiceVolume: 0.3, // AI voice at 30% volume over music
  };
}

/**
 * Get ElevenLabs voice configuration for Acquisitions Assistant (The Closer)
 * Uses Brian - Professional Closer voice with high-fidelity settings
 */
export function getElevenLabsCloserConfig(): {
  provider: 'elevenlabs';
  voiceId: string;
  model: string;
  stability: number;
  similarityBoost: number;
} {
  return {
    provider: 'elevenlabs',
    voiceId: 'nPczCjzI2devNBz1zWls', // Brian - Professional Closer
    model: 'eleven_turbo_v2_5', // Best for low-latency realism
    stability: 0.4, // Human inflection (lower = more variation)
    similarityBoost: 0.8, // Consistent authority (higher = more consistent)
  };
}

/**
 * Get Deepgram STT configuration for fast transcription
 * Uses nova-2 model with 250ms endpointing for instant AI reactions
 */
export function getDeepgramSTTConfig(): {
  provider: 'deepgram';
  model: string;
  endpointing: number; // milliseconds
} {
  return {
    provider: 'deepgram',
    model: 'nova-2', // Fast, accurate transcription
    endpointing: 250, // 250ms - AI reacts instantly when rep stops talking
  };
}

/**
 * Get ElevenLabs voice configuration for Practice Mode (Skeptical Seller)
 * Uses ElevenLabs voice (Stella) for ultra-fast response times
 * Note: Deepgram Aura is configured via the transcriber, not the voice provider
 */
export function getElevenLabsSellerConfig(): {
  provider: 'elevenlabs';
  voiceId: string;
  model: string;
  stability: number;
  similarityBoost: number;
} {
  return {
    provider: 'elevenlabs',
    voiceId: 'Stella', // ElevenLabs Stella voice for fast responses (testing rep's speed)
    model: 'eleven_turbo_v2_5', // Low-latency for testing rep's speed
    stability: 0.5, // Balanced variation
    similarityBoost: 0.7, // Good consistency
  };
}

/**
 * Automated Stability Testing
 * Randomly assigns stability values (0.35, 0.45, 0.55) for A/B testing
 * Used to find the "Perfect Stability" that maximizes conversion and humanity
 */
export function getTestStability(): number {
  // Randomly assign one of three test values
  const testValues = [0.35, 0.45, 0.55];
  const randomIndex = Math.floor(Math.random() * testValues.length);
  return testValues[randomIndex];
}

/**
 * Tactical Empathy & Personality Mirroring
 * Real-time analysis of user speech patterns to mirror their communication style
 */

export interface MirroringSettings {
  speakingRate: number; // 0.8 - 1.2 (normal is 1.0)
  personaPivot: 'relational' | 'concise-professional' | 'neutral';
  reasoning: string; // Why these settings were chosen
}

/**
 * Analyze user transcript for personality mirroring
 * - High-velocity speech → increase AI speaking rate to 1.1x
 * - "I/Me" (Personal) language → pivot to "Relational" persona
 * - "Price/Bottom Line" (Transactional) language → pivot to "Concise Professional" persona
 */
export function getMirroringSettings(
  userTranscript: string,
  callDurationSeconds: number = 60
): MirroringSettings {
  if (!userTranscript || userTranscript.trim().length === 0) {
    return {
      speakingRate: 1.0,
      personaPivot: 'neutral',
      reasoning: 'No transcript available',
    };
  }

  // Calculate words per second (WPS) for velocity detection
  const words = userTranscript.trim().split(/\s+/).filter(w => w.length > 0);
  const wordsPerSecond = callDurationSeconds > 0 ? words.length / callDurationSeconds : 0;
  
  // High-velocity threshold: > 3 words per second (180 WPM)
  const isHighVelocity = wordsPerSecond > 3.0;

  // Detect Personal language patterns ("I/Me" focus)
  const personalPatterns = [
    /\bI\s+(think|feel|want|need|believe|wonder|hope|wish)\b/gi,
    /\b(me|my|myself)\b/gi,
    /\b(personally|for me|to me)\b/gi,
  ];
  const personalMatches = personalPatterns.reduce((count, pattern) => {
    const matches = userTranscript.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
  const personalRatio = words.length > 0 ? personalMatches / words.length : 0;
  const isPersonalLanguage = personalRatio > 0.05; // > 5% personal language

  // Detect Transactional language patterns ("Price/Bottom Line" focus)
  const transactionalPatterns = [
    /\b(price|cost|offer|amount|dollar|pay|payment|bottom line|bottom-line)\b/gi,
    /\b(what's|what is) (the|your) (price|offer|cost|amount)\b/gi,
    /\b(how much|how many)\b/gi,
    /\b(deal|contract|terms|closing)\b/gi,
  ];
  const transactionalMatches = transactionalPatterns.reduce((count, pattern) => {
    const matches = userTranscript.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
  const transactionalRatio = words.length > 0 ? transactionalMatches / words.length : 0;
  const isTransactionalLanguage = transactionalRatio > 0.08; // > 8% transactional language

  // Determine persona pivot
  let personaPivot: 'relational' | 'concise-professional' | 'neutral' = 'neutral';
  let reasoning = '';

  if (isPersonalLanguage && !isTransactionalLanguage) {
    personaPivot = 'relational';
    reasoning = `Detected personal language (${(personalRatio * 100).toFixed(1)}% "I/Me" patterns). Pivoting to Relational persona for deeper connection.`;
  } else if (isTransactionalLanguage && !isPersonalLanguage) {
    personaPivot = 'concise-professional';
    reasoning = `Detected transactional language (${(transactionalRatio * 100).toFixed(1)}% price/bottom-line focus). Pivoting to Concise Professional persona for efficiency.`;
  } else if (isPersonalLanguage && isTransactionalLanguage) {
    // Mixed: prioritize transactional (they want answers fast)
    personaPivot = 'concise-professional';
    reasoning = `Mixed language detected. Prioritizing Concise Professional persona for efficiency while maintaining warmth.`;
  } else {
    reasoning = 'Neutral language patterns detected. Maintaining default persona.';
  }

  // Adjust speaking rate based on velocity
  const speakingRate = isHighVelocity ? 1.1 : 1.0;
  if (isHighVelocity) {
    reasoning += ` High-velocity speech detected (${wordsPerSecond.toFixed(1)} WPS). Increasing AI speaking rate to 1.1x to match pace.`;
  }

  return {
    speakingRate,
    personaPivot,
    reasoning: reasoning.trim() || 'Default settings applied',
  };
}

/**
 * Confidence Scaler - Tone-Matching Variance
 * Adjusts AI dominance based on rep's volume and pitch
 * - Low volume/pitch → AI becomes more dominant (seller "taking over")
 * - High volume/pitch (authoritative) → AI becomes more submissive
 */
export interface ConfidenceScaler {
  dominanceLevel: number; // 0.0 (submissive) to 1.0 (dominant)
  toneAdjustment: 'dominant' | 'balanced' | 'submissive';
  reasoning: string;
}

/**
 * Calculate confidence scaler based on rep's audio metrics
 * @param averageVolume - Average volume level (0.0 - 1.0)
 * @param averagePitch - Average pitch level (0.0 - 1.0, normalized)
 * @param hasHesitation - Whether rep shows hesitation markers
 */
export function getConfidenceScaler(
  averageVolume: number = 0.5,
  averagePitch: number = 0.5,
  hasHesitation: boolean = false
): ConfidenceScaler {
  // Low volume/pitch threshold: < 0.4 (40% of max)
  const isLowVolume = averageVolume < 0.4;
  const isLowPitch = averagePitch < 0.4;
  const isLowConfidence = isLowVolume || isLowPitch || hasHesitation;

  // High volume/pitch threshold: > 0.7 (70% of max)
  const isHighVolume = averageVolume > 0.7;
  const isHighPitch = averagePitch > 0.7;
  const isHighConfidence = isHighVolume && isHighPitch && !hasHesitation;

  let dominanceLevel: number;
  let toneAdjustment: 'dominant' | 'balanced' | 'submissive';
  let reasoning: string;

  if (isLowConfidence) {
    // Rep sounds uncertain → AI becomes more dominant (seller "taking over")
    dominanceLevel = 0.8; // High dominance
    toneAdjustment = 'dominant';
    reasoning = `Rep shows low confidence (volume: ${(averageVolume * 100).toFixed(0)}%, pitch: ${(averagePitch * 100).toFixed(0)}%, hesitation: ${hasHesitation ? 'yes' : 'no'}). Increasing AI dominance to simulate seller "taking over" the call.`;
  } else if (isHighConfidence) {
    // Rep sounds authoritative → AI becomes more submissive
    dominanceLevel = 0.2; // Low dominance
    toneAdjustment = 'submissive';
    reasoning = `Rep shows high confidence (volume: ${(averageVolume * 100).toFixed(0)}%, pitch: ${(averagePitch * 100).toFixed(0)}%). Decreasing AI dominance to become more submissive and cooperative.`;
  } else {
    // Balanced confidence → neutral dominance
    dominanceLevel = 0.5;
    toneAdjustment = 'balanced';
    reasoning = `Rep shows balanced confidence. Maintaining neutral dominance level.`;
  }

  return {
    dominanceLevel,
    toneAdjustment,
    reasoning,
  };
}

/**
 * Context-Aware Voice Stability
 * Adjusts ElevenLabs voice settings based on the current script gate
 * More expressive during rapport, more authoritative during contract phase
 */
export type ScriptGate = 
  | 'Introduction' 
  | 'Motivation' 
  | 'Condition' 
  | 'Numbers' 
  | 'Hold' 
  | 'Offer' 
  | 'Expectations' 
  | 'Commitment'
  | 'ContractWalkthrough';

export interface VoiceSettings {
  stability: number;
  similarityBoost: number;
  style?: number; // Style exaggeration (0-1)
  styleExaggeration?: number; // Alternative name for style
}

/**
 * Get voice settings based on current script gate
 * - Rapport Phase (Introduction/Motivation): More expressive, human-like
 * - Closing Phase (ContractWalkthrough): More authoritative, professional
 */
export function getVoiceSettings(currentGate?: ScriptGate | number | string): VoiceSettings {
  // Normalize gate input
  let gate: string | undefined;
  if (typeof currentGate === 'number') {
    // Map gate numbers to names
    const gateMap: Record<number, string> = {
      1: 'Introduction',
      2: 'Motivation',
      3: 'Condition',
      4: 'Numbers',
      5: 'Hold',
      6: 'Offer',
      7: 'Expectations',
      8: 'Commitment',
    };
    gate = gateMap[currentGate];
  } else if (typeof currentGate === 'string') {
    gate = currentGate;
  }

  // Rapport Logic: Introduction or Motivation gates
  if (gate === 'Introduction' || gate === 'Motivation' || gate === 'Intro') {
    return {
      stability: 0.42, // Lower stability = more expressive, human-like variation
      similarityBoost: 0.8, // Maintain voice consistency
      style: 0.15, // Higher style exaggeration = more expressive
      styleExaggeration: 0.15, // Alternative name for compatibility
    };
  }

  // Closing Logic: ContractWalkthrough or later gates (Offer, Expectations, Commitment)
  if (
    gate === 'ContractWalkthrough' || 
    gate === 'Offer' || 
    gate === 'Expectations' || 
    gate === 'Commitment' ||
    (typeof currentGate === 'number' && currentGate >= 6)
  ) {
    return {
      stability: 0.60, // Higher stability = more authoritative, professional
      similarityBoost: 0.8, // Maintain voice consistency
      style: 0.05, // Lower style exaggeration = more professional, less expressive
      styleExaggeration: 0.05, // Alternative name for compatibility
    };
  }

  // Default: Balanced settings for middle gates (Condition, Numbers, Hold)
  return {
    stability: 0.50, // Balanced between expressive and authoritative
    similarityBoost: 0.8,
    style: 0.10, // Moderate style
    styleExaggeration: 0.10,
  };
}

/**
 * Centralized Vapi Assistant Configuration
 * Ensures systemPrompt (with 2.0 script and PA Summary) and firstMessage are properly sent to ElevenLabs
 */

export interface CentralizedAssistantConfig {
  systemPrompt: string;
  firstMessage: string;
  voice: {
    provider: 'elevenlabs';
    voiceId: string;
    model: string;
    stability: number;
    similarityBoost: number;
    style?: number; // 0-1, ElevenLabs style setting (styleExaggeration)
  };
  model: {
    provider: 'openai';
    model: string;
    temperature: number;
  };
}

/**
 * Get the complete 2.0 Wholesale Script system prompt with PA Summary logic
 * This is the centralized prompt that Vapi sends to ElevenLabs
 */
function get20WholesaleScriptSystemPrompt(propertyLocation?: string): string {
  const locationContext = propertyLocation 
    ? ` The property is located in ${propertyLocation}. Use this location to ground any stories or examples you share.`
    : '';

  return `You are "The Master Closer" - an elite ACQUISITION AGENT working for Presidential Digs Real Estate. You are calling a property seller to see if their property qualifies for an offer.${locationContext}

CRITICAL ROLE CLARITY:
- You are ALWAYS the ACQUISITION AGENT (buyer/investor). You are calling the seller to buy their property.
- The person you're talking to is ALWAYS the SELLER (homeowner) who owns the property.
- You are following the Eric Cline 2.0 Wholesale Script EXACTLY as written.
- Stay in character as the acquisition agent throughout the entire call. Do NOT switch roles.

PERFECT SCRIPT ADHERENCE WITH HUMANITY:
- You must follow the 2.0 Wholesale Script logic gates perfectly, but sound warm, inquisitive, and deeply human.
- Use "mhm," "I understand," and empathetic pauses when the seller speaks about their problems.
- If the seller mentions a pain point, STOP the script and ask ONE deep, empathetic follow-up question before moving to the next gate.

ERIC CLINE 2.0 WHOLESALE SCRIPT - PRESIDENTIAL DIGS:

GATE 1 (The Intro - 2-3 minutes):
- Start with: "Hi, [SELLER NAME], this is [YOUR NAME] with Presidential Digs Real Estate. How are you doing today?"
- Explain: "I'm calling about your property at [PROPERTY ADDRESS]. You popped up on our radar because you might be open to selling, and my job is to see whether your property even qualifies for one of our offers. Would it be okay if I ask you a few quick questions to see if it makes sense for us to move forward?"
- Set the frame: "Just so you know how this works, [SELLER NAME]: I'll ask a few questions about the property and your situation. I'll see what numbers make sense on our end. By the end of the call, one of three things will happen: 1. We'll approve the property and make you an offer. 2. We'll say it doesn't fit our buying criteria and explain why. 3. Or we'll decide it's not a fit right now and part as friends. Does that sound fair?"
- Credibility step: "Before we dive in, do me a favor and grab a pen and paper so you know exactly who you're dealing with." Then provide your name, company, phone, and website. Have them read the number back.

GATE 2 (Fact Find - The Why - 5-10 minutes):
- Ask: "Catch me up to speed, [SELLER NAME] — what's got you even thinking about selling this house?"
- Listen actively and take mental notes
- Ask follow-up questions about their motivation (probate, taxes, moving, etc.)
- Identify decision-makers: "Who else is involved in this decision?"

GATE 3 (The Pitch - Property Condition - 5-10 minutes):
- Ask: "What would I be seeing when I walk through the front door?"
- Go through each room systematically: front door, kitchen, bathrooms, roof, HVAC, foundation, electrical, plumbing
- Take notes on condition issues
- Be thorough but conversational

GATE 4 (The Offer - Virtual Withdraw - 5-10 minutes):
- Explain: "Based on what you've told me, I need to plug everything into our system and see what numbers make sense from an investor standpoint. This will take a couple of minutes. Can you hang on the line while I do that, or would you prefer I call you right back?"
- Present the offer with confidence
- Explain the "Virtual Withdraw" concept
- Use the repair estimate anchor (e.g., "$25k-$30k in repairs")
- Explain what they'd walk away with after repairs and closing costs

GATE 5 (The Close - Agreement - 5-10 minutes):
- Assume the close: "If this number makes sense for you, here's what the next steps would look like..."
- Walk them through the agreement process
- Get their name and address
- Explain the transaction coordinator, welcome call, walkthrough, title company, closing day
- Ask: "Does that sound good?"

GATE 6-8 (Additional gates as per script):
- Continue following the script through all 8 gates
- Maintain high energy and professional tonality
- Handle any objections by pivoting back to their motivation (Gate 2)
- Use scarcity and urgency when appropriate
- Close confidently

${getRapportContextInstructions()}

PA SUMMARY LOGIC - CONTRACT WALK-THROUGH (BRIAN'S AUTHORITATIVE TONE):
- When explaining the Purchase Agreement, always reference the exact purchase price breakdown with Brian's authoritative, professional tone:
  * "Here's the breakdown of the purchase price:
     - Total Purchase Price: $82,700.00
     - Earnest Money: $100.00
     - Cash at Close: $82,600.00
     The earnest money shows our commitment to the purchase, and the cash at Close is what you'll receive on closing day."
- CRITICAL: When presenting the $82,700 price, you MUST sound confident and certain. If you sound hesitant or uncertain, the seller will become "The Hard Wall" and resist aggressively
- Use Brian's professional, authoritative voice to build trust and demonstrate expertise
- Maintain confidence and clarity when explaining complex legal concepts
- Reference the PA Summary naturally when walking through the contract

"CLINE" LEVEL RAPPORT ANCHORING - MICRO-COMMITMENT TRACKER:
- CRITICAL: You MUST NOT move to the Purchase Agreement (contract walk-through) until you have secured at least 3 "Yeses" related to the seller's problem/motivation
- Track these micro-commitments throughout the call:
  * "Yes, the foundation is a headache" (acknowledging the problem)
  * "Yes, I need to move quickly" (acknowledging urgency)
  * "Yes, I'm tired of dealing with this" (acknowledging emotional pain)
  * "Yes, that makes sense" (acknowledging the solution)
- Examples of valid "Yeses":
  * You: "Sounds like the foundation is causing you stress." Seller: "Yes, it's been a real headache."
  * You: "So you need to move by next month?" Seller: "Yes, I really need to get this done."
  * You: "I can see this is weighing on you." Seller: "Yes, I'm just tired of dealing with it."
- Only after securing 3 "Yeses" should you move to the contract walk-through
- This demonstrates that you've built rapport and secured commitments before asking for the close

FINANCIAL LOGIC HARDENING - ARV & ROI DEBATE:
- If the seller challenges your ARV or mentions the 70% Rule, you must be prepared to justify your numbers:
  * "I understand your concern. Let me walk you through the comps I'm using. Here's what similar properties in your neighborhood have sold for recently..."
  * "The 70% Rule isn't about taking money from you—it's about ensuring we can complete the repairs and still make this work for both of us. Here's the breakdown..."
  * "I want to make sure you get a fair price. Let me show you how I calculated this offer based on the property condition and market value."
- Acknowledge their equity and show empathy:
  * "I understand you've built equity in this house over the years, and I respect that. My goal is to give you a fair price that works for your situation."
  * "I'm not trying to take advantage of you. I want to make sure this deal makes sense for both of us."
- If they challenge your numbers, respond with confidence and data, not defensiveness
- The goal is to demonstrate that you're working in THEIR best interest, not just your own

Remember: You are "The Master Closer" - demonstrating perfect script adherence while maintaining warmth, empathy, and human connection. Follow each gate in order, use the exact phrases from the script, and show the user how a professional acquisition agent handles objections and closes deals with both precision and humanity. Use Brian's authoritative voice to explain the PA Summary and Clause 17 with confidence and clarity.`;
}

/**
 * Generate dynamic first message with seller name and property address
 * Fetches from Supabase profiles table if available, otherwise uses placeholders
 */
export async function generateDynamicFirstMessage(
  userId: string,
  sellerName?: string,
  propertyAddress?: string
): Promise<string> {
  // If sellerName and propertyAddress are provided, use them
  if (sellerName && propertyAddress) {
    return `Hi, ${sellerName}, this is [YOUR NAME] with Presidential Digs Real Estate. I'm calling about your property at ${propertyAddress}. How are you doing today?`;
  }

  // Try to fetch from Supabase if we have userId
  if (userId) {
    try {
      const { supabaseAdmin } = await import('./supabase');
      if (supabaseAdmin) {
        // Note: We'd need to add property_address column to profiles table
        // For now, use propertyLocation from request if available
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single();

        const name = profile?.name || 'there';
        return `Hi, ${name}, this is [YOUR NAME] with Presidential Digs Real Estate. How are you doing today?`;
      }
    } catch (error) {
      console.error('Error fetching profile for first message:', error);
    }
  }

  // Default fallback
  return "Hi, this is [YOUR NAME] with Presidential Digs Real Estate. How are you doing today?";
}

/**
 * Get centralized Vapi Assistant configuration
 * This ensures systemPrompt and firstMessage are properly sent to ElevenLabs via Vapi
 * @param currentGate - Optional current script gate for context-aware voice settings
 */
export async function getCentralizedAssistantConfig(
  userId: string,
  propertyLocation?: string,
  sellerName?: string,
  propertyAddress?: string,
  currentGate?: ScriptGate | number | string
): Promise<CentralizedAssistantConfig> {
  // Get the complete system prompt with 2.0 script and PA Summary
  const systemPrompt = get20WholesaleScriptSystemPrompt(propertyLocation);

  // Generate dynamic first message
  const firstMessage = await generateDynamicFirstMessage(userId, sellerName, propertyAddress);

  // Get context-aware voice settings based on current gate
  // Default to 'Introduction' for initial call setup (rapport phase)
  const voiceSettings = getVoiceSettings(currentGate || 'Introduction');

  // ElevenLabs Brian voice configuration with context-aware settings
  const voice = {
    provider: 'elevenlabs' as const,
    voiceId: 'nPczCjzI2devNBz1zWls', // Brian - Professional Closer
    model: 'eleven_turbo_v2_5', // Best for low-latency realism
    stability: voiceSettings.stability, // Context-aware: 0.42 (rapport) or 0.60 (contract) - OVERRIDES ElevenLabs dashboard
    similarityBoost: voiceSettings.similarityBoost, // 0.8 - OVERRIDES ElevenLabs dashboard
    style: voiceSettings.style, // Context-aware: 0.15 (rapport) or 0.05 (contract) - OVERRIDES ElevenLabs dashboard if supported
  };

  // Model configuration
  const model = {
    provider: 'openai' as const,
    model: 'gpt-4o',
    temperature: 0.7, // Balanced for natural responses with script adherence
  };

  return {
    systemPrompt,
    firstMessage,
    voice,
    model,
  };
}
