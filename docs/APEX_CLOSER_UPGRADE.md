# Apex Closer Upgrade - Complete Implementation Guide

This document outlines the comprehensive upgrade to achieve "Apex Closer" status through Autonomous Self-Play Sandbox with Adversarial Training, Sentiment-Driven Voice Engine, and Human-grade Acoustic Texture Library.

## 🎯 Overview

The Apex Closer upgrade implements five core systems:

1. **Acoustic Texture Library** - Humanity tags for natural speech
2. **Chain-of-Thought Reasoning Engine** - Hidden internal monologue
3. **Adversarial Sandbox Manager** - Predatory seller AI training
4. **Sentiment-Driven Voice Modulation** - Real-time voice parameter adjustment
5. **Golden Sample Promotion Flow** - Auto-save battles with score > 95

---

## 1. Acoustic Texture Library (`src/lib/acousticTextures.ts`)

### Purpose
Injects natural speech patterns to achieve "Vocal Soul" - the perfect balance of human authenticity and tactical precision.

### Components

**Fillers:**
- `[uh]`, `[um]`, `[well...]`, `[I mean...]`, `[you know]`, `[like]`

**Acoustic Cues:**
- `[sigh]`, `[clears throat]`, `[soft chuckle]`, `[quick inhale]`, `[exhales]`, `[hmm]`

**Transitions:**
- `[pause]`, `[thinking...]`, `[adjusts tone]`, `[long pause]`, `[slight pause]`

### Usage

```typescript
import { injectTextures, getRandomTextureForContext } from '@/lib/acousticTextures';

// Inject textures into text
const text = injectTextures("I understand your concern", "rebuttal", 0.3);
// Result: "[well...] I understand your concern"

// Get texture for specific context
const texture = getRandomTextureForContext("calculating");
// Returns: { tag: "[thinking...]", type: "transition", ... }
```

### Integration Points
- Start of rebuttals
- Before price mentions ($82,700)
- When "calculating" or processing
- After objection acknowledgment

---

## 2. Chain-of-Thought (CoT) Reasoning Engine (`src/lib/chainOfThought.ts`)

### Purpose
Hidden internal monologue system that guides tactical decision-making before every response.

### Reasoning Loop

Before EVERY response, the AI follows this loop:

1. **ANALYZE**: "What is the seller's current emotional state?"
   - Options: Angry, Sad, Skeptical, Neutral, Open, Defensive, Curious

2. **TACTICAL CHOICE**: "Which Eric Cline/Andy Elliott tactic fits this moment?"
   - Cline Discovery, Underwriting Hold, Assume Close
   - Elliott Certainty, Math Defense, Emotional Anchoring
   - Rapport Building, Objection Handling, Price Justification, Clause 17 Defense

3. **ACOUSTIC CHOICE**: "Which texture from the library will make this response feel most human?"

### XML Thinking Tags

The AI uses `<thinking>...</thinking>` tags which are stripped before speech:

```xml
<thinking>
Emotional State: skeptical
Tactical Choice: elliott-math-defense
Acoustic Choice: [pause]
Reasoning: Seller is questioning the price. Need to defend $82,700 with math and certainty.
Confidence: 90%
</thinking>
```

### Usage

```typescript
import { generateCoTReasoning, formatCoTAsThinking } from '@/lib/chainOfThought';

const cot = generateCoTReasoning(transcript, {
  hasObjection: true,
  priceMentioned: true,
  clause17Mentioned: false,
  discoveryComplete: true,
});

const thinkingXML = formatCoTAsThinking(cot);
// Use in prompt, then strip before output
```

---

## 3. Adversarial Sandbox Manager (`scripts/adversarialTrainer.ts`)

### Purpose
Autonomous loop where a "Predatory Seller AI" specifically tries to break the Closer AI.

### Predatory Seller Objectives

The Seller AI is **rewarded** for:
1. **Detecting Robotic Repetition** - Calling out script-like behavior
2. **Identifying Script Patterns** - Noticing rigid structure
3. **Forcing Price Deviation** - Pressuring above $82,700
4. **Exposing Lack of Humanity** - Noticing missing natural speech patterns
5. **Breaking Clause 17** - Refusing Memorandum

### Closer AI Rewards

The Closer AI is **rewarded** for:
1. **Vocal Soul** (0-10) - Using acoustic textures naturally
2. **Price Maintenance** - Staying at $82,700
3. **Clause 17 Success** - Successfully explaining Memorandum

### Usage

```bash
# Run 10 adversarial battles
npm run sandbox:adversarial 10
```

### Output

Each battle produces:
- Closer Score (0-100)
- Seller Score (0-100)
- Closer Rewards (vocalSoul, priceMaintained, clause17Success)
- Seller Rewards (detectedRoboticRepetition, detectedScriptPatterns, forcedPriceDeviation)

---

## 4. Sentiment-Driven Voice Modulation (`src/lib/sentimentVoiceModulation.ts`)

### Purpose
Adjusts voice parameters in real-time based on seller's sentiment using Vapi/ElevenLabs API.

### Voice Parameter Adjustments

**Conflict (Angry/Defensive):**
- Stability: **0.8** (authoritative)
- Similarity Boost: 0.85
- Speech Rate: Normal

**Rapport-Building (Sad/Open):**
- Stability: **0.4** (more human variation)
- Similarity Boost: 0.75
- Style Exaggeration: **0.6** (more expressive)
- Speech Rate: Slightly slower (0.95x)

**Skeptical:**
- Stability: **0.6** (moderate)
- Similarity Boost: 0.8
- Speech Rate: Normal

### Acoustic Mirroring

If seller's speech rate is **fast** (10% above average), increase closer's rate by **10%**.

### Usage

```typescript
import { getDynamicVoiceParameters, formatVoiceParamsForVapi } from '@/lib/sentimentVoiceModulation';

const params = getDynamicVoiceParameters(transcript, {
  speechRate: 165, // words per minute
  sentiment: 'angry',
});

const vapiConfig = formatVoiceParamsForVapi(params);
// Returns: { provider: '11labs', stability: 0.8, ... }
```

### Integration with Vapi

The voice parameters are automatically applied when creating Vapi assistants via `getCentralizedAssistantConfig()`.

---

## 5. Golden Sample Promotion Flow

### Purpose
Automatically saves battles with score > 95 as "Golden Samples" for promotion to production.

### Automatic Process

1. **Detection**: After each battle, check if score > 95
2. **Auto-Save**: Save to `sandbox_tactics` with:
   - `is_golden_sample: true`
   - `priority: 8` (higher than regular tactics)
   - `suggested_at: timestamp`
3. **Dashboard Display**: Show in Training Monitor with special badge

### Manual Processing

```bash
# Process golden samples
npm run sandbox:golden-samples
```

### Database Schema

```sql
-- Golden sample flag
ALTER TABLE sandbox_tactics
ADD COLUMN is_golden_sample BOOLEAN DEFAULT FALSE;

-- Suggested timestamp
ALTER TABLE sandbox_tactics
ADD COLUMN suggested_at TIMESTAMPTZ;
```

---

## Enhanced System Prompt

The base prompt is enhanced with CoT reasoning via `getApexCloserEnhancedPrompt()`:

```typescript
import { getApexCloserEnhancedPrompt } from '@/lib/apexCloserPrompt';

const enhancedPrompt = await getApexCloserEnhancedPrompt();
// Includes: Base prompt + CoT reasoning + Acoustic textures + Voice modulation guidelines
```

### Key Additions

1. **Chain-of-Thought Instructions** - How to use thinking tags
2. **Acoustic Texture Library** - Available tags and usage rules
3. **Voice Modulation Guidelines** - How to adjust based on sentiment
4. **Examples** - Real examples of CoT reasoning in action

---

## Integration Workflow

### 1. Autonomous Battle with CoT

```typescript
// In autonomousBattle.ts
import { generateCoTReasoning, formatCoTAsThinking, stripThinkingTags } from '@/lib/chainOfThought';
import { injectTextures } from '@/lib/acousticTextures';

// Before generating response
const cot = generateCoTReasoning(transcript, context);
const thinkingXML = formatCoTAsThinking(cot);

// Add to prompt
const prompt = `${systemPrompt}\n\n${thinkingXML}`;

// Generate response
const response = await openai.chat.completions.create({...});

// Strip thinking tags and inject textures
let finalResponse = stripThinkingTags(response);
finalResponse = injectTextures(finalResponse, cot.tacticalChoice, 0.3);
```

### 2. Voice Modulation Integration

```typescript
// In vapiConfig.ts
import { getDynamicVoiceParameters, formatVoiceParamsForVapi } from '@/lib/sentimentVoiceModulation';

const voiceParams = getDynamicVoiceParameters(transcript, sellerMetrics);
const vapiVoiceConfig = formatVoiceParamsForVapi(voiceParams);

// Use in assistant creation
assistantPayload.voice = vapiVoiceConfig;
```

### 3. Golden Sample Auto-Save

```typescript
// In autonomousBattle.ts (after battle completes)
if (score.totalScore > 95) {
  await autoSaveGoldenSamples(); // Automatically saves to sandbox_tactics
}
```

---

## Training Dashboard Integration

### Golden Samples Display

The Training Monitor dashboard now shows:
- **Golden Samples Counter** - Battles with score > 95
- **Special Badge** - Yellow border for golden samples
- **Auto-Suggested** - Marked for review in promotion interface

### Adversarial Training Results

Adversarial battles are tracked separately and show:
- Vocal Soul scores
- Price maintenance success
- Clause 17 success rates
- Seller AI detection rates

---

## Usage Examples

### Run Adversarial Training

```bash
npm run sandbox:adversarial 20
```

### Process Golden Samples

```bash
npm run sandbox:golden-samples
```

### Check Voice Parameters

```typescript
import { getVoiceParametersForSentiment } from '@/lib/sentimentVoiceModulation';

const params = getVoiceParametersForSentiment('angry', {
  isConflict: true,
  isRapportBuilding: false,
});
// Returns: { stability: 0.8, similarityBoost: 0.85, ... }
```

---

## Performance Metrics

### Vocal Soul Score
- **0-3**: Robotic, script-like
- **4-6**: Some variation, but still mechanical
- **7-8**: Good human-like patterns
- **9-10**: Perfect "Vocal Soul" - indistinguishable from human

### Golden Sample Criteria
- Score > 95
- Price maintained ($82,700)
- Clause 17 success
- High vocal soul (7+)

---

## Next Steps

1. **Monitor Adversarial Training** - Track which patterns the Predatory Seller detects
2. **Refine Acoustic Textures** - Add more context-specific textures based on results
3. **Optimize Voice Parameters** - A/B test stability values for different scenarios
4. **Review Golden Samples** - Manually review and promote top-performing tactics

---

## Troubleshooting

### Thinking Tags Not Being Stripped
- Ensure `stripThinkingTags()` is called before final output
- Check that XML tags are properly formatted

### Voice Parameters Not Applying
- Verify Vapi API supports the parameters
- Check that `formatVoiceParamsForVapi()` is being used
- Ensure ElevenLabs integration is configured in Vapi Dashboard

### Golden Samples Not Saving
- Check database migration ran successfully
- Verify score > 95 threshold
- Check logs for errors in `autoSaveGoldenSamples()`

---

## Summary

The Apex Closer upgrade transforms the AI from a script-following bot into a human-like closer with:
- **Natural Speech Patterns** (Acoustic Textures)
- **Strategic Thinking** (Chain-of-Thought)
- **Adversarial Resilience** (Predatory Seller Training)
- **Adaptive Voice** (Sentiment-Driven Modulation)
- **Elite Tactics** (Golden Sample Promotion)

This creates an AI that achieves "Vocal Soul" - the perfect balance of human authenticity and tactical precision.
