-- ============================================================================
-- Migration: Add published_at to events table
-- Date: 2024-12-25
-- Purpose: Track publication state for draft/published events
-- Spec: One-off event upgrade billing system
-- ============================================================================

-- Add published_at column
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL;

-- Index for published/unpublished queries
CREATE INDEX IF NOT EXISTS idx_events_published_at 
  ON public.events(published_at) 
  WHERE published_at IS NOT NULL;

-- Index for draft events by creator
CREATE INDEX IF NOT EXISTS idx_events_drafts_by_creator 
  ON public.events(created_by_user_id, created_at DESC) 
  WHERE published_at IS NULL;

-- Comments
COMMENT ON COLUMN public.events.published_at IS 
  'NULL = Draft (not visible), NOT NULL = Published (live). Set only via POST /api/events/:id/publish';

-- Note: Existing events without published_at are considered drafts
-- Migration does NOT auto-publish existing events

