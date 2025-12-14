-- ============================================================================
-- Migration: Seed billing_policy
-- Date: 2024-12-15
-- Purpose: Insert default billing policy
-- Source: docs/BILLING_AND_LIMITS.md
-- ============================================================================

INSERT INTO public.billing_policy (
  id,
  grace_period_days,
  pending_ttl_minutes
) VALUES (
  'default',
  7,    -- 7 days grace period
  60    -- 60 minutes pending TTL
)
ON CONFLICT (id) DO UPDATE SET
  grace_period_days = EXCLUDED.grace_period_days,
  pending_ttl_minutes = EXCLUDED.pending_ttl_minutes,
  updated_at = NOW();
