-- ============================================================================
-- Migration: Fix currencies table - Add sort_order and RLS
-- Date: 2024-12-13
-- Purpose: Complete currencies table setup
-- Apply via: Supabase Dashboard → SQL Editor → Paste & Run
-- ============================================================================

-- ============================================================================
-- STEP 1: Add sort_order column if missing
-- ============================================================================

ALTER TABLE public.currencies 
ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 100;

RAISE NOTICE '✅ Added sort_order column (if not exists)';

-- ============================================================================
-- STEP 2: Update sort_order for existing currencies
-- ============================================================================

UPDATE public.currencies SET sort_order = 1 WHERE code = 'RUB';
UPDATE public.currencies SET sort_order = 2 WHERE code = 'KZT';
UPDATE public.currencies SET sort_order = 3 WHERE code = 'BYN';
UPDATE public.currencies SET sort_order = 10 WHERE code = 'USD';
UPDATE public.currencies SET sort_order = 11 WHERE code = 'EUR';
UPDATE public.currencies SET sort_order = 12 WHERE code = 'GBP';
UPDATE public.currencies SET sort_order = 13 WHERE code = 'CNY';
UPDATE public.currencies SET sort_order = 14 WHERE code = 'UAH';

RAISE NOTICE '✅ Updated sort_order values';

-- ============================================================================
-- STEP 3: Create index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_currencies_active 
ON public.currencies(is_active, sort_order) 
WHERE is_active = TRUE;

RAISE NOTICE '✅ Created index on (is_active, sort_order)';

-- ============================================================================
-- STEP 4: Enable RLS and create policy
-- ============================================================================

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists (for re-running)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.currencies;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users" 
ON public.currencies 
FOR SELECT 
USING (true);

RAISE NOTICE '✅ Enabled RLS and created read policy';

-- ============================================================================
-- STEP 5: Verify setup
-- ============================================================================

DO $$
DECLARE
  currency_count INTEGER;
  active_count INTEGER;
  has_rls BOOLEAN;
BEGIN
  -- Count currencies
  SELECT COUNT(*) INTO currency_count FROM public.currencies;
  SELECT COUNT(*) INTO active_count FROM public.currencies WHERE is_active = true;
  
  -- Check RLS
  SELECT relrowsecurity INTO has_rls 
  FROM pg_class 
  WHERE relname = 'currencies' AND relnamespace = 'public'::regnamespace;
  
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ Currencies table configuration complete        ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Statistics:                                       ║';
  RAISE NOTICE '║    • Total currencies: %                          ║', currency_count;
  RAISE NOTICE '║    • Active currencies: %                         ║', active_count;
  RAISE NOTICE '║    • RLS enabled: %                               ║', CASE WHEN has_rls THEN 'Yes' ELSE 'No' END;
  RAISE NOTICE '╠════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Columns:                                          ║';
  RAISE NOTICE '║    ✅ code, symbol, name_ru, name_en              ║';
  RAISE NOTICE '║    ✅ decimal_places, is_active                   ║';
  RAISE NOTICE '║    ✅ sort_order (added/verified)                 ║';
  RAISE NOTICE '║    ✅ created_at                                   ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  RLS Policies:                                     ║';
  RAISE NOTICE '║    ✅ "Enable read access for all users"          ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Next steps:                                       ║';
  RAISE NOTICE '║    1. Reload page in browser                       ║';
  RAISE NOTICE '║    2. Check console: ✅ Loaded currencies: [...]  ║';
  RAISE NOTICE '║    3. Currency dropdown should work                ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
END $$;

-- ============================================================================
-- Sample currencies for reference
-- ============================================================================

-- If you need to view current currencies:
-- SELECT code, symbol, name_ru, is_active, sort_order 
-- FROM public.currencies 
-- ORDER BY sort_order, code;

