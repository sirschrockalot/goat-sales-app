/**
 * Persona System for Sales Training
 * Defines different AI personas based on Eric Cline's Sales Goat Framework
 */

import type { PersonaMode } from './vapi-client';

export interface PersonaConfig {
  mode: PersonaMode;
  name: string;
  description: string;
  systemPrompt: string;
  characteristics: string[];
  dialogueGates: DialogueGate[];
}

export interface DialogueGate {
  step: number;
  name: string;
  description: string;
  requiredPhrases: string[];
  validationLogic: (transcript: string) => boolean;
}

/**
 * Acquisition Mode: Skeptical Seller
 * The AI acts as a skeptical homeowner who needs convincing
 */
export const ACQUISITION_PERSONA: PersonaConfig = {
  mode: 'acquisition',
  name: 'Skeptical Seller',
  description: 'A skeptical homeowner who is hesitant to sell and needs to be convinced',
  systemPrompt: `You are a skeptical homeowner who has been contacted by a real estate investor. 
You are initially resistant and need to be convinced. You have concerns about:
- Getting a fair price
- The process being too complicated
- Being taken advantage of
- Not being ready to sell

Follow the Eric Cline Sales Goat Framework dialogue gates:
1. Introduction: You should be somewhat guarded but not completely dismissive
2. Fact-Finding: You have a real problem (tax issues, probate, moving, etc.) but won't reveal it easily
3. The House: You know there are repairs needed (roof, HVAC, foundation) but will test if the rep asks properly
4. Negotiation: You will negotiate in small increments, not large drops
5. The Clinch: You will use objections that test if the rep uses information from Step 2`,
  characteristics: [
    'Skeptical of unsolicited offers',
    'Has a real problem but hesitant to share',
    'Tests the rep\'s knowledge and approach',
    'Negotiates in small increments',
    'Uses objections to test the rep',
  ],
  dialogueGates: [
    {
      step: 1,
      name: 'The Introduction',
      description: 'Rep must identify themselves, assume the sale, and set expectations',
      requiredPhrases: [
        'hey',
        'this is',
        'looking to sell',
        'approval',
        'denial',
      ],
      validationLogic: (transcript: string) => {
        const lower = transcript.toLowerCase();
        return (
          (lower.includes('hey') || lower.includes('hi') || lower.includes('hello')) &&
          lower.includes('this is') &&
          (lower.includes('looking to sell') || lower.includes('want to sell')) &&
          (lower.includes('approval') || lower.includes('denial'))
        );
      },
    },
    {
      step: 2,
      name: 'Fact-Finding (The Why)',
      description: 'Rep must uncover the real problem before discussing price',
      requiredPhrases: ['why', 'problem', 'reason', 'tax', 'probate', 'moving'],
      validationLogic: (transcript: string) => {
        const lower = transcript.toLowerCase();
        // AI should resist giving price until problem is uncovered
        const hasPriceDiscussion = lower.includes('price') || lower.includes('offer') || lower.includes('$');
        const hasProblemRevealed = 
          lower.includes('tax') || 
          lower.includes('probate') || 
          lower.includes('moving') || 
          lower.includes('divorce') ||
          lower.includes('inheritance');
        
        // Gate passed if problem revealed OR if rep is asking about why
        return hasProblemRevealed || (lower.includes('why') && !hasPriceDiscussion);
      },
    },
    {
      step: 3,
      name: 'The House (The What)',
      description: 'Rep must ask "What will I see when I walk through the front door?"',
      requiredPhrases: ['walk through', 'front door', 'see', 'repairs', 'roof', 'hvac', 'foundation'],
      validationLogic: (transcript: string) => {
        const lower = transcript.toLowerCase();
        return (
          (lower.includes('walk through') || lower.includes('front door')) &&
          (lower.includes('see') || lower.includes('what'))
        );
      },
    },
    {
      step: 4,
      name: 'Negotiation (The Inches)',
      description: 'AI should negotiate in small increments, not large drops',
      requiredPhrases: ['negotiate', 'offer', 'counter', 'price'],
      validationLogic: (transcript: string) => {
        const lower = transcript.toLowerCase();
        // Check if negotiation is happening in small increments
        // This is more complex and would need real-time analysis
        return lower.includes('negotiate') || lower.includes('counter') || lower.includes('offer');
      },
    },
    {
      step: 5,
      name: 'The Clinch (The Close)',
      description: 'Rep must use information from Step 2 to overcome objections',
      requiredPhrases: ['objection', 'concern', 'worry', 'but'],
      validationLogic: (transcript: string) => {
        const lower = transcript.toLowerCase();
        // Check if rep references earlier problem (tax, probate, etc.)
        const referencesProblem = 
          lower.includes('tax') || 
          lower.includes('probate') || 
          lower.includes('moving') ||
          lower.includes('reason');
        const hasObjection = lower.includes('but') || lower.includes('however') || lower.includes('concern');
        
        return referencesProblem && hasObjection;
      },
    },
  ],
};

/**
 * Disposition Mode: Savvy Investor
 * The AI acts as a knowledgeable investor evaluating a deal
 */
export const DISPOSITION_PERSONA: PersonaConfig = {
  mode: 'disposition',
  name: 'Savvy Investor',
  description: 'A knowledgeable investor who evaluates deals critically and negotiates professionally',
  systemPrompt: `You are a savvy real estate investor who is evaluating a property deal. 
You are professional, knowledgeable, and focused on ROI. You will:
- Ask detailed questions about the property
- Calculate repair costs and margins
- Negotiate based on market data
- Test the rep's knowledge of the market and property

Follow professional investor dialogue patterns:
1. Introduction: Professional greeting, establish credibility
2. Property Analysis: Ask about condition, repairs, comps
3. Financial Analysis: Discuss ARV, repair costs, margins
4. Negotiation: Professional counter-offers based on data
5. Decision: Make decision based on numbers, not emotion`,
  characteristics: [
    'Professional and data-driven',
    'Asks detailed property questions',
    'Calculates margins and ROI',
    'Negotiates based on market data',
    'Tests rep\'s market knowledge',
  ],
  dialogueGates: [
    {
      step: 1,
      name: 'Professional Introduction',
      description: 'Rep must establish credibility and professionalism',
      requiredPhrases: ['hello', 'investor', 'property', 'deal'],
      validationLogic: (transcript: string) => {
        const lower = transcript.toLowerCase();
        return (
          (lower.includes('hello') || lower.includes('hi')) &&
          (lower.includes('property') || lower.includes('deal') || lower.includes('investment'))
        );
      },
    },
    {
      step: 2,
      name: 'Property Analysis',
      description: 'Rep must provide property details and condition',
      requiredPhrases: ['condition', 'repairs', 'arv', 'comps'],
      validationLogic: (transcript: string) => {
        const lower = transcript.toLowerCase();
        return (
          lower.includes('condition') || 
          lower.includes('repairs') || 
          lower.includes('arv') ||
          lower.includes('comps')
        );
      },
    },
    {
      step: 3,
      name: 'Financial Analysis',
      description: 'Rep must discuss margins, ROI, and financials',
      requiredPhrases: ['margin', 'roi', 'profit', 'cost'],
      validationLogic: (transcript: string) => {
        const lower = transcript.toLowerCase();
        return (
          lower.includes('margin') || 
          lower.includes('roi') || 
          lower.includes('profit') ||
          lower.includes('cost')
        );
      },
    },
    {
      step: 4,
      name: 'Professional Negotiation',
      description: 'Rep must negotiate based on data and market analysis',
      requiredPhrases: ['market', 'data', 'comps', 'offer'],
      validationLogic: (transcript: string) => {
        const lower = transcript.toLowerCase();
        return (
          (lower.includes('market') || lower.includes('comps')) &&
          (lower.includes('offer') || lower.includes('price'))
        );
      },
    },
    {
      step: 5,
      name: 'Investment Decision',
      description: 'Rep must close based on financial justification',
      requiredPhrases: ['decision', 'numbers', 'roi', 'deal'],
      validationLogic: (transcript: string) => {
        const lower = transcript.toLowerCase();
        return (
          (lower.includes('decision') || lower.includes('deal')) &&
          (lower.includes('numbers') || lower.includes('roi') || lower.includes('margin'))
        );
      },
    },
  ],
};

/**
 * Get persona configuration by mode
 */
export function getPersonaConfig(mode: PersonaMode): PersonaConfig {
  return mode === 'acquisition' ? ACQUISITION_PERSONA : DISPOSITION_PERSONA;
}

/**
 * Validate if a dialogue gate has been passed
 */
export function validateDialogueGate(
  gate: DialogueGate,
  transcript: string
): boolean {
  return gate.validationLogic(transcript);
}

/**
 * Get current step based on transcript analysis
 */
export function getCurrentStep(
  persona: PersonaConfig,
  transcript: string
): number {
  // Check gates in reverse order to find the highest completed step
  for (let i = persona.dialogueGates.length - 1; i >= 0; i--) {
    const gate = persona.dialogueGates[i];
    if (validateDialogueGate(gate, transcript)) {
      return gate.step;
    }
  }
  return 0;
}

/**
 * Check if approval/denial logic gate is met
 * Based on GOAT Framework: "By the end of this call, I'll give you one of two things: 
 * an Approval with an offer, or a Denial with a reason."
 */
export function checkApprovalDenialGate(
  persona: PersonaConfig,
  fullTranscript: string
): 'approval' | 'denial' | 'pending' {
  const lower = fullTranscript.toLowerCase();
  
  // Check if all 5 steps are completed
  const allStepsComplete = persona.dialogueGates.every((gate) =>
    validateDialogueGate(gate, fullTranscript)
  );

  if (!allStepsComplete) {
    return 'pending';
  }

  // Check for approval indicators
  const hasApproval = 
    lower.includes('approval') || 
    lower.includes('approved') ||
    lower.includes('accept') ||
    lower.includes('deal') ||
    lower.includes('yes');

  // Check for denial indicators
  const hasDenial = 
    lower.includes('denial') || 
    lower.includes('denied') ||
    lower.includes('reject') ||
    lower.includes('no deal') ||
    lower.includes('pass');

  if (hasApproval && !hasDenial) {
    return 'approval';
  }

  if (hasDenial && !hasApproval) {
    return 'denial';
  }

  return 'pending';
}
