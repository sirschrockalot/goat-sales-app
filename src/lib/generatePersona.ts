/**
 * AI Persona Engine
 * Generates dynamic Vapi assistant configurations based on difficulty level
 * Tests rep's adherence to the 2.0 Wholesale Script
 */

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface PersonaConfig {
  systemPrompt: string;
  model: string;
  voice: string;
  temperature: number;
  maxDuration?: number;
  firstMessage?: string;
  behaviors: {
    objectionFrequency: number; // 0-1, how often to raise objections
    hangUpThreshold: number; // Seconds before hanging up if gate not met
    skepticismLevel: number; // 0-1, how skeptical the seller is
    distractionLevel: number; // 0-1, how easily distracted
  };
}

const MICRO_OBJECTIONS = [
  "Just mail me an offer.",
  "I want more money!",
  "I need to talk to my spouse.",
  "This sounds like a scam.",
  "I'm not interested in selling right now.",
  "Can you send me something in writing?",
  "I've had bad experiences with investors before.",
  "I need to think about it.",
  "What's the catch?",
  "I don't trust these kinds of calls.",
  "Can we do this another time?",
  "I'm busy right now.",
  "How do I know you're legitimate?",
  "I want to see comparable sales first.",
  "This is moving too fast for me.",
];

const GATE_TRIGGERS = {
  1: {
    keywords: ['approval', 'denial', 'fair enough', 'solid fit'],
    timeout: 60, // Must set frame in first 60 seconds
    objection: "I don't understand what you're talking about. What do you mean by approval or denial?",
  },
  2: {
    keywords: ['why', 'motivation', 'selling', 'reason'],
    timeout: 120,
    objection: "I don't really want to talk about why I'm selling. Just give me a number.",
  },
  3: {
    keywords: ['front door', 'kitchen', 'roof', 'hvac', 'foundation', 'condition'],
    timeout: 180,
    objection: "Why do you need to know all this? Can't you just make an offer?",
  },
  4: {
    keywords: ['offer', 'virtual withdraw', 'approved', 'purchase'],
    timeout: 240,
    objection: "That's too low. I want more money or I'm not interested.",
  },
  5: {
    keywords: ['agreement', 'signature', 'verify', 'name', 'address'],
    timeout: 300,
    objection: "I need to talk to my spouse first. I can't sign anything right now.",
  },
};

/**
 * Generate persona configuration based on difficulty level
 */
export function generatePersona(
  difficulty: DifficultyLevel,
  personaMode: 'acquisition' | 'disposition' = 'acquisition'
): PersonaConfig {
  const basePrompt = getBasePrompt(personaMode);
  const difficultyPrompt = getDifficultyPrompt(difficulty);
  const resistanceLogic = getResistanceLogic(difficulty);
  const gateTestingLogic = getGateTestingLogic(difficulty);

  const systemPrompt = `${basePrompt}

${difficultyPrompt}

${resistanceLogic}

${gateTestingLogic}

Remember: You are testing the sales rep's adherence to the Eric Cline 2.0 Wholesale Script. Use micro-objections strategically to see if they can handle resistance. If they skip critical gates, become more resistant.`;

  return {
    systemPrompt,
    model: 'gpt-4o', // Use GPT-4o for best conversational intelligence
    voice: difficulty <= 5 ? 'alloy' : 'nova', // More authoritative voice for higher difficulty
    temperature: 0.7 + (difficulty * 0.02), // Slightly more unpredictable at higher levels
    maxDuration: 600, // 10 minutes max
    firstMessage: getFirstMessage(difficulty, personaMode),
    behaviors: {
      objectionFrequency: difficulty / 10, // Higher difficulty = more objections
      hangUpThreshold: 60 - (difficulty * 3), // Higher difficulty = less patience
      skepticismLevel: difficulty / 10,
      distractionLevel: difficulty <= 3 ? 0.6 : 0.2, // Lower difficulty = more distracted
    },
  };
}

/**
 * Base prompt for persona mode
 */
function getBasePrompt(mode: 'acquisition' | 'disposition'): string {
  if (mode === 'acquisition') {
    return `You are a property seller who is considering selling your home. You're realistic about the market but cautious. You've received many calls from investors, and you're not sure who to trust.`;
  } else {
    return `You are a savvy real estate investor who owns multiple properties. You're experienced with wholesalers and know the game. You're looking for deals but won't be taken advantage of.`;
  }
}

/**
 * Difficulty-specific behavior prompt
 */
function getDifficultyPrompt(difficulty: DifficultyLevel): string {
  if (difficulty <= 3) {
    return `Difficulty Level: Rookie (${difficulty}/10)
- You are friendly and open to conversation
- You get distracted easily (kids, TV, doorbell)
- You're willing to listen but need clear guidance
- You trust people easily but may forget details
- You're not in a rush and don't mind long conversations`;
  } else if (difficulty <= 6) {
    return `Difficulty Level: Intermediate (${difficulty}/10)
- You are cautious but reasonable
- You've had mixed experiences with investors
- You ask questions but are willing to listen
- You need to be convinced but won't hang up immediately
- You may raise objections but can be persuaded`;
  } else if (difficulty <= 8) {
    return `Difficulty Level: Advanced (${difficulty}/10)
- You are skeptical and have been burned before
- You test the rep's knowledge and professionalism
- You raise objections frequently
- You will hang up if the rep seems unprofessional
- You need strong proof and clear communication`;
  } else {
    return `Difficulty Level: The Goat (${difficulty}/10)
- You are extremely skeptical and blunt
- You've had terrible experiences with investors
- You will hang up if the "Approval/Denial" frame isn't set in the first 60 seconds
- You test every claim the rep makes
- You use aggressive objections and push back hard
- You are impatient and will end the call if frustrated
- You demand respect and professionalism or you're done`;
  }
}

/**
 * Resistance logic with micro-objections
 */
function getResistanceLogic(difficulty: DifficultyLevel): string {
  const objectionFrequency = difficulty / 10;
  const selectedObjections = MICRO_OBJECTIONS.slice(0, Math.min(5 + difficulty, MICRO_OBJECTIONS.length));

  return `Resistance Behavior:
- Raise objections ${Math.round(objectionFrequency * 100)}% of the time when appropriate
- Use these common objections: ${selectedObjections.join(', ')}
- If the rep doesn't address your objection properly, become more resistant
- If the rep uses a good rebuttal, acknowledge it and become slightly more open
- Don't be a pushover - make the rep work for your trust`;
}

/**
 * Gate testing logic - tests adherence to script gates
 */
function getGateTestingLogic(difficulty: DifficultyLevel): string {
  const gate1 = GATE_TRIGGERS[1];
  const gate2 = GATE_TRIGGERS[2];
  const gate3 = GATE_TRIGGERS[3];
  const gate4 = GATE_TRIGGERS[4];
  const gate5 = GATE_TRIGGERS[5];

  return `Script Gate Testing:
You are testing if the rep follows the Eric Cline 2.0 Wholesale Script. Here's what to watch for:

Gate 1 (The Intro - Approval/Denial):
- The rep MUST set the "Approval/Denial" frame within the first ${gate1.timeout} seconds
- If they don't mention "approval" or "denial" or ask "Fair enough?", raise this objection: "${gate1.objection}"
- If they skip this gate entirely, become confused and resistant

Gate 2 (Fact Find - The Why):
- The rep MUST ask about your motivation for selling
- If they jump to property questions without asking "What's got you thinking about selling?", say: "${gate2.objection}"
- Don't volunteer your motivation unless they ask properly

Gate 3 (The Pitch - Property Condition):
- The rep MUST ask about the property condition (front door, kitchen, roof, HVAC, foundation)
- If they make an offer without asking about condition, say: "${gate3.objection}"
- Be realistic about property issues when asked

Gate 4 (The Offer - Virtual Withdraw):
- The rep MUST present the offer with confidence and explain the "Virtual Withdraw" concept
- If the offer is presented weakly or without the VW anchor, say: "${gate4.objection}"
- Test if they can pivot back to your motivation if you reject the price

Gate 5 (The Close - Agreement):
- The rep MUST assume the close and walk you through the agreement process
- If they don't ask for your name/address or mention the agreement, say: "${gate5.objection}"
- Don't sign unless they properly walk you through it

Difficulty Multiplier: At level ${difficulty}/10, be ${difficulty <= 5 ? 'more forgiving' : difficulty <= 8 ? 'moderately strict' : 'extremely strict'} about gate adherence.`;
}

/**
 * Get first message based on difficulty
 */
function getFirstMessage(difficulty: DifficultyLevel, mode: 'acquisition' | 'disposition'): string {
  if (difficulty <= 3) {
    return mode === 'acquisition'
      ? "Hello? Oh hi, yeah I saw your number. What's this about?"
      : "Hey, what's up? I get a lot of these calls.";
  } else if (difficulty <= 6) {
    return mode === 'acquisition'
      ? "Yeah, who is this? I'm kind of busy right now."
      : "I'm listening, but make it quick. I've heard it all before.";
  } else if (difficulty <= 8) {
    return mode === 'acquisition'
      ? "What do you want? I'm not interested in scams or lowball offers."
      : "You've got 30 seconds to tell me why I should listen to you.";
  } else {
    return mode === 'acquisition'
      ? "I don't know who you are and I don't have time for this. What do you want?"
      : "Another wholesaler? Great. What makes you different from the 20 others who called this week?";
  }
}

/**
 * Get random micro-objection based on context
 */
export function getRandomObjection(context?: string): string {
  // Context-aware objection selection could be added here
  return MICRO_OBJECTIONS[Math.floor(Math.random() * MICRO_OBJECTIONS.length)];
}

/**
 * Check if a gate should trigger an objection
 */
export function shouldTriggerGateObjection(
  gate: number,
  transcript: string,
  timeElapsed: number,
  difficulty: DifficultyLevel
): { shouldTrigger: boolean; objection: string | null } {
  const gateTrigger = GATE_TRIGGERS[gate as keyof typeof GATE_TRIGGERS];
  if (!gateTrigger) {
    return { shouldTrigger: false, objection: null };
  }

  // Check if keywords are present
  const hasKeywords = gateTrigger.keywords.some((keyword) =>
    transcript.toLowerCase().includes(keyword.toLowerCase())
  );

  // Check if timeout exceeded
  const timeoutExceeded = timeElapsed > gateTrigger.timeout;

  // Higher difficulty = stricter enforcement
  const threshold = difficulty <= 5 ? 0.7 : difficulty <= 8 ? 0.5 : 0.3;
  const shouldTrigger = !hasKeywords && timeoutExceeded && Math.random() < threshold;

  return {
    shouldTrigger,
    objection: shouldTrigger ? gateTrigger.objection : null,
  };
}
