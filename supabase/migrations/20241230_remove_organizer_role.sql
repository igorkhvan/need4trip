-- ============================================================================
-- Migration: Remove 'organizer' role from club_members (SSOT Compliance)
-- Date: 2024-12-30
-- Purpose: SSOT_CLUBS_EVENTS_ACCESS.md §2 mandates ONLY: owner, admin, member
--          'organizer' is deprecated and must not exist
-- ============================================================================

-- STEP 1: Update existing 'organizer' memberships to 'admin'
-- Rationale: 'organizer' had elevated permissions similar to admin
UPDATE public.club_members
SET role = 'admin'
WHERE role = 'organizer';

-- STEP 2: Drop existing role constraint (if exists)
ALTER TABLE public.club_members
DROP CONSTRAINT IF EXISTS club_members_role_check;

-- STEP 3: Add new role constraint with ONLY allowed values: owner, admin, member, pending
ALTER TABLE public.club_members
ADD CONSTRAINT club_members_role_check
CHECK (role IN ('owner', 'admin', 'member', 'pending'));

-- STEP 4: Update comment to reflect new roles
COMMENT ON COLUMN public.club_members.role IS 
'Роль в клубе: owner (владелец), admin (администратор), member (участник), pending (ожидает подтверждения). SSOT: docs/SSOT_CLUBS_EVENTS_ACCESS.md §2';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  organizer_count INTEGER;
BEGIN
  -- Check that no 'organizer' roles remain
  SELECT COUNT(*) INTO organizer_count
  FROM public.club_members
  WHERE role = 'organizer';
  
  IF organizer_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % organizer roles still exist', organizer_count;
  END IF;
  
  RAISE NOTICE 'Migration successful: organizer role removed';
  RAISE NOTICE 'Allowed roles: owner, admin, member, pending';
END $$;

