-- Migration: Add city field to events and users tables
-- Date: 2024-12-13
-- Purpose: Enable city-based filtering and personalization

-- ============================================================================
-- ADD CITY TO EVENTS
-- ============================================================================

-- Add city column to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS city TEXT CHECK (city IS NULL OR char_length(city) <= 100);

-- Create index for fast city-based filtering
CREATE INDEX IF NOT EXISTS idx_events_city 
ON public.events(city) 
WHERE city IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.events.city IS 'Город проведения события (для фильтрации и поиска)';

-- ============================================================================
-- ADD CITY TO USERS
-- ============================================================================

-- Add city column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS city TEXT CHECK (city IS NULL OR char_length(city) <= 100);

-- Create index for user city lookups
CREATE INDEX IF NOT EXISTS idx_users_city 
ON public.users(city) 
WHERE city IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.users.city IS 'Город проживания пользователя (для персонализации и рекомендаций)';

-- ============================================================================
-- UPDATE EXISTING DATA (OPTIONAL)
-- ============================================================================

-- Попытка извлечь город из location_text для существующих событий
-- Это необязательный шаг, можно закомментировать если не нужно

-- Пример простого парсинга: берем первое слово до запятой
-- UPDATE public.events
-- SET city = TRIM(SPLIT_PART(location_text, ',', 1))
-- WHERE city IS NULL 
--   AND location_text IS NOT NULL 
--   AND location_text LIKE '%,%';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Проверить что колонки добавлены
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name IN ('events', 'users') 
--   AND column_name = 'city';

-- Проверить индексы
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('events', 'users') 
--   AND indexname LIKE '%city%';

