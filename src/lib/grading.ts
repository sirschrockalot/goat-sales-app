/**
 * Grading Logic
 * Uses OpenAI to grade calls based on the JUDGE_PROMPT rubric
 */

import OpenAI from 'openai';

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

const JUDGE_PROMPT = `Act as a Sales Manager specializing in the Eric Cline Sales Goat method. Analyze the transcript for these 5 gates:

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

**Scoring Impact:**
- If contractSigned = true AND priceVariance <= 0: Add "Profit Protector" bonus (+10 points to goatScore)
- If contractSigned = true AND priceVariance > 0: Penalize goatScore based on variance:
  - 0-5% over: -5 points
  - 5-10% over: -10 points
  - 10-15% over: -15 points
  - 15%+ over: -20 points
- Add "Spread Expert" score (0-10) as bonus points to goatScore
- Add "Strategy Pivot" score (0-10) as bonus points to goatScore

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
  }
} (always include - evaluates Good Cop/Bad Cop advocacy dynamic)
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

export async function gradeCall(transcript: string, roleReversal?: boolean): Promise<GradingResult> {
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
      };

      // Apply advocacy bonuses (up to 15 points total)
      const rapportBonus = result.advocacy.rapportPreservation.score;
      const goToBatBonus = result.advocacy.goToBatMove.score;
      const teamLanguageBonus = result.advocacy.teamLanguageRatio.score;
      
      // Add bonuses (weighted average: 40% rapport, 30% go-to-bat, 30% team language)
      const advocacyBonus = Math.round((rapportBonus * 0.4 + goToBatBonus * 0.3 + teamLanguageBonus * 0.3));
      result.goatScore = Math.min(100, result.goatScore + advocacyBonus);
    }

    return result;
  } catch (error) {
    console.error('Error grading call:', error);
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
