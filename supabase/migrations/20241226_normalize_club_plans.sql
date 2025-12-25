-- Migration: Normalize club_plans (price_monthly_kzt → price_monthly + currency_code)
-- Date: 2024-12-26
-- Purpose: Remove hardcoded currency from column names, add FK to currencies

-- Step 1: Add new normalized columns
ALTER TABLE public.club_plans 
  ADD COLUMN IF NOT EXISTS price_monthly NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS currency_code TEXT;

-- Step 2: Migrate data from old column
UPDATE public.club_plans 
SET 
  price_monthly = price_monthly_kzt,
  currency_code = 'KZT'
WHERE price_monthly IS NULL;

-- Step 3: Add constraints
ALTER TABLE public.club_plans 
  ALTER COLUMN price_monthly SET NOT NULL,
  ALTER COLUMN currency_code SET NOT NULL,
  ALTER COLUMN currency_code SET DEFAULT 'KZT',
  ADD CONSTRAINT club_plans_currency_code_fkey 
    FOREIGN KEY (currency_code) 
    REFERENCES public.currencies(code) 
    ON DELETE RESTRICT;

-- Step 4: Create index for currency lookups
CREATE INDEX IF NOT EXISTS idx_club_plans_currency_code 
  ON public.club_plans(currency_code);

-- Step 5: Mark old column as deprecated (will be dropped in cleanup migration)
COMMENT ON COLUMN public.club_plans.price_monthly_kzt IS 
  'DEPRECATED: Use price_monthly + currency_code instead. Will be removed after data migration.';

-- Verification query (commented out for production)
-- SELECT id, title, price_monthly_kzt AS old_price, price_monthly AS new_price, currency_code 
-- FROM club_plans 
-- WHERE price_monthly_kzt IS NOT NULL;

