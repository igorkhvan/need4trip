-- ============================================================================
-- Test Script: club_id immutability trigger
-- Purpose: Verify that club_id cannot be changed after event creation
-- ============================================================================

-- Test Setup
DO $$
DECLARE
  test_user_id UUID;
  test_city_id UUID;
  test_club_id_1 UUID;
  test_club_id_2 UUID;
  test_event_id UUID;
  error_caught BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Testing club_id immutability trigger';
  RAISE NOTICE '========================================';
  
  -- Create test user
  INSERT INTO public.users (name, email)
  VALUES ('Test User', 'test@example.com')
  RETURNING id INTO test_user_id;
  
  RAISE NOTICE 'Created test user: %', test_user_id;
  
  -- Get a city (use existing or create)
  SELECT id INTO test_city_id FROM public.cities LIMIT 1;
  IF test_city_id IS NULL THEN
    INSERT INTO public.cities (name, country, timezone)
    VALUES ('Test City', 'KZ', 'Asia/Almaty')
    RETURNING id INTO test_city_id;
  END IF;
  
  -- Create test clubs
  INSERT INTO public.clubs (name, description, created_by)
  VALUES ('Test Club 1', 'Test club 1', test_user_id)
  RETURNING id INTO test_club_id_1;
  
  INSERT INTO public.clubs (name, description, created_by)
  VALUES ('Test Club 2', 'Test club 2', test_user_id)
  RETURNING id INTO test_club_id_2;
  
  RAISE NOTICE 'Created test clubs: % and %', test_club_id_1, test_club_id_2;
  
  -- ========================================
  -- Test 1: Create personal event (club_id = NULL)
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE 'Test 1: Create personal event (club_id = NULL)';
  
  INSERT INTO public.events (
    title, description, date_time, city_id, created_by_user_id, club_id
  ) VALUES (
    'Personal Event', 'Test personal event', NOW() + INTERVAL '7 days', 
    test_city_id, test_user_id, NULL
  ) RETURNING id INTO test_event_id;
  
  RAISE NOTICE '✅ Created personal event: %', test_event_id;
  
  -- Try to set club_id (NULL → value) — should FAIL after creation
  BEGIN
    UPDATE public.events
    SET club_id = test_club_id_1
    WHERE id = test_event_id;
    
    RAISE EXCEPTION 'FAILED: club_id change from NULL to value was allowed!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%club_id is immutable%' THEN
        RAISE NOTICE '✅ Test 1 PASSED: Cannot change club_id from NULL to value';
      ELSE
        RAISE EXCEPTION 'Test 1 FAILED with unexpected error: %', SQLERRM;
      END IF;
  END;
  
  -- ========================================
  -- Test 2: Create club event (club_id = X)
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE 'Test 2: Create club event (club_id = X)';
  
  INSERT INTO public.events (
    title, description, date_time, city_id, created_by_user_id, club_id
  ) VALUES (
    'Club Event', 'Test club event', NOW() + INTERVAL '7 days',
    test_city_id, test_user_id, test_club_id_1
  ) RETURNING id INTO test_event_id;
  
  RAISE NOTICE '✅ Created club event: % (club_id = %)', test_event_id, test_club_id_1;
  
  -- Try to change club_id (value → different value) — should FAIL
  BEGIN
    UPDATE public.events
    SET club_id = test_club_id_2
    WHERE id = test_event_id;
    
    RAISE EXCEPTION 'FAILED: club_id change from one club to another was allowed!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%club_id is immutable%' THEN
        RAISE NOTICE '✅ Test 2 PASSED: Cannot change club_id from one value to another';
      ELSE
        RAISE EXCEPTION 'Test 2 FAILED with unexpected error: %', SQLERRM;
      END IF;
  END;
  
  -- ========================================
  -- Test 3: Try to clear club_id (value → NULL)
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE 'Test 3: Try to clear club_id (value → NULL)';
  
  BEGIN
    UPDATE public.events
    SET club_id = NULL
    WHERE id = test_event_id;
    
    RAISE EXCEPTION 'FAILED: Clearing club_id was allowed!';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%club_id is immutable%' THEN
        RAISE NOTICE '✅ Test 3 PASSED: Cannot clear club_id';
      ELSE
        RAISE EXCEPTION 'Test 3 FAILED with unexpected error: %', SQLERRM;
      END IF;
  END;
  
  -- ========================================
  -- Test 4: Update other fields (should work)
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE 'Test 4: Update other fields (title, description) — should work';
  
  UPDATE public.events
  SET title = 'Updated Club Event',
      description = 'Updated description'
  WHERE id = test_event_id;
  
  RAISE NOTICE '✅ Test 4 PASSED: Can update other fields while club_id stays unchanged';
  
  -- ========================================
  -- Cleanup
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cleaning up test data...';
  
  DELETE FROM public.events WHERE created_by_user_id = test_user_id;
  DELETE FROM public.club_members WHERE user_id = test_user_id;
  DELETE FROM public.clubs WHERE created_by = test_user_id;
  DELETE FROM public.users WHERE id = test_user_id;
  
  RAISE NOTICE '✅ Cleanup complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL TESTS PASSED';
  RAISE NOTICE '========================================';
  
END $$;

