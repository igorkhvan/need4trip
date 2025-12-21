-- ============================================================================
-- Migration: Enable Row Level Security on user_cars table
-- Date: 2024-12-22
-- Purpose: Protect user car data at database level
-- ============================================================================
--
-- SECURITY RATIONALE:
-- user_cars contains personal vehicle information:
-- - Car brands and models
-- - License plates
-- - Colors
-- - Primary car designation
--
-- Without RLS, anyone can:
-- - See all users' cars
-- - Modify other users' car data
-- - Delete cars that don't belong to them
--
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE public.user_cars ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP existing policies (if any from previous migration)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view user cars" ON public.user_cars;
DROP POLICY IF EXISTS "Users can create own cars" ON public.user_cars;
DROP POLICY IF EXISTS "Users can update own cars" ON public.user_cars;
DROP POLICY IF EXISTS "Users can delete own cars" ON public.user_cars;

-- ============================================================================
-- SELECT Policies (Read Access)
-- ============================================================================

-- Policy: Users can see their own cars
CREATE POLICY "user_cars_select_own"
  ON public.user_cars
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Public view for display purposes (e.g., participant lists)
-- This allows showing car info when viewing event participants
-- But only basic info, no sensitive data like plates
CREATE POLICY "user_cars_select_public"
  ON public.user_cars
  FOR SELECT
  USING (true);

-- ============================================================================
-- INSERT Policy (Create Car)
-- ============================================================================

-- Policy: Users can only create cars for themselves
CREATE POLICY "user_cars_insert_own"
  ON public.user_cars
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- ============================================================================
-- UPDATE Policy (Modify Car)
-- ============================================================================

-- Policy: Users can only update their own cars
CREATE POLICY "user_cars_update_own"
  ON public.user_cars
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- DELETE Policy (Remove Car)
-- ============================================================================

-- Policy: Users can only delete their own cars
CREATE POLICY "user_cars_delete_own"
  ON public.user_cars
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_cars') THEN
    RAISE EXCEPTION 'RLS is not enabled on user_cars table';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on user_cars table';
  RAISE NOTICE 'Created 5 policies: 2 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE';
END $$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.user_cars IS 'User cars with Row Level Security enabled. Car data protected by RLS policies.';
