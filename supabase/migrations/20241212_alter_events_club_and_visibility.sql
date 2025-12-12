-- ============================================================================
-- Migration: Alter events table - Add club_id and fix visibility
-- Date: 2024-12-12
-- Purpose: 
--   1. Add club_id foreign key to events
--   2. Migrate visibility from 'link_registered' to 'restricted'
--   3. Add new visibility value 'unlisted'
--   4. Add consistency check between is_club_event and club_id
-- ============================================================================

-- Step 1: Add club_id column (nullable, will be populated later)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;

-- Step 2: Create index on club_id for performance
CREATE INDEX IF NOT EXISTS idx_events_club_id ON public.events(club_id) WHERE club_id IS NOT NULL;

-- Step 3: Migrate existing 'link_registered' to 'restricted' (semantic match)
-- This is a data migration that needs to happen before constraint change
DO $$
BEGIN
  -- Check if 'link_registered' exists in data
  IF EXISTS (SELECT 1 FROM public.events WHERE visibility = 'link_registered') THEN
    -- Migrate the data
    UPDATE public.events 
    SET visibility = 'restricted' 
    WHERE visibility = 'link_registered';
    
    RAISE NOTICE 'Migrated % events from visibility=link_registered to visibility=restricted', 
      (SELECT COUNT(*) FROM public.events WHERE visibility = 'restricted');
  END IF;
END $$;

-- Step 4: Drop old visibility constraint (if exists)
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'events_visibility_check' 
      AND conrelid = 'public.events'::regclass
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT events_visibility_check;
    RAISE NOTICE 'Dropped old visibility constraint';
  END IF;
END $$;

-- Step 5: Add new visibility constraint with 3 values
ALTER TABLE public.events
ADD CONSTRAINT events_visibility_check 
  CHECK (visibility IN ('public', 'unlisted', 'restricted'));

-- Step 6: Add consistency constraint between is_club_event and club_id
-- This ensures is_club_event is TRUE if and only if club_id IS NOT NULL
ALTER TABLE public.events
ADD CONSTRAINT events_club_consistency_check
  CHECK (
    (is_club_event = TRUE AND club_id IS NOT NULL) OR
    (is_club_event = FALSE AND club_id IS NULL)
  );

-- Step 7: Update existing events to maintain consistency
-- Set is_club_event based on club_id (will be NULL for now, but future-proof)
DO $$
BEGIN
  UPDATE public.events
  SET is_club_event = (club_id IS NOT NULL)
  WHERE is_club_event != (club_id IS NOT NULL);
  
  IF FOUND THEN
    RAISE NOTICE 'Updated is_club_event consistency for existing events';
  END IF;
END $$;

-- Step 8: Add comments for documentation
COMMENT ON COLUMN public.events.club_id IS 'ID клуба-организатора (NULL = личное событие)';
COMMENT ON CONSTRAINT events_visibility_check ON public.events IS 'Уровни видимости: public (все), unlisted (по ссылке), restricted (только участники/клуб)';
COMMENT ON CONSTRAINT events_club_consistency_check ON public.events IS 'Гарантирует синхронизацию is_club_event и club_id (is_club_event = TRUE <=> club_id IS NOT NULL)';

-- Step 9: Create function to auto-update is_club_event when club_id changes
-- This is a safety trigger to prevent manual inconsistencies
CREATE OR REPLACE FUNCTION public.sync_event_club_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set is_club_event based on club_id
  NEW.is_club_event := (NEW.club_id IS NOT NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sync_event_club_flag ON public.events;
CREATE TRIGGER trigger_sync_event_club_flag
  BEFORE INSERT OR UPDATE OF club_id ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_club_flag();

COMMENT ON FUNCTION public.sync_event_club_flag IS 'Автоматически синхронизирует is_club_event с club_id (триггер)';
COMMENT ON TRIGGER trigger_sync_event_club_flag ON public.events IS 'Обеспечивает консистентность is_club_event = (club_id IS NOT NULL)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Events table successfully altered:';
  RAISE NOTICE '   - Added club_id column with foreign key to clubs';
  RAISE NOTICE '   - Migrated visibility: link_registered → restricted';
  RAISE NOTICE '   - Updated visibility constraint: public, unlisted, restricted';
  RAISE NOTICE '   - Added consistency constraint: is_club_event ⇔ club_id';
  RAISE NOTICE '   - Created auto-sync trigger for club flag';
END $$;

