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
