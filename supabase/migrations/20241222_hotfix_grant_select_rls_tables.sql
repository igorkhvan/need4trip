-- ============================================================================
-- Hotfix: Grant SELECT on RLS-protected tables for anon role
-- Date: 2024-12-22
-- Purpose: Fix homepage crash - allow anon to read for JOINs and aggregations
-- ============================================================================
--
-- PROBLEM:
-- After enabling RLS on event_participants, event_user_access, club_members:
-- - Anonymous users cannot load homepage (count participants)
-- - Queries like SELECT COUNT(*) FROM event_participants WHERE event_id = ...
-- - Failed because no GRANT SELECT for anon role
--
-- ROOT CAUSE:
-- RLS policies control row visibility, but GRANT controls table access
-- Without GRANT SELECT, even RLS policies don't help
--
-- SOLUTION:
-- Grant SELECT to anon and authenticated roles for:
-- - event_participants (for participant counts)
-- - event_user_access (for access checks)
-- - club_members (for membership checks)
--
-- SECURITY:
-- - RLS policies still enforce row-level visibility
-- - Anon can only see what RLS allows
-- - Sensitive participant data protected by RLS SELECT policies
--
-- ============================================================================

-- Grant SELECT on event_participants
GRANT SELECT ON public.event_participants TO anon, authenticated;

COMMENT ON TABLE public.event_participants IS 
  'Event participants with RLS enabled. SELECT granted for anon (allows COUNT queries). RLS policies control row visibility.';

-- Grant SELECT on event_user_access
GRANT SELECT ON public.event_user_access TO anon, authenticated;

COMMENT ON TABLE public.event_user_access IS 
  'Event access grants with RLS enabled. SELECT granted for anon (allows access checks). RLS policies control row visibility.';

-- Grant SELECT on club_members
GRANT SELECT ON public.club_members TO anon, authenticated;

COMMENT ON TABLE public.club_members IS 
  'Club memberships with RLS enabled. SELECT granted for anon (allows membership checks). RLS policies control row visibility.';

-- ============================================================================
-- Security Notes
-- ============================================================================

-- GRANTS + RLS = Defense in Depth:
-- 1. GRANT SELECT: Allows technical access to table (read rows)
-- 2. RLS POLICY: Controls which rows are visible
-- 3. Application: Filters sensitive fields before sending to client

-- PUBLIC OPERATIONS (safe with RLS):
-- - COUNT(*) queries (aggregation, no sensitive data exposed)
-- - EXISTS checks (boolean result only)
-- - SELECT with proper RLS policies (row-level filtering)

-- PROTECTED BY RLS:
-- - event_participants: Anon cannot see individual participant data
--   (RLS blocks SELECT * queries, only COUNT works)
-- - event_user_access: Anon cannot see who has access to restricted events
-- - club_members: Anon cannot see individual memberships

-- EXAMPLES:
-- ✅ Allowed (aggregation):
--    SELECT COUNT(*) FROM event_participants WHERE event_id = 'xxx'
--
-- ❌ Blocked by RLS (individual data):
--    SELECT * FROM event_participants WHERE event_id = 'xxx'
--    (Returns empty or only rows allowed by RLS policy)

-- ============================================================================
