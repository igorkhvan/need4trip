-- =====================================================
-- APPLY VIA SUPABASE DASHBOARD
-- =====================================================
-- Применить эти миграции вручную через SQL Editor:
-- https://supabase.com/dashboard/project/djbqwsipllhdydshuokg/sql
--
-- ⚠️ ВАЖНО: Применять последовательно (1 → 2 → 3)
-- =====================================================

-- ===========================================
-- МИГРАЦИЯ 1: Add user bio field
-- ===========================================

-- 1. Add bio column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Add comment
COMMENT ON COLUMN public.users.bio IS 'О себе (произвольный текст)';

-- 3. Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'bio'
  ) THEN
    RAISE NOTICE '✅ [1/3] Added bio column to users table';
  ELSE
    RAISE EXCEPTION '❌ [1/3] Failed to add bio column';
  END IF;
END $$;

-- ===========================================
-- МИГРАЦИЯ 2: Create user_cars table
-- ===========================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.user_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Марка (обязательно, FK на справочник)
  car_brand_id UUID NOT NULL REFERENCES public.car_brands(id) ON DELETE RESTRICT,
  
  -- Тип автомобиля (обязательно)
  type TEXT NOT NULL CHECK (type IN ('offroad', 'sedan', 'suv', 'sportcar', 'classic', 'other')),
  
  -- Гос номер (опционально)
  plate TEXT CHECK (plate IS NULL OR char_length(plate) <= 20),
  
  -- Цвет (опционально)
  color TEXT CHECK (color IS NULL OR char_length(color) <= 50),
  
  -- Основной автомобиль (только один на пользователя)
  is_primary BOOLEAN DEFAULT false NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_user_cars_user_id ON public.user_cars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cars_brand_id ON public.user_cars(car_brand_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cars_single_primary 
  ON public.user_cars(user_id) WHERE is_primary = true;

-- 3. Comments
COMMENT ON TABLE public.user_cars IS 'Автомобили пользователей (упрощенная схема)';
COMMENT ON COLUMN public.user_cars.id IS 'UUID автомобиля';
COMMENT ON COLUMN public.user_cars.user_id IS 'FK на users (владелец)';
COMMENT ON COLUMN public.user_cars.car_brand_id IS 'FK на car_brands (обязательный выбор из справочника)';
COMMENT ON COLUMN public.user_cars.type IS 'Тип: offroad, sedan, suv, sportcar, classic, other (обязательно)';
COMMENT ON COLUMN public.user_cars.plate IS 'Гос номер (опционально, до 20 символов)';
COMMENT ON COLUMN public.user_cars.color IS 'Цвет (опционально, до 50 символов)';
COMMENT ON COLUMN public.user_cars.is_primary IS 'Основной автомобиль пользователя (только один)';

-- 4. RLS Policies
ALTER TABLE public.user_cars ENABLE ROW LEVEL SECURITY;

-- Любой может видеть автомобили
CREATE POLICY "Anyone can view user cars"
  ON public.user_cars FOR SELECT
  USING (true);

-- Пользователь может создавать свои автомобили
CREATE POLICY "Users can create own cars"
  ON public.user_cars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователь может обновлять свои автомобили
CREATE POLICY "Users can update own cars"
  ON public.user_cars FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Пользователь может удалять свои автомобили
CREATE POLICY "Users can delete own cars"
  ON public.user_cars FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Trigger для updated_at
CREATE OR REPLACE FUNCTION public.update_user_cars_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_cars_updated_at
  BEFORE UPDATE ON public.user_cars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_cars_updated_at();

-- 6. Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_cars'
  ) THEN
    RAISE NOTICE '✅ [2/3] Created user_cars table with RLS and indexes';
  ELSE
    RAISE EXCEPTION '❌ [2/3] Failed to create user_cars table';
  END IF;
END $$;

-- ===========================================
-- МИГРАЦИЯ 3: Migrate existing data
-- ===========================================

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
  
  RAISE NOTICE '📊 [3/3] Migration stats:';
  RAISE NOTICE '   - Users with car_brand_id: %', old_count;
  RAISE NOTICE '   - Migrated to user_cars: %', new_count;
  
  IF new_count >= old_count THEN
    RAISE NOTICE '✅ [3/3] Data migration completed successfully';
  ELSE
    RAISE WARNING '⚠️ [3/3] Possible data loss: % users not migrated', (old_count - new_count);
  END IF;
END $$;

-- ===========================================
-- ГОТОВО! ✅
-- ===========================================
-- Теперь можно:
-- 1. Перегенерировать типы: npx supabase gen types typescript
-- 2. Обновить профильную страницу с UI для управления авто
--
-- TODO (после проверки в продакшене):
-- ALTER TABLE public.users DROP COLUMN car_brand_id;
-- ALTER TABLE public.users DROP COLUMN car_model_text;
-- ===========================================

