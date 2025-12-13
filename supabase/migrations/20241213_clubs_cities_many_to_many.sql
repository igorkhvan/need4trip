-- ============================================================================
-- Migration: Clubs ↔ Cities Many-to-Many Relationship
-- Date: 2024-12-13
-- Purpose: Allow clubs to be associated with multiple cities
-- ============================================================================

-- Step 1: Create club_cities junction table
CREATE TABLE IF NOT EXISTS public.club_cities (
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, city_id)
);

-- Step 2: Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_club_cities_club_id ON public.club_cities(club_id);
CREATE INDEX IF NOT EXISTS idx_club_cities_city_id ON public.club_cities(city_id);

-- Step 3: Migrate existing data from clubs.city_id to club_cities
-- (if city_id column exists and has data)
DO $$
BEGIN
  -- Check if city_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clubs' 
    AND column_name = 'city_id'
  ) THEN
    -- Migrate data: insert into club_cities where city_id is not null
    INSERT INTO public.club_cities (club_id, city_id)
    SELECT id, city_id
    FROM public.clubs
    WHERE city_id IS NOT NULL
    ON CONFLICT (club_id, city_id) DO NOTHING;
    
    -- Drop the old city_id column
    ALTER TABLE public.clubs DROP COLUMN IF EXISTS city_id;
  END IF;
  
  -- Also check and drop old text-based city column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clubs' 
    AND column_name = 'city'
  ) THEN
    ALTER TABLE public.clubs DROP COLUMN city;
  END IF;
END $$;

-- Step 4: Drop old index if exists
DROP INDEX IF EXISTS public.idx_clubs_city;
DROP INDEX IF EXISTS public.idx_clubs_city_id;

-- Step 5: Add comments for documentation
COMMENT ON TABLE public.club_cities IS 'Many-to-many relationship between clubs and cities';
COMMENT ON COLUMN public.club_cities.club_id IS 'Club ID (FK to clubs.id)';
COMMENT ON COLUMN public.club_cities.city_id IS 'City ID (FK to cities.id)';
COMMENT ON COLUMN public.club_cities.created_at IS 'When this association was created';

-- ============================================================================
-- Helper function: Get club cities as array
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_club_city_ids(p_club_id UUID)
RETURNS UUID[]
LANGUAGE SQL
STABLE
AS $$
  SELECT ARRAY_AGG(city_id ORDER BY created_at)
  FROM public.club_cities
  WHERE club_id = p_club_id;
$$;

COMMENT ON FUNCTION public.get_club_city_ids(UUID) IS 'Returns array of city IDs for a given club';

-- ============================================================================
-- Helper function: Update club cities (replace all)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_club_cities(
  p_club_id UUID,
  p_city_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete existing associations
  DELETE FROM public.club_cities WHERE club_id = p_club_id;
  
  -- Insert new associations
  IF p_city_ids IS NOT NULL AND array_length(p_city_ids, 1) > 0 THEN
    INSERT INTO public.club_cities (club_id, city_id)
    SELECT p_club_id, unnest(p_city_ids);
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_club_cities(UUID, UUID[]) IS 'Replace all city associations for a club';

