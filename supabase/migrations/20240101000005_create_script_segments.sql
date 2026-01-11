-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create script_segments table for the 5-gate script with embeddings
CREATE TABLE IF NOT EXISTS script_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_number INTEGER NOT NULL CHECK (gate_number >= 1 AND gate_number <= 8),
  gate_name TEXT NOT NULL,
  script_text TEXT NOT NULL,
  embedding vector(1536),
  keywords TEXT[], -- Array of keywords for this gate
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on gate_number for faster queries
CREATE INDEX IF NOT EXISTS idx_script_segments_gate_number ON script_segments(gate_number);

-- Create index on embedding for similarity search (only if column exists)
DO $$ 
BEGIN
  -- Check if embedding column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'script_segments' AND column_name = 'embedding'
  ) THEN
    -- Try to create the index, but don't fail if operator class doesn't exist
    BEGIN
      CREATE INDEX IF NOT EXISTS idx_script_segments_embedding ON script_segments 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    EXCEPTION
      WHEN undefined_object THEN
        -- Operator class doesn't exist, try without specifying it or use HNSW
        BEGIN
          CREATE INDEX IF NOT EXISTS idx_script_segments_embedding ON script_segments 
          USING ivfflat (embedding)
          WITH (lists = 100);
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE 'Could not create vector index: %', SQLERRM;
        END;
    END;
  ELSE
    RAISE NOTICE 'embedding column does not exist. Skipping vector index creation.';
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE script_segments ENABLE ROW LEVEL SECURITY;

-- Create policy: Allow read access to all authenticated users
CREATE POLICY "Allow read access to script segments"
  ON script_segments
  FOR SELECT
  USING (true);

-- Create RPC function to match script segments (only if vector extension is fully enabled)
DO $$ 
DECLARE
  vector_type_exists BOOLEAN;
BEGIN
  -- Check if vector type exists and extension is enabled
  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'vector' AND n.nspname = 'public'
  ) INTO vector_type_exists;
  
  IF vector_type_exists THEN
    BEGIN
      -- Try to create the function using fully qualified type reference
      EXECUTE format('
        CREATE OR REPLACE FUNCTION match_script_segments(
          query_embedding public.vector(1536),
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
        AS $func$
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
        $func$;');
      RAISE NOTICE 'Successfully created match_script_segments function';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not create match_script_segments function: %. Skipping.', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'vector type not found in public schema. Skipping match_script_segments function creation.';
  END IF;
END $$;

-- Add keywords column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'script_segments' AND column_name = 'keywords'
  ) THEN
    ALTER TABLE script_segments ADD COLUMN keywords TEXT[];
  END IF;
END $$;

-- Insert the 8 script gates (Presidential Digs Real Estate Script 2.0)
INSERT INTO script_segments (gate_number, gate_name, script_text, keywords) VALUES
(1, 'Intro (Contact/Credibility)', 
 'Hi, [SELLER NAME], this is [YOUR NAME] with Presidential Digs Real Estate. How are you doing today? I''m calling about your property at [PROPERTY ADDRESS]. You popped up on our radar because you might be open to selling, and my job is to see whether your property even qualifies for one of our offers. Would it be okay if I ask you a few quick questions? Just so you know how this works: By the end of the call, one of three things will happen: 1. We''ll approve the property and make you an offer. 2. We''ll say it doesn''t fit our buying criteria and explain why. 3. Or we''ll decide it''s not a fit right now and part as friends. Does that sound fair? Before we dive in, do me a favor and grab a pen and paper so you know exactly who you''re dealing with. Write this down: My name is [YOUR NAME]. Our company is Presidential Digs Real Estate. Our best callback number is [COMPANY PHONE]. Can you read that number back to me so I know you''ve got it right?',
 ARRAY['presidential digs', 'qualifies', 'three things', 'approve', 'doesn''t fit', 'sound fair', 'pen and paper', 'read that number back', 'presidential digs real estate']),
(2, 'Fact Find - Motivation',
 'Catch me up to speed, [SELLER NAME] — what''s got you even thinking about selling this house? Is this a rental or your primary home? How long have you owned the property? Are you local or out of state? What do you like most about the property? What do you not like about it? When you sell, what are you hoping to do with the money? Are you married or do you have any other decision-makers involved in this? Is there anyone else who would need to sign off if we move forward? How soon would you like to have this behind you if everything lined up?',
 ARRAY['what''s got you thinking', 'why selling', 'motivation', 'probate', 'taxes', 'moving', 'married', 'kids', 'decision-makers', 'sign off', 'behind you', 'tell me a little more']),
(3, 'Fact Find - Condition',
 'Let''s talk about the house itself for a second. If I was walking through with you right now, what would I be seeing? What''s the exterior? Any known foundation issues? Cracks, shifting, doors sticking? How''s the roof? Any leaks, missing shingles, or soft spots? What kind of flooring do you have throughout? Have the kitchen and bathrooms been updated, or are they mostly original? Any plumbing or electrical issues you''re aware of? How old is the HVAC system? Water heater? When was the last time the roof was replaced? Any issues with the electrical panel? Any plumbing problems? Any known mold, water damage, or past flooding? If we were able to agree on a number that made sense to both of us, how soon would you be ready to close?',
 ARRAY['walking through', 'what would i be seeing', 'foundation', 'roof', 'kitchen', 'bathrooms', 'hvac', 'water heater', 'electrical', 'plumbing', 'mold', 'water damage', 'flooding', 'ready to close']),
(4, 'Transition to Numbers',
 'Okay, [SELLER NAME], I appreciate you walking me through all of that. Let me ask you this: if you had, say, $20,000 to $30,000 to put into the property, where do you think it would need to go first? What''s the neighborhood like — more owners or renters? Any problem neighbors or issues on the street? Anyone else on the block fixing up houses? If I were driving the neighborhood, is there anything big I would notice that we haven''t talked about yet? Have you thought about what you''d need to walk away with for this place to make sense for you?',
 ARRAY['$20,000', '$30,000', 'put into the property', 'where would it need to go', 'neighborhood', 'owners', 'renters', 'problem neighbors', 'walk away with', 'make sense for you']),
(5, 'Running Comps / Short Hold',
 'Alright, [SELLER NAME], here''s what I''m going to do. I''m going to plug everything you told me into our system and see what this looks like from an investor standpoint. It usually takes me a couple of minutes. Can you hang on the line while I do that, or would you rather I call you right back?',
 ARRAY['plug everything', 'our system', 'investor standpoint', 'couple of minutes', 'hang on the line', 'call you right back']),
(6, 'The Offer',
 'Okay, [SELLER NAME], thanks for hanging in there. I''ve got some good news and some things I want to walk you through. The way we buy is as-is: You don''t have to fix anything. You don''t have to clean the house. We cover normal closing costs. You pick the closing date that works best for you. In exchange, we need to buy it at a number that makes sense for us as investors. Based on the condition of the property, the repairs we talked about, and what similar homes are going for in that area, the number that makes the most sense for us is: $[OFFER PRICE]. I completely understand. Let me ask you this: What number did you have in mind that would make this a no-brainer for you?',
 ARRAY['as-is', 'don''t have to fix', 'don''t have to clean', 'cover closing costs', 'pick the closing date', 'based on the condition', 'repairs we talked about', 'similar homes', 'number that makes sense', 'no-brainer', 'meet in the middle']),
(7, 'The Close - Setting Expectations',
 'Here''s what the next steps look like so there are no surprises. 1. Agreement: We''ll send over a simple purchase agreement for $[FINAL PRICE]. It''s 2–3 pages, plain English. 2. Welcome Call: Our transaction coordinator will give you a welcome call, go over the timeline, and answer any questions. 3. Photos / Walkthrough: We''ll schedule a quick walkthrough or photos of the property — usually within a few days. 4. Title Work: The title company will do their job in the background and make sure everything is clear so you can get paid. 5. Closing: On closing day, you''ll sign the final paperwork and get your funds — either by wire or check, whichever you prefer. Does that all sound good to you?',
 ARRAY['next steps', 'agreement', '2–3 pages', 'plain english', 'transaction coordinator', 'welcome call', 'walkthrough', 'photos', 'title company', 'closing day', 'wire', 'check', 'sound good']),
(8, 'Final Commitment Questions',
 'Just so we''re on the same page, if we lock this in at $[FINAL PRICE], are you 100% ready to move forward and sell the property to us? Awesome. I''ll get the agreement sent to [SELLER EMAIL]. When you get it, I can stay on the line and walk you through the main points. It''ll only take a couple of minutes.',
 ARRAY['same page', 'lock this in', '100% ready', 'move forward', 'sell the property', 'agreement sent', 'stay on the line', 'walk you through', 'main points']);

-- Add comment
COMMENT ON TABLE script_segments IS 'Script segments for the 8-gate Presidential Digs Real Estate Wholesaling Sales Script 2.0';

-- Add comment on function only if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'match_script_segments' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'COMMENT ON FUNCTION match_script_segments IS ''Finds script segments similar to the query embedding using cosine similarity''';
  ELSE
    RAISE NOTICE 'match_script_segments function does not exist. Skipping comment.';
  END IF;
END $$;
