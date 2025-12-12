-- ============================================================================
-- Migration: Create currencies table and normalize currency field
-- Date: 2024-12-13
-- Purpose: Replace TEXT currency with normalized currency_code FK
-- ============================================================================

-- ============================================================================
-- STEP 1: Create currencies table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.currencies (
  code TEXT PRIMARY KEY CHECK (char_length(code) = 3),  -- ISO 4217: RUB, USD, EUR, KZT
  symbol TEXT NOT NULL,                                  -- ₽, $, €, ₸
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  decimal_places INT NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_currencies_active ON public.currencies(is_active, sort_order) WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE public.currencies IS 'Справочник валют (ISO 4217)';
COMMENT ON COLUMN public.currencies.code IS 'Код валюты ISO 4217 (RUB, USD, EUR, KZT)';
COMMENT ON COLUMN public.currencies.symbol IS 'Символ валюты (₽, $, €, ₸)';
COMMENT ON COLUMN public.currencies.decimal_places IS 'Количество десятичных знаков';
COMMENT ON COLUMN public.currencies.sort_order IS 'Порядок сортировки в UI (меньше = выше)';

-- ============================================================================
-- STEP 2: Seed currencies
-- ============================================================================

INSERT INTO public.currencies (code, symbol, name_ru, name_en, decimal_places, sort_order) VALUES
('RUB', '₽', 'Российский рубль', 'Russian Ruble', 2, 1),
('KZT', '₸', 'Казахстанский тенге', 'Kazakhstani Tenge', 2, 2),
('BYN', 'Br', 'Белорусский рубль', 'Belarusian Ruble', 2, 3),
('USD', '$', 'Доллар США', 'US Dollar', 2, 10),
('EUR', '€', 'Евро', 'Euro', 2, 11),
('GBP', '£', 'Фунт стерлингов', 'British Pound', 2, 12),
('CNY', '¥', 'Китайский юань', 'Chinese Yuan', 2, 13),
('UAH', '₴', 'Украинская гривна', 'Ukrainian Hryvnia', 2, 14)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 3: Add currency_code column to events
-- ============================================================================

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS currency_code TEXT REFERENCES public.currencies(code) ON DELETE SET NULL;

-- ============================================================================
-- STEP 4: Migrate existing currency data
-- ============================================================================

DO $$
DECLARE
  migrated_count INTEGER := 0;
BEGIN
  -- Normalize common currency values
  UPDATE public.events
  SET currency_code = CASE
    -- Рубли
    WHEN UPPER(currency) IN ('RUB', 'РУБ', 'РУБЛЕЙ', 'РУБЛЬ', 'Р', '₽') THEN 'RUB'
    -- Тенге
    WHEN UPPER(currency) IN ('KZT', 'ТЕНГЕ', 'ТГ', '₸') THEN 'KZT'
    -- Белорусские рубли
    WHEN UPPER(currency) IN ('BYN', 'БР', 'BEL', 'БЕЛРУБЛЬ') THEN 'BYN'
    -- Доллары
    WHEN UPPER(currency) IN ('USD', 'ДОЛЛАР', 'ДОЛЛАРОВ', '$') THEN 'USD'
    -- Евро
    WHEN UPPER(currency) IN ('EUR', 'ЕВРО', '€') THEN 'EUR'
    ELSE NULL
  END
  WHERE currency IS NOT NULL AND currency_code IS NULL;
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Migrated % events to normalized currency_code', migrated_count;
  RAISE NOTICE 'ℹ️  Events with unrecognized currency: %',
    (SELECT COUNT(*) FROM public.events WHERE currency IS NOT NULL AND currency_code IS NULL);
    
  -- Show unmigrated values for debugging
  IF EXISTS (SELECT 1 FROM public.events WHERE currency IS NOT NULL AND currency_code IS NULL) THEN
    RAISE NOTICE 'Unrecognized currency values:';
    FOR i IN (
      SELECT DISTINCT currency 
      FROM public.events 
      WHERE currency IS NOT NULL AND currency_code IS NULL 
      LIMIT 10
    ) LOOP
      RAISE NOTICE '  - "%"', i.currency;
    END LOOP;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create index
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_currency_code 
ON public.events(currency_code) 
WHERE currency_code IS NOT NULL;

-- ============================================================================
-- STEP 6: Add comment
-- ============================================================================

COMMENT ON COLUMN public.events.currency_code IS 'Код валюты ISO 4217 (заменяет events.currency TEXT)';

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ Currency normalization completed               ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Created:                                          ║';
  RAISE NOTICE '║    • currencies table with % currencies   ║', (SELECT COUNT(*) FROM public.currencies);
  RAISE NOTICE '║    • currency_code column in events                ║';
  RAISE NOTICE '║    • Migrated existing data                        ║';
  RAISE NOTICE '║                                                    ║';
  RAISE NOTICE '║  Next steps:                                       ║';
  RAISE NOTICE '║    1. Update application types                     ║';
  RAISE NOTICE '║    2. Update UI with currency dropdown             ║';
  RAISE NOTICE '║    3. After validation: DROP old currency column   ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
END $$;

-- ============================================================================
-- OPTIONAL: Drop old TEXT column (UNCOMMENT AFTER VALIDATION)
-- ============================================================================

-- After you've verified everything works with currency_code:
-- ALTER TABLE public.events DROP COLUMN IF EXISTS currency;

