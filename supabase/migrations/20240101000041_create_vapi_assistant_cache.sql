-- Create VAPI Assistant Cache table
-- Caches assistant configurations to avoid creating duplicate assistants

CREATE TABLE IF NOT EXISTS vapi_assistant_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id TEXT NOT NULL,
  config_hash TEXT NOT NULL UNIQUE,

  -- Cacheable configuration parameters
  persona_mode TEXT NOT NULL CHECK (persona_mode IN ('acquisition', 'disposition')),
  gauntlet_level INTEGER CHECK (gauntlet_level IS NULL OR (gauntlet_level >= 1 AND gauntlet_level <= 5)),
  difficulty INTEGER CHECK (difficulty IS NULL OR (difficulty >= 1 AND difficulty <= 10)),
  role_reversal BOOLEAN NOT NULL DEFAULT false,
  exit_strategy TEXT,
  property_location TEXT,
  apex_level TEXT DEFAULT 'standard',
  battle_test_mode BOOLEAN NOT NULL DEFAULT false,

  -- Cache metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  use_count INTEGER NOT NULL DEFAULT 1,

  -- Constraints
  CONSTRAINT valid_level_or_difficulty CHECK (
    (gauntlet_level IS NOT NULL AND difficulty IS NULL) OR
    (gauntlet_level IS NULL AND difficulty IS NOT NULL) OR
    (gauntlet_level IS NULL AND difficulty IS NULL)
  )
);

-- Index for fast lookups by config hash
CREATE INDEX IF NOT EXISTS idx_vapi_assistant_cache_config_hash
  ON vapi_assistant_cache(config_hash);

-- Index for cleanup queries (oldest entries)
CREATE INDEX IF NOT EXISTS idx_vapi_assistant_cache_last_used
  ON vapi_assistant_cache(last_used_at);

-- Index for expired entries cleanup
CREATE INDEX IF NOT EXISTS idx_vapi_assistant_cache_created
  ON vapi_assistant_cache(created_at);

-- Index for analytics by persona mode
CREATE INDEX IF NOT EXISTS idx_vapi_assistant_cache_persona_mode
  ON vapi_assistant_cache(persona_mode);

-- Comment on table
COMMENT ON TABLE vapi_assistant_cache IS 'Caches VAPI assistant IDs by configuration hash to avoid creating duplicates';

-- Comment on columns
COMMENT ON COLUMN vapi_assistant_cache.config_hash IS 'SHA-256 hash (first 16 chars) of cacheable configuration';
COMMENT ON COLUMN vapi_assistant_cache.assistant_id IS 'VAPI assistant ID';
COMMENT ON COLUMN vapi_assistant_cache.use_count IS 'Number of times this cached assistant has been reused';
COMMENT ON COLUMN vapi_assistant_cache.property_location IS 'Normalized region code (southwest, west, etc.) for voice selection';
