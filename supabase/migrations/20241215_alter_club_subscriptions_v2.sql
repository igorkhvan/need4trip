-- ============================================================================
-- Migration: Alter club_subscriptions to v2.0 format
-- Date: 2024-12-15
-- Purpose: Add status, grace_until columns and migrate from old format
-- Source: docs/BILLING_AND_LIMITS.md (section 4.4)
-- ============================================================================

-- Step 1: Add new columns
ALTER TABLE public.club_subscriptions 
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending','active','grace','expired')),
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_until TIMESTAMPTZ;

-- Step 2: Migrate existing data from old format
UPDATE public.club_subscriptions
SET 
  plan_id = plan,
  status = CASE 
    WHEN active = true AND (valid_until IS NULL OR valid_until > NOW()) THEN 'active'
    WHEN active = true AND valid_until <= NOW() THEN 'expired'
    ELSE 'expired'
  END,
  current_period_end = valid_until
WHERE plan_id IS NULL;

-- Step 3: Set plan_id as NOT NULL and add FK
ALTER TABLE public.club_subscriptions
  ALTER COLUMN plan_id SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Step 4: Add FK constraint to new club_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_club_subscriptions_plan_id'
  ) THEN
    ALTER TABLE public.club_subscriptions
      ADD CONSTRAINT fk_club_subscriptions_plan_id
      FOREIGN KEY (plan_id) REFERENCES public.club_plans(id);
  END IF;
END $$;

-- Step 5: Drop old columns
ALTER TABLE public.club_subscriptions
  DROP COLUMN IF EXISTS plan,
  DROP COLUMN IF EXISTS active,
  DROP COLUMN IF EXISTS valid_until;

-- Step 6: Drop old indexes
DROP INDEX IF EXISTS public.idx_club_subscriptions_active;
DROP INDEX IF EXISTS public.idx_club_subscriptions_expiring;

-- Step 7: Create new indexes
CREATE INDEX IF NOT EXISTS idx_club_subscriptions_status 
  ON public.club_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_club_subscriptions_grace_expiring 
  ON public.club_subscriptions(grace_until) 
  WHERE status = 'grace' AND grace_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_club_subscriptions_period_expiring 
  ON public.club_subscriptions(current_period_end) 
  WHERE status = 'active' AND current_period_end IS NOT NULL;

-- Step 8: Update comments
COMMENT ON TABLE public.club_subscriptions IS 'Club subscription state (v2.0 billing)';
COMMENT ON COLUMN public.club_subscriptions.plan_id IS 'Plan ID (FK to club_plans)';
COMMENT ON COLUMN public.club_subscriptions.status IS 'Subscription status: pending, active, grace, expired';
COMMENT ON COLUMN public.club_subscriptions.current_period_start IS 'Start of current billing period';
COMMENT ON COLUMN public.club_subscriptions.current_period_end IS 'End of current billing period';
COMMENT ON COLUMN public.club_subscriptions.grace_until IS 'Grace period end date (if status=grace)';

-- Step 9: Drop old function (replaced by new billing logic)
DROP FUNCTION IF EXISTS public.deactivate_expired_club_subscriptions();
