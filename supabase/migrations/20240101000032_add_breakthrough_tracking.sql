-- Add breakthrough tracking columns to sandbox_battles table
-- Tracks elite tactics (score >= 95) for promotion review

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending_review', 'reviewed', 'promoted', 'rejected')) DEFAULT NULL;

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS defining_moment TEXT;

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS tactical_snippet TEXT;

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS breakthrough_detected_at TIMESTAMPTZ;

-- Create index for pending review queries
CREATE INDEX IF NOT EXISTS idx_sandbox_battles_status ON sandbox_battles(status) WHERE status = 'pending_review';
CREATE INDEX IF NOT EXISTS idx_sandbox_battles_breakthrough ON sandbox_battles(breakthrough_detected_at DESC) WHERE breakthrough_detected_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN sandbox_battles.status IS 'Review status: pending_review (score >= 95), reviewed, promoted, rejected';
COMMENT ON COLUMN sandbox_battles.defining_moment IS 'The specific 2-3 sentences where the AI handled the most difficult objection';
COMMENT ON COLUMN sandbox_battles.tactical_snippet IS 'Formatted tactical snippet ready for production prompt injection';
COMMENT ON COLUMN sandbox_battles.breakthrough_detected_at IS 'Timestamp when breakthrough was detected by Tactical Scout';
