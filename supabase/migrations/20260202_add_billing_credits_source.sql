-- ============================================================================
-- Migration: Add source column to billing_credits
-- Date: 2026-02-02
-- Purpose: Phase A1.1 STEP 3 — Billing Data Invariants (Admin)
-- Spec: SSOT_BILLING_ADMIN_RULES v1.0 §1.3 (Explicit Source Attribution)
-- ============================================================================
--
-- GOAL: Every billing credit record can be unambiguously attributed to its
-- creation source (user purchase, admin grant, or system issuance).
--
-- ALLOWED VALUES:
--   - 'user'   : Standard user purchase via billing flow
--   - 'admin'  : Admin grant (manual credit issuance per SSOT_ADMIN_DOMAIN v1.0 §5.1)
--   - 'system' : Reserved for future internal/automated issuance
--
-- BACKFILL STRATEGY:
--   All existing rows are historical user purchases → safe default is 'user'.
--   No attempt to infer admin/system history (per STEP 3 constraint §3).
--
-- ============================================================================

-- Step 1: Add column with safe default
-- DEFAULT 'user' ensures:
--   a) Existing rows are backfilled automatically
--   b) Existing INSERT sites (billingCreditsRepo.createBillingCredit) continue to work
--   c) No code changes required for existing user purchase flow
ALTER TABLE public.billing_credits
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'user';

-- Step 2: Backfill any NULL values (safety net, should be no-op due to DEFAULT)
UPDATE public.billing_credits
SET source = 'user'
WHERE source IS NULL;

-- Step 3: Set NOT NULL constraint
-- At this point, all rows have source='user' (either from DEFAULT or backfill)
ALTER TABLE public.billing_credits
  ALTER COLUMN source SET NOT NULL;

-- Step 4: Add CHECK constraint to enforce closed set of allowed values
-- This prevents invalid source values at the database level
ALTER TABLE public.billing_credits
  ADD CONSTRAINT billing_credits_source_check
  CHECK (source IN ('user', 'admin', 'system'));

-- Step 5: Add index for filtering by source (useful for admin queries/audits)
CREATE INDEX IF NOT EXISTS idx_billing_credits_source
  ON public.billing_credits(source);

-- Step 6: Add comment for documentation
COMMENT ON COLUMN public.billing_credits.source IS
  'Credit creation source: user (purchase), admin (grant), system (automated). Per SSOT_BILLING_ADMIN_RULES v1.0 §1.3';

-- ============================================================================
-- VERIFICATION (manual):
-- After applying this migration, run:
--   SELECT source, COUNT(*) FROM billing_credits GROUP BY source;
-- Expected result: all rows should have source='user' (historical data).
-- ============================================================================
