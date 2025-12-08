-- Исправление дубликатов пользователей Telegram после багфикса upsert
-- Проблема: каждый логин создавал нового пользователя с тем же telegram_id
-- Решение: объединяем дубликаты, сохраняя самого старого пользователя

-- 1. Найти дубликаты по telegram_id и объединить данные
WITH duplicates AS (
  SELECT 
    telegram_id,
    array_agg(id ORDER BY created_at ASC, id ASC) as user_ids,
    array_agg(created_at ORDER BY created_at ASC, id ASC) as created_ats
  FROM public.users
  WHERE telegram_id IS NOT NULL
  GROUP BY telegram_id
  HAVING count(*) > 1
),
canonical AS (
  SELECT 
    telegram_id,
    user_ids[1] as keep_id,  -- Сохраняем самого старого
    user_ids[2:array_length(user_ids, 1)] as delete_ids  -- Удаляем остальных
  FROM duplicates
)
-- 2. Обновить владельцев событий (events.created_by_user_id)
, updated_events AS (
  UPDATE public.events e
  SET created_by_user_id = c.keep_id
  FROM canonical c
  WHERE e.created_by_user_id = ANY(c.delete_ids)
  RETURNING e.id, e.created_by_user_id
)
-- 3. Обновить участников событий (event_participants.user_id)
, updated_participants AS (
  UPDATE public.event_participants p
  SET user_id = c.keep_id
  FROM canonical c
  WHERE p.user_id = ANY(c.delete_ids)
  RETURNING p.id, p.user_id
)
-- 4. Обновить доступы к событиям (event_user_access)
, updated_access AS (
  UPDATE public.event_user_access a
  SET user_id = c.keep_id
  FROM canonical c
  WHERE a.user_id = ANY(c.delete_ids)
  -- Может быть конфликт unique(event_id, user_id), поэтому используем ON CONFLICT
  ON CONFLICT (event_id, user_id) DO NOTHING
  RETURNING a.id, a.user_id
)
-- 5. Удалить дублирующихся пользователей
DELETE FROM public.users u
USING canonical c
WHERE u.id = ANY(c.delete_ids);

-- Вывести информацию о том, что было сделано
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT telegram_id)
  INTO duplicate_count
  FROM (
    SELECT telegram_id
    FROM public.users
    WHERE telegram_id IS NOT NULL
    GROUP BY telegram_id
    HAVING count(*) > 1
  ) AS still_dupes;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Внимание: найдено % telegram_id с дубликатами после миграции', duplicate_count;
  ELSE
    RAISE NOTICE 'Миграция завершена успешно: дубликаты пользователей удалены';
  END IF;
END $$;

