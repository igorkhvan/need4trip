/**
 * Migration: Drop auto-subscription trigger for v2.0
 * Date: 2024-12-15
 * Purpose: Remove old trigger that creates club_free subscriptions
 * 
 * ВАЖНО: В v2.0 Free клубы НЕ имеют записи в club_subscriptions!
 * Отсутствие подписки = Free план
 * Только платные планы (club_50, club_500, club_unlimited) имеют записи
 */

-- ============================================================================
-- Drop trigger and function
-- ============================================================================

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_create_club_subscription ON public.clubs;

-- Drop function
DROP FUNCTION IF EXISTS public.create_default_club_subscription();

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify trigger is gone
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_create_club_subscription'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE EXCEPTION 'Trigger still exists!';
  ELSE
    RAISE NOTICE '✅ Trigger dropped successfully';
  END IF;
END $$;

-- Verify function is gone
DO $$
DECLARE
  function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_default_club_subscription'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE EXCEPTION 'Function still exists!';
  ELSE
    RAISE NOTICE '✅ Function dropped successfully';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE '✅ Migration completed successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Dropped trigger: trigger_create_club_subscription';
  RAISE NOTICE '  - Dropped function: create_default_club_subscription()';
  RAISE NOTICE '';
  RAISE NOTICE 'Behavior now:';
  RAISE NOTICE '  - New clubs have NO subscription record (= Free plan)';
  RAISE NOTICE '  - Only paid subscriptions create records in club_subscriptions';
  RAISE NOTICE '==================================================================';
END $$;
