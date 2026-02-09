-- ============================================================================
-- Migration: Add user status field for manual suspension mechanism
-- Date: 2026-02-09
-- Purpose: Allow admins to suspend/unsuspend user accounts
-- ============================================================================

-- Add status column with CHECK constraint
ALTER TABLE public.users
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended'));

-- Add index for filtering by status (useful for admin queries)
CREATE INDEX idx_users_status ON public.users (status)
  WHERE status != 'active'; -- partial index: only index non-active users

-- Add comment for documentation
COMMENT ON COLUMN public.users.status IS 'Account status: active (default) or suspended (manually by admin)';
