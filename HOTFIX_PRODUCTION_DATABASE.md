# 🚨 HOTFIX: Production Database Error

## ❌ Ошибка

```json
{
  "error": {
    "code": "42703",
    "message": "column \"plan\" of relation \"club_subscriptions\" does not exist"
  }
}
```

**URL:** POST `/api/clubs` (создание клуба)

---

## 🔍 Причина

Триггер в БД использует **старый формат** таблицы `club_subscriptions`:

```sql
-- Старый триггер (НЕ совместим с v2.0!)
INSERT INTO public.club_subscriptions (club_id, plan, valid_until, active)
VALUES (NEW.id, 'club_free', NULL, TRUE)
```

Но колонки `plan`, `valid_until`, `active` были **удалены** миграцией v2.0!

---

## ✅ БЫСТРОЕ ИСПРАВЛЕНИЕ

### Вариант 1: Удалить триггер (РЕКОМЕНДУЕТСЯ)

В v2.0 Free клубы **не должны** иметь записи в `club_subscriptions`.

**Выполни в Supabase SQL Editor:**

```sql
-- 1. Удалить триггер
DROP TRIGGER IF EXISTS trigger_create_club_subscription ON public.clubs;

-- 2. Удалить функцию
DROP FUNCTION IF EXISTS public.create_default_club_subscription();

-- 3. Проверка
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_club_subscription';
-- Должно быть пусто!
```

✅ **После этого создание клубов заработает!**

---

### Вариант 2: Обновить триггер (если нужен)

Если по какой-то причине нужен триггер, обнови его на v2.0:

```sql
-- Удалить старый
DROP TRIGGER IF EXISTS trigger_create_club_subscription ON public.clubs;
DROP FUNCTION IF EXISTS public.create_default_club_subscription();

-- Создать новый (v2.0 - НЕ создает запись для Free)
CREATE OR REPLACE FUNCTION public.log_club_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- В v2.0 ничего не создаем! Free = отсутствие записи
  -- Этот триггер только для логирования (опционально)
  RAISE NOTICE 'Club created: %, Free plan (no subscription record)', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_club_creation
  AFTER INSERT ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_club_creation();
```

---

## 📋 Полная миграция БД (если еще не сделана)

Если миграции v2.0 еще не применены, следуй порядку в `MIGRATION_GUIDE_STEP_BY_STEP.md`:

1. ✅ CREATE `club_plans`
2. ✅ SEED `club_plans`
3. ✅ ALTER `club_subscriptions` (v2.0)
4. ✅ **DROP старый триггер** ← ТЫ ЗДЕСЬ
5. ✅ ADD FK `club_subscriptions → club_plans`
6. ✅ CREATE + SEED `billing_policy`
7. ✅ CREATE + SEED `billing_policy_actions`
8. ✅ CREATE `billing_transactions`

---

## 🧪 Проверка исправления

После удаления триггера протестируй:

### 1. Создание клуба

```bash
curl -X POST https://need4trip.app/api/clubs \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{
    "name": "Test Club",
    "cityIds": ["CITY_UUID"]
  }'
```

**Ожидаем:** `201 Created` с данными клуба

### 2. Проверка БД

```sql
-- Клуб создан
SELECT * FROM clubs WHERE name = 'Test Club';

-- Подписки НЕТ (Free = отсутствие)
SELECT * FROM club_subscriptions WHERE club_id = 'CLUB_UUID_FROM_ABOVE';
-- Должно быть пусто!

-- Owner добавлен
SELECT * FROM club_members WHERE club_id = 'CLUB_UUID_FROM_ABOVE';
-- Должна быть 1 строка: role = 'owner'
```

---

## 📦 Миграционный файл

Создан: `supabase/migrations/20241215_drop_auto_subscription_trigger.sql`

**Содержит:**
- DROP trigger
- DROP function
- Verification checks

**Применить:**

```bash
# Локально (если используешь Supabase CLI)
supabase migration up

# Или вручную в Supabase Dashboard
# SQL Editor → New Query → Скопируй содержимое файла → Run
```

---

## ⚠️ Откат (если что-то пошло не так)

Если нужно вернуть старый триггер (НЕ рекомендуется):

```sql
-- Восстановить старый триггер
CREATE OR REPLACE FUNCTION public.create_default_club_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.club_subscriptions (club_id, plan, valid_until, active)
  VALUES (NEW.id, 'club_free', NULL, TRUE)
  ON CONFLICT (club_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_club_subscription
  AFTER INSERT ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_club_subscription();
```

**НО:** Это сработает только если вернуть старую структуру `club_subscriptions`!

---

## 🎯 Итог

### Быстрое решение (1 минута):

```sql
DROP TRIGGER IF EXISTS trigger_create_club_subscription ON public.clubs;
DROP FUNCTION IF EXISTS public.create_default_club_subscription();
```

✅ **Проблема решена!**

### Правильное решение (полная миграция):

Следуй `MIGRATION_GUIDE_STEP_BY_STEP.md` для миграции всей системы биллинга на v2.0.

---

**Дата:** 15 декабря 2025  
**Статус:** ✅ ГОТОВО К ПРИМЕНЕНИЮ
