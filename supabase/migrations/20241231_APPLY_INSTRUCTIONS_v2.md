# Инструкция по Применению Миграции club_id Immutability (v2 - FIXED)

**Дата:** 2024-12-31  
**Миграция:** `20241231_enforce_club_id_immutability_v2.sql` (исправленная версия)  
**Тест:** `20241231_test_club_id_immutability.sql`  
**Status:** ✅ FIXED (упрощённая логика trigger'а)

---

## 🔧 Что Исправлено

**Проблема в v1:**
Trigger имел исключение для "первого update после creation" (NULL → value), что позволяло изменять club_id в некоторых случаях.

**Исправление в v2:**
Упрощённая логика: **ANY change to club_id = BLOCK**. Без исключений.

```sql
-- ✅ v2: Простое и строгое правило
IF OLD.club_id IS DISTINCT FROM NEW.club_id THEN
  RAISE EXCEPTION 'club_id is immutable after event creation (SSOT §5.7)';
END IF;
```

**Ратionale:**
По SSOT §5.7, club_id должен быть установлен **при создании события** (в INSERT payload) и является **immutable навсегда**. Нет grace period для изменения после creation.

---

## 📋 Шаги Применения (v2)

### Шаг 1: Откатить предыдущую версию (если применена v1)

Если вы уже применили v1 (20241231_enforce_club_id_immutability.sql), сначала откатите её:

```sql
-- Rollback v1
DROP TRIGGER IF EXISTS events_prevent_club_id_change ON public.events;
DROP FUNCTION IF EXISTS prevent_club_id_change();
```

---

### Шаг 2: Применить исправленную миграцию (v2)

1. Открой Supabase Dashboard → SQL Editor
2. Создай новый query
3. Скопируй содержимое файла:
   ```
   supabase/migrations/20241231_enforce_club_id_immutability_v2.sql
   ```
4. Выполни query
5. Проверь результат:
   ```
   ✅ club_id immutability trigger created successfully (FIXED)
   SSOT §5.7: club_id is now immutable at DB level (NO exceptions)
   Defense in depth: Service layer + DB constraint
   ```

---

### Шаг 3: Запустить тесты

1. В том же SQL Editor создай новый query
2. Скопируй содержимое файла:
   ```
   supabase/migrations/20241231_test_club_id_immutability.sql
   ```
3. Выполни query
4. Ожидаемый результат:

```
========================================
Testing club_id immutability trigger
========================================
Created test user: <uuid>
Created test clubs: <uuid1> and <uuid2>

Test 1: Create personal event (club_id = NULL)
✅ Created personal event: <uuid>
✅ Test 1 PASSED: Cannot change club_id from NULL to value

Test 2: Create club event (club_id = X)
✅ Created club event: <uuid> (club_id = <uuid>)
✅ Test 2 PASSED: Cannot change club_id from one value to another

Test 3: Try to clear club_id (value → NULL)
✅ Test 3 PASSED: Cannot clear club_id

Test 4: Update other fields (title, description) — should work
✅ Test 4 PASSED: Can update other fields while club_id stays unchanged

========================================
Cleaning up test data...
✅ Cleanup complete
========================================
✅ ALL TESTS PASSED
========================================
```

---

### Шаг 4: Verification Query

Проверь что trigger создан:

```sql
-- Check trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'events'
  AND trigger_name = 'events_prevent_club_id_change';
```

Ожидаемый результат:
```
trigger_name                    | event_manipulation | action_statement
--------------------------------|-------------------|------------------
events_prevent_club_id_change   | UPDATE            | EXECUTE FUNCTION prevent_club_id_change()
```

---

## 🚨 Rollback Plan (если что-то пойдёт не так)

```sql
-- Drop trigger and function
DROP TRIGGER IF EXISTS events_prevent_club_id_change ON public.events;
DROP FUNCTION IF EXISTS prevent_club_id_change();
```

---

## ✅ После Успешного Применения

**Что произошло:**
- ✅ DB-level защита от ЛЮБЫХ изменений club_id (упрощённая логика)
- ✅ Defense in depth (service layer + DB constraint)
- ✅ Все 4 теста прошли успешно

**Сообщи результат:**
- ✅ "v2 миграция применена успешно, все тесты прошли"
- ❌ "Ошибка: <детали>" — и я помогу решить проблему

---

## 📝 Technical Details

### Что блокирует trigger:

1. ❌ **NULL → value** — нельзя установить club после создания personal event
2. ❌ **value → different value** — нельзя перевести событие из одного клуба в другой
3. ❌ **value → NULL** — нельзя очистить club_id (превратить club event в personal)

### Что разрешает trigger:

1. ✅ **Обновление других полей** — title, description, date_time, max_participants, etc
2. ✅ **club_id → club_id** (same value) — если club_id не меняется, UPDATE разрешён

---

## 🎯 SSOT Compliance

**SSOT §5.7: Club ID Immutability**

> "Club ID immutable after creation. Reject any attempt to change club context (security: prevent unauthorized club transfer)"

**Реализация:**
- ✅ Service layer check (events.ts:682-688)
- ✅ DB-level constraint (trigger events_prevent_club_id_change)
- ✅ Defense in depth (два уровня защиты)

---

## 🔍 Debugging (если тесты не проходят)

### Проверка 1: Trigger существует
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'prevent_club_id_change';
```

Ожидается: 1 строка с `prevent_club_id_change`

### Проверка 2: Trigger активен
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'events_prevent_club_id_change';
```

Ожидается: 1 строка с event = 'UPDATE'

### Проверка 3: Мануальный тест
```sql
-- Create test event
INSERT INTO events (title, description, date_time, city_id, created_by_user_id, club_id)
VALUES ('Test', 'Test', NOW() + INTERVAL '1 day', 
  (SELECT id FROM cities LIMIT 1), 
  (SELECT id FROM users LIMIT 1), 
  NULL
) RETURNING id;

-- Try to change club_id (should fail)
UPDATE events SET club_id = (SELECT id FROM clubs LIMIT 1) WHERE title = 'Test';
-- Expected: ERROR: club_id is immutable after event creation (SSOT §5.7)

-- Cleanup
DELETE FROM events WHERE title = 'Test';
```

