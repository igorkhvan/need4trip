# Инструкция по Применению Миграции club_id Immutability

**Дата:** 2024-12-31  
**Миграция:** `20241231_enforce_club_id_immutability.sql`  
**Тест:** `20241231_test_club_id_immutability.sql`  

---

## 🎯 Что Делает Миграция

Добавляет DB-level trigger для enforcement immutability `club_id` после создания события.

**Защита:**
- ❌ Блокирует изменение `club_id` с одного значения на другое
- ❌ Блокирует очистку `club_id` (value → NULL)
- ✅ Разрешает обновление других полей (title, description, etc)

**SSOT Reference:** §5.7 Club ID Immutability

---

## 📋 Шаги Применения

### Шаг 1: Применить миграцию через Supabase Dashboard

1. Открой Supabase Dashboard → SQL Editor
2. Создай новый query
3. Скопируй содержимое файла:
   ```
   supabase/migrations/20241231_enforce_club_id_immutability.sql
   ```
4. Выполни query
5. Проверь результат:
   ```
   ✅ club_id immutability trigger created successfully
   SSOT §5.7: club_id is now immutable at DB level
   Defense in depth: Service layer + DB constraint
   ```

---

### Шаг 2: Запустить тесты

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

### Шаг 3: Verification Query

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
- ✅ DB-level защита от изменения club_id
- ✅ Defense in depth (service layer + DB constraint)
- ✅ Все 4 теста прошли успешно

**Сообщи мне результат:**
- ✅ "Миграция применена успешно, все тесты прошли"
- ❌ "Ошибка: <детали>" — и я помогу решить проблему

---

## 📝 Notes

**Почему это важно:**
- Даже если service layer будет обойдён (buggy code, direct DB access), БД защитит от изменения club_id
- Гарантирует data integrity на последнем рубеже защиты
- Соответствует принципу "defense in depth"

**Impact:**
- Нет влияния на production code (только дополнительная защита)
- Нет breaking changes (trigger только блокирует некорректные операции)

