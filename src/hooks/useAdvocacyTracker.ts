'use client';

/**
 * Advocacy Tracker Hook
 * Tracks team-based vs. adversarial language and advocacy moves
 */

import { useEffect, useState, useMemo } from 'react';

interface AdvocacyMetrics {
  teamPhrases: number;
  adversarialPhrases: number;
  teamLanguageRatio: number; // Percentage
  isAdvocateMode: boolean; // True when rep mentions underwriters/office
  goToBatMoves: number; // Count of "hold" or "check with office" mentions
}

const TEAM_PHRASES = [
  /\b(we|us|together|let's|let us|for you|on your side|with you|your team)\b/gi,
  /\b(going to bat|fighting for|advocating for|working for)\b/gi,
  /\b(squeeze.*out|get.*approved|see what.*can do)\b/gi,
];

const ADVERSARIAL_PHRASES = [
  /\b(I want|I need|I'm offering|my price|my offer|I'll pay)\b/gi,
  /\b(this is all|this is what|take it or leave)\b/gi,
];

const ADVOCACY_TRIGGERS = [
  /\b(underwriters?|underwriting|the office|the money guys|the budget|the department)\b/gi,
  /\b(go to bat|check with|talk to.*office|see what.*can do|squeeze.*more)\b/gi,
];

const GO_TO_BAT_PHRASES = [
  /\b(hold on|can you hold|let me check|checking with|talk to.*office|see what.*can do)\b/gi,
  /\b(put.*on hold|one moment|give me.*second)\b/gi,
];

export function useAdvocacyTracker(transcript: string, isActive: boolean): AdvocacyMetrics {
  const [metrics, setMetrics] = useState<AdvocacyMetrics>({
    teamPhrases: 0,
    adversarialPhrases: 0,
    teamLanguageRatio: 0,
    isAdvocateMode: false,
    goToBatMoves: 0,
  });

  useEffect(() => {
    if (!isActive || !transcript) return;

    // Count team phrases
    let teamCount = 0;
    TEAM_PHRASES.forEach(pattern => {
      const matches = transcript.match(pattern);
      if (matches) teamCount += matches.length;
    });

    // Count adversarial phrases
    let adversarialCount = 0;
    ADVERSARIAL_PHRASES.forEach(pattern => {
      const matches = transcript.match(pattern);
      if (matches) adversarialCount += matches.length;
    });

    // Check for advocacy triggers (underwriters, office, etc.)
    let isAdvocateMode = false;
    ADVOCACY_TRIGGERS.forEach(pattern => {
      if (pattern.test(transcript)) {
        isAdvocateMode = true;
      }
    });

    // Count go-to-bat moves (hold, check with office)
    let goToBatCount = 0;
    GO_TO_BAT_PHRASES.forEach(pattern => {
      const matches = transcript.match(pattern);
      if (matches) goToBatCount += matches.length;
    });

    // Calculate ratio
    const totalPhrases = teamCount + adversarialCount;
    const teamLanguageRatio = totalPhrases > 0 
      ? (teamCount / totalPhrases) * 100 
      : 0;

    setMetrics({
      teamPhrases: teamCount,
      adversarialPhrases: adversarialCount,
      teamLanguageRatio: Math.round(teamLanguageRatio),
      isAdvocateMode,
      goToBatMoves: goToBatCount,
    });
  }, [transcript, isActive]);

  return metrics;
}
