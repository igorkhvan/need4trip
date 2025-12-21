-- ============================================================================
-- Migration: Enable Row Level Security on event_user_access table
-- Date: 2024-12-22
-- Purpose: Protect event access grants at database level
-- ============================================================================
--
-- SECURITY RATIONALE:
-- event_user_access tracks who has access to restricted events:
-- - Which users can view which restricted events
-- - How access was granted (link, invitation, etc.)
-- - Access history
--
-- Without RLS, anyone can:
-- - See who has access to private events
-- - Grant themselves access to any event
-- - Revoke access from legitimate users
--
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.event_user_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT Policies (Read Access)
-- ============================================================================

-- Policy 1: Event owner can see all access grants for their events
CREATE POLICY "event_access_select_event_owner"
  ON public.event_user_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_user_access.event_id
        AND events.created_by_user_id = auth.uid()
    )
  );

-- Policy 2: Users can see their own access grants
CREATE POLICY "event_access_select_own"
  ON public.event_user_access
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- INSERT Policy (Grant Access)
-- ============================================================================

-- Policy: Only event owners can manually grant access
-- Auto-grants (source='link') are handled via application logic
-- which uses service role or special handling
CREATE POLICY "event_access_insert_owner"
  ON public.event_user_access
  FOR INSERT
  WITH CHECK (
    -- Event owner can grant access
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_user_access.event_id
        AND events.created_by_user_id = auth.uid()
    )
    -- OR auto-grant via link (validated in application layer)
    -- This allows authenticated users to auto-grant themselves access
    -- to restricted events when they visit via direct link
    OR (
      source = 'link'
      AND user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = event_user_access.event_id
          AND events.visibility = 'restricted'
      )
    )
  );

-- ============================================================================
-- UPDATE Policy (Modify Access)
-- ============================================================================

-- Policy: Only event owners can modify access grants
CREATE POLICY "event_access_update_owner"
  ON public.event_user_access
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_user_access.event_id
        AND events.created_by_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_user_access.event_id
        AND events.created_by_user_id = auth.uid()
    )
  );

-- ============================================================================
-- DELETE Policy (Revoke Access)
-- ============================================================================

-- Policy: Event owners can revoke access
-- Users can revoke their own access (leave event access list)
CREATE POLICY "event_access_delete_owner_or_self"
  ON public.event_user_access
  FOR DELETE
  USING (
    -- Event owner can revoke any access
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_user_access.event_id
        AND events.created_by_user_id = auth.uid()
    )
    -- OR user can revoke their own access
    OR user_id = auth.uid()
  );

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'event_user_access') THEN
    RAISE EXCEPTION 'RLS is not enabled on event_user_access table';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on event_user_access table';
  RAISE NOTICE 'Created 5 policies: 2 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE';
END $$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.event_user_access IS 'Event access grants with Row Level Security enabled. Controls who can view restricted events.';
