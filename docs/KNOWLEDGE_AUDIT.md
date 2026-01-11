# Knowledge Gap Detector

## Overview

The Knowledge Gap Detector scans the `calls` table to verify that every core tactic from Eric Cline and Andy Elliott masterclasses is correctly tagged and protected. It uses GPT-4o to identify high-fidelity implementations and automatically protects valuable tactics.

## Features

### 1. Tactical Checklist
Master list of must-have DNA:

**Andy Elliott Tactics:**
- **Transfer of Conviction**: High-energy, confident delivery that transfers certainty to the prospect
- **High-Energy Interruption**: Strategic interruption to maintain control and energy
- **The Scarcity Close**: Creating urgency through limited availability

**Eric Cline Tactics:**
- **Clause 17 Reservation Defense**: Defending the reservation clause when prospects object
- **The $82,700 Bad-Cop Hold**: Firm price defense using the $82,700 anchor point
- **Hidden Why Mining**: Deep discovery to uncover real motivation

### 2. GPT-4o Gap Analysis
For every call in the database:
- Analyzes transcript for high-fidelity tactical implementations
- Identifies which specific master tactic is present
- Rates confidence (0-100) in the identification
- Flags generic responses as "Noise"

### 3. Auto-Protection
If a high-value tactic is found but NOT protected:
- Automatically applies `GOLDEN_KNOWLEDGE` tag
- Sets `is_permanent_knowledge = true`
- Prevents archiving of valuable training data

### 4. Visual Reporting
Generates comprehensive terminal report showing:
- **DNA Coverage %**: How much of the masterclass logic is currently "Hot"
- **At-Risk Tactics**: High-value logic currently in "To-be-Archived" pool
- **Missing Links**: Topics from masterclasses with no representation in active memory

## Usage

### Run Audit (Analysis Only)
```bash
npm run audit:knowledge
```

This will:
1. Fetch all calls from the database
2. Analyze each call with GPT-4o
3. Generate a comprehensive report
4. Show coverage, at-risk tactics, and missing links

### Run Audit with Auto-Protection
```bash
npm run audit:knowledge:protect
```

This will:
1. Perform the same analysis
2. Automatically protect any at-risk high-value tactics
3. Tag them with `GOLDEN_KNOWLEDGE`
4. Set `is_permanent_knowledge = true`

## Report Sections

### DNA Coverage %
Shows percentage of master tactics that are represented in the database:
- **Elliott Tactics**: X/3 covered (Y%)
- **Cline Tactics**: X/3 covered (Y%)
- **Overall**: Z% coverage

### At-Risk Tactics
Lists high-fidelity tactics that are:
- Not marked as permanent knowledge
- Not tagged with protected tags
- Currently eligible for archiving

Each entry shows:
- Tactic name and category
- Call ID
- Reason for being at-risk

### Missing Links
Lists master tactics that have:
- No representation in the database
- No high-fidelity examples found
- Need to be added to training data

### Statistics
- Total calls analyzed
- High-fidelity tactics found
- Protected tactics count
- At-risk tactics count
- Auto-protected count
- Noise (low-quality) count

## High-Fidelity Detection Criteria

A tactic is considered "high-fidelity" if:
1. The tactic is **executed**, not just mentioned
2. Confidence score > 70%
3. Shows precision and mastery, not generic response
4. Contains specific keywords and patterns

### Examples

**High-Fidelity "Transfer of Conviction":**
- High energy and certainty in delivery
- Uses confident language ("absolutely", "guarantee", "believe me")
- Transfers certainty to prospect

**High-Fidelity "Clause 17 Reservation Defense":**
- Actually defends the reservation clause
- Addresses specific objections
- Uses technical language about the clause

**High-Fidelity "$82,700 Bad-Cop Hold":**
- References the specific $82,700 price point
- Shows firm, unyielding stance
- Uses "bad cop" tone

**Noise (Low Quality):**
- Generic responses
- Mentions tactic but doesn't execute
- Low confidence (< 70%)
- Vague or incomplete implementation

## Auto-Protection Logic

A call is auto-protected if:
1. Contains high-fidelity tactic (confidence > 70%)
2. Not already marked as `is_permanent_knowledge = true`
3. Not already tagged with protected tag
4. Not flagged as "Noise"

## Integration with Archiver

The Knowledge Gap Detector works seamlessly with the Smart Archiver:
- Protected tactics are never archived
- Auto-protected calls are immediately safe
- Coverage report helps identify what to protect

## Best Practices

1. **Run Regularly**: Audit monthly to catch new high-value calls
2. **Review Before Auto-Protect**: First run without `--auto-protect` to review findings
3. **Monitor Missing Links**: Focus training on tactics with no representation
4. **Protect Manually**: Review at-risk tactics and protect manually if needed

## Configuration

Edit `scripts/knowledgeAudit.ts` to:
- Add new master tactics to `MASTER_TACTICS`
- Adjust confidence threshold (currently 70%)
- Modify GPT-4o prompt for different analysis criteria
- Change auto-protection behavior

## Cost Considerations

- Uses GPT-4o API for analysis
- Processes all calls in database
- Rate-limited to 500ms between calls
- Typical cost: ~$0.01-0.02 per call analyzed

## Example Output

```
════════════════════════════════════════════════════════════════════════════════
  KNOWLEDGE GAP DETECTOR - AUDIT REPORT
════════════════════════════════════════════════════════════════════════════════

📊 DNA COVERAGE %
────────────────────────────────────────────────────────────────────────────────
Elliott Tactics: 2/3 (66.7%)
Cline Tactics:   3/3 (100.0%)
Overall:        83.3% coverage

📈 STATISTICS
────────────────────────────────────────────────────────────────────────────────
Total Calls Analyzed:     150
High-Fidelity Tactics:    45
Protected Tactics:      38
At-Risk Tactics:         7
Auto-Protected:          0
Noise (Low Quality):    105

⚠️  AT-RISK TACTICS (High-value logic in "To-be-Archived" pool)
────────────────────────────────────────────────────────────────────────────────
1. Transfer of Conviction (elliott)
   Call ID: abc12345
   Reason:  High-fidelity Transfer of Conviction (confidence: 85%) not protected

🔗 MISSING LINKS (No representation in active memory)
────────────────────────────────────────────────────────────────────────────────
1. High-Energy Interruption (Elliott)
   Strategic interruption to maintain control and energy in the conversation
```
