-- ============================================================================
-- Quick Verification Script
-- Purpose: Быстрая проверка всех миграций одним запросом
-- Usage: Скопируйте весь файл в SQL Editor и запустите
-- ============================================================================

DO $$
DECLARE
  v_clubs_exists BOOLEAN;
  v_club_members_exists BOOLEAN;
  v_club_subscriptions_exists BOOLEAN;
  v_events_club_id_exists BOOLEAN;
  v_users_plan_exists BOOLEAN;
  v_trigger_count INT;
  v_function_count INT;
  v_old_visibility_count INT;
  v_error_count INT := 0;
BEGIN
  RAISE NOTICE '🔍 Проверка миграций Need4Trip...';
  RAISE NOTICE '';
  
  -- Check 1: Таблица clubs
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'clubs'
  ) INTO v_clubs_exists;
  
  IF v_clubs_exists THEN
    RAISE NOTICE '✅ Таблица public.clubs существует';
  ELSE
    RAISE NOTICE '❌ Таблица public.clubs НЕ НАЙДЕНА';
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Check 2: Таблица club_members
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'club_members'
  ) INTO v_club_members_exists;
  
  IF v_club_members_exists THEN
    RAISE NOTICE '✅ Таблица public.club_members существует';
  ELSE
    RAISE NOTICE '❌ Таблица public.club_members НЕ НАЙДЕНА';
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Check 3: Таблица club_subscriptions
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'club_subscriptions'
  ) INTO v_club_subscriptions_exists;
  
  IF v_club_subscriptions_exists THEN
    RAISE NOTICE '✅ Таблица public.club_subscriptions существует';
  ELSE
    RAISE NOTICE '❌ Таблица public.club_subscriptions НЕ НАЙДЕНА';
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Check 4: Колонка events.club_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'events' 
      AND column_name = 'club_id'
  ) INTO v_events_club_id_exists;
  
  IF v_events_club_id_exists THEN
    RAISE NOTICE '✅ Колонка events.club_id существует';
  ELSE
    RAISE NOTICE '❌ Колонка events.club_id НЕ НАЙДЕНА';
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Check 5: Колонка users.plan
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'plan'
  ) INTO v_users_plan_exists;
  
  IF v_users_plan_exists THEN
    RAISE NOTICE '✅ Колонка users.plan существует';
  ELSE
    RAISE NOTICE '❌ Колонка users.plan НЕ НАЙДЕНА';
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Check 6: Constraint events_visibility_check (новый с 3 значениями)
  IF EXISTS (
    SELECT 1 FROM pg_constraint con
    WHERE con.conname = 'events_visibility_check'
      AND con.conrelid = 'public.events'::regclass
      AND pg_get_constraintdef(con.oid) LIKE '%unlisted%'
  ) THEN
    RAISE NOTICE '✅ Constraint events_visibility_check обновлен (public/unlisted/restricted)';
  ELSE
    RAISE NOTICE '❌ Constraint events_visibility_check НЕ ОБНОВЛЕН или отсутствует';
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Check 7: Constraint events_club_consistency_check
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'events_club_consistency_check'
      AND conrelid = 'public.events'::regclass
  ) THEN
    RAISE NOTICE '✅ Constraint events_club_consistency_check существует';
  ELSE
    RAISE NOTICE '❌ Constraint events_club_consistency_check НЕ НАЙДЕН';
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Check 8: Старые значения visibility
  SELECT COUNT(*) INTO v_old_visibility_count
  FROM public.events
  WHERE visibility = 'link_registered';
  
  IF v_old_visibility_count = 0 THEN
    RAISE NOTICE '✅ Миграция visibility завершена (link_registered больше нет)';
  ELSE
    RAISE NOTICE '⚠️  ВНИМАНИЕ: Найдено % событий с visibility=link_registered (не мигрировано)', v_old_visibility_count;
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Check 9: Триггеры
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname IN (
    'trigger_clubs_updated_at',
    'trigger_club_subscriptions_updated_at',
    'trigger_create_club_subscription',
    'trigger_add_club_owner',
    'trigger_sync_event_club_flag'
  );
  
  IF v_trigger_count = 5 THEN
    RAISE NOTICE '✅ Все 5 триггеров созданы';
  ELSE
    RAISE NOTICE '❌ Найдено только % из 5 триггеров', v_trigger_count;
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Check 10: Функции
  SELECT COUNT(*) INTO v_function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'update_updated_at_column',
      'create_default_club_subscription',
      'add_creator_as_club_owner',
      'sync_event_club_flag',
      'deactivate_expired_club_subscriptions'
    );
  
  IF v_function_count = 5 THEN
    RAISE NOTICE '✅ Все 5 функций созданы';
  ELSE
    RAISE NOTICE '❌ Найдено только % из 5 функций', v_function_count;
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Check 11: Уникальность owner в клубе
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'club_members'
      AND indexname = 'idx_club_members_single_owner'
  ) THEN
    RAISE NOTICE '✅ Уникальный индекс owner создан';
  ELSE
    RAISE NOTICE '❌ Уникальный индекс owner НЕ НАЙДЕН';
    v_error_count := v_error_count + 1;
  END IF;
  
  -- Final summary
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF v_error_count = 0 THEN
    RAISE NOTICE '🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ! Миграции применены успешно.';
    RAISE NOTICE '✅ Готово к PHASE 2: Type System';
  ELSE
    RAISE NOTICE '❌ Найдено % ошибок. Проверьте логи выше.', v_error_count;
    RAISE NOTICE '⚠️  Не все миграции применены корректно.';
    RAISE NOTICE '';
    RAISE NOTICE 'Рекомендации:';
    RAISE NOTICE '1. Примените миграции последовательно (см. 00_APPLY_MIGRATIONS.md)';
    RAISE NOTICE '2. Проверьте ошибки в SQL Editor';
    RAISE NOTICE '3. При необходимости откатите через backup';
  END IF;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  
END $$;

-- Дополнительная информация для отладки
SELECT 
  'Новые таблицы' as category,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('clubs', 'club_members', 'club_subscriptions')
ORDER BY table_name;

SELECT 
  'Индексы клубов' as category,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('clubs', 'club_members', 'club_subscriptions')
ORDER BY tablename, indexname;

SELECT 
  'Триггеры' as category,
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE tgenabled
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'disabled'
    ELSE 'unknown'
  END as status
FROM pg_trigger
WHERE tgname IN (
  'trigger_clubs_updated_at',
  'trigger_club_subscriptions_updated_at',
  'trigger_create_club_subscription',
  'trigger_add_club_owner',
  'trigger_sync_event_club_flag'
)
ORDER BY tgname;

