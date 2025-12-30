-- ============================================================================
-- Migration: Fix RLS policies (owner-only member management, SSOT Compliance)
-- Date: 2024-12-30
-- Purpose: SSOT_CLUBS_EVENTS_ACCESS.md §6.2: Only OWNER may manage members
--          Admin MUST NOT manage members (invite/remove/role changes)
-- ============================================================================

-- ============================================================================
-- DROP OLD POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "club_members_insert_admin" ON public.club_members;
DROP POLICY IF EXISTS "club_members_delete_admin_or_self" ON public.club_members;
DROP POLICY IF EXISTS "club_members_select_club_members" ON public.club_members;
DROP POLICY IF EXISTS "club_members_select_public_count" ON public.club_members;

-- ============================================================================
-- SELECT Policies (Read Access) - Updated to exclude 'organizer'
-- ============================================================================

-- Policy 1: Club members can see other members of their clubs
-- (owner/admin/member can see other members)
CREATE POLICY "club_members_select_club_members"
  ON public.club_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members AS my_membership
      WHERE my_membership.club_id = club_members.club_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.role IN ('owner', 'admin', 'member')
    )
  );

-- Policy 2: Anyone can see public club member counts
-- (for club discovery and "X members" display)
CREATE POLICY "club_members_select_public_count"
  ON public.club_members
  FOR SELECT
  USING (role IN ('owner', 'admin', 'member'));

-- ============================================================================
-- INSERT Policy (Add Member) - OWNER ONLY
-- ============================================================================

-- Policy: ONLY club owners can add members
-- SSOT §6.2: Admin may NOT manage members
CREATE POLICY "club_members_insert_owner_only"
  ON public.club_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_members AS my_membership
      WHERE my_membership.club_id = club_members.club_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.role = 'owner'
    )
  );

-- ============================================================================
-- DELETE Policy (Remove Member) - OWNER ONLY + SELF
-- ============================================================================

-- Policy: Club owner can remove any member, users can leave (except sole owner)
-- SSOT §6.2: Admin may NOT remove members
CREATE POLICY "club_members_delete_owner_or_self"
  ON public.club_members
  FOR DELETE
  USING (
    -- Club owner can remove any member
    EXISTS (
      SELECT 1 FROM public.club_members AS my_membership
      WHERE my_membership.club_id = club_members.club_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.role = 'owner'
    )
    -- OR user can remove themselves (leave club)
    -- BUT owner cannot leave if they're the only owner
    OR (
      user_id = auth.uid()
      AND (
        role != 'owner'
        OR EXISTS (
          SELECT 1 FROM public.club_members AS other_owners
          WHERE other_owners.club_id = club_members.club_id
            AND other_owners.role = 'owner'
            AND other_owners.user_id != auth.uid()
        )
      )
    )
  );

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON POLICY "club_members_insert_owner_only" ON public.club_members IS 
'SSOT §6.2: Only OWNER may invite members. Admin may NOT manage members.';

COMMENT ON POLICY "club_members_delete_owner_or_self" ON public.club_members IS 
'SSOT §6.2: Only OWNER may remove members. Members can leave (except sole owner).';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated for SSOT compliance';
  RAISE NOTICE 'Member management: OWNER ONLY (admin cannot manage members)';
END $$;

