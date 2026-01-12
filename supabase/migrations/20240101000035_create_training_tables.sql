-- ============================================================================
-- Training Tables Migration
-- Creates tables for autonomous training: training_personas, golden_calls, market_benchmarks
-- ============================================================================

-- Training Personas Table
-- Stores Principal Partner personas for autonomous battle training
CREATE TABLE IF NOT EXISTS training_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  archetype VARCHAR(100) NOT NULL,
  pain_points TEXT[] DEFAULT '{}',
  personality_traits TEXT[] DEFAULT '{}',
  baseline_objections TEXT[] DEFAULT '{}',
  system_prompt TEXT,
  attack_patterns TEXT[] DEFAULT '{}',
  difficulty_level VARCHAR(20) DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Golden Calls Table
-- Stores reference "perfect" call transcripts for AI training baseline
CREATE TABLE IF NOT EXISTS golden_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript TEXT NOT NULL,
  humanity_score INTEGER CHECK (humanity_score >= 0 AND humanity_score <= 100),
  tactical_score INTEGER CHECK (tactical_score >= 0 AND tactical_score <= 100),
  exit_strategy VARCHAR(50),
  winning_rebuttals TEXT[] DEFAULT '{}',
  acoustic_textures_used TEXT[] DEFAULT '{}',
  creative_finance_pivot BOOLEAN DEFAULT false,
  assignment_spread DECIMAL(10, 2),
  call_duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market Benchmarks Table
-- Stores market data for Dynamic Underwriting system
CREATE TABLE IF NOT EXISTS market_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code VARCHAR(10) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(2),
  avg_cash_to_arv DECIMAL(5, 2) NOT NULL, -- Percentage (e.g., 70.00 = 70%)
  typical_repairs DECIMAL(10, 2) DEFAULT 0,
  market_type VARCHAR(50) DEFAULT 'moderate', -- 'hot', 'moderate', 'cold'
  flip_volume_percentage DECIMAL(5, 2) DEFAULT 0,
  rental_yield_percentage DECIMAL(5, 2) DEFAULT 0,
  days_on_market_avg INTEGER DEFAULT 45,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(zip_code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_personas_archetype ON training_personas(archetype);
CREATE INDEX IF NOT EXISTS idx_training_personas_active ON training_personas(is_active);
CREATE INDEX IF NOT EXISTS idx_golden_calls_exit_strategy ON golden_calls(exit_strategy);
CREATE INDEX IF NOT EXISTS idx_market_benchmarks_zip ON market_benchmarks(zip_code);
CREATE INDEX IF NOT EXISTS idx_market_benchmarks_type ON market_benchmarks(market_type);
