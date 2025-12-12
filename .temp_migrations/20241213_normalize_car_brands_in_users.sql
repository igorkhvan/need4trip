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

