-- Create calls table for storing call sessions
-- Stores user_id, transcript, goat_score, and recording_url

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript TEXT,
  goat_score INTEGER CHECK (goat_score >= 0 AND goat_score <= 100),
  recording_url TEXT,
  persona_mode TEXT CHECK (persona_mode IN ('acquisition', 'disposition')),
  persona_id TEXT,
  call_status TEXT CHECK (call_status IN ('connecting', 'connected', 'ended', 'error')),
  logic_gates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);

-- Create index on goat_score for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_calls_goat_score ON calls(goat_score DESC);

-- Enable Row Level Security
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own calls
CREATE POLICY "Users can view own calls"
  ON calls
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own calls
CREATE POLICY "Users can insert own calls"
  ON calls
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own calls
CREATE POLICY "Users can update own calls"
  ON calls
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_calls_updated_at
  BEFORE UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE calls IS 'Stores call sessions with transcripts, scores, and recordings';
COMMENT ON COLUMN calls.transcript IS 'Full conversation transcript';
COMMENT ON COLUMN calls.goat_score IS 'GOAT Framework score (0-100)';
COMMENT ON COLUMN calls.recording_url IS 'URL to call recording if available';
COMMENT ON COLUMN calls.logic_gates IS 'JSON array of logic gate results';
