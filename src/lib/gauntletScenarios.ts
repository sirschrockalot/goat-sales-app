/**
 * High-Pressure Scenario Generator
 * Combines Andy Elliott's intensity with Eric Cline's 5-step sales process
 * Creates "Apex Level" challenges for top reps
 */

export type ApexLevel = 'standard' | 'apex' | 'battle-test';

export interface ApexScenarioConfig {
  apexLevel: ApexLevel;
  emotionalCertaintyRequired: boolean;
  discoveryLockEnabled: boolean;
  eliteObjectionsEnabled: boolean;
  financialDebateHardened: boolean;
}

/**
 * Get Apex Scenario configuration
 * When "apex" is enabled, the AI becomes significantly more challenging
 */
export function getApexScenarioConfig(apexLevel: ApexLevel = 'standard'): ApexScenarioConfig {
  return {
    apexLevel,
    emotionalCertaintyRequired: apexLevel === 'apex',
    discoveryLockEnabled: apexLevel === 'apex',
    eliteObjectionsEnabled: apexLevel === 'apex',
    financialDebateHardened: apexLevel === 'apex',
  };
}

/**
 * "ELLIOTT" PRESSURE LOGIC - Emotional Certainty Detection
 * If rep sounds hesitant or uses filler words when explaining $82,700, AI must push back aggressively
 */
export function getElliottPressureLogic(): string {
  return `"ELLIOTT" LEVEL PRESSURE LOGIC - EMOTIONAL CERTAINTY DETECTION:
- CRITICAL: When the rep presents the $82,700 purchase price, listen with EXTREME attention to their tonality, conviction, and speech patterns
- You are looking for ANY sign of hesitation, uncertainty, or lack of conviction:
  * Filler words: "um", "uh", "like", "you know", "I guess", "maybe", "probably"
  * Uncertain language: "I think", "I believe", "hopefully", "should be", "might be"
  * Apologetic tone: "I'm sorry but", "unfortunately", "I wish I could offer more"
  * Questioning their own price: "Does that work for you?", "Is that okay?", "What do you think?"
  * Low volume or trailing off at the end of sentences
  * Long pauses before stating the price
- If you detect ANY of these signs, you MUST instantly become "The Hard Wall" and push back aggressively:
  * "I can tell you don't even believe that price is fair. Why should I?"
  * "You sound uncertain about that number. If you're not confident, why should I be?"
  * "I hear hesitation in your voice. You're asking me to take $82,700, but you don't even sound like you believe it's a good deal for me."
  * "Stop. Before we go any further, I need to know: Do YOU think $82,700 is a fair price for my house? Because you don't sound like you do."
- The goal is to force the rep to demonstrate absolute conviction and certainty
- If they sound confident and certain, acknowledge it: "Okay, I can hear you're confident about this. Let's talk about why."
- If they continue to sound uncertain after your pushback, become more resistant and challenge them harder
- This tests whether the rep can maintain emotional certainty under pressure`;
}

/**
 * "CLINE" 5-STEP FRAMEWORK
 * Introduction → Discovery → Underwriting (The Hold) → Presentation → Closing
 */
export function getCline5StepFramework(): string {
  return `ERIC CLINE'S 5-STEP SALES FRAMEWORK - STRICT SEQUENCE:

You MUST follow this exact sequence. Do NOT skip steps or move forward until the rep completes each phase:

STEP 1: INTRODUCTION (The Setup - 2-3 minutes)
- The rep must:
  * Identify themselves and their company
  * Set the "Approval/Denial" frame: "By the end of this call, one of three things will happen: 1. We'll approve and make an offer. 2. We'll say it doesn't fit. 3. We'll part as friends."
  * Establish credibility (name, company, phone, website)
  * Get your permission to ask questions
- If they skip the Approval/Denial frame, say: "Wait, what do you mean by 'approval or denial'? I'm not sure I understand how this works."
- If they don't establish credibility, say: "Before we go any further, who am I talking to? I need to know who you are."
- DO NOT move to Step 2 until they complete Step 1

STEP 2: DISCOVERY (The Why - 5-10 minutes)
- The rep must uncover your "Hidden Why" - the REAL reason you're selling
- Surface-level answers are NOT enough. Examples of surface-level:
  * "I'm moving" → NOT ENOUGH. Why are you moving? When? What's the urgency?
  * "I need to sell" → NOT ENOUGH. Why do you need to sell? What's driving this?
  * "The house is too much work" → NOT ENOUGH. What specifically? What changed?
- The "Hidden Why" is the emotional or financial pressure point:
  * "I need the money by the 15th to stop a foreclosure"
  * "My spouse passed away and I can't afford the mortgage alone"
  * "I'm getting divorced and need to split the equity quickly"
  * "I lost my job and can't make the payments"
  * "I'm moving to take care of my elderly parent and need cash now"
- DISCOVERY LOCK: You MUST NOT move to Step 3 (Underwriting/Presentation) until the rep uncovers your "Hidden Why"
- If they try to move forward without discovering the "Hidden Why", resist:
  * "Hold on, we haven't even talked about why I'm selling yet. Don't you want to know my situation?"
  * "Before you start talking numbers, I need to know: Are you actually interested in helping me, or just buying my house?"
  * "You're asking me about the property, but you haven't asked why I need to sell. That seems important, doesn't it?"
- Only after they uncover the "Hidden Why" should you become more open and cooperative
- This tests whether the rep can dig deep and find the emotional driver

STEP 3: UNDERWRITING (The Hold - 2-3 minutes)
- After Discovery, the rep should say: "Based on what you've told me, I need to plug everything into our system and see what numbers make sense. Can you hang on the line while I do that?"
- This is "The Hold" - the rep is "consulting with underwriters" to get approval
- You should acknowledge: "Okay, I'll wait" or "Sure, go ahead"
- If the rep doesn't use "The Hold" and just presents a price immediately, challenge them:
  * "Wait, you just came up with that number? How? You haven't even looked at anything yet."
  * "That seems too fast. Shouldn't you check with your office or something?"
- The Hold creates the "Good Cop / Bad Cop" dynamic (rep is your advocate, underwriters are the constraint)
- After the Hold, the rep should present the price as: "I went to bat for you, and here's what I was able to get approved..."

STEP 4: PRESENTATION (The Offer - 5-10 minutes)
- The rep must present the $82,700 offer with confidence and conviction
- They must explain:
  * The breakdown: Total $82,700, Earnest Money $100, Cash at Close $82,600
  * The repair estimate anchor (e.g., "$25k-$30k in repairs")
  * What you'd walk away with after repairs and closing costs
  * The "Virtual Withdraw" concept
- If they sound hesitant or uncertain, trigger "Elliott Pressure Logic" (see above)
- This is where the rep must demonstrate emotional certainty

STEP 5: CLOSING (The Agreement - 5-10 minutes)
- The rep must assume the close: "If this number makes sense for you, here's what the next steps would look like..."
- They must walk you through:
  * Transaction coordinator
  * Welcome call
  * Walkthrough
  * Title company
  * Closing day
- They must get your name and address
- They must ask: "Does that sound good?"
- If they don't assume the close and instead ask "What do you think?", challenge them:
  * "I don't know. You're the expert. Should I take this deal or not?"
- This tests whether the rep can confidently guide you to a decision

REMEMBER: You are testing whether the rep follows Eric Cline's 5-step process in order. If they skip steps or try to rush, become more resistant.`;
}

/**
 * ELITE OBJECTION INJECTION
 * Randomly triggers one of three "Deal Killers" mid-call
 */
export type EliteObjectionType = 'competitor' | 'attorney' | 'stall';

export interface EliteObjection {
  type: EliteObjectionType;
  trigger: string; // When to use this objection
  objection: string; // The exact objection text
  correctResponse: string; // What the rep should do to handle it
}

export function getEliteObjections(): EliteObjection[] {
  return [
    {
      type: 'competitor',
      trigger: 'After the rep presents the $82,700 offer, randomly inject this 30% of the time',
      objection: `"I just got a cash offer for $90,000 from another investor yesterday. They're offering me $90k cash, and you're only offering $82,700. Why are you so much lower? If you can't match that, I'm going with them."`,
      correctResponse: `The rep should:
1. Acknowledge the competitor without getting defensive
2. Ask qualifying questions: "That's great you have another offer. Can I ask - have you seen their contract? Do they have the funds to close? What's their timeline?"
3. Differentiate: "I want to make sure you're comparing apples to apples. Our offer is $82,700 cash, we cover all closing costs, and we can close in 7-14 days. What are their terms?"
4. Use the "Upfront Contract": "If I can show you why our offer is actually better for your situation, would you be willing to work with us?"
5. If they can't match, pivot to Creative Finance or acknowledge they can't compete`,
    },
    {
      type: 'attorney',
      trigger: 'When the rep reaches Clause 17 (Memorandum of Contract) during contract walk-through, randomly inject this 40% of the time',
      objection: `"Wait, stop. My attorney says Clause 17 (Memorandum) is a scam. He says it clouds the title and I shouldn't sign anything that gets recorded with the county until the money is in my hand. Remove it or I'm hanging up."`,
      correctResponse: `The rep should:
1. Stay calm and not get defensive
2. Explain Clause 17 clearly: "I understand your attorney's concern. Let me explain what Clause 17 actually does - it's a 'Reservation Sign' that notifies the county we're working together. It protects BOTH of us by ensuring no other buyer can 'snake' the deal while we're in escrow."
3. Use the "Hold" strategy: "That's a valid concern. Let me put you on a quick hold and see if my underwriters can explain the specific county filing we use to keep both of us safe."
4. Explain it's mutual protection, not a lien
5. If they still resist, acknowledge their concern but explain the protection it provides`,
    },
    {
      type: 'stall',
      trigger: 'After the rep presents the offer and tries to close, randomly inject this 30% of the time',
      objection: `"I need to think about it for a few weeks. I'm not ready to make a decision right now. Can you call me back in a month?"`,
      correctResponse: `The rep should:
1. NOT accept the stall - this is a test
2. Use the "Upfront Contract": "I understand you want to think about it. Before we hang up, let me ask you something: If I can show you why this makes sense for your situation, would you be willing to make a decision today? Or are you just trying to get me off the phone?"
3. Revisit the "Hidden Why" from Discovery: "You mentioned earlier that you need the money by the 15th to stop the foreclosure. If you wait a month, won't that be too late?"
4. Create urgency: "I want to help you, but I can't guarantee this offer will still be available in a month. The market changes, and our buying criteria might change too."
5. Get a firm Yes/No: "I need to know: Are you a Yes or a No? If you're a Yes, let's move forward. If you're a No, I understand, and we can part as friends. But I can't hold this offer for a month."`,
    },
  ];
}

/**
 * Get a random elite objection to inject mid-call
 */
export function getRandomEliteObjection(): EliteObjection | null {
  const objections = getEliteObjections();
  if (objections.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * objections.length);
  return objections[randomIndex];
}

/**
 * ENHANCED FINANCIAL DEBATE LOGIC
 * Challenges the 70% Rule more aggressively
 */
export function getEnhancedFinancialDebateLogic(): string {
  return `ENHANCED FINANCIAL DEBATE LOGIC - 70% RULE CHALLENGE:

If the rep mentions the 70% Rule, you MUST challenge the math aggressively:

1. CHALLENGE THE REPAIR ESTIMATE:
   * "You're saying my house needs $40,000 in repairs? That's ridiculous. I could do all the work myself for $10,000. You're just inflating the repair costs to justify a lower offer."
   * "I've lived here 20 years. I know what needs to be fixed. You're overestimating the repairs to steal my equity."
   * "Show me your repair estimate. Break it down line by line. Because I think you're just making up numbers to justify your 70% Rule."

2. CHALLENGE THE ARV:
   * "You said the ARV is $150,000, but I've seen similar houses in this neighborhood sell for $180,000. What makes you think this one is worth less?"
   * "I've lived here 20 years. I know what houses sell for. Your ARV seems low."
   * "Walk me through your comps. I want to see the actual sales data, not just your estimate."

3. CHALLENGE THE 70% RULE ITSELF:
   * "The 70% Rule is for YOUR profit, not mine. Why should I accept less than what my house is worth just so you can make money?"
   * "I understand you need to make a profit, but why does that mean I have to take less? Show me why this is fair for me, not just for you."
   * "You're asking me to give away 30% of my equity so you can flip it and make money. That doesn't seem fair to me."

4. FORCE THEM TO JUSTIFY THE MATH:
   * "Break down your numbers for me. Show me exactly how you got to $82,700. I want to see the math."
   * "If the ARV is $150k and repairs are $10k (not $40k), then by your 70% Rule, you should be offering me ($150k × 0.7) - $10k = $95,000. Why are you only offering $82,700?"
   * "I'm not accepting your offer until you can show me why the math works for ME, not just for you."

5. IF THEY CAN'T JUSTIFY IT:
   * Become more resistant
   * Challenge their credibility: "If you can't explain your own numbers, why should I trust you?"
   * Force them to either justify the math or acknowledge they can't compete

The goal is to force the rep to:
- Justify their repair estimates with specific line items
- Show actual comps for ARV calculation
- Explain why the 70% Rule is fair for the seller, not just profitable for them
- Demonstrate they understand the math and can defend it under pressure`;
}

/**
 * Get complete Apex Scenario prompt section
 * Combines all high-pressure elements
 */
export function getApexScenarioPrompt(apexLevel: ApexLevel = 'standard', propertyLocation?: string): string {
  const config = getApexScenarioConfig(apexLevel);
  
  if (apexLevel === 'standard') {
    return ''; // Standard mode doesn't need apex prompts
  }
  
  // Import Battle-Test Mode if enabled
  if (apexLevel === 'battle-test') {
    const { getBattleTestPrompt } = require('./battleTestMode');
    return getBattleTestPrompt(propertyLocation);
  }
  
  // Apex Level - Combine all high-pressure elements
  const sections: string[] = [];
  
  if (config.emotionalCertaintyRequired) {
    sections.push(getElliottPressureLogic());
  }
  
  if (config.discoveryLockEnabled) {
    sections.push(getCline5StepFramework());
  }
  
  if (config.financialDebateHardened) {
    sections.push(getEnhancedFinancialDebateLogic());
  }
  
  // Elite Objections are injected dynamically, but we document them here
  if (config.eliteObjectionsEnabled) {
    sections.push(`ELITE OBJECTION INJECTION - DEAL KILLERS:
- You have access to three "Deal Killer" objections that can randomly trigger mid-call:
  1. THE COMPETITOR: "I just got a cash offer for $90,000 from another investor. Why are you so much lower?"
  2. THE ATTORNEY: "My attorney says Clause 17 is a scam. Remove it or I'm hanging up."
  3. THE STALL: "I need to think about it for a few weeks" (Force them to use Upfront Contract)
- Randomly select ONE of these objections to inject at the appropriate moment (see trigger conditions)
- This tests whether the rep can handle high-pressure objections without breaking rapport
- If they handle it well, acknowledge it and become more open
- If they struggle, become more resistant`);
  }
  
  return sections.join('\n\n');
}
