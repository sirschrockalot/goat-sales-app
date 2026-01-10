/**
 * Dispo Grading Logic
 * Uses OpenAI to grade Dispo calls based on DISPO_SCRIPT_MAPPING.md criteria
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
}

const DISPO_JUDGE_PROMPT = `Act as a Sales Manager specializing in Dispositions (selling to investors). Analyze the transcript for these 5 gates:

1. **The Hook (Pass/Fail):** Did they lead with "The Numbers" - ARV, Buy-in, Spread, ROI? Did they say "bread-and-butter" or similar profit-focused language?
2. **The Narrative (Pass/Fail):** Did they provide comp analysis? Did they say "worst house on best street" and justify the ARV with recent sales?
3. **The Scarcity Anchor (Pass/Fail):** Did they create urgency? Did they mention "top 5 buyers", "walkthroughs", "lock it up", or "moving fast"?
4. **The Terms (Pass/Fail):** Did they clearly state the terms - "$5k non-refundable EMD", "7-day close", "Title Company"? Did they verify the buyer's capital works with the timeline?
5. **The Clinch (Pass/Fail):** Did they get commitment to sign the assignment immediately? Did they direct the buyer to stay on the phone until signature is confirmed?
6. **Tonality (0-10):** Did the rep sound professional, urgent, and authoritative? Did they maintain high energy?

**Output Format:** Return a JSON object with:
- goatScore: [0-100]
- feedback: [2-3 sentences of blunt coaching specific to Dispo sales]
- rebuttalOfTheDay: [One line the rep said that was excellent for Dispo sales, or "None" if nothing stood out]
- logicGates: {
  "hook": "pass" or "fail",
  "narrative": "pass" or "fail",
  "scarcity": "pass" or "fail",
  "terms": "pass" or "fail",
  "clinch": "pass" or "fail",
  "tonality": [0-10]
}

Be strict. Only give high scores if all gates are passed. Dispo sales require leading with numbers, creating urgency, and holding firm on terms.`;

export async function gradeDispoCall(transcript: string): Promise<DispoGradingResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: DISPO_JUDGE_PROMPT,
        },
        {
          role: 'user',
          content: `Analyze this Dispo sales call transcript:\n\n${transcript}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response) as DispoGradingResult;

    // Validate and normalize the result
    return {
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
  } catch (error) {
    console.error('Error grading Dispo call:', error);
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
