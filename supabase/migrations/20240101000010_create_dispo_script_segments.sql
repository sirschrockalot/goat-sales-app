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

-- Pre-seed the 5 Dispo script gates
INSERT INTO dispo_script_segments (gate_number, gate_name, script_text, objective, success_criteria) VALUES
(1, 'The Intro (Value Proposition)', 'Hi (Name), this is (My Name) from (Company). I''m calling because I saw your property on (Platform) and I''m interested in making you a cash offer. I specialize in quick closes—can we talk for 2 minutes?', 'Establish credibility and get permission to proceed', '{"keywords": ["cash offer", "quick close", "2 minutes"], "tone": "confident, direct"}'),
(2, 'Fact Find (ARV & Condition)', 'Before I make an offer, I need to understand the property. What''s your estimated ARV (After Repair Value)? And walk me through the condition—what needs work?', 'Gather property details and assess ARV accuracy', '{"keywords": ["ARV", "condition", "repairs"], "questions": ["ARV estimate", "property condition"]}'),
(3, 'The Pitch (Neighborhood Context)', 'I''ve done deals in this area before. What''s the neighborhood like? Any concerns about comps or market trends I should know about?', 'Build rapport and understand market context', '{"keywords": ["neighborhood", "comps", "market"], "tone": "consultative"}'),
(4, 'The Offer (Timeline & Terms)', 'Based on what you''ve told me, I can offer $X as-is, cash, close in 7-14 days. No inspections, no contingencies. Does that timeline work for you?', 'Present offer with clear timeline and terms', '{"keywords": ["as-is", "cash", "7-14 days", "no contingencies"], "tone": "decisive"}'),
(5, 'The Close (Agreement & Next Steps)', 'Great! I''ll send over a simple purchase agreement. Once you sign, we''ll schedule the title work and get this closed. Sound good?', 'Secure agreement and set expectations', '{"keywords": ["purchase agreement", "title work", "closed"], "tone": "assumptive close"}')
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE dispo_script_segments IS 'Dispositions script segments for training reps on selling to investors';
COMMENT ON COLUMN dispo_script_segments.embedding IS 'Vector embedding for semantic similarity matching';
