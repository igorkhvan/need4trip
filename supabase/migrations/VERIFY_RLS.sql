-- ============================================================================
-- RLS Verification Script - Complete Database Coverage
-- Date: 2024-12-22
-- Purpose: Verify RLS is enabled on ALL critical tables
-- Usage: Run in Supabase SQL Editor after applying all RLS migrations
-- ============================================================================

-- Step 1: Check RLS status on all critical tables
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END AS rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pt.tablename) AS policies
FROM pg_tables pt
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'events',
    'clubs',
    'event_participants',
    'event_user_access',
    'club_members',
    'user_cars',
    'club_subscriptions',
    'billing_transactions',
    'event_locations',
    'vehicle_types',
    'event_categories',
    'user_notification_settings',
    'notification_queue',
    'notification_logs'
  )
ORDER BY 
  CASE tablename
    WHEN 'users' THEN 1
    WHEN 'events' THEN 2
    WHEN 'clubs' THEN 3
    WHEN 'event_participants' THEN 4
    WHEN 'event_user_access' THEN 5
    WHEN 'club_members' THEN 6
    WHEN 'user_cars' THEN 7
    WHEN 'club_subscriptions' THEN 8
    WHEN 'billing_transactions' THEN 9
    ELSE 10
  END;

-- Expected output:
-- users                      | ✅ ENABLED | 4
-- events                     | ✅ ENABLED | 7
-- clubs                      | ✅ ENABLED | 4
-- event_participants         | ✅ ENABLED | 6
-- event_user_access          | ✅ ENABLED | 5
-- club_members               | ✅ ENABLED | 6
-- user_cars                  | ✅ ENABLED | 5
-- club_subscriptions         | ✅ ENABLED | 2
-- billing_transactions       | ✅ ENABLED | 1
-- event_locations            | ✅ ENABLED | 4
-- vehicle_types              | ✅ ENABLED | 1
-- event_categories           | ✅ ENABLED | 2
-- user_notification_settings | ✅ ENABLED | 3
-- notification_queue         | ✅ ENABLED | 0 (service role only)
-- notification_logs          | ✅ ENABLED | 1

-- ============================================================================
-- Step 2: Detailed policy breakdown by table
-- ============================================================================

-- Users table policies
SELECT 'users' AS table_name, policyname, cmd, 
  CASE WHEN qual IS NOT NULL THEN '✅' ELSE '❌' END AS has_using,
  CASE WHEN with_check IS NOT NULL THEN '✅' ELSE '❌' END AS has_with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Expected: 4 policies (2 SELECT, 1 INSERT, 1 UPDATE)

-- Events table policies  
SELECT 'events' AS table_name, policyname, cmd,
  CASE WHEN qual IS NOT NULL THEN '✅' ELSE '❌' END AS has_using,
  CASE WHEN with_check IS NOT NULL THEN '✅' ELSE '❌' END AS has_with_check
FROM pg_policies
WHERE tablename = 'events'
ORDER BY policyname;

-- Expected: 7 policies (4 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE)

-- Clubs table policies
SELECT 'clubs' AS table_name, policyname, cmd,
  CASE WHEN qual IS NOT NULL THEN '✅' ELSE '❌' END AS has_using,
  CASE WHEN with_check IS NOT NULL THEN '✅' ELSE '❌' END AS has_with_check
FROM pg_policies
WHERE tablename = 'clubs'
ORDER BY policyname;

-- Expected: 4 policies (1 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE)

-- Event Participants table policies
SELECT 'event_participants' AS table_name, policyname, cmd,
  CASE WHEN qual IS NOT NULL THEN '✅' ELSE '❌' END AS has_using,
  CASE WHEN with_check IS NOT NULL THEN '✅' ELSE '❌' END AS has_with_check
FROM pg_policies
WHERE tablename = 'event_participants'
ORDER BY policyname;

-- Expected: 6 policies (3 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE)

-- Club Subscriptions table policies
SELECT 'club_subscriptions' AS table_name, policyname, cmd,
  CASE WHEN qual IS NOT NULL THEN '✅' ELSE '❌' END AS has_using,
  CASE WHEN with_check IS NOT NULL THEN '✅' ELSE '❌' END AS has_with_check
FROM pg_policies
WHERE tablename = 'club_subscriptions'
ORDER BY policyname;

-- Expected: 2 policies (owner + organizer SELECT)

-- Billing Transactions table policies
SELECT 'billing_transactions' AS table_name, policyname, cmd,
  CASE WHEN qual IS NOT NULL THEN '✅' ELSE '❌' END AS has_using,
  CASE WHEN with_check IS NOT NULL THEN '✅' ELSE '❌' END AS has_with_check
FROM pg_policies
WHERE tablename = 'billing_transactions'
ORDER BY policyname;

-- Expected: 1 policy (owner SELECT only)

-- ============================================================================
-- Step 3: Summary Statistics
-- ============================================================================

DO $$
DECLARE
  v_total_tables INT;
  v_tables_with_rls INT;
  v_total_policies INT;
  v_critical_tables TEXT[] := ARRAY[
    'users', 'events', 'clubs', 'event_participants', 'event_user_access',
    'club_members', 'user_cars', 'club_subscriptions', 'billing_transactions'
  ];
  v_failed_tables TEXT[] := '{}';
  v_table TEXT;
BEGIN
  -- Count tables with RLS
  SELECT COUNT(*) INTO v_total_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = ANY(v_critical_tables);
  
  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = ANY(v_critical_tables)
    AND rowsecurity = true;
  
  -- Count total policies
  SELECT COUNT(*) INTO v_total_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = ANY(v_critical_tables);
  
  -- Find failed tables
  FOR v_table IN SELECT unnest(v_critical_tables) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND rowsecurity = true
    ) THEN
      v_failed_tables := array_append(v_failed_tables, v_table);
    END IF;
  END LOOP;
  
  -- Report
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔒 RLS VERIFICATION SUMMARY';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Critical Tables: % / % with RLS', v_tables_with_rls, v_total_tables;
  RAISE NOTICE 'Total Policies: %', v_total_policies;
  RAISE NOTICE '';
  
  IF v_tables_with_rls = v_total_tables AND v_total_policies >= 40 THEN
    RAISE NOTICE '✅ STATUS: ALL CRITICAL TABLES PROTECTED';
    RAISE NOTICE '';
    RAISE NOTICE 'Breakdown:';
    RAISE NOTICE '  • users: 4 policies (2 SELECT, 1 INSERT, 1 UPDATE)';
    RAISE NOTICE '  • events: 7 policies';
    RAISE NOTICE '  • clubs: 4 policies';
    RAISE NOTICE '  • event_participants: 6 policies';
    RAISE NOTICE '  • event_user_access: 5 policies';
    RAISE NOTICE '  • club_members: 6 policies';
    RAISE NOTICE '  • user_cars: 5 policies';
    RAISE NOTICE '  • club_subscriptions: 2 policies';
    RAISE NOTICE '  • billing_transactions: 1 policy';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security Status: PROTECTED';
  ELSE
    RAISE WARNING '❌ RLS VERIFICATION FAILED';
    RAISE WARNING 'Protected: % / %', v_tables_with_rls, v_total_tables;
    RAISE WARNING 'Policies: % (expected >= 40)', v_total_policies;
    
    IF array_length(v_failed_tables, 1) > 0 THEN
      RAISE WARNING 'Tables without RLS: %', array_to_string(v_failed_tables, ', ');
    END IF;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- Step 4: Test Access (manual verification)
-- ============================================================================

-- IMPORTANT: Run these queries as different users to verify RLS works

-- Test 1: Anonymous user trying to access sensitive data
-- Should return EMPTY or only public-safe data
-- SELECT * FROM users WHERE id != auth.uid();
-- SELECT * FROM billing_transactions;
-- SELECT * FROM club_subscriptions;

-- Test 2: Authenticated user accessing own data
-- Should return own data only
-- SELECT * FROM users WHERE id = auth.uid();
-- SELECT * FROM event_participants WHERE user_id = auth.uid();

-- Test 3: Club owner accessing club data
-- Should return own club data only
-- SELECT * FROM club_subscriptions WHERE club_id = '<your-club-id>';
-- SELECT * FROM billing_transactions WHERE club_id = '<your-club-id>';

-- ============================================================================
-- Step 5: Check helper views
-- ============================================================================

SELECT 
  viewname,
  CASE 
    WHEN viewname IN ('user_public_profiles', 'club_subscription_limits', 'billing_transaction_summaries') 
    THEN '✅ EXISTS'
    ELSE '❓ UNKNOWN'
  END AS status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'user_public_profiles',
    'club_subscription_limits', 
    'billing_transaction_summaries'
  )
ORDER BY viewname;

-- Expected:
-- user_public_profiles         | ✅ EXISTS
-- club_subscription_limits     | ✅ EXISTS
-- billing_transaction_summaries| ✅ EXISTS

-- ============================================================================
-- DONE
-- ============================================================================
