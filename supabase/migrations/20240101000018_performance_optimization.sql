-- Performance Optimization Migration
-- Adds indexes for frequently queried columns and creates a leaderboard view

-- ============================================================
-- INDEX OPTIMIZATION
-- ============================================================

-- Calls table indexes for leaderboard and history queries
-- Composite index for user_id + created_at (for user call history)
CREATE INDEX IF NOT EXISTS idx_calls_user_created_at 
  ON calls(user_id, created_at DESC);

-- Index on persona_mode for path-based filtering
CREATE INDEX IF NOT EXISTS idx_calls_persona_mode 
  ON calls(persona_mode) 
  WHERE persona_mode IS NOT NULL;

-- Index on call_status for filtering active/ended calls
CREATE INDEX IF NOT EXISTS idx_calls_status 
  ON calls(call_status) 
  WHERE call_status IS NOT NULL;

-- Index on ended_at for date range queries
CREATE INDEX IF NOT EXISTS idx_calls_ended_at 
  ON calls(ended_at DESC) 
  WHERE ended_at IS NOT NULL;

-- Profiles table indexes for role-based reporting
-- Index on assigned_path for filtering by training path
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_path 
  ON profiles(assigned_path) 
  WHERE assigned_path IS NOT NULL;

-- Composite index for path + level queries
CREATE INDEX IF NOT EXISTS idx_profiles_path_level 
  ON profiles(assigned_path, gauntlet_level) 
  WHERE assigned_path IS NOT NULL;

-- Index on experience_points for XP leaderboard
CREATE INDEX IF NOT EXISTS idx_profiles_experience_points 
  ON profiles(experience_points DESC) 
  WHERE experience_points IS NOT NULL;

-- Index on created_at for velocity calculations
CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
  ON profiles(created_at);

-- Script segments table indexes (if type column exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'script_segments' AND column_name = 'type'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_script_segments_type 
      ON script_segments(type) 
      WHERE type IS NOT NULL;
  END IF;
END $$;

-- Index on gate_number for rapid logic-gate matching
CREATE INDEX IF NOT EXISTS idx_script_segments_gate_number_optimized 
  ON script_segments(gate_number);

-- Index on dispo_script_segments gate_number
CREATE INDEX IF NOT EXISTS idx_dispo_script_gate_number_optimized 
  ON dispo_script_segments(gate_number);

-- ============================================================
-- LEADERBOARD VIEW
-- ============================================================

-- Create a materialized view for leaderboard data
-- This pre-calculates total_xp and avg_goat_score per user
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
  p.id AS user_id,
  p.name,
  p.email,
  p.assigned_path,
  p.gauntlet_level,
  COALESCE(p.experience_points, 0) AS total_xp,
  COALESCE(call_stats.avg_goat_score, 0) AS avg_goat_score,
  COALESCE(call_stats.total_calls, 0) AS total_calls,
  COALESCE(call_stats.last_call_date, p.created_at) AS last_call_date,
  p.created_at AS account_created_at,
  -- Calculate velocity (levels per day)
  CASE 
    WHEN p.created_at IS NOT NULL THEN
      ROUND(
        (p.gauntlet_level - 1)::NUMERIC / 
        GREATEST(
          EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0,
          1
        )::NUMERIC,
        2
      )
    ELSE 0
  END AS velocity
FROM profiles p
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) AS total_calls,
    ROUND(AVG(goat_score)) AS avg_goat_score,
    MAX(created_at) AS last_call_date
  FROM calls
  WHERE goat_score IS NOT NULL
  GROUP BY user_id
) call_stats ON p.id = call_stats.user_id
WHERE p.is_admin = FALSE;

-- Add comment
COMMENT ON VIEW leaderboard_view IS 'Pre-calculated leaderboard data with total_xp and avg_goat_score per user';

-- ============================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- ============================================================

-- Index on logic_gates for JSONB queries (if needed for gate analysis)
-- Note: GIN index for JSONB can be large, only create if needed
-- CREATE INDEX IF NOT EXISTS idx_calls_logic_gates_gin 
--   ON calls USING GIN (logic_gates) 
--   WHERE logic_gates IS NOT NULL;

-- Index on rebuttal_of_the_day for top rebuttals queries
CREATE INDEX IF NOT EXISTS idx_calls_rebuttal_of_the_day 
  ON calls(rebuttal_of_the_day) 
  WHERE rebuttal_of_the_day IS NOT NULL;
