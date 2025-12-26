-- ============================================================================
-- Migration: Remove published_at from events table
-- Date: 2024-12-26
-- Purpose: Remove draft/published state tracking (no longer needed)
-- Reason: Events are now published immediately on create (no drafts)
-- ============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS public.idx_events_published_at;
DROP INDEX IF EXISTS public.idx_events_drafts_by_creator;

-- Drop column
ALTER TABLE public.events 
  DROP COLUMN IF EXISTS published_at;

-- Note: All events are now considered "published" immediately upon creation
-- Use created_at for event timeline tracking


