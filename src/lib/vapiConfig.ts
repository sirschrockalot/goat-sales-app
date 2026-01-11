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
