-- ============================================================================
-- Migration: Extend billing_transactions with product_code
-- Date: 2024-12-25
-- Purpose: Support one-off credits and club plans in same table
-- Spec: One-off event upgrade billing system
-- ============================================================================

-- Add product_code column
ALTER TABLE public.billing_transactions 
  ADD COLUMN IF NOT EXISTS product_code TEXT NOT NULL DEFAULT 'CLUB_50';

-- Remove DEFAULT after backfill (safe for existing data)
ALTER TABLE public.billing_transactions 
  ALTER COLUMN product_code DROP DEFAULT;

-- Add CHECK constraint for valid product codes
ALTER TABLE public.billing_transactions 
  ADD CONSTRAINT chk_billing_transactions_product_code 
  CHECK (product_code IN (
    'EVENT_UPGRADE_500',     -- One-off credit for events ≤500 participants
    'CLUB_50',               -- Club 50 subscription
    'CLUB_500',              -- Club 500 subscription
    'CLUB_UNLIMITED'         -- Club Unlimited subscription
  ));

-- Make club_id nullable (one-off credits are not tied to clubs)
ALTER TABLE public.billing_transactions 
  ALTER COLUMN club_id DROP NOT NULL;

-- Make plan_id nullable (one-off credits don't reference club_plans)
ALTER TABLE public.billing_transactions 
  ALTER COLUMN plan_id DROP NOT NULL;

-- Add CHECK: club products require club_id and plan_id
ALTER TABLE public.billing_transactions 
  ADD CONSTRAINT chk_club_products_require_club 
  CHECK (
    (product_code = 'EVENT_UPGRADE_500') OR 
    (club_id IS NOT NULL AND plan_id IS NOT NULL)
  );

-- Index for product_code queries
CREATE INDEX IF NOT EXISTS idx_billing_transactions_product_code 
  ON public.billing_transactions(product_code);

-- Index for user one-off credits (will join via billing_credits)
CREATE INDEX IF NOT EXISTS idx_billing_transactions_status_product 
  ON public.billing_transactions(status, product_code);

-- Comments
COMMENT ON COLUMN public.billing_transactions.product_code IS 
  'Product type: EVENT_UPGRADE_500 (one-off credit) or CLUB_* (subscription)';

COMMENT ON CONSTRAINT chk_club_products_require_club ON public.billing_transactions IS 
  'Club products (CLUB_*) must have club_id and plan_id. One-off credits (EVENT_UPGRADE_500) must not.';

