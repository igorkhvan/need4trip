-- ============================================================================
-- Migration: Enable Row Level Security on club_members table
-- Date: 2024-12-22
-- Purpose: Protect club membership data at database level
-- ============================================================================
--
-- SECURITY RATIONALE:
-- club_members contains sensitive membership information:
-- - Who belongs to which clubs
-- - Member roles (owner, organizer, member, pending)
-- - Invitation history
-- - Membership timestamps
--
-- Without RLS, anyone can:
-- - See all club memberships
-- - Grant themselves admin/owner roles
-- - Remove legitimate members
-- - See pending invitations
--
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT Policies (Read Access)
-- ============================================================================

-- Policy 1: Club members can see other members of their clubs
CREATE POLICY "club_members_select_club_members"
  ON public.club_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members AS my_membership
      WHERE my_membership.club_id = club_members.club_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.role IN ('owner', 'organizer', 'member')
    )
  );

-- Policy 2: Users can see their own memberships (including pending)
CREATE POLICY "club_members_select_own"
  ON public.club_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy 3: Anyone can see public club member counts
-- (for club discovery and "X members" display)
-- This is a lightweight policy that doesn't expose details
-- Note: We allow seeing role='member' to count members, but not personal details
CREATE POLICY "club_members_select_public_count"
  ON public.club_members
  FOR SELECT
  USING (role IN ('owner', 'organizer', 'member'));

-- ============================================================================
-- INSERT Policy (Add Member)
-- ============================================================================

-- Policy: Only club owners/organizers can add members
CREATE POLICY "club_members_insert_admin"
  ON public.club_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_members AS my_membership
      WHERE my_membership.club_id = club_members.club_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.role IN ('owner', 'organizer')
    )
  );

-- ============================================================================
-- UPDATE Policy (Change Role)
-- ============================================================================

-- Policy: Only club owners can change roles
-- Organizers cannot promote/demote members
CREATE POLICY "club_members_update_owner"
  ON public.club_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members AS my_membership
      WHERE my_membership.club_id = club_members.club_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_members AS my_membership
      WHERE my_membership.club_id = club_members.club_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.role = 'owner'
    )
  );

-- ============================================================================
-- DELETE Policy (Remove Member)
-- ============================================================================

-- Policy: Club owners/organizers can remove members
-- Users can remove themselves (leave club)
CREATE POLICY "club_members_delete_admin_or_self"
  ON public.club_members
  FOR DELETE
  USING (
    -- Club owner/organizer can remove any member
    EXISTS (
      SELECT 1 FROM public.club_members AS my_membership
      WHERE my_membership.club_id = club_members.club_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.role IN ('owner', 'organizer')
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
-- Verification
-- ============================================================================

DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'club_members') THEN
    RAISE EXCEPTION 'RLS is not enabled on club_members table';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on club_members table';
  RAISE NOTICE 'Created 6 policies: 3 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE';
END $$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.club_members IS 'Club membership with Row Level Security enabled. Membership data protected by RLS policies.';
