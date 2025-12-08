-- Проверка дубликатов пользователей по telegram_id
SELECT 
  telegram_id,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at ASC) as user_ids,
  array_agg(name ORDER BY created_at ASC) as names,
  array_agg(created_at ORDER BY created_at ASC) as created_dates
FROM public.users
WHERE telegram_id IS NOT NULL
GROUP BY telegram_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
