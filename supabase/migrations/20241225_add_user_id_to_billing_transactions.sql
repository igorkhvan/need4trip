-- ============================================================================
-- Migration: Add user_id to billing_transactions for one-off credits
-- Date: 2024-12-25
-- Purpose: Track user who purchased one-off credit
-- Spec: One-off event upgrade billing system
-- ============================================================================

-- Add user_id column (nullable, required for one-off credits only)
ALTER TABLE public.billing_transactions 
  ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL;

-- Add CHECK: one-off credits require user_id
ALTER TABLE public.billing_transactions 
  DROP CONSTRAINT IF EXISTS chk_oneoff_requires_user;

ALTER TABLE public.billing_transactions 
  ADD CONSTRAINT chk_oneoff_requires_user 
  CHECK (
    (product_code != 'EVENT_UPGRADE_500') OR 
    (user_id IS NOT NULL)
  );

-- Index for user credit purchases
CREATE INDEX IF NOT EXISTS idx_billing_transactions_user_id 
  ON public.billing_transactions(user_id) 
  WHERE user_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.billing_transactions.user_id IS 
  'User who made the purchase (required for one-off credits, NULL for club subscriptions)';

COMMENT ON CONSTRAINT chk_oneoff_requires_user ON public.billing_transactions IS 
  'One-off credits (EVENT_UPGRADE_500) must have user_id. Club products use club_id instead.';

