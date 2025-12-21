-- ============================================================================
-- Migration: Enable Row Level Security on events table
-- Date: 2024-12-22
-- Purpose: Defense in depth - protect events at database level
-- ============================================================================
--
-- SECURITY RATIONALE:
-- Application-level security (Next.js API) can be bypassed if:
-- 1. Supabase anon key is compromised
-- 2. Direct SQL queries via Supabase client
-- 3. Future bugs in application code
--
-- RLS provides database-level enforcement that CANNOT be bypassed.
--
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT Policies (Read Access)
-- ============================================================================

-- Policy 1: Public events visible to everyone (including anonymous)
CREATE POLICY "events_select_public"
  ON public.events
  FOR SELECT
  USING (visibility = 'public');

-- Policy 2: Unlisted events visible to everyone by direct link
-- These are hidden from lists but accessible if user has the URL
CREATE POLICY "events_select_unlisted"
  ON public.events
  FOR SELECT
  USING (visibility = 'unlisted');

-- Policy 3: Restricted events visible to authenticated users with access
-- Access is granted if user:
-- - Is the owner
-- - Is a participant (event_participants table)
-- - Has explicit access (event_user_access table)
CREATE POLICY "events_select_restricted_with_access"
  ON public.events
  FOR SELECT
  USING (
    visibility = 'restricted'
    AND auth.uid() IS NOT NULL
    AND (
      -- Owner can always see
      created_by_user_id = auth.uid()
      -- OR user is participant
      OR EXISTS (
        SELECT 1 FROM public.event_participants
        WHERE event_id = events.id
          AND user_id = auth.uid()
      )
      -- OR user has explicit access (granted via link)
      OR EXISTS (
        SELECT 1 FROM public.event_user_access
        WHERE event_id = events.id
          AND user_id = auth.uid()
      )
    )
  );

-- Policy 4: Owners can always see their own events (any visibility)
-- This is a catch-all for owner access
CREATE POLICY "events_select_own"
  ON public.events
  FOR SELECT
  USING (created_by_user_id = auth.uid());

-- ============================================================================
-- INSERT Policy (Create Events)
-- ============================================================================

-- Policy: Authenticated users can create events
CREATE POLICY "events_insert_authenticated"
  ON public.events
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by_user_id = auth.uid()
  );

-- ============================================================================
-- UPDATE Policy (Modify Events)
-- ============================================================================

-- Policy: Only owners can update their events
CREATE POLICY "events_update_own"
  ON public.events
  FOR UPDATE
  USING (created_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid());

-- ============================================================================
-- DELETE Policy (Remove Events)
-- ============================================================================

-- Policy: Only owners can delete their events
CREATE POLICY "events_delete_own"
  ON public.events
  FOR DELETE
  USING (created_by_user_id = auth.uid());

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'events') THEN
    RAISE EXCEPTION 'RLS is not enabled on events table';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on events table';
  RAISE NOTICE 'Created 7 policies: 4 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE';
END $$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.events IS 'Events table with Row Level Security enabled. Visibility controlled by RLS policies based on visibility column and user relationships.';
