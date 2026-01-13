-- ============================================================================
-- MIGRATION: CLUBS DOMAIN - INVITE IDEMPOTENCY FUNCTION
-- TIMESTAMP: 2026-01-13
--
-- SSOT REFERENCES:
-- - docs/ssot/SSOT_CLUBS_DOMAIN.md §6.1
--
-- Adds a stored procedure to handle the creation of club invites idempotently.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_club_invite(
    p_club_id uuid,
    p_invited_by_user_id uuid,
    p_invitee_user_id uuid
)
RETURNS TABLE (
    id uuid,
    club_id uuid,
    invited_by_user_id uuid,
    invitee_user_id uuid,
    invitee_contact text,
    token text,
    status public.club_invite_status,
    expires_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
) AS $$
DECLARE
    existing_invite public.club_invites;
BEGIN
    -- Check for an existing pending invite for the same club and user
    SELECT * INTO existing_invite
    FROM public.club_invites ci
    WHERE ci.club_id = p_club_id
      AND ci.invitee_user_id = p_invitee_user_id
      AND ci.status = 'pending';

    IF FOUND THEN
        -- If an invite exists, refresh its expiration and return it
        UPDATE public.club_invites
        SET expires_at = now() + interval '7 days',
            updated_at = now()
        WHERE id = existing_invite.id
        RETURNING * INTO existing_invite;
        
        RETURN QUERY SELECT * FROM public.club_invites WHERE id = existing_invite.id;

    ELSE
        -- If no pending invite exists, create a new one
        RETURN QUERY
        INSERT INTO public.club_invites (club_id, invited_by_user_id, invitee_user_id)
        VALUES (p_club_id, p_invited_by_user_id, p_invitee_user_id)
        RETURNING *;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;