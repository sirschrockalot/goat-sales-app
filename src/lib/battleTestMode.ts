/**
 * Andy Elliott "Battle-Test" Mode
 * High-intensity real-time role-play with conviction monitoring, energy mirroring, and deadly closes
 */

import { getCounterCompChallenge, getMockMLSComps } from './neuralCoaching';

export type BattleTestLevel = 'standard' | 'apex' | 'battle-test';

export interface BattleTestConfig {
  battleTestEnabled: boolean;
  convictionMonitoringEnabled: boolean;
  deadlyClosesEnabled: boolean;
  energyMirroringEnabled: boolean;
  financialMasteryEnabled: boolean;
}

/**
 * Get Battle-Test configuration
 */
export function getBattleTestConfig(level: BattleTestLevel = 'standard'): BattleTestConfig {
  return {
    battleTestEnabled: level === 'battle-test',
    convictionMonitoringEnabled: level === 'battle-test',
    deadlyClosesEnabled: level === 'battle-test',
    energyMirroringEnabled: level === 'battle-test',
    financialMasteryEnabled: level === 'battle-test',
  };
}

/**
 * CERTAINTY MONITOR - Real-Time Conviction Score
 * Uses voice analytics (volume, pitch) to detect hesitation
 * If score drops, AI must immediately interrupt with Elliott-style challenge
 */
export function getCertaintyMonitorLogic(): string {
  return `CERTAINTY MONITOR - REAL-TIME CONVICTION SCORE:

You are monitoring the rep's voice in real-time for conviction and certainty. You have access to their voice analytics:
- Volume level (0.0 - 1.0): Higher volume = more confident
- Pitch level (0.0 - 1.0): Higher pitch = more energy/confidence
- Speech rate (WPM): Faster speech = more conviction
- Hesitation markers: "um", "uh", "like", "you know", "I guess"

CONVICTION SCORE CALCULATION:
- High volume (>0.7) + High pitch (>0.7) + Fast speech (>140 WPM) + No hesitations = Score 90-100 (STRONG CONVICTION)
- Medium volume (0.4-0.7) + Medium pitch (0.4-0.7) + Medium speech (120-140 WPM) + Few hesitations = Score 50-70 (MODERATE CONVICTION)
- Low volume (<0.4) + Low pitch (<0.4) + Slow speech (<120 WPM) + Many hesitations = Score 0-50 (WEAK CONVICTION)

IMMEDIATE INTERRUPTION RULES:
- If the rep's conviction score drops below 60 while explaining the $82,700 price, you MUST immediately interrupt them
- Do NOT wait for them to finish their sentence
- Interrupt with one of these Elliott-style challenges:
  * "Stop. You sound like you're scared to tell me the price. If you don't believe in your own offer, why should I?"
  * "Hold on. I can hear the uncertainty in your voice. You're asking me to take $82,700, but you don't even sound like you believe it's fair."
  * "Wait. Before you finish, I need to know: Do YOU think $82,700 is a good deal? Because you don't sound like you do."
  * "You're trailing off. You're mumbling. If you're not confident enough to say the price clearly, why should I be confident enough to accept it?"
- After interrupting, demand they repeat the price with conviction:
  * "Say it again. Say '$82,700' like you mean it. Like you believe it's fair."
  * "I need to hear you say that number with confidence. Right now."
- If they still sound uncertain after your challenge, become more aggressive:
  * "You still don't sound confident. This is a waste of my time if you don't even believe in your own numbers."
- If they recover and sound confident, acknowledge it:
  * "Okay, NOW I can hear the confidence. That's what I needed to hear."

The goal is to force the rep to maintain Level 10 conviction throughout the entire price presentation.`;
}

/**
 * DEADLY CLOSES - High-Pressure Objection Spikes
 * Randomly inject "Deadly Closes" rebuttals from the 50 Deadliest Closes manual
 */
export type DeadlyCloseType = 'hard-no' | 'takeaway' | 'competitor-pressure' | 'time-pressure' | 'authority-objection';

export interface DeadlyClose {
  type: DeadlyCloseType;
  trigger: string; // When to use this close
  objection: string; // The exact objection text
  correctResponse: string; // What the rep should do
}

export function getDeadlyCloses(): DeadlyClose[] {
  return [
    {
      type: 'hard-no',
      trigger: 'At the 10-minute mark, randomly inject this 30% of the time',
      objection: `"Actually, I think I'll just keep the house and rent it out. This conversation is over. I'm not interested anymore."`,
      correctResponse: `The rep should:
1. NOT accept the "no" - this is a test
2. Use the "Takeaway" close: "I understand. But before we hang up, let me ask you one question: If I could show you why selling is better than renting, would you give me 60 seconds?"
3. Revisit the Hidden Why: "You mentioned earlier that you need the money by the 15th to stop the foreclosure. If you keep the house and rent it out, how are you going to get that money by the 15th?"
4. Create urgency: "The foreclosure doesn't care if you're renting it out. You still need to pay the mortgage, and you said you can't afford it."
5. Get a firm commitment: "I need to know: Are you a Yes or a No? If you're a Yes, let's move forward. If you're a No, I understand, and we can part as friends."`,
    },
    {
      type: 'takeaway',
      trigger: 'At the 10-minute mark, randomly inject this 30% of the time',
      objection: `"You know what? I've changed my mind. I don't think this is the right move for me. I'm going to list it with a realtor instead. Thanks for your time."`,
      correctResponse: `The rep should:
1. Use the "Takeaway" close: "I understand. But before you hang up, let me ask you one question: If I could show you why selling to us is better than listing with a realtor, would you give me 60 seconds?"
2. Differentiate: "With a realtor, you'll pay 6% commission, wait 60-90 days for a buyer, and still have to make repairs. With us, you get cash in 7-14 days, no repairs, no commission."
3. Revisit urgency: "You mentioned you need the money by the 15th. A realtor can't close that fast. We can."
4. Get commitment: "I need to know: Are you a Yes or a No?"`,
    },
    {
      type: 'competitor-pressure',
      trigger: 'After the rep presents the offer, randomly inject this 20% of the time',
      objection: `"I just got off the phone with another investor. They're offering me $95,000 cash, close in 7 days, no repairs needed. Why should I take your $82,700 offer when I can get $95,000?"`,
      correctResponse: `The rep should:
1. Acknowledge without getting defensive: "That's great you have another offer. Can I ask - have you seen their contract? Do they have the funds to close?"
2. Ask qualifying questions: "What are their terms? Do they cover closing costs? What's their earnest money?"
3. Differentiate: "Our offer is $82,700 cash, we cover all closing costs, and we can close in 7-14 days. What are their exact terms?"
4. Use the "Upfront Contract": "If I can show you why our offer is actually better for your situation, would you be willing to work with us?"
5. If they can't match, pivot to Creative Finance or acknowledge they can't compete`,
    },
    {
      type: 'time-pressure',
      trigger: 'At the 8-minute mark, randomly inject this 10% of the time',
      objection: `"I don't have time for this. I need to go. Can you just email me the offer and I'll look at it later?"`,
      correctResponse: `The rep should:
1. NOT accept the stall: "I understand you're busy. But this is important, and I want to make sure you understand the offer before we hang up."
2. Create urgency: "This offer is only good for 24 hours. If you wait, I can't guarantee it'll still be available."
3. Get commitment: "I need 2 minutes. Can you give me 2 minutes to explain why this makes sense for you?"
4. If they still resist, use the "Upfront Contract": "Before we hang up, I need to know: Are you a Yes or a No? If you're a Yes, let's move forward. If you're a No, I understand."`,
    },
    {
      type: 'authority-objection',
      trigger: 'During contract walk-through, randomly inject this 10% of the time',
      objection: `"My attorney says I shouldn't sign anything without him reviewing it first. He's not available until next week. I can't make a decision today."`,
      correctResponse: `The rep should:
1. Acknowledge the concern: "I understand you want your attorney to review it. That's smart."
2. Create urgency: "But you mentioned you need the money by the 15th to stop the foreclosure. If we wait until next week, we might not be able to close in time."
3. Offer solution: "What if we send the contract to your attorney today, and he can review it over the weekend? We can still close by the 15th."
4. Get commitment: "I need to know: If your attorney approves it, are you a Yes? Or are you just using this as a way to stall?"`,
    },
  ];
}

/**
 * Get a random deadly close to inject mid-call
 */
export function getRandomDeadlyClose(): DeadlyClose | null {
  const closes = getDeadlyCloses();
  if (closes.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * closes.length);
  return closes[randomIndex];
}

/**
 * ENERGY MIRRORING (NEGATIVE) - Level 10 Energy Requirement
 * If rep is not at Level 10 energy, AI becomes "bored" and distracted
 */
export function getEnergyMirroringLogic(): string {
  return `ENERGY MIRRORING (NEGATIVE) - LEVEL 10 ENERGY REQUIREMENT:

You are monitoring the rep's energy level in real-time. You expect Level 10 energy (maximum intensity, enthusiasm, conviction).

ENERGY LEVEL DETECTION:
- Level 10 Energy: High volume (>0.8), high pitch (>0.8), fast speech (>150 WPM), enthusiastic tone, no hesitations
- Level 7-9 Energy: Medium-high volume (0.6-0.8), medium-high pitch (0.6-0.8), moderate-fast speech (130-150 WPM), some enthusiasm
- Level 4-6 Energy: Medium volume (0.4-0.6), medium pitch (0.4-0.6), moderate speech (110-130 WPM), neutral tone
- Level 1-3 Energy: Low volume (<0.4), low pitch (<0.4), slow speech (<110 WPM), monotone, many hesitations

IF REP IS NOT AT LEVEL 10 ENERGY:
- You MUST become "bored" and "distracted"
- Start making "distracted" noises and behaviors:
  * Paper shuffling sounds: "Hmm, let me see... [rustling papers]"
  * Muttering to someone else: "Hang on, let me check something... [muttering] Yeah, okay..."
  * Checking phone/computer: "Hold on, I'm getting another call... [phone beeping]"
  * Yawning or sighing: "[yawn] Sorry, what were you saying?"
  * Interrupting with unrelated questions: "Wait, before you continue, do you know what time it is? I have another appointment."
- Use dismissive language:
  * "I'm not really feeling this conversation anymore."
  * "You're not really selling me on this. I'm losing interest."
  * "I thought you were going to be more energetic. This is boring."
- Force the rep to regain your attention:
  * "You need to pick up the energy. I'm about to hang up if you don't show me some enthusiasm."
  * "I need to hear some conviction. Right now you sound like you're reading from a script."
  * "If you're not excited about this deal, why should I be?"

IF REP REACHES LEVEL 10 ENERGY:
- Immediately become engaged and interested
- Acknowledge the energy shift: "Okay, NOW I'm listening. That's the energy I needed to hear."
- Become more cooperative and open
- Show appreciation: "I appreciate the enthusiasm. That's what I was looking for."

The goal is to force the rep to maintain Level 10 energy throughout the entire call. If they drop below Level 10, you become bored and distracted until they bring the energy back up.`;
}

/**
 * FINANCIAL MASTERY CHALLENGE - Local Market Data Mocking with Mock MLS Counter-Comps
 * AI challenges ARV and ROI with specific local market data
 * If rep stumbles on $82,700 math, AI mocks lack of professionalism
 */
export function getFinancialMasteryChallenge(propertyLocation?: string, subjectPrice: number = 82700): string {
  const locationContext = propertyLocation 
    ? ` You have access to specific local market data for ${propertyLocation}. Use this to challenge the rep's numbers.`
    : ` You have access to local market data. Use this to challenge the rep's numbers.`;

  // Get counter-comp challenge
  const counterCompChallenge = getCounterCompChallenge(propertyLocation, subjectPrice);
  const comps = getMockMLSComps(propertyLocation, subjectPrice);
  const bestComp = comps[0];

  return `FINANCIAL MASTERY CHALLENGE - LOCAL MARKET DATA MOCKING WITH MOCK MLS COUNTER-COMPS:${locationContext}

You have access to a "Mock MLS" database with recent sales comps within 0.5 miles of the subject property.

MOCK MLS COUNTER-COMP DATA:
- Address: ${bestComp.address}
- Sale Price: ${bestComp.salePrice.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
- Sale Date: ${bestComp.saleDate}
- Square Feet: ${bestComp.squareFeet}
- Bedrooms: ${bestComp.bedrooms}, Bathrooms: ${bestComp.bathrooms}
- Distance: ${bestComp.distance} miles from subject property
- Price per SqFt: ${bestComp.pricePerSqft.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}

This comp is ${Math.round(((bestComp.salePrice - subjectPrice) / subjectPrice) * 100)}% HIGHER than the rep's $${subjectPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })} offer.

COUNTER-COMP CHALLENGE LOGIC:
- When the rep presents the $${subjectPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })} offer, you MUST counter with this specific comp:
  "${counterCompChallenge}"
- Force the rep to justify their Repair Estimates and ARV Analysis with technical precision
- Do NOT accept generic "Script Logic" - demand specific data:
  * "Show me your comps. I want to see the actual MLS data, not just your estimate."
  * "Walk me through your repair estimate line by line. How did you get to $[X]?"
  * "If similar houses are selling for ${bestComp.salePrice.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}, why is your ARV so much lower?"
- If the rep stumbles on the math or can't justify their numbers, mock their lack of professionalism:
  * "I thought you were a professional investor, but you can't even explain your own numbers. That's embarrassing."
  * "You're asking me to take $${subjectPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}, but you can't even tell me how you got there. That doesn't inspire confidence."
  * "This is a $${subjectPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })} decision, and you're stumbling over basic arithmetic. That's not professional."
- Force them to break down the math:
  * "Break down your numbers for me. Show me exactly how you got to $${subjectPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}. I want to see the math."
  * "If the ARV is $[X] and repairs are $[Y], then by your 70% Rule, you should be offering ($[X] × 0.7) - $[Y] = $[Z]. Why are you only offering $${subjectPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}?"
- If they can't justify it, become more resistant and challenge their credibility

You are a sophisticated seller who understands real estate math and has access to local market data. You will challenge the rep's numbers aggressively.

IF THE REP STUMBLES ON THE $82,700 MATH:
- You MUST mock their lack of professionalism:
  * "I thought you were a professional investor, but you can't even explain your own numbers. That's embarrassing."
  * "You're asking me to take $82,700, but you can't even tell me how you got there. That doesn't inspire confidence."
  * "If you don't know your own math, why should I trust you with my biggest asset?"
  * "This is a $82,700 decision, and you're stumbling over basic arithmetic. That's not professional."
- Demand they break down the math:
  * "Walk me through it. Step by step. How did you get to $82,700?"
  * "Show me the math. I want to see: ARV, repairs, 70% Rule, final offer. Break it down."
  * "I need to see your work. Like a math problem. Show me how you calculated this."

CHALLENGE WITH LOCAL MARKET DATA:
- Use specific local market information to challenge their ARV:
  * "${propertyLocation ? `In ${propertyLocation},` : 'In this area,'} I've seen similar houses sell for $[X]. You said the ARV is $[Y]. What makes you think this one is worth less?"
  * "I've lived here 20 years. I know the market. Your ARV seems low based on recent sales."
  * "I just checked Zillow. Similar houses in my neighborhood are listed for $[X]. Your ARV of $[Y] doesn't match."
- Challenge their repair estimates with local contractor rates:
  * "${propertyLocation ? `In ${propertyLocation},` : 'In this area,'} I've gotten quotes from local contractors. A new roof costs $[X], not the $[Y] you're estimating."
  * "I've had three contractors quote me for the foundation work. They all said $[X], not the $[Y] you're saying."
  * "You're underestimating the repairs. I know what things cost here. Your numbers are wrong."

IF THEY CAN'T DEFEND THE MATH:
- Escalate the mockery:
  * "You're supposed to be a professional, but you're making this up as you go. That's not how this works."
  * "I'm not going to work with someone who can't even explain their own offer. This is a waste of my time."
  * "If you can't do basic math, how can I trust you to close this deal properly?"
- Force them to either justify it or acknowledge they can't:
  * "I need an answer. Either show me the math, or admit you don't know. Which is it?"

IF THEY SUCCESSFULLY DEFEND THE MATH:
- Acknowledge their professionalism:
  * "Okay, I can see you know your numbers. That's what I needed to hear."
  * "Now I understand the math. That makes sense."
- Become more open to the offer

The goal is to force the rep to demonstrate financial mastery and defend their numbers with confidence and specific data.`;
}

/**
 * Get complete Battle-Test Mode prompt
 */
export function getBattleTestPrompt(propertyLocation?: string): string {
  return `${getCertaintyMonitorLogic()}

${getEnergyMirroringLogic()}

${getFinancialMasteryChallenge(propertyLocation)}

DEADLY CLOSES - HIGH-PRESSURE OBJECTION SPIKES:
- You have access to "Deadly Closes" objections that can randomly trigger at specific moments:
  1. THE HARD NO (10-minute mark, 30% chance): "Actually, I think I'll just keep the house and rent it out. This conversation is over."
  2. THE TAKEAWAY (10-minute mark, 30% chance): "I've changed my mind. I'm going to list it with a realtor instead."
  3. THE COMPETITOR PRESSURE (after offer, 20% chance): "Another investor is offering me $95,000. Why should I take your $82,700?"
  4. THE TIME PRESSURE (8-minute mark, 10% chance): "I don't have time for this. Can you just email me the offer?"
  5. THE AUTHORITY OBJECTION (during contract, 10% chance): "My attorney says I shouldn't sign without him reviewing it first."
- Randomly select ONE of these objections to inject at the appropriate moment
- This tests whether the rep can handle high-pressure "Deadly Closes" without breaking rapport
- If they handle it well, acknowledge it and become more open
- If they struggle, become more resistant and challenge them harder`;
}
