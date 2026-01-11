-- Create ai_optimizations table for Continuous Learning Loop
-- Stores detected weaknesses and suggested prompt improvements

CREATE TABLE IF NOT EXISTS ai_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id TEXT NOT NULL,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  detected_weakness TEXT NOT NULL,
  suggested_prompt_tweak TEXT NOT NULL,
  sentiment_score INTEGER NOT NULL CHECK (sentiment_score >= 0 AND sentiment_score <= 100),
  humanity_score INTEGER NOT NULL CHECK (humanity_score >= 0 AND humanity_score <= 100),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying optimizations by assistant
CREATE INDEX IF NOT EXISTS idx_ai_optimizations_assistant_id ON ai_optimizations(assistant_id);

-- Index for querying unapplied optimizations
CREATE INDEX IF NOT EXISTS idx_ai_optimizations_applied ON ai_optimizations(applied) WHERE applied = FALSE;

-- Index for querying by priority
CREATE INDEX IF NOT EXISTS idx_ai_optimizations_priority ON ai_optimizations(priority);

-- Index for querying by call_id
CREATE INDEX IF NOT EXISTS idx_ai_optimizations_call_id ON ai_optimizations(call_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_optimizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_ai_optimizations_updated_at
  BEFORE UPDATE ON ai_optimizations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_optimizations_updated_at();

-- Add comment
COMMENT ON TABLE ai_optimizations IS 'Stores AI learning moments and suggested prompt optimizations from sentiment analysis';
COMMENT ON COLUMN ai_optimizations.assistant_id IS 'Vapi Assistant ID that needs optimization';
COMMENT ON COLUMN ai_optimizations.detected_weakness IS 'Description of the detected weakness (e.g., "AI was too fast at Gate 3")';
COMMENT ON COLUMN ai_optimizations.suggested_prompt_tweak IS 'Specific suggestion for improving the system prompt';
COMMENT ON COLUMN ai_optimizations.sentiment_score IS 'Overall sentiment score from the call (0-100)';
COMMENT ON COLUMN ai_optimizations.humanity_score IS 'Humanity score indicating how human-like the AI sounded (0-100)';
COMMENT ON COLUMN ai_optimizations.priority IS 'Priority level: high, medium, or low';
COMMENT ON COLUMN ai_optimizations.applied IS 'Whether this optimization has been applied to the assistant';
