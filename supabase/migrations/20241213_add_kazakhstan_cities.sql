-- ============================================================================
-- Migration: Add Kazakhstan cities
-- Date: 2024-12-13
-- Purpose: Expand cities table with major cities of Kazakhstan
-- ============================================================================

BEGIN;

-- Add 15 major cities of Kazakhstan
INSERT INTO public.cities (name, name_en, region, country, lat, lng, population, is_popular) VALUES
  -- Major cities (is_popular = TRUE)
  ('Алматы', 'Almaty', 'Алматинская область', 'KZ', 43.2220, 76.8512, 2000000, TRUE),
  ('Астана', 'Astana', 'Акмолинская область', 'KZ', 51.1694, 71.4491, 1200000, TRUE),
  ('Шымкент', 'Shymkent', 'Туркестанская область', 'KZ', 42.3000, 69.6000, 1100000, TRUE),
  ('Караганда', 'Karaganda', 'Карагандинская область', 'KZ', 49.8047, 73.1094, 500000, TRUE),
  ('Актобе', 'Aktobe', 'Актюбинская область', 'KZ', 50.2839, 57.1670, 500000, TRUE),
  ('Атырау', 'Atyrau', 'Атырауская область', 'KZ', 47.1164, 51.8833, 270000, TRUE),
  ('Актау', 'Aktau', 'Мангистауская область', 'KZ', 43.6500, 51.1600, 200000, TRUE),
  
  -- Other cities (is_popular = FALSE)
  ('Тараз', 'Taraz', 'Жамбылская область', 'KZ', 42.9000, 71.3667, 360000, FALSE),
  ('Павлодар', 'Pavlodar', 'Павлодарская область', 'KZ', 52.2873, 76.9674, 360000, FALSE),
  ('Усть-Каменогорск', 'Ust-Kamenogorsk', 'Восточно-Казахстанская область', 'KZ', 49.9787, 82.6147, 330000, FALSE),
  ('Семей', 'Semey', 'Восточно-Казахстанская область', 'KZ', 50.4111, 80.2275, 350000, FALSE),
  ('Костанай', 'Kostanay', 'Костанайская область', 'KZ', 53.2144, 63.6246, 240000, FALSE),
  ('Кызылорда', 'Kyzylorda', 'Кызылординская область', 'KZ', 44.8479, 65.5093, 260000, FALSE),
  ('Уральск', 'Uralsk', 'Западно-Казахстанская область', 'KZ', 51.2333, 51.3667, 250000, FALSE),
  ('Петропавловск', 'Petropavlovsk', 'Северо-Казахстанская область', 'KZ', 54.8667, 69.1500, 220000, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Verification
SELECT 
  'Kazakhstan cities added' as status,
  COUNT(*) as total_cities,
  COUNT(*) FILTER (WHERE is_popular = true) as popular_cities
FROM public.cities 
WHERE country = 'KZ';

COMMIT;

-- ============================================================================
-- Success!
-- Added 15 cities of Kazakhstan (7 popular + 8 regular)
-- Total cities in database: ~60 (45 RU + 15 KZ)
-- ============================================================================

