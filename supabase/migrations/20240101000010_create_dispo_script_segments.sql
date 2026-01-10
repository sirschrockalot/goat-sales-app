-- Create dispo_script_segments table for Dispositions training
CREATE TABLE IF NOT EXISTS dispo_script_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_number INTEGER NOT NULL CHECK (gate_number BETWEEN 1 AND 5),
  gate_name TEXT NOT NULL,
  script_text TEXT NOT NULL,
  objective TEXT,
  success_criteria JSONB,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on gate_number for fast lookups
CREATE INDEX IF NOT EXISTS idx_dispo_script_gate_number ON dispo_script_segments(gate_number);

-- Create index on embedding for vector similarity search
CREATE INDEX IF NOT EXISTS idx_dispo_script_embedding ON dispo_script_segments 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE dispo_script_segments ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read script segments (for training)
CREATE POLICY "Anyone can read dispo script segments"
  ON dispo_script_segments
  FOR SELECT
  USING (true);

-- Create policy: Only admins can modify script segments
CREATE POLICY "Admins can modify dispo script segments"
  ON dispo_script_segments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Pre-seed the 5 Dispo script gates (from DISPO_SCRIPT_MAPPING.md)
INSERT INTO dispo_script_segments (gate_number, gate_name, script_text, objective, success_criteria) VALUES
(1, 'The Hook (The Numbers)', 'Hey (Buyer), I''ve got a heavy-hitter in (Neighborhood). Buy-in is ($$$), ARV is ($$$). It''s a bread-and-butter flip with a $50k spread. You interested in the numbers?', 'Capture interest with the profit potential and ROI', '{"keywords": ["ARV", "Buy-in", "Spread", "ROI", "Bread-and-butter"], "intent": "Leading with financial benefit", "tonality": "Professional, urgent, authoritative"}'),
(2, 'The Narrative (The Comp Analysis)', 'The comps at (Address) just sold for ($$$). This is the worst house on the best street. Needs about $25k in cosmetics and you''re at full value.', 'Build confidence in the valuation using market data', '{"keywords": ["Comps", "Sold", "Cosmetics", "ARV justification"], "logic": "Comparing subject property to recent neighborhood sales"}'),
(3, 'The Scarcity Anchor (The Competition)', 'I''m sending this to my top 5 buyers right now. I''ve already got walkthroughs being requested for tomorrow. If you want to lock this up, you have to move now.', 'Force a decision by establishing that the deal is moving fast', '{"keywords": ["Top 5 buyers", "Walkthroughs", "Lock it up", "Moving fast"], "tactics": "Creating FOMO environment"}'),
(4, 'The Terms (Transaction Clarity)', 'Standard terms: $5k non-refundable EMD, 7-day close. We use (Title Company). Does your capital work with that timeline?', 'Filter for real buyers by setting non-negotiable closing terms', '{"keywords": ["Non-refundable EMD", "7-day close", "Title company"], "verification": "Confirming buyer has funds ready and agrees to speed"}'),
(5, 'The Clinch (The Assignment)', 'I''m sending the assignment over to your email right now. Let me know the second you see it. Once you sign, the deal is yours and I''ll pull it from the list.', 'Get the assignment of contract signed immediately', '{"keywords": ["Sending assignment", "Sign now", "Deal is yours"], "action": "Directing buyer to stay on phone until signature confirmed"}')
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE dispo_script_segments IS 'Dispositions script segments for training reps on selling to investors';
COMMENT ON COLUMN dispo_script_segments.embedding IS 'Vector embedding for semantic similarity matching';
