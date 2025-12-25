-- ============================================================================
-- Migration: Remove deprecated columns from billing_transactions
-- Date: 2024-12-26
-- Purpose: Complete normalization cleanup after data migration
-- Prerequisites: 20241226_normalize_billing_transactions.sql applied
--                Table cleaned, new columns (amount, currency_code) in use
-- ============================================================================

-- Step 1: Drop deprecated columns
ALTER TABLE public.billing_transactions 
  DROP COLUMN IF EXISTS amount_kzt;

ALTER TABLE public.billing_transactions 
  DROP COLUMN IF EXISTS currency;

-- Step 2: Verify new columns are present and constrained
-- (Should already be set by previous migration, but double-check)
DO $$ 
BEGIN
  -- Ensure amount is NOT NULL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'billing_transactions' 
    AND column_name = 'amount' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.billing_transactions 
      ALTER COLUMN amount SET NOT NULL;
  END IF;

  -- Ensure currency_code is NOT NULL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'billing_transactions' 
    AND column_name = 'currency_code' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.billing_transactions 
      ALTER COLUMN currency_code SET NOT NULL;
  END IF;

  -- Ensure FK constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'billing_transactions' 
    AND constraint_name = 'fk_billing_transactions_currency'
  ) THEN
    ALTER TABLE public.billing_transactions 
      ADD CONSTRAINT fk_billing_transactions_currency 
      FOREIGN KEY (currency_code) 
      REFERENCES public.currencies(code) 
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Step 3: Update comments
COMMENT ON TABLE public.billing_transactions IS 
  'Audit trail of all payment transactions (normalized schema v2)';

COMMENT ON COLUMN public.billing_transactions.amount IS 
  'Transaction amount in specified currency (normalized)';

COMMENT ON COLUMN public.billing_transactions.currency_code IS 
  'Currency code with FK to currencies table (normalized)';

-- Step 4: Verify schema integrity
DO $$
DECLARE
  missing_cols TEXT[];
BEGIN
  -- Check that old columns are gone
  SELECT ARRAY_AGG(column_name) INTO missing_cols
  FROM information_schema.columns
  WHERE table_name = 'billing_transactions'
  AND column_name IN ('amount_kzt', 'currency');
  
  IF missing_cols IS NOT NULL THEN
    RAISE WARNING 'Old columns still present: %', missing_cols;
  ELSE
    RAISE NOTICE '✅ Cleanup complete: deprecated columns removed';
  END IF;
  
  -- Check that new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_transactions'
    AND column_name IN ('amount', 'currency_code')
    GROUP BY table_name
    HAVING COUNT(*) = 2
  ) THEN
    RAISE EXCEPTION 'Missing new columns (amount, currency_code)';
  END IF;
  
  RAISE NOTICE '✅ Schema normalized: amount + currency_code in place';
END $$;

-- ============================================================================
-- Post-migration verification queries:
-- 
-- 1. Check columns:
--    SELECT column_name, data_type, is_nullable 
--    FROM information_schema.columns 
--    WHERE table_name = 'billing_transactions'
--    ORDER BY ordinal_position;
--
-- 2. Check FK constraint:
--    SELECT constraint_name, constraint_type 
--    FROM information_schema.table_constraints 
--    WHERE table_name = 'billing_transactions';
--
-- 3. Test insert with valid currency:
--    INSERT INTO billing_transactions (
--      club_id, product_code, provider, 
--      amount, currency_code, status
--    ) VALUES (
--      '...', 'CLUB_50', 'test',
--      1000.00, 'KZT', 'pending'
--    );
--
-- 4. Test FK constraint (should fail):
--    INSERT INTO billing_transactions (
--      club_id, product_code, provider,
--      amount, currency_code, status
--    ) VALUES (
--      '...', 'CLUB_50', 'test',
--      1000.00, 'INVALID', 'pending'
--    );
--    -- Expected error: violates foreign key constraint
-- ============================================================================

