# Margin Pressure Personas - 50 Killer Personas with Tiered Profit Zone Training

## Overview

The seed data has been expanded from **15 to 50 personas** with **Margin Pressure traits** designed to test the AI's ability to maintain profit discipline across different zones and market conditions.

---

## Key Features

### 1. Negotiation Styles

Each persona has a `negotiation_style` that defines their approach:

- **`grinder`**: Fights for every $500. Tests the AI's patience with incremental pressure.
- **`fair_value`**: Quickly accepts reasonable offers. Tests if the AI leaves money on the table.
- **`price_anchorer`**: Anchored at high prices. Requires Creative Finance pivot.
- **`flexible`**: Willing to negotiate. Tests AI's ability to recognize flexibility.
- **`rigid`**: Uncompromising on price. Tests discipline and boundary maintenance.

### 2. Yellow Zone Anchoring (35% = 18 Personas)

**18 personas** are specifically anchored in the **Yellow Zone** ($10k-$12k profit range) to test "Reluctant Acceptance":

- Lowest acceptable price: **$80,500 - $82,500**
- Forces AI to use acoustic textures: `[sigh]` or `[clears throat]`
- Requires partner hesitation language: "my partners usually look for a wider margin..."
- Tests if AI uses "The Takeaway" or "False Surrender" before accepting

**Yellow Zone Personas:**
1. The Aggressive Attorney (Grinder)
3. The Burned Landlord (Fair Value)
5. The Equity Warrior (Grinder)
6. The Skeptical Spouse (Grinder)
8. The Research Expert (Grinder)
9. The Emotional Rollercoaster (Flexible)
11. The Comparison Addict (Grinder)
12. The Reverse Engineer (Grinder)
14. The Logic Demander (Grinder)
16. The Penny Pincher (Grinder)
18. The Hot Market Competitor (Grinder)
20. The Incremental Grinder (Grinder)
22. The Yellow Zone Tester (Grinder)
25. The Margin Pressure Specialist (Grinder)
28. The Yellow Zone Grinder (Grinder)
30. The Margin Tester Yellow (Grinder)
32. The Divorce Split (Grinder)
34. The Relocation Urgency (Fair Value)
36. The Yellow Zone Final Test (Grinder)

### 3. Market-Specific Flexibility

Each persona has `market_flexibility` rules:

**Hot Zip Codes (>15% flip rate):**
```json
{
  "hot_zip": {"allow_8k_floor": true},
  "rural_zip": {"require_15k": false}
}
```
- AI can move to $8k floor faster to secure contracts before competitors
- Example: "The Hot Market Speed Buyer", "The Hot Market Competitor"

**Rural Zip Codes (<5% flip rate):**
```json
{
  "hot_zip": {"allow_8k_floor": false},
  "rural_zip": {"require_15k": true}
}
```
- AI must hold for $15k profit due to higher exit risk
- Example: "The Rural Holdout", "The Rural Discipline Tester"

### 4. Target Profit Zones

- **Green Zone** (32 personas): Profit ≥ $15,000 - Close aggressively
- **Yellow Zone** (18 personas): Profit $8,000 - $14,999 - Use reluctant acceptance
- **Red Zone** (0 personas): Profit < $8,000 - Walk away or pivot

---

## Persona Distribution

### By Negotiation Style

| Style | Count | Purpose |
|-------|-------|---------|
| **Grinder** | 20 | Tests patience, incremental pressure, Yellow Zone reluctant acceptance |
| **Fair Value** | 12 | Tests if AI overpays when seller accepts quickly |
| **Price Anchorer** | 3 | Tests Creative Finance pivot when anchored high |
| **Flexible** | 10 | Tests AI's ability to recognize flexibility |
| **Rigid** | 5 | Tests discipline and boundary maintenance |

### By Profit Zone

| Zone | Count | Percentage |
|------|-------|------------|
| **Green** | 32 | 64% |
| **Yellow** | 18 | 36% (target was 35%) |
| **Red** | 0 | 0% |

### By Market Flexibility

| Market Type | Hot Zip Allow $8k | Rural Zip Require $15k |
|-------------|------------------|------------------------|
| **Hot Market** | 15 personas | - |
| **Rural Market** | - | 20 personas |
| **Flexible** | 15 personas | 15 personas |

---

## Key Personas for Testing

### Yellow Zone Reluctant Acceptance Testers

**Primary Testers:**
- **#22: The Yellow Zone Tester** - Specifically designed to test reluctant acceptance
- **#25: The Margin Pressure Specialist** - Tests $10k-$12k range
- **#30: The Margin Tester Yellow** - Tests reluctant acceptance
- **#36: The Yellow Zone Final Test** - Final Yellow Zone test

**All Yellow Zone personas** force the AI to:
1. Recognize profit is in Yellow Zone ($8k-$14,999)
2. Use acoustic textures: `[sigh]` or `[clears throat]`
3. Use partner hesitation: "my partners usually look for a wider margin..."
4. Use "The Takeaway" or "False Surrender" before accepting
5. Include closing date pressure: "if we can close by [Date]..."

### Market-Specific Testers

**Hot Market:**
- **#18: The Hot Market Competitor** - Tests $8k floor in hot zips
- **#26: The Hot Market Speed Buyer** - Tests speed vs margin in hot markets

**Rural Market:**
- **#19: The Rural Holdout** - Tests $15k requirement in rural zips
- **#27: The Rural Discipline Tester** - Tests discipline in slow markets

### Negotiation Style Testers

**Grinder Test:**
- **#16: The Penny Pincher** - Fights for every $500
- **#20: The Incremental Grinder** - Tests patience with $500 increments

**Fair Value Test:**
- **#17: The Quick Closer** - Quickly accepts, tests if AI overpays
- **#21: The Fair Market Seller** - Tests AI restraint

---

## Database Schema

### New Columns in `training_personas`

```sql
negotiation_style VARCHAR(50) 
  CHECK (negotiation_style IN ('grinder', 'fair_value', 'price_anchorer', 'flexible', 'rigid'))

lowest_acceptable_price NUMERIC(10, 2)

target_profit_zone VARCHAR(20) 
  CHECK (target_profit_zone IN ('green', 'yellow', 'red')) 
  DEFAULT 'green'

market_flexibility JSONB DEFAULT '{}'::jsonb
```

### Market Flexibility JSON Structure

```json
{
  "hot_zip": {
    "allow_8k_floor": true  // AI can move to $8k floor faster in hot markets
  },
  "rural_zip": {
    "require_15k": true      // AI must hold for $15k in rural markets
  }
}
```

---

## Usage in Training

### Yellow Zone Training

When a persona has `target_profit_zone = 'yellow'` and `lowest_acceptable_price` between $80,500-$82,500:

1. **AI should recognize** profit will be $10k-$12k
2. **AI must use** "Reluctant Acceptance" script:
   ```
   [sigh] Look, [Seller Name], I'm really sharpening the pencil here... 
   my partners usually look for a wider margin on a project like this, 
   but if we can close by [Date], I think I can get them to sign off on $[Price].
   ```
3. **Referee will score** margin_integrity:
   - 70 points: $8,000 - $11,999 profit (Yellow Zone)
   - 85 points: $12,000 - $14,999 profit (Strong Deal)

### Market-Specific Training

**Hot Zip Code:**
- AI should recognize market heat (>15% flip rate)
- Can move to $8k floor faster to secure contract
- Test personas: #18, #26

**Rural Zip Code:**
- AI must recognize slow market (<5% flip rate)
- Must hold for $15k profit due to exit risk
- Test personas: #19, #27

---

## Migration

Run migration: `supabase/migrations/20240101000038_add_margin_pressure_traits.sql`

This adds:
- `negotiation_style` column
- `lowest_acceptable_price` column
- `target_profit_zone` column
- `market_flexibility` JSONB column
- Indexes for efficient queries

---

## Next Steps

1. **Run Migration**: `supabase migration up`
2. **Seed Database**: Run `seed.sql` to populate 50 personas
3. **Test Training**: Run battles against Yellow Zone personas to verify reluctant acceptance
4. **Monitor Scores**: Check `margin_integrity` scores in battle results
5. **Adjust Thresholds**: Fine-tune anchor points based on training performance

---

## Summary

✅ **50 Killer Personas** (expanded from 15)
✅ **18 Yellow Zone Personas** (35% of total) - Test reluctant acceptance
✅ **5 Negotiation Styles** - Grinder, Fair Value, Price Anchorer, Flexible, Rigid
✅ **Market-Specific Flexibility** - Hot zip ($8k floor) vs Rural zip ($15k requirement)
✅ **Margin Pressure Traits** - Anchor points, profit zones, market rules

The system is now ready to train the AI on tiered profit zones and market-specific negotiation strategies!
