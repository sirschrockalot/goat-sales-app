-- Create story_library table for storing effective rapport-building stories
CREATE TABLE IF NOT EXISTS story_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_text TEXT NOT NULL,
  story_summary TEXT, -- Brief summary for quick reference
  origin_call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  engagement_rating INTEGER CHECK (engagement_rating >= 0 AND engagement_rating <= 10),
  industry_niche TEXT, -- e.g., 'probate', 'tired_landlord', 'tax_issues', 'family_move'
  property_location TEXT, -- City/state where story is grounded
  usage_count INTEGER DEFAULT 0, -- How many times this story has been used
  effectiveness_score DECIMAL(5,2), -- Average engagement when this story is used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_text) -- Prevent duplicate stories
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_story_library_industry_niche ON story_library(industry_niche);
CREATE INDEX IF NOT EXISTS idx_story_library_engagement_rating ON story_library(engagement_rating DESC);
CREATE INDEX IF NOT EXISTS idx_story_library_effectiveness_score ON story_library(effectiveness_score DESC);
CREATE INDEX IF NOT EXISTS idx_story_library_origin_call_id ON story_library(origin_call_id);

-- Create prompt_versions table for tracking prompt evolution and rollback capability
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  prompt_text TEXT NOT NULL, -- Full system prompt
  changes_summary TEXT, -- What changed in this version
  stories_added TEXT[], -- Array of story IDs added in this version
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin who applied (or system)
  is_active BOOLEAN DEFAULT TRUE, -- Only one active version per assistant
  performance_metrics JSONB DEFAULT '{}'::jsonb, -- Store metrics after this version (avg humanity score, etc.)
  rollback_reason TEXT, -- If rolled back, why
  rolled_back_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint: only one active version per assistant
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_versions_active_assistant 
  ON prompt_versions(assistant_id) 
  WHERE is_active = TRUE;

-- Create index for querying versions by assistant
CREATE INDEX IF NOT EXISTS idx_prompt_versions_assistant_id ON prompt_versions(assistant_id, version_number DESC);

-- Function to update updated_at timestamp for story_library
CREATE OR REPLACE FUNCTION update_story_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_story_library_updated_at
  BEFORE UPDATE ON story_library
  FOR EACH ROW
  EXECUTE FUNCTION update_story_library_updated_at();

-- Add comments
COMMENT ON TABLE story_library IS 'Permanent library of effective rapport-building stories extracted from successful calls';
COMMENT ON COLUMN story_library.story_text IS 'Full text of the third-party story or rapport pivot';
COMMENT ON COLUMN story_library.engagement_rating IS 'Engagement level (0-10) from the original call where this story was used';
COMMENT ON COLUMN story_library.industry_niche IS 'Category of story (probate, tired_landlord, tax_issues, family_move, etc.)';
COMMENT ON COLUMN story_library.effectiveness_score IS 'Average engagement rating across all uses of this story';

COMMENT ON TABLE prompt_versions IS 'Version history of assistant prompts for rollback capability';
COMMENT ON COLUMN prompt_versions.version_number IS 'Sequential version number for this assistant';
COMMENT ON COLUMN prompt_versions.is_active IS 'Only one active version per assistant at a time';
COMMENT ON COLUMN prompt_versions.performance_metrics IS 'JSON object storing performance data after this version was applied';
