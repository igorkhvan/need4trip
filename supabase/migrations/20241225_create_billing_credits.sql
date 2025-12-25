-- ============================================================================
-- Migration: Create billing_credits table
-- Date: 2024-12-25
-- Purpose: Track purchased one-off credits and their consumption
-- Spec: One-off event upgrade billing system
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  credit_code TEXT NOT NULL CHECK (credit_code IN ('EVENT_UPGRADE_500')),
  
  status TEXT NOT NULL CHECK (status IN ('available', 'consumed')),
  
  consumed_event_id UUID NULL REFERENCES public.events(id) ON DELETE SET NULL,
  consumed_at TIMESTAMPTZ NULL,
  
  source_transaction_id UUID NOT NULL REFERENCES public.billing_transactions(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_billing_credits_consumed_state CHECK (
    (status = 'available' AND consumed_event_id IS NULL AND consumed_at IS NULL) OR
    (status = 'consumed' AND consumed_event_id IS NOT NULL AND consumed_at IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_credits_user_status 
  ON public.billing_credits(user_id, status) 
  WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_billing_credits_consumed_event 
  ON public.billing_credits(consumed_event_id) 
  WHERE consumed_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_credits_transaction_unique 
  ON public.billing_credits(source_transaction_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_billing_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_billing_credits_updated_at
BEFORE UPDATE ON public.billing_credits
FOR EACH ROW
EXECUTE FUNCTION update_billing_credits_updated_at();

-- Comments
COMMENT ON TABLE public.billing_credits IS 
  'One-off credits for event upgrades. Credits are bessрочный (no expiration).';

COMMENT ON COLUMN public.billing_credits.user_id IS 
  'User who purchased the credit';

COMMENT ON COLUMN public.billing_credits.credit_code IS 
  'Credit type: EVENT_UPGRADE_500 (allows up to 500 participants)';

COMMENT ON COLUMN public.billing_credits.status IS 
  'available = not used yet, consumed = already used for an event';

COMMENT ON COLUMN public.billing_credits.consumed_event_id IS 
  'Event where credit was consumed (NULL if available)';

COMMENT ON COLUMN public.billing_credits.consumed_at IS 
  'Timestamp when credit was consumed (NULL if available)';

COMMENT ON COLUMN public.billing_credits.source_transaction_id IS 
  'Billing transaction that created this credit (idempotency key)';

