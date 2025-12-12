-- ============================================================================
-- Migration: Create club_members table
-- Date: 2024-12-12
-- Purpose: Club membership with roles (owner, organizer, member, pending)
-- ============================================================================

-- Create club_members table
CREATE TABLE IF NOT EXISTS public.club_members (
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'organizer', 'member', 'pending')),
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON public.club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_role ON public.club_members(club_id, role);
CREATE INDEX IF NOT EXISTS idx_club_members_pending ON public.club_members(club_id) WHERE role = 'pending';

-- Constraint: Each club must have exactly one owner
-- This will be enforced at application level, but we add a partial unique index for safety
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_members_single_owner 
  ON public.club_members(club_id) 
  WHERE role = 'owner';

-- Comments for documentation
COMMENT ON TABLE public.club_members IS 'Участники клубов с ролями и правами доступа';
COMMENT ON COLUMN public.club_members.role IS 'Роль в клубе: owner (владелец), organizer (организатор), member (участник), pending (ожидает подтверждения)';
COMMENT ON COLUMN public.club_members.invited_by IS 'User ID пригласившего участника (для pending членов)';
COMMENT ON COLUMN public.club_members.joined_at IS 'Дата вступления в клуб';

-- Constraint comment
COMMENT ON INDEX public.idx_club_members_single_owner IS 'Гарантирует что у клуба только один owner';

