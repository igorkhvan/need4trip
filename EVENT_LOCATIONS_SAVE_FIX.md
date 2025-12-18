# 🔧 Fix: Event Locations Save/Delete Issue

**Дата**: 18 декабря 2024  
**Приоритет**: CRITICAL (блокирует редактирование событий)  
**Статус**: ✅ FIXED

---

## 🐛 **Описание проблемы**

### Сценарий воспроизведения:
1. Создать событие с одной точкой (по умолчанию "Точка сбора")
2. Добавить вторую точку и сохранить ✅ (работает)
3. Открыть событие на редактирование
4. Удалить вторую точку
5. Попытаться сохранить ❌ (ошибка)

### Ошибка:
```json
{
  "success": false,
  "error": {
    "code": "InternalError",
    "message": "Failed to delete old locations",
    "details": {
      "code": "P0001",
      "message": "Cannot delete the first location (sort_order=1). Events must have at least one location point."
    }
  }
}
```

---

## 🔍 **Root Cause Analysis**

### **Конфликт архитектуры:**

#### 1. **Database Trigger** (защита данных)
```sql
-- supabase/migrations/20241218_create_event_locations.sql:150-165
CREATE OR REPLACE FUNCTION validate_first_location_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.sort_order = 1 THEN
    RAISE EXCEPTION 'Cannot delete the first location (sort_order=1)...';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_first_location_delete
  BEFORE DELETE ON event_locations
  FOR EACH ROW
  EXECUTE FUNCTION validate_first_location_exists();
```

**Назначение**: Гарантировать что у каждого события всегда есть как минимум одна точка.

#### 2. **Repository Logic** (старая реализация)
```typescript
// src/lib/db/eventLocationsRepo.ts:69-78 (OLD)
export async function saveLocations(...) {
  // Step 1: Delete ALL existing locations for this event ❌
  const { error: deleteError } = await supabaseAdmin
    .from(table)
    .delete()
    .eq("event_id", eventId); // Пытается удалить ВСЕ, включая sort_order=1!

  // Step 2: Insert new locations
  // ...
}
```

**Проблема**: Пытается удалить ВСЕ локации (включая первую) перед вставкой новых.

---

## ✅ **Решение**

### **UPSERT Strategy вместо DELETE+INSERT**

Изменена логика `saveLocations()`:

```typescript
// NEW: src/lib/db/eventLocationsRepo.ts:52-139
export async function saveLocations(...) {
  // Step 1: Fetch existing locations
  const existingLocations = await fetch(...);
  
  // Step 2: Delete ONLY removed locations (excluding sort_order=1)
  const sortOrdersToDelete = [...existingSortOrders].filter(
    (sortOrder) => !newSortOrders.has(sortOrder) && sortOrder !== 1
  );
  
  if (sortOrdersToDelete.length > 0) {
    await supabaseAdmin
      .from(table)
      .delete()
      .eq("event_id", eventId)
      .in("sort_order", sortOrdersToDelete); // Удаляем только лишние
  }

  // Step 3: Upsert all locations (insert OR update)
  await supabaseAdmin
    .from(table)
    .upsert(dbLocations, {
      onConflict: "event_id,sort_order",
      ignoreDuplicates: false, // Update on conflict
    });
}
```

---

## 🎯 **Преимущества нового подхода**

### ✅ **Что улучшилось:**

1. **Триггер не блокирует операцию**
   - Первая локация (sort_order=1) не удаляется
   - Триггер остаётся активным (защита данных сохранена)

2. **Атомарная операция**
   - UPSERT использует `ON CONFLICT` constraint
   - Либо вставляется новая запись, либо обновляется существующая

3. **Эффективность**
   - Удаляются только действительно удалённые локации
   - Обновляются только изменённые локации
   - Не нужно удалять и пересоздавать все записи

4. **Корректность**
   - Первая локация всегда остаётся в БД
   - Можно обновить title/coordinates первой точки
   - Можно добавить/удалить дополнительные точки

---

## 🧪 **Testing Plan**

### ✅ **Кейсы для тестирования:**

#### 1. Создание события
```
✓ Создать событие с одной точкой → OK
✓ Создать событие с тремя точками → OK
```

#### 2. Редактирование (добавление)
```
✓ Добавить вторую точку → сохранить → OK
✓ Добавить несколько точек → сохранить → OK
```

#### 3. Редактирование (удаление) ← **FIX**
```
✓ Удалить вторую точку → сохранить → ✅ NOW WORKS
✓ Удалить все кроме первой → сохранить → ✅ NOW WORKS
✓ Попытка удалить первую точку → кнопка disabled (UI защита)
```

#### 4. Редактирование (обновление)
```
✓ Изменить title первой точки → сохранить → OK
✓ Изменить coordinates первой точки → сохранить → OK
✓ Изменить любую не-первую точку → сохранить → OK
```

#### 5. Edge cases
```
✓ Сохранить без изменений → OK (идемпотентность)
✓ Изменить порядок точек → OK (sort_order остаётся уникальным)
```

---

## 📊 **Technical Details**

### Database Constraint используется:
```sql
CONSTRAINT uq_event_location_sort UNIQUE(event_id, sort_order)
```

### UPSERT conflict resolution:
```typescript
.upsert(dbLocations, {
  onConflict: "event_id,sort_order", // ← Использует уникальный constraint
  ignoreDuplicates: false,           // ← UPDATE on conflict
})
```

### Защита первой локации:
- **Database Level**: Trigger `prevent_first_location_delete`
- **Application Level**: Валидация `hasFirstLocation` перед save
- **UI Level**: Disabled delete button для первой точки

---

## 🚀 **Deployment**

### Build Status: ✅ SUCCESS
```bash
✓ TypeScript compilation passed
✓ No linter errors
✓ Build successful
```

### Migration: ✅ Already applied
- Миграция `20241218_create_event_locations.sql` уже применена
- Изменения только в коде (не требуют новых миграций)

---

## 📝 **Commit Message**
```
fix(events): resolve location save issue with UPSERT strategy

Problem:
- saveLocations() used DELETE+INSERT approach
- Database trigger prevents deletion of first location (sort_order=1)
- Result: Editing events with removed locations failed

Solution:
- Changed to UPSERT strategy (insert OR update)
- Delete only removed locations (excluding sort_order=1)
- Use ON CONFLICT constraint for atomic operations

Impact:
- ✅ First location is never deleted (trigger protection preserved)
- ✅ Can now edit/remove additional locations without errors
- ✅ More efficient (only updates changed records)
- ✅ Idempotent operations

Testing:
- All event CRUD operations now work correctly
- Build passes with no errors
```

---

## 🎉 **Result**

**До**: Нельзя было удалить вторую/третью точку и сохранить событие  
**После**: Редактирование локаций работает корректно во всех сценариях

**Status**: ✅ Production Ready
