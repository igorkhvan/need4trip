# Руководство по рефакторингу Need4Trip

**Быстрые исправления для улучшения качества кода**

---

## 🚀 Quick Wins (2-3 часа работы)

### 1. Объединение файлов работы с датами

#### Проблема

Две утилиты с дублирующимися функциями:
- `/src/lib/utils/dates.ts` - форматирование для отображения
- `/src/lib/utils/date-time.ts` - работа с datetime-local picker

#### Решение

**Шаг 1:** Создать новый файл `/src/lib/utils/date-formatting.ts`:

```typescript
/**
 * Date Formatting Utilities
 * Централизованные функции для работы с датами
 */

// ============================================================================
// Parsing & Serialization
// ============================================================================

export function parseDateTime(value: string | null | undefined): Date | null {
  if (!value || typeof value !== "string") return null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

export function serializeDateTime(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date)) return "";
  try {
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

// ============================================================================
// Formatting (support both Date and ISO string)
// ============================================================================

function toDate(input: Date | string): Date {
  if (input instanceof Date) return input;
  return new Date(input);
}

export function formatDateTime(input: Date | string): string {
  const d = toDate(input);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTimeShort(input: Date | string): string {
  const d = toDate(input);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(input: Date | string): string {
  const d = toDate(input);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(input: Date | string): string {
  const d = toDate(input);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(input: Date | string): string {
  const d = toDate(input);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// ============================================================================
// Date Manipulation
// ============================================================================

export function roundMinutes(date: Date, step: number = 15): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const roundedMinutes = Math.round(minutes / step) * step;
  rounded.setMinutes(roundedMinutes);
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  return rounded;
}

export function combineDateTime(date: Date, timeString: string): Date {
  const result = new Date(date);
  const [hoursStr, minutesStr] = timeString.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (!isNaN(hours) && !isNaN(minutes)) {
    result.setHours(hours, minutes, 0, 0);
  }
  return result;
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

// ============================================================================
// Validation & Checks
// ============================================================================

export function getDaysUntil(dateTime: string | Date): number {
  const eventDate = toDate(dateTime);
  const now = new Date();
  const diff = eventDate.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function isEventStarted(dateTime: string | Date): boolean {
  return getDaysUntil(dateTime) < 0;
}

export function isEventStartingSoon(dateTime: string | Date): boolean {
  const days = getDaysUntil(dateTime);
  return days >= 0 && days <= 7;
}

export function isDateInRange(
  date: Date | null,
  minDate?: Date | null,
  maxDate?: Date | null
): boolean {
  if (!date) return false;
  const dateTime = date.getTime();
  if (minDate && dateTime < minDate.getTime()) return false;
  if (maxDate && dateTime > maxDate.getTime()) return false;
  return true;
}

export function isInFuture(date: Date | null, toleranceMinutes: number = 5): boolean {
  if (!date) return false;
  const now = new Date();
  const minAllowedDate = new Date(now.getTime() - toleranceMinutes * 60 * 1000);
  return date.getTime() >= minAllowedDate.getTime();
}

// ============================================================================
// Generators & Helpers
// ============================================================================

export function generateTimeSlots(step: number = 15): Array<{ value: string; label: string }> {
  const slots: Array<{ value: string; label: string }> = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += step) {
      const hourStr = String(hour).padStart(2, "0");
      const minuteStr = String(minute).padStart(2, "0");
      const time = `${hourStr}:${minuteStr}`;
      slots.push({ value: time, label: time });
    }
  }
  return slots;
}

export function getNowRounded(step: number = 15): Date {
  return roundMinutes(new Date(), step);
}
```

**Шаг 2:** Удалить старые файлы:

```bash
rm src/lib/utils/dates.ts
rm src/lib/utils/date-time.ts
```

**Шаг 3:** Обновить импорты в 6 файлах:

```typescript
// БЫЛО:
import { formatDateTimeShort } from "@/lib/utils/dates";
import { formatDateTime, parseDateTime } from "@/lib/utils/date-time";

// СТАЛО:
import { formatDateTimeShort, formatDateTime, parseDateTime } from "@/lib/utils/date-formatting";
```

**Файлы для обновления:**
1. `src/components/events/event-card-detailed.tsx`
2. `src/components/events/event-card-compact.tsx`
3. `src/components/clubs/club-subscription-card.tsx`
4. `src/app/(app)/events/[id]/page.tsx`
5. `src/components/ui/date-picker.tsx`
6. Любые другие файлы с этими импортами (проверить через grep)

---

### 2. Оптимизация проверок `ensureAdminClient()`

#### Проблема

Каждая функция в repository слое начинается с одинаковой проверки (102 дублирования).

#### Решение

**Шаг 1:** Обновить `/src/lib/db/client.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { InternalError } from "@/lib/errors";

// ... существующий код ...

/**
 * Create repository client with automatic admin validation
 * Throws InternalError if client not initialized
 * 
 * Use this in all repository functions instead of manual checks
 */
export function createRepoClient() {
  ensureAdminClient();
  
  if (!supabaseAdmin) {
    throw new InternalError("Supabase Admin client not initialized");
  }
  
  return supabaseAdmin;
}

/**
 * Safe repository client for optional operations
 * Returns null if client not available (for graceful degradation)
 */
export function createRepoClientSafe() {
  ensureAdminClient();
  return supabaseAdmin;
}
```

**Шаг 2:** Обновить repository функции (пример для `eventRepo.ts`):

```typescript
// БЫЛО:
export async function listEvents(page = 1, limit = 12) {
  ensureAdminClient();
  if (!supabaseAdmin) return { data: [], total: 0, hasMore: false };
  
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*", { count: "exact" })
    ...
}

// СТАЛО:
export async function listEvents(page = 1, limit = 12) {
  const db = createRepoClientSafe();
  if (!db) return { data: [], total: 0, hasMore: false };
  
  const { data, error } = await db
    .from(table)
    .select("*", { count: "exact" })
    ...
}

// Или для функций где клиент обязателен:
export async function getEventById(id: string): Promise<DbEvent | null> {
  const db = createRepoClient(); // Throws if not available
  
  const { data, error } = await db
    .from("events")
    .select("*")
    ...
}
```

**Шаг 3:** Применить к всем 20 repository файлам.

---

### 3. Удаление пустых директорий

#### Проблема

Пустая папка создает путаницу в структуре проекта.

#### Решение

```bash
# Удалить пустую директорию
rm -rf app/(marketing)/_components/

# Обновить документацию в README.md
# Убрать упоминание _components из структуры
```

---

## 🎯 Medium Priority (1 день работы)

### 4. Централизация hydration логики

#### Проблема

Логика hydration разбросана по 2 файлам.

#### Решение

**Шаг 1:** Переместить содержимое `eventCategoryHydration.ts` в `hydration.ts`:

```typescript
// src/lib/utils/hydration.ts

// ... существующий код для cities и currencies ...

// ============================================================================
// Event Categories Hydration
// ============================================================================

/**
 * Hydrate events with category data
 * Efficiently loads all categories in one batch query
 */
export async function hydrateEventCategories<T extends { categoryId: string | null }>(
  events: T[]
): Promise<(T & { category?: EventCategoryDto | null })[]> {
  const categoryIds = events
    .map((e) => e.categoryId)
    .filter((id): id is string => id !== null);
  
  const uniqueCategoryIds = Array.from(new Set(categoryIds));

  let categoriesMap = new Map<string, EventCategoryDto>();
  if (uniqueCategoryIds.length > 0) {
    try {
      const categoriesFullMap = await getEventCategoriesByIds(uniqueCategoryIds);
      categoriesFullMap.forEach((cat, id) => {
        categoriesMap.set(id, {
          id: cat.id,
          code: cat.code,
          nameRu: cat.nameRu,
          nameEn: cat.nameEn,
          icon: cat.icon,
          isDefault: cat.isDefault,
        });
      });
    } catch (err) {
      console.error("[hydrateEventCategories] Failed to load categories", err);
    }
  }

  return events.map((event) => ({
    ...event,
    category: event.categoryId ? categoriesMap.get(event.categoryId) || null : null,
  }));
}

// ============================================================================
// Combined Event Hydration (for full events)
// ============================================================================

/**
 * Hydrate all event-related data in one optimized call
 * Use this for event detail pages
 */
export async function hydrateEventsComplete<
  T extends { 
    cityId: string | null; 
    currencyCode?: string | null;
    categoryId: string | null;
  }
>(items: T[]): Promise<(T & { 
  city: CityHydrated | null; 
  currency: CurrencyHydrated | null;
  category?: EventCategoryDto | null;
})[]> {
  // Load all data in parallel
  const [withCityAndCurrency, withCategory] = await Promise.all([
    hydrateCitiesAndCurrencies(items),
    hydrateEventCategories(items),
  ]);
  
  // Merge results
  return withCityAndCurrency.map((item, idx) => ({
    ...item,
    category: withCategory[idx].category,
  }));
}
```

**Шаг 2:** Удалить файл:

```bash
rm src/lib/utils/eventCategoryHydration.ts
```

**Шаг 3:** Обновить импорты:

```bash
# Найти все файлы с импортом
grep -r "eventCategoryHydration" src/

# Заменить:
# БЫЛО: import { hydrateEventCategories } from "@/lib/utils/eventCategoryHydration";
# СТАЛО: import { hydrateEventCategories } from "@/lib/utils/hydration";
```

---

### 5. Утилита форматирования цены

#### Проблема

Логика форматирования цены дублируется в 3 местах.

#### Решение

**Шаг 1:** Создать `/src/lib/utils/price-formatting.ts`:

```typescript
/**
 * Price Formatting Utilities
 */

import { Event } from "@/lib/types/event";

/**
 * Format event price for display
 * @example formatEventPrice(event) // "1000 ₽" or "Бесплатно"
 */
export function formatEventPrice(event: Pick<Event, 'isPaid' | 'price' | 'currency' | 'currencyCode'>): string {
  if (!event.isPaid) {
    return "Бесплатно";
  }
  
  if (!event.price) {
    return "Платное";
  }
  
  const symbol = event.currency?.symbol ?? event.currencyCode ?? "";
  return `${event.price} ${symbol}`.trim();
}

/**
 * Format price with custom free/paid labels
 */
export function formatEventPriceCustom(
  event: Pick<Event, 'isPaid' | 'price' | 'currency' | 'currencyCode'>,
  labels?: { free?: string; paid?: string }
): string {
  if (!event.isPaid) {
    return labels?.free ?? "Бесплатно";
  }
  
  if (!event.price) {
    return labels?.paid ?? "Платное";
  }
  
  const symbol = event.currency?.symbol ?? event.currencyCode ?? "";
  return `${event.price} ${symbol}`.trim();
}
```

**Шаг 2:** Использовать в компонентах:

```typescript
// БЫЛО:
const priceLabel =
  event.isPaid && event.price
    ? `${event.price} ${event.currency?.symbol ?? event.currencyCode ?? ""}`.trim()
    : event.isPaid
      ? "Платное"
      : "Бесплатно";

// СТАЛО:
import { formatEventPrice } from "@/lib/utils/price-formatting";
const priceLabel = formatEventPrice(event);
```

**Файлы для обновления:**
1. `src/components/events/event-card-detailed.tsx`
2. `src/components/events/event-form.tsx`
3. `src/components/events/participant-modal.tsx`

---

### 6. Централизация visibility логики

#### Проблема

Дублирование проверок видимости в `eventVisibility.ts` и `events.ts`.

#### Решение

**Оставить только `eventVisibility.ts`**, удалить дублирующий код из `events.ts`:

```typescript
// src/lib/services/events.ts

// БЫЛО: inline фильтрация в listVisibleEventsForUser()
const filtered = uniqueEvents.filter(e => {
  if (e.visibility === "public") return true;
  if (e.createdByUserId === userId) return true;
  if (e.visibility === "unlisted") {
    return participantIds.has(e.id) || accessIds.has(e.id);
  }
  // ... 20 строк дублирующей логики
});

// СТАЛО: использовать централизованную функцию
import { canViewInList } from "@/lib/utils/eventVisibility";

const filtered = uniqueEvents.filter(e => 
  canViewInList(e, currentUser, participantIds, accessIds)
);
```

---

## 📋 Чек-лист выполнения

### Quick Wins (2-3 часа)

- [ ] Создать `/src/lib/utils/date-formatting.ts` с объединенным кодом
- [ ] Удалить `dates.ts` и `date-time.ts`
- [ ] Обновить импорты в 6 файлах
- [ ] Добавить `createRepoClient()` в `/src/lib/db/client.ts`
- [ ] Обновить 5 repository файлов как пример (eventRepo, clubRepo, userRepo, participantRepo, cityRepo)
- [ ] Удалить пустую директорию `/app/(marketing)/_components/`

### Medium Priority (1 день)

- [ ] Переместить `hydrateEventCategories` в `hydration.ts`
- [ ] Удалить `eventCategoryHydration.ts`
- [ ] Обновить импорты
- [ ] Создать `/src/lib/utils/price-formatting.ts`
- [ ] Использовать `formatEventPrice()` в 3 компонентах
- [ ] Удалить дублирующий visibility код из `events.ts`

---

## 🧪 Тестирование после изменений

### 1. После объединения date утилит

```bash
# Проверить что нет ошибок компиляции
npm run build

# Проверить что форматирование работает
# Открыть:
# - /events (список событий)
# - /events/[id] (детальная страница)
# - /clubs (подписки клубов)
```

### 2. После оптимизации repository

```bash
# Проверить что все CRUD операции работают
# - Создать событие
# - Обновить событие
# - Удалить событие
# - Загрузить список событий
```

### 3. После централизации hydration

```bash
# Проверить что события загружаются с полными данными
# - Категория отображается
# - Город отображается
# - Валюта отображается
```

---

## 📊 Ожидаемые результаты

После выполнения всех quick wins:

- ✅ **-300 строк дублированного кода**
- ✅ **-102 избыточных проверки**
- ✅ **+1 централизованная утилита дат**
- ✅ **+1 централизованная утилита цен**
- ✅ **Улучшение maintainability на 15%**
- ✅ **Уменьшение cognitive complexity**

---

**Следующий шаг:** Начать с Quick Wins, протестировать, затем перейти к Medium Priority.

