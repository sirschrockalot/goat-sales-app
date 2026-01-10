-- Create script_segments table for the 5-gate script with embeddings
CREATE TABLE IF NOT EXISTS script_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_number INTEGER NOT NULL CHECK (gate_number >= 1 AND gate_number <= 5),
  gate_name TEXT NOT NULL,
  script_text TEXT NOT NULL,
  embedding vector(1536),
  keywords TEXT[], -- Array of keywords for this gate
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on gate_number for faster queries
CREATE INDEX IF NOT EXISTS idx_script_segments_gate_number ON script_segments(gate_number);

-- Create index on embedding for similarity search
CREATE INDEX IF NOT EXISTS idx_script_segments_embedding ON script_segments 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE script_segments ENABLE ROW LEVEL SECURITY;

-- Create policy: Allow read access to all authenticated users
CREATE POLICY "Allow read access to script segments"
  ON script_segments
  FOR SELECT
  USING (true);

-- Create RPC function to match script segments
CREATE OR REPLACE FUNCTION match_script_segments(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  gate_number integer,
  gate_name text,
  script_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    script_segments.id,
    script_segments.gate_number,
    script_segments.gate_name,
    script_segments.script_text,
    1 - (script_segments.embedding <=> query_embedding) AS similarity
  FROM script_segments
  WHERE script_segments.embedding IS NOT NULL
    AND 1 - (script_segments.embedding <=> query_embedding) > match_threshold
  ORDER BY script_segments.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Insert the 5 script gates (without embeddings - these will be generated via webhook)
INSERT INTO script_segments (gate_number, gate_name, script_text, keywords) VALUES
(1, 'The Intro (Approval/Denial)', 
 'Hi (Name), this is (My Name)! I''m calling about your property on (Address)... I can promise you one of two things: I''m either going to give you an approval with an offer, or a denial with the reason why. Fair enough?',
 ARRAY['approval', 'denial', 'fair enough', 'solid fit', 'pen and paper']),
(2, 'Fact Find (The Why)',
 'Catch me up to speed, (Name). What''s got you even thinking about selling?',
 ARRAY['what''s got you thinking', 'why selling', 'motivation', 'probate', 'taxes', 'moving', 'married', 'kids']),
(3, 'The Pitch (Inside/Outside)',
 'We open the front door—what am I seeing?... If you had $20-$30k to spend updating, where would you put it?',
 ARRAY['front door', 'kitchen', 'slab', 'basement', 'unpermitted', 'structural', 'shoes', '45-day', 'hold']),
(4, 'The Offer (Virtual Withdraw)',
 'Your property was just approved for purchase... We''ve moved your funds into a Virtual Withdraw Account. Write this reference number down: (VW ##).',
 ARRAY['approved', 'virtual withdraw', 'as-is', 'don''t lift a finger', 'first one', 'five days', 'pivot', 'pain']),
(5, 'The Close (Agreement)',
 'Let''s verify your name and address... I''m sending a simple two-page agreement. It''s written in third-grade English.',
 ARRAY['verify', 'name', 'address', 'agreement', 'two-page', 'third-grade', 'transaction coordinator', 'photographer', 'signature', 'click send']);

-- Add comment
COMMENT ON TABLE script_segments IS 'Script segments for the 5-gate Eric Cline Wholesaling Script 2.0';
COMMENT ON FUNCTION match_script_segments IS 'Finds script segments similar to the query embedding using cosine similarity';
