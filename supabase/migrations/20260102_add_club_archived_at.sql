-- Migration: Add archived_at column to clubs table
-- Purpose: Implement club archiving (soft-delete) per SSOT_CLUBS_DOMAIN.md §8.3
-- Date: 2026-01-02

-- ============================================================================
-- 1. Add archived_at column
-- ============================================================================
-- Club is archived when archived_at IS NOT NULL
-- Archived clubs:
--   - Cannot have write operations (except whitelist per SSOT §8.3.1)
--   - Are excluded from public listings
--   - Can still be read (profile read-only)

ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.clubs.archived_at IS 
  'Timestamp when club was archived (soft-deleted). NULL means active. Per SSOT_CLUBS_DOMAIN.md §8.3';

-- ============================================================================
-- 2. Add index for archived_at
-- ============================================================================
-- Partial index for active clubs (used in listings)
-- More efficient than full index since most clubs are active

CREATE INDEX IF NOT EXISTS idx_clubs_active 
ON public.clubs (created_at DESC) 
WHERE archived_at IS NULL;

-- Index for archived lookup (admin queries)
CREATE INDEX IF NOT EXISTS idx_clubs_archived_at 
ON public.clubs (archived_at) 
WHERE archived_at IS NOT NULL;

-- ============================================================================
-- 3. Verification
-- ============================================================================
-- Verify column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clubs' 
    AND column_name = 'archived_at'
  ) THEN
    RAISE EXCEPTION 'Column clubs.archived_at was not created';
  END IF;
  
  RAISE NOTICE 'Migration successful: clubs.archived_at column added';
END $$;

