/**
 * Psychological Memory Buffer
 * 
 * Stores the 3 most "Emotional Keywords" mentioned by the rep
 * (e.g., "moving," "foreclosure," "inheritance")
 * 
 * The AI must use at least one of these keywords during the Presentation Phase
 * (Cline Step 4) to build deep-level rapport.
 */

export interface EmotionalKeyword {
  keyword: string;
  context: string; // The sentence or phrase where it appeared
  timestamp: number; // When it was mentioned (seconds into call)
  emotionalWeight: number; // 0-1, how emotionally charged the keyword is
}

export class ContextBuffer {
  private keywords: EmotionalKeyword[] = [];
  private maxKeywords = 3;

  /**
   * Extract emotional keywords from transcript
   */
  extractEmotionalKeywords(transcript: string, currentTimeSeconds: number): EmotionalKeyword[] {
    const emotionalPatterns = [
      // Moving/Relocation
      { pattern: /\b(moving|relocating|relocation|move|moving to|moving because)\b/gi, weight: 0.8 },
      // Financial Stress
      { pattern: /\b(foreclosure|bankruptcy|behind on|can't afford|struggling|financial|debt)\b/gi, weight: 0.9 },
      // Inheritance/Probate
      { pattern: /\b(inheritance|inherited|probate|passed away|deceased|death|died)\b/gi, weight: 0.9 },
      // Divorce/Separation
      { pattern: /\b(divorce|divorced|separating|separation|split|breakup)\b/gi, weight: 0.85 },
      // Job Loss
      { pattern: /\b(lost my job|laid off|fired|unemployed|job loss|lost job)\b/gi, weight: 0.9 },
      // Health Issues
      { pattern: /\b(sick|illness|health|medical|hospital|cancer|treatment)\b/gi, weight: 0.85 },
      // Family Changes
      { pattern: /\b(kids|children|family|elderly|parent|caregiver)\b/gi, weight: 0.7 },
      // Time Pressure
      { pattern: /\b(urgent|quickly|soon|deadline|time|need to|must)\b/gi, weight: 0.75 },
      // Property Issues
      { pattern: /\b(repairs|broken|damage|leak|mold|foundation|roof)\b/gi, weight: 0.6 },
      // Emotional States
      { pattern: /\b(stressed|overwhelmed|tired|exhausted|frustrated|worried|anxious)\b/gi, weight: 0.8 },
    ];

    const foundKeywords: EmotionalKeyword[] = [];
    const seenKeywords = new Set<string>();

    for (const { pattern, weight } of emotionalPatterns) {
      const matches = transcript.match(pattern);
      if (matches) {
        for (const match of matches) {
          const keyword = match.toLowerCase().trim();
          if (!seenKeywords.has(keyword) && keyword.length > 2) {
            seenKeywords.add(keyword);
            
            // Find context (sentence where keyword appears)
            const sentences = transcript.split(/[.!?]+/);
            const contextSentence = sentences.find(s => 
              s.toLowerCase().includes(keyword)
            ) || match;

            foundKeywords.push({
              keyword,
              context: contextSentence.trim(),
              timestamp: currentTimeSeconds,
              emotionalWeight: weight,
            });
          }
        }
      }
    }

    // Sort by emotional weight (highest first)
    foundKeywords.sort((a, b) => b.emotionalWeight - a.emotionalWeight);

    return foundKeywords;
  }

  /**
   * Add keywords to buffer (keeps top 3 by emotional weight)
   */
  addKeywords(newKeywords: EmotionalKeyword[]): void {
    // Combine existing and new keywords
    const allKeywords = [...this.keywords, ...newKeywords];
    
    // Remove duplicates (same keyword)
    const uniqueKeywords = new Map<string, EmotionalKeyword>();
    for (const kw of allKeywords) {
      const existing = uniqueKeywords.get(kw.keyword);
      if (!existing || kw.emotionalWeight > existing.emotionalWeight) {
        uniqueKeywords.set(kw.keyword, kw);
      }
    }

    // Sort by emotional weight and keep top 3
    this.keywords = Array.from(uniqueKeywords.values())
      .sort((a, b) => b.emotionalWeight - a.emotionalWeight)
      .slice(0, this.maxKeywords);
  }

  /**
   * Get current emotional keywords
   */
  getKeywords(): EmotionalKeyword[] {
    return [...this.keywords];
  }

  /**
   * Get keywords formatted for system prompt injection
   */
  getKeywordsForPrompt(): string {
    if (this.keywords.length === 0) {
      return 'No emotional keywords captured yet.';
    }

    return this.keywords
      .map((kw, index) => 
        `${index + 1}. "${kw.keyword}" (mentioned: "${kw.context.substring(0, 50)}...", emotional weight: ${(kw.emotionalWeight * 100).toFixed(0)}%)`
      )
      .join('\n');
  }

  /**
   * Get instruction for Presentation Phase (Cline Step 4)
   */
  getPresentationPhaseInstruction(): string {
    if (this.keywords.length === 0) {
      return '';
    }

    const keywordList = this.keywords.map(kw => `"${kw.keyword}"`).join(', ');
    
    return `PSYCHOLOGICAL MEMORY BUFFER - EMOTIONAL KEYWORD RECALL:
- You have captured these emotional keywords from earlier in the call:
${this.getKeywordsForPrompt()}

- CRITICAL: During the Presentation Phase (Gate 4 - The Offer), you MUST reference at least ONE of these keywords naturally in your conversation
- Examples:
  * If "moving" was mentioned: "Since you mentioned you're moving to Florida, this offer gives you the flexibility to..."
  * If "foreclosure" was mentioned: "I know you mentioned the foreclosure situation, and this offer can help you avoid..."
  * If "inheritance" was mentioned: "Since this is an inherited property, this cash offer simplifies the process by..."
- The goal is to show you've been listening and remember their emotional context
- Weave the keyword naturally into your presentation - don't force it
- This builds deep-level rapport and demonstrates active listening`;
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.keywords = [];
  }
}

// Singleton instance for call context
let globalContextBuffer: ContextBuffer | null = null;

export function getContextBuffer(): ContextBuffer {
  if (!globalContextBuffer) {
    globalContextBuffer = new ContextBuffer();
  }
  return globalContextBuffer;
}

export function resetContextBuffer(): void {
  globalContextBuffer = new ContextBuffer();
}
