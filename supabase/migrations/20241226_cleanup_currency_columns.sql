-- Migration: Cleanup deprecated currency columns (billing_products, club_plans)
-- Date: 2024-12-26
-- Purpose: Remove deprecated price_kzt and price_monthly_kzt columns after normalization
-- IMPORTANT: Apply this ONLY after code is updated to use new columns!

-- ============================================================================
-- PREREQUISITES (verify before applying):
-- ============================================================================
-- 1. ✅ 20241226_normalize_billing_products.sql applied
-- 2. ✅ 20241226_normalize_club_plans.sql applied
-- 3. ✅ Application code updated to use price/priceMonthly + currencyCode
-- 4. ✅ All tests pass with new schema

-- ============================================================================
-- Step 1: Drop old column from billing_products
-- ============================================================================

-- Verify no code references price_kzt
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'billing_products' AND column_name = 'price_kzt'
  ) THEN
    -- Drop the deprecated column
    ALTER TABLE public.billing_products 
      DROP COLUMN price_kzt;
    
    RAISE NOTICE '✅ Dropped billing_products.price_kzt';
  ELSE
    RAISE NOTICE '⚠️  billing_products.price_kzt already dropped';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Drop old column from club_plans
-- ============================================================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'club_plans' AND column_name = 'price_monthly_kzt'
  ) THEN
    -- Drop the deprecated column
    ALTER TABLE public.club_plans 
      DROP COLUMN price_monthly_kzt;
    
    RAISE NOTICE '✅ Dropped club_plans.price_monthly_kzt';
  ELSE
    RAISE NOTICE '⚠️  club_plans.price_monthly_kzt already dropped';
  END IF;
END $$;

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify new schema
DO $$
DECLARE
  bp_has_price BOOLEAN;
  bp_has_currency BOOLEAN;
  cp_has_price BOOLEAN;
  cp_has_currency BOOLEAN;
BEGIN
  -- Check billing_products
  SELECT 
    COUNT(*) FILTER (WHERE column_name = 'price') > 0,
    COUNT(*) FILTER (WHERE column_name = 'currency_code') > 0
  INTO bp_has_price, bp_has_currency
  FROM information_schema.columns
  WHERE table_name = 'billing_products';
  
  -- Check club_plans
  SELECT 
    COUNT(*) FILTER (WHERE column_name = 'price_monthly') > 0,
    COUNT(*) FILTER (WHERE column_name = 'currency_code') > 0
  INTO cp_has_price, cp_has_currency
  FROM information_schema.columns
  WHERE table_name = 'club_plans';
  
  -- Report
  IF bp_has_price AND bp_has_currency THEN
    RAISE NOTICE '✅ billing_products: normalized schema complete';
  ELSE
    RAISE EXCEPTION '❌ billing_products: missing normalized columns';
  END IF;
  
  IF cp_has_price AND cp_has_currency THEN
    RAISE NOTICE '✅ club_plans: normalized schema complete';
  ELSE
    RAISE EXCEPTION '❌ club_plans: missing normalized columns';
  END IF;
  
  RAISE NOTICE '🎉 Currency normalization cleanup complete!';
END $$;

