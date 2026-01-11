-- Create voice_performance_logs table to track stability performance
-- Aggregates data from calls to find optimal stability settings

CREATE TABLE IF NOT EXISTS voice_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stability_setting NUMERIC(3, 2) NOT NULL,
  avg_humanity_score NUMERIC(5, 2), -- Average humanity score for this stability
  conversion_rate NUMERIC(5, 2), -- Percentage of calls that resulted in signed contracts
  sample_size INTEGER DEFAULT 0, -- Number of calls with this stability setting
  high_performing BOOLEAN DEFAULT FALSE, -- Flag for stability settings that resulted in $82,700 contracts
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stability_setting) -- One record per stability value
);

-- Create index on stability_setting for fast lookups
CREATE INDEX IF NOT EXISTS idx_voice_performance_stability ON voice_performance_logs(stability_setting);
CREATE INDEX IF NOT EXISTS idx_voice_performance_high_performing ON voice_performance_logs(high_performing) WHERE high_performing = TRUE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_voice_performance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_voice_performance_logs_updated_at ON voice_performance_logs;
CREATE TRIGGER update_voice_performance_logs_updated_at
  BEFORE UPDATE ON voice_performance_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_performance_updated_at();

-- Add comments
COMMENT ON TABLE voice_performance_logs IS 'Tracks performance metrics for different ElevenLabs stability settings to find optimal voice configuration';
COMMENT ON COLUMN voice_performance_logs.stability_setting IS 'The stability value being tested (0.35, 0.45, or 0.55)';
COMMENT ON COLUMN voice_performance_logs.avg_humanity_score IS 'Average humanity score from sentiment analysis for calls with this stability';
COMMENT ON COLUMN voice_performance_logs.conversion_rate IS 'Percentage of calls that resulted in contract_signed = TRUE';
COMMENT ON COLUMN voice_performance_logs.sample_size IS 'Total number of calls analyzed with this stability setting';
COMMENT ON COLUMN voice_performance_logs.high_performing IS 'Flag set to TRUE if this stability resulted in $82,700 contracts';
