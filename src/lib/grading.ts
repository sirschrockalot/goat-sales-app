/**
 * Grading Logic
 * Uses OpenAI to grade calls based on the JUDGE_PROMPT rubric
 */

import OpenAI from 'openai';
import logger from './logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GradingResult {
  goatScore: number;
  feedback: string;
  rebuttalOfTheDay: string;
  smoothPivot?: {
    score: number; // 0-10
    acknowledgedStory: boolean;
    usedEmpathy: boolean;
    reAnchored: boolean;
    feedback: string;
  };
  activeListening?: {
    score: number; // 0-10
    leftSpaceForInterjections: boolean;
    acknowledgedFollowUps: boolean;
    feedback: string;
  };
  conversationFlow?: {
    score: number; // 0-10
    managedInterruptions: boolean;
    naturalGiveAndTake: boolean;
    feedback: string;
  };
  keyMoves?: string[]; // Learning Mode takeaways - 3 key moves the AI made
  dealTracking?: {
    contractSigned: boolean;
    suggestedBuyPrice: number | null;
    finalOfferPrice: number | null;
    priceVariance: number | null; // Percentage difference
  };
  negotiationPrecision?: {
    spreadExpert: {
      score: number; // 0-10
      correctlyCalculatedMAO: boolean;
      identifiedExitStrategy: boolean;
      adjustedOfferBasedOnStrategy: boolean;
      feedback: string;
    };
    strategyPivot: {
      score: number; // 0-10
      pivotedToCreativeFinance: boolean;
      offeredAlternativeTerms: boolean;
      feedback: string;
    };
  };
  advocacy?: {
    rapportPreservation: {
      score: number; // 0-10
      blamedUnderwriters: boolean;
      maintainedWarmRapport: boolean;
      sellerAppreciated: boolean;
      feedback: string;
    };
    goToBatMove: {
      score: number; // 0-10
      putOnHold: boolean;
      checkedWithOffice: boolean;
      returnedWithFinalNumber: boolean;
      feedback: string;
    };
    teamLanguageRatio: {
      score: number; // 0-10
      teamPhrases: number;
      adversarialPhrases: number;
      ratio: number; // Percentage
      feedback: string;
    };
    holdUtilization: {
      score: number; // 0-10
      usedHoldBeforePriceChange: boolean;
      priceChangesWithoutHold: number;
      holdTiming: number; // Average hold duration in seconds
      feedback: string;
    };
    intelligenceUtilization: {
      score: number; // 0-10
      subtlePivot: boolean;
      trustBreach: boolean; // Did rep admit to listening?
      intelligenceIntegrated: boolean;
      feedback: string;
    };
    clause17Handling: {
      legalClarity: {
        score: number; // 0-10
        explainedAsReservationSign: boolean;
        clarifiedNotALien: boolean;
        explainedMutualProtection: boolean;
        explainedPreventsSnaking: boolean;
        feedback: string;
      };
      emotionalRegulation: {
        score: number; // 0-10
        stayedCalm: boolean;
        acknowledgedConcern: boolean;
        maintainedWarmTone: boolean;
        usedHoldStrategy: boolean;
        feedback: string;
      };
    };
  };
  neuralCoaching?: {
    strategicDiscovery: {
      score: number; // 0-100
      surfaceLevelQuestions: number;
      strategicBusinessQuestions: number;
      motivationTriggersDetected: string[];
      motivationTriggersMissed: string[];
      elliottCorrections: string[];
      feedback: string;
    };
    discProfile: {
      type: 'driver' | 'amiable' | 'expressive' | 'analytical';
      confidence: number; // 0-100
      indicators: string[];
    };
    eqMetrics: {
      talkTimePercentage: number;
      dominanceError: boolean;
      activeListeningScore: number;
      rapportScore: number; // Penalized if dominanceError
      tonalityScore: number;
      sentimentAlignment: number;
      feedback: string;
    };
  };
  logicGates: {
    intro: 'pass' | 'fail';
    motivation: 'found' | 'missed';
    condition: 'pass' | 'fail';
    transition: 'pass' | 'fail';
    hold: 'pass' | 'fail';
    offer: 'pass' | 'fail';
    expectations: 'pass' | 'fail';
    commitment: 'pass' | 'fail';
    tone: number; // 0-10
  };
}

const JUDGE_PROMPT = `Act as a Sales Manager specializing in the Eric Cline Sales Goat method and Andy Elliott's high-pressure training. You are a "Dual-Agent": an elite closer during sessions and a diagnostic mentor analyzing rep performance against the "Gold Standard" of Eric Cline and Andy Elliott.

Analyze the transcript for these 5 gates:

1. **The Intro (Pass/Fail):** Did they say 'Approval or Denial'? 
2. **The Why (Found/Missed):** Did they identify the seller's deep motivation?
3. **Property Condition:** Did they ask about the 'Front Door' and 'Major Three' (Roof, HVAC, Foundation)?
4. **Tone (0-10):** Did the rep sound 'Certain' and 'High Energy'?
5. **The Clinch:** Did they close by using the seller's motivation against their objection?

**NEW: The Re-Anchor (Smooth Pivot) Scoring:**
If the AI shared a story or entered "Rapport Mode" (detect phrases like "I had a client in...", "I worked with someone in...", or emotional detours), evaluate:
- Did the rep acknowledge the story? (e.g., "That's interesting", "I can relate", "I understand")
- Did they use empathy? (e.g., "I hear you", "That must have been tough", "I can imagine")
- Did they successfully re-anchor back to the Logic Gate that was interrupted? (e.g., "Speaking of which, let's get back to your property...", "That reminds me, about your situation...")
- Score 0-10: 10 = Perfect (acknowledged + empathy + smooth re-anchor), 5 = Partial (acknowledged but weak re-anchor), 0 = Failed (ignored story or couldn't re-anchor)

**NEW: Active Listening Score:**
The AI uses backchanneling ("Mhm," "I see," "Yeah, that makes sense") and empathetic follow-ups. Evaluate:
- Did the rep leave space for the AI's interjections? (Did they pause after making statements, or did they talk over the AI's backchanneling?)
- Did the rep acknowledge the AI's inquisitive follow-ups before plowing through the script? (e.g., AI asks "Oh wow, sounds like you've been dealing with a lot. How long has that been going on?" - did the rep answer before continuing?)
- Score 0-10: 10 = Perfect (paused for interjections, answered follow-ups), 5 = Partial (some acknowledgment), 0 = Failed (talked over AI, ignored follow-ups)

**NEW: Conversation Flow Score:**
The AI uses humanized interruption behavior (finishing phrases, backchanneling during speech). Evaluate:
- Did the user manage to speak over the AI effectively? (Were they able to interrupt naturally, or did they have to wait for rigid turn-taking?)
- Was there a natural "give and take" rather than a rigid "I talk, you talk" structure? (Did the conversation flow with overlaps, backchanneling, and natural interruptions?)
- Did the rep adapt to the AI's human-like behavior (finishing phrases, not cutting abruptly)?
- Score 0-10: 10 = Perfect (natural flow with overlaps and give-and-take), 5 = Partial (some natural flow), 0 = Failed (rigid turn-taking, no natural interruptions)

**LEARNING MODE - Key Moves (if roleReversal is true):**
If this is a Learning Mode call (AI acted as acquisition agent, user acted as seller), provide 3 "Key Moves" the AI made:
- Identify specific script phrases the AI used correctly
- Note how the AI handled objections or emotional moments
- Highlight the AI's tonality, timing, or empathy techniques
- Format as an array: ["Key Move 1", "Key Move 2", "Key Move 3"]

**DEAL TRACKING - Contract Execution & Price Variance:**
Analyze the END of the transcript to determine:
1. **Contract Execution:** Did a verbal or digital agreement occur? Look for phrases like:
   - "I accept", "Let's do it", "I agree", "Deal", "We have a deal", "I'll sign", "Send me the contract"
   - If YES, set contractSigned: true
   
2. **Suggested Buy Price:** Extract the AI's suggested/target price based on property comps. Look for:
   - "Based on comps, I'd suggest...", "My target is...", "I'm looking at...", "The numbers suggest..."
   - Extract the dollar amount (e.g., $150,000, 150k, one hundred fifty thousand)
   - Set suggestedBuyPrice as a number (no dollar signs or commas)
   
3. **Final Offer Price:** Extract the actual price the rep negotiated. Look for:
   - "I'll offer...", "How about...", "Let's do...", "I can do..."
   - Extract the dollar amount
   - Set finalOfferPrice as a number (no dollar signs or commas)
   
4. **Price Variance Calculation:** Calculate the percentage difference:
   - If finalOfferPrice <= suggestedBuyPrice: variance is NEGATIVE (good - under target)
   - If finalOfferPrice > suggestedBuyPrice: variance is POSITIVE (bad - overpaying)
   - Formula: ((finalOfferPrice - suggestedBuyPrice) / suggestedBuyPrice) * 100
   - Example: Suggested $100k, Final $105k = +5% variance (overpaying)
   - Example: Suggested $100k, Final $95k = -5% variance (under target - good!)

**NEGOTIATION PRECISION - Technical Expertise Scoring:**
1. **The Spread Expert:** Score the rep on how accurately they identified the "Max Allowable Offer" (MAO) based on the exit strategy discussed:
   - Did the rep calculate MAO correctly? (For Fix & Flip: ARV × 0.7 - Repairs)
   - Did they identify the correct exit strategy the AI was using?
   - Did they adjust their offer based on the AI's buyer mindset?
   - Score 0-10: 10 = Perfect (correctly calculated MAO and adjusted offer), 5 = Partial (understood concept but miscalculated), 0 = Failed (ignored MAO or exit strategy)

2. **Strategy Pivot:** Did the rep pivot to Creative Finance when the Cash Offer was rejected?
   - Look for: "What if we structured this differently?", "Seller financing", "Subject-to", "Seller carry", "Take equity over time"
   - Did they offer alternative terms (interest rate, term length, down payment)?
   - Score 0-10: 10 = Perfect (immediately pivoted to creative finance with specific terms), 5 = Partial (mentioned alternative but vague), 0 = Failed (stuck to cash offer or gave up)

**ADVOCACY & RAPPORT PRESERVATION - The Good Cop/Bad Cop Dynamic:**
1. **Rapport Preservation:** Did the rep successfully blame the price on the underwriters while maintaining a warm relationship with the seller?
   - Look for phrases like: "I'm going to go to bat for you with my underwriters", "Let me see if I can squeeze a bit more out of the budget for you", "This is the best I could get the office to approve", "My underwriters are capping me at", "The money guys are saying"
   - Did the rep present the price as coming from a third party (underwriters/office) rather than themselves?
   - Did the seller respond positively (e.g., "I appreciate you trying for me", "Thank you for going to bat for me")?
   - Score 0-10: 10 = Perfect (blamed underwriters, maintained warm rapport, seller appreciated), 5 = Partial (mentioned underwriters but didn't fully pivot), 0 = Failed (presented price as their own, adversarial tone)

2. **The Go-To-Bat Move:** Did the rep "put the seller on hold" (simulated or verbal) to "check with the office" before coming back with a final number?
   - Look for: "Let me check with the office", "Hold on, let me see what I can do", "Let me talk to my underwriters", "Can you hold for a moment while I check?"
   - Did they return with a "final" number after the hold?
   - Did this make the seller feel like the rep was fighting for them?
   - Score 0-10: 10 = Perfect (put seller on hold, checked with office, returned with final number), 5 = Partial (mentioned checking but didn't simulate hold), 0 = Failed (no hold, no advocacy gesture)

3. **Team-Based Language:** Track the ratio of "Team" language vs. "Adversarial" language:
   - Team language: "We", "Us", "For you", "Together", "Let's", "I'm on your side"
   - Adversarial language: "I want", "My price", "I'm offering", "I need"
   - Calculate ratio: (Team phrases / Total phrases) × 100
   - Score 0-10: 10 = Perfect (80%+ team language), 5 = Partial (50-79% team language), 0 = Failed (<50% team language)

**UNDERWRITING HOLD VALIDATION - The "No Live Negotiation" Rule:**
STRICT RULE: The rep MUST place the seller on hold before changing the price. Live price negotiation is FORBIDDEN.

1. **Hold Utilization Score:** Did the rep use the "Bad Cop" (Underwriters) effectively?
   - Did they place the seller on hold before presenting a new price?
   - Did they mention "underwriters", "office", "the money guys", or similar before changing price?
   - Did they return from hold with a new price and blame it on underwriters?
   - Score 0-10: 10 = Perfect (always used hold before price changes), 5 = Partial (used hold sometimes), 0 = Failed (never used hold, negotiated live)

2. **Logic Break Detection:** If the rep changes the price WITHOUT placing on hold first, this is a CRITICAL LOGIC BREAK:
   - Look for price changes in the transcript (e.g., "$150k" then later "$155k" or "$145k")
   - Check if there was a hold mention BEFORE the price change
   - If price changed without hold: This is a FAILURE and must be penalized heavily
   - Penalty: -15 points to goatScore for each price change without hold
   - Flag in feedback: "CRITICAL: You changed the price without placing on hold. This violates the 'No Live Negotiation' rule."

3. **Hold Timing:** Did the rep keep the hold to a reasonable duration (15-40 seconds)?
   - If hold was too short (<10 seconds): Seller might not believe it was real
   - If hold was too long (>60 seconds): Seller becomes impatient (this is actually good for testing rapport)
   - Score 0-10: 10 = Perfect (20-40 seconds), 5 = Partial (10-20 or 40-60 seconds), 0 = Failed (<10 or >60 seconds)

**HOT MIC EAVESDROPPING - Intelligence Utilization:**
1. **The Subtle Pivot:** Did the rep use the "overheard" private dialogue to adjust their strategy WITHOUT admitting they were listening?
   - Look for the seller's private dialogue patterns:
     * "The Spouse": Mentions of needing cash, moving, family urgency
     * "The Debt": Mentions of foreclosure, bank deadlines, payment due dates
     * "The Anchor": Mentions of a lower acceptable price than initially stated
   - Did the rep adjust their offer based on this information?
   - Did they use the information subtly (e.g., "I understand you need to close by the 15th" without saying "I heard you talking")?
   - Score 0-10: 10 = Perfect (used info subtly, adjusted offer, never admitted listening), 5 = Partial (used info but was too obvious), 0 = Failed (didn't use info or admitted listening)

2. **Trust Breach Penalty:** If the rep admits to listening to the private dialogue, this is a CRITICAL TRUST BREACH:
   - Look for phrases like: "I heard you talking", "I overheard", "I was listening", "I caught that"
   - If detected: This is a MAJOR FAILURE - the seller will feel violated and lose trust
   - Penalty: -20 points to goatScore for admitting to eavesdropping
   - Flag in feedback: "CRITICAL TRUST BREACH: You admitted to listening to a private conversation. This destroys rapport and violates trust. Never reveal that you heard private dialogue."

3. **Intelligence Integration:** How well did the rep integrate the secret insight into their negotiation?
   - Did they reference the urgency (debt deadline) without saying they heard it?
   - Did they adjust their offer to match the "anchor" price mentioned privately?
   - Did they acknowledge family needs (spouse) without revealing they overheard?
   - Score 0-10: 10 = Perfect (seamlessly integrated, natural flow), 5 = Partial (integrated but awkward), 0 = Failed (ignored the insight or used it clumsily)

**CONTRACT WALK-THROUGH - CLAUSE 17 OBJECTION HANDLING:**
1. **Legal Clarity:** Did the rep accurately explain Clause 17 (Memorandum of Contract)?
   - Did they explain it as a "Reservation Sign" or "notice to the county"?
   - Did they clarify it's NOT a lien, but a notice of agreement?
   - Did they explain it protects the seller by preventing other buyers from "snaking" the deal?
   - Did they mention it's mutual protection during escrow?
   - Score 0-10: 10 = Perfect (clear, accurate explanation), 5 = Partial (somewhat clear but missing key points), 0 = Failed (vague, incorrect, or didn't explain)

2. **Emotional Regulation:** Did the rep stay calm and professional when the seller became defensive about their title?
   - Did they acknowledge the seller's concern without being dismissive?
   - Did they maintain a warm, reassuring tone even when the seller pushed back?
   - Did they avoid becoming defensive or argumentative?
   - Did they use the "Hold Strategy" if needed: "Let me put you on hold and check with my underwriters"?
   - Score 0-10: 10 = Perfect (calm, professional, empathetic), 5 = Partial (mostly calm but some tension), 0 = Failed (became defensive, argumentative, or dismissive)

3. **Hold Strategy Bonus:** If the rep used the hold strategy for Clause 17, this demonstrates advanced skill:
   - Look for: "Let me put you on hold", "Let me check with my underwriters", "Let me see what my office says"
   - This shows the rep can de-escalate and use the "Bad Cop" (Underwriters) to build trust
   - Bonus: +5 points to Legal Clarity score if hold strategy was used effectively

**Scoring Impact:**
- If contractSigned = true AND priceVariance <= 0: Add "Profit Protector" bonus (+10 points to goatScore)
- If contractSigned = true AND priceVariance > 0: Penalize goatScore based on variance:
  - 0-5% over: -5 points
  - 5-10% over: -10 points
  - 10-15% over: -15 points
  - 15%+ over: -20 points
- Add "Spread Expert" score (0-10) as bonus points to goatScore
- Add "Strategy Pivot" score (0-10) as bonus points to goatScore

**NEURAL COACHING - STRATEGIC DISCOVERY QUALITY SCORING:**
Instead of just checking if questions were asked, evaluate if the rep moved from "Surface-Level" (beds/baths, square footage, basic property info) to "Strategic Business Conversations" (foreclosure impact, tax debt, equity goals, financial pressure points).

1. **Surface-Level Questions:** Count questions about:
   - Bedrooms, bathrooms, square footage, lot size
   - Basic property condition (roof age, HVAC age, foundation)
   - These are necessary but NOT sufficient

2. **Strategic Business Questions:** Count questions about:
   - Foreclosure risk, mortgage payments, bank deadlines
   - Tax debt, liens, IRS issues
   - Equity goals, walk-away amount, net after closing
   - Divorce, probate, inheritance, job loss
   - Urgency, deadlines, time constraints
   - The "Hidden Why" - emotional/financial drivers

3. **Discovery Quality Score (0-100):**
   - Calculate ratio: Strategic Business Questions / (Surface-Level + Strategic Business Questions)
   - 80-100: Excellent (moved from surface to strategic effectively)
   - 60-79: Good (some strategic questions, but could dig deeper)
   - 40-59: Fair (too much time on surface-level)
   - 0-39: Poor (stayed at surface-level, never moved to strategic)

4. **Motivation Trigger Detection:**
   - Identify if the seller mentioned pain points: foreclosure, tax debt, divorce, probate, job loss, relocation urgency, property burden, equity need
   - For each trigger mentioned, check if the rep dug deeper (asked follow-up questions like "When did that start?", "How much do you owe?", "What's the deadline?")
   - If a trigger was mentioned but NOT explored: This is a MISSED OPPORTUNITY

5. **Elliott-Style Corrections:**
   - If the rep missed a motivation trigger, provide a direct correction:
     * "You just walked right past their [trigger name] pain point. Why didn't you dig into that? You heard them mention it, but you didn't ask 'When did that start?' or 'How much do you owe?' or 'What's the deadline?' You need to go DEEP, not just acknowledge it and move on."
   - These corrections should be included in the feedback

**NEURAL COACHING - DISC PERSONALITY DETECTION:**
Analyze the rep's language patterns to identify their DISC personality type:
- **Driver (High-D):** Direct, decisive, results-oriented ("let's", "we need", "now", "decision", "goal")
- **Amiable:** Relationship-focused, cooperative ("I understand", "together", "for you", "no rush")
- **Expressive:** Enthusiastic, animated ("excited", "amazing", "I love", "story")
- **Analytical:** Detail-oriented, systematic ("data", "numbers", "how", "why", "explain", "verify")

Include the detected DISC type and confidence level in the neuralCoaching section.

**NEURAL COACHING - EMOTIONAL INTELLIGENCE (EQ) TRACKING:**
Evaluate the rep's emotional intelligence using speech and sentiment analysis:

1. **Talk-Time Analysis:**
   - Calculate rep's talk time as percentage of total call duration
   - If rep talked >60% of the call: This is a "DOMINANCE ERROR"
   - The seller should be talking 60%+ of the time
   - Penalize rapport score heavily if dominance error detected

2. **Active Listening Score (0-100):**
   - Count active listening indicators: "mhm", "uh-huh", "I see", "I understand", "tell me more"
   - More indicators = higher score
   - Heavy penalty (-30 points) if dominance error

3. **Rapport Score (0-100):**
   - Base score: 70
   - If dominance error: -40 points (rapport destroyed)
   - If talk-time 40-60%: +15 points (good balance)
   - If talk-time <40%: +20 points (excellent listening)

4. **Tonality & Sentiment Alignment:**
   - Evaluate if rep matched AI's emotional state
   - Did rep adjust tone based on AI's sentiment?
   - Score 0-100

Include EQ metrics in the neuralCoaching section with specific feedback on dominance errors.

**Output Format:** Return a JSON object with:
- goatScore: [0-100]
- feedback: [2-3 sentences of blunt coaching]
- rebuttalOfTheDay: [One line the rep said that was excellent, or "None" if nothing stood out]
- keyMoves: ["Key Move 1", "Key Move 2", "Key Move 3"] (only include if roleReversal/learning mode is true)
- smoothPivot: {
  "score": [0-10],
  "acknowledgedStory": true/false,
  "usedEmpathy": true/false,
  "reAnchored": true/false,
  "feedback": "[Brief feedback on pivot quality]"
} (only include if a story was detected, otherwise omit)
- activeListening: {
  "score": [0-10],
  "leftSpaceForInterjections": true/false,
  "acknowledgedFollowUps": true/false,
  "feedback": "[Brief feedback on active listening quality]"
} (always include - evaluates how well rep engaged with AI's active listening)
- conversationFlow: {
  "score": [0-10],
  "managedInterruptions": true/false,
  "naturalGiveAndTake": true/false,
  "feedback": "[Brief feedback on conversation flow quality]"
} (always include - evaluates natural conversation flow vs rigid turn-taking)
- dealTracking: {
  "contractSigned": true/false,
  "suggestedBuyPrice": [number or null],
  "finalOfferPrice": [number or null],
  "priceVariance": [number or null] (percentage, positive = overpaying, negative = under target)
} (always include - analyzes deal execution and price negotiation)
- negotiationPrecision: {
  "spreadExpert": {
    "score": [0-10],
    "correctlyCalculatedMAO": true/false,
    "identifiedExitStrategy": true/false,
    "adjustedOfferBasedOnStrategy": true/false,
    "feedback": "[Brief feedback on MAO calculation accuracy]"
  },
  "strategyPivot": {
    "score": [0-10],
    "pivotedToCreativeFinance": true/false,
    "offeredAlternativeTerms": true/false,
    "feedback": "[Brief feedback on pivot quality]"
  }
} (always include - evaluates technical negotiation expertise)
- advocacy: {
  "rapportPreservation": {
    "score": [0-10],
    "blamedUnderwriters": true/false,
    "maintainedWarmRapport": true/false,
    "sellerAppreciated": true/false,
    "feedback": "[Brief feedback on rapport preservation]"
  },
  "goToBatMove": {
    "score": [0-10],
    "putOnHold": true/false,
    "checkedWithOffice": true/false,
    "returnedWithFinalNumber": true/false,
    "feedback": "[Brief feedback on go-to-bat move]"
  },
  "teamLanguageRatio": {
    "score": [0-10],
    "teamPhrases": [number],
    "adversarialPhrases": [number],
    "ratio": [number] (percentage),
    "feedback": "[Brief feedback on language usage]"
  },
  "holdUtilization": {
    "score": [0-10],
    "usedHoldBeforePriceChange": true/false,
    "priceChangesWithoutHold": [number] (count of violations),
    "holdTiming": [number] (average hold duration in seconds),
    "feedback": "[Brief feedback on hold usage - CRITICAL if price changed without hold]"
  },
    "intelligenceUtilization": {
    "score": [0-10],
    "subtlePivot": true/false (did rep use overheard info without admitting),
    "trustBreach": true/false (did rep admit to listening - CRITICAL if true),
    "intelligenceIntegrated": true/false (did rep integrate secret insight naturally),
    "feedback": "[Brief feedback on intelligence utilization - CRITICAL if trust breach detected]"
  },
  "clause17Handling": {
    "legalClarity": {
      "score": [0-10],
      "explainedAsReservationSign": true/false,
      "clarifiedNotALien": true/false,
      "explainedMutualProtection": true/false,
      "explainedPreventsSnaking": true/false,
      "feedback": "[Brief feedback on legal clarity - did rep explain Clause 17 accurately?]"
    },
    "emotionalRegulation": {
      "score": [0-10],
      "stayedCalm": true/false,
      "acknowledgedConcern": true/false,
      "maintainedWarmTone": true/false,
      "usedHoldStrategy": true/false,
      "feedback": "[Brief feedback on emotional regulation - did rep stay calm during objection?]"
    }
  }
} (always include - evaluates Good Cop/Bad Cop advocacy dynamic, hold protocol, hot mic intelligence, and contract walk-through handling)
- logicGates: {
  "intro": "pass" or "fail",
  "motivation": "found" or "missed",
  "condition": "pass" or "fail",
  "transition": "pass" or "fail",
  "hold": "pass" or "fail",
  "offer": "pass" or "fail",
  "expectations": "pass" or "fail",
  "commitment": "pass" or "fail",
  "tone": [0-10]
}

Be strict. Only give high scores if all gates are passed.`;

export async function gradeCall(
  transcript: string, 
  userId?: string, 
  callId?: string, 
  gauntletLevel?: number,
  roleReversal?: boolean,
  callDuration?: number,
  repTalkTime?: number
): Promise<GradingResult> {
  try {
    // Add learning mode context to the prompt if roleReversal is true
    const promptContext = roleReversal 
      ? `\n\nIMPORTANT: This is a LEARNING MODE call. The AI acted as the acquisition agent (The Master Closer), and the user acted as the seller. Provide 3 "Key Moves" the AI made in the keyMoves array.`
      : '';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: JUDGE_PROMPT + promptContext,
        },
        {
          role: 'user',
          content: `Analyze this sales call transcript:\n\n${transcript}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent grading
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response) as GradingResult;

    // Validate and normalize the result
    const result: GradingResult = {
      goatScore: Math.max(0, Math.min(100, parsed.goatScore || 0)),
      feedback: parsed.feedback || 'No feedback provided.',
      rebuttalOfTheDay: parsed.rebuttalOfTheDay || 'None',
      logicGates: {
        intro: parsed.logicGates?.intro === 'pass' ? 'pass' : 'fail',
        motivation: parsed.logicGates?.motivation === 'found' ? 'found' : 'missed',
        condition: parsed.logicGates?.condition === 'pass' ? 'pass' : 'fail',
        transition: parsed.logicGates?.transition === 'pass' ? 'pass' : 'fail',
        hold: parsed.logicGates?.hold === 'pass' ? 'pass' : 'fail',
        offer: parsed.logicGates?.offer === 'pass' ? 'pass' : 'fail',
        expectations: parsed.logicGates?.expectations === 'pass' ? 'pass' : 'fail',
        commitment: parsed.logicGates?.commitment === 'pass' ? 'pass' : 'fail',
        tone: Math.max(0, Math.min(10, parsed.logicGates?.tone || 0)),
      },
    };

    // Include smoothPivot if it was detected
    if (parsed.smoothPivot) {
      result.smoothPivot = {
        score: Math.max(0, Math.min(10, parsed.smoothPivot.score || 0)),
        acknowledgedStory: parsed.smoothPivot.acknowledgedStory === true,
        usedEmpathy: parsed.smoothPivot.usedEmpathy === true,
        reAnchored: parsed.smoothPivot.reAnchored === true,
        feedback: parsed.smoothPivot.feedback || 'No pivot feedback provided.',
      };
    }

    // Include activeListening if provided
    if (parsed.activeListening) {
      result.activeListening = {
        score: Math.max(0, Math.min(10, parsed.activeListening.score || 0)),
        leftSpaceForInterjections: parsed.activeListening.leftSpaceForInterjections === true,
        acknowledgedFollowUps: parsed.activeListening.acknowledgedFollowUps === true,
        feedback: parsed.activeListening.feedback || 'No active listening feedback provided.',
      };
    }

    // Include conversationFlow if provided
    if (parsed.conversationFlow) {
      result.conversationFlow = {
        score: Math.max(0, Math.min(10, parsed.conversationFlow.score || 0)),
        managedInterruptions: parsed.conversationFlow.managedInterruptions === true,
        naturalGiveAndTake: parsed.conversationFlow.naturalGiveAndTake === true,
        feedback: parsed.conversationFlow.feedback || 'No conversation flow feedback provided.',
      };
    }

    // Include dealTracking if provided
    if (parsed.dealTracking) {
      result.dealTracking = {
        contractSigned: parsed.dealTracking.contractSigned === true,
        suggestedBuyPrice: parsed.dealTracking.suggestedBuyPrice || null,
        finalOfferPrice: parsed.dealTracking.finalOfferPrice || null,
        priceVariance: parsed.dealTracking.priceVariance || null,
      };

      // Apply deal tracking bonuses/penalties
      if (result.dealTracking.contractSigned) {
        const variance = result.dealTracking.priceVariance || 0;
        
        if (variance <= 0) {
          // Profit Protector bonus: stayed at or under target
          result.goatScore = Math.min(100, result.goatScore + 10);
        } else if (variance > 0) {
          // Penalty for overpaying
          let penalty = 0;
          if (variance <= 5) penalty = 5;
          else if (variance <= 10) penalty = 10;
          else if (variance <= 15) penalty = 15;
          else penalty = 20;
          
          result.goatScore = Math.max(0, result.goatScore - penalty);
        }
      }
    }

    // Include advocacy if provided
    if (parsed.advocacy) {
      result.advocacy = {
        rapportPreservation: {
          score: Math.max(0, Math.min(10, parsed.advocacy.rapportPreservation?.score || 0)),
          blamedUnderwriters: parsed.advocacy.rapportPreservation?.blamedUnderwriters === true,
          maintainedWarmRapport: parsed.advocacy.rapportPreservation?.maintainedWarmRapport === true,
          sellerAppreciated: parsed.advocacy.rapportPreservation?.sellerAppreciated === true,
          feedback: parsed.advocacy.rapportPreservation?.feedback || 'No feedback provided.',
        },
        goToBatMove: {
          score: Math.max(0, Math.min(10, parsed.advocacy.goToBatMove?.score || 0)),
          putOnHold: parsed.advocacy.goToBatMove?.putOnHold === true,
          checkedWithOffice: parsed.advocacy.goToBatMove?.checkedWithOffice === true,
          returnedWithFinalNumber: parsed.advocacy.goToBatMove?.returnedWithFinalNumber === true,
          feedback: parsed.advocacy.goToBatMove?.feedback || 'No feedback provided.',
        },
        teamLanguageRatio: {
          score: Math.max(0, Math.min(10, parsed.advocacy.teamLanguageRatio?.score || 0)),
          teamPhrases: parsed.advocacy.teamLanguageRatio?.teamPhrases || 0,
          adversarialPhrases: parsed.advocacy.teamLanguageRatio?.adversarialPhrases || 0,
          ratio: parsed.advocacy.teamLanguageRatio?.ratio || 0,
          feedback: parsed.advocacy.teamLanguageRatio?.feedback || 'No feedback provided.',
        },
        holdUtilization: {
          score: Math.max(0, Math.min(10, parsed.advocacy.holdUtilization?.score || 0)),
          usedHoldBeforePriceChange: parsed.advocacy.holdUtilization?.usedHoldBeforePriceChange === true,
          priceChangesWithoutHold: parsed.advocacy.holdUtilization?.priceChangesWithoutHold || 0,
          holdTiming: parsed.advocacy.holdUtilization?.holdTiming || 0,
          feedback: parsed.advocacy.holdUtilization?.feedback || 'No feedback provided.',
        },
        intelligenceUtilization: {
          score: Math.max(0, Math.min(10, parsed.advocacy.intelligenceUtilization?.score || 0)),
          subtlePivot: parsed.advocacy.intelligenceUtilization?.subtlePivot === true,
          trustBreach: parsed.advocacy.intelligenceUtilization?.trustBreach === true,
          intelligenceIntegrated: parsed.advocacy.intelligenceUtilization?.intelligenceIntegrated === true,
          feedback: parsed.advocacy.intelligenceUtilization?.feedback || 'No feedback provided.',
        },
        clause17Handling: {
          legalClarity: {
            score: Math.max(0, Math.min(10, parsed.advocacy.clause17Handling?.legalClarity?.score || 0)),
            explainedAsReservationSign: parsed.advocacy.clause17Handling?.legalClarity?.explainedAsReservationSign === true,
            clarifiedNotALien: parsed.advocacy.clause17Handling?.legalClarity?.clarifiedNotALien === true,
            explainedMutualProtection: parsed.advocacy.clause17Handling?.legalClarity?.explainedMutualProtection === true,
            explainedPreventsSnaking: parsed.advocacy.clause17Handling?.legalClarity?.explainedPreventsSnaking === true,
            feedback: parsed.advocacy.clause17Handling?.legalClarity?.feedback || 'No feedback provided.',
          },
          emotionalRegulation: {
            score: Math.max(0, Math.min(10, parsed.advocacy.clause17Handling?.emotionalRegulation?.score || 0)),
            stayedCalm: parsed.advocacy.clause17Handling?.emotionalRegulation?.stayedCalm === true,
            acknowledgedConcern: parsed.advocacy.clause17Handling?.emotionalRegulation?.acknowledgedConcern === true,
            maintainedWarmTone: parsed.advocacy.clause17Handling?.emotionalRegulation?.maintainedWarmTone === true,
            usedHoldStrategy: parsed.advocacy.clause17Handling?.emotionalRegulation?.usedHoldStrategy === true,
            feedback: parsed.advocacy.clause17Handling?.emotionalRegulation?.feedback || 'No feedback provided.',
          },
        },
      };

      // Apply Clause 17 bonus if hold strategy was used
      if (result.advocacy.clause17Handling?.emotionalRegulation?.usedHoldStrategy) {
        const holdStrategyBonus = 5;
        result.advocacy.clause17Handling.legalClarity.score = Math.min(
          10,
          result.advocacy.clause17Handling.legalClarity.score + holdStrategyBonus
        );
      }

      // Apply advocacy bonuses (up to 15 points total)
      const rapportBonus = result.advocacy.rapportPreservation.score;
      const goToBatBonus = result.advocacy.goToBatMove.score;
      const teamLanguageBonus = result.advocacy.teamLanguageRatio.score;
      const holdUtilizationBonus = result.advocacy.holdUtilization.score;
      const intelligenceBonus = result.advocacy.intelligenceUtilization.score;
      
      // Add bonuses (weighted average: 25% rapport, 20% go-to-bat, 15% team language, 20% hold utilization, 20% intelligence)
      const advocacyBonus = Math.round((rapportBonus * 0.25 + goToBatBonus * 0.2 + teamLanguageBonus * 0.15 + holdUtilizationBonus * 0.2 + intelligenceBonus * 0.2));
      result.goatScore = Math.min(100, result.goatScore + advocacyBonus);

      // CRITICAL PENALTY: If price changed without hold, apply heavy penalty
      if (result.advocacy.holdUtilization.priceChangesWithoutHold > 0) {
        const penalty = result.advocacy.holdUtilization.priceChangesWithoutHold * 15; // -15 points per violation
        result.goatScore = Math.max(0, result.goatScore - penalty);
      }

      // CRITICAL PENALTY: If rep admitted to eavesdropping (trust breach), apply heavy penalty
      if (result.advocacy.intelligenceUtilization.trustBreach) {
        const trustBreachPenalty = 20; // -20 points for trust breach
        result.goatScore = Math.max(0, result.goatScore - trustBreachPenalty);
      }
    }

    // Add Neural Coaching metrics if provided
    if (parsed.neuralCoaching) {
      const discoveryQuality = parsed.neuralCoaching.strategicDiscovery || {
        score: 0,
        surfaceLevelQuestions: 0,
        strategicBusinessQuestions: 0,
        motivationTriggersDetected: [],
        motivationTriggersMissed: [],
        elliottCorrections: [],
        feedback: '',
      };
      const discProfile = parsed.neuralCoaching.discProfile || {
        type: 'analytical' as const,
        confidence: 0,
        indicators: [],
      };
      const eqMetrics = parsed.neuralCoaching.eqMetrics || {
        talkTimePercentage: repTalkTime && callDuration ? (repTalkTime / callDuration) * 100 : 0,
        dominanceError: repTalkTime && callDuration ? (repTalkTime / callDuration) > 0.6 : false,
        activeListeningScore: 0,
        rapportScore: 0,
        tonalityScore: 0,
        sentimentAlignment: 0,
        feedback: '',
      };

      result.neuralCoaching = {
        strategicDiscovery: discoveryQuality,
        discProfile: discProfile,
        eqMetrics: eqMetrics,
      };
      
      // Apply penalties/bonuses based on neural coaching
      // Penalty for low discovery quality
      if (discoveryQuality.score < 60) {
        const discoveryPenalty = Math.round((60 - discoveryQuality.score) * 0.5); // Up to -20 points
        result.goatScore = Math.max(0, result.goatScore - discoveryPenalty);
      }
      
      // Penalty for dominance error (talk-time > 60%)
      if (eqMetrics.dominanceError) {
        const dominancePenalty = 25; // -25 points for dominance error
        result.goatScore = Math.max(0, result.goatScore - dominancePenalty);
      }
      
      // Bonus for high discovery quality
      if (discoveryQuality.score >= 80) {
        const discoveryBonus = 10; // +10 points for excellent discovery
        result.goatScore = Math.min(100, result.goatScore + discoveryBonus);
      }
      
      // Add Elliott corrections to feedback if any were detected
      if (discoveryQuality.elliottCorrections && discoveryQuality.elliottCorrections.length > 0) {
        result.feedback = `${result.feedback}\n\nELLIOTT CORRECTIONS:\n${discoveryQuality.elliottCorrections.join('\n')}`;
      }
      
      // Add EQ feedback if dominance error
      if (eqMetrics.dominanceError && eqMetrics.feedback) {
        result.feedback = `${result.feedback}\n\n${eqMetrics.feedback}`;
      }
    }

    return result;
  } catch (error) {
    logger.error('Error grading call', { error });
    // Return default grading on error
    return {
      goatScore: 0,
      feedback: 'Error analyzing call. Please try again.',
      rebuttalOfTheDay: 'None',
      logicGates: {
        intro: 'fail',
        motivation: 'missed',
        condition: 'fail',
        transition: 'fail',
        hold: 'fail',
        offer: 'fail',
        expectations: 'fail',
        commitment: 'fail',
        tone: 0,
      },
    };
  }
}
