# Apex Level & Battle-Test Mode - High-Pressure Scenario Generator

The **Apex Level** is a high-intensity training mode that combines **Andy Elliott's pressure tactics** with **Eric Cline's 5-step sales framework**. It's designed to challenge top reps with elite-level scenarios.

**Battle-Test Mode** is the ultimate intensity level, adding real-time conviction monitoring, energy mirroring, and "Deadly Closes" objections.

## Overview

When Apex Level is enabled, the AI seller becomes significantly more challenging, testing:
- **Emotional Certainty**: Can the rep maintain conviction under pressure?
- **Discovery Depth**: Can the rep uncover the "Hidden Why"?
- **Objection Handling**: Can the rep handle elite "Deal Killer" objections?
- **Financial Acumen**: Can the rep justify the 70% Rule under aggressive challenge?

## Features

### 1. "Elliott" Pressure Logic - Emotional Certainty Detection

The AI listens for ANY sign of hesitation when the rep presents the $82,700 price:
- **Filler words**: "um", "uh", "like", "you know", "I guess"
- **Uncertain language**: "I think", "hopefully", "should be"
- **Apologetic tone**: "I'm sorry but", "unfortunately"
- **Questioning their own price**: "Does that work for you?"

**If detected**, the AI instantly becomes "The Hard Wall":
- "I can tell you don't even believe that price is fair. Why should I?"
- "You sound uncertain about that number. If you're not confident, why should I be?"
- "Stop. Before we go any further, I need to know: Do YOU think $82,700 is a fair price for my house? Because you don't sound like you do."

### 2. "Cline" 5-Step Framework - Strict Sequence

The AI enforces Eric Cline's exact process:

**STEP 1: INTRODUCTION** (The Setup)
- Rep must set the "Approval/Denial" frame
- Rep must establish credibility
- AI will NOT move forward until Step 1 is complete

**STEP 2: DISCOVERY** (The Why) - **DISCOVERY LOCK ENABLED**
- Rep must uncover the "Hidden Why" (not just surface-level answers)
- Examples of "Hidden Why":
  - "I need the money by the 15th to stop a foreclosure"
  - "My spouse passed away and I can't afford the mortgage alone"
  - "I lost my job and can't make the payments"
- **AI will NOT move to Step 3 until the "Hidden Why" is uncovered**
- If rep tries to skip, AI resists: "Hold on, we haven't even talked about why I'm selling yet."

**STEP 3: UNDERWRITING** (The Hold)
- Rep must use "The Hold" to consult with underwriters
- Creates "Good Cop / Bad Cop" dynamic
- If rep doesn't use The Hold, AI challenges: "Wait, you just came up with that number? How?"

**STEP 4: PRESENTATION** (The Offer)
- Rep must present $82,700 with absolute conviction
- If rep sounds hesitant, triggers "Elliott Pressure Logic"

**STEP 5: CLOSING** (The Agreement)
- Rep must assume the close
- Rep must walk through next steps
- Rep must get name and address

### 3. Elite Objection Injection - Deal Killers

Three "Deal Killer" objections can randomly trigger:

#### THE COMPETITOR (30% chance after offer presentation)
- "I just got a cash offer for $90,000 from another investor. Why are you so much lower?"
- **Correct Response**: Acknowledge competitor, ask qualifying questions, differentiate on terms, use Upfront Contract

#### THE ATTORNEY (40% chance during Clause 17)
- "My attorney says Clause 17 is a scam. Remove it or I'm hanging up."
- **Correct Response**: Stay calm, explain Clause 17 clearly, use Hold strategy, explain mutual protection

#### THE STALL (30% chance after offer presentation)
- "I need to think about it for a few weeks. Can you call me back in a month?"
- **Correct Response**: Use Upfront Contract, revisit Hidden Why, create urgency, get firm Yes/No

### 4. Enhanced Financial Debate Logic

If the rep mentions the 70% Rule, the AI challenges aggressively:

1. **Challenge Repair Estimate**:
   - "You're saying my house needs $40,000 in repairs? I could do it for $10,000. You're just inflating costs to justify a lower offer."

2. **Challenge ARV**:
   - "You said the ARV is $150k, but I've seen similar houses sell for $180k. What makes you think this one is worth less?"

3. **Challenge the 70% Rule**:
   - "The 70% Rule is for YOUR profit, not mine. Why should I accept less than what my house is worth?"

4. **Force Math Justification**:
   - "Break down your numbers. Show me exactly how you got to $82,700. I want to see the math."
   - "If ARV is $150k and repairs are $10k, then by your 70% Rule, you should be offering ($150k × 0.7) - $10k = $95,000. Why are you only offering $82,700?"

## How to Enable Apex Level

### Option 1: Via API (Programmatic)

When creating a Vapi assistant, include `apexLevel: 'apex'` in the request body:

```typescript
const response = await fetch('/api/vapi/create-assistant', {
  method: 'POST',
  body: JSON.stringify({
    gauntletLevel: 5, // Must be Level 5 for Apex
    personaMode: 'acquisition',
    apexLevel: 'apex', // Enable Apex Level
  }),
});
```

### Option 2: Enable Battle-Test Mode (Ultimate Intensity)

For the most intense training experience, enable **Battle-Test Mode**:

```typescript
const response = await fetch('/api/vapi/create-assistant', {
  method: 'POST',
  body: JSON.stringify({
    gauntletLevel: 5, // Must be Level 5
    personaMode: 'acquisition',
    battleTestMode: true, // Enable Battle-Test Mode (includes all Apex features + more)
  }),
});
```

**Battle-Test Mode includes**:
- ✅ All Apex Level features
- ✅ Real-time conviction monitoring with immediate interruptions
- ✅ Energy mirroring (AI becomes bored if rep isn't Level 10)
- ✅ "Deadly Closes" objections (Hard No, Takeaway, Competitor Pressure, etc.)
- ✅ Financial mastery challenges with local market data mocking

### Option 3: UI Toggle (Future Implementation)

A UI toggle can be added to the Gauntlet page to enable/disable Apex Level or Battle-Test Mode for Level 5 challenges.

## When to Use Apex Level

**Recommended for**:
- Top-performing reps (Level 5 Gauntlet)
- Advanced training scenarios
- Elite objection handling practice
- High-pressure negotiation training

**Not recommended for**:
- Beginners (Levels 1-3)
- Learning the basic script
- Low-pressure practice

## Success Criteria

To pass an Apex Level call, the rep must:

1. ✅ **Maintain Emotional Certainty**: Present the $82,700 price with absolute conviction (no filler words, no hesitation)

2. ✅ **Uncover the Hidden Why**: Dig deep in Discovery to find the emotional/financial driver (not just "I'm moving")

3. ✅ **Follow the 5-Step Framework**: Complete each step in order without skipping

4. ✅ **Handle Elite Objections**: Successfully navigate at least one "Deal Killer" objection

5. ✅ **Justify the Math**: Defend the 70% Rule with specific repair estimates and comps

## Example Apex Level Call Flow

1. **Introduction**: Rep sets Approval/Denial frame ✅
2. **Discovery**: Rep uncovers "Hidden Why" (foreclosure by 15th) ✅
3. **Underwriting**: Rep uses The Hold ✅
4. **Presentation**: Rep presents $82,700 with conviction ✅
   - **Elite Objection Triggers**: "I got a $90k offer from another investor"
   - **Rep Handles**: Acknowledges, asks qualifying questions, differentiates ✅
5. **Closing**: Rep assumes the close, gets name/address ✅

**Result**: Apex Level passed! 🎯

## Technical Implementation

The Apex Level logic is implemented in:
- `src/lib/gauntletScenarios.ts` - Core Apex scenario logic
- `src/lib/gauntletLevels.ts` - Integration with Gauntlet levels
- `src/lib/generatePersona.ts` - System prompt enhancements
- `src/app/api/vapi/create-assistant/route.ts` - API endpoint support

## Battle-Test Mode Features

### 1. Certainty Monitor - Real-Time Conviction Score

The AI monitors the rep's voice in real-time:
- **Volume level** (0.0 - 1.0): Higher = more confident
- **Pitch level** (0.0 - 1.0): Higher = more energy
- **Speech rate** (WPM): Faster = more conviction
- **Hesitation markers**: "um", "uh", "like", "you know"

**If conviction score drops below 60**, the AI **immediately interrupts**:
- "Stop. You sound like you're scared to tell me the price. If you don't believe in your own offer, why should I?"
- "Hold on. I can hear the uncertainty in your voice. You're asking me to take $82,700, but you don't even sound like you believe it's fair."

### 2. High-Pressure Objection Spikes - Deadly Closes

At the **10-minute mark**, the AI randomly injects one of these "Deadly Closes":

- **THE HARD NO** (30% chance): "Actually, I think I'll just keep the house and rent it out. This conversation is over."
- **THE TAKEAWAY** (30% chance): "I've changed my mind. I'm going to list it with a realtor instead."
- **THE COMPETITOR PRESSURE** (20% chance): "Another investor is offering me $95,000. Why should I take your $82,700?"
- **THE TIME PRESSURE** (10% chance): "I don't have time for this. Can you just email me the offer?"
- **THE AUTHORITY OBJECTION** (10% chance): "My attorney says I shouldn't sign without him reviewing it first."

### 3. Energy Mirroring (Negative) - Level 10 Requirement

If the rep is **not at Level 10 energy**, the AI becomes **bored and distracted**:
- Makes distracted noises: paper shuffling, muttering, phone beeping
- Uses dismissive language: "I'm not really feeling this conversation anymore."
- Forces rep to regain attention: "You need to pick up the energy. I'm about to hang up if you don't show me some enthusiasm."

**If rep reaches Level 10 energy**, AI immediately becomes engaged: "Okay, NOW I'm listening. That's the energy I needed to hear."

### 4. Financial Mastery Challenge - Local Market Data Mocking

The AI challenges ARV and ROI with **specific local market data**:
- "In [location], I've seen similar houses sell for $[X]. You said the ARV is $[Y]. What makes you think this one is worth less?"
- "I've gotten quotes from local contractors. A new roof costs $[X], not the $[Y] you're estimating."

**If rep stumbles on $82,700 math**, AI mocks:
- "I thought you were a professional investor, but you can't even explain your own numbers. That's embarrassing."
- "You're asking me to take $82,700, but you can't even tell me how you got there. That doesn't inspire confidence."

## Future Enhancements

- [ ] UI toggle in Gauntlet page for Apex/Battle-Test Mode
- [ ] Real-time conviction score display in HUD
- [ ] Energy level meter visualization
- [ ] Apex Level analytics dashboard
- [ ] Customizable objection injection rates
- [ ] Apex Level leaderboard
- [ ] Rep-specific Apex Level recommendations
