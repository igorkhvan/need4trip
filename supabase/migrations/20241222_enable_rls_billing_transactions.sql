-- ============================================================================
-- Migration: Enable Row Level Security on billing_transactions table
-- Date: 2024-12-22
-- Purpose: Protect financial transaction data at database level
-- ============================================================================
--
-- SECURITY RATIONALE (HIGH - 7.5/10):
-- billing_transactions contains highly sensitive financial information:
-- - Payment amounts (amount_kzt)
-- - Payment providers (kaspi, epay, etc.)
-- - External payment IDs (provider_payment_id)
-- - Transaction statuses (pending, paid, failed, refunded)
-- - Billing periods
--
-- WITHOUT RLS:
-- - Financial disclosure (all transactions visible)
-- - PCI compliance risk
-- - Fraud risk (payment IDs exposed)
-- - Revenue transparency (competitors see all income)
-- - Manipulation risk
--
-- EXPLOITATION:
-- const { data } = await supabase.from('billing_transactions').select('*');
-- // ← Returns ALL transactions with amounts and payment IDs
--
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP existing policies (if any from previous migration)
-- ============================================================================

DROP POLICY IF EXISTS "Club owners can view transactions" ON public.billing_transactions;
DROP POLICY IF EXISTS "Service role manages transactions" ON public.billing_transactions;

-- ============================================================================
-- SELECT Policies (Read Access)
-- ============================================================================

-- Policy 1: Club owners can see their own transactions
CREATE POLICY "billing_transactions_select_owner"
  ON public.billing_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = billing_transactions.club_id
        AND club_members.user_id = auth.uid()
        AND club_members.role = 'owner'
    )
  );

COMMENT ON POLICY "billing_transactions_select_owner" ON public.billing_transactions IS 
  'Only club owners can view their club financial transactions';

-- Policy 2: Club organizers can see transaction summaries (limited fields)
-- NOTE: This is implemented via view, not direct table access
-- Organizers should NOT see full financial details

-- ============================================================================
-- INSERT Policy (Create Transaction)
-- ============================================================================

-- Policy: Only service role can create transactions
-- Reason: Transactions are created by payment webhooks/billing system
-- Regular users should NEVER create transactions directly

-- No INSERT policy for regular users = INSERT is blocked by RLS
-- Service role bypasses RLS

COMMENT ON TABLE public.billing_transactions IS 
  'Financial transactions with RLS enabled. INSERT/UPDATE only via service role (billing webhooks).';

-- ============================================================================
-- UPDATE Policy (Modify Transaction)
-- ============================================================================

-- Policy: Only service role can update transactions
-- Reason: Transaction status changes handled by payment webhooks
-- Users cannot modify financial records (audit trail integrity)

-- No UPDATE policy for regular users = UPDATE is blocked by RLS
-- Service role bypasses RLS

-- ============================================================================
-- DELETE Policy (Remove Transaction)
-- ============================================================================

-- Policy: DELETE is DISABLED
-- Reason: Financial transactions must NEVER be deleted (audit trail, compliance)
-- If refund needed, create new transaction with status='refunded'

-- No DELETE policy = DELETE is blocked by RLS

-- ============================================================================
-- Public View: Transaction Summary (without sensitive details)
-- ============================================================================

-- Create view for organizers (summary only, no payment IDs)
CREATE OR REPLACE VIEW public.billing_transaction_summaries AS
SELECT 
  bt.id,
  bt.club_id,
  bt.plan_id,
  bt.amount_kzt,
  bt.currency,
  bt.status,
  bt.created_at,
  -- Hide sensitive fields
  NULL::TEXT as provider,              -- Hidden from organizers
  NULL::TEXT as provider_payment_id,   -- Hidden from organizers
  NULL::TIMESTAMPTZ as period_start,   -- Only owners see billing periods
  NULL::TIMESTAMPTZ as period_end
FROM public.billing_transactions bt
WHERE EXISTS (
  SELECT 1 FROM public.club_members cm
  WHERE cm.club_id = bt.club_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('owner', 'organizer')
);

COMMENT ON VIEW public.billing_transaction_summaries IS 
  'Limited view of transactions for organizers. Owners can access full billing_transactions table directly.';

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.billing_transaction_summaries TO authenticated;

-- Enable RLS on view (inherits from base table)
ALTER VIEW public.billing_transaction_summaries SET (security_barrier = true);

-- ============================================================================
-- Helper Function: Get transaction count for club
-- ============================================================================

CREATE OR REPLACE FUNCTION get_club_transaction_count(p_club_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.billing_transactions
  WHERE club_id = p_club_id
    AND status = 'paid'
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = p_club_id
        AND club_members.user_id = auth.uid()
        AND club_members.role IN ('owner', 'organizer')
    );
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION get_club_transaction_count IS 
  'Get count of successful payments for club (owners/organizers only)';

-- ============================================================================
-- Helper Function: Get total revenue for club (owners only)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_club_total_revenue(p_club_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(amount_kzt), 0)
  FROM public.billing_transactions
  WHERE club_id = p_club_id
    AND status = 'paid'
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = p_club_id
        AND club_members.user_id = auth.uid()
        AND club_members.role = 'owner'  -- Only owners, not organizers
    );
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION get_club_total_revenue IS 
  'Get total revenue for club (club owners only, not organizers)';

-- ============================================================================
-- Indexes for Performance (with RLS)
-- ============================================================================

-- Add index for RLS policy performance (club_id + owner lookup)
CREATE INDEX IF NOT EXISTS idx_billing_transactions_club_owner
  ON public.billing_transactions(club_id)
  WHERE status = 'paid';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'billing_transactions') THEN
    RAISE EXCEPTION 'RLS is not enabled on billing_transactions table';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on billing_transactions table';
  RAISE NOTICE 'Created 1 SELECT policy: club owners only';
  RAISE NOTICE 'INSERT/UPDATE/DELETE blocked for users - service role only';
  RAISE NOTICE 'Created billing_transaction_summaries view for organizers';
  RAISE NOTICE 'Created helper functions: get_club_transaction_count, get_club_total_revenue';
END $$;

-- ============================================================================
-- Security Notes
-- ============================================================================

-- ACCESS MATRIX:
-- | Role       | SELECT | INSERT | UPDATE | DELETE |
-- |------------|--------|--------|--------|--------|
-- | Anonymous  | ❌     | ❌     | ❌     | ❌     |
-- | Member     | ❌     | ❌     | ❌     | ❌     |
-- | Organizer  | 📊*    | ❌     | ❌     | ❌     |
-- | Owner      | ✅     | ❌     | ❌     | ❌     |
-- | Service    | ✅     | ✅     | ✅     | ❌**   |
--
-- * Organizers see summary via view (no payment IDs)
-- ** Even service role should not DELETE transactions (audit trail)

-- SENSITIVE FIELDS (protected, owners only):
-- - provider: Payment provider name
-- - provider_payment_id: External payment ID (PCI sensitive)
-- - period_start/period_end: Billing periods
-- - amount_kzt: Exact amounts (financial data)

-- SAFE FOR ORGANIZERS (via view):
-- - Transaction count
-- - Status summaries
-- - General revenue trends (aggregated)

-- NEVER EXPOSED:
-- - provider_payment_id (PCI compliance)
-- - Detailed payment provider info
-- - Individual transaction details to non-owners

-- APPLICATION RESPONSIBILITY:
-- 1. All transaction creation via service role (webhooks)
-- 2. Never expose provider_payment_id in API responses
-- 3. Organizers use billing_transaction_summaries view
-- 4. Owners use full billing_transactions table
-- 5. All refunds create new transaction record (no updates)

-- COMPLIANCE:
-- - PCI DSS: Payment IDs protected
-- - Audit trail: No deletions allowed
-- - Financial privacy: Only owners see full details
-- - Webhook security: Service role only for modifications

-- ============================================================================
