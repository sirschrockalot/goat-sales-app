# Self-Play Training Environment

Autonomous "Self-Play" training system that simulates battles between your Acquisitions Agent and diverse Seller Personas in a secure Sandbox, allowing you to "Promote" winning tactics to Production.

## Architecture Overview

### Components

1. **Environment Configuration** (`config/environments.ts`)
   - Manages PROD and SANDBOX credentials
   - Safety checks to prevent accidental production writes
   - Validates required environment variables

2. **Persona Generator** (`scripts/personaGenerator.ts`)
   - Library of 50 "Killer Personas"
   - Includes: The Skeptic, The Price-Anchorer, The Emotional Seller, and 47 more
   - Saves personas to `sandbox_personas` table

3. **Autonomous Battle Engine** (`scripts/autonomousBattle.ts`)
   - Pairs Apex Closer (Thread A) against Persona (Thread B)
   - Uses GPT-4o-Mini for battles (cost-effective)
   - Uses GPT-4o for Referee (high-quality grading)
   - Runs for 15 turns per battle
   - Tracks token usage and costs

4. **Promotion Service** (`src/lib/promotionService.ts`)
   - Flags high-score battles (Score > 90)
   - Extracts winning rebuttals
   - Promotes tactics to `production_base_prompt.txt`
   - Tags with `is_synthetic: true` and `priority: 5`

5. **Safety Kill-Switch**
   - Monitors token usage per session
   - Kills process if sandbox spend exceeds $5.00
   - Sends Slack alert on kill-switch activation

## Database Schema

### Tables

- **sandbox_personas**: Stores 50+ seller personas
- **sandbox_battles**: Records of autonomous battles
- **sandbox_tactics**: Winning tactics extracted from high-score battles

See migration: `supabase/migrations/20240101000028_create_sandbox_personas_table.sql`

## Setup

### 1. Environment Variables

Ensure you have the following environment variables set:

```bash
# Required
NODE_ENV=development  # Use 'production' for PROD, 'development' for SANDBOX
OPENAI_API_KEY=your_openai_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional (for Slack alerts)
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Sandbox-specific (optional, falls back to regular vars)
SANDBOX_OPENAI_API_KEY=your_sandbox_key
SANDBOX_SUPABASE_URL=your_sandbox_url
```

### 2. Run Database Migration

```bash
npm run supabase:start
# Or apply migration manually to your Supabase instance
```

### 3. Generate Personas

```bash
npm run sandbox:generate-personas
```

This will create 50 personas in the `sandbox_personas` table.

## Usage

### Run Autonomous Battles

```bash
# Run battles against all active personas (default: 10)
npm run sandbox:battle

# Run battles against specific personas (provide UUIDs)
npm run sandbox:battle <persona-id-1> <persona-id-2>
```

### Promote Winning Tactics

```bash
# Flag high-score battles and promote tactics to production
npm run sandbox:promote-tactics
```

This will:
1. Find all battles with score > 90
2. Extract winning rebuttals
3. Append them to `base_prompt.txt` with synthetic tags
4. Mark tactics as promoted in the database

## Referee Grading Criteria

After 15 turns, the Referee (GPT-4o) grades the Closer on:

1. **Math Defense (0-10)**: Did they stay at $82,700?
2. **Humanity (0-10)**: Did they use disfluencies (uh, um, sighs)?
3. **Success (0-10)**: Did they get verbal "Yes" to Memorandum (Clause 17)?

**Total Score (0-100)**: Weighted average of the three criteria

## Safety Features

### Kill-Switch

- **Threshold**: $5.00 per session
- **Monitoring**: Real-time token usage tracking
- **Action**: Process termination + Slack alert
- **Location**: Checked before and after each battle turn

### Environment Safety

- All scripts check `NODE_ENV` to prevent accidental production writes
- `assertSandboxMode()` throws error if attempting PROD operations in SANDBOX
- Use `SANDBOX_` prefixed env vars for separate sandbox credentials

## Persona Library

The system includes 50 diverse personas:

1. **The Skeptic** - Attacks Clause 17 and $100 Earnest Money
2. **The Price-Anchorer** - Demands $150k for $82,700 property
3. **The Emotional Seller** - Needs deep discovery and "Hidden Why" mining
4. **The Time-Pressured Seller** - Hard deadline (foreclosure, relocation)
5. **The Comparison Shopper** - Has multiple offers
6. **The Legal Expert** - Lawyer friend warned them
7. **The Emotional Wrecker** - Uses guilt and manipulation
8. **The Information Hoarder** - Won't answer until you answer first
9. **The Repair Denier** - Insists house is perfect
10. **The Equity Warrior** - Focused on net proceeds
... and 40 more diverse personas

## Cost Management

### Token Pricing (2024)

- **GPT-4o-Mini**: $0.15/1M input, $0.60/1M output
- **GPT-4o**: $2.50/1M input, $10.00/1M output

### Typical Battle Cost

- **15 turns** × **~500 tokens/turn** = ~7,500 tokens
- **Cost**: ~$0.01-0.02 per battle (using GPT-4o-Mini)
- **Referee**: ~$0.05 per battle (using GPT-4o)

### Kill-Switch Protection

The $5.00 kill-switch allows for approximately:
- **250-500 battles** before activation (depending on conversation length)
- Automatic termination prevents runaway costs

## Promotion Workflow

1. **Battle Runs** → Scores saved to `sandbox_battles`
2. **High-Score Detection** → Battles with score > 90 flagged
3. **Tactic Extraction** → Winning rebuttals extracted
4. **Promotion** → Tactics appended to `base_prompt.txt` with tags:
   ```
   # SYNTHETIC TACTIC (AUTO-PROMOTED FROM SANDBOX)
   # is_synthetic: true
   # priority: 5
   # promoted_at: 2024-01-01T00:00:00Z
   # battle_id: uuid
   
   [Tactic text here]
   
   # END SYNTHETIC TACTIC
   ```

## Integration with Prompt Merger

Promoted tactics are tagged with:
- `is_synthetic: true`
- `priority: 5` (default for Prompt Merger)

The Prompt Merger will automatically include these tactics when merging prompts, respecting the priority system.

## Monitoring

### Logs

All operations are logged via Winston logger:
- Battle start/end
- Turn execution
- Token usage
- Cost tracking
- Kill-switch activation

### Slack Alerts

If `SLACK_WEBHOOK_URL` is set:
- Kill-switch activation alerts
- Session completion summaries
- Error notifications

## Troubleshooting

### "Kill-switch activated"

- Session cost exceeded $5.00
- Check token usage logs
- Reduce number of battles or personas per session

### "Persona not found"

- Run `npm run sandbox:generate-personas` first
- Check `sandbox_personas` table in Supabase

### "base_prompt.txt not found"

- Ensure `base_prompt.txt` exists in project root
- This file is required for tactic promotion

### "Supabase admin client not available"

- Check environment variables
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify Supabase connection

## Future Enhancements

- [ ] Real-time battle monitoring dashboard
- [ ] A/B testing of different closer strategies
- [ ] Automatic persona difficulty scaling
- [ ] Multi-round tournament mode
- [ ] Integration with Vapi for voice battles
