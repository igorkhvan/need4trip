-- Verify Billing v4 Schema in Production
-- Run this in Supabase SQL Editor

-- 1. Check billing_transactions columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'billing_transactions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check billing_credits table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'billing_credits'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check billing_products table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'billing_products'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check EVENT_UPGRADE_500 product seeded
SELECT code, title, price_kzt, is_active
FROM billing_products
WHERE code = 'EVENT_UPGRADE_500';

-- 5. Check events.published_at column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events'
AND column_name = 'published_at';

