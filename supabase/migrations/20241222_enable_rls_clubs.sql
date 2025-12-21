-- ============================================================================
-- Migration: Enable Row Level Security on clubs table
-- Date: 2024-12-22
-- Purpose: Defense in depth - protect clubs at database level
-- ============================================================================
--
-- SECURITY RATIONALE:
-- - Clubs are publicly visible (for discovery)
-- - But only admins/owners can modify club data
-- - RLS prevents unauthorized modifications even if API is bypassed
--
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT Policy (Read Access)
-- ============================================================================

-- Policy: All clubs are visible to everyone
-- Clubs are meant to be discoverable for users looking to join
CREATE POLICY "clubs_select_all"
  ON public.clubs
  FOR SELECT
  USING (true);

-- ============================================================================
-- INSERT Policy (Create Clubs)
-- ============================================================================

-- Policy: Authenticated users can create clubs
CREATE POLICY "clubs_insert_authenticated"
  ON public.clubs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

-- ============================================================================
-- UPDATE Policy (Modify Clubs)
-- ============================================================================

-- Policy: Only club admins and owners can modify clubs
-- Admins and owners are identified via club_members table
CREATE POLICY "clubs_update_admins"
  ON public.clubs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = clubs.id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = clubs.id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- DELETE Policy (Remove Clubs)
-- ============================================================================

-- Policy: Only club owners can delete clubs
-- This is more restrictive than UPDATE (which allows admins)
CREATE POLICY "clubs_delete_owner_only"
  ON public.clubs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = clubs.id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'clubs') THEN
    RAISE EXCEPTION 'RLS is not enabled on clubs table';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on clubs table';
  RAISE NOTICE 'Created 4 policies: 1 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE';
END $$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.clubs IS 'Clubs table with Row Level Security enabled. All clubs are publicly visible, but only admins/owners can modify.';
