-- Add archiving support to calls table
-- Includes is_permanent_knowledge flag and archive table

-- Add is_permanent_knowledge column to calls table
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS is_permanent_knowledge BOOLEAN DEFAULT FALSE;

-- Create index for archiving queries
CREATE INDEX IF NOT EXISTS idx_calls_is_permanent_knowledge ON calls(is_permanent_knowledge) WHERE is_permanent_knowledge = TRUE;
CREATE INDEX IF NOT EXISTS idx_calls_created_at_archiving ON calls(created_at) WHERE is_permanent_knowledge = FALSE;

-- Add comment
COMMENT ON COLUMN calls.is_permanent_knowledge IS 'Manual override: If true, this record is never archived regardless of age or tags';

-- Create archive table for old call logs
CREATE TABLE IF NOT EXISTS call_logs_archive (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript TEXT,
  goat_score INTEGER,
  recording_url TEXT,
  persona_mode TEXT,
  persona_id TEXT,
  logic_gates JSONB,
  call_status TEXT,
  rebuttal_of_the_day TEXT,
  script_adherence JSONB,
  metadata JSONB,
  contract_signed BOOLEAN,
  suggested_buy_price NUMERIC(12, 2),
  final_offer_price NUMERIC(12, 2),
  price_variance NUMERIC(5, 2),
  test_stability_value NUMERIC(3, 2),
  script_hidden_duration INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  original_id UUID, -- Reference to original call ID
  archive_reason TEXT -- Why it was archived (e.g., "Age > 30 days, no protected tags")
);

-- Create indexes on archive table
CREATE INDEX IF NOT EXISTS idx_archive_user_id ON call_logs_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_archive_archived_at ON call_logs_archive(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archive_original_id ON call_logs_archive(original_id);

-- Add comment
COMMENT ON TABLE call_logs_archive IS 'Archived call logs moved from calls table to reduce storage costs';
COMMENT ON COLUMN call_logs_archive.archived_at IS 'Timestamp when record was moved to archive';
COMMENT ON COLUMN call_logs_archive.original_id IS 'Original call ID before archiving';
COMMENT ON COLUMN call_logs_archive.archive_reason IS 'Reason for archiving (e.g., age, no protected tags)';
