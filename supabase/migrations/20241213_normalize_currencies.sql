-- ============================================================================
-- Migration: Normalize currencies - Create currencies catalog
-- Date: 2024-12-13
-- Purpose: Replace TEXT currency with normalized currency_code FK
-- Priority: LOW (Приоритет 3)
-- ============================================================================

-- ============================================================================
-- STEP 1: Create currencies table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.currencies (
  code TEXT PRIMARY KEY CHECK (char_length(code) = 3),  -- ISO 4217: RUB, USD, EUR
  symbol TEXT NOT NULL,                                  -- ₽, $, €
  name_ru TEXT NOT NULL,                                 -- Российский рубль
  name_en TEXT NOT NULL,                                 -- Russian Ruble
  decimal_places INTEGER NOT NULL DEFAULT 2,             -- Количество знаков после запятой
  is_active BOOLEAN NOT NULL DEFAULT TRUE,               -- Активная валюта
  sort_order INTEGER DEFAULT 999,                        -- Порядок в UI (меньше = выше)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_currencies_active ON public.currencies(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_currencies_sort ON public.currencies(sort_order);

-- Comments
COMMENT ON TABLE public.currencies IS 'Справочник валют для платных событий';
COMMENT ON COLUMN public.currencies.code IS 'Код валюты ISO 4217 (3 символа)';
COMMENT ON COLUMN public.currencies.symbol IS 'Символ валюты для отображения';
COMMENT ON COLUMN public.currencies.decimal_places IS 'Количество знаков после запятой';
COMMENT ON COLUMN public.currencies.is_active IS 'Активная валюта (показывать в UI)';
COMMENT ON COLUMN public.currencies.sort_order IS 'Порядок сортировки в UI (меньше = выше)';

-- ============================================================================
-- STEP 2: Seed popular currencies
-- ============================================================================

INSERT INTO public.currencies (code, symbol, name_ru, name_en, decimal_places, is_active, sort_order) VALUES
  -- Основные валюты
  ('RUB', '₽', 'Российский рубль', 'Russian Ruble', 2, TRUE, 1),
  ('KZT', '₸', 'Казахстанский тенге', 'Kazakhstani Tenge', 2, TRUE, 2),
  ('USD', '$', 'Доллар США', 'US Dollar', 2, TRUE, 3),
  ('EUR', '€', 'Евро', 'Euro', 2, TRUE, 4),
  
  -- Дополнительные валюты (менее популярные)
  ('UAH', '₴', 'Украинская гривна', 'Ukrainian Hryvnia', 2, TRUE, 5),
  ('BYN', 'Br', 'Белорусский рубль', 'Belarusian Ruble', 2, TRUE, 6),
  ('GEL', '₾', 'Грузинский лари', 'Georgian Lari', 2, TRUE, 7),
  ('AMD', '֏', 'Армянский драм', 'Armenian Dram', 2, TRUE, 8),
  ('AZN', '₼', 'Азербайджанский манат', 'Azerbaijani Manat', 2, TRUE, 9),
  ('UZS', 'сўм', 'Узбекский сум', 'Uzbekistani Som', 0, TRUE, 10),
  ('TRY', '₺', 'Турецкая лира', 'Turkish Lira', 2, TRUE, 11),
  ('CNY', '¥', 'Китайский юань', 'Chinese Yuan', 2, FALSE, 12),
  ('JPY', '¥', 'Японская иена', 'Japanese Yen', 0, FALSE, 13),
  ('GBP', '£', 'Фунт стерлингов', 'British Pound', 2, FALSE, 14)

ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 3: Add currency_code FK to events
-- ============================================================================

-- Add new column
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS currency_code TEXT REFERENCES public.currencies(code) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_events_currency_code ON public.events(currency_code) WHERE currency_code IS NOT NULL;

COMMENT ON COLUMN public.events.currency_code IS 'FK на справочник валют (заменяет старое TEXT поле currency)';

-- ============================================================================
-- STEP 4: Migrate existing data
-- ============================================================================

DO $$
DECLARE
  migrated_count INTEGER := 0;
  unknown_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Migrating currency data...';

  -- Migrate exact matches (case-insensitive)
  UPDATE public.events e
  SET currency_code = c.code
  FROM public.currencies c
  WHERE UPPER(TRIM(e.currency)) = c.code
    AND e.currency_code IS NULL
    AND e.currency IS NOT NULL
    AND e.currency != '';

  GET DIAGNOSTICS migrated_count = ROW_COUNT;

  -- Count unmigrated
  SELECT COUNT(*) INTO unknown_count
  FROM public.events
  WHERE currency IS NOT NULL 
    AND currency != ''
    AND currency_code IS NULL;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 Currency Migration Summary:';
  RAISE NOTICE '   Successfully migrated: %', migrated_count;
  RAISE NOTICE '   Not migrated (unknown currency): %', unknown_count;
  
  IF unknown_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '   Unknown currencies found:';
    FOR rec IN (
      SELECT DISTINCT currency, COUNT(*) as cnt
      FROM public.events
      WHERE currency IS NOT NULL 
        AND currency != ''
        AND currency_code IS NULL
      GROUP BY currency
      ORDER BY cnt DESC
    ) LOOP
      RAISE NOTICE '     - "%" (% events)', rec.currency, rec.cnt;
    END LOOP;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Drop old currency column (commented out for safety)
-- ============================================================================

-- ВАЖНО: Не удаляем сразу, чтобы можно было откатиться!
-- После проверки данных в production раскомментировать:

-- ALTER TABLE public.events DROP COLUMN IF EXISTS currency;

COMMENT ON COLUMN public.events.currency IS '⚠️ DEPRECATED: Use currency_code instead. Will be removed in future migration.';

-- ============================================================================
-- STEP 6: Success message
-- ============================================================================

DO $$
DECLARE
  currency_count INTEGER;
  events_with_currency INTEGER;
BEGIN
  SELECT COUNT(*) INTO currency_count FROM public.currencies WHERE is_active = TRUE;
  SELECT COUNT(*) INTO events_with_currency FROM public.events WHERE currency_code IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Currencies normalization completed';
  RAISE NOTICE '   Total currencies: %', currency_count;
  RAISE NOTICE '   Events with currency_code: %', events_with_currency;
  RAISE NOTICE '   Ready for application update';
END $$;
