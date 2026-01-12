-- Add golden sample tracking to sandbox_tactics table
-- Golden samples are battles with score > 95 that are automatically saved

-- Add is_golden_sample flag
ALTER TABLE sandbox_tactics
ADD COLUMN IF NOT EXISTS is_golden_sample BOOLEAN DEFAULT FALSE;

-- Add suggested_at timestamp for when golden sample was suggested
ALTER TABLE sandbox_tactics
ADD COLUMN IF NOT EXISTS suggested_at TIMESTAMPTZ;

-- Create index for golden samples
CREATE INDEX IF NOT EXISTS idx_sandbox_tactics_golden ON sandbox_tactics(is_golden_sample) WHERE is_golden_sample = TRUE;

-- Add comment
COMMENT ON COLUMN sandbox_tactics.is_golden_sample IS 'True if this tactic came from a battle with score > 95 (Golden Sample)';
COMMENT ON COLUMN sandbox_tactics.suggested_at IS 'Timestamp when this golden sample was suggested for promotion';
