-- ============================================================================
-- Migration: Create vehicle_types table
-- Date: 2024-12-16
-- Purpose: Unify vehicle types from hardcoded to database
-- ============================================================================

-- Create vehicle_types table
CREATE TABLE IF NOT EXISTS public.vehicle_types (
  id TEXT PRIMARY KEY,                    -- offroad, sedan, suv, sportcar, classic, other
  name_en TEXT NOT NULL,                  -- English name
  name_ru TEXT NOT NULL,                  -- Russian name for UI
  display_order INT NOT NULL DEFAULT 0,   -- Sort order in dropdowns
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.vehicle_types IS 'Vehicle types for user cars and event requirements. Unified source of truth.';

-- Create index for active types (most common query)
CREATE INDEX idx_vehicle_types_active ON public.vehicle_types(is_active, display_order);

-- Seed data - унифицированный список типов авто
INSERT INTO public.vehicle_types (id, name_en, name_ru, display_order, is_active) VALUES
  ('offroad', 'Offroad', 'Внедорожник', 1, true),
  ('sedan', 'Sedan', 'Седан', 2, true),
  ('suv', 'SUV / Crossover', 'Кроссовер', 3, true),
  ('sportcar', 'Sports Car', 'Спорткар', 4, true),
  ('classic', 'Classic', 'Классика', 5, true),
  ('other', 'Other', 'Другое', 6, true)
ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ru = EXCLUDED.name_ru,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_vehicle_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vehicle_types_updated_at
  BEFORE UPDATE ON public.vehicle_types
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_types_updated_at();

-- Enable RLS
ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active vehicle types
CREATE POLICY "Anyone can view active vehicle types"
  ON public.vehicle_types
  FOR SELECT
  USING (is_active = true);

-- Note: Admin updates would be handled separately with admin role
