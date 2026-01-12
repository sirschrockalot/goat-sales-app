/**
 * Sentiment Processing Engine
 * Analyzes call transcripts to extract emotional metrics and detect AI weaknesses
 * Used for continuous learning and prompt optimization
 */

import OpenAI from 'openai';
import logger from './logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SentimentAnalysis {
  emotionalPeak: {
    timestamp: string; // Approximate time in call
    context: string; // What was happening
    engagementLevel: number; // 0-10
  };
  toneShift: {
    timestamp: string;
    context: string;
    shiftType: 'defensive' | 'disengaged' | 'frustrated' | 'none';
    severity: number; // 0-10
  };
  logicBreaks: Array<{
    timestamp: string;
    issue: 'too_robotic' | 'too_fast' | 'too_slow' | 'interrupted_frequently' | 'missed_empathy';
    context: string;
    userReaction: string;
  }>;
  humanityScore: number; // 0-100 - overall human-like behavior
  interruptionFrequency: number; // Interruptions per minute
  averageResponseTime: number; // Estimated average response time in ms
  suggestedImprovements: Array<{
    weakness: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

const SENTIMENT_ANALYSIS_PROMPT = `You are an AI Training Analyst specializing in evaluating AI-human conversation quality. Analyze the following call transcript and extract key metrics.

Your task:
1. Identify the "Emotional Peak" - the moment where the user was most engaged (highest emotional energy, most responsive)
2. Detect "Tone Shift" - where the user became defensive, disengaged, or frustrated
3. Flag "Logic Breaks" - moments where the AI sounded:
   - Too robotic (overly scripted, no natural pauses, no empathy)
   - Too fast (rushed responses, didn't let user finish)
   - Too slow (awkwardly long pauses)
   - Interrupted frequently (user kept cutting off the AI)
   - Missed empathy (failed to acknowledge emotional cues)
4. Calculate "Humanity Score" (0-100) - overall assessment of how human-like the AI sounded
5. Count interruption frequency (interruptions per minute)
6. Estimate average response time (in milliseconds)
7. Suggest specific improvements for the AI's system prompt

Output Format (JSON):
{
  "emotionalPeak": {
    "timestamp": "2:30",
    "context": "User shared personal story about moving",
    "engagementLevel": 9
  },
  "toneShift": {
    "timestamp": "5:15",
    "context": "AI moved too quickly to financial questions",
    "shiftType": "defensive",
    "severity": 7
  },
  "logicBreaks": [
    {
      "timestamp": "3:45",
      "issue": "too_fast",
      "context": "AI rushed through property condition questions",
      "userReaction": "User interrupted with 'wait, slow down'"
    }
  ],
  "humanityScore": 75,
  "interruptionFrequency": 2.5,
  "averageResponseTime": 800,
  "suggestedImprovements": [
    {
      "weakness": "AI was too fast at Gate 3",
      "suggestion": "Increase replyDelay to 1200ms for property condition questions",
      "priority": "high"
    }
  ]
}`;

export async function analyzeSentiment(transcript: string): Promise<SentimentAnalysis> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: SENTIMENT_ANALYSIS_PROMPT,
        },
        {
          role: 'user',
          content: `Analyze this call transcript:\n\n${transcript}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response) as SentimentAnalysis;

    // Validate and normalize the result
    return {
      emotionalPeak: {
        timestamp: parsed.emotionalPeak?.timestamp || '0:00',
        context: parsed.emotionalPeak?.context || 'No peak detected',
        engagementLevel: Math.max(0, Math.min(10, parsed.emotionalPeak?.engagementLevel || 0)),
      },
      toneShift: {
        timestamp: parsed.toneShift?.timestamp || '0:00',
        context: parsed.toneShift?.context || 'No shift detected',
        shiftType: parsed.toneShift?.shiftType || 'none',
        severity: Math.max(0, Math.min(10, parsed.toneShift?.severity || 0)),
      },
      logicBreaks: parsed.logicBreaks || [],
      humanityScore: Math.max(0, Math.min(100, parsed.humanityScore || 0)),
      interruptionFrequency: Math.max(0, parsed.interruptionFrequency || 0),
      averageResponseTime: Math.max(0, parsed.averageResponseTime || 700),
      suggestedImprovements: parsed.suggestedImprovements || [],
    };
  } catch (error) {
    logger.error('Error analyzing sentiment', { error });
    // Return default analysis on error
    return {
      emotionalPeak: {
        timestamp: '0:00',
        context: 'Analysis failed',
        engagementLevel: 0,
      },
      toneShift: {
        timestamp: '0:00',
        context: 'Analysis failed',
        shiftType: 'none',
        severity: 0,
      },
      logicBreaks: [],
      humanityScore: 0,
      interruptionFrequency: 0,
      averageResponseTime: 700,
      suggestedImprovements: [],
    };
  }
}
