-- Очистка пользователей с пустым telegram_id созданных по ошибке
-- Проблема: ensureUserExists затирал telegram данные при upsert

-- Найти пользователей с пустым telegram_id которые НЕ являются владельцами событий
-- и НЕ зарегистрированы как участники
WITH empty_telegram_users AS (
  SELECT id, name, created_at
  FROM public.users
  WHERE telegram_id IS NULL
    AND telegram_handle IS NULL
),
users_to_delete AS (
  SELECT etu.id
  FROM empty_telegram_users etu
  WHERE NOT EXISTS (
    -- Не владельцы событий
    SELECT 1 FROM public.events e WHERE e.created_by_user_id = etu.id
  )
  AND NOT EXISTS (
    -- Не участники событий
    SELECT 1 FROM public.event_participants p WHERE p.user_id = etu.id
  )
)
DELETE FROM public.users
WHERE id IN (SELECT id FROM users_to_delete);

-- Вывести информацию о результате
DO $$
DECLARE
  remaining_empty INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO remaining_empty
  FROM public.users
  WHERE telegram_id IS NULL AND telegram_handle IS NULL;
  
  IF remaining_empty > 0 THEN
    RAISE NOTICE 'Осталось % пользователей с пустым telegram_id (используются в событиях/регистрациях)', remaining_empty;
  ELSE
    RAISE NOTICE 'Все пустые пользователи удалены';
  END IF;
END $$;

