# Vocal Soul Auditor - Humanity Grade System

The Vocal Soul Auditor compares AI-generated audio from training sessions against Eric Cline's "Gold Standard" to detect robotic artifacts and tonality shifts.

## Overview

The system analyzes prosody features, generates a "Robotic Gap" report, and automatically adjusts acoustic texture frequency if humanity grade falls below 85/100.

## Components

### 1. Audio Analysis Engine (`scripts/vocalSoulAuditor.ts`)

**Prosody Features Extracted:**
- **Pitch Variance** (0-1): Higher = more variation (human-like)
- **Rhythm Variability** (0-1): Higher = less metronomic (human-like)
- **Jitter** (0-1): Higher = more "grit" (human-like)
- **Shimmer** (0-1): Higher = more variation (human-like)
- **Pause Frequency**: Pauses per minute
- **Average Pause Duration**: Seconds
- **Speech Rate**: Words per minute
- **Pitch Range**: Semitones

**Analysis Methods:**
- **Primary**: Audio file analysis (would use librosa/Python or specialized API in production)
- **Fallback**: Transcript analysis (counts textures, pauses, estimates prosody)

### 2. Robotic Gap Report

Compares AI performance against Eric Cline Gold Standard:

**Metrics:**
- **Pitch Variance Gap**: Difference from Eric's 0.75 target
- **Rhythm Gap**: Difference from Eric's 0.82 target
- **Jitter Gap**: Difference from Eric's 0.45 target
- **Turn Latency Gap**: Difference in pause duration (comfortable silence vs dead air)
- **Texture Density Gap**: Actual textures/min vs target (12/min)

**Humanity Grade Calculation:**
```
Humanity Grade = 
  Pitch Score (25%) +
  Rhythm Score (25%) +
  Jitter Score (15%) +
  Shimmer Score (15%) +
  Pause Score (10%) +
  Texture Score (10%)
```

**Closeness to Cline:**
Weighted average of all gaps, converted to 0-100% similarity score.

### 3. Feedback Injection

**Automatic Adjustment:**
- If humanity grade < 85, automatically increases acoustic texture frequency by 10%
- Applies to next 50 self-play sessions
- Stored in `sandbox_config` table
- Automatically resets after 50 sessions

**Configuration:**
```json
{
  "key": "acoustic_texture_frequency",
  "value": {
    "base": 0.3,
    "adjusted": 0.4,
    "sessionsRemaining": 50,
    "reason": "Humanity grade 78 below 85"
  }
}
```

### 4. Visual Dashboard

**Training Monitor Integration:**
- **Vocal Soul Analysis Section**: Shows all battles with humanity grades
- **Average Closeness to Cline**: Target 98% similarity
- **Humanity Grade Cards**: Color-coded (Green ≥85, Yellow ≥70, Red <70)
- **Detailed Modal**: Shows prosody features, robotic gap report, recommendations
- **Tonality Comparison**: Visual bar showing AI vs Eric Cline

## Eric Cline Gold Standard

Based on analysis of Eric Cline's recorded deliveries:

```typescript
{
  pitchVariance: 0.75,        // High variation
  rhythmVariability: 0.82,     // Very human-like, not metronomic
  jitter: 0.45,                // Good amount of "grit"
  shimmer: 0.38,               // Natural variation
  averagePauseDuration: 1.2,   // Comfortable silence
  speechRate: 145,             // Words per minute
  pitchRange: 8.5,             // Semitones
  textureDensityTarget: 12    // Textures per minute
}
```

## Usage

### Manual Audit

```bash
# Audit a specific audio file
npm run sandbox:audit-vocal-soul <audio-file> <transcript-file> [battle-id]
```

### Automatic Audit

The autonomous battle engine automatically audits battles with score > 70:
- Extracts prosody features from transcript
- Compares to gold standard
- Saves humanity grade and closeness to Cline
- Injects feedback if grade < 85

### Dashboard View

Navigate to `/admin/training-monitor`:
- View all battles with humanity grades
- See average closeness to Cline
- Click any battle to see detailed analysis
- View prosody features and recommendations

## Price Delivery Analysis

Specifically analyzes the $82,700 offer delivery:

**Metrics:**
- **Price Delivery Score** (0-100)
- **Tonality Match** (0-100): Does it sound certain?
- **Pause Pattern** (0-100): Comfortable silence before price?
- **Certainty Level** (0-100): No hesitation or questioning?

**Eric Cline Style:**
- Pause before price: `[pause]` or `[thinking...]`
- Absolute certainty: No "maybe", "perhaps", "I think"
- Natural texture: `[uh]` or `[well...]` for human touch

## Recommendations

The system generates specific recommendations:

- **Pitch Variance Gap > 20%**: "Increase pitch variation - AI sounds too monotone"
- **Rhythm Gap > 20%**: "Add more rhythm variability - speech is too metronomic"
- **Jitter Gap > 15%**: "Increase jitter - voice needs more 'grit' and natural variation"
- **Pause Duration Gap > 0.5s**: "Adjust pause duration - use 'comfortable silence' not 'dead air'"
- **Texture Density Gap > 3**: "Increase acoustic texture frequency - target 12 per minute"
- **Humanity Grade < 85**: "Humanity grade below 85 - automatically increasing texture frequency"

## Integration Points

### 1. Autonomous Battles

After each battle completes:
```typescript
if (score.totalScore > 70) {
  const auditResult = await auditVocalSoul('', transcript, battleId);
  if (auditResult.humanityGrade < 85) {
    await checkAndInjectFeedback(auditResult.humanityGrade);
  }
}
```

### 2. Acoustic Texture Injection

Uses dynamic probability from config:
```typescript
const probability = await getTextureInjectionProbability();
// Returns: 0.3 (base) or 0.4 (adjusted) based on feedback injection
```

### 3. Dashboard Display

Fetches humanity grades via API:
```typescript
GET /api/sandbox/humanity-grades?limit=20
```

## Production Enhancements

For production, consider:

1. **Audio Analysis Library**: Use librosa (Python) or AssemblyAI/Deepgram for accurate prosody extraction
2. **Real Audio Files**: Process actual audio recordings, not just transcripts
3. **Spectrogram Visualization**: Use Web Audio API or a library like wavesurfer.js
4. **Real-time Analysis**: Analyze during live calls, not just post-call

## Troubleshooting

### "No humanity grades available"
- Run vocal soul audits on battle transcripts
- Ensure battles have completed with score > 70

### "Humanity grade always low"
- Check acoustic texture injection is working
- Verify textures are being used in transcripts
- Review recommendations for specific gaps

### "Feedback not injecting"
- Check `sandbox_config` table exists
- Verify humanity grade < 85 threshold
- Check logs for errors

---

## Summary

The Vocal Soul Auditor ensures the AI achieves "Vocal Soul" - the perfect balance of human authenticity and tactical precision. By comparing against Eric Cline's gold standard and automatically adjusting texture frequency, the system continuously improves the AI's humanity score toward the 98% target.
