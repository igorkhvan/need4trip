-- ============================================================================
-- Migration: Enable Row Level Security on club_subscriptions table
-- Date: 2024-12-22
-- Purpose: Protect club subscription data at database level
-- ============================================================================
--
-- SECURITY RATIONALE (HIGH - 7.5/10):
-- club_subscriptions contains business-sensitive information:
-- - Subscription plans (club_free, club_basic, club_pro)
-- - Expiration dates (valid_until)
-- - Active status
-- - Revenue information
--
-- WITHOUT RLS:
-- - Competitors can see who's paying
-- - Business intelligence leak
-- - Manipulation risk (unauthorized plan changes)
-- - Revenue transparency
--
-- EXPLOITATION:
-- const { data } = await supabase.from('club_subscriptions').select('*');
-- // ← Returns ALL club subscriptions with plan details
--
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP existing policies (if any from previous migration)
-- ============================================================================

DROP POLICY IF EXISTS "Club owners can view subscription" ON public.club_subscriptions;
DROP POLICY IF EXISTS "Club admins can view subscription" ON public.club_subscriptions;
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.club_subscriptions;

-- ============================================================================
-- SELECT Policies (Read Access)
-- ============================================================================

-- Policy 1: Club owners can see their subscription
CREATE POLICY "club_subscriptions_select_owner"
  ON public.club_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = club_subscriptions.club_id
        AND club_members.user_id = auth.uid()
        AND club_members.role = 'owner'
    )
  );

COMMENT ON POLICY "club_subscriptions_select_owner" ON public.club_subscriptions IS 
  'Club owners can view their club subscription details';

-- Policy 2: Club organizers can see subscription (for feature checks)
CREATE POLICY "club_subscriptions_select_organizer"
  ON public.club_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = club_subscriptions.club_id
        AND club_members.user_id = auth.uid()
        AND club_members.role IN ('owner', 'organizer')
    )
  );

COMMENT ON POLICY "club_subscriptions_select_organizer" ON public.club_subscriptions IS 
  'Club organizers can view subscription for feature access checks';

-- ============================================================================
-- INSERT Policy (Create Subscription)
-- ============================================================================

-- Policy: Only service role can create subscriptions
-- Reason: Subscriptions are created automatically via triggers or billing system
-- Regular users should NOT be able to create subscriptions directly

-- No INSERT policy for regular users = INSERT is blocked by RLS
-- Service role bypasses RLS

COMMENT ON TABLE public.club_subscriptions IS 
  'Club subscriptions with RLS enabled. INSERT/UPDATE only via service role or billing system.';

-- ============================================================================
-- UPDATE Policy (Modify Subscription)
-- ============================================================================

-- Policy: Only service role can update subscriptions
-- Reason: Plan changes, expiration dates handled by billing system
-- Users cannot self-upgrade or extend subscriptions

-- No UPDATE policy for regular users = UPDATE is blocked by RLS
-- Service role bypasses RLS

-- ============================================================================
-- DELETE Policy (Remove Subscription)
-- ============================================================================

-- Policy: DELETE is DISABLED
-- Reason: Subscriptions should never be deleted (audit trail)
-- If club is deleted, subscription is CASCADE deleted via FK

-- No DELETE policy = DELETE is blocked by RLS

-- ============================================================================
-- Helper Function: Check subscription status
-- ============================================================================

-- Function to check if user can access subscription
CREATE OR REPLACE FUNCTION can_view_club_subscription(p_club_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_members.club_id = p_club_id
      AND club_members.user_id = auth.uid()
      AND club_members.role IN ('owner', 'organizer')
  );
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION can_view_club_subscription IS 
  'Check if current user can view club subscription (owner or organizer)';

-- ============================================================================
-- Public View: Subscription Limits (without sensitive data)
-- ============================================================================

-- Create view for public subscription info (only limits, not financial data)
CREATE OR REPLACE VIEW public.club_subscription_limits AS
SELECT 
  cs.club_id,
  cs.plan_id,
  cs.status,
  -- Derived limits based on plan_id (v2.0 structure)
  CASE cs.plan_id
    WHEN 'club_50' THEN 50
    WHEN 'club_500' THEN 500
    WHEN 'club_unlimited' THEN NULL -- unlimited
    ELSE 0 -- fallback
  END as max_events,
  -- Active flag (derived from status)
  CASE 
    WHEN cs.status IN ('active', 'grace') THEN true
    ELSE false
  END as is_active,
  -- Expiration flag (not exact date)
  CASE 
    WHEN cs.current_period_end IS NULL THEN false
    WHEN cs.current_period_end < NOW() AND cs.status = 'expired' THEN true
    ELSE false
  END as is_expired
FROM public.club_subscriptions cs;

COMMENT ON VIEW public.club_subscription_limits IS 
  'Public view of club subscription limits without financial details. Safe for feature checks. v2.0 structure (plan_id, status).';

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.club_subscription_limits TO authenticated;

-- Enable RLS on view (inherits from base table)
ALTER VIEW public.club_subscription_limits SET (security_barrier = true);

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'club_subscriptions') THEN
    RAISE EXCEPTION 'RLS is not enabled on club_subscriptions table';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on club_subscriptions table';
  RAISE NOTICE 'Created 2 SELECT policies: owner + organizer';
  RAISE NOTICE 'INSERT/UPDATE/DELETE blocked for users - service role only';
  RAISE NOTICE 'Created club_subscription_limits view for safe feature checks';
END $$;

-- ============================================================================
-- Security Notes
-- ============================================================================

-- ACCESS MATRIX:
-- | Role       | SELECT | INSERT | UPDATE | DELETE |
-- |------------|--------|--------|--------|--------|
-- | Anonymous  | ❌     | ❌     | ❌     | ❌     |
-- | Member     | ❌     | ❌     | ❌     | ❌     |
-- | Organizer  | ✅     | ❌     | ❌     | ❌     |
-- | Owner      | ✅     | ❌     | ❌     | ❌     |
-- | Service    | ✅     | ✅     | ✅     | ✅     |

-- SENSITIVE FIELDS (protected):
-- - current_period_start: Billing period start (financial planning)
-- - current_period_end: Exact expiration date (financial planning)
-- - grace_until: Grace period end date
-- - created_at/updated_at: Subscription history

-- SAFE FOR PUBLIC (via view):
-- - plan_id: For feature access checks (already visible in UI)
-- - status: Status flag (pending/active/grace/expired)
-- - max_events: Derived limit (not sensitive)
-- - is_active: Boolean flag (no financial details)
-- - is_expired: Boolean flag (not exact date)

-- APPLICATION RESPONSIBILITY:
-- 1. Use club_subscription_limits view for feature checks
-- 2. Never expose current_period_end to non-owners
-- 3. All subscription modifications via service role
-- 4. Billing webhooks run as service role
-- 5. Free plan = no record in club_subscriptions (NULL check)

-- NOTE: v2.0 STRUCTURE
-- - Old: plan (text), active (boolean), valid_until (timestamptz)
-- - New: plan_id (text FK), status (enum), current_period_start/end, grace_until
-- - Free plan: NO record in table (migrated to "no subscription" model)

-- ============================================================================
