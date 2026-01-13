# Persona Creation Guide for AI Training

Complete guide for creating and managing personas in the `sandbox_personas` table for autonomous battle training.

## Overview

Personas are AI seller characters that the Apex Closer battles against during training. Each persona represents a different seller archetype with unique objections, behaviors, and attack patterns. The training system uses these personas to test and improve the closer's skills.

## Database Schema

The `sandbox_personas` table has the following structure:

```sql
CREATE TABLE sandbox_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- Display name (e.g., "The Skeptic")
  description TEXT NOT NULL,            -- Brief description of the persona
  persona_type TEXT NOT NULL,           -- Category (e.g., 'skeptic', 'price-anchorer')
  system_prompt TEXT NOT NULL,          -- Detailed AI prompt defining behavior
  characteristics JSONB DEFAULT '[]',   -- Array of personality traits
  attack_patterns JSONB DEFAULT '[]',   -- Array of specific objections/attacks
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE        -- Must be TRUE for training
);
```

## Required Fields

### 1. `name` (TEXT, Required)
- **Purpose**: Human-readable identifier
- **Example**: `"The Skeptic"`, `"The Price-Anchorer"`, `"The Emotional Seller"`
- **Best Practice**: Use descriptive names that indicate the persona's primary trait

### 2. `description` (TEXT, Required)
- **Purpose**: Brief summary of what makes this persona challenging
- **Example**: `"Attacks Clause 17 and Earnest Money ($100). Questions every detail."`
- **Best Practice**: 1-2 sentences explaining the persona's main challenge

### 3. `persona_type` (TEXT, Required)
- **Purpose**: Categorizes the persona for filtering and analytics
- **Common Types**:
  - `skeptic` - Questions everything, risk-averse
  - `price-anchorer` - Demands higher prices, price-focused
  - `emotional-seller` - Needs deep discovery, relationship-focused
  - `time-pressured` - Has deadlines, urgency-driven
  - `comparison-shopper` - Has multiple offers, competitive
  - `legal-expert` - Legally cautious, detail-oriented
  - `emotional-wrecker` - Uses guilt/manipulation
- **Best Practice**: Use consistent types for similar personas

### 4. `system_prompt` (TEXT, Required)
- **Purpose**: The most important field - defines how the persona behaves during battles
- **Structure**: Detailed instructions for the AI on:
  - Who the persona is
  - What they care about
  - How they respond to the closer
  - Specific objections they raise
  - What triggers them
- **Best Practice**: Be specific and include example phrases the persona would use

### 5. `characteristics` (JSONB Array, Optional)
- **Purpose**: Personality traits for analytics and filtering
- **Example**: `["Skeptical", "Questioning", "Risk-averse", "Detail-oriented"]`
- **Best Practice**: 3-5 descriptive traits

### 6. `attack_patterns` (JSONB Array, Optional)
- **Purpose**: Specific objections/attacks this persona uses
- **Example**: `["Attacks Clause 17 (Memorandum)", "Questions $100 Earnest Money", "Demands proof of legitimacy"]`
- **Best Practice**: List 3-5 specific attack patterns

### 7. `is_active` (BOOLEAN, Required)
- **Purpose**: Controls whether persona is used in training
- **Must be**: `TRUE` for the persona to be selected during training
- **Best Practice**: Set to `FALSE` to temporarily disable a persona without deleting it

## Example Persona

Here's a complete example of a well-structured persona:

```json
{
  "name": "The Skeptic",
  "description": "Attacks Clause 17 and Earnest Money ($100). Questions every detail.",
  "persona_type": "skeptic",
  "system_prompt": "You are a highly skeptical homeowner who has been burned by investors before. You question EVERYTHING:\n- \"Why only $100 earnest money? That seems low.\"\n- \"Clause 17 says you'll notify the county? That sounds like a lien. I don't want anything recorded against my property.\"\n- \"How do I know you'll actually close? What's your track record?\"\n- \"This price seems too good to be true. What's the catch?\"\n\nYou are polite but firm. You need to be convinced that this is legitimate and safe.",
  "characteristics": ["Skeptical", "Questioning", "Risk-averse", "Detail-oriented"],
  "attack_patterns": [
    "Attacks Clause 17 (Memorandum)",
    "Questions $100 Earnest Money",
    "Demands proof of legitimacy",
    "Asks for references"
  ],
  "is_active": true
}
```

## Methods to Create Personas

### Method 1: Using the Persona Generator Script (Recommended)

The easiest way is to use the built-in persona generator that creates 50 pre-configured personas:

```bash
# Make sure you're in sandbox environment
export EXPLICIT_ENV=sandbox

# Run the persona generator
npx tsx scripts/personaGenerator.ts
```

This script:
- ✅ Creates 50 diverse personas covering all major seller archetypes
- ✅ Includes complete system prompts, characteristics, and attack patterns
- ✅ Sets `is_active=true` automatically
- ✅ Handles errors gracefully and reports success/failure counts

### Method 2: Via Supabase Dashboard (Manual)

1. Go to your Supabase Dashboard → Table Editor → `sandbox_personas`
2. Click "Insert row"
3. Fill in all required fields:
   - `name`: Enter a descriptive name
   - `description`: Brief description
   - `persona_type`: Choose a type
   - `system_prompt`: Detailed AI instructions (most important!)
   - `characteristics`: JSON array like `["Trait1", "Trait2"]`
   - `attack_patterns`: JSON array like `["Attack1", "Attack2"]`
   - `is_active`: Set to `true`
4. Click "Save"

### Method 3: Via SQL (Direct Insert)

```sql
INSERT INTO sandbox_personas (
  name,
  description,
  persona_type,
  system_prompt,
  characteristics,
  attack_patterns,
  is_active
) VALUES (
  'The Skeptic',
  'Attacks Clause 17 and Earnest Money ($100). Questions every detail.',
  'skeptic',
  'You are a highly skeptical homeowner who has been burned by investors before. You question EVERYTHING:
- "Why only $100 earnest money? That seems low."
- "Clause 17 says you''ll notify the county? That sounds like a lien. I don''t want anything recorded against my property."
- "How do I know you''ll actually close? What''s your track record?"
- "This price seems too good to be true. What''s the catch?"

You are polite but firm. You need to be convinced that this is legitimate and safe.',
  '["Skeptical", "Questioning", "Risk-averse", "Detail-oriented"]'::jsonb,
  '["Attacks Clause 17 (Memorandum)", "Questions $100 Earnest Money", "Demands proof of legitimacy", "Asks for references"]'::jsonb,
  true
);
```

### Method 4: Via API (Programmatic)

You can create personas programmatically using the Supabase client:

```typescript
import { supabaseAdmin } from '@/lib/supabase';

const { data, error } = await supabaseAdmin
  .from('sandbox_personas')
  .insert({
    name: 'The Skeptic',
    description: 'Attacks Clause 17 and Earnest Money ($100). Questions every detail.',
    persona_type: 'skeptic',
    system_prompt: 'You are a highly skeptical homeowner...',
    characteristics: ['Skeptical', 'Questioning', 'Risk-averse'],
    attack_patterns: ['Attacks Clause 17', 'Questions Earnest Money'],
    is_active: true,
  });
```

## System Prompt Best Practices

The `system_prompt` is the most critical field. It should:

1. **Define the Persona's Identity**
   - Who they are (homeowner, investor, etc.)
   - Their background/experience
   - Their emotional state

2. **Specify Behaviors**
   - How they respond to the closer
   - What triggers them
   - What they care about most

3. **Include Example Phrases**
   - Actual quotes the persona would say
   - Specific objections they raise
   - Questions they ask

4. **Set Boundaries**
   - What they will/won't do
   - How far they'll negotiate
   - What convinces them

### Good System Prompt Example:

```
You are a homeowner who has done "research" online and believes your property is worth $150,000. You've seen Zillow estimates and think you're being lowballed.

Key behaviors:
- "I've seen similar houses sell for $150k. Why are you offering so much less?"
- "Zillow says my house is worth $140k. Your offer doesn't make sense."
- "I know what my house is worth. I'm not going to give it away."
- "If you can't come closer to $150k, we don't have a deal."

You are firm on your price anchor and will only move in small increments if the rep can justify the lower offer convincingly.
```

### Bad System Prompt Example:

```
You want more money.
```

❌ Too vague, no guidance for the AI on how to behave

## Persona Types Reference

Here are common persona types and their characteristics:

| Type | Description | Key Behaviors |
|------|-------------|---------------|
| `skeptic` | Questions everything, risk-averse | Attacks contract terms, demands proof |
| `price-anchorer` | Believes property is worth more | References Zillow, compares to other sales |
| `emotional-seller` | Needs deep discovery | Avoids price talk, shares stories |
| `time-pressured` | Has hard deadlines | Demands fast closing, reveals urgency |
| `comparison-shopper` | Has multiple offers | Plays investors against each other |
| `legal-expert` | Legally cautious | References attorney, questions clauses |
| `emotional-wrecker` | Uses manipulation | Guilt trips, emotional pressure |

## Verifying Personas

After creating personas, verify they're active:

```sql
-- Check active personas
SELECT 
  id,
  name,
  persona_type,
  is_active,
  created_at
FROM sandbox_personas
WHERE is_active = true
ORDER BY created_at DESC;
```

Or use the verification script:

```bash
npx tsx scripts/verify-seed.ts
```

## Training System Requirements

For the training system to work:

1. **At least 1 active persona** must exist
2. **`is_active = true`** for personas you want to use
3. **Complete `system_prompt`** - this is critical for AI behavior
4. **Valid `persona_type`** for categorization

The training system will:
- Query: `SELECT id, name FROM sandbox_personas WHERE is_active = true`
- Use personas in batches (default: 10 per training run)
- Track battle results in `sandbox_battles` table

## Troubleshooting

### "No active personas found" Error

**Cause**: No personas with `is_active = true` exist in the database.

**Solution**:
1. Check if personas exist: `SELECT COUNT(*) FROM sandbox_personas;`
2. If none exist, run the persona generator: `npx tsx scripts/personaGenerator.ts`
3. If personas exist but inactive, update them: `UPDATE sandbox_personas SET is_active = true WHERE id = '...';`

### Personas Not Being Selected

**Cause**: `is_active = false` or personas don't match query criteria.

**Solution**:
1. Verify active status: `SELECT name, is_active FROM sandbox_personas;`
2. Activate personas: `UPDATE sandbox_personas SET is_active = true;`

### Poor Battle Quality

**Cause**: Weak or incomplete `system_prompt`.

**Solution**:
1. Review system prompts: `SELECT name, system_prompt FROM sandbox_personas;`
2. Enhance prompts with:
   - More specific behaviors
   - Example phrases
   - Clear boundaries
   - Emotional context

## Next Steps

After creating personas:

1. ✅ **Verify**: Check that personas are active
2. ✅ **Test**: Run a small training batch (1 persona)
3. ✅ **Monitor**: Check battle results in `sandbox_battles` table
4. ✅ **Iterate**: Refine system prompts based on battle outcomes

## Example: Creating a Custom Persona

Let's create a "The Distrustful Inheritor" persona:

```sql
INSERT INTO sandbox_personas (
  name,
  description,
  persona_type,
  system_prompt,
  characteristics,
  attack_patterns,
  is_active
) VALUES (
  'The Distrustful Inheritor',
  'Inherited property, never met you, suspicious of all investors.',
  'skeptic',
  'You inherited this property from a relative you barely knew. You''ve never sold a house before, and you''re suspicious of everyone.

Key behaviors:
- "I don''t know you. How do I know you''re legitimate?"
- "My relative''s lawyer said to be careful with investors."
- "I''ve heard horror stories about people getting scammed."
- "Why should I trust you over the other 10 people who called?"

You test the rep''s credibility aggressively. You need proof, references, and clear explanations of every step.',
  '["Distrustful", "Inexperienced", "Cautious", "Authority-seeking"]'::jsonb,
  '["Questions legitimacy", "References legal advice", "Mentions horror stories", "Demands proof"]'::jsonb,
  true
);
```

This persona will challenge the closer to prove credibility and handle an inexperienced, suspicious seller.

## Summary

- **Required Fields**: `name`, `description`, `persona_type`, `system_prompt`, `is_active`
- **Most Important**: `system_prompt` - this defines AI behavior
- **Quick Start**: Run `npx tsx scripts/personaGenerator.ts` for 50 pre-built personas
- **Verification**: Ensure `is_active = true` for training to work
- **Best Practice**: Include specific behaviors, example phrases, and clear boundaries in system prompts
