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
  logicGates: {
    intro: 'pass' | 'fail';
    why: 'found' | 'missed';
    propertyCondition: 'pass' | 'fail';
    tone: number; // 0-10
    clinch: 'pass' | 'fail';
  };
}

const JUDGE_PROMPT = `Act as a Sales Manager specializing in the Eric Cline Sales Goat method. Analyze the transcript for these 5 gates:

1. **The Intro (Pass/Fail):** Did they say 'Approval or Denial'? 
2. **The Why (Found/Missed):** Did they identify the seller's deep motivation?
3. **Property Condition:** Did they ask about the 'Front Door' and 'Major Three' (Roof, HVAC, Foundation)?
4. **Tone (0-10):** Did the rep sound 'Certain' and 'High Energy'?
5. **The Clinch:** Did they close by using the seller's motivation against their objection?

**Output Format:** Return a JSON object with:
- goatScore: [0-100]
- feedback: [2-3 sentences of blunt coaching]
- rebuttalOfTheDay: [One line the rep said that was excellent, or "None" if nothing stood out]
- logicGates: {
  "intro": "pass" or "fail",
  "why": "found" or "missed",
  "propertyCondition": "pass" or "fail",
  "tone": [0-10],
  "clinch": "pass" or "fail"
}

Be strict. Only give high scores if all gates are passed.`;

export async function gradeCall(transcript: string): Promise<GradingResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: JUDGE_PROMPT,
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
    return {
      goatScore: Math.max(0, Math.min(100, parsed.goatScore || 0)),
      feedback: parsed.feedback || 'No feedback provided.',
      rebuttalOfTheDay: parsed.rebuttalOfTheDay || 'None',
      logicGates: {
        intro: parsed.logicGates?.intro === 'pass' ? 'pass' : 'fail',
        why: parsed.logicGates?.why === 'found' ? 'found' : 'missed',
        propertyCondition: parsed.logicGates?.propertyCondition === 'pass' ? 'pass' : 'fail',
        tone: Math.max(0, Math.min(10, parsed.logicGates?.tone || 0)),
        clinch: parsed.logicGates?.clinch === 'pass' ? 'pass' : 'fail',
      },
    };
  } catch (error) {
    console.error('Error grading call:', error);
    // Return default grading on error
    return {
      goatScore: 0,
      feedback: 'Error analyzing call. Please try again.',
      rebuttalOfTheDay: 'None',
      logicGates: {
        intro: 'fail',
        why: 'missed',
        propertyCondition: 'fail',
        tone: 0,
        clinch: 'fail',
      },
    };
  }
}
