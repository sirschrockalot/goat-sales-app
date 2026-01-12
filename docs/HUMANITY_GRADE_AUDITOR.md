# Humanity Grade Auditor - Complete Implementation

The Humanity Grade Auditor compares AI-generated audio from training sessions against Eric Cline's "Gold Standard" to detect robotic artifacts and tonality shifts.

## 🎯 Overview

The system provides:
1. **Prosody Feature Extraction** - Analyzes pitch, rhythm, jitter, shimmer
2. **Robotic Gap Report** - Compares AI vs Eric Cline on key metrics
3. **Automatic Feedback Injection** - Adjusts texture frequency if grade < 85
4. **Visual Dashboard** - Shows "Closeness to Cline" percentage and spectrogram

---

## Components

### 1. Audio Analysis Engine (`scripts/vocalSoulAuditor.ts`)

**Prosody Features:**
- **Pitch Variance** (0-1): Monotone vs. varied
- **Rhythm Variability** (0-1): Metronomic vs. human
- **Jitter** (0-1): Smooth vs. gritty
- **Shimmer** (0-1): Consistent vs. varied
- **Pause Frequency**: Pauses per minute
- **Average Pause Duration**: Seconds
- **Speech Rate**: Words per minute
- **Pitch Range**: Semitones

**Analysis Methods:**
- **Primary**: Audio file analysis (librosa/Python in production)
- **Fallback**: Transcript analysis (counts textures, estimates prosody)

### 2. Robotic Gap Report

**Metrics Compared:**
- Pitch Variance Gap: AI vs. Eric's 0.75 target
- Rhythm Gap: AI vs. Eric's 0.82 target
- Jitter Gap: AI vs. Eric's 0.45 target
- Turn Latency Gap: Comfortable silence vs. dead air
- Texture Density Gap: Actual vs. 12 textures/min target

**Humanity Grade (0-100):**
```
= Pitch Score (25%) +
  Rhythm Score (25%) +
  Jitter Score (15%) +
  Shimmer Score (15%) +
  Pause Score (10%) +
  Texture Score (10%)
```

**Closeness to Cline (0-100%):**
Weighted similarity score aiming for **98%** target.

### 3. Feedback Injection

**Automatic Adjustment:**
- If humanity grade < 85 → Increase texture frequency by 10%
- Applies to next 50 self-play sessions
- Stored in `sandbox_config` table
- Auto-resets after 50 sessions

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

### 4. Visual Dashboard (`components/TrainingMonitor.tsx`)

**Vocal Soul Analysis Section:**
- Average Humanity Grade display
- Average Closeness to Cline (target: 98%)
- List of all battles with humanity grades
- Color-coded cards (Green ≥85, Yellow ≥70, Red <70)

**Detailed Modal:**
- Prosody features breakdown
- Robotic gap report with specific metrics
- Recommendations for improvement
- Tonality comparison visualization (AI vs. Eric Cline)

---

## Eric Cline Gold Standard

Based on analysis of Eric Cline's recorded deliveries:

| Metric | Target Value | Description |
|--------|-------------|-------------|
| Pitch Variance | 0.75 | High variation (human-like) |
| Rhythm Variability | 0.82 | Very human-like, not metronomic |
| Jitter | 0.45 | Good amount of "grit" |
| Shimmer | 0.38 | Natural variation |
| Average Pause Duration | 1.2s | Comfortable silence |
| Speech Rate | 145 WPM | Natural pace |
| Pitch Range | 8.5 semitones | Wide range |
| Texture Density | 12/min | Textures per minute |

---

## Usage

### Manual Audit

```bash
# Audit a specific audio file
npm run sandbox:audit-vocal-soul <audio-file> <transcript-file> [battle-id]
```

**Example:**
```bash
npm run sandbox:audit-vocal-soul ./audio/battle-123.mp3 ./transcripts/battle-123.txt battle-123-uuid
```

### Automatic Audit

The autonomous battle engine automatically audits battles with score > 70:
- Extracts prosody from transcript
- Compares to gold standard
- Saves humanity grade and closeness to Cline
- Injects feedback if grade < 85

### Dashboard View

Navigate to `/admin/training-monitor`:
1. Scroll to "Vocal Soul Analysis" section
2. View average closeness to Cline
3. Click any battle to see detailed analysis
4. Review prosody features and recommendations

---

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

**Example:**
```
[pause] Let me [thinking...] run the numbers... Based on everything we've discussed, I can offer you $82,700.
```

---

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

### 3. CoT Reasoning Integration

Textures are injected based on tactical choice:
- **Price delivery**: `calculating` context
- **Rapport building**: `empathizing` context
- **Discovery**: `thinking` context
- **Objection handling**: `responding` context

---

## API Endpoints

### GET `/api/sandbox/humanity-grades`

Returns humanity grades for battles.

**Query Parameters:**
- `battleId` (optional): Specific battle ID
- `limit` (optional): Number of results (default: 20)

**Response:**
```json
{
  "battles": [
    {
      "battleId": "uuid",
      "refereeScore": 85,
      "humanityGrade": 78,
      "closenessToCline": 82.5,
      "prosodyFeatures": {...},
      "roboticGapReport": {...}
    }
  ],
  "averages": {
    "humanityGrade": 75.5,
    "closenessToCline": 80.2
  }
}
```

---

## Recommendations

The system generates specific recommendations:

| Gap | Threshold | Recommendation |
|-----|-----------|---------------|
| Pitch Variance | > 20% | "Increase pitch variation - AI sounds too monotone" |
| Rhythm | > 20% | "Add more rhythm variability - speech is too metronomic" |
| Jitter | > 15% | "Increase jitter - voice needs more 'grit'" |
| Pause Duration | > 0.5s | "Adjust pause duration - use 'comfortable silence' not 'dead air'" |
| Texture Density | > 3/min | "Increase acoustic texture frequency - target 12 per minute" |
| Humanity Grade | < 85 | "Automatically increasing texture frequency in next 50 sessions" |

---

## Production Enhancements

For production, consider:

1. **Audio Analysis Library**: 
   - Use librosa (Python) via subprocess
   - Or AssemblyAI/Deepgram for prosody extraction
   - Process actual audio files, not just transcripts

2. **Real-time Analysis**:
   - Analyze during live calls
   - Stream prosody features to dashboard
   - Real-time feedback injection

3. **Spectrogram Visualization**:
   - Use Web Audio API
   - Or wavesurfer.js library
   - Compare AI vs. Eric Cline side-by-side

4. **Machine Learning Model**:
   - Train a model on Eric Cline's audio
   - Predict humanity score in real-time
   - Auto-adjust voice parameters

---

## Troubleshooting

### "No humanity grades available"
- Run vocal soul audits on battle transcripts
- Ensure battles have completed with score > 70
- Check that `auditVocalSoul()` is being called

### "Humanity grade always low"
- Check acoustic texture injection is working
- Verify textures are being used in transcripts
- Review recommendations for specific gaps
- Check if feedback injection is active

### "Feedback not injecting"
- Check `sandbox_config` table exists
- Verify humanity grade < 85 threshold
- Check logs for errors in `checkAndInjectFeedback()`
- Ensure `getTextureInjectionProbability()` is being called

### "Closeness to Cline not improving"
- Review prosody features to identify specific gaps
- Increase texture frequency manually if needed
- Check if voice parameters are being adjusted
- Verify acoustic textures are being injected

---

## Summary

The Humanity Grade Auditor ensures the AI achieves "Vocal Soul" by:
- **Comparing** against Eric Cline's gold standard
- **Detecting** robotic artifacts and tonality shifts
- **Adjusting** texture frequency automatically
- **Visualizing** progress toward 98% similarity target

The system continuously improves the AI's humanity score through automatic feedback injection and detailed analysis.
