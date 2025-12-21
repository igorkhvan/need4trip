-- ============================================================================
-- Hotfix: Allow anonymous users to see public user fields in JOINs
-- Date: 2024-12-22
-- Purpose: Fix homepage crash due to blocked JOINs with users table
-- ============================================================================
--
-- PROBLEM:
-- After enabling RLS on users table, anonymous requests like:
--   SELECT events.*, users.name FROM events JOIN users ON ...
-- Failed because RLS blocked the JOIN for anonymous users
--
-- ROOT CAUSE:
-- Policy "users_select_public_minimal" uses USING (true) but Supabase
-- still blocks rows for anonymous users when no auth context exists
--
-- SOLUTION:
-- Explicitly grant SELECT on users table to anon role (read-only)
-- This allows JOINs to work, while RLS still protects sensitive operations
--
-- IMPORTANT:
-- - Application layer MUST filter sensitive fields (phone, email, telegram_id)
-- - View user_public_profiles exists for explicit safe queries
-- - This fix allows legacy JOIN queries to work
--
-- ============================================================================

-- Grant SELECT to anon role (allows JOINs from anonymous requests)
GRANT SELECT ON public.users TO anon;

-- Grant SELECT to authenticated role (already has it, but explicit)
GRANT SELECT ON public.users TO authenticated;

-- ============================================================================
-- Verification Comment
-- ============================================================================

COMMENT ON TABLE public.users IS 
  'User profiles with RLS enabled. SELECT granted to anon for JOINs. Application MUST filter sensitive fields (phone, email, telegram_id) before returning to client.';

-- ============================================================================
-- Security Notes
-- ============================================================================

-- GRANTS vs RLS:
-- - GRANT SELECT: Allows reading rows (necessary for JOINs)
-- - RLS POLICY: Controls which rows are visible
-- - Both work together: GRANT + POLICY = access

-- PROTECTED BY APPLICATION:
-- Backend services MUST filter these fields before sending to client:
-- - phone (only owner sees)
-- - email (only owner sees)
-- - telegram_id (only owner sees, public sees telegram_handle)

-- PUBLIC FIELDS (safe in JOINs):
-- - id (UUID, not sensitive)
-- - name (public display name)
-- - avatar_url (public profile picture)
-- - telegram_handle (public @username, NOT telegram_id)
-- - experience_level (public badge)
-- - created_at (account age)

-- REMINDER: Use user_public_profiles view for explicit safe queries
-- Example: SELECT * FROM user_public_profiles WHERE id = ...

-- ============================================================================
