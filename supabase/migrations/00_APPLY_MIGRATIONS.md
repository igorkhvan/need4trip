# Инструкция по применению миграций

## 📋 Подготовка

### 1. Backup текущей БД (ОБЯЗАТЕЛЬНО!)

**Через Supabase Dashboard:**
1. Перейти в ваш проект: https://app.supabase.com/project/YOUR_PROJECT_ID
2. Database → Backups → Create backup (manual)
3. Дождаться завершения

**Или через SQL:**
```bash
# Если есть прямой доступ к PostgreSQL
pg_dump -h db.YOUR_PROJECT_ID.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🚀 Применение миграций

### Метод 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)

1. **Откройте SQL Editor:**
   - Supabase Dashboard → SQL Editor → New query

2. **Применяйте миграции ПОСЛЕДОВАТЕЛЬНО:**

#### Миграция 1: Создание clubs
```sql
-- Скопируйте содержимое файла:
-- supabase/migrations/20241212_create_clubs.sql
-- Вставьте в SQL Editor и нажмите RUN
```

#### Миграция 2: Создание club_members
```sql
-- Скопируйте содержимое файла:
-- supabase/migrations/20241212_create_club_members.sql
-- Вставьте в SQL Editor и нажмите RUN
```

#### Миграция 3: Создание club_subscriptions
```sql
-- Скопируйте содержимое файла:
-- supabase/migrations/20241212_create_club_subscriptions.sql
-- Вставьте в SQL Editor и нажмите RUN
```

#### Миграция 4: Обновление events
```sql
-- Скопируйте содержимое файла:
-- supabase/migrations/20241212_alter_events_club_and_visibility.sql
-- Вставьте в SQL Editor и нажмите RUN
```

#### Миграция 5: Обновление users
```sql
-- Скопируйте содержимое файла:
-- supabase/migrations/20241212_alter_users_add_plan.sql
-- Вставьте в SQL Editor и нажмите RUN
```

#### Миграция 6: Создание триггеров
```sql
-- Скопируйте содержимое файла:
-- supabase/migrations/20241212_create_initial_triggers.sql
-- Вставьте в SQL Editor и нажмите RUN
```

---

### Метод 2: Через psql (если есть прямой доступ)

```bash
# Установите переменные окружения (замените YOUR_PROJECT_ID)
export PGHOST=db.YOUR_PROJECT_ID.supabase.co
export PGPORT=5432
export PGUSER=postgres
export PGDATABASE=postgres
export PGPASSWORD=your_password

# Применить миграции последовательно
psql -f supabase/migrations/20241212_create_clubs.sql
psql -f supabase/migrations/20241212_create_club_members.sql
psql -f supabase/migrations/20241212_create_club_subscriptions.sql
psql -f supabase/migrations/20241212_alter_events_club_and_visibility.sql
psql -f supabase/migrations/20241212_alter_users_add_plan.sql
psql -f supabase/migrations/20241212_create_initial_triggers.sql
```

---

## ✅ Проверка успешности миграций

После применения всех миграций выполните проверочные запросы:

### 1. Проверка новых таблиц

```sql
-- Должны существовать 3 новые таблицы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('clubs', 'club_members', 'club_subscriptions')
ORDER BY table_name;

-- Ожидается:
-- club_members
-- club_subscriptions
-- clubs
```

### 2. Проверка новых колонок в events

```sql
-- Проверить наличие club_id
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'events' 
  AND column_name IN ('club_id', 'visibility');

-- Ожидается:
-- club_id       | uuid | YES | (null)
-- visibility    | text | NO  | 'public'::text
```

### 3. Проверка constraint для visibility

```sql
-- Проверить новый constraint с 3 значениями
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
WHERE con.conname = 'events_visibility_check'
  AND con.conrelid = 'public.events'::regclass;

-- Ожидается:
-- events_visibility_check | CHECK ((visibility = ANY (ARRAY['public'::text, 'unlisted'::text, 'restricted'::text])))
```

### 4. Проверка миграции данных (если были события с link_registered)

```sql
-- Проверить что link_registered больше нет
SELECT COUNT(*) as old_visibility_count
FROM public.events
WHERE visibility = 'link_registered';

-- Ожидается: 0

-- Проверить что restricted появился (если были события)
SELECT visibility, COUNT(*) as count
FROM public.events
GROUP BY visibility;

-- Ожидается: public, unlisted, или restricted (но не link_registered)
```

### 5. Проверка новой колонки в users

```sql
-- Проверить наличие plan
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'plan';

-- Ожидается:
-- plan | text | 'free'::text
```

### 6. Проверка триггеров

```sql
-- Проверить все триггеры
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN (
  'trigger_clubs_updated_at',
  'trigger_club_subscriptions_updated_at',
  'trigger_create_club_subscription',
  'trigger_add_club_owner',
  'trigger_sync_event_club_flag'
)
ORDER BY tgname;

-- Ожидается 5 триггеров
```

### 7. Проверка функций

```sql
-- Проверить все функции
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_updated_at_column',
    'create_default_club_subscription',
    'add_creator_as_club_owner',
    'sync_event_club_flag',
    'deactivate_expired_club_subscriptions'
  )
ORDER BY routine_name;

-- Ожидается 5 функций
```

### 8. Проверка индексов

```sql
-- Проверить новые индексы
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename IN ('clubs', 'club_members', 'club_subscriptions')
    OR indexname LIKE '%club%'
  )
ORDER BY tablename, indexname;

-- Ожидается ~11 индексов
```

---

## 🧪 Интеграционные тесты

После проверки структуры запустите тестовые сценарии:

### Тест 1: Создание клуба

```sql
-- Получить UUID существующего пользователя (замените на реальный)
SELECT id, name FROM public.users LIMIT 1;
-- Скопируйте id пользователя

-- Создать тестовый клуб
INSERT INTO public.clubs (name, description, city, created_by)
VALUES (
  'Test Club Moscow',
  'Тестовый клуб для проверки миграций',
  'Москва',
  'PASTE_USER_ID_HERE'  -- Вставьте UUID пользователя
)
RETURNING id, name, created_at;

-- Сохраните возвращенный club_id
```

### Тест 2: Автоматическое создание subscription и owner

```sql
-- Проверить что автоматически создалась подписка
SELECT * FROM public.club_subscriptions 
WHERE club_id = 'PASTE_CLUB_ID_HERE';

-- Ожидается:
-- club_id | plan='club_free' | valid_until=NULL | active=TRUE

-- Проверить что создатель автоматически стал owner
SELECT * FROM public.club_members 
WHERE club_id = 'PASTE_CLUB_ID_HERE';

-- Ожидается:
-- club_id | user_id | role='owner' | invited_by=NULL
```

### Тест 3: Добавление участников

```sql
-- Получить UUID другого пользователя
SELECT id, name FROM public.users 
WHERE id != 'PASTE_CREATOR_ID_HERE' 
LIMIT 1;

-- Добавить организатора
INSERT INTO public.club_members (club_id, user_id, role, invited_by)
VALUES (
  'PASTE_CLUB_ID_HERE',
  'PASTE_ANOTHER_USER_ID_HERE',
  'organizer',
  'PASTE_CREATOR_ID_HERE'
)
RETURNING *;

-- Проверить что один user не может быть дважды в клубе
INSERT INTO public.club_members (club_id, user_id, role)
VALUES (
  'PASTE_CLUB_ID_HERE',
  'PASTE_ANOTHER_USER_ID_HERE',  -- Тот же user
  'member'
);
-- Ожидается ERROR: duplicate key value violates unique constraint ✅
```

### Тест 4: Ограничение одного owner

```sql
-- Попытаться добавить второго owner
INSERT INTO public.club_members (club_id, user_id, role)
VALUES (
  'PASTE_CLUB_ID_HERE',
  'SOME_OTHER_USER_ID',
  'owner'
);
-- Ожидается ERROR: duplicate key value violates unique constraint "idx_club_members_single_owner" ✅
```

### Тест 5: Создание события от клуба

```sql
-- Создать событие от клуба
INSERT INTO public.events (
  title,
  description,
  date_time,
  location_text,
  club_id,
  created_by_user_id,
  visibility
)
VALUES (
  'Тестовая поездка',
  'Тестовое описание',
  NOW() + INTERVAL '7 days',
  'Москва',
  'PASTE_CLUB_ID_HERE',
  'PASTE_USER_ID_HERE',
  'public'
)
RETURNING id, title, club_id, is_club_event;

-- Проверить что is_club_event автоматически стал TRUE
-- Ожидается: is_club_event = TRUE (триггер сработал!) ✅
```

### Тест 6: Синхронизация is_club_event

```sql
-- Получить ID созданного события
-- Обновить club_id на NULL
UPDATE public.events
SET club_id = NULL
WHERE id = 'PASTE_EVENT_ID_HERE'
RETURNING id, club_id, is_club_event;

-- Проверить что is_club_event автоматически стал FALSE
-- Ожидается: is_club_event = FALSE (триггер сработал!) ✅

-- Вернуть club_id обратно
UPDATE public.events
SET club_id = 'PASTE_CLUB_ID_HERE'
WHERE id = 'PASTE_EVENT_ID_HERE'
RETURNING id, club_id, is_club_event;

-- Проверить что is_club_event снова TRUE
-- Ожидается: is_club_event = TRUE ✅
```

### Тест 7: Проверка автоматической синхронизации через триггер

```sql
-- ВАЖНО: Триггер BEFORE INSERT автоматически исправляет is_club_event!
-- Это ФИЧА, а не баг - БД защищает от ошибок разработчика

-- Попытаться создать событие с is_club_event=TRUE но club_id=NULL
INSERT INTO public.events (
  title,
  description,
  date_time,
  location_text,
  club_id,
  is_club_event,
  created_by_user_id
)
VALUES (
  'Auto-Fixed Event',
  'Test автоисправления',
  NOW() + INTERVAL '7 days',
  'Москва',
  NULL,  -- club_id = NULL
  TRUE,  -- пытаемся установить is_club_event = TRUE
  'PASTE_USER_ID_HERE'
)
RETURNING id, title, club_id, is_club_event;

-- Ожидается: SUCCESS, но is_club_event = FALSE (триггер автоматически исправил!) ✅

-- Проверить что триггер сработал
SELECT id, title, club_id, is_club_event 
FROM public.events 
WHERE title = 'Auto-Fixed Event';

-- Ожидается: is_club_event = FALSE (несмотря на попытку установить TRUE)

-- Теперь попробуем обратную ситуацию: club_id есть, но is_club_event=FALSE
INSERT INTO public.events (
  title,
  description,
  date_time,
  location_text,
  club_id,
  is_club_event,
  created_by_user_id
)
VALUES (
  'Auto-Fixed Event 2',
  'Test автоисправления 2',
  NOW() + INTERVAL '7 days',
  'Москва',
  'PASTE_CLUB_ID_HERE',  -- club_id есть
  FALSE,  -- пытаемся установить is_club_event = FALSE
  'PASTE_USER_ID_HERE'
)
RETURNING id, title, club_id, is_club_event;

-- Ожидается: SUCCESS, но is_club_event = TRUE (триггер автоматически исправил!) ✅
```

**Вывод:** Триггер работает правильно - он **автоматически синхронизирует** `is_club_event` с `club_id`, предотвращая ошибки разработчика. Constraint `events_club_consistency_check` остается как дополнительная защита на случай если триггер будет отключен.

### Тест 8: Проверка новых значений visibility

```sql
-- Создать событие с visibility = 'unlisted' (новое значение)
INSERT INTO public.events (
  title,
  description,
  date_time,
  location_text,
  visibility,
  created_by_user_id
)
VALUES (
  'Unlisted Event',
  'Test',
  NOW() + INTERVAL '7 days',
  'Москва',
  'unlisted',  -- Новое значение
  'PASTE_USER_ID_HERE'
)
RETURNING id, title, visibility;

-- Ожидается: SUCCESS ✅

-- Попытаться установить старое значение
UPDATE public.events
SET visibility = 'link_registered'
WHERE title = 'Unlisted Event';

-- Ожидается ERROR: new row violates check constraint "events_visibility_check" ✅
```

### Тест 9: Обновление подписки клуба

```sql
-- Обновить подписку на club_basic
UPDATE public.club_subscriptions
SET 
  plan = 'club_basic',
  valid_until = NOW() + INTERVAL '1 year'
WHERE club_id = 'PASTE_CLUB_ID_HERE'
RETURNING *;

-- Проверить что updated_at обновился (триггер)
-- Ожидается: plan='club_basic', valid_until~2025-12-12, updated_at обновился ✅
```

### Тест 10: Функция деактивации истекших подписок

```sql
-- Создать подписку с истекшим сроком (для теста)
-- Сначала создать второй тестовый клуб
INSERT INTO public.clubs (name, created_by)
VALUES ('Expired Club', 'PASTE_USER_ID_HERE')
RETURNING id;

-- Обновить его подписку на истекшую
UPDATE public.club_subscriptions
SET 
  plan = 'club_pro',
  valid_until = NOW() - INTERVAL '1 day',  -- Вчера
  active = TRUE
WHERE club_id = 'PASTE_EXPIRED_CLUB_ID_HERE';

-- Запустить функцию деактивации
SELECT public.deactivate_expired_club_subscriptions();

-- Проверить что подписка деактивирована
SELECT club_id, plan, valid_until, active
FROM public.club_subscriptions
WHERE club_id = 'PASTE_EXPIRED_CLUB_ID_HERE';

-- Ожидается: active = FALSE ✅
```

---

## 🧹 Очистка тестовых данных

После успешных тестов удалите тестовые данные:

```sql
-- Удалить тестовые события
DELETE FROM public.events 
WHERE title IN ('Тестовая поездка', 'Unlisted Event', 'Bad Event');

-- Удалить тестовые клубы (cascade удалит members и subscriptions)
DELETE FROM public.clubs 
WHERE name IN ('Test Club Moscow', 'Expired Club');

-- Проверить что все удалилось
SELECT COUNT(*) FROM public.clubs WHERE name LIKE '%Test%';
-- Ожидается: 0
```

---

## ❌ Откат миграций (если что-то пошло не так)

### Вариант 1: Restore из backup

1. Supabase Dashboard → Database → Backups
2. Выбрать backup сделанный до миграций
3. Restore

### Вариант 2: Ручной откат (SQL)

```sql
-- ВНИМАНИЕ: Выполнять только если нужен полный откат!

BEGIN;

-- 1. Удалить триггеры
DROP TRIGGER IF EXISTS trigger_sync_event_club_flag ON public.events;
DROP TRIGGER IF EXISTS trigger_add_club_owner ON public.clubs;
DROP TRIGGER IF EXISTS trigger_create_club_subscription ON public.clubs;
DROP TRIGGER IF EXISTS trigger_club_subscriptions_updated_at ON public.club_subscriptions;
DROP TRIGGER IF EXISTS trigger_clubs_updated_at ON public.clubs;

-- 2. Удалить функции
DROP FUNCTION IF EXISTS public.sync_event_club_flag();
DROP FUNCTION IF EXISTS public.add_creator_as_club_owner();
DROP FUNCTION IF EXISTS public.create_default_club_subscription();
DROP FUNCTION IF EXISTS public.deactivate_expired_club_subscriptions();

-- 3. Откатить изменения в users
ALTER TABLE public.users DROP COLUMN IF EXISTS plan;

-- 4. Откатить изменения в events
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_club_consistency_check;
ALTER TABLE public.events DROP COLUMN IF EXISTS club_id;

-- Откатить visibility (если хотите вернуть link_registered)
-- UPDATE public.events SET visibility = 'link_registered' WHERE visibility = 'restricted';
-- ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_visibility_check;
-- ALTER TABLE public.events ADD CONSTRAINT events_visibility_check CHECK (visibility IN ('public', 'link_registered'));

-- 5. Удалить новые таблицы
DROP TABLE IF EXISTS public.club_subscriptions CASCADE;
DROP TABLE IF EXISTS public.club_members CASCADE;
DROP TABLE IF EXISTS public.clubs CASCADE;

COMMIT;
```

---

## ✅ Checklist перед продолжением

Убедитесь что:

- [ ] Backup создан
- [ ] Все 6 миграций применены успешно (без ошибок)
- [ ] Все проверочные запросы вернули ожидаемые результаты
- [ ] Тест 1-10 прошли успешно
- [ ] Тестовые данные очищены
- [ ] Существующие события продолжают работать (проверьте в UI)

**Если все пункты выполнены — готово к PHASE 2!** 🎉

---

## 🆘 Troubleshooting

### Ошибка: "relation already exists"
**Решение:** Миграция уже применена. Пропустите этот файл или используйте `IF NOT EXISTS`.

### Ошибка: "constraint already exists"
**Решение:** Constraint уже создан. Безопасно продолжать.

### Ошибка: "violates check constraint"
**Проблема:** Есть данные не соответствующие новому constraint.
**Решение:** 
1. Найдите проблемные данные: `SELECT * FROM events WHERE visibility NOT IN ('public', 'unlisted', 'restricted');`
2. Исправьте их перед применением миграции.

### Триггер не срабатывает
**Проверка:**
```sql
SELECT tgenabled FROM pg_trigger WHERE tgname = 'trigger_sync_event_club_flag';
```
**Решение:** Если `tgenabled != 'O'`, включите триггер:
```sql
ALTER TABLE public.events ENABLE TRIGGER trigger_sync_event_club_flag;
```

---

_После успешного применения и тестирования миграций можно продолжить с PHASE 2: Type System._

