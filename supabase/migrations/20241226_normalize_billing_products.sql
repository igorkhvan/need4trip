-- Migration: Normalize billing_products (price_kzt → price + currency_code)
-- Date: 2024-12-26
-- Purpose: Remove hardcoded currency from column names, add FK to currencies

-- Step 1: Add new normalized columns
ALTER TABLE public.billing_products 
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS currency_code TEXT;

-- Step 2: Migrate data from old column
UPDATE public.billing_products 
SET 
  price = price_kzt,
  currency_code = 'KZT'
WHERE price IS NULL;

-- Step 3: Add constraints
ALTER TABLE public.billing_products 
  ALTER COLUMN price SET NOT NULL,
  ALTER COLUMN currency_code SET NOT NULL,
  ALTER COLUMN currency_code SET DEFAULT 'KZT',
  ADD CONSTRAINT billing_products_currency_code_fkey 
    FOREIGN KEY (currency_code) 
    REFERENCES public.currencies(code) 
    ON DELETE RESTRICT;

-- Step 4: Create index for currency lookups
CREATE INDEX IF NOT EXISTS idx_billing_products_currency_code 
  ON public.billing_products(currency_code);

-- Step 5: Mark old column as deprecated (will be dropped in cleanup migration)
COMMENT ON COLUMN public.billing_products.price_kzt IS 
  'DEPRECATED: Use price + currency_code instead. Will be removed after data migration.';

-- Verification query (commented out for production)
-- SELECT id, code, price_kzt AS old_price, price AS new_price, currency_code 
-- FROM billing_products 
-- WHERE price_kzt IS NOT NULL;

