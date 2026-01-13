# Batch Audit Humanity Grades

## Overview

The batch audit script (`scripts/batch-audit-humanity-grades.ts`) audits existing battles that don't have humanity grades yet. It works with **transcripts only** - no audio files are needed.

## How It Works

1. **Finds battles without humanity grades**: Queries `sandbox_battles` table for battles where `humanity_grade IS NULL`
2. **Analyzes transcripts**: Uses the Vocal Soul Auditor to extract prosody features from transcripts
3. **Compares to Eric Cline Gold Standard**: Calculates humanity grade and closeness to Cline
4. **Saves results**: Updates the battle record with humanity grade, prosody features, and gap report
5. **Auto-injects feedback**: If humanity grade < 85, automatically increases texture frequency for next 50 sessions

## Usage

### Basic Usage

Audit up to 50 battles (default):

```bash
npm run sandbox:batch-audit-humanity
```

### With Options

```bash
# Dry run (see what would be audited without actually doing it)
npm run sandbox:batch-audit-humanity -- --dry-run

# Limit number of battles
npm run sandbox:batch-audit-humanity -- --limit=100

# Only audit battles with score >= 70
npm run sandbox:batch-audit-humanity -- --min-score=70

# Combine options
npm run sandbox:batch-audit-humanity -- --limit=50 --min-score=70 --dry-run
```

### Direct Execution

```bash
tsx scripts/batch-audit-humanity-grades.ts [options]
```

## Options

- `--dry-run`: Preview what would be audited without making changes
- `--limit=N`: Maximum number of battles to audit (default: 50)
- `--min-score=N`: Only audit battles with referee_score >= N (default: 0)

## What Gets Audited

The script audits battles that:
- Have `humanity_grade IS NULL` (no grade yet)
- Have a non-empty `transcript`
- Meet the minimum score threshold (if specified)

## Output

The script provides:
- Total battles found
- Successfully audited count
- Error count
- Humanity grade distribution (average, min, max)
- Per-battle results

## Example Output

```
📊 Batch Humanity Grade Audit Summary:
Total battles found: 25
Successfully audited: 24
Errors: 1

Humanity Grade Distribution:
  Average: 78.5
  Min: 65
  Max: 92
```

## Requirements

- Battles must have transcripts in the `sandbox_battles` table
- The Vocal Soul Auditor must be available (`scripts/vocalSoulAuditor.ts`)
- Database connection (Supabase admin client)

## Notes

- **No audio files needed**: The auditor works entirely from transcripts
- **Automatic feedback**: If humanity grade < 85, texture frequency is automatically increased
- **Safe to run multiple times**: Only audits battles without grades
- **Rate limiting**: Includes small delays between audits to avoid overwhelming the system

## Troubleshooting

### "No battles found to audit"
- All battles already have humanity grades, OR
- No battles meet the criteria (score threshold, etc.)

### "Vocal soul auditor not available"
- Make sure `scripts/vocalSoulAuditor.ts` exists
- Check that all dependencies are installed

### "Empty transcript" errors
- Some battles may not have transcripts saved
- These are skipped automatically

## Integration with Training Monitor

After running the batch audit, the Training Monitor dashboard (`/admin/training-monitor`) will show:
- Average Humanity Grade
- Average Closeness to Cline
- List of all audited battles with grades
- Detailed prosody analysis for each battle
