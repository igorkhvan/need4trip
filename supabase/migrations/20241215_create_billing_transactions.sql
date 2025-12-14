-- ============================================================================
-- Migration: Create billing_transactions table
-- Date: 2024-12-15
-- Purpose: Audit trail of all payment transactions
-- Source: docs/BILLING_AND_LIMITS.md (section 4.5)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.club_plans(id),
  
  provider TEXT NOT NULL,                        -- kaspi | epay | manual | etc.
  provider_payment_id TEXT,                      -- External payment ID from provider
  
  amount_kzt NUMERIC(10,2) NOT NULL,             -- Amount in Kazakhstani Tenge
  currency TEXT NOT NULL DEFAULT 'KZT',
  
  status TEXT NOT NULL CHECK (status IN ('pending','paid','failed','refunded')),
  
  period_start TIMESTAMPTZ NULL,                 -- Billing period covered by this payment
  period_end TIMESTAMPTZ NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_transactions_club_id 
  ON public.billing_transactions(club_id);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_status 
  ON public.billing_transactions(status);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_provider 
  ON public.billing_transactions(provider, provider_payment_id);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_created 
  ON public.billing_transactions(created_at DESC);

-- Comments
COMMENT ON TABLE public.billing_transactions IS 'Audit trail of all club payment transactions';
COMMENT ON COLUMN public.billing_transactions.club_id IS 'Club that made the payment';
COMMENT ON COLUMN public.billing_transactions.plan_id IS 'Plan being paid for';
COMMENT ON COLUMN public.billing_transactions.provider IS 'Payment provider: kaspi, epay, manual, etc.';
COMMENT ON COLUMN public.billing_transactions.provider_payment_id IS 'External payment ID from provider';
COMMENT ON COLUMN public.billing_transactions.amount_kzt IS 'Amount in Kazakhstani Tenge';
COMMENT ON COLUMN public.billing_transactions.status IS 'Transaction status: pending, paid, failed, refunded';
COMMENT ON COLUMN public.billing_transactions.period_start IS 'Start of billing period covered';
COMMENT ON COLUMN public.billing_transactions.period_end IS 'End of billing period covered';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_billing_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_billing_transactions_updated_at
BEFORE UPDATE ON public.billing_transactions
FOR EACH ROW
EXECUTE FUNCTION update_billing_transactions_updated_at();
