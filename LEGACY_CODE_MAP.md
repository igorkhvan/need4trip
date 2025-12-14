# 🗺️ Карта Legacy Code (Billing v1.0)

> Автоматически сгенерировано: 2025-12-15
> 
> Этот файл отслеживает все места, где сохранена **старая логика биллинга** для обратной совместимости.
> После полной миграции на v2.0 эти участки можно **безопасно удалить**.

---

## 📊 Статистика

- **Файлов с legacy кодом:** 3
- **Строк с legacy логикой:** 20+
- **Deprecated функций:** 4

---

## 🔍 Подробная карта

### 1️⃣ `src/lib/types/club.ts`

**Старые типы (сохранены для Zod валидации):**
```typescript
// Line 12-15: DEPRECATED STRING UNION
export const clubPlanSchema = z.enum([
  "club_free", "club_basic", "club_pro",  // ❌ OLD
  "free", "club_50", "club_500", "club_unlimited"  // ✅ NEW
]);
export type ClubPlan = z.infer<typeof clubPlanSchema>;
```

**Старые схемы (Zod):**
```typescript
// Line 129: OLD FIELD (для legacy форм)
validUntil: z.string().datetime().optional().nullable(),
```

**Deprecated функции:**

#### `getClubPlanLabel()` - Line 153-169
```typescript
/**
 * Get localized label for club plan (DEPRECATED)
 */
export function getClubPlanLabel(plan: string): string {
  // Legacy support for old plan IDs
  const labels: Record<string, string> = {
    club_free: "Бесплатный",   // ❌ OLD
    club_basic: "Базовый",     // ❌ OLD
    club_pro: "Про",           // ❌ OLD
    // ... new plans
  };
  return labels[plan] || plan;
}
```

#### `getClubPlanFeatures()` - Line 172-177
```typescript
/**
 * Get plan features description (DEPRECATED)
 */
export function getClubPlanFeatures(planId: string): string[] {
  // Legacy support - return empty for now
  return [];
}
```

#### `getMaxActiveEventsForPlan()` - Line 181-186
```typescript
/**
 * Get max active events for plan (DEPRECATED)
 */
export function getMaxActiveEventsForPlan(planId: string): number | null {
  return null; // Deprecated
}
```

#### `isSubscriptionActive()` - Line 210-222
```typescript
/**
 * Check if subscription is active and not expired (DEPRECATED - legacy support)
 */
export function isSubscriptionActive(subscription: any): boolean {
  // Legacy support
  if (subscription.status) {
    // ✅ New v2.0 format
    return subscription.status === 'active' || subscription.status === 'grace';
  }
  // ❌ Old format
  if (!subscription.active) return false;
  if (!subscription.validUntil) return true;
  return new Date(subscription.validUntil) > new Date();
}
```

**Причина сохранения:**
- Zod схемы используются для валидации API input (могут прийти старые значения)
- Функции помечены как DEPRECATED, но сохранены для обратной совместимости

---

### 2️⃣ `src/lib/utils/eventCategories.ts`

**Legacy типы (категории событий):**
```typescript
// Line 63-66: Legacy code support
export type EventCategoryLegacy = "weekend_trip" | "technical_ride" | ...;

export const LEGACY_CATEGORY_LABELS: Record<EventCategoryLegacy, string> = {
  weekend_trip: "Выезд на выходные",
  // ...
};
```

**Причина сохранения:**
- Старые события в БД могут иметь legacy категории
- Нужен маппинг для отображения в UI

---

### 3️⃣ `src/lib/types/event.ts`

**Legacy enum (категории событий):**
```typescript
// Line 6-16: Legacy enum - kept for backward compatibility
export const eventCategoryLegacySchema = z.enum([
  "weekend_trip",
  "technical_ride",
  // ...
]);
export type EventCategoryLegacy = z.infer<typeof eventCategoryLegacySchema>;
```

**Причина сохранения:**
- Zod схема для валидации старых данных из БД

---

## ✅ План удаления legacy кода

### Этап 1: Проверка БД (перед удалением)
```sql
-- Проверить, есть ли клубы со старыми plan_id
SELECT plan_id, COUNT(*) 
FROM clubs 
WHERE plan_id IN ('club_free', 'club_basic', 'club_pro')
GROUP BY plan_id;

-- Проверить, есть ли события со старыми категориями
SELECT category, COUNT(*) 
FROM events 
WHERE category IN ('weekend_trip', 'technical_ride', ...)
GROUP BY category;
```

### Этап 2: Миграция данных (если нужна)
```sql
-- Мигрировать старые plan_id (если есть)
UPDATE clubs 
SET plan_id = 'free' 
WHERE plan_id = 'club_free';

-- Или удалить старые записи (если не нужны)
```

### Этап 3: Удаление кода
После миграции данных можно безопасно удалить:

1. **В `src/lib/types/club.ts`:**
   - Строки 159-161 (labels для `club_free`, `club_basic`, `club_pro`)
   - Весь блок "Old format" в `isSubscriptionActive()` (строки 218-221)
   - Функции `getClubPlanFeatures()`, `getMaxActiveEventsForPlan()` (если не используются)

2. **В `src/lib/types/club.ts` (Zod схемы):**
   - `"club_free", "club_basic", "club_pro"` из `clubPlanSchema` enum (строка 14)
   - `validUntil` из Zod схемы (строка 129)

3. **В `src/lib/utils/eventCategories.ts` + `src/lib/types/event.ts`:**
   - Весь блок legacy категорий (после миграции событий)

---

## 🎯 Текущий статус

- ✅ **Новый код (v2.0) работает** полностью
- ⚠️ **Legacy код сохранён** для обратной совместимости
- 🔄 **Миграция данных** - ожидает проверки БД
- ❌ **Удаление legacy** - запланировано после миграции

---

## 📝 Заметки

- **Не удалять без проверки БД!** Старые данные могут сломать приложение.
- **Тесты:** Перед удалением добавить тесты на новую логику.
- **Rollback plan:** Сохранить git тег перед удалением legacy кода.

---

_Этот файл можно использовать как чеклист при финальной очистке кода._
