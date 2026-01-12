-- Add humanity grading columns to sandbox_battles table
-- Tracks vocal soul analysis and comparison to Eric Cline gold standard

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS humanity_grade INTEGER CHECK (humanity_grade >= 0 AND humanity_grade <= 100);

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS closeness_to_cline NUMERIC(5, 2) CHECK (closeness_to_cline >= 0 AND closeness_to_cline <= 100);

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS prosody_features JSONB;

ALTER TABLE sandbox_battles
ADD COLUMN IF NOT EXISTS robotic_gap_report JSONB;

-- Create sandbox_config table for dynamic configuration
CREATE TABLE IF NOT EXISTS sandbox_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for humanity grade queries
CREATE INDEX IF NOT EXISTS idx_sandbox_battles_humanity_grade ON sandbox_battles(humanity_grade DESC);
CREATE INDEX IF NOT EXISTS idx_sandbox_battles_closeness_cline ON sandbox_battles(closeness_to_cline DESC);

-- Add comments
COMMENT ON COLUMN sandbox_battles.humanity_grade IS 'Vocal soul score (0-100) comparing AI to Eric Cline gold standard';
COMMENT ON COLUMN sandbox_battles.closeness_to_cline IS 'Percentage similarity to Eric Cline tonality (0-100%)';
COMMENT ON COLUMN sandbox_battles.prosody_features IS 'Extracted prosody features (pitch variance, rhythm, jitter, shimmer)';
COMMENT ON COLUMN sandbox_battles.robotic_gap_report IS 'Detailed comparison report showing gaps from gold standard';
