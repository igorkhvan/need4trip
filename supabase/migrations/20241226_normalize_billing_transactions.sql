-- ============================================================================
-- Migration: Normalize billing_transactions (fix currency handling)
-- Date: 2024-12-26
-- Purpose: Fix denormalization issues in billing_transactions
-- Issue: amount_kzt hardcodes currency, no FK to currencies table
-- ============================================================================

-- Step 1: Add normalized columns (with data migration)
ALTER TABLE public.billing_transactions 
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2);

ALTER TABLE public.billing_transactions 
  ADD COLUMN IF NOT EXISTS currency_code TEXT;

-- Step 2: Migrate data from old columns
UPDATE public.billing_transactions 
SET 
  amount = amount_kzt,
  currency_code = COALESCE(currency, 'KZT')
WHERE amount IS NULL;

-- Step 3: Make new columns NOT NULL
ALTER TABLE public.billing_transactions 
  ALTER COLUMN amount SET NOT NULL;

ALTER TABLE public.billing_transactions 
  ALTER COLUMN currency_code SET NOT NULL;

-- Step 4: Add FK constraint to currencies table
ALTER TABLE public.billing_transactions 
  ADD CONSTRAINT fk_billing_transactions_currency 
  FOREIGN KEY (currency_code) 
  REFERENCES public.currencies(code) 
  ON DELETE RESTRICT;

-- Step 5: Add index for currency queries
CREATE INDEX IF NOT EXISTS idx_billing_transactions_currency 
  ON public.billing_transactions(currency_code);

-- Step 6: Update status enum to match DATABASE.md SSOT
-- Current: 'pending', 'paid', 'failed', 'refunded'
-- SSOT:    'pending', 'completed', 'failed', 'refunded'
UPDATE public.billing_transactions 
SET status = 'completed' 
WHERE status = 'paid';

-- Step 7: Update CHECK constraint
ALTER TABLE public.billing_transactions 
  DROP CONSTRAINT IF EXISTS billing_transactions_status_check;

ALTER TABLE public.billing_transactions 
  ADD CONSTRAINT billing_transactions_status_check 
  CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

-- Step 8: Mark old columns as deprecated (keep for backward compat)
COMMENT ON COLUMN public.billing_transactions.amount_kzt IS 
  'DEPRECATED: Use amount instead. Kept for backward compatibility.';

COMMENT ON COLUMN public.billing_transactions.currency IS 
  'DEPRECATED: Use currency_code instead. Kept for backward compatibility.';

-- Step 9: Add comments for new columns
COMMENT ON COLUMN public.billing_transactions.amount IS 
  'Transaction amount (normalized, currency-agnostic)';

COMMENT ON COLUMN public.billing_transactions.currency_code IS 
  'Currency code (FK to currencies table for normalization)';

-- ============================================================================
-- NOTES:
-- - Old columns (amount_kzt, currency) kept for backward compatibility
-- - New code should use (amount, currency_code) 
-- - Future migration can drop old columns after full migration
-- ============================================================================

