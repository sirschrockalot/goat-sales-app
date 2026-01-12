-- Create billing_logs table for tracking training costs
-- Tracks costs for OpenAI, Vapi, and ElevenLabs with sandbox environment tagging

CREATE TABLE IF NOT EXISTS billing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'vapi', 'elevenlabs')),
  model TEXT, -- e.g., 'gpt-4o-mini', 'gpt-4o', 'turbo-v2.5'
  input_tokens INTEGER,
  output_tokens INTEGER,
  duration_minutes NUMERIC(10, 2), -- For Vapi/ElevenLabs
  cost NUMERIC(10, 4) NOT NULL, -- Cost in USD
  env TEXT NOT NULL DEFAULT 'sandbox' CHECK (env IN ('sandbox', 'production')),
  metadata JSONB DEFAULT '{}', -- Additional metadata (battleId, personaId, sessionId, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_billing_logs_env_created ON billing_logs(env, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_logs_provider ON billing_logs(provider);
CREATE INDEX IF NOT EXISTS idx_billing_logs_env_date ON billing_logs(env, DATE(created_at));

-- RLS policies (service_role can access all, users can only read)
ALTER TABLE billing_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role can manage billing logs"
  ON billing_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own billing logs (if needed in future)
CREATE POLICY "Users can read billing logs"
  ON billing_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE billing_logs IS 'Tracks costs for OpenAI, Vapi, and ElevenLabs during autonomous training';
COMMENT ON COLUMN billing_logs.provider IS 'Service provider: openai, vapi, or elevenlabs';
COMMENT ON COLUMN billing_logs.cost IS 'Cost in USD';
COMMENT ON COLUMN billing_logs.env IS 'Environment: sandbox or production';
COMMENT ON COLUMN billing_logs.metadata IS 'Additional metadata (battleId, personaId, sessionId, etc.)';
