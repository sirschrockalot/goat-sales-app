-- Create sandbox_personas table for storing autonomous battle personas
-- These personas are used in the Self-Play training environment

CREATE TABLE IF NOT EXISTS sandbox_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  persona_type TEXT NOT NULL, -- e.g., 'skeptic', 'price-anchorer', 'emotional-seller'
  system_prompt TEXT NOT NULL,
  characteristics JSONB DEFAULT '[]'::jsonb,
  attack_patterns JSONB DEFAULT '[]'::jsonb, -- Specific objections/attacks this persona uses
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index for persona type lookups
CREATE INDEX IF NOT EXISTS idx_sandbox_personas_type ON sandbox_personas(persona_type);
CREATE INDEX IF NOT EXISTS idx_sandbox_personas_active ON sandbox_personas(is_active) WHERE is_active = TRUE;

-- Create sandbox_battles table to track autonomous battle results
CREATE TABLE IF NOT EXISTS sandbox_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES sandbox_personas(id) ON DELETE CASCADE,
  closer_thread_id TEXT, -- Thread ID for the Apex Closer (Thread A)
  persona_thread_id TEXT, -- Thread ID for the Persona (Thread B)
  transcript TEXT,
  referee_score INTEGER CHECK (referee_score >= 0 AND referee_score <= 100),
  referee_feedback TEXT,
  math_defense_score INTEGER CHECK (math_defense_score >= 0 AND math_defense_score <= 10),
  humanity_score INTEGER CHECK (humanity_score >= 0 AND humanity_score <= 10),
  success_score INTEGER CHECK (success_score >= 0 AND success_score <= 10),
  verbal_yes_to_memorandum BOOLEAN DEFAULT FALSE,
  winning_rebuttal TEXT, -- The specific rebuttal that won the battle
  turns INTEGER DEFAULT 0,
  token_usage INTEGER DEFAULT 0, -- Total tokens used in this battle
  cost_usd NUMERIC(10, 4) DEFAULT 0, -- Cost in USD
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Create index for battle queries
CREATE INDEX IF NOT EXISTS idx_sandbox_battles_persona ON sandbox_battles(persona_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_battles_score ON sandbox_battles(referee_score DESC);
CREATE INDEX IF NOT EXISTS idx_sandbox_battles_created_at ON sandbox_battles(created_at DESC);

-- Create sandbox_tactics table for promoted tactics
CREATE TABLE IF NOT EXISTS sandbox_tactics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES sandbox_battles(id) ON DELETE CASCADE,
  tactic_text TEXT NOT NULL,
  is_synthetic BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 5, -- Priority for Prompt Merger (1-10, 5 is default)
  promoted_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index for tactic queries
CREATE INDEX IF NOT EXISTS idx_sandbox_tactics_battle ON sandbox_tactics(battle_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_tactics_active ON sandbox_tactics(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sandbox_tactics_priority ON sandbox_tactics(priority DESC);

-- Enable Row Level Security
ALTER TABLE sandbox_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_tactics ENABLE ROW LEVEL SECURITY;

-- Create policies: Allow service role to manage all records
-- In production, you may want to restrict this further
CREATE POLICY "Service role can manage sandbox_personas"
  ON sandbox_personas
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage sandbox_battles"
  ON sandbox_battles
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage sandbox_tactics"
  ON sandbox_tactics
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comments
COMMENT ON TABLE sandbox_personas IS 'AI personas used in autonomous Self-Play training battles';
COMMENT ON TABLE sandbox_battles IS 'Records of autonomous battles between Apex Closer and Personas';
COMMENT ON TABLE sandbox_tactics IS 'Winning tactics extracted from high-score battles and promoted to production';
