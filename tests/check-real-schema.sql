-- ============================================================================
-- Check REAL schema of events table in PostgreSQL
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Show ALL columns in events table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'events'
ORDER BY ordinal_position;

-- 2. Check specific columns we need for tests
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'published_at'
    ) THEN '✅ published_at EXISTS (BILLING V4)'
    ELSE '❌ published_at MISSING'
  END as published_at_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'created_by_user_id'
    ) THEN '✅ created_by_user_id EXISTS'
    ELSE '❌ created_by_user_id MISSING'
  END as created_by_user_id_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'owner_id'
    ) THEN '⚠️  owner_id EXISTS (OLD COLUMN?)'
    ELSE '✅ owner_id NOT EXISTS (correct)'
  END as owner_id_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'location_text'
    ) THEN '✅ location_text EXISTS'
    ELSE '❌ location_text MISSING'
  END as location_text_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'date_time'
    ) THEN '✅ date_time EXISTS'
    ELSE '❌ date_time MISSING'
  END as date_time_check;

-- 3. Show billing_transactions columns
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'billing_transactions'
ORDER BY ordinal_position;

-- 4. Check billing v4 columns
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'billing_transactions' AND column_name = 'amount_kzt'
    ) THEN '✅ amount_kzt EXISTS'
    ELSE '❌ amount_kzt MISSING'
  END as amount_kzt_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'billing_transactions' AND column_name = 'amount'
    ) THEN '⚠️  amount EXISTS (should be amount_kzt)'
    ELSE '✅ amount NOT EXISTS (correct)'
  END as amount_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'billing_transactions' AND column_name = 'product_code'
    ) THEN '✅ product_code EXISTS (BILLING V4)'
    ELSE '❌ product_code MISSING'
  END as product_code_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'billing_transactions' AND column_name = 'user_id'
    ) THEN '✅ user_id EXISTS (BILLING V4)'
    ELSE '❌ user_id MISSING'
  END as user_id_check;

