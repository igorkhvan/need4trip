-- ============================================================================
-- APPLY NORMALIZATION MIGRATIONS VIA DASHBOARD
-- Date: 2024-12-13
-- 
-- INSTRUCTIONS:
-- 1. Open https://supabase.com/dashboard/project/djbqwsipllhdydshuokg/sql
-- 2. Create "+ New query"
-- 3. Copy-paste THIS ENTIRE FILE
-- 4. Click "Run" (or Cmd+Enter)
-- 5. Check results in console below
-- ============================================================================

BEGIN;

-- Check if migrations already applied
DO $$
DECLARE
    cities_exists BOOLEAN;
    currencies_exists BOOLEAN;
    events_city_id_exists BOOLEAN;
BEGIN
    -- Check if tables/columns exist
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'cities'
    ) INTO cities_exists;
    
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'currencies'
    ) INTO currencies_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'city_id'
    ) INTO events_city_id_exists;
    
    IF cities_exists THEN
        RAISE NOTICE '⚠️  cities table already exists - skipping normalization';
        RAISE EXCEPTION 'Migrations already applied. Database is already normalized.';
    END IF;
    
    RAISE NOTICE '✅ Starting normalization migrations...';
END $$;

-- ============================================================================
-- MIGRATION 1: Create cities table + seed
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE 'Creating cities table...';
END $$;

CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_en TEXT,
  region TEXT,
  country TEXT NOT NULL DEFAULT 'RU',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  population INTEGER,
  is_popular BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_country ON public.cities(country);
CREATE INDEX IF NOT EXISTS idx_cities_popular ON public.cities(is_popular) WHERE is_popular = TRUE;
CREATE INDEX IF NOT EXISTS idx_cities_population ON public.cities(population DESC NULLS LAST);

COMMENT ON TABLE public.cities IS 'Справочник городов для событий, пользователей и клубов';

-- Seed cities (45 Russian cities)
INSERT INTO public.cities (name, name_en, region, country, lat, lng, population, is_popular) VALUES
  ('Москва', 'Moscow', 'Московская область', 'RU', 55.7558, 37.6173, 12500000, TRUE),
  ('Санкт-Петербург', 'Saint Petersburg', 'Ленинградская область', 'RU', 59.9311, 30.3609, 5400000, TRUE),
  ('Новосибирск', 'Novosibirsk', 'Новосибирская область', 'RU', 55.0084, 82.9357, 1620000, TRUE),
  ('Екатеринбург', 'Yekaterinburg', 'Свердловская область', 'RU', 56.8389, 60.6057, 1490000, TRUE),
  ('Казань', 'Kazan', 'Республика Татарстан', 'RU', 55.8304, 49.0661, 1250000, TRUE),
  ('Нижний Новгород', 'Nizhny Novgorod', 'Нижегородская область', 'RU', 56.3287, 44.0020, 1250000, TRUE),
  ('Челябинск', 'Chelyabinsk', 'Челябинская область', 'RU', 55.1644, 61.4368, 1200000, TRUE),
  ('Красноярск', 'Krasnoyarsk', 'Красноярский край', 'RU', 56.0184, 92.8672, 1090000, TRUE),
  ('Самара', 'Samara', 'Самарская область', 'RU', 53.2415, 50.2212, 1156000, TRUE),
  ('Уфа', 'Ufa', 'Республика Башкортостан', 'RU', 54.7388, 55.9721, 1130000, TRUE),
  ('Ростов-на-Дону', 'Rostov-on-Don', 'Ростовская область', 'RU', 47.2357, 39.7015, 1137000, TRUE),
  ('Омск', 'Omsk', 'Омская область', 'RU', 54.9885, 73.3242, 1154000, TRUE),
  ('Краснодар', 'Krasnodar', 'Краснодарский край', 'RU', 45.0355, 38.9753, 900000, TRUE),
  ('Воронеж', 'Voronezh', 'Воронежская область', 'RU', 51.6720, 39.1843, 1050000, TRUE),
  ('Пермь', 'Perm', 'Пермский край', 'RU', 58.0297, 56.2667, 1050000, TRUE),
  ('Волгоград', 'Volgograd', 'Волгоградская область', 'RU', 48.7080, 44.5133, 1000000, TRUE),
  ('Саратов', 'Saratov', 'Саратовская область', 'RU', 51.5924, 45.9605, 837000, FALSE),
  ('Тюмень', 'Tyumen', 'Тюменская область', 'RU', 57.1535, 65.5344, 816000, TRUE),
  ('Тольятти', 'Tolyatti', 'Самарская область', 'RU', 53.5303, 49.3461, 693000, FALSE),
  ('Ижевск', 'Izhevsk', 'Удмуртская Республика', 'RU', 56.8519, 53.2048, 648000, FALSE),
  ('Барнаул', 'Barnaul', 'Алтайский край', 'RU', 53.3606, 83.7636, 632000, FALSE),
  ('Ульяновск', 'Ulyanovsk', 'Ульяновская область', 'RU', 54.3142, 48.4031, 620000, FALSE),
  ('Иркутск', 'Irkutsk', 'Иркутская область', 'RU', 52.2870, 104.3050, 617000, TRUE),
  ('Хабаровск', 'Khabarovsk', 'Хабаровский край', 'RU', 48.4827, 135.0838, 616000, TRUE),
  ('Ярославль', 'Yaroslavl', 'Ярославская область', 'RU', 57.6299, 39.8737, 608000, FALSE),
  ('Владивосток', 'Vladivostok', 'Приморский край', 'RU', 43.1150, 131.8855, 600000, TRUE),
  ('Махачкала', 'Makhachkala', 'Республика Дагестан', 'RU', 42.9849, 47.5047, 596000, FALSE),
  ('Томск', 'Tomsk', 'Томская область', 'RU', 56.4977, 84.9744, 575000, FALSE),
  ('Оренбург', 'Orenburg', 'Оренбургская область', 'RU', 51.7682, 55.0969, 564000, FALSE),
  ('Кемерово', 'Kemerovo', 'Кемеровская область', 'RU', 55.3331, 86.0891, 556000, FALSE),
  ('Новокузнецк', 'Novokuznetsk', 'Кемеровская область', 'RU', 53.7557, 87.1099, 548000, FALSE),
  ('Рязань', 'Ryazan', 'Рязанская область', 'RU', 54.6269, 39.6916, 534000, FALSE),
  ('Астрахань', 'Astrakhan', 'Астраханская область', 'RU', 46.3497, 48.0408, 524000, FALSE),
  ('Набережные Челны', 'Naberezhnye Chelny', 'Республика Татарстан', 'RU', 55.7430, 52.3953, 532000, FALSE),
  ('Пенза', 'Penza', 'Пензенская область', 'RU', 53.2001, 45.0047, 520000, FALSE),
  ('Киров', 'Kirov', 'Кировская область', 'RU', 58.6035, 49.6680, 507000, FALSE),
  ('Липецк', 'Lipetsk', 'Липецкая область', 'RU', 52.6094, 39.5705, 508000, FALSE),
  ('Чебоксары', 'Cheboksary', 'Чувашская Республика', 'RU', 56.1439, 47.2489, 497000, FALSE),
  ('Калининград', 'Kaliningrad', 'Калининградская область', 'RU', 54.7104, 20.4522, 489000, TRUE),
  ('Тула', 'Tula', 'Тульская область', 'RU', 54.1961, 37.6182, 475000, FALSE),
  ('Курск', 'Kursk', 'Курская область', 'RU', 51.7373, 36.1873, 440000, FALSE),
  ('Сочи', 'Sochi', 'Краснодарский край', 'RU', 43.5855, 39.7231, 424000, TRUE),
  ('Ставрополь', 'Stavropol', 'Ставропольский край', 'RU', 45.0448, 41.9686, 433000, FALSE),
  ('Улан-Удэ', 'Ulan-Ude', 'Республика Бурятия', 'RU', 51.8272, 107.6063, 432000, FALSE),
  ('Магнитогорск', 'Magnitogorsk', 'Челябинская область', 'RU', 53.4111, 59.0497, 413000, FALSE)
ON CONFLICT (name) DO NOTHING;

DO $$ BEGIN
    RAISE NOTICE '✅ Cities created: 45 cities seeded';
END $$;

-- ============================================================================
-- MIGRATION 2: Migrate events.city → events.city_id
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE 'Migrating events.city to city_id...';
END $$;

-- Add city_id column
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id);

-- Migrate data: match existing city text to cities.name
UPDATE public.events e
SET city_id = c.id
FROM public.cities c
WHERE e.city IS NOT NULL 
  AND TRIM(LOWER(e.city)) = TRIM(LOWER(c.name))
  AND e.city_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events(city_id);

-- Drop old column (commented out for safety - uncomment when confident)
-- ALTER TABLE public.events DROP COLUMN IF EXISTS city;

DO $$ BEGIN
    RAISE NOTICE '✅ Events migrated to city_id';
END $$;

-- ============================================================================
-- MIGRATION 3: Migrate users.city → users.city_id
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE 'Migrating users.city to city_id...';
END $$;

-- Add city_id column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id);

-- Migrate data
UPDATE public.users u
SET city_id = c.id
FROM public.cities c
WHERE u.city IS NOT NULL 
  AND TRIM(LOWER(u.city)) = TRIM(LOWER(c.name))
  AND u.city_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_city_id ON public.users(city_id);

-- Drop old column (commented out for safety)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS city;

DO $$ BEGIN
    RAISE NOTICE '✅ Users migrated to city_id';
END $$;

-- ============================================================================
-- MIGRATION 4: Migrate clubs.city → clubs.city_id
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE 'Migrating clubs.city to city_id...';
END $$;

-- Add city_id column
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id);

-- Migrate data
UPDATE public.clubs cl
SET city_id = c.id
FROM public.cities c
WHERE cl.city IS NOT NULL 
  AND TRIM(LOWER(cl.city)) = TRIM(LOWER(c.name))
  AND cl.city_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_clubs_city_id ON public.clubs(city_id);

-- Drop old column (commented out for safety)
-- ALTER TABLE public.clubs DROP COLUMN IF EXISTS city;

DO $$ BEGIN
    RAISE NOTICE '✅ Clubs migrated to city_id';
END $$;

-- ============================================================================
-- MIGRATION 5: Create currencies table + migrate events.currency
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE 'Creating currencies table...';
END $$;

CREATE TABLE IF NOT EXISTS public.currencies (
  code TEXT PRIMARY KEY,              -- ISO 4217 code (RUB, USD, EUR, etc.)
  symbol TEXT NOT NULL,                -- Symbol (₽, $, €, etc.)
  name_ru TEXT NOT NULL,               -- Russian name
  name_en TEXT,                        -- English name
  decimal_places INTEGER DEFAULT 2,    -- Decimal places (2 for most, 0 for some)
  is_active BOOLEAN DEFAULT TRUE,      -- Active currencies
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_currencies_active ON public.currencies(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE public.currencies IS 'Справочник валют для событий';

-- Seed currencies
INSERT INTO public.currencies (code, symbol, name_ru, name_en, decimal_places, is_active) VALUES
  ('RUB', '₽', 'Российский рубль', 'Russian Ruble', 2, TRUE),
  ('USD', '$', 'Доллар США', 'US Dollar', 2, TRUE),
  ('EUR', '€', 'Евро', 'Euro', 2, TRUE),
  ('GBP', '£', 'Британский фунт', 'British Pound', 2, TRUE),
  ('CNY', '¥', 'Китайский юань', 'Chinese Yuan', 2, TRUE),
  ('JPY', '¥', 'Японская иена', 'Japanese Yen', 0, TRUE),
  ('KRW', '₩', 'Южнокорейская вона', 'South Korean Won', 0, TRUE),
  ('TRY', '₺', 'Турецкая лира', 'Turkish Lira', 2, TRUE),
  ('INR', '₹', 'Индийская рупия', 'Indian Rupee', 2, TRUE),
  ('BRL', 'R$', 'Бразильский реал', 'Brazilian Real', 2, TRUE),
  ('AED', 'د.إ', 'Дирхам ОАЭ', 'UAE Dirham', 2, TRUE),
  ('THB', '฿', 'Тайский бат', 'Thai Baht', 2, TRUE),
  ('KZT', '₸', 'Казахстанский тенге', 'Kazakhstani Tenge', 2, TRUE),
  ('BYN', 'Br', 'Белорусский рубль', 'Belarusian Ruble', 2, TRUE)
ON CONFLICT (code) DO NOTHING;

DO $$ BEGIN
    RAISE NOTICE '✅ Currencies created: 14 currencies seeded';
END $$;

-- Migrate events.currency to currency_code
DO $$ BEGIN
    RAISE NOTICE 'Migrating events.currency to currency_code...';
END $$;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS currency_code TEXT REFERENCES public.currencies(code);

-- Migrate data (assume existing currency values are codes or convert them)
UPDATE public.events e
SET currency_code = UPPER(TRIM(e.currency))
WHERE e.currency IS NOT NULL 
  AND UPPER(TRIM(e.currency)) IN (SELECT code FROM public.currencies)
  AND e.currency_code IS NULL;

-- Default to RUB if currency was set but not recognized
UPDATE public.events
SET currency_code = 'RUB'
WHERE currency IS NOT NULL 
  AND currency_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_currency_code ON public.events(currency_code);

-- Drop old column (commented out for safety)
-- ALTER TABLE public.events DROP COLUMN IF EXISTS currency;

DO $$ BEGIN
    RAISE NOTICE '✅ Events migrated to currency_code';
END $$;

-- ============================================================================
-- MIGRATION 6: Add car_brand_id to users
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE 'Adding car_brand_id to users...';
END $$;

-- Assuming car_brands table already exists from earlier migrations
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS car_brand_id UUID REFERENCES public.car_brands(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS car_model_text TEXT;

-- Try to extract brand from car_model and match with car_brands
-- This is a best-effort migration - manual review recommended
UPDATE public.users u
SET car_brand_id = cb.id
FROM public.car_brands cb
WHERE u.car_model IS NOT NULL
  AND u.car_brand_id IS NULL
  AND (
    LOWER(u.car_model) LIKE LOWER(cb.name || '%')
    OR LOWER(u.car_model) LIKE LOWER(cb.name_en || '%')
  )
  AND cb.is_popular = TRUE;

-- Copy full car_model to car_model_text
UPDATE public.users
SET car_model_text = car_model
WHERE car_model IS NOT NULL AND car_model_text IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_car_brand_id ON public.users(car_brand_id);

-- Drop old column (commented out for safety)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS car_model;

DO $$ BEGIN
    RAISE NOTICE '✅ Users car_brand_id added and migrated';
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$ BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL NORMALIZATION MIGRATIONS COMPLETE';
    RAISE NOTICE '========================================';
END $$;

-- Show summary
SELECT 
  'cities' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE is_popular = true) as popular_count
FROM public.cities
UNION ALL
SELECT 
  'currencies',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active = true)
FROM public.currencies
UNION ALL
SELECT
  'events.city_id',
  COUNT(*),
  COUNT(*) FILTER (WHERE city_id IS NOT NULL)
FROM public.events
UNION ALL
SELECT
  'users.city_id',
  COUNT(*),
  COUNT(*) FILTER (WHERE city_id IS NOT NULL)
FROM public.users
UNION ALL
SELECT
  'clubs.city_id',
  COUNT(*),
  COUNT(*) FILTER (WHERE city_id IS NOT NULL)
FROM public.clubs;

COMMIT;

-- ============================================================================
-- DONE!
-- Next steps:
-- 1. Update Supabase types: npx supabase gen types typescript
-- 2. Test API endpoints
-- 3. After verification, uncomment DROP COLUMN statements and rerun
-- ============================================================================
