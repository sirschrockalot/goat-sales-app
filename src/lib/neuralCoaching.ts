/**
 * Neural Negotiation & Behavioral Coaching Layer
 * Dual-Agent System: Elite Closer + Diagnostic Mentor
 * Analyzes rep performance against "Gold Standard" of Eric Cline and Andy Elliott
 */

export interface DiscoveryQuality {
  score: number; // 0-100
  surfaceLevelQuestions: number; // Beds, baths, square footage
  strategicBusinessQuestions: number; // Foreclosure, tax debt, equity goals
  motivationTriggersDetected: string[]; // What pain points were identified
  motivationTriggersMissed: string[]; // What pain points were walked past
  elliottCorrections: string[]; // Elliott-style corrections for missed triggers
  feedback: string;
}

export type DISCType = 'driver' | 'amiable' | 'expressive' | 'analytical';

export interface DISCProfile {
  type: DISCType;
  confidence: number; // 0-100, how confident we are in this classification
  indicators: string[]; // What language patterns led to this classification
}

export interface EQMetrics {
  talkTimePercentage: number; // Rep's talk time as % of total call
  dominanceError: boolean; // True if talk-time > 60%
  activeListeningScore: number; // 0-100
  rapportScore: number; // 0-100 (penalized if dominanceError)
  tonalityScore: number; // 0-100
  sentimentAlignment: number; // 0-100, how well rep matched AI's emotional state
  feedback: string;
}

/**
 * Analyze Discovery Quality - Surface vs Strategic Business Conversations
 */
export function analyzeDiscoveryQuality(transcript: string): DiscoveryQuality {
  const lowerTranscript = transcript.toLowerCase();
  
  // Surface-level questions (beds, baths, square footage, basic property info)
  const surfaceLevelPatterns = [
    /\b(how many|how much|what's|what is)\s+(bedroom|bath|bathroom|square foot|sqft|sq ft|acre|lot size)\b/gi,
    /\b(bedroom|bath|bathroom|sqft|square foot)\b/gi,
    /\b(how old|when was|what year)\s+(roof|hvac|foundation|house|property)\b/gi,
    /\b(how many)\s+(bed|bath|room)\b/gi,
  ];
  
  // Strategic business questions (foreclosure, tax debt, equity goals, financial pressure)
  const strategicBusinessPatterns = [
    /\b(foreclosure|foreclose|bank|mortgage|payment|debt|owe|liability)\b/gi,
    /\b(tax|irs|lien|back taxes|property tax|tax debt)\b/gi,
    /\b(equity|equity goal|walk away|net|profit|after closing)\b/gi,
    /\b(divorce|probate|inheritance|estate|death|passed away)\b/gi,
    /\b(urgent|urgency|deadline|time constraint|need to|must|have to)\b/gi,
    /\b(why|motivation|reason|situation|circumstance|problem|issue|challenge)\b/gi,
    /\b(need the money|need cash|need funds|need capital)\b/gi,
    /\b(job loss|unemployed|laid off|fired|income|can't afford)\b/gi,
  ];
  
  // Motivation triggers (pain points that should be explored)
  const motivationTriggers = [
    { pattern: /\b(foreclosure|foreclose|bank|mortgage payment)\b/gi, name: 'Foreclosure Risk' },
    { pattern: /\b(tax|irs|lien|back taxes|property tax)\b/gi, name: 'Tax Debt/Lien' },
    { pattern: /\b(divorce|separating|split|marriage)\b/gi, name: 'Divorce/Separation' },
    { pattern: /\b(probate|inheritance|estate|death|passed away)\b/gi, name: 'Probate/Inheritance' },
    { pattern: /\b(job loss|unemployed|laid off|fired|can't afford|income)\b/gi, name: 'Job Loss/Income Issue' },
    { pattern: /\b(moving|relocating|relocation|new job|transfer)\b/gi, name: 'Relocation Urgency' },
    { pattern: /\b(repairs|maintenance|too much work|can't keep up)\b/gi, name: 'Property Maintenance Burden' },
    { pattern: /\b(equity|walk away|net|profit|after closing|need cash)\b/gi, name: 'Equity/Cash Need' },
  ];
  
  // Count surface-level questions
  let surfaceLevelCount = 0;
  surfaceLevelPatterns.forEach(pattern => {
    const matches = lowerTranscript.match(pattern);
    if (matches) surfaceLevelCount += matches.length;
  });
  
  // Count strategic business questions
  let strategicBusinessCount = 0;
  strategicBusinessPatterns.forEach(pattern => {
    const matches = lowerTranscript.match(pattern);
    if (matches) strategicBusinessCount += matches.length;
  });
  
  // Detect motivation triggers mentioned
  const detectedTriggers: string[] = [];
  const missedTriggers: string[] = [];
  const elliottCorrections: string[] = [];
  
  motivationTriggers.forEach(trigger => {
    const mentioned = trigger.pattern.test(lowerTranscript);
    if (mentioned) {
      detectedTriggers.push(trigger.name);
      
      // Check if rep dug into it (look for follow-up questions about this trigger)
      const followUpPatterns = [
        new RegExp(`\\b(when|how long|how much|why|what|tell me|explain|elaborate).*${trigger.pattern.source.replace(/[\\^$.*+?()[\]{}|]/g, '')}`, 'gi'),
        new RegExp(`${trigger.pattern.source.replace(/[\\^$.*+?()[\]{}|]/g, '')}.*\\b(when|how long|how much|why|what|tell me|explain)`, 'gi'),
      ];
      
      const dugInto = followUpPatterns.some(pattern => pattern.test(lowerTranscript));
      if (!dugInto) {
        missedTriggers.push(trigger.name);
        elliottCorrections.push(`You just walked right past their ${trigger.name.toLowerCase()} pain point. Why didn't you dig into that? You heard them mention it, but you didn't ask "When did that start?" or "How much do you owe?" or "What's the deadline?" You need to go DEEP, not just acknowledge it and move on.`);
      }
    }
  });
  
  // Calculate score: More strategic questions = higher score
  const totalQuestions = surfaceLevelCount + strategicBusinessCount;
  const strategicRatio = totalQuestions > 0 ? strategicBusinessCount / totalQuestions : 0;
  const score = Math.round(strategicRatio * 100);
  
  // Generate feedback
  let feedback = '';
  if (score >= 80) {
    feedback = 'Excellent discovery quality. You moved from surface-level to strategic business conversations effectively.';
  } else if (score >= 60) {
    feedback = 'Good discovery quality, but you could dig deeper into financial and emotional drivers.';
  } else if (score >= 40) {
    feedback = 'You asked some strategic questions, but you spent too much time on surface-level details (beds, baths, square footage).';
  } else {
    feedback = 'CRITICAL: You stayed at surface-level (beds, baths, square footage) and never moved to strategic business conversations (foreclosure, tax debt, equity goals). This is a major discovery failure.';
  }
  
  if (missedTriggers.length > 0) {
    feedback += ` You missed ${missedTriggers.length} motivation trigger(s) that you should have explored deeper.`;
  }
  
  return {
    score,
    surfaceLevelQuestions: surfaceLevelCount,
    strategicBusinessQuestions: strategicBusinessCount,
    motivationTriggersDetected: detectedTriggers,
    motivationTriggersMissed: missedTriggers,
    elliottCorrections,
    feedback,
  };
}

/**
 * DISC Personality Detection using NLP Pattern Matching
 */
export function detectDISCPersonality(transcript: string): DISCProfile {
  const lowerTranscript = transcript.toLowerCase();
  
  // Driver (High-D) indicators: Direct, decisive, results-oriented, assertive
  const driverPatterns = [
    /\b(let's|let us|we need|we must|we should|we will|we're going to)\b/gi,
    /\b(now|immediately|right away|asap|quickly|fast|hurry)\b/gi,
    /\b(decision|decide|choice|option|pick|choose)\b/gi,
    /\b(goal|target|objective|result|outcome|achieve|accomplish)\b/gi,
    /\b(I want|I need|I will|I'm going to|I'll)\b/gi,
    /\b(bottom line|cut to|get to the point|skip|move on)\b/gi,
  ];
  
  // Amiable indicators: Relationship-focused, cooperative, supportive, patient
  const amiablePatterns = [
    /\b(I understand|I hear you|I see|I get it|I feel|I appreciate)\b/gi,
    /\b(how are you|how do you feel|what do you think|your opinion|your thoughts)\b/gi,
    /\b(together|we can|let's work|help you|support you|for you)\b/gi,
    /\b(no rush|take your time|whenever|whenever you're ready|no pressure)\b/gi,
    /\b(relationship|connection|trust|rapport|comfortable|feel safe)\b/gi,
    /\b(thank you|thanks|appreciate|grateful|appreciate you)\b/gi,
  ];
  
  // Expressive indicators: Enthusiastic, animated, people-oriented, talkative
  const expressivePatterns = [
    /\b(excited|amazing|awesome|fantastic|incredible|wow|great|wonderful)\b/gi,
    /\b(I love|I'm excited|this is great|this is amazing|I'm thrilled)\b/gi,
    /\b(story|tell me|share|experience|fun|interesting|fascinating)\b/gi,
    /\b(energy|enthusiasm|passion|excitement|vibe|feeling)\b/gi,
  ];
  
  // Analytical indicators: Detail-oriented, systematic, cautious, data-driven
  const analyticalPatterns = [
    /\b(data|numbers|statistics|analysis|research|study|evidence|proof)\b/gi,
    /\b(how|why|what|when|where|explain|detail|specific|exactly)\b/gi,
    /\b(compare|compare to|versus|vs|difference|similar|same)\b/gi,
    /\b(verify|confirm|check|validate|prove|ensure|make sure)\b/gi,
    /\b(step by step|process|procedure|method|system|approach)\b/gi,
  ];
  
  // Count matches for each type
  const driverMatches = driverPatterns.reduce((sum, pattern) => {
    const matches = lowerTranscript.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
  
  const amiableMatches = amiablePatterns.reduce((sum, pattern) => {
    const matches = lowerTranscript.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
  
  const expressiveMatches = expressivePatterns.reduce((sum, pattern) => {
    const matches = lowerTranscript.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
  
  const analyticalMatches = analyticalPatterns.reduce((sum, pattern) => {
    const matches = lowerTranscript.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
  
  // Determine dominant type
  const scores = {
    driver: driverMatches,
    amiable: amiableMatches,
    expressive: expressiveMatches,
    analytical: analyticalMatches,
  };
  
  const maxScore = Math.max(driverMatches, amiableMatches, expressiveMatches, analyticalMatches);
  const totalMatches = driverMatches + amiableMatches + expressiveMatches + analyticalMatches;
  
  let type: DISCType = 'amiable'; // Default
  let confidence = 0;
  const indicators: string[] = [];
  
  if (maxScore === driverMatches && driverMatches > 0) {
    type = 'driver';
    confidence = totalMatches > 0 ? Math.round((driverMatches / totalMatches) * 100) : 0;
    indicators.push(`High use of directive language ("let's", "we need", "now")`);
    indicators.push(`Results-oriented phrases (${driverMatches} instances)`);
  } else if (maxScore === amiableMatches && amiableMatches > 0) {
    type = 'amiable';
    confidence = totalMatches > 0 ? Math.round((amiableMatches / totalMatches) * 100) : 0;
    indicators.push(`High use of relationship language ("I understand", "together", "for you")`);
    indicators.push(`Supportive phrases (${amiableMatches} instances)`);
  } else if (maxScore === expressiveMatches && expressiveMatches > 0) {
    type = 'expressive';
    confidence = totalMatches > 0 ? Math.round((expressiveMatches / totalMatches) * 100) : 0;
    indicators.push(`High use of enthusiastic language ("excited", "amazing", "I love")`);
    indicators.push(`Animated phrases (${expressiveMatches} instances)`);
  } else if (maxScore === analyticalMatches && analyticalMatches > 0) {
    type = 'analytical';
    confidence = totalMatches > 0 ? Math.round((analyticalMatches / totalMatches) * 100) : 0;
    indicators.push(`High use of detail-oriented language ("data", "numbers", "explain")`);
    indicators.push(`Systematic phrases (${analyticalMatches} instances)`);
  }
  
  return {
    type,
    confidence,
    indicators,
  };
}

/**
 * Mock MLS Database - Generate counter-comps for financial challenges
 */
export interface MLSComp {
  address: string;
  salePrice: number;
  saleDate: string;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  distance: number; // Miles from subject property
  pricePerSqft: number;
}

export function getMockMLSComps(propertyLocation?: string, subjectPrice: number = 82700): MLSComp[] {
  // Generate realistic comps within 0.5 miles, 20% higher than subject
  const baseComps: MLSComp[] = [
    {
      address: propertyLocation 
        ? `123 Main St, ${propertyLocation.split(',')[0]}`
        : '123 Main St',
      salePrice: Math.round(subjectPrice * 1.20), // 20% higher
      saleDate: '2024-01-15',
      squareFeet: 1200,
      bedrooms: 3,
      bathrooms: 2,
      distance: 0.3,
      pricePerSqft: Math.round((subjectPrice * 1.20) / 1200),
    },
    {
      address: propertyLocation 
        ? `456 Oak Ave, ${propertyLocation.split(',')[0]}`
        : '456 Oak Ave',
      salePrice: Math.round(subjectPrice * 1.18), // 18% higher
      saleDate: '2024-02-20',
      squareFeet: 1350,
      bedrooms: 3,
      bathrooms: 2,
      distance: 0.4,
      pricePerSqft: Math.round((subjectPrice * 1.18) / 1350),
    },
    {
      address: propertyLocation 
        ? `789 Pine Rd, ${propertyLocation.split(',')[0]}`
        : '789 Pine Rd',
      salePrice: Math.round(subjectPrice * 1.22), // 22% higher
      saleDate: '2024-03-10',
      squareFeet: 1100,
      bedrooms: 2,
      bathrooms: 1.5,
      distance: 0.2,
      pricePerSqft: Math.round((subjectPrice * 1.22) / 1100),
    },
  ];
  
  return baseComps;
}

/**
 * Get counter-comp challenge text for AI to use
 */
export function getCounterCompChallenge(propertyLocation?: string, subjectPrice: number = 82700): string {
  const comps = getMockMLSComps(propertyLocation, subjectPrice);
  const bestComp = comps[0]; // Use the closest/highest comp
  
  return `"Wait, I just checked the MLS. There's a house at ${bestComp.address} that sold for ${bestComp.salePrice.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} just ${bestComp.distance} miles from here. It's ${bestComp.squareFeet} square feet, ${bestComp.bedrooms} bedrooms, ${bestComp.bathrooms} bathrooms - very similar to my house. That sold for ${bestComp.pricePerSqft.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} per square foot. You're offering me ${subjectPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}. That's ${Math.round(((bestComp.salePrice - subjectPrice) / subjectPrice) * 100)}% lower than what similar houses are selling for. How do you justify that? Show me your comps. I want to see your actual data, not just your estimate."`;
}

/**
 * Analyze Emotional Intelligence (EQ) Metrics
 */
export function analyzeEQMetrics(
  transcript: string,
  repTalkTime: number, // Seconds
  totalCallDuration: number, // Seconds
  sentimentAnalysis?: any // From analyzeSentiment if available
): EQMetrics {
  const talkTimePercentage = totalCallDuration > 0 
    ? (repTalkTime / totalCallDuration) * 100 
    : 0;
  
  const dominanceError = talkTimePercentage > 60;
  
  // Analyze active listening indicators
  const lowerTranscript = transcript.toLowerCase();
  const activeListeningIndicators = [
    /\b(mhm|uh-huh|yeah|yes|I see|I understand|I hear you|got it|okay|alright)\b/gi,
    /\b(that makes sense|I can see that|I get that|I understand|tell me more|go on)\b/gi,
    /\b(what do you mean|can you explain|help me understand|I'm curious|tell me about)\b/gi,
  ];
  
  const activeListeningCount = activeListeningIndicators.reduce((sum, pattern) => {
    const matches = lowerTranscript.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
  
  // Calculate active listening score (more indicators = higher score, but penalize if dominance error)
  let activeListeningScore = Math.min(100, activeListeningCount * 10);
  if (dominanceError) {
    activeListeningScore = Math.max(0, activeListeningScore - 30); // Heavy penalty for dominance
  }
  
  // Calculate rapport score (penalized if dominance error)
  let rapportScore = 70; // Base score
  if (dominanceError) {
    rapportScore = Math.max(0, rapportScore - 40); // Heavy penalty
  } else if (talkTimePercentage >= 40 && talkTimePercentage <= 60) {
    rapportScore = 85; // Good balance
  } else if (talkTimePercentage < 40) {
    rapportScore = 90; // Excellent (rep listened more)
  }
  
  // Tonality score (placeholder - would need actual audio analysis)
  const tonalityScore = 75; // Default, would be calculated from audio metrics
  
  // Sentiment alignment (placeholder - would need sentiment analysis)
  const sentimentAlignment = 70; // Default
  
  // Generate feedback
  let feedback = '';
  if (dominanceError) {
    feedback = `CRITICAL DOMINANCE ERROR: You talked ${talkTimePercentage.toFixed(0)}% of the call. The seller should be talking 60%+ of the time. You're dominating the conversation, which destroys rapport. You need to LISTEN more and TALK less. Ask questions and let them answer.`;
  } else if (talkTimePercentage >= 50 && talkTimePercentage <= 60) {
    feedback = `Good balance, but you could listen more. You talked ${talkTimePercentage.toFixed(0)}% of the call. Aim for 40-50% talk time.`;
  } else if (talkTimePercentage < 50) {
    feedback = `Excellent listening. You talked ${talkTimePercentage.toFixed(0)}% of the call, allowing the seller to share their story. This builds rapport.`;
  }
  
  if (activeListeningCount < 5) {
    feedback += ` You used minimal active listening indicators (${activeListeningCount}). Use more "mhm", "I see", "tell me more" to show you're engaged.`;
  }
  
  return {
    talkTimePercentage,
    dominanceError,
    activeListeningScore,
    rapportScore,
    tonalityScore,
    sentimentAlignment,
    feedback,
  };
}
