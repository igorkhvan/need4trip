-- ============================================================================
-- GRANT SELECT для справочных таблиц
-- ============================================================================
--
-- Дата: 2024-12-22
-- Цель: Разрешить anon и authenticated ролям читать справочные таблицы
--
-- КОНТЕКСТ:
-- После миграции на Service Role pattern для всех server-side операций,
-- справочные таблицы остаются доступными через anon client.
-- Это безопасно т.к. справочники — публичные данные.
--
-- ============================================================================

-- Города (cities)
GRANT SELECT ON public.cities TO anon, authenticated;

-- Валюты (currencies)
GRANT SELECT ON public.currencies TO anon, authenticated;

-- Категории событий (event_categories)
GRANT SELECT ON public.event_categories TO anon, authenticated;

-- Бренды автомобилей (car_brands)
GRANT SELECT ON public.car_brands TO anon, authenticated;

-- Типы транспорта (vehicle_types)
GRANT SELECT ON public.vehicle_types TO anon, authenticated;

-- Тарифные планы клубов (club_plans)
GRANT SELECT ON public.club_plans TO anon, authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_grants_count INTEGER;
BEGIN
  -- Count GRANT SELECT for anon role on reference tables
  SELECT COUNT(*) INTO v_grants_count
  FROM information_schema.role_table_grants
  WHERE grantee = 'anon'
    AND privilege_type = 'SELECT'
    AND table_name IN ('cities', 'currencies', 'event_categories', 'car_brands', 'vehicle_types', 'club_plans')
    AND table_schema = 'public';

  IF v_grants_count < 6 THEN
    RAISE EXCEPTION 'GRANT verification failed: expected 6 grants for anon, found %', v_grants_count;
  END IF;

  -- Verify authenticated role as well
  SELECT COUNT(*) INTO v_grants_count
  FROM information_schema.role_table_grants
  WHERE grantee = 'authenticated'
    AND privilege_type = 'SELECT'
    AND table_name IN ('cities', 'currencies', 'event_categories', 'car_brands', 'vehicle_types', 'club_plans')
    AND table_schema = 'public';

  IF v_grants_count < 6 THEN
    RAISE EXCEPTION 'GRANT verification failed: expected 6 grants for authenticated, found %', v_grants_count;
  END IF;

  RAISE NOTICE '✅ GRANT SELECT verified: 6 reference tables accessible to anon and authenticated';
END $$;
