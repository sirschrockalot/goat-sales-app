/**
 * Objection Bank
 * Common rebuttals to the PA Summary, organized by Gauntlet Level
 * Used for "Objection Hardening" training
 */

import type { GauntletLevel } from './gauntletLevels';

export interface Objection {
  text: string;
  context: string; // When to use this objection
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
}

/**
 * Get objections for a specific gauntlet level
 * Level 1 (Easy): Simple objections
 * Level 5 (Elite): Complex, attorney-level objections
 */
export function getObjectionsByLevel(level: GauntletLevel): Objection[] {
  const allObjections: Record<GauntletLevel, Objection[]> = {
    1: [
      {
        text: "I need to think about it.",
        context: "After hearing the offer or during contract walk-through",
        difficulty: 'easy',
      },
      {
        text: "Can you send me something in writing first?",
        context: "When rep tries to move forward without written materials",
        difficulty: 'easy',
      },
      {
        text: "I want to talk to my spouse about this.",
        context: "After receiving the offer or during negotiation",
        difficulty: 'easy',
      },
      {
        text: "This seems like it's moving too fast for me.",
        context: "When rep pushes for quick decision",
        difficulty: 'easy',
      },
    ],
    2: [
      {
        text: "I've had bad experiences with investors before. How do I know you're legitimate?",
        context: "Early in the call, testing rep's credibility",
        difficulty: 'medium',
      },
      {
        text: "I want to see comparable sales first before I agree to anything.",
        context: "When rep presents offer without showing comps",
        difficulty: 'medium',
      },
      {
        text: "The earnest money seems too low. Shouldn't it be more?",
        context: "During contract walk-through, Clause 1 (Purchase Price)",
        difficulty: 'medium',
      },
      {
        text: "I'm not comfortable with the 'as-is' condition. What if there are hidden problems?",
        context: "During contract walk-through, Clause 2 (As-Is Condition)",
        difficulty: 'medium',
      },
    ],
    3: [
      {
        text: "I have another buyer offering me more money. Why should I go with you?",
        context: "During negotiation or after receiving offer",
        difficulty: 'hard',
      },
      {
        text: "The closing date is too soon. I need at least 30 days to move out.",
        context: "During contract walk-through, testing rep's flexibility",
        difficulty: 'hard',
      },
      {
        text: "I don't understand why you're covering closing costs. What's the catch?",
        context: "During contract walk-through, Clause 3 (Closing Costs)",
        difficulty: 'hard',
      },
      {
        text: "My realtor said I should list it on the market instead. Why shouldn't I?",
        context: "Testing rep's ability to differentiate from traditional sale",
        difficulty: 'hard',
      },
    ],
    4: [
      {
        text: "I'm concerned about Clause 10 (Title Delays). What if there's a lien I don't know about?",
        context: "During contract walk-through, testing rep's knowledge of title issues",
        difficulty: 'hard',
      },
      {
        text: "The price seems low compared to what Zillow says my house is worth.",
        context: "After receiving offer, testing rep's ability to explain valuation",
        difficulty: 'hard',
      },
      {
        text: "I want to keep some of the appliances. Can we modify the contract?",
        context: "During Clause 12c (Personal Property) walk-through",
        difficulty: 'hard',
      },
      {
        text: "What happens if I change my mind after signing? Is there a way out?",
        context: "Testing rep's understanding of contract commitment",
        difficulty: 'hard',
      },
    ],
    5: [
      {
        text: "I have a higher offer from a competitor. They're offering $95,000. Can you match that?",
        context: "During negotiation, testing rep's ability to handle competitive pressure",
        difficulty: 'elite',
      },
      {
        text: "My attorney says Clause 17 (Memorandum of Contract) is a dealbreaker. He says it clouds the title and I shouldn't sign anything that gets recorded with the county.",
        context: "During Clause 17 walk-through, testing rep's ability to explain legal protection",
        difficulty: 'elite',
      },
      {
        text: "I've been reading about wholesaling online, and I think you're trying to assign this contract to someone else. I want to deal directly with the end buyer.",
        context: "Testing rep's transparency and ability to explain the business model",
        difficulty: 'elite',
      },
      {
        text: "My CPA says this deal structure could have tax implications. I need to see the full contract reviewed by my attorney before I sign anything.",
        context: "Testing rep's ability to handle professional advisor objections",
        difficulty: 'elite',
      },
      {
        text: "I've had three other investors call me this week. What makes you different? And why should I trust you over them?",
        context: "Early in call, testing rep's ability to differentiate and build trust",
        difficulty: 'elite',
      },
    ],
  };

  return allObjections[level] || [];
}

/**
 * Get a random objection for a specific gauntlet level
 */
export function getRandomObjection(level: GauntletLevel): Objection | null {
  const objections = getObjectionsByLevel(level);
  if (objections.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * objections.length);
  return objections[randomIndex];
}

/**
 * Get objections that should be triggered during contract walk-through
 */
export function getContractWalkthroughObjections(level: GauntletLevel): Objection[] {
  const allObjections = getObjectionsByLevel(level);
  
  // Filter objections that are relevant during contract walk-through
  return allObjections.filter(obj => 
    obj.context.toLowerCase().includes('contract') ||
    obj.context.toLowerCase().includes('clause') ||
    obj.text.toLowerCase().includes('clause') ||
    obj.text.toLowerCase().includes('attorney') ||
    obj.text.toLowerCase().includes('legal')
  );
}
