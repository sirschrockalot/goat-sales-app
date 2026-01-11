# Smart Archiving System

## Overview

The Smart Archiving system protects high-value training data from being moved to cold storage while automatically archiving old, unprotected call logs to reduce Supabase storage costs.

## Features

### 1. Protected Tags
The system recognizes three protected tags in metadata:
- `GOLDEN_KNOWLEDGE`: High-value training examples
- `PRIVATE_PORTAL`: Content from Eric Cline's private portal
- `APEX_LOGIC`: Elite sales tactics and logic

### 2. Stay-Hot Logic
Records are protected from archiving if:
- They have `is_permanent_knowledge = true` (manual override)
- Their metadata contains any protected tag
- They are less than 30 days old

### 3. Archiving Process
- Archives calls older than 30 days
- Only archives completed calls (`call_status = 'ended'`)
- Moves records to `call_logs_archive` table
- Deletes original record after successful archive
- Processes in batches of 100 to avoid timeouts

### 4. Manual Override
Admins can toggle the `is_permanent_knowledge` flag from the call detail page to permanently protect any call from archiving.

## Usage

### Running the Archiver

```bash
npm run archive:calls
```

This will:
1. Find all calls older than 30 days
2. Check for protection (tags or flag)
3. Archive unprotected calls
4. Display statistics

### Protecting a Call

#### Via Admin Dashboard
1. Navigate to a call detail page (`/calls/[id]`)
2. Click the "Protect" button (admin only)
3. The call will be marked as `is_permanent_knowledge = true`

#### Via API
```typescript
PATCH /api/admin/calls/[id]/permanent-knowledge
{
  "is_permanent_knowledge": true
}
```

#### Via Code
```typescript
import { tagAsProtected, setPermanentKnowledge } from '@/lib/archiver';

// Tag with protected tag
await tagAsProtected(callId, 'GOLDEN_KNOWLEDGE');

// Set permanent knowledge flag
await setPermanentKnowledge(callId, true);
```

## Database Schema

### `calls` Table
- `is_permanent_knowledge` (BOOLEAN, default: false)
- `metadata` (JSONB) - Can contain `protected_tags` array

### `call_logs_archive` Table
- Contains all archived call data
- Includes `archived_at`, `original_id`, and `archive_reason` columns
- Maintains full call history for reference

## Protection Rules

1. **Manual Override**: `is_permanent_knowledge = true` → Always protected
2. **Protected Tags**: Metadata contains `GOLDEN_KNOWLEDGE`, `PRIVATE_PORTAL`, or `APEX_LOGIC` → Protected
3. **Age Threshold**: Calls older than 30 days are eligible for archiving
4. **Status Check**: Only completed calls (`call_status = 'ended'`) are archived

## Archive Statistics

Get archive statistics:
```typescript
import { getArchiveStats } from '@/lib/archiver';

const stats = await getArchiveStats();
// Returns:
// {
//   totalCalls: number,
//   archivedCalls: number,
//   protectedCalls: number,
//   oldestUnprotectedCall: string | null
// }
```

## Configuration

Edit `src/lib/archiver.ts` to adjust:
- `ARCHIVE_CONFIG.ageThresholdDays`: Default 30 days
- `ARCHIVE_CONFIG.batchSize`: Default 100 records per batch
- `PROTECTED_TAGS`: Array of protected tag names

## Safety Features

- **Batch Processing**: Processes in small batches to avoid timeouts
- **Error Handling**: Continues processing even if individual records fail
- **Transaction Safety**: Archive succeeds before deletion
- **Recovery**: Archived records can be restored from `call_logs_archive` table

## Monitoring

The archiver provides detailed console output:
- Total records processed
- Number protected (by tag or flag)
- Number archived
- Errors encountered
- Protection reasons breakdown

## Best Practices

1. **Tag High-Value Calls**: Use `tagAsProtected()` to mark important training examples
2. **Review Before Archiving**: Check `getArchiveStats()` to see what will be archived
3. **Monitor Storage**: Archive regularly to keep storage costs down
4. **Protect Key Examples**: Mark calls with exceptional scores or unique scenarios as permanent

## Migration

Run the migration to add archiving support:
```bash
supabase migration up
```

This creates:
- `is_permanent_knowledge` column on `calls` table
- `call_logs_archive` table
- Indexes for efficient archiving queries
