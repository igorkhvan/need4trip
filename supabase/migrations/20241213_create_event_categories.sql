-- =====================================================
-- Migration: Create event_categories table
-- Description: Move event categories from enum to table
-- Author: AI Assistant
-- Date: 2024-12-13
-- =====================================================

-- Create event_categories table
CREATE TABLE IF NOT EXISTS public.event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name_ru VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.event_categories IS 'Event categories/types for classification';

-- Insert initial categories based on current system
INSERT INTO public.event_categories (code, name_ru, name_en, icon, display_order) VALUES
  ('offroad', 'Внедорожники', 'Off-road', 'mountain', 1),
  ('touring', 'Туризм', 'Touring', 'map-pin', 2),
  ('sportcars', 'Спорткары', 'Sport Cars', 'zap', 3),
  ('classic', 'Классика', 'Classic Cars', 'car', 4),
  ('track', 'Трек-дни', 'Track Days', 'gauge', 5),
  ('other', 'Другое', 'Other', 'more-horizontal', 6);

-- Create index for faster lookups
CREATE INDEX idx_event_categories_code ON public.event_categories(code);
CREATE INDEX idx_event_categories_active ON public.event_categories(is_active) WHERE is_active = true;

-- Add category_id column to events table
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.event_categories(id) ON DELETE SET NULL;

-- Migrate existing category data (if column exists)
-- Map old string/enum values to new category IDs
DO $$
DECLARE
  offroad_id UUID;
  touring_id UUID;
  sportcars_id UUID;
  classic_id UUID;
  track_id UUID;
  other_id UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO offroad_id FROM public.event_categories WHERE code = 'offroad';
  SELECT id INTO touring_id FROM public.event_categories WHERE code = 'touring';
  SELECT id INTO sportcars_id FROM public.event_categories WHERE code = 'sportcars';
  SELECT id INTO classic_id FROM public.event_categories WHERE code = 'classic';
  SELECT id INTO track_id FROM public.event_categories WHERE code = 'track';
  SELECT id INTO other_id FROM public.event_categories WHERE code = 'other';

  -- Only migrate if old category column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'category'
  ) THEN
    -- Update events with new category_id based on old category value
    UPDATE public.events SET category_id = offroad_id WHERE category = 'offroad';
    UPDATE public.events SET category_id = touring_id WHERE category = 'touring';
    UPDATE public.events SET category_id = sportcars_id WHERE category = 'sportcars';
    UPDATE public.events SET category_id = classic_id WHERE category = 'classic';
    UPDATE public.events SET category_id = track_id WHERE category = 'track';
    UPDATE public.events SET category_id = other_id WHERE category = 'other';
    
    -- Set NULL for any unmapped categories
    UPDATE public.events SET category_id = other_id WHERE category_id IS NULL AND category IS NOT NULL;
  END IF;
END $$;

-- Create index for events.category_id
CREATE INDEX IF NOT EXISTS idx_events_category_id ON public.events(category_id);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_event_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER event_categories_updated_at
  BEFORE UPDATE ON public.event_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_event_categories_updated_at();

-- Grant permissions (adjust as needed for your setup)
GRANT SELECT ON public.event_categories TO anon, authenticated;
GRANT ALL ON public.event_categories TO service_role;

-- Enable RLS (adjust policies as needed)
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active categories
CREATE POLICY "Anyone can read active event categories"
  ON public.event_categories
  FOR SELECT
  USING (is_active = true);

-- Only service role can modify categories
CREATE POLICY "Service role can manage event categories"
  ON public.event_categories
  FOR ALL
  USING (auth.role() = 'service_role');

-- Drop old category column after migration (optional, comment out if you want to keep it)
-- ALTER TABLE public.events DROP COLUMN IF EXISTS category;

COMMENT ON COLUMN public.events.category_id IS 'Reference to event category (replaces old category enum)';

