-- Create Training Insights table
-- Stores extracted insights from analyzed calls for AI training

CREATE TABLE IF NOT EXISTS training_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Call reference
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,

  -- Mode (acquisition or disposition)
  mode TEXT NOT NULL CHECK (mode IN ('acquisition', 'disposition')),

  -- Insight classification
  insight_type TEXT NOT NULL CHECK (insight_type IN ('rebuttal', 'technique', 'story', 'objection_handling', 'closing')),
  category TEXT NOT NULL, -- e.g., 'price_objection', 'arv_objection', 'rapport_building'

  -- Insight content
  content TEXT NOT NULL, -- The actual words/technique used
  context TEXT, -- What triggered this, which gate
  effectiveness INTEGER CHECK (effectiveness >= 0 AND effectiveness <= 10),
  seller_response TEXT, -- How the other party responded
  coaching_note TEXT, -- Why this worked

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true, -- Can be disabled if technique becomes outdated
  usage_count INTEGER NOT NULL DEFAULT 0 -- Track how often this insight is used in training
);

-- Index for fast lookups by mode and category
CREATE INDEX IF NOT EXISTS idx_training_insights_mode_category
  ON training_insights(mode, category);

-- Index for high-effectiveness insights
CREATE INDEX IF NOT EXISTS idx_training_insights_effectiveness
  ON training_insights(effectiveness DESC) WHERE effectiveness >= 7;

-- Index for call reference
CREATE INDEX IF NOT EXISTS idx_training_insights_call_id
  ON training_insights(call_id);

-- Index for insight type
CREATE INDEX IF NOT EXISTS idx_training_insights_type
  ON training_insights(insight_type);

-- Comment on table
COMMENT ON TABLE training_insights IS 'Stores extracted insights from analyzed calls for AI training';

-- Comment on columns
COMMENT ON COLUMN training_insights.insight_type IS 'Type: rebuttal, technique, story, objection_handling, closing';
COMMENT ON COLUMN training_insights.category IS 'Specific category like price_objection, arv_objection, rapport_building';
COMMENT ON COLUMN training_insights.effectiveness IS 'How effective this technique was (0-10) based on response';
COMMENT ON COLUMN training_insights.coaching_note IS 'Explanation of why this technique worked';
COMMENT ON COLUMN training_insights.usage_count IS 'Track how often this insight is injected into training';

-- Add training_analysis column to calls table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'training_analysis'
  ) THEN
    ALTER TABLE calls ADD COLUMN training_analysis JSONB;
    COMMENT ON COLUMN calls.training_analysis IS 'JSON containing training analysis results (score, summary, insights count)';
  END IF;
END $$;

-- Create index on training_analysis for finding analyzed calls
CREATE INDEX IF NOT EXISTS idx_calls_training_analysis
  ON calls(training_analysis) WHERE training_analysis IS NOT NULL;
