-- Add status column to prompt_versions table for approval workflow
ALTER TABLE prompt_versions 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending_review', 'active', 'rejected', 'draft')) DEFAULT 'pending_review';

-- Update is_active to be based on status
-- Only 'active' status should have is_active = true
UPDATE prompt_versions 
SET is_active = (status = 'active')
WHERE status IS NOT NULL;

-- Create index for querying pending reviews
CREATE INDEX IF NOT EXISTS idx_prompt_versions_status ON prompt_versions(status);

-- Add comment
COMMENT ON COLUMN prompt_versions.status IS 'Approval status: pending_review (awaiting admin approval), active (live), rejected (not approved), draft (being edited)';
