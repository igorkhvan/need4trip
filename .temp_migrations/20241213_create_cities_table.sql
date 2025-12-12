-- ============================================================================
-- Migration: Create cities table and normalize city references
-- Date: 2024-12-13
-- Purpose: Replace TEXT city fields with normalized city_id foreign keys
--
-- Changes:
--   1. Create cities table with geography data
--   2. Seed major cities of Russia and Kazakhstan
--   3. Migrate data from TEXT to FK for events, users, clubs
--   4. Add indexes for performance
-- ============================================================================

-- ============================================================================
-- STEP 1: Create cities table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  region TEXT,
  country TEXT NOT NULL DEFAULT 'RU',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  population INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: один город с таким именем в стране
  CONSTRAINT cities_name_country_unique UNIQUE (name, country)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cities_country ON public.cities(country);
CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_active ON public.cities(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cities_population ON public.cities(population DESC NULLS LAST);

-- GiST index for geospatial queries (optional, if needed later)
-- CREATE INDEX IF NOT EXISTS idx_cities_location ON public.cities USING gist(ll_to_earth(lat, lng));

-- Comments
COMMENT ON TABLE public.cities IS 'Справочник городов для нормализации city полей';
COMMENT ON COLUMN public.cities.name IS 'Название города на русском (основное)';
COMMENT ON COLUMN public.cities.name_en IS 'Название города на английском';
COMMENT ON COLUMN public.cities.region IS 'Регион/область';
COMMENT ON COLUMN public.cities.country IS 'Код страны (ISO 3166-1 alpha-2): RU, KZ, BY, etc.';
COMMENT ON COLUMN public.cities.lat IS 'Широта (latitude)';
COMMENT ON COLUMN public.cities.lng IS 'Долгота (longitude)';
COMMENT ON COLUMN public.cities.population IS 'Население (для сортировки по важности)';
COMMENT ON COLUMN public.cities.is_active IS 'Активен ли город (для скрытия неиспользуемых)';

-- ============================================================================
-- STEP 2: Seed major cities of Russia
-- ============================================================================

INSERT INTO public.cities (name, name_en, region, country, lat, lng, population) VALUES
-- Города-миллионники России
('Москва', 'Moscow', 'Московская область', 'RU', 55.7558, 37.6173, 12500000),
('Санкт-Петербург', 'Saint Petersburg', 'Ленинградская область', 'RU', 59.9343, 30.3351, 5400000),
('Новосибирск', 'Novosibirsk', 'Новосибирская область', 'RU', 55.0084, 82.9357, 1625000),
('Екатеринбург', 'Yekaterinburg', 'Свердловская область', 'RU', 56.8389, 60.6057, 1500000),
('Казань', 'Kazan', 'Республика Татарстан', 'RU', 55.8304, 49.0661, 1257000),
('Нижний Новгород', 'Nizhny Novgorod', 'Нижегородская область', 'RU', 56.2965, 43.9361, 1250000),
('Челябинск', 'Chelyabinsk', 'Челябинская область', 'RU', 55.1644, 61.4368, 1200000),
('Самара', 'Samara', 'Самарская область', 'RU', 53.1959, 50.1002, 1156000),
('Омск', 'Omsk', 'Омская область', 'RU', 54.9885, 73.3242, 1154000),
('Ростов-на-Дону', 'Rostov-on-Don', 'Ростовская область', 'RU', 47.2357, 39.7015, 1137000),
('Уфа', 'Ufa', 'Республика Башкортостан', 'RU', 54.7388, 55.9721, 1128000),
('Красноярск', 'Krasnoyarsk', 'Красноярский край', 'RU', 56.0153, 92.8932, 1093000),
('Воронеж', 'Voronezh', 'Воронежская область', 'RU', 51.6720, 39.1843, 1058000),
('Пермь', 'Perm', 'Пермский край', 'RU', 58.0105, 56.2502, 1055000),
('Волгоград', 'Volgograd', 'Волгоградская область', 'RU', 48.7080, 44.5133, 1008000),

-- Крупные города России (500k+)
('Краснодар', 'Krasnodar', 'Краснодарский край', 'RU', 45.0355, 38.9753, 948000),
('Саратов', 'Saratov', 'Саратовская область', 'RU', 51.5924, 46.0348, 901000),
('Тюмень', 'Tyumen', 'Тюменская область', 'RU', 57.1522, 65.5272, 807000),
('Тольятти', 'Tolyatti', 'Самарская область', 'RU', 53.5303, 49.3461, 699000),
('Ижевск', 'Izhevsk', 'Удмуртская Республика', 'RU', 56.8498, 53.2045, 648000),
('Барнаул', 'Barnaul', 'Алтайский край', 'RU', 53.3606, 83.7636, 632000),
('Ульяновск', 'Ulyanovsk', 'Ульяновская область', 'RU', 54.3142, 48.4031, 627000),
('Иркутск', 'Irkutsk', 'Иркутская область', 'RU', 52.2978, 104.2964, 623000),
('Хабаровск', 'Khabarovsk', 'Хабаровский край', 'RU', 48.4827, 135.0838, 616000),
('Ярославль', 'Yaroslavl', 'Ярославская область', 'RU', 57.6261, 39.8845, 608000),
('Владивосток', 'Vladivostok', 'Приморский край', 'RU', 43.1155, 131.8855, 604000),
('Махачкала', 'Makhachkala', 'Республика Дагестан', 'RU', 42.9849, 47.5047, 604000),
('Томск', 'Tomsk', 'Томская область', 'RU', 56.4977, 84.9744, 576000),
('Оренбург', 'Orenburg', 'Оренбургская область', 'RU', 51.7727, 55.0988, 572000),
('Кемерово', 'Kemerovo', 'Кемеровская область', 'RU', 55.3333, 86.0833, 558000),
('Новокузнецк', 'Novokuznetsk', 'Кемеровская область', 'RU', 53.7557, 87.1099, 537000),
('Рязань', 'Ryazan', 'Рязанская область', 'RU', 54.6269, 39.6916, 534000),
('Набережные Челны', 'Naberezhnye Chelny', 'Республика Татарстан', 'RU', 55.7430, 52.3955, 533000),

-- Средние города (200k-500k)
('Астрахань', 'Astrakhan', 'Астраханская область', 'RU', 46.3497, 48.0408, 475000),
('Пенза', 'Penza', 'Пензенская область', 'RU', 53.2007, 45.0046, 520000),
('Киров', 'Kirov', 'Кировская область', 'RU', 58.6035, 49.6680, 507000),
('Липецк', 'Lipetsk', 'Липецкая область', 'RU', 52.6103, 39.5708, 508000),
('Чебоксары', 'Cheboksary', 'Чувашская Республика', 'RU', 56.1439, 47.2489, 497000),
('Калининград', 'Kaliningrad', 'Калининградская область', 'RU', 54.7104, 20.4522, 489000),
('Тула', 'Tula', 'Тульская область', 'RU', 54.2044, 37.6175, 475000),
('Курск', 'Kursk', 'Курская область', 'RU', 51.7373, 36.1873, 450000),
('Сочи', 'Sochi', 'Краснодарский край', 'RU', 43.6028, 39.7342, 443000),
('Ставрополь', 'Stavropol', 'Ставропольский край', 'RU', 45.0428, 41.9734, 433000),
('Улан-Удэ', 'Ulan-Ude', 'Республика Бурятия', 'RU', 51.8272, 107.6063, 432000),
('Тверь', 'Tver', 'Тверская область', 'RU', 56.8587, 35.9176, 425000),
('Магнитогорск', 'Magnitogorsk', 'Челябинская область', 'RU', 53.4071, 58.9794, 413000),
('Иваново', 'Ivanovo', 'Ивановская область', 'RU', 57.0000, 40.9737, 401000),
('Брянск', 'Bryansk', 'Брянская область', 'RU', 53.2521, 34.3717, 405000),
('Белгород', 'Belgorod', 'Белгородская область', 'RU', 50.5997, 36.5982, 392000),
('Нижний Тагил', 'Nizhny Tagil', 'Свердловская область', 'RU', 57.9197, 59.9650, 348000),
('Архангельск', 'Arkhangelsk', 'Архангельская область', 'RU', 64.5401, 40.5433, 346000),
('Владимир', 'Vladimir', 'Владимирская область', 'RU', 56.1366, 40.3966, 349000),
('Калуга', 'Kaluga', 'Калужская область', 'RU', 54.5293, 36.2754, 341000),
('Сургут', 'Surgut', 'Ханты-Мансийский АО', 'RU', 61.2500, 73.4167, 379000),
('Смоленск', 'Smolensk', 'Смоленская область', 'RU', 54.7818, 32.0401, 329000),
('Вологда', 'Vologda', 'Вологодская область', 'RU', 59.2239, 39.8843, 301000),
('Чита', 'Chita', 'Забайкальский край', 'RU', 52.0330, 113.5000, 324000),
('Курган', 'Kurgan', 'Курганская область', 'RU', 55.4500, 65.3333, 310000),
('Орёл', 'Oryol', 'Орловская область', 'RU', 52.9651, 36.0785, 302000),

-- Города Казахстана
('Алматы', 'Almaty', 'Алматинская область', 'KZ', 43.2220, 76.8512, 2000000),
('Астана', 'Astana', 'Акмолинская область', 'KZ', 51.1605, 71.4704, 1200000),
('Шымкент', 'Shymkent', 'Туркестанская область', 'KZ', 42.3000, 69.6000, 1000000),
('Караганда', 'Karaganda', 'Карагандинская область', 'KZ', 49.8047, 73.1094, 500000),
('Актобе', 'Aktobe', 'Актюбинская область', 'KZ', 50.2833, 57.1667, 400000),
('Тараз', 'Taraz', 'Жамбылская область', 'KZ', 42.9000, 71.3667, 358000),

-- Беларусь (несколько крупных)
('Минск', 'Minsk', 'Минская область', 'BY', 53.9006, 27.5590, 2000000),
('Гомель', 'Gomel', 'Гомельская область', 'BY', 52.4411, 30.9878, 481000),
('Могилёв', 'Mogilev', 'Могилёвская область', 'BY', 53.9007, 30.3449, 365000),
('Витебск', 'Vitebsk', 'Витебская область', 'BY', 55.1904, 30.2049, 342000),
('Гродно', 'Grodno', 'Гродненская область', 'BY', 53.6693, 23.8131, 373000),
('Брест', 'Brest', 'Брестская область', 'BY', 52.0976, 23.7340, 350000)

ON CONFLICT (name, country) DO NOTHING;

-- ============================================================================
-- STEP 3: Add city_id columns to existing tables
-- ============================================================================

-- Add city_id to events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;

-- Add city_id to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;

-- Add city_id to clubs
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 4: Create indexes for foreign keys
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events(city_id) WHERE city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_city_id ON public.users(city_id) WHERE city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clubs_city_id ON public.clubs(city_id) WHERE city_id IS NOT NULL;

-- ============================================================================
-- STEP 5: Migrate existing TEXT data to city_id (best effort)
-- ============================================================================

DO $$
DECLARE
  migrated_events INTEGER := 0;
  migrated_users INTEGER := 0;
  migrated_clubs INTEGER := 0;
BEGIN
  -- Migrate events.city → events.city_id
  UPDATE public.events e
  SET city_id = c.id
  FROM public.cities c
  WHERE e.city IS NOT NULL 
    AND e.city_id IS NULL
    AND (
      -- Точное совпадение (case-insensitive)
      LOWER(TRIM(e.city)) = LOWER(c.name)
      OR LOWER(TRIM(e.city)) = LOWER(c.name_en)
    );
  GET DIAGNOSTICS migrated_events = ROW_COUNT;
  
  -- Migrate users.city → users.city_id
  UPDATE public.users u
  SET city_id = c.id
  FROM public.cities c
  WHERE u.city IS NOT NULL 
    AND u.city_id IS NULL
    AND (
      LOWER(TRIM(u.city)) = LOWER(c.name)
      OR LOWER(TRIM(u.city)) = LOWER(c.name_en)
    );
  GET DIAGNOSTICS migrated_users = ROW_COUNT;
  
  -- Migrate clubs.city → clubs.city_id
  UPDATE public.clubs cl
  SET city_id = c.id
  FROM public.cities c
  WHERE cl.city IS NOT NULL 
    AND cl.city_id IS NULL
    AND (
      LOWER(TRIM(cl.city)) = LOWER(c.name)
      OR LOWER(TRIM(cl.city)) = LOWER(c.name_en)
    );
  GET DIAGNOSTICS migrated_clubs = ROW_COUNT;
  
  RAISE NOTICE '✅ Data migration completed:';
  RAISE NOTICE '   - Events: % rows migrated', migrated_events;
  RAISE NOTICE '   - Users: % rows migrated', migrated_users;
  RAISE NOTICE '   - Clubs: % rows migrated', migrated_clubs;
  
  -- Report unmigrated rows (cities not in catalog)
  RAISE NOTICE 'ℹ️  Unmigrated rows (city not in catalog):';
  RAISE NOTICE '   - Events: %', (SELECT COUNT(*) FROM public.events WHERE city IS NOT NULL AND city_id IS NULL);
  RAISE NOTICE '   - Users: %', (SELECT COUNT(*) FROM public.users WHERE city IS NOT NULL AND city_id IS NULL);
  RAISE NOTICE '   - Clubs: %', (SELECT COUNT(*) FROM public.clubs WHERE city IS NOT NULL AND city_id IS NULL);
END $$;

-- ============================================================================
-- STEP 6: Add comments for new columns
-- ============================================================================

COMMENT ON COLUMN public.events.city_id IS 'FK на справочник городов (заменяет events.city TEXT)';
COMMENT ON COLUMN public.users.city_id IS 'FK на справочник городов (заменяет users.city TEXT)';
COMMENT ON COLUMN public.clubs.city_id IS 'FK на справочник городов (заменяет clubs.city TEXT)';

-- ============================================================================
-- STEP 7: Final success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ Cities normalization migration completed       ║';
  RAISE NOTICE '╠════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Created:                                          ║';
  RAISE NOTICE '║    • cities table with % cities          ║', (SELECT COUNT(*) FROM public.cities);
  RAISE NOTICE '║    • city_id columns in events/users/clubs         ║';
  RAISE NOTICE '║    • Indexes for performance                       ║';
  RAISE NOTICE '║                                                    ║';
  RAISE NOTICE '║  Next steps:                                       ║';
  RAISE NOTICE '║    1. Update application types (city_id UUID)      ║';
  RAISE NOTICE '║    2. Update UI with city autocomplete             ║';
  RAISE NOTICE '║    3. Test migration thoroughly                    ║';
  RAISE NOTICE '║    4. After validation: DROP old city columns      ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
END $$;

-- ============================================================================
-- OPTIONAL: Drop old TEXT columns (UNCOMMENT AFTER VALIDATION)
-- ============================================================================

-- After you've verified everything works with city_id:
-- ALTER TABLE public.events DROP COLUMN IF EXISTS city;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS city;
-- ALTER TABLE public.clubs DROP COLUMN IF EXISTS city;

