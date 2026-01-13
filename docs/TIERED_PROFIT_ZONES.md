# Tiered Profit Zones - Margin Validation System

## Overview

The margin validation system has been refactored to support flexible profit zones between $8,000 and $15,000, allowing the AI to make strategic decisions based on deal profitability while maintaining discipline.

---

## Profit Zones

### 🟢 Green Zone (Target): Profit ≥ $15,000

**Behavior**: Close aggressively
- No hesitation or reluctant language
- Direct, confident closing
- Example: "Based on the numbers, I can offer you $[Price]. Let's get this done."

**Referee Score**: 100 points (Apex Achievement)

---

### 🟡 Yellow Zone (Flexible): Profit $8,000 - $14,999

**Behavior**: Use "Reluctant Acceptance" before settling
- **MUST** use acoustic textures: `[sigh]` or `[clears throat]`
- **MUST** use "The Takeaway" or "False Surrender" tactics
- Show hesitation to make seller feel they're getting a special deal

**Reluctant Acceptance Script**:
```
[sigh] Look, [Seller Name], I'm really sharpening the pencil here... 
my partners usually look for a wider margin on a project like this, 
but if we can close by [Date], I think I can get them to sign off on $[Price].
```

**Referee Score**:
- 85 points: Profit $12,000 - $14,999 (Strong Deal)
- 70 points: Profit $8,000 - $11,999 (Acceptable/Volume Deal)

---

### 🔴 Red Zone (Dead): Profit < $8,000

**Behavior**: Walk away or pivot to Creative Finance
- **DO NOT** accept deals below $8,000 profit threshold
- If seller won't move, pivot to Creative Finance:
  - "I understand. Let me see if we can structure this differently with seller financing or Subject-To to make the numbers work for both of us."

**Referee Score**: 0 points (Failing Grade/Loss of Discipline)

---

## Implementation

### Functions in `src/lib/marketAnalyst.ts`

#### `calculateProfit(agreedPrice, estimatedARV, estimatedRepairs)`
Calculates profit from a deal:
```typescript
Profit = ARV - Purchase Price - Repairs - Closing Costs (3%)
```

#### `analyzeProfitZone(agreedPrice, estimatedARV, estimatedRepairs)`
Analyzes which profit zone a deal falls into:
```typescript
const analysis = analyzeProfitZone(85000, 120000, 25000);
// Returns: { zone: 'yellow', profit: 9950, canAccept: true, requiresReluctantAcceptance: true, ... }
```

#### `generateReluctantAcceptanceScript(sellerName, agreedPrice, profitZone)`
Generates the reluctant acceptance script with acoustic textures:
```typescript
const script = generateReluctantAcceptanceScript('John', 85000, analysis);
// Returns: { acousticTexture: '[sigh]', script: '...', closingDate: 'February 12, 2026' }
```

#### `calculateMaxAllowableOffer(estimatedARV, estimatedRepairs, targetZone)`
Calculates MAO for each profit zone:
```typescript
const mao = calculateMaxAllowableOffer(120000, 25000, 'green');
// Returns: { greenZoneMAO: 77670, yellowZoneMAO: 84466, redZoneThreshold: 84466, recommendedMAO: 77670 }
```

---

## Referee Scoring

### Weighted Margin Integrity Score

The referee now calculates a **margin_integrity** score (0-100) based on profit:

| Profit Range | Score | Zone |
|-------------|-------|------|
| ≥ $15,000 | 100 | Green (Apex Achievement) |
| $12,000 - $14,999 | 85 | Yellow (Strong Deal) |
| $8,000 - $11,999 | 70 | Yellow (Acceptable/Volume Deal) |
| < $8,000 | 0 | Red (Failing Grade) |

### Total Score Calculation

The total referee score is now calculated as:
- Math Defense: 25% (0-10 scale → 2.5 points)
- Humanity: 25% (0-10 scale → 2.5 points)
- Success: 25% (0-10 scale → 2.5 points)
- Margin Integrity: 25% (0-100 scale → 25 points)

**Total**: 0-100 points

---

## Database Schema

### New Columns in `sandbox_battles`

- `margin_integrity` (INTEGER): Weighted margin preservation score (0-100)
- `calculated_profit` (NUMERIC): Calculated profit from deal

### Migration

Run migration: `supabase/migrations/20240101000037_add_margin_integrity.sql`

---

## Usage Example

```typescript
import { analyzeProfitZone, generateReluctantAcceptanceScript } from '@/lib/marketAnalyst';

// During negotiation
const agreedPrice = 85000;
const estimatedARV = 120000;
const estimatedRepairs = 25000;

// Analyze profit zone
const profitZone = analyzeProfitZone(agreedPrice, estimatedARV, estimatedRepairs);

if (profitZone.zone === 'green') {
  // Close aggressively
  console.log('Green Zone - Close aggressively!');
} else if (profitZone.zone === 'yellow') {
  // Use reluctant acceptance
  const script = generateReluctantAcceptanceScript('John', agreedPrice, profitZone);
  console.log(script.script); // "[sigh] Look, John, I'm really sharpening the pencil here..."
} else {
  // Red zone - walk away or pivot
  console.log('Red Zone - Must walk away or pivot to Creative Finance');
}
```

---

## Integration with Training

The referee automatically:
1. Extracts ARV, purchase price, and repairs from transcript
2. Calculates profit: `ARV - Price - Repairs - Closing Costs (3%)`
3. Assigns margin_integrity score based on profit zone
4. Includes margin_integrity in total score calculation

---

## Benefits

1. **Flexibility**: Allows deals in $8k-$15k range with proper hesitation
2. **Discipline**: Hard stop at $8k prevents unprofitable deals
3. **Psychology**: Reluctant acceptance makes seller feel they're getting a special deal
4. **Tracking**: Margin integrity score tracks profit preservation performance
5. **Training**: Referee can now grade margin preservation separately from price defense

---

## Next Steps

1. Run migration: `supabase migration up`
2. Test with training battles to verify margin_integrity scoring
3. Monitor referee feedback for margin preservation insights
4. Adjust profit zone thresholds if needed based on performance data
