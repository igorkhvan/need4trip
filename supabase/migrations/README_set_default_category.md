# Миграция: Установка категории по умолчанию

## Описание
Устанавливает категорию "Другое" (code='other') как значение по умолчанию для поля `category_id` в таблице `events`.

## Применение

### Через Supabase Dashboard (SQL Editor)
1. Откройте SQL Editor в Supabase Dashboard
2. Скопируйте содержимое файла `20241213_set_default_event_category.sql`
3. Выполните запрос
4. Проверьте результат в уведомлениях (NOTICE)

### Через Supabase CLI
```bash
supabase migration up
```

## Что делает миграция

1. **Находит ID категории "Другое":**
   ```sql
   SELECT id FROM public.event_categories WHERE code = 'other'
   ```

2. **Устанавливает DEFAULT:**
   ```sql
   ALTER TABLE public.events ALTER COLUMN category_id SET DEFAULT '<UUID>'
   ```

3. **Проверяет результат:**
   - Выводит NOTICE с установленным UUID
   - Показывает текущее значение DEFAULT

## Результат

После применения миграции:
- Новые события будут автоматически получать category_id = "Другое"
- Существующие события не изменятся
- При создании через API категория будет установлена по умолчанию

## Откат (если нужен)

Чтобы убрать DEFAULT:
```sql
ALTER TABLE public.events ALTER COLUMN category_id DROP DEFAULT;
```

## Проверка

Проверить текущее значение DEFAULT:
```sql
SELECT column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'events'
  AND column_name = 'category_id';
```

