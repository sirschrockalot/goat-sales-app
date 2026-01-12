# Tactical Scout Service

Background service that monitors autonomous training logs for breakthrough sessions (score >= 95) and alerts immediately for promotion to production.

## Overview

The Tactical Scout:
1. **Monitors** `sandbox_battles` table via Supabase Realtime
2. **Detects** sessions with `referee_score >= 95` or `humanity_grade >= 95`
3. **Extracts** "Defining Moment" using GPT-4o
4. **Alerts** via Slack and Dashboard
5. **Tags** rows with `status: 'pending_review'` for promotion dashboard

---

## Components

### 1. Scout Service (`src/lib/tacticalScout.ts`)

**Realtime Subscription:**
- Watches `sandbox_battles` table for INSERT/UPDATE events
- Filters for `referee_score >= 95`
- Processes breakthroughs immediately

**Breakthrough Analysis:**
- Uses GPT-4o to extract "Defining Moment"
- Identifies the 2-3 sentences that handled the most difficult objection
- Formats as "Tactical Snippet" for production prompt

**Multi-Channel Alerts:**
- **Slack**: Sends to `#apex-breakthroughs` channel
- **Dashboard**: Updates TrainingMonitor with notification badge

### 2. Database Schema

**New Columns:**
- `status`: `pending_review`, `reviewed`, `promoted`, `rejected`
- `defining_moment`: The specific 2-3 sentences
- `tactical_snippet`: Formatted snippet for production
- `breakthrough_detected_at`: Timestamp of detection

### 3. API Endpoints

**GET `/api/sandbox/breakthroughs`**
- Returns pending review breakthroughs
- Includes unread count (last 24 hours)

**POST `/api/sandbox/breakthroughs`**
- Actions: `mark_reviewed`, `promote`, `reject`
- Updates battle status

### 4. Dashboard Integration

**Training Monitor:**
- "New Elite Tactic Available" notification badge
- Shows unread count
- Click to view breakthrough modal
- List of all pending breakthroughs
- Quick actions: Promote, Mark Reviewed

---

## Usage

### Start Scout Service

```bash
# Start background monitoring service
npm run scout:start
```

This will:
1. Scan existing battles for breakthroughs
2. Initialize Realtime subscription
3. Monitor for new breakthroughs
4. Send alerts automatically

### Manual Scan

```bash
# One-time scan of existing battles
npm run scout:scan
```

---

## Breakthrough Detection

### Criteria

A breakthrough is detected when:
- `referee_score >= 95` OR
- `humanity_grade >= 95`

### Processing Flow

1. **Detection**: Realtime subscription fires on INSERT/UPDATE
2. **Analysis**: GPT-4o extracts defining moment
3. **Tagging**: Status set to `pending_review`
4. **Alerting**: Slack + Dashboard notification
5. **Storage**: Defining moment and tactical snippet saved

---

## Defining Moment Extraction

GPT-4o analyzes the transcript to find:

**The Most Difficult Objection:**
- What was the hardest challenge in this call?

**The Exact Response:**
- The specific 2-3 sentences that handled it

**Why It Worked:**
- What made this response effective?

**Tactical Snippet Format:**
```
"When the seller objects with [OBJECTION TYPE], respond with: '[DEFINING MOMENT TEXT]' This works because [WHY IT WORKED]."
```

---

## Slack Alert Format

Sent to `#apex-breakthroughs` channel:

```
🎯 APEX BREAKTHROUGH DETECTED

Referee Score: 96/100
Humanity Grade: 94/100
Persona Defeated: The Aggressive Attorney
Persona Type: legal-expert

Winning Rebuttal:
[The specific rebuttal text]

Defining Moment:
[The 2-3 sentences that won]

Tactical Snippet:
[Formatted for production prompt]

[Review in Dashboard Button]
```

---

## Dashboard Features

### Notification Badge

- Appears in header when breakthroughs detected
- Shows unread count
- Yellow/gold styling for visibility
- Click to open breakthrough modal

### Breakthrough Modal

**Features:**
- List of all pending breakthroughs
- Shows persona defeated, score, defining moment
- Tactical snippet display
- Quick actions:
  - **Promote**: Mark as promoted (calls promotion service)
  - **Mark Reviewed**: Remove from pending list

### Promotion Integration

When "Promote" is clicked:
- Calls `/api/sandbox/promote-tactic` with battle ID
- Tactical snippet is added to `base_prompt.txt`
- Status updated to `promoted`

---

## Database Schema

```sql
ALTER TABLE sandbox_battles
ADD COLUMN status TEXT CHECK (status IN ('pending_review', 'reviewed', 'promoted', 'rejected'));

ALTER TABLE sandbox_battles
ADD COLUMN defining_moment TEXT;
ALTER TABLE sandbox_battles
ADD COLUMN tactical_snippet TEXT;
ALTER TABLE sandbox_battles
ADD COLUMN breakthrough_detected_at TIMESTAMPTZ;
```

---

## Configuration

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key

# Optional (for Slack alerts)
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

### Supabase Realtime

Ensure Realtime is enabled in Supabase:
- Go to Database → Replication
- Enable replication for `sandbox_battles` table
- Or use Supabase Dashboard → Settings → API → Realtime

---

## Production Deployment

### As Background Service

**Option 1: Separate Process**
```bash
# Run as separate Node.js process
npm run scout:start
```

**Option 2: Vercel Cron Job**
```json
{
  "crons": [
    {
      "path": "/api/cron/scout-scan",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Option 3: Docker Container**
```dockerfile
# Run scout service in separate container
CMD ["npm", "run", "scout:start"]
```

---

## Troubleshooting

### "Realtime subscription not working"
- Check Supabase Realtime is enabled
- Verify table replication is enabled
- Check network connectivity
- Review Supabase logs

### "Breakthroughs not being detected"
- Verify score >= 95 threshold
- Check Realtime subscription is active
- Review logs for errors
- Run manual scan: `npm run scout:scan`

### "Slack alerts not sending"
- Verify `SLACK_WEBHOOK_URL` is set
- Check Slack webhook is valid
- Review error logs

### "Dashboard badge not showing"
- Check API endpoint is accessible
- Verify unread count > 0
- Refresh dashboard
- Check browser console for errors

---

## Summary

The Tactical Scout ensures you never miss an elite tactic:
- **Real-time Monitoring**: Supabase Realtime subscription
- **Instant Alerts**: Slack + Dashboard notifications
- **Automatic Analysis**: GPT-4o extracts defining moments
- **Ready for Promotion**: Tagged with `pending_review` status
- **One-Click Promotion**: Direct integration with promotion service

The system continuously monitors training sessions and alerts you immediately when a breakthrough (score >= 95) is detected, ensuring elite tactics are promoted to production quickly.
