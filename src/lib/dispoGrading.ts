/**
 * Dispo Grading Logic
 * Uses OpenAI to grade Dispo calls based on DISPO_SCRIPT_MAPPING.md criteria
 *
 * Enhanced with:
 * - Objection handling scoring
 * - EMD/terms negotiation metrics
 * - Detailed coaching feedback
 */

import OpenAI from 'openai';
import logger from './logger';
import { evaluateEMDAmount, evaluateTimeline, STANDARD_TERMS, getTermsCoachingFeedback } from './dispoTermsNegotiation';
import { getCoachingForObjection, DispoObjectionCategory } from './dispoObjectionBank';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Objection handling score breakdown
 */
interface ObjectionHandlingScore {
  arvDefense: {
    score: number; // 0-10
    heldFirm: boolean;
    usedComps: boolean;
    acknowledged: boolean;
  };
  repairDefense: {
    score: number; // 0-10
    heldFirm: boolean;
    acknowledgedConcern: boolean;
    reframed: boolean;
  };
  timelineDefense: {
    score: number; // 0-10
    maintainedUrgency: boolean;
    offeredSolution: boolean;
  };
  emdDefense: {
    score: number; // 0-10
    heldFirm: boolean;
    explainedValue: boolean;
    finalAmount: number | null;
  };
  overallObjectionScore: number; // 0-100
}

/**
 * Terms negotiation score breakdown
 */
interface TermsNegotiationScore {
  emdHoldRate: number; // 0-100, percentage of times held at $5k or above
  emdFinalAmount: number | null; // Final agreed EMD amount
  timelineHoldRate: number; // 0-100
  timelineFinalDays: number | null; // Final agreed close timeline
  acceptedRefundable: boolean;
  acceptedContingency: boolean;
  explainedTermsClearly: boolean;
  verifiedBuyerCapital: boolean;
  score: number; // 0-100
}

interface DispoGradingResult {
  goatScore: number;
  feedback: string;
  rebuttalOfTheDay: string;
  logicGates: {
    hook: 'pass' | 'fail'; // Gate 1: The Hook (The Numbers)
    narrative: 'pass' | 'fail'; // Gate 2: The Narrative (The Comp Analysis)
    scarcity: 'pass' | 'fail'; // Gate 3: The Scarcity Anchor (The Competition)
    terms: 'pass' | 'fail'; // Gate 4: The Terms (Transaction Clarity)
    clinch: 'pass' | 'fail'; // Gate 5: The Clinch (The Assignment)
    tonality: number; // 0-10, professional urgency
  };
  // NEW: Enhanced scoring metrics
  objectionHandling?: ObjectionHandlingScore;
  termsNegotiation?: TermsNegotiationScore;
  coachingTips?: string[];
}

const DISPO_JUDGE_PROMPT = `Act as a Sales Manager specializing in Dispositions (selling to investors). Analyze the transcript for these 5 gates PLUS objection handling and terms negotiation:

## THE 5 GATES:

1. **The Hook (Pass/Fail):** Did they lead with "The Numbers" - ARV, Buy-in, Spread, ROI? Did they say "bread-and-butter" or similar profit-focused language?
2. **The Narrative (Pass/Fail):** Did they provide comp analysis? Did they say "worst house on best street" and justify the ARV with recent sales?
3. **The Scarcity Anchor (Pass/Fail):** Did they create urgency? Did they mention "top 5 buyers", "walkthroughs", "lock it up", or "moving fast"?
4. **The Terms (Pass/Fail):** Did they clearly state the terms - "$5k non-refundable EMD", "7-day close", "Title Company"? Did they verify the buyer's capital works with the timeline?
5. **The Clinch (Pass/Fail):** Did they get commitment to sign the assignment immediately? Did they direct the buyer to stay on the phone until signature is confirmed?
6. **Tonality (0-10):** Did the rep sound professional, urgent, and authoritative? Did they maintain high energy?

## OBJECTION HANDLING (Score 0-10 each, look for these in the call):

**ARV Defense:** When buyer challenged ARV, did the rep:
- Hold firm on the number? (heldFirm)
- Cite specific comps with addresses/dates? (usedComps)
- Acknowledge the buyer's concern before pivoting? (acknowledged)

**Repair Defense:** When buyer challenged repair estimates, did the rep:
- Hold firm or provide reasonable justification? (heldFirm)
- Acknowledge their concern emotionally? (acknowledgedConcern)
- Reframe to spread/profit despite higher repairs? (reframed)

**Timeline Defense:** When buyer pushed back on close timeline, did the rep:
- Maintain urgency about competing buyers? (maintainedUrgency)
- Offer a solution that works for both parties? (offeredSolution)

**EMD Defense:** When buyer negotiated EMD, did the rep:
- Hold firm at $5k or negotiate above $3k minimum? (heldFirm)
- Explain WHY EMD is important (mutual protection)? (explainedValue)
- What was the final EMD amount agreed? (finalAmount - in dollars)

## TERMS NEGOTIATION (CRITICAL - especially for higher levels):

**EMD SCORING:**
- Excellent: Held at $5,000 or above
- Acceptable: Negotiated to $4,000-$4,999
- Minimum: Negotiated to $3,000-$3,999 (only acceptable with justification)
- FAIL: Accepted below $3,000 or made EMD refundable

**TIMELINE SCORING:**
- Excellent: Held at 7 days
- Acceptable: Extended to 10-14 days with justification
- FAIL: Extended beyond 14 days or gave open-ended timeline

**CRITICAL FAILURES (automatic fail for Terms gate):**
- Accepting refundable EMD (acceptedRefundable)
- Accepting financing/inspection contingencies (acceptedContingency)
- Not verifying buyer has cash ready (verifiedBuyerCapital)

## OUTPUT FORMAT:

Return a JSON object with:
{
  "goatScore": [0-100],
  "feedback": "[2-3 sentences of blunt coaching specific to Dispo sales]",
  "rebuttalOfTheDay": "[One excellent line from the rep, or 'None']",
  "logicGates": {
    "hook": "pass" or "fail",
    "narrative": "pass" or "fail",
    "scarcity": "pass" or "fail",
    "terms": "pass" or "fail",
    "clinch": "pass" or "fail",
    "tonality": [0-10]
  },
  "objectionHandling": {
    "arvDefense": { "score": [0-10], "heldFirm": true/false, "usedComps": true/false, "acknowledged": true/false },
    "repairDefense": { "score": [0-10], "heldFirm": true/false, "acknowledgedConcern": true/false, "reframed": true/false },
    "timelineDefense": { "score": [0-10], "maintainedUrgency": true/false, "offeredSolution": true/false },
    "emdDefense": { "score": [0-10], "heldFirm": true/false, "explainedValue": true/false, "finalAmount": [number or null] },
    "overallObjectionScore": [0-100]
  },
  "termsNegotiation": {
    "emdHoldRate": [0-100],
    "emdFinalAmount": [number or null],
    "timelineHoldRate": [0-100],
    "timelineFinalDays": [number or null],
    "acceptedRefundable": true/false,
    "acceptedContingency": true/false,
    "explainedTermsClearly": true/false,
    "verifiedBuyerCapital": true/false,
    "score": [0-100]
  },
  "coachingTips": ["Specific tip 1", "Specific tip 2"]
}

## SCORING RULES:

- If objections were raised and NOT handled well, reduce goatScore by 10-20 points
- If EMD was accepted below $3k OR made refundable, Terms gate = FAIL and reduce goatScore by 25 points
- If timeline extended beyond 14 days without strong justification, reduce goatScore by 10 points
- Only give 90+ if ALL gates pass AND objections were handled with certainty
- Be strict. Dispo reps must hold firm on terms.`;

export async function gradeDispoCall(
  transcript: string,
  options?: { gauntletLevel?: number; includeDetailedScoring?: boolean }
): Promise<DispoGradingResult> {
  try {
    // Add context about the gauntlet level if provided
    let contextPrefix = '';
    if (options?.gauntletLevel) {
      contextPrefix = `[CONTEXT: This is a Level ${options.gauntletLevel} training call. `;
      if (options.gauntletLevel >= 3) {
        contextPrefix += 'The buyer will challenge ARV, repairs, and terms aggressively. ';
      }
      if (options.gauntletLevel >= 4) {
        contextPrefix += 'EMD negotiation is a key test point - watch for attempts to reduce below $3k or make it refundable. ';
      }
      if (options.gauntletLevel === 5) {
        contextPrefix += 'This is the ultimate test - zero tolerance for wavering on terms. ';
      }
      contextPrefix += ']\n\n';
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: DISPO_JUDGE_PROMPT,
        },
        {
          role: 'user',
          content: `${contextPrefix}Analyze this Dispo sales call transcript:\n\n${transcript}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);

    // Build the base result
    const result: DispoGradingResult = {
      goatScore: Math.max(0, Math.min(100, parsed.goatScore || 0)),
      feedback: parsed.feedback || 'No feedback provided.',
      rebuttalOfTheDay: parsed.rebuttalOfTheDay || 'None',
      logicGates: {
        hook: parsed.logicGates?.hook === 'pass' ? 'pass' : 'fail',
        narrative: parsed.logicGates?.narrative === 'pass' ? 'pass' : 'fail',
        scarcity: parsed.logicGates?.scarcity === 'pass' ? 'pass' : 'fail',
        terms: parsed.logicGates?.terms === 'pass' ? 'pass' : 'fail',
        clinch: parsed.logicGates?.clinch === 'pass' ? 'pass' : 'fail',
        tonality: Math.max(0, Math.min(10, parsed.logicGates?.tonality || 0)),
      },
    };

    // Add enhanced scoring if provided by the model or requested
    if (parsed.objectionHandling || options?.includeDetailedScoring) {
      result.objectionHandling = {
        arvDefense: {
          score: Math.max(0, Math.min(10, parsed.objectionHandling?.arvDefense?.score || 0)),
          heldFirm: parsed.objectionHandling?.arvDefense?.heldFirm ?? false,
          usedComps: parsed.objectionHandling?.arvDefense?.usedComps ?? false,
          acknowledged: parsed.objectionHandling?.arvDefense?.acknowledged ?? false,
        },
        repairDefense: {
          score: Math.max(0, Math.min(10, parsed.objectionHandling?.repairDefense?.score || 0)),
          heldFirm: parsed.objectionHandling?.repairDefense?.heldFirm ?? false,
          acknowledgedConcern: parsed.objectionHandling?.repairDefense?.acknowledgedConcern ?? false,
          reframed: parsed.objectionHandling?.repairDefense?.reframed ?? false,
        },
        timelineDefense: {
          score: Math.max(0, Math.min(10, parsed.objectionHandling?.timelineDefense?.score || 0)),
          maintainedUrgency: parsed.objectionHandling?.timelineDefense?.maintainedUrgency ?? false,
          offeredSolution: parsed.objectionHandling?.timelineDefense?.offeredSolution ?? false,
        },
        emdDefense: {
          score: Math.max(0, Math.min(10, parsed.objectionHandling?.emdDefense?.score || 0)),
          heldFirm: parsed.objectionHandling?.emdDefense?.heldFirm ?? false,
          explainedValue: parsed.objectionHandling?.emdDefense?.explainedValue ?? false,
          finalAmount: parsed.objectionHandling?.emdDefense?.finalAmount || null,
        },
        overallObjectionScore: Math.max(0, Math.min(100, parsed.objectionHandling?.overallObjectionScore || 0)),
      };
    }

    if (parsed.termsNegotiation || options?.includeDetailedScoring) {
      result.termsNegotiation = {
        emdHoldRate: Math.max(0, Math.min(100, parsed.termsNegotiation?.emdHoldRate || 0)),
        emdFinalAmount: parsed.termsNegotiation?.emdFinalAmount || null,
        timelineHoldRate: Math.max(0, Math.min(100, parsed.termsNegotiation?.timelineHoldRate || 0)),
        timelineFinalDays: parsed.termsNegotiation?.timelineFinalDays || null,
        acceptedRefundable: parsed.termsNegotiation?.acceptedRefundable ?? false,
        acceptedContingency: parsed.termsNegotiation?.acceptedContingency ?? false,
        explainedTermsClearly: parsed.termsNegotiation?.explainedTermsClearly ?? false,
        verifiedBuyerCapital: parsed.termsNegotiation?.verifiedBuyerCapital ?? false,
        score: Math.max(0, Math.min(100, parsed.termsNegotiation?.score || 0)),
      };

      // Generate additional coaching tips based on terms negotiation
      const additionalTips = generateTermsCoachingTips(result.termsNegotiation);
      result.coachingTips = [
        ...(parsed.coachingTips || []),
        ...additionalTips,
      ];
    } else {
      result.coachingTips = parsed.coachingTips || [];
    }

    return result;
  } catch (error) {
    logger.error('Error grading Dispo call', { error });
    // Return default grading on error
    return {
      goatScore: 0,
      feedback: 'Error analyzing call. Please try again.',
      rebuttalOfTheDay: 'None',
      logicGates: {
        hook: 'fail',
        narrative: 'fail',
        scarcity: 'fail',
        terms: 'fail',
        clinch: 'fail',
        tonality: 0,
      },
    };
  }
}

/**
 * Generate coaching tips based on terms negotiation results
 */
function generateTermsCoachingTips(terms: TermsNegotiationScore): string[] {
  const tips: string[] = [];

  // EMD tips
  if (terms.emdFinalAmount !== null) {
    const emdEval = evaluateEMDAmount(terms.emdFinalAmount);
    if (!emdEval.passed) {
      tips.push(`CRITICAL: EMD of $${terms.emdFinalAmount} is below the $${STANDARD_TERMS.minimumAcceptableEMD} minimum. Never accept below $3k.`);
    } else if (emdEval.tier === 'minimum') {
      tips.push(`EMD at floor ($${terms.emdFinalAmount}). Only accept $3k-$4k if buyer provides strong justification.`);
    }
  }

  // Timeline tips
  if (terms.timelineFinalDays !== null) {
    const timelineEval = evaluateTimeline(terms.timelineFinalDays);
    if (!timelineEval.passed) {
      tips.push(`Timeline extended to ${terms.timelineFinalDays} days. Maximum acceptable is 14 days. Probe for why they need more time.`);
    }
  }

  // Refundable EMD
  if (terms.acceptedRefundable) {
    tips.push('CRITICAL FAIL: Never accept refundable EMD. Offer pre-commitment walkthroughs instead.');
  }

  // Contingency
  if (terms.acceptedContingency) {
    tips.push('CRITICAL FAIL: No contingencies on assignments. If buyer needs financing contingency, they are not a cash buyer.');
  }

  // Capital verification
  if (!terms.verifiedBuyerCapital) {
    tips.push('Always verify buyer has cash ready for the timeline. Ask: "Are you closing with cash or hard money?"');
  }

  return tips;
}

/**
 * Quick grade for terms negotiation only (faster, focused evaluation)
 */
export async function gradeTermsNegotiation(transcript: string): Promise<{
  score: number;
  emdAmount: number | null;
  timelineDays: number | null;
  acceptedRefundable: boolean;
  coaching: string[];
}> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are analyzing a Dispo sales call specifically for terms negotiation.

Extract the following:
1. Final EMD amount agreed (in dollars, or null if not discussed)
2. Final close timeline agreed (in days, or null if not discussed)
3. Did the rep accept refundable EMD? (true/false)
4. Did the rep accept any contingencies? (true/false)

EMD RULES:
- Standard: $5,000 non-refundable
- Minimum acceptable: $3,000
- Below $3,000 = FAIL
- Refundable = FAIL

Return JSON:
{
  "emdAmount": number or null,
  "timelineDays": number or null,
  "acceptedRefundable": boolean,
  "acceptedContingency": boolean
}`,
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No response');

    const parsed = JSON.parse(response);

    // Calculate score
    let score = 100;
    const coaching: string[] = [];

    if (parsed.emdAmount !== null) {
      const emdEval = evaluateEMDAmount(parsed.emdAmount);
      score = Math.min(score, emdEval.score);
      if (!emdEval.passed) {
        coaching.push(emdEval.feedback);
      }
    }

    if (parsed.timelineDays !== null) {
      const timelineEval = evaluateTimeline(parsed.timelineDays);
      score = Math.min(score, timelineEval.score);
      if (!timelineEval.passed) {
        coaching.push(timelineEval.feedback);
      }
    }

    if (parsed.acceptedRefundable) {
      score = 0;
      coaching.push('FAIL: Accepted refundable EMD.');
    }

    if (parsed.acceptedContingency) {
      score = Math.max(0, score - 25);
      coaching.push('Accepted contingency - this kills most wholesale deals.');
    }

    return {
      score,
      emdAmount: parsed.emdAmount,
      timelineDays: parsed.timelineDays,
      acceptedRefundable: parsed.acceptedRefundable ?? false,
      coaching,
    };
  } catch (error) {
    logger.error('Error grading terms negotiation', { error });
    return {
      score: 0,
      emdAmount: null,
      timelineDays: null,
      acceptedRefundable: false,
      coaching: ['Error analyzing terms negotiation.'],
    };
  }
}
