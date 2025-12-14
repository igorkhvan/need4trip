-- =====================================================
-- Migration: Migrate existing car data to user_cars
-- Created: 2024-12-14
-- Description: Мигрирует данные из users.car_brand_id 
--              в новую таблицу user_cars
-- =====================================================

-- 1. Migrate existing car data
INSERT INTO public.user_cars (user_id, car_brand_id, type, is_primary, created_at, updated_at)
SELECT 
  id as user_id,
  car_brand_id,
  'other' as type,  -- Default type для существующих авто
  true as is_primary,  -- Первый (единственный) автомобиль = основной
  created_at,
  updated_at
FROM public.users
WHERE car_brand_id IS NOT NULL
ON CONFLICT DO NOTHING;  -- Prevent duplicates if migration runs twice

-- 2. Mark old fields as deprecated
COMMENT ON COLUMN public.users.car_brand_id IS '⚠️ DEPRECATED (2024-12-14): Use user_cars table instead';
COMMENT ON COLUMN public.users.car_model_text IS '⚠️ DEPRECATED (2024-12-14): Use user_cars table instead';

-- 3. Verification
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  -- Count users with car_brand_id
  SELECT COUNT(*) INTO old_count 
  FROM public.users 
  WHERE car_brand_id IS NOT NULL;
  
  -- Count migrated cars
  SELECT COUNT(*) INTO new_count 
  FROM public.user_cars;
  
  RAISE NOTICE '📊 Migration stats:';
  RAISE NOTICE '   - Users with car_brand_id: %', old_count;
  RAISE NOTICE '   - Migrated to user_cars: %', new_count;
  
  IF new_count >= old_count THEN
    RAISE NOTICE '✅ Data migration completed successfully';
  ELSE
    RAISE WARNING '⚠️ Possible data loss: % users not migrated', (old_count - new_count);
  END IF;
END $$;

-- 4. TODO: После проверки в продакшене можно будет удалить старые колонки:
-- ALTER TABLE public.users DROP COLUMN car_brand_id;
-- ALTER TABLE public.users DROP COLUMN car_model_text;

