-- ============================================================================
-- Migration: Enable Row Level Security on event_participants table
-- Date: 2024-12-22
-- Purpose: Protect participant personal data at database level
-- ============================================================================
--
-- SECURITY RATIONALE:
-- event_participants contains sensitive personal information:
-- - User IDs and names
-- - Phone numbers
-- - Car details
-- - Custom field responses
-- - Guest session IDs
--
-- Without RLS, anyone with Supabase client access can query ALL participants
-- of ALL events, causing massive privacy breach.
--
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT Policies (Read Access)
-- ============================================================================

-- Policy 1: Event owner can see all participants of their events
CREATE POLICY "participants_select_event_owner"
  ON public.event_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_participants.event_id
        AND events.created_by_user_id = auth.uid()
    )
  );

-- Policy 2: Participants can see other participants of events they're registered for
-- This is needed for displaying participant lists on event pages
CREATE POLICY "participants_select_event_participants"
  ON public.event_participants
  FOR SELECT
  USING (
    -- User is registered for this event (either as user_id or guest_session_id)
    EXISTS (
      SELECT 1 FROM public.event_participants AS my_registration
      WHERE my_registration.event_id = event_participants.event_id
        AND (
          my_registration.user_id = auth.uid()
          OR (
            my_registration.guest_session_id IS NOT NULL
            AND my_registration.guest_session_id = current_setting('request.headers', true)::json->>'x-guest-session-id'
          )
        )
    )
  );

-- Policy 3: Users can always see their own registrations
CREATE POLICY "participants_select_own"
  ON public.event_participants
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- INSERT Policy (Register for Event)
-- ============================================================================

-- Policy: Authenticated users can register themselves
-- Guest registrations are handled separately (guest_session_id check in application)
CREATE POLICY "participants_insert_self"
  ON public.event_participants
  FOR INSERT
  WITH CHECK (
    -- Either authenticated user registering themselves
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    -- OR guest registration (user_id is NULL, guest_session_id is set)
    -- Note: guest_session_id validation happens in application layer
    OR (user_id IS NULL AND guest_session_id IS NOT NULL)
  );

-- ============================================================================
-- UPDATE Policy (Modify Registration)
-- ============================================================================

-- Policy: Users can update their own registrations
-- Event owners can update any participant
CREATE POLICY "participants_update_own_or_owner"
  ON public.event_participants
  FOR UPDATE
  USING (
    -- User updating their own registration
    user_id = auth.uid()
    -- OR event owner
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_participants.event_id
        AND events.created_by_user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Same conditions for the updated data
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_participants.event_id
        AND events.created_by_user_id = auth.uid()
    )
  );

-- ============================================================================
-- DELETE Policy (Unregister from Event)
-- ============================================================================

-- Policy: Users can delete their own registrations
-- Event owners can delete any participant
CREATE POLICY "participants_delete_own_or_owner"
  ON public.event_participants
  FOR DELETE
  USING (
    -- User deleting their own registration
    user_id = auth.uid()
    -- OR event owner
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_participants.event_id
        AND events.created_by_user_id = auth.uid()
    )
  );

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'event_participants') THEN
    RAISE EXCEPTION 'RLS is not enabled on event_participants table';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on event_participants table';
  RAISE NOTICE 'Created 6 policies: 3 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE';
END $$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.event_participants IS 'Event participants with Row Level Security enabled. Personal data protected by RLS policies.';
