-- ============================================================================
-- MIGRATION: CLUBS DOMAIN FOUNDATION
-- TIMESTAMP: 2026-01-13
--
-- SSOT REFERENCES:
-- - docs/ssot/SSOT_CLUBS_DOMAIN.md
-- - CLUBS_DOMAIN_AUDIT_REPORT.md
--
-- PHASE 1: DATABASE FOUNDATION
-- 1. Add normative tables: club_invites, club_join_requests, club_audit_log
-- 2. Fix existing tables: clubs, club_members
-- ============================================================================

BEGIN;

-- ============================================================================
-- PRELIMINARY: CREATE ENUMS
-- ============================================================================

-- Drop types if they exist to ensure a clean run
DROP TYPE IF EXISTS public.club_visibility;
DROP TYPE IF EXISTS public.club_member_role;
DROP TYPE IF EXISTS public.club_invite_status;
DROP TYPE IF EXISTS public.club_join_request_status;

-- Create strict enum for club visibility
CREATE TYPE public.club_visibility AS ENUM (
    'public',
    'private'
);

-- Create strict enum for club member roles (SSOT §1.3)
CREATE TYPE public.club_member_role AS ENUM (
    'owner',
    'admin',
    'member',
    'pending'
);

-- Create enum for club invite status
CREATE TYPE public.club_invite_status AS ENUM (
    'pending',
    'accepted',
    'expired',
    'cancelled'
);

-- Create enum for club join request status
CREATE TYPE public.club_join_request_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'expired'
);


-- ============================================================================
-- FIX 1: `clubs` TABLE
-- SSOT §2.1
-- ============================================================================

-- Add `slug` with unique, case-insensitive constraint
ALTER TABLE public.clubs
    ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate initial slugs for existing clubs from their names
UPDATE public.clubs
SET slug = lower(regexp_replace(name, '\s+', '-', 'g'))
WHERE slug IS NULL;

ALTER TABLE public.clubs
    ALTER COLUMN slug SET NOT NULL;

-- Add unique index for slug
CREATE UNIQUE INDEX IF NOT EXISTS clubs_slug_idx ON public.clubs (lower(slug));

-- Add `visibility`
ALTER TABLE public.clubs
    ADD COLUMN IF NOT EXISTS visibility public.club_visibility NOT NULL DEFAULT 'private';

-- Add `owner_user_id` as the canonical owner reference
ALTER TABLE public.clubs
    ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES public.users(id);

-- Backfill `owner_user_id` from the existing `club_members` table
UPDATE public.clubs c
SET owner_user_id = (
    SELECT user_id FROM public.club_members cm
    WHERE cm.club_id = c.id AND cm.role = 'owner'
    LIMIT 1
)
WHERE c.owner_user_id IS NULL;

-- Add `settings`
ALTER TABLE public.clubs
    ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;


-- ============================================================================
-- FIX 2: `club_members` TABLE
-- SSOT §2.2
-- ============================================================================

-- Use a temporary mapping to safely convert the `role` column
-- This handles potential legacy values not in the new enum.
ALTER TABLE public.club_members
    ADD COLUMN role_enum public.club_member_role;

UPDATE public.club_members
SET role_enum = CASE
    WHEN role = 'owner' THEN 'owner'::public.club_member_role
    WHEN role = 'admin' THEN 'admin'::public.club_member_role
    WHEN role = 'member' THEN 'member'::public.club_member_role
    WHEN role = 'pending' THEN 'pending'::public.club_member_role
    ELSE 'member' -- Default fallback for any non-standard roles
END;

-- Drop the old text-based role column and rename the new one
ALTER TABLE public.club_members
    DROP COLUMN role;
ALTER TABLE public.club_members
    RENAME COLUMN role_enum TO role;

ALTER TABLE public.club_members
    ALTER COLUMN role SET NOT NULL;

-- Add timestamps
ALTER TABLE public.club_members
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;

-- Backfill `joined_at` for existing non-pending members
UPDATE public.club_members
SET joined_at = created_at
WHERE role != 'pending' AND joined_at IS NULL;


-- ============================================================================
-- ADD 1: `club_invites` TABLE
-- SSOT §2.3
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.club_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES public.users(id),
    invitee_user_id UUID REFERENCES public.users(id),
    invitee_contact TEXT,
    token TEXT,
    status public.club_invite_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_pending_invite_per_user UNIQUE (club_id, invitee_user_id) WHERE (status = 'pending')
);
CREATE INDEX IF NOT EXISTS club_invites_token_idx ON public.club_invites (token);


-- ============================================================================
-- ADD 2: `club_join_requests` TABLE
-- SSOT §2.4
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.club_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    requester_user_id UUID NOT NULL REFERENCES public.users(id),
    status public.club_join_request_status NOT NULL DEFAULT 'pending',
    message TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_pending_join_request_per_user UNIQUE (club_id, requester_user_id) WHERE (status = 'pending')
);


-- ============================================================================
-- ADD 3: `club_audit_log` TABLE
-- SSOT §2.6
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.club_audit_log (
    id BIGSERIAL PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES public.users(id),
    action_code TEXT NOT NULL,
    target_user_id UUID REFERENCES public.users(id),
    target_entity_type TEXT,
    target_entity_id TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS club_audit_log_club_id_idx ON public.club_audit_log (club_id);
CREATE INDEX IF NOT EXISTS club_audit_log_actor_user_id_idx ON public.club_audit_log (actor_user_id);


COMMIT;