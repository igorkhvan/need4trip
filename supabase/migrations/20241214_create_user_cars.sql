-- =====================================================
-- Migration: Create user_cars table
-- Created: 2024-12-14
-- Description: Таблица для хранения автомобилей пользователей
--              (упрощенная схема без model и year)
-- =====================================================

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
    RAISE NOTICE '✅ Created user_cars table with RLS and indexes';
  ELSE
    RAISE EXCEPTION '❌ Failed to create user_cars table';
  END IF;
END $$;

