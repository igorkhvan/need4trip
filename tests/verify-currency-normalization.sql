-- Verification script: Check currency normalization status
-- Run this in Supabase SQL Editor to verify migrations

-- ============================================================================
-- 1. Check billing_products schema
-- ============================================================================
SELECT 
  'billing_products' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'billing_products'
  AND column_name IN ('price_kzt', 'price', 'currency_code')
ORDER BY 
  CASE column_name
    WHEN 'price_kzt' THEN 1
    WHEN 'price' THEN 2
    WHEN 'currency_code' THEN 3
  END;

-- Expected result after normalization:
-- | table_name         | column_name    | data_type | is_nullable | column_default |
-- |--------------------|----------------|-----------|-------------|----------------|
-- | billing_products   | price_kzt      | numeric   | NO          | NULL           | ← OLD (deprecated)
-- | billing_products   | price          | numeric   | NO          | NULL           | ← NEW
-- | billing_products   | currency_code  | text      | NO          | 'KZT'::text    | ← NEW (FK)

-- ============================================================================
-- 2. Check club_plans schema
-- ============================================================================
SELECT 
  'club_plans' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'club_plans'
  AND column_name IN ('price_monthly_kzt', 'price_monthly', 'currency_code')
ORDER BY 
  CASE column_name
    WHEN 'price_monthly_kzt' THEN 1
    WHEN 'price_monthly' THEN 2
    WHEN 'currency_code' THEN 3
  END;

-- Expected result after normalization:
-- | table_name  | column_name          | data_type | is_nullable | column_default |
-- |-------------|----------------------|-----------|-------------|----------------|
-- | club_plans  | price_monthly_kzt    | numeric   | NO          | NULL           | ← OLD (deprecated)
-- | club_plans  | price_monthly        | numeric   | NO          | NULL           | ← NEW
-- | club_plans  | currency_code        | text      | NO          | 'KZT'::text    | ← NEW (FK)

-- ============================================================================
-- 3. Verify data migration
-- ============================================================================

-- Check billing_products data
SELECT 
  'billing_products' AS source,
  code,
  price_kzt AS old_price,
  price AS new_price,
  currency_code,
  CASE 
    WHEN price = price_kzt AND currency_code = 'KZT' THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END AS status
FROM billing_products
ORDER BY code;

-- Check club_plans data
SELECT 
  'club_plans' AS source,
  id,
  title,
  price_monthly_kzt AS old_price,
  price_monthly AS new_price,
  currency_code,
  CASE 
    WHEN price_monthly = price_monthly_kzt AND currency_code = 'KZT' THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END AS status
FROM club_plans
ORDER BY price_monthly;

-- ============================================================================
-- 4. Check foreign keys
-- ============================================================================
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('billing_products', 'club_plans')
  AND kcu.column_name = 'currency_code';

-- Expected result:
-- | table_name         | column_name    | foreign_table_name | foreign_column_name |
-- |--------------------|----------------|--------------------|--------------------|
-- | billing_products   | currency_code  | currencies         | code               |
-- | club_plans         | currency_code  | currencies         | code               |

-- ============================================================================
-- 5. Summary
-- ============================================================================
DO $$
DECLARE
  bp_has_old BOOLEAN;
  bp_has_new BOOLEAN;
  cp_has_old BOOLEAN;
  cp_has_new BOOLEAN;
BEGIN
  -- Check billing_products
  SELECT 
    COUNT(*) FILTER (WHERE column_name = 'price_kzt') > 0,
    COUNT(*) FILTER (WHERE column_name = 'price' AND column_name = 'currency_code') > 0
  INTO bp_has_old, bp_has_new
  FROM information_schema.columns
  WHERE table_name = 'billing_products';
  
  -- Check club_plans
  SELECT 
    COUNT(*) FILTER (WHERE column_name = 'price_monthly_kzt') > 0,
    COUNT(*) FILTER (WHERE column_name = 'price_monthly' AND column_name = 'currency_code') > 0
  INTO cp_has_old, cp_has_new
  FROM information_schema.columns
  WHERE table_name = 'club_plans';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CURRENCY NORMALIZATION STATUS';
  RAISE NOTICE '========================================';
  
  IF bp_has_new THEN
    RAISE NOTICE '✅ billing_products: NEW columns exist (price, currency_code)';
  ELSE
    RAISE NOTICE '❌ billing_products: NEW columns MISSING';
  END IF;
  
  IF bp_has_old THEN
    RAISE NOTICE '⚠️  billing_products: OLD column still exists (price_kzt) - OK for now';
  ELSE
    RAISE NOTICE '✅ billing_products: OLD column removed (price_kzt)';
  END IF;
  
  IF cp_has_new THEN
    RAISE NOTICE '✅ club_plans: NEW columns exist (price_monthly, currency_code)';
  ELSE
    RAISE NOTICE '❌ club_plans: NEW columns MISSING';
  END IF;
  
  IF cp_has_old THEN
    RAISE NOTICE '⚠️  club_plans: OLD column still exists (price_monthly_kzt) - OK for now';
  ELSE
    RAISE NOTICE '✅ club_plans: OLD column removed (price_monthly_kzt)';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

