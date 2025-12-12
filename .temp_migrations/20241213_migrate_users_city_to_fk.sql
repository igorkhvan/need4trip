-- ============================================================================
-- Migration: Migrate users.city from TEXT to city_id FK
-- Date: 2024-12-13
-- Purpose: Replace users.city TEXT with users.city_id UUID FK
-- Depends on: 20241213_normalize_cities.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Add new city_id column
-- ============================================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_city_id ON public.users(city_id) WHERE city_id IS NOT NULL;

COMMENT ON COLUMN public.users.city_id IS 'FK на справочник городов (заменяет старое TEXT поле city)';

-- ============================================================================
-- STEP 2: Migrate existing data from city (TEXT) to city_id (UUID)
-- ============================================================================

DO $$
DECLARE
  migrated_count INTEGER := 0;
  unknown_count INTEGER := 0;
  total_count INTEGER;
  city_text TEXT;
BEGIN
  -- Count total users with city
  SELECT COUNT(*) INTO total_count 
  FROM public.users 
  WHERE city IS NOT NULL AND city != '';

  RAISE NOTICE 'Starting migration of % users...', total_count;

  -- Migrate each user
  FOR city_text IN 
    SELECT DISTINCT city 
    FROM public.users 
    WHERE city IS NOT NULL AND city != ''
  LOOP
    -- Try to find city in catalog (case-insensitive, trimmed)
    UPDATE public.users u
    SET city_id = c.id
    FROM public.cities c
    WHERE LOWER(TRIM(u.city)) = LOWER(TRIM(c.name))
      AND u.city_id IS NULL
      AND u.city = city_text;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    
    IF migrated_count > 0 THEN
      RAISE NOTICE '  ✓ Migrated % users for city: %', migrated_count, city_text;
    ELSE
      -- City not found in catalog, log it
      RAISE NOTICE '  ⚠ City not in catalog: "%" (% users)', city_text, 
        (SELECT COUNT(*) FROM public.users WHERE city = city_text);
      unknown_count := unknown_count + 1;
    END IF;
  END LOOP;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 Migration Summary:';
  RAISE NOTICE '   Total users with city: %', total_count;
  RAISE NOTICE '   Successfully migrated: %', 
    (SELECT COUNT(*) FROM public.users WHERE city_id IS NOT NULL);
  RAISE NOTICE '   Not migrated (city not in catalog): %', 
    (SELECT COUNT(*) FROM public.users WHERE city IS NOT NULL AND city != '' AND city_id IS NULL);
  RAISE NOTICE '   Unknown cities: %', unknown_count;
  
  IF unknown_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Action needed: Add missing cities to catalog or manually map them';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Drop old city TEXT column (commented out for safety)
-- ============================================================================

-- ВАЖНО: Не удаляем сразу, чтобы можно было откатиться!
-- После проверки данных в production раскомментировать:

-- ALTER TABLE public.users DROP COLUMN IF EXISTS city;

-- Пока оставляем оба поля для безопасности
COMMENT ON COLUMN public.users.city IS '⚠️ DEPRECATED: Use city_id instead. Will be removed in future migration.';

-- ============================================================================
-- STEP 4: Success message
-- ============================================================================

DO $$
DECLARE
  with_city_id INTEGER;
  with_city_text INTEGER;
  total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM public.users;
  SELECT COUNT(*) INTO with_city_id FROM public.users WHERE city_id IS NOT NULL;
  SELECT COUNT(*) INTO with_city_text FROM public.users WHERE city IS NOT NULL AND city != '';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Users migration completed';
  RAISE NOTICE '   Total users: %', total;
  RAISE NOTICE '   With city_id: % (%.1f%%)', with_city_id, (with_city_id::FLOAT / NULLIF(total, 0) * 100);
  RAISE NOTICE '   With old city TEXT: %', with_city_text;
  RAISE NOTICE '   Ready for application update';
END $$;
