-- ============================================================================
-- Migration: Normalize cities - Create cities catalog
-- Date: 2024-12-13
-- Purpose: Replace TEXT city fields with normalized city_id references
-- Priority: CRITICAL (Приоритет 1)
-- ============================================================================

-- ============================================================================
-- STEP 1: Create cities table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_en TEXT,                          -- Английское название
  region TEXT,                           -- Регион/область
  country TEXT NOT NULL DEFAULT 'RU',   -- Код страны (ISO 3166-1)
  lat DOUBLE PRECISION,                  -- Широта для геолокации
  lng DOUBLE PRECISION,                  -- Долгота для геолокации
  population INTEGER,                    -- Население (для сортировки)
  is_popular BOOLEAN DEFAULT FALSE,      -- Популярные города (для UI)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_country ON public.cities(country);
CREATE INDEX IF NOT EXISTS idx_cities_popular ON public.cities(is_popular) WHERE is_popular = TRUE;
CREATE INDEX IF NOT EXISTS idx_cities_population ON public.cities(population DESC NULLS LAST);

-- Comments
COMMENT ON TABLE public.cities IS 'Справочник городов для событий, пользователей и клубов';
COMMENT ON COLUMN public.cities.name IS 'Название города на русском';
COMMENT ON COLUMN public.cities.name_en IS 'Название города на английском (для SEO и API)';
COMMENT ON COLUMN public.cities.region IS 'Регион/область (например: Московская область)';
COMMENT ON COLUMN public.cities.lat IS 'Широта для карт и геолокации';
COMMENT ON COLUMN public.cities.lng IS 'Долгота для карт и геолокации';
COMMENT ON COLUMN public.cities.is_popular IS 'Популярный город (показывать первым в автокомплите)';

-- ============================================================================
-- STEP 2: Seed popular Russian cities
-- ============================================================================

INSERT INTO public.cities (name, name_en, region, country, lat, lng, population, is_popular) VALUES
  -- Топ-20 городов России по популярности для OFF-ROAD
  ('Москва', 'Moscow', 'Московская область', 'RU', 55.7558, 37.6173, 12500000, TRUE),
  ('Санкт-Петербург', 'Saint Petersburg', 'Ленинградская область', 'RU', 59.9311, 30.3609, 5400000, TRUE),
  ('Новосибирск', 'Novosibirsk', 'Новосибирская область', 'RU', 55.0084, 82.9357, 1620000, TRUE),
  ('Екатеринбург', 'Yekaterinburg', 'Свердловская область', 'RU', 56.8389, 60.6057, 1490000, TRUE),
  ('Казань', 'Kazan', 'Республика Татарстан', 'RU', 55.8304, 49.0661, 1250000, TRUE),
  ('Нижний Новгород', 'Nizhny Novgorod', 'Нижегородская область', 'RU', 56.2965, 43.9361, 1250000, TRUE),
  ('Челябинск', 'Chelyabinsk', 'Челябинская область', 'RU', 55.1644, 61.4368, 1200000, TRUE),
  ('Самара', 'Samara', 'Самарская область', 'RU', 53.1952, 50.1069, 1160000, TRUE),
  ('Омск', 'Omsk', 'Омская область', 'RU', 54.9885, 73.3242, 1150000, TRUE),
  ('Ростов-на-Дону', 'Rostov-on-Don', 'Ростовская область', 'RU', 47.2357, 39.7015, 1130000, TRUE),
  
  ('Уфа', 'Ufa', 'Республика Башкортостан', 'RU', 54.7388, 55.9721, 1130000, TRUE),
  ('Красноярск', 'Krasnoyarsk', 'Красноярский край', 'RU', 56.0153, 92.8932, 1090000, TRUE),
  ('Воронеж', 'Voronezh', 'Воронежская область', 'RU', 51.6720, 39.1843, 1050000, TRUE),
  ('Пермь', 'Perm', 'Пермский край', 'RU', 58.0297, 56.2667, 1050000, TRUE),
  ('Волгоград', 'Volgograd', 'Волгоградская область', 'RU', 48.7080, 44.5133, 1010000, TRUE),
  ('Краснодар', 'Krasnodar', 'Краснодарский край', 'RU', 45.0355, 38.9753, 940000, TRUE),
  ('Саратов', 'Saratov', 'Саратовская область', 'RU', 51.5924, 46.0348, 840000, TRUE),
  ('Тюмень', 'Tyumen', 'Тюменская область', 'RU', 57.1530, 65.5343, 800000, TRUE),
  ('Тольятти', 'Tolyatti', 'Самарская область', 'RU', 53.5303, 49.3461, 700000, TRUE),
  ('Ижевск', 'Izhevsk', 'Удмуртская Республика', 'RU', 56.8519, 53.2048, 650000, TRUE),
  
  -- Дополнительные популярные города для OFF-ROAD
  ('Владивосток', 'Vladivostok', 'Приморский край', 'RU', 43.1155, 131.8855, 600000, TRUE),
  ('Сочи', 'Sochi', 'Краснодарский край', 'RU', 43.6028, 39.7342, 400000, TRUE),
  ('Иркутск', 'Irkutsk', 'Иркутская область', 'RU', 52.2978, 104.2964, 620000, TRUE),
  ('Барнаул', 'Barnaul', 'Алтайский край', 'RU', 53.3547, 83.7698, 630000, TRUE),
  ('Хабаровск', 'Khabarovsk', 'Хабаровский край', 'RU', 48.4827, 135.0838, 610000, TRUE),
  
  -- Средние города (is_popular = FALSE)
  ('Ульяновск', 'Ulyanovsk', 'Ульяновская область', 'RU', 54.3142, 48.4031, 625000, FALSE),
  ('Ярославль', 'Yaroslavl', 'Ярославская область', 'RU', 57.6261, 39.8845, 608000, FALSE),
  ('Махачкала', 'Makhachkala', 'Республика Дагестан', 'RU', 42.9849, 47.5047, 600000, FALSE),
  ('Томск', 'Tomsk', 'Томская область', 'RU', 56.4977, 84.9744, 575000, FALSE),
  ('Оренбург', 'Orenburg', 'Оренбургская область', 'RU', 51.7682, 55.0970, 570000, FALSE),
  ('Кемерово', 'Kemerovo', 'Кемеровская область', 'RU', 55.3547, 86.0861, 558000, FALSE),
  ('Новокузнецк', 'Novokuznetsk', 'Кемеровская область', 'RU', 53.7596, 87.1216, 550000, FALSE),
  ('Рязань', 'Ryazan', 'Рязанская область', 'RU', 54.6269, 39.6916, 540000, FALSE),
  ('Астрахань', 'Astrakhan', 'Астраханская область', 'RU', 46.3497, 48.0408, 530000, FALSE),
  ('Пенза', 'Penza', 'Пензенская область', 'RU', 53.2001, 45.0047, 520000, FALSE),
  ('Киров', 'Kirov', 'Кировская область', 'RU', 58.6035, 49.6680, 515000, FALSE),
  ('Липецк', 'Lipetsk', 'Липецкая область', 'RU', 52.6108, 39.5708, 510000, FALSE),
  ('Чебоксары', 'Cheboksary', 'Чувашская Республика', 'RU', 56.1439, 47.2489, 497000, FALSE),
  ('Калининград', 'Kaliningrad', 'Калининградская область', 'RU', 54.7104, 20.4522, 490000, FALSE),
  ('Тула', 'Tula', 'Тульская область', 'RU', 54.1961, 37.6182, 475000, FALSE),
  ('Курск', 'Kursk', 'Курская область', 'RU', 51.7373, 36.1873, 450000, FALSE),
  ('Ставрополь', 'Stavropol', 'Ставропольский край', 'RU', 45.0428, 41.9692, 450000, FALSE),
  ('Сургут', 'Surgut', 'Ханты-Мансийский АО', 'RU', 61.2500, 73.4167, 380000, FALSE),
  ('Улан-Удэ', 'Ulan-Ude', 'Республика Бурятия', 'RU', 51.8272, 107.6063, 430000, FALSE),
  ('Магнитогорск', 'Magnitogorsk', 'Челябинская область', 'RU', 53.4189, 59.0298, 415000, FALSE)

ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEP 3: Success message
-- ============================================================================

DO $$
DECLARE
  city_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO city_count FROM public.cities;
  RAISE NOTICE '✅ Cities table created successfully';
  RAISE NOTICE '   - Total cities: %', city_count;
  RAISE NOTICE '   - Popular cities: %', (SELECT COUNT(*) FROM public.cities WHERE is_popular = TRUE);
  RAISE NOTICE '   - Ready for data migration';
END $$;
-- ============================================================================
-- Migration: Migrate events.city from TEXT to city_id FK
-- Date: 2024-12-13
-- Purpose: Replace events.city TEXT with events.city_id UUID FK
-- Depends on: 20241213_normalize_cities.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Add new city_id column
-- ============================================================================

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events(city_id) WHERE city_id IS NOT NULL;

COMMENT ON COLUMN public.events.city_id IS 'FK на справочник городов (заменяет старое TEXT поле city)';

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
  -- Count total events with city
  SELECT COUNT(*) INTO total_count 
  FROM public.events 
  WHERE city IS NOT NULL AND city != '';

  RAISE NOTICE 'Starting migration of % events...', total_count;

  -- Migrate each event
  FOR city_text IN 
    SELECT DISTINCT city 
    FROM public.events 
    WHERE city IS NOT NULL AND city != ''
  LOOP
    -- Try to find city in catalog (case-insensitive, trimmed)
    UPDATE public.events e
    SET city_id = c.id
    FROM public.cities c
    WHERE LOWER(TRIM(e.city)) = LOWER(TRIM(c.name))
      AND e.city_id IS NULL
      AND e.city = city_text;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    
    IF migrated_count > 0 THEN
      RAISE NOTICE '  ✓ Migrated % events for city: %', migrated_count, city_text;
    ELSE
      -- City not found in catalog, log it
      RAISE NOTICE '  ⚠ City not in catalog: "%" (% events)', city_text, 
        (SELECT COUNT(*) FROM public.events WHERE city = city_text);
      unknown_count := unknown_count + 1;
    END IF;
  END LOOP;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 Migration Summary:';
  RAISE NOTICE '   Total events with city: %', total_count;
  RAISE NOTICE '   Successfully migrated: %', 
    (SELECT COUNT(*) FROM public.events WHERE city_id IS NOT NULL);
  RAISE NOTICE '   Not migrated (city not in catalog): %', 
    (SELECT COUNT(*) FROM public.events WHERE city IS NOT NULL AND city != '' AND city_id IS NULL);
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

-- ALTER TABLE public.events DROP COLUMN IF EXISTS city;

-- Пока оставляем оба поля для безопасности
COMMENT ON COLUMN public.events.city IS '⚠️ DEPRECATED: Use city_id instead. Will be removed in future migration.';

-- ============================================================================
-- STEP 4: Success message
-- ============================================================================

DO $$
DECLARE
  with_city_id INTEGER;
  with_city_text INTEGER;
  total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM public.events;
  SELECT COUNT(*) INTO with_city_id FROM public.events WHERE city_id IS NOT NULL;
  SELECT COUNT(*) INTO with_city_text FROM public.events WHERE city IS NOT NULL AND city != '';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Events migration completed';
  RAISE NOTICE '   Total events: %', total;
  RAISE NOTICE '   With city_id: % (%.1f%%)', with_city_id, (with_city_id::FLOAT / NULLIF(total, 0) * 100);
  RAISE NOTICE '   With old city TEXT: %', with_city_text;
  RAISE NOTICE '   Ready for application update';
END $$;
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
-- ============================================================================
-- Migration: Migrate clubs.city from TEXT to city_id FK
-- Date: 2024-12-13
-- Purpose: Replace clubs.city TEXT with clubs.city_id UUID FK
-- Depends on: 20241213_normalize_cities.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Add new city_id column
-- ============================================================================

ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_clubs_city_id ON public.clubs(city_id) WHERE city_id IS NOT NULL;

COMMENT ON COLUMN public.clubs.city_id IS 'FK на справочник городов (заменяет старое TEXT поле city)';

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
  -- Count total clubs with city
  SELECT COUNT(*) INTO total_count 
  FROM public.clubs 
  WHERE city IS NOT NULL AND city != '';

  RAISE NOTICE 'Starting migration of % clubs...', total_count;

  -- Migrate each club
  FOR city_text IN 
    SELECT DISTINCT city 
    FROM public.clubs 
    WHERE city IS NOT NULL AND city != ''
  LOOP
    -- Try to find city in catalog (case-insensitive, trimmed)
    UPDATE public.clubs cl
    SET city_id = c.id
    FROM public.cities c
    WHERE LOWER(TRIM(cl.city)) = LOWER(TRIM(c.name))
      AND cl.city_id IS NULL
      AND cl.city = city_text;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    
    IF migrated_count > 0 THEN
      RAISE NOTICE '  ✓ Migrated % clubs for city: %', migrated_count, city_text;
    ELSE
      -- City not found in catalog, log it
      RAISE NOTICE '  ⚠ City not in catalog: "%" (% clubs)', city_text, 
        (SELECT COUNT(*) FROM public.clubs WHERE city = city_text);
      unknown_count := unknown_count + 1;
    END IF;
  END LOOP;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 Migration Summary:';
  RAISE NOTICE '   Total clubs with city: %', total_count;
  RAISE NOTICE '   Successfully migrated: %', 
    (SELECT COUNT(*) FROM public.clubs WHERE city_id IS NOT NULL);
  RAISE NOTICE '   Not migrated (city not in catalog): %', 
    (SELECT COUNT(*) FROM public.clubs WHERE city IS NOT NULL AND city != '' AND city_id IS NULL);
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

-- ALTER TABLE public.clubs DROP COLUMN IF EXISTS city;

-- Пока оставляем оба поля для безопасности
-- Удалить старый индекс:
-- DROP INDEX IF EXISTS idx_clubs_city;

COMMENT ON COLUMN public.clubs.city IS '⚠️ DEPRECATED: Use city_id instead. Will be removed in future migration.';

-- ============================================================================
-- STEP 4: Success message
-- ============================================================================

DO $$
DECLARE
  with_city_id INTEGER;
  with_city_text INTEGER;
  total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM public.clubs;
  SELECT COUNT(*) INTO with_city_id FROM public.clubs WHERE city_id IS NOT NULL;
  SELECT COUNT(*) INTO with_city_text FROM public.clubs WHERE city IS NOT NULL AND city != '';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Clubs migration completed';
  RAISE NOTICE '   Total clubs: %', total;
  RAISE NOTICE '   With city_id: % (%.1f%%)', with_city_id, (with_city_id::FLOAT / NULLIF(total, 0) * 100);
  RAISE NOTICE '   With old city TEXT: %', with_city_text;
  RAISE NOTICE '   Ready for application update';
END $$;
-- ============================================================================
-- Migration: Normalize user car data - Add car_brand_id FK
-- Date: 2024-12-13
-- Purpose: Add car_brand_id FK and car_model_text for structured car data
-- Priority: MEDIUM (Приоритет 2)
-- Depends on: car_brands table must exist
-- ============================================================================

-- ============================================================================
-- STEP 1: Add new columns
-- ============================================================================

-- Add FK to car_brands
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS car_brand_id UUID REFERENCES public.car_brands(id) ON DELETE SET NULL;

-- Add text field for model details
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS car_model_text TEXT CHECK (car_model_text IS NULL OR char_length(car_model_text) <= 200);

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_car_brand_id ON public.users(car_brand_id) WHERE car_brand_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.users.car_brand_id IS 'FK на справочник марок (например: Toyota)';
COMMENT ON COLUMN public.users.car_model_text IS 'Модель и дополнительная информация (например: "Land Cruiser 200 2015г")';

-- ============================================================================
-- STEP 2: Attempt to parse existing car_model data
-- ============================================================================

DO $$
DECLARE
  total_users INTEGER;
  migrated_count INTEGER := 0;
  unmigrated_count INTEGER := 0;
  user_rec RECORD;
  matched_brand_id UUID;
  matched_brand_name TEXT;
BEGIN
  -- Count users with car_model
  SELECT COUNT(*) INTO total_users
  FROM public.users
  WHERE car_model IS NOT NULL AND car_model != '';

  RAISE NOTICE 'Parsing % users with car_model...', total_users;

  -- Try to match each car_model with a brand
  FOR user_rec IN
    SELECT id, car_model
    FROM public.users
    WHERE car_model IS NOT NULL 
      AND car_model != ''
      AND car_brand_id IS NULL
  LOOP
    -- Try prefix match with brands (case-insensitive)
    SELECT id, name INTO matched_brand_id, matched_brand_name
    FROM public.car_brands
    WHERE user_rec.car_model ILIKE name || '%'
    ORDER BY char_length(name) DESC  -- Match longest first (e.g., "Mercedes-Benz" before "Mercedes")
    LIMIT 1;

    IF matched_brand_id IS NOT NULL THEN
      -- Brand found, extract model
      UPDATE public.users
      SET 
        car_brand_id = matched_brand_id,
        car_model_text = TRIM(REGEXP_REPLACE(
          car_model, 
          '^' || matched_brand_name, 
          '', 
          'i'  -- case-insensitive
        ))
      WHERE id = user_rec.id;
      
      migrated_count := migrated_count + 1;
    ELSE
      -- No brand match, just copy to car_model_text
      UPDATE public.users
      SET car_model_text = car_model
      WHERE id = user_rec.id;
      
      unmigrated_count := unmigrated_count + 1;
    END IF;
  END LOOP;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 Car Model Parsing Summary:';
  RAISE NOTICE '   Total users: %', total_users;
  RAISE NOTICE '   Successfully matched brand: %', migrated_count;
  RAISE NOTICE '   No brand match (copied to text): %', unmigrated_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Note: Parsing is heuristic. Users can update via profile.';
END $$;

-- ============================================================================
-- STEP 3: Mark old column as deprecated
-- ============================================================================

COMMENT ON COLUMN public.users.car_model IS '⚠️ DEPRECATED: Use car_brand_id + car_model_text instead. Will be removed in future migration.';

-- ============================================================================
-- STEP 4: Success message
-- ============================================================================

DO $$
DECLARE
  with_brand INTEGER;
  with_model_text INTEGER;
BEGIN
  SELECT COUNT(*) INTO with_brand FROM public.users WHERE car_brand_id IS NOT NULL;
  SELECT COUNT(*) INTO with_model_text FROM public.users WHERE car_model_text IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Car normalization completed';
  RAISE NOTICE '   Users with car_brand_id: %', with_brand;
  RAISE NOTICE '   Users with car_model_text: %', with_model_text;
  RAISE NOTICE '   Ready for application update';
END $$;

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
