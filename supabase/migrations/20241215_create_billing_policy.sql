-- ============================================================================
-- Migration: Create billing_policy table
-- Date: 2024-12-15
-- Purpose: Store billing grace period and pending TTL configuration
-- Source: docs/BILLING_AND_LIMITS.md (section 4.2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_policy (
  id TEXT PRIMARY KEY,                           -- 'default'
  grace_period_days INT NOT NULL DEFAULT 7,      -- Grace period length
  pending_ttl_minutes INT NOT NULL DEFAULT 60,   -- How long to keep pending payment intent
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE public.billing_policy IS 'Billing configuration for grace periods and TTLs';
COMMENT ON COLUMN public.billing_policy.grace_period_days IS 'Days of grace period after subscription ends';
COMMENT ON COLUMN public.billing_policy.pending_ttl_minutes IS 'Minutes to hold pending payment intent before cleanup';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_billing_policy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_billing_policy_updated_at
BEFORE UPDATE ON public.billing_policy
FOR EACH ROW
EXECUTE FUNCTION update_billing_policy_updated_at();
