-- ============================================================================
-- Migration: Create billing_policy_actions table
-- Date: 2024-12-15
-- Purpose: Define allowed actions per subscription status
-- Source: docs/BILLING_AND_LIMITS.md (section 4.3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_policy_actions (
  policy_id TEXT NOT NULL REFERENCES public.billing_policy(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','grace','expired')),
  action TEXT NOT NULL,                          -- Action code from canonical list
  is_allowed BOOLEAN NOT NULL DEFAULT false,
  
  PRIMARY KEY (policy_id, status, action)
);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_billing_policy_actions_lookup 
  ON public.billing_policy_actions(policy_id, status) 
  WHERE is_allowed = true;

-- Comments
COMMENT ON TABLE public.billing_policy_actions IS 'Defines which actions are allowed per subscription status';
COMMENT ON COLUMN public.billing_policy_actions.status IS 'Subscription status: pending, grace, expired';
COMMENT ON COLUMN public.billing_policy_actions.action IS 'Action code (e.g., CLUB_CREATE_EVENT, CLUB_EXPORT_PARTICIPANTS_CSV)';
COMMENT ON COLUMN public.billing_policy_actions.is_allowed IS 'Whether this action is allowed in this status';
