-- ============================================================================
-- Migration: Normalize car_model - Add car_brand_id FK
-- Date: 2024-12-13
-- Purpose: Split car_model TEXT into car_brand_id (FK) + car_model_text
-- Priority: MEDIUM (Приоритет 2)
-- ============================================================================

-- ============================================================================
-- STEP 1: Add new columns to users table
-- ============================================================================

-- Add FK to car_brands
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS car_brand_id UUID REFERENCES public.car_brands(id) ON DELETE SET NULL;

-- Rename old car_model to car_model_text (или добавить новое поле)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS car_model_text TEXT CHECK (car_model_text IS NULL OR char_length(car_model_text) <= 200);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_car_brand_id ON public.users(car_brand_id) WHERE car_brand_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.users.car_brand_id IS 'FK на справочник марок автомобилей (нормализовано)';
COMMENT ON COLUMN public.users.car_model_text IS 'Модель автомобиля (свободный текст, например: "Land Cruiser 200")';
COMMENT ON COLUMN public.users.car_model IS '⚠️ DEPRECATED: Will be split into car_brand_id + car_model_text';

-- ============================================================================
-- STEP 2: Try to migrate existing data (best effort)
-- ============================================================================

DO $$
DECLARE
  migrated_count INTEGER := 0;
  user_record RECORD;
  brand_name TEXT;
BEGIN
  RAISE NOTICE 'Attempting to parse car_model into brand + model...';

  -- Try to extract brand from car_model
  FOR user_record IN 
    SELECT id, car_model 
    FROM public.users 
    WHERE car_model IS NOT NULL 
      AND car_model != ''
      AND car_brand_id IS NULL
  LOOP
    -- Try to match brand (case-insensitive prefix match)
    SELECT b.id, b.name INTO brand_name
    FROM public.car_brands b
    WHERE user_record.car_model ILIKE b.name || '%'
    ORDER BY char_length(b.name) DESC  -- Match longest brand first
    LIMIT 1;

    IF FOUND THEN
      -- Extract model text (remove brand prefix)
      UPDATE public.users
      SET 
        car_brand_id = (SELECT id FROM public.car_brands WHERE name = brand_name),
        car_model_text = TRIM(SUBSTRING(car_model FROM char_length(brand_name) + 1))
      WHERE id = user_record.id;
      
      migrated_count := migrated_count + 1;
    ELSE
      -- No brand match, just copy to car_model_text
      UPDATE public.users
      SET car_model_text = car_model
      WHERE id = user_record.id;
    END IF;
  END LOOP;

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 Car Model Migration Summary:';
  RAISE NOTICE '   Total users with car_model: %', 
    (SELECT COUNT(*) FROM public.users WHERE car_model IS NOT NULL AND car_model != '');
  RAISE NOTICE '   Successfully parsed brand: %', migrated_count;
  RAISE NOTICE '   Copied to car_model_text: %', 
    (SELECT COUNT(*) FROM public.users WHERE car_model_text IS NOT NULL);
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Note: Auto-parsing is best-effort. Manual review recommended.';
END $$;

-- ============================================================================
-- STEP 3: Drop old car_model column (commented out for safety)
-- ============================================================================

-- ВАЖНО: Не удаляем сразу, чтобы можно было откатиться!
-- После проверки данных в production раскомментировать:

-- ALTER TABLE public.users DROP COLUMN IF EXISTS car_model;

-- ============================================================================
-- STEP 4: Success message
-- ============================================================================

DO $$
DECLARE
  with_brand INTEGER;
  with_model_text INTEGER;
  total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM public.users;
  SELECT COUNT(*) INTO with_brand FROM public.users WHERE car_brand_id IS NOT NULL;
  SELECT COUNT(*) INTO with_model_text FROM public.users WHERE car_model_text IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Car model normalization completed';
  RAISE NOTICE '   Total users: %', total;
  RAISE NOTICE '   With car_brand_id: %', with_brand;
  RAISE NOTICE '   With car_model_text: %', with_model_text;
  RAISE NOTICE '   Ready for application update';
END $$;
