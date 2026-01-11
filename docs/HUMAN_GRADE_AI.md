# Human-Grade Sales Professional AI

## Overview

The AI has been upgraded from a "Bot" to a "Human-Grade Sales Professional" with advanced human-like behaviors including disfluency logic, emotional mirroring, psychological callbacks, and strategic silence.

## Features

### 1. Disfluency Engine

**Configuration:**
- `DISFLUENCY_WEIGHT = 0.15` (15% chance of disfluency injection)

**Behavior:**
- Automatically injects natural disfluencies before rebuttals to objections:
  - "Uh, well..." (most common)
  - "Well, you know..." (for softer objections)
  - "Hmm, let me think about that..." (for complex objections)
  - "Actually, you know what..." (for confident rebuttals)

**Examples:**
- Seller: "That price is too low." 
  AI: "Uh, well... I understand your concern, but let me explain..."
- Seller: "I need more time."
  AI: "Well, you know... I hear you, and here's why timing matters..."

**Implementation:**
- Configured in `src/lib/vapiConfig.ts`
- Integrated into system prompt via `getDisfluencyInstructions()`
- `fillersEnabled: true` in Vapi assistant configuration

### 2. Sentiment-to-Voice Mapping

**Integration:**
- Analyzes user sentiment from transcript (Deepgram or keyword detection)
- Adjusts Vapi voice settings based on sentiment

**Voice Adjustments for Negative Sentiment:**
- When user is angry/frustrated:
  - `stability: 0.6` (calm, steady voice)
  - `clarity: 0.8` (via similarityBoost)
  - `style: 0.05` (professional, not overly expressive)
  - Result: "Calmly authoritative" tone

**Sentiment Detection:**
- Uses keyword detection from transcript
- Categories: `positive`, `neutral`, `negative`, `angry`, `frustrated`
- Function: `analyzeSentimentFromTranscript()` in `vapiConfig.ts`

**Implementation:**
- `getVoiceSettingsFromSentiment()` adjusts voice parameters
- Integrated into `getVoiceSettings()` to override gate-based settings
- Can be passed to `getCentralizedAssistantConfig()`

### 3. Psychological Memory Buffer

**Purpose:**
- Stores the 3 most "Emotional Keywords" mentioned by the rep
- Examples: "moving," "foreclosure," "inheritance," "divorce," "job loss"

**Functionality:**
- Extracts emotional keywords from transcript
- Tracks emotional weight (0-1) for each keyword
- Maintains top 3 keywords by emotional weight

**Presentation Phase Integration:**
- During Gate 4 (The Offer - Presentation Phase), AI must reference at least ONE emotional keyword
- Builds deep-level rapport by showing active listening
- Examples:
  - "Since you mentioned you're moving to Florida, this offer gives you the flexibility to..."
  - "I know you mentioned the foreclosure situation, and this offer can help you avoid..."

**Implementation:**
- `src/lib/contextBuffer.ts` - `ContextBuffer` class
- `extractEmotionalKeywords()` - Analyzes transcript for emotional patterns
- `getPresentationPhaseInstruction()` - Generates prompt instruction

**Usage:**
```typescript
import { getContextBuffer } from '@/lib/contextBuffer';

const buffer = getContextBuffer();
const keywords = buffer.extractEmotionalKeywords(transcript, currentTimeSeconds);
buffer.addKeywords(keywords);

// Get instruction for system prompt
const instruction = buffer.getPresentationPhaseInstruction();
```

### 4. Silence as a Weapon - Dramatic Pause

**Behavior:**
- After saying "$82,700" or "eighty-two thousand seven hundred dollars":
  1. Say the price with complete confidence and authority
  2. Immediately stop talking for exactly 4.5 seconds
  3. Do NOT speak again until the seller breaks the silence
  4. Let the silence create psychological pressure

**Purpose:**
- Demonstrates confidence
- Gives seller space to process
- Creates psychological pressure
- Power move in closing

**Example:**
```
AI: "Based on everything we've discussed, I can offer you $82,700 cash."
[4.5 SECOND SILENCE - AI DOES NOT SPEAK]
Seller: [Will likely respond with objection, question, or acceptance]
AI: [Then responds based on their reaction]
```

**Implementation:**
- System prompt instruction via `getDramaticPauseInstruction()`
- Note: Actual 4.5-second pause may need to be implemented via Vapi's pause functionality or SSML if supported

## Integration Points

### System Prompt
All features are integrated into the system prompt via:
- `getDisfluencyInstructions()`
- `getDramaticPauseInstruction()`
- `getPresentationPhaseInstruction()` (from ContextBuffer)

### Voice Configuration
Sentiment-based voice adjustments are integrated into:
- `getVoiceSettings()` - Accepts optional `userSentiment` parameter
- `getVoiceSettingsFromSentiment()` - Returns sentiment-adjusted settings
- `getCentralizedAssistantConfig()` - Can accept `userSentiment` parameter

### Context Buffer
Emotional keywords are tracked via:
- `ContextBuffer` class in `src/lib/contextBuffer.ts`
- Singleton instance via `getContextBuffer()`
- Keywords extracted during call and injected into system prompt

## Configuration

### Disfluency Weight
Edit `DISFLUENCY_WEIGHT` in `src/lib/vapiConfig.ts`:
```typescript
export const DISFLUENCY_WEIGHT = 0.15; // 15% chance
```

### Sentiment Detection
Customize sentiment keywords in `analyzeSentimentFromTranscript()`:
- Angry keywords
- Frustrated keywords
- Negative keywords
- Positive keywords

### Emotional Keyword Patterns
Customize patterns in `ContextBuffer.extractEmotionalKeywords()`:
- Moving/Relocation patterns
- Financial stress patterns
- Inheritance/Probate patterns
- Divorce/Separation patterns
- Job loss patterns
- Health issues patterns
- Family changes patterns
- Time pressure patterns
- Property issues patterns
- Emotional states patterns

## Best Practices

1. **Disfluency**: Use strategically - more for emotional objections, less for transactional questions
2. **Sentiment Mapping**: Monitor sentiment throughout call and adjust voice settings dynamically
3. **Emotional Keywords**: Extract keywords early in call (Gate 1-2) for use in Presentation Phase (Gate 4)
4. **Dramatic Pause**: Only use after presenting the $82,700 price - don't overuse silence

## Future Enhancements

1. **Real-time Sentiment Analysis**: Integrate Deepgram Sentiment API for real-time analysis
2. **SSML Pause**: Implement actual 4.5-second pause via SSML or Vapi pause functionality
3. **Dynamic Disfluency**: Adjust disfluency weight based on call context and seller personality
4. **Keyword Weighting**: Improve emotional keyword extraction with ML-based weighting
