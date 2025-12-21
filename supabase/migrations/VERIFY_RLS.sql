-- ============================================================================
-- RLS Verification Script
-- Date: 2024-12-22
-- Purpose: Verify that Row Level Security is correctly enabled and configured
-- ============================================================================

-- ============================================================================
-- Step 1: Verify RLS is enabled on tables
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END AS status
FROM pg_tables 
WHERE tablename IN ('events', 'clubs')
ORDER BY tablename;

-- Expected output:
-- events | true  | ✅ ENABLED
-- clubs  | true  | ✅ ENABLED

-- ============================================================================
-- Step 2: List all RLS policies for events table
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL AS has_using,
  with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE tablename = 'events'
ORDER BY policyname;

-- Expected: 7 policies
-- - events_select_public
-- - events_select_unlisted  
-- - events_select_restricted_with_access
-- - events_select_own
-- - events_insert_authenticated
-- - events_update_own
-- - events_delete_own

-- ============================================================================
-- Step 3: List all RLS policies for clubs table
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL AS has_using,
  with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE tablename = 'clubs'
ORDER BY policyname;

-- Expected: 4 policies
-- - clubs_select_all
-- - clubs_insert_authenticated
-- - clubs_update_admins
-- - clubs_delete_owner_only

-- ============================================================================
-- Step 4: Count policies
-- ============================================================================

SELECT 
  tablename,
  COUNT(*) AS policy_count,
  CASE 
    WHEN tablename = 'events' AND COUNT(*) = 7 THEN '✅ CORRECT (7 policies)'
    WHEN tablename = 'clubs' AND COUNT(*) = 4 THEN '✅ CORRECT (4 policies)'
    ELSE '❌ INCORRECT'
  END AS validation
FROM pg_policies
WHERE tablename IN ('events', 'clubs')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- Step 5: Verify policy permissions by command type
-- ============================================================================

SELECT 
  tablename,
  cmd AS command,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE tablename IN ('events', 'clubs')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- Expected for events:
-- SELECT: 4 policies
-- INSERT: 1 policy
-- UPDATE: 1 policy
-- DELETE: 1 policy

-- Expected for clubs:
-- SELECT: 1 policy
-- INSERT: 1 policy
-- UPDATE: 1 policy
-- DELETE: 1 policy

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
  events_rls_enabled BOOLEAN;
  clubs_rls_enabled BOOLEAN;
  events_policy_count INTEGER;
  clubs_policy_count INTEGER;
BEGIN
  -- Check RLS status
  SELECT relrowsecurity INTO events_rls_enabled 
  FROM pg_class WHERE relname = 'events';
  
  SELECT relrowsecurity INTO clubs_rls_enabled 
  FROM pg_class WHERE relname = 'clubs';
  
  -- Count policies
  SELECT COUNT(*) INTO events_policy_count 
  FROM pg_policies WHERE tablename = 'events';
  
  SELECT COUNT(*) INTO clubs_policy_count 
  FROM pg_policies WHERE tablename = 'clubs';
  
  -- Validation
  IF events_rls_enabled AND clubs_rls_enabled 
     AND events_policy_count = 7 
     AND clubs_policy_count = 4 THEN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ RLS VERIFICATION SUCCESSFUL';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '  Events table:';
    RAISE NOTICE '    - RLS enabled: ✅';
    RAISE NOTICE '    - Policies: 7/7 ✅';
    RAISE NOTICE '';
    RAISE NOTICE '  Clubs table:';
    RAISE NOTICE '    - RLS enabled: ✅';
    RAISE NOTICE '    - Policies: 4/4 ✅';
    RAISE NOTICE '';
    RAISE NOTICE '  Security Status: 🔒 PROTECTED';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
  ELSE
    RAISE WARNING 'RLS verification failed! Check configuration.';
    RAISE WARNING 'Events RLS: %, Policies: %', events_rls_enabled, events_policy_count;
    RAISE WARNING 'Clubs RLS: %, Policies: %', clubs_rls_enabled, clubs_policy_count;
  END IF;
END $$;
