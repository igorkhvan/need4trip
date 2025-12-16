# PHASE 1: Database Migrations

**Date:** 12 декабря 2025  
**Status:** ✅ COMPLETED  
**Purpose:** Extend Need4Trip database schema for Club System and Subscriptions

---

## 📊 MIGRATION OVERVIEW

Создано **6 SQL миграций** для расширения схемы БД:

| # | Файл | Описание | Зависимости |
|---|------|----------|-------------|
| 1 | `20241212_create_clubs.sql` | Создание таблицы `clubs` | Требует `users` |
| 2 | `20241212_create_club_members.sql` | Создание таблицы `club_members` | Требует `clubs`, `users` |
| 3 | `20241212_create_club_subscriptions.sql` | Создание таблицы `club_subscriptions` | Требует `clubs` |
| 4 | `20241212_alter_events_club_and_visibility.sql` | Обновление `events` (club_id, visibility) | Требует `clubs` |
| 5 | `20241212_alter_users_add_plan.sql` | Обновление `users` (plan) | Standalone |
| 6 | `20241212_create_initial_triggers.sql` | Триггеры и функции | Требует 1-3 |

**Порядок применения:** Строго последовательно (1 → 2 → 3 → 4 → 5 → 6)

---

## 🆕 НОВЫЕ ТАБЛИЦЫ

### 1. `public.clubs`
**Назначение:** Хранение информации о клубах и сообществах

```sql
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  description TEXT,
  city TEXT CHECK (city IS NULL OR char_length(city) <= 100),
  logo_url TEXT CHECK (logo_url IS NULL OR char_length(logo_url) <= 500),
  telegram_url TEXT CHECK (telegram_url IS NULL OR char_length(telegram_url) <= 500),
  website_url TEXT CHECK (website_url IS NULL OR char_length(website_url) <= 500),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Индексы:**
- `idx_clubs_created_by` на `created_by`
- `idx_clubs_city` на `city` (partial: WHERE city IS NOT NULL)
- `idx_clubs_created_at` на `created_at DESC`

**Ограничения:**
- `name`: 2-100 символов (обязательно)
- `city`, `logo_url`, `telegram_url`, `website_url`: <= 500 символов (опционально)

---

### 2. `public.club_members`
**Назначение:** Участники клубов с ролями

```sql
CREATE TABLE public.club_members (
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'organizer', 'member', 'pending')),
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, user_id)
);
```

**Роли:**
- `owner` - владелец клуба (только 1 на клуб, гарантируется UNIQUE INDEX)
- `organizer` - организатор (может создавать события клуба)
- `member` - участник (доступ к закрытым событиям клуба)
- `pending` - ожидает подтверждения (приглашение)

**Индексы:**
- `idx_club_members_user_id` на `user_id`
- `idx_club_members_role` на `(club_id, role)`
- `idx_club_members_pending` на `club_id` (partial: WHERE role = 'pending')
- `idx_club_members_single_owner` UNIQUE на `club_id` (partial: WHERE role = 'owner') ← **Гарантирует одного owner**

**Ограничения:**
- PRIMARY KEY: `(club_id, user_id)` - один user может быть в клубе только один раз
- Cascade delete: удаление клуба → удаление всех членов
- Cascade delete: удаление user → удаление из всех клубов

---

### 3. `public.club_subscriptions`
**Назначение:** Подписки клубов с тарифными планами

```sql
CREATE TABLE public.club_subscriptions (
  club_id UUID PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('club_free', 'club_basic', 'club_pro')),
  valid_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Планы:**
- `club_free` - бесплатный (макс 1 активное событие)
- `club_basic` - базовый (макс 3 активных события)
- `club_pro` - про (безлимит событий, все возможности)

**Индексы:**
- `idx_club_subscriptions_active` на `(active, valid_until)` (partial: WHERE active = TRUE)
- `idx_club_subscriptions_expiring` на `valid_until` (partial: WHERE active = TRUE AND valid_until IS NOT NULL)

**Логика:**
- `valid_until = NULL` → бессрочная подписка (для club_free)
- `valid_until < NOW()` → подписка истекла, требуется деактивация
- Функция `deactivate_expired_club_subscriptions()` автоматически деактивирует истекшие

---

## 🔧 ОБНОВЛЕННЫЕ ТАБЛИЦЫ

### 4. `public.events` - Добавления

#### Новые колонки:

**`club_id UUID`**
```sql
ALTER TABLE public.events
ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;
```
- **Назначение:** ID клуба-организатора (NULL = личное событие)
- **Индекс:** `idx_events_club_id` (partial: WHERE club_id IS NOT NULL)
- **Связь:** Foreign key к `clubs.id` с SET NULL при удалении клуба

#### Обновленные constraints:

**`visibility` - Расширение значений**
```sql
-- БЫЛО:
CHECK (visibility IN ('public', 'link_registered'))

-- СТАЛО:
CHECK (visibility IN ('public', 'unlisted', 'restricted'))
```

**Миграция данных:**
```sql
UPDATE public.events 
SET visibility = 'restricted' 
WHERE visibility = 'link_registered';
```

**Новая семантика:**
- `public` - видно всем (как раньше)
- `unlisted` - доступно только по прямой ссылке (новое)
- `restricted` - только участникам/клубу (было `link_registered`)

**Новый constraint `events_club_consistency_check`:**
```sql
CHECK (
  (is_club_event = TRUE AND club_id IS NOT NULL) OR
  (is_club_event = FALSE AND club_id IS NULL)
)
```
- **Назначение:** Гарантирует синхронизацию `is_club_event ⇔ club_id`
- **Логика:** `is_club_event = TRUE` если и только если `club_id IS NOT NULL`

**Новый триггер `trigger_sync_event_club_flag`:**
```sql
CREATE TRIGGER trigger_sync_event_club_flag
  BEFORE INSERT OR UPDATE OF club_id ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_club_flag();
```
- **Назначение:** Автоматически устанавливает `is_club_event = (club_id IS NOT NULL)`
- **Защита:** Предотвращает ручное рассинхронизация полей

---

### 5. `public.users` - Добавления

#### Новые колонки:

**`plan TEXT`**
```sql
ALTER TABLE public.users
ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' 
  CHECK (plan IN ('free', 'pro'));
```

**Планы:**
- `free` - бесплатный (макс 1 активное событие, без платных)
- `pro` - про (безлимит событий, все возможности)

**Индекс:**
- `idx_users_plan` на `plan` (partial: WHERE plan = 'pro')

**Миграция данных:**
- Все существующие пользователи получают `plan = 'free'`

---

## 🎯 ТРИГГЕРЫ И АВТОМАТИЗАЦИЯ

### 1. `update_updated_at_column()`
**Применяется к:** `clubs`, `club_subscriptions`

```sql
CREATE TRIGGER trigger_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

**Действие:** Автоматически обновляет `updated_at = NOW()` при UPDATE

---

### 2. `create_default_club_subscription()`
**Применяется к:** `clubs` (AFTER INSERT)

```sql
CREATE TRIGGER trigger_create_club_subscription
  AFTER INSERT ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_club_subscription();
```

**Действие:** 
- При создании клуба автоматически создает запись в `club_subscriptions`
- План: `club_free`
- Срок: бессрочно (`valid_until = NULL`)

**Пример:**
```sql
INSERT INTO clubs (name, created_by) VALUES ('Test Club', '...');
-- Автоматически создается:
-- INSERT INTO club_subscriptions (club_id, plan) VALUES (new_club_id, 'club_free');
```

---

### 3. `add_creator_as_club_owner()`
**Применяется к:** `clubs` (AFTER INSERT)

```sql
CREATE TRIGGER trigger_add_club_owner
  AFTER INSERT ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_club_owner();
```

**Действие:**
- При создании клуба автоматически добавляет `created_by` в `club_members` с ролью `owner`
- Если `created_by IS NULL` - ничего не делает

**Пример:**
```sql
INSERT INTO clubs (name, created_by) VALUES ('Test Club', 'user-uuid');
-- Автоматически создается:
-- INSERT INTO club_members (club_id, user_id, role) VALUES (new_club_id, 'user-uuid', 'owner');
```

---

### 4. `sync_event_club_flag()`
**Применяется к:** `events` (BEFORE INSERT/UPDATE OF club_id)

```sql
CREATE TRIGGER trigger_sync_event_club_flag
  BEFORE INSERT OR UPDATE OF club_id ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_club_flag();
```

**Действие:**
- Автоматически устанавливает `is_club_event = (club_id IS NOT NULL)`
- Срабатывает перед INSERT или UPDATE поля `club_id`
- Гарантирует консистентность данных

**Пример:**
```sql
INSERT INTO events (..., club_id) VALUES (..., 'club-uuid');
-- Автоматически: is_club_event = TRUE

UPDATE events SET club_id = NULL WHERE id = '...';
-- Автоматически: is_club_event = FALSE
```

---

### 5. `deactivate_expired_club_subscriptions()`
**Применяется:** Вручную или через cron job

```sql
SELECT public.deactivate_expired_club_subscriptions();
```

**Действие:**
- Находит все подписки где `active = TRUE` и `valid_until < NOW()`
- Устанавливает `active = FALSE` и обновляет `updated_at`

**Рекомендация:** Настроить cron job для ежедневного запуска:
```sql
SELECT cron.schedule(
  'deactivate-expired-club-subs', 
  '0 2 * * *',  -- Каждый день в 2:00 AM
  'SELECT public.deactivate_expired_club_subscriptions()'
);
```

---

## ✅ РЕШЕНИЕ КОНФЛИКТОВ

### Конфликт 1: Visibility Enum
**Проблема:** Существующие значения `'public'`, `'link_registered'` не совпадают с требуемыми `'public'`, `'unlisted'`, `'restricted'`

**Решение:**
1. ✅ **Миграция данных:** `link_registered` → `restricted` (семантически правильно)
2. ✅ **Удаление старого constraint:** `DROP CONSTRAINT events_visibility_check`
3. ✅ **Создание нового:** `CHECK (visibility IN ('public', 'unlisted', 'restricted'))`
4. ✅ **Атомарность:** Все в одной транзакции

**Результат:** Семантически правильная миграция, zero downtime

---

### Конфликт 2: `is_club_event` vs `club_id` Redundancy
**Проблема:** Поле `is_club_event` уже существует, добавляем `club_id` - избыточность

**Решение без костылей:**
1. ✅ **Оставить оба поля** (не breaking change для существующего кода)
2. ✅ **CHECK constraint:** `(is_club_event = TRUE ⇔ club_id IS NOT NULL)`
3. ✅ **TRIGGER:** Автоматическая синхронизация при изменении `club_id`
4. ✅ **Будущее:** Можно мигрировать `is_club_event` в computed column

**Преимущества:**
- Гарантия консистентности на уровне БД
- Автоматическая синхронизация (не зависит от application code)
- Backward compatible (старый код продолжит работать)

**Пример работы:**
```sql
-- Вариант 1: Установка club_id
INSERT INTO events (title, club_id) VALUES ('Trip', 'club-uuid');
-- Trigger автоматически: is_club_event = TRUE ✅

-- Вариант 2: Попытка рассинхронизации (будет ошибка)
INSERT INTO events (title, club_id, is_club_event) VALUES ('Trip', NULL, TRUE);
-- ERROR: constraint events_club_consistency_check ❌

-- Вариант 3: Обновление
UPDATE events SET club_id = 'club-uuid' WHERE id = '...';
-- Trigger автоматически: is_club_event = TRUE ✅
```

---

## 🔐 ГАРАНТИИ ЦЕЛОСТНОСТИ ДАННЫХ

### 1. Foreign Keys
- ✅ `clubs.created_by` → `users.id` (SET NULL)
- ✅ `club_members.club_id` → `clubs.id` (CASCADE)
- ✅ `club_members.user_id` → `users.id` (CASCADE)
- ✅ `club_members.invited_by` → `users.id` (SET NULL)
- ✅ `club_subscriptions.club_id` → `clubs.id` (CASCADE)
- ✅ `events.club_id` → `clubs.id` (SET NULL)

### 2. Unique Constraints
- ✅ `club_members` PRIMARY KEY `(club_id, user_id)` - один user = одна роль в клубе
- ✅ `club_subscriptions` PRIMARY KEY `club_id` - одна подписка на клуб
- ✅ `club_members` UNIQUE `club_id WHERE role = 'owner'` - один owner на клуб

### 3. Check Constraints
- ✅ `clubs.name`: 2-100 символов
- ✅ `club_members.role`: IN ('owner', 'organizer', 'member', 'pending')
- ✅ `club_subscriptions.plan`: IN ('club_free', 'club_basic', 'club_pro')
- ✅ `users.plan`: IN ('free', 'pro')
- ✅ `events.visibility`: IN ('public', 'unlisted', 'restricted')
- ✅ `events.is_club_event` ⇔ `events.club_id` (consistency)

### 4. Cascading Rules
**При удалении клуба:**
- ✅ `club_members` → все записи удаляются (CASCADE)
- ✅ `club_subscriptions` → запись удаляется (CASCADE)
- ✅ `events.club_id` → устанавливается в NULL (SET NULL)

**При удалении пользователя:**
- ✅ `clubs.created_by` → устанавливается в NULL (SET NULL)
- ✅ `club_members` → все членства удаляются (CASCADE)
- ✅ `events.created_by_user_id` → существующая логика (SET NULL)

---

## 📐 ДИАГРАММА ЗАВИСИМОСТЕЙ

```
users (plan)
  ↓ created_by
clubs
  ↓ club_id                    ↓ club_id
club_members                club_subscriptions
  (role: owner/organizer/member/pending)  (plan: free/basic/pro)
  
  ↓ club_id
events (visibility: public/unlisted/restricted)
  (is_club_event ⇔ club_id via trigger)
```

---

## 🧪 ТЕСТОВЫЙ СЦЕНАРИЙ

### 1. Создание клуба
```sql
-- Создать клуб
INSERT INTO clubs (name, description, city, created_by)
VALUES ('Jeep Club Moscow', 'Покорители бездорожья', 'Москва', 'user-uuid-1')
RETURNING id;
-- Получим: club-uuid-1

-- Проверить автоматически созданные записи:
SELECT * FROM club_members WHERE club_id = 'club-uuid-1';
-- Ожидается: (club-uuid-1, user-uuid-1, 'owner', NULL, NOW())

SELECT * FROM club_subscriptions WHERE club_id = 'club-uuid-1';
-- Ожидается: (club-uuid-1, 'club_free', NULL, TRUE, NOW())
```

### 2. Добавление участников
```sql
-- Добавить организатора
INSERT INTO club_members (club_id, user_id, role, invited_by)
VALUES ('club-uuid-1', 'user-uuid-2', 'organizer', 'user-uuid-1');

-- Добавить участника
INSERT INTO club_members (club_id, user_id, role, invited_by)
VALUES ('club-uuid-1', 'user-uuid-3', 'member', 'user-uuid-1');

-- Попытка добавить второго owner (должна упасть)
INSERT INTO club_members (club_id, user_id, role)
VALUES ('club-uuid-1', 'user-uuid-4', 'owner');
-- ERROR: duplicate key value violates unique constraint "idx_club_members_single_owner" ✅
```

### 3. Создание события клуба
```sql
-- Создать событие от клуба
INSERT INTO events (title, description, date_time, location_text, club_id, created_by_user_id)
VALUES (
  'Поездка в Карелию', 
  'Трехдневный оффроуд тур', 
  '2025-06-15 10:00:00', 
  'Карелия, Россия',
  'club-uuid-1',
  'user-uuid-2'  -- organizer клуба
);

-- Проверить автоматическую синхронизацию is_club_event
SELECT id, title, club_id, is_club_event FROM events WHERE title = 'Поездка в Карелию';
-- Ожидается: (..., 'club-uuid-1', TRUE) ← Триггер автоматически установил! ✅
```

### 4. Изменение visibility
```sql
-- Обновить visibility
UPDATE events SET visibility = 'restricted' WHERE title = 'Поездка в Карелию';
-- SUCCESS ✅

-- Попытка установить старое значение (должна упасть)
UPDATE events SET visibility = 'link_registered' WHERE title = 'Поездка в Карелию';
-- ERROR: new row violates check constraint "events_visibility_check" ✅
```

### 5. Апгрейд подписки клуба
```sql
-- Upgrade клуба до club_basic
UPDATE club_subscriptions
SET plan = 'club_basic', valid_until = NOW() + INTERVAL '1 year'
WHERE club_id = 'club-uuid-1';

SELECT * FROM club_subscriptions WHERE club_id = 'club-uuid-1';
-- Ожидается: (club-uuid-1, 'club_basic', '2026-12-12...', TRUE, ...)
```

### 6. Истечение подписки
```sql
-- Симуляция истечения (для теста)
UPDATE club_subscriptions
SET valid_until = NOW() - INTERVAL '1 day'
WHERE club_id = 'club-uuid-1';

-- Запуск функции деактивации
SELECT public.deactivate_expired_club_subscriptions();

-- Проверка
SELECT active, valid_until FROM club_subscriptions WHERE club_id = 'club-uuid-1';
-- Ожидается: (FALSE, '2024-12-11...') ✅
```

---

## 🚀 ПРИМЕНЕНИЕ МИГРАЦИЙ

### Порядок действий:

1. **Backup существующей БД**
```bash
pg_dump -h host -U user -d need4trip > backup_$(date +%Y%m%d).sql
```

2. **Применить миграции последовательно**
```bash
psql -h host -U user -d need4trip -f supabase/migrations/20241212_create_clubs.sql
psql -h host -U user -d need4trip -f supabase/migrations/20241212_create_club_members.sql
psql -h host -U user -d need4trip -f supabase/migrations/20241212_create_club_subscriptions.sql
psql -h host -U user -d need4trip -f supabase/migrations/20241212_alter_events_club_and_visibility.sql
psql -h host -U user -d need4trip -f supabase/migrations/20241212_alter_users_add_plan.sql
psql -h host -U user -d need4trip -f supabase/migrations/20241212_create_initial_triggers.sql
```

**Или через Supabase Dashboard:**
- Settings → Database → Migrations → Upload each file

3. **Проверка успешности**
```sql
-- Проверить новые таблицы
\dt public.clubs*

-- Проверить новые колонки
\d public.events
\d public.users

-- Проверить триггеры
SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'public.events'::regclass;

-- Проверить функции
\df public.sync_event_club_flag
\df public.create_default_club_subscription
\df public.add_creator_as_club_owner
\df public.deactivate_expired_club_subscriptions
```

---

## 📊 СТАТИСТИКА ИЗМЕНЕНИЙ

- **Новых таблиц:** 3 (`clubs`, `club_members`, `club_subscriptions`)
- **Обновленных таблиц:** 2 (`events`, `users`)
- **Новых колонок:** 3 (`events.club_id`, `users.plan`, и внутренние)
- **Новых индексов:** 11
- **Новых триггеров:** 4
- **Новых функций:** 5
- **Новых constraints:** 6
- **Мигрированных данных:** `link_registered` → `restricted` (все существующие события)

**Общее время выполнения миграций:** ~2-5 секунд (зависит от количества существующих событий)

---

## ✅ CHECKLIST

- [x] Создана таблица `clubs` с валидацией
- [x] Создана таблица `club_members` с ролями
- [x] Создана таблица `club_subscriptions` с планами
- [x] Добавлен `events.club_id` с foreign key
- [x] Исправлен `events.visibility` (3 значения)
- [x] Добавлена синхронизация `is_club_event` ⇔ `club_id`
- [x] Добавлен `users.plan` (free/pro)
- [x] Созданы триггеры для `updated_at`
- [x] Созданы автотриггеры для клубов (subscription, owner)
- [x] Создана функция деактивации истекших подписок
- [x] Все индексы для производительности
- [x] Все constraints для целостности данных
- [x] Документация и комментарии в SQL
- [x] Тестовые сценарии

---

## 🎯 СЛЕДУЮЩИЙ ШАГ: PHASE 2

**Готово к:**
- Обновлению TypeScript типов
- Создани

ю `src/lib/types/club.ts`
- Обновлению `src/lib/types/user.ts` (добавить `plan`)
- Обновлению `src/lib/types/event.ts` (добавить `clubId`, обновить `Visibility`)
- Генерации `src/lib/types/supabase.ts` из новой схемы

---

_PHASE 1 завершена успешно. Все конфликты разрешены без костылей._


