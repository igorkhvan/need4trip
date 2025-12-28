# Анализ: Изменение порядка вкладок на странице "Все события"

**Дата:** 2024-12-28  
**Задача:** Изменить порядок вкладок и default значение  
**Текущий порядок:** Все события (default) → Предстоящие → Мои события  
**Целевой порядок:** Предстоящие (default) → Мои события → Все события

---

## 1. Текущая архитектура

### 1.1. UI Layer (Client Components)

**Файл:** `src/components/events/events-grid.tsx`

**Строки 108-119:** Определение вкладок в компоненте

```typescript
<Tabs
  tabs={[
    { id: "all", label: "Все события" },
    { id: "upcoming", label: "Предстоящие" },
    { id: "my", label: "Мои события", hidden: !currentUserId },
  ]}
  activeTab={activeTab}
  onChange={(tabId) => {
    startTransition(() => {
      onTabChange(tabId);
    });
  }}
/>
```

**Строка 57:** Определение activeTab из searchParams

```typescript
const activeTab = useMemo(() => searchParams.get("tab") || "all", [searchParams]);
```

**Вывод:** UI компонент читает activeTab из URL параметра `tab`, default = `"all"`.

---

### 1.2. Client State Management

**Файл:** `src/components/events/events-page-client.tsx`

**Строка 34:** Получение текущей вкладки

```typescript
const currentTab = searchParams.get("tab") || "all";
```

**Строка 58-59:** Логика удаления параметра tab из URL

```typescript
if (value === null || value === "" || value === "all") {
  params.delete(name);
}
```

**Вывод:** Клиентская логика предполагает, что `"all"` — это default значение, которое не нужно указывать в URL.

---

### 1.3. API Layer (Backend Validation)

**Файл:** `src/app/api/events/route.ts`

**Строка 16:** Zod schema для валидации query параметров

```typescript
const eventsListQuerySchema = z.object({
  tab: z.enum(['all', 'upcoming', 'my']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(['date', 'name']).default('date'),
  search: z.string().trim().optional(),
  cityId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});
```

**Строки 28-36:** API endpoint GET `/api/events` комментарий

```typescript
/**
 * GET /api/events
 * 
 * Returns paginated list of events visible to current user.
 * 
 * SSOT § 10: Server-side pagination, offset-based.
 * - tab=all: public events
 * - tab=upcoming: public + future events
 * - tab=my: owner/participant/access events (requires auth, throws 401 if not authenticated)
 * 
 * Response: { events: EventListItem[], meta: { total, page, limit, totalPages, hasMore, nextCursor } }
 */
```

**Вывод:** Backend валидирует `tab` через Zod enum с default значением `'all'`.

---

### 1.4. SSOT Documentation

**Файл:** `docs/ARCHITECTURE.md`

**Строки 989-1006:** § 10. Events Listing and Pagination (SSOT) — Listing Tabs

```markdown
#### Listing Tabs

| Tab | Query Filter | Auth Required | Included Events |
|-----|-------------|--------------|----------------|
| `tab=all` | `visibility = 'public'` | ❌ No | Catalog (all public events) |
| `tab=upcoming` | `visibility = 'public' AND date_time > now()` | ❌ No | Subset of tab=all |
| `tab=my` | (see below) | ✅ Yes | User-specific events |

**tab=my logic (requires authentication):**

User sees events where:
1. **Owner:** `created_by_user_id = currentUser.id`, OR
2. **Participant:** exists in `participants` table for this event, OR
3. **Explicit access:** exists in `event_user_access` for this event

**Note:** `tab=my` does NOT filter by visibility. Events of ANY visibility level (public/unlisted/restricted) appear if user meets ownership/participant/access criteria.

**API behavior for tab=my without auth:** Return HTTP 401 status + JSON error (code: "UNAUTHORIZED"). Do NOT return empty list. Do NOT redirect. UI may show auth modal.
```

**Вывод:** SSOT документация описывает логику вкладок, но НЕ указывает explicit default значение и порядок отображения в UI.

---

**Файл:** `docs/ssot/api-ssot.md`

**Строки (API-025):** GET /api/events endpoint

```markdown
### API-025: List Events (Paginated)

**Endpoint:** `GET /api/events`  
**Auth:** Optional (currentUser или null)  
**Rate limit:** 300 req / 5 min  

**Query Parameters (Zod-validated):**
- `tab` (enum): `all` | `upcoming` | `my` (default: `all`)
- `page` (integer): >= 1 (default: 1)
- `limit` (integer): 1-50 (default: 12)
- `sort` (enum): `date` | `name` (default: `date`)
- `search` (string, optional): Filter by title
- `cityId` (UUID, optional): Filter by city
- `categoryId` (UUID, optional): Filter by category

**Response (200 OK):**
```json
{
  "events": EventListItemHydrated[],
  "meta": {
    "total": number,
    "page": number,
    "limit": number,
    "totalPages": number,
    "hasMore": boolean
  }
}
```

**Errors:**
- 400: VALIDATION_ERROR (invalid query params)
- 401: UNAUTHORIZED (tab=my without auth)

**Security & Abuse:**
- Guest-friendly (no auth required for tab=all/upcoming)
- Rate limit: 300 req / 5 min (read tier)
- tab=my requires auth (throws 401)

**Billing touchpoints:** None (free access)
```

**Вывод:** API SSOT документирует default значение `tab=all`.

---

## 2. Зависимости и точки изменения

### 2.1. Что нужно изменить

| # | Компонент | Файл | Изменение |
|---|-----------|------|-----------|
| 1 | **Zod Schema (API)** | `src/app/api/events/route.ts` | `tab: z.enum(['all', 'upcoming', 'my']).default('all')` → `default('upcoming')` |
| 2 | **UI Tabs Order** | `src/components/events/events-grid.tsx` | Переупорядочить массив `tabs={[...]}` (upcoming → my → all) |
| 3 | **Client Default (activeTab)** | `src/components/events/events-grid.tsx` | `searchParams.get("tab") \|\| "all"` → `\|\| "upcoming"` |
| 4 | **Client Default (currentTab)** | `src/components/events/events-page-client.tsx` | `searchParams.get("tab") \|\| "all"` → `\|\| "upcoming"` |
| 5 | **Client URL Logic** | `src/components/events/events-page-client.tsx` | `value === "all"` → `value === "upcoming"` (строка 58) |
| 6 | **SSOT (ARCHITECTURE.md)** | `docs/ARCHITECTURE.md` | Добавить explicit упоминание default значения в § 10 |
| 7 | **SSOT (api-ssot.md)** | `docs/ssot/api-ssot.md` | Обновить API-025: `default: all` → `default: upcoming` |

---

### 2.2. Логика изменений

#### 2.2.1. Backend (API Layer)

**Изменение:** `src/app/api/events/route.ts`

```typescript
// БЫЛО:
const eventsListQuerySchema = z.object({
  tab: z.enum(['all', 'upcoming', 'my']).default('all'),
  // ...
});

// СТАЛО:
const eventsListQuerySchema = z.object({
  tab: z.enum(['all', 'upcoming', 'my']).default('upcoming'),
  // ...
});
```

**Эффект:** API будет возвращать `tab=upcoming` события если query параметр `tab` не указан.

---

#### 2.2.2. Frontend (UI Order)

**Изменение:** `src/components/events/events-grid.tsx`

```typescript
// БЫЛО (строки 108-113):
<Tabs
  tabs={[
    { id: "all", label: "Все события" },
    { id: "upcoming", label: "Предстоящие" },
    { id: "my", label: "Мои события", hidden: !currentUserId },
  ]}
  // ...
/>

// СТАЛО:
<Tabs
  tabs={[
    { id: "upcoming", label: "Предстоящие" },
    { id: "my", label: "Мои события", hidden: !currentUserId },
    { id: "all", label: "Все события" },
  ]}
  // ...
/>
```

**Эффект:** UI будет отображать вкладки в новом порядке: Предстоящие → Мои события → Все события.

---

#### 2.2.3. Frontend (Default activeTab)

**Изменение:** `src/components/events/events-grid.tsx`

```typescript
// БЫЛО (строка 57):
const activeTab = useMemo(() => searchParams.get("tab") || "all", [searchParams]);

// СТАЛО:
const activeTab = useMemo(() => searchParams.get("tab") || "upcoming", [searchParams]);
```

**Эффект:** Если URL не содержит `?tab=...`, компонент будет считать активной вкладку `upcoming`.

---

#### 2.2.4. Frontend (Client Default currentTab)

**Изменение:** `src/components/events/events-page-client.tsx`

```typescript
// БЫЛО (строка 34):
const currentTab = searchParams.get("tab") || "all";

// СТАЛО:
const currentTab = searchParams.get("tab") || "upcoming";
```

**Эффект:** Логика обработки ошибок (401 для tab=my) будет корректно работать с новым default значением.

---

#### 2.2.5. Frontend (URL Parameter Cleanup)

**Изменение:** `src/components/events/events-page-client.tsx`

```typescript
// БЫЛО (строки 58-60):
if (value === null || value === "" || value === "all") {
  params.delete(name);
}

// СТАЛО:
if (value === null || value === "" || value === "upcoming") {
  params.delete(name);
}
```

**Эффект:** При выборе вкладки "Предстоящие" параметр `?tab=upcoming` будет удаляться из URL (чистый URL без избыточных параметров).

---

#### 2.2.6. SSOT Documentation (ARCHITECTURE.md)

**Изменение:** `docs/ARCHITECTURE.md` § 10

**Добавить раздел:**

```markdown
#### Default Tab Behavior (UI)

**Default tab (when `?tab` param is missing):** `tab=upcoming`

**Rationale:**
- Most users want to see upcoming events by default
- Reduces cognitive load (one less tab to click)
- `tab=all` includes past events (less relevant for casual browsing)

**UI Tab Order:**
1. Предстоящие (`upcoming`) — default, показано первым
2. Мои события (`my`) — authenticated users only
3. Все события (`all`) — full catalog (past + future)
```

**Место вставки:** После "Listing Tabs" таблицы (строка 1006), перед "Pagination (Server-Side, Offset-Based)".

---

#### 2.2.7. SSOT Documentation (api-ssot.md)

**Изменение:** `docs/ssot/api-ssot.md` API-025

```markdown
// БЫЛО:
- `tab` (enum): `all` | `upcoming` | `my` (default: `all`)

// СТАЛО:
- `tab` (enum): `all` | `upcoming` | `my` (default: `upcoming`)
```

**Место:** Query Parameters секция в API-025.

---

## 3. Проверка на побочные эффекты

### 3.1. Возможные risk areas

#### 3.1.1. Deep Links (Внешние ссылки на `/events`)

**Сценарий:** Пользователь сохранил закладку `/events` (без `?tab=all`)

**До изменения:** Открывается `tab=all` (все события)  
**После изменения:** Открывается `tab=upcoming` (предстоящие события)

**Риск:** ✅ **Низкий** — `tab=upcoming` является подмножеством `tab=all`, поэтому пользователь увидит релевантные события. Если нужны все события (включая прошедшие), можно явно указать `?tab=all`.

---

#### 3.1.2. Bookmarked URLs (Закладки с `?tab=all`)

**Сценарий:** Пользователь сохранил `/events?tab=all`

**До изменения:** Открывается `tab=all`  
**После изменения:** Открывается `tab=all` (параметр в URL явно указан)

**Риск:** ✅ **Нет риска** — Explicit параметр в URL имеет приоритет над default значением.

---

#### 3.1.3. SEO (Search Engine Indexing)

**Сценарий:** Поисковые системы проиндексировали `/events`

**До изменения:** Индекс содержит все события (past + future)  
**После изменения:** Индекс будет содержать только предстоящие события

**Риск:** ✅ **Позитивный эффект** — Предстоящие события более релевантны для новых посетителей.

---

#### 3.1.4. E2E Tests (Playwright)

**Статус:** `docs/TESTING.md` показывает, что E2E tests (QA-46 to QA-53) в статусе TODO.

**Риск:** ✅ **Нет риска** — E2E tests еще не реализованы.

---

#### 3.1.5. Integration Tests (Jest)

**Сценарий:** Integration tests могут проверять `/api/events` без параметра `tab`

**Риск:** ⚠️ **Средний** — Нужно проверить существующие integration tests.

**Действие:** Найти и обновить тесты, которые проверяют default поведение.

---

### 3.2. Проверка integration tests

**Команда:**

```bash
grep -r "tab.*all" tests/
grep -r "/api/events" tests/ | grep -v "tab="
```

**Ожидаемый результат:** Тесты, которые вызывают `/api/events` без параметра `tab`, должны ожидать `tab=upcoming` вместо `tab=all`.

---

## 4. План реализации

### Этап 1: Code Changes

1. ✅ **Backend (API Validation)**
   - Файл: `src/app/api/events/route.ts`
   - Изменение: `default('all')` → `default('upcoming')`

2. ✅ **Frontend (UI Tab Order)**
   - Файл: `src/components/events/events-grid.tsx`
   - Изменение: Переупорядочить массив `tabs`

3. ✅ **Frontend (Client Default activeTab)**
   - Файл: `src/components/events/events-grid.tsx`
   - Изменение: `|| "all"` → `|| "upcoming"`

4. ✅ **Frontend (Client Default currentTab)**
   - Файл: `src/components/events/events-page-client.tsx`
   - Изменение: `|| "all"` → `|| "upcoming"`

5. ✅ **Frontend (URL Cleanup Logic)**
   - Файл: `src/components/events/events-page-client.tsx`
   - Изменение: `value === "all"` → `value === "upcoming"`

---

### Этап 2: Documentation Updates (SSOT)

6. ✅ **ARCHITECTURE.md**
   - Файл: `docs/ARCHITECTURE.md`
   - Добавить раздел "Default Tab Behavior (UI)" в § 10
   - Обновить версию документа

7. ✅ **api-ssot.md**
   - Файл: `docs/ssot/api-ssot.md`
   - Обновить API-025: `default: all` → `default: upcoming`
   - Обновить версию документа

---

### Этап 3: Verification

8. ✅ **TypeScript Check**
   ```bash
   npx tsc --noEmit
   ```

9. ✅ **Build Check**
   ```bash
   npm run build
   ```

10. ✅ **Integration Tests Check**
    ```bash
    grep -r "tab" tests/ | grep -E "(all|upcoming|my)"
    npm test
    ```

11. ✅ **Manual Testing**
    - Открыть `/events` → проверить что выбрана вкладка "Предстоящие"
    - Открыть `/events?tab=all` → проверить что выбрана вкладка "Все события"
    - Открыть `/events?tab=my` → проверить что выбрана вкладка "Мои события"
    - Переключение между вкладками → проверить URL updates

---

### Этап 4: Git Commit

12. ✅ **Commit Changes**
    ```bash
    git add -A
    git commit -m "refactor(events): change default tab to 'upcoming'

    Changes:
    - API: default tab upcoming instead of all
    - UI: reorder tabs (upcoming → my → all)
    - URL: clean tab param for upcoming (default)
    - SSOT: update ARCHITECTURE.md § 10
    - SSOT: update api-ssot.md API-025

    Rationale:
    - Most users want to see upcoming events first
    - tab=all includes past events (less relevant)
    - Improves UX for new visitors

    Verified: TypeScript ✅, Build ✅, Tests ✅"
    ```

13. ✅ **Push to Remote**
    ```bash
    git push origin main
    ```

---

## 5. Финальный checklist

- [ ] Backend API default значение изменено
- [ ] UI порядок вкладок обновлен
- [ ] Client default activeTab обновлен
- [ ] Client default currentTab обновлен
- [ ] Client URL cleanup logic обновлена
- [ ] ARCHITECTURE.md обновлен (новая секция + версия)
- [ ] api-ssot.md обновлен (API-025 + версия)
- [ ] TypeScript check ✅
- [ ] Production build ✅
- [ ] Integration tests проверены
- [ ] Manual testing выполнен
- [ ] Git commit создан
- [ ] Git push выполнен

---

## 6. Выводы

### 6.1. Сложность изменения

**Оценка:** ✅ **Низкая**

**Причина:**
- Все изменения локальны (5 файлов: 2 компонента + 1 API route + 2 SSOT документа)
- Нет breaking changes (explicit параметры в URL сохраняются)
- Zod schema автоматически обрабатывает default значение
- UI компоненты используют fallback логику (`|| "upcoming"`)

---

### 6.2. Риски

**Риск 1:** Integration tests могут ожидать `tab=all` как default  
**Митигация:** Проверить и обновить тесты перед push

**Риск 2:** Пользователи с закладками `/events` увидят другой набор событий  
**Митигация:** `tab=upcoming` — подмножество `tab=all`, более релевантен для новых посетителей

**Риск 3:** SEO индекс изменится  
**Митигация:** Позитивный эффект, предстоящие события более релевантны

---

### 6.3. Соответствие SSOT принципам

✅ **Все изменения соответствуют SSOT:**

1. **Backend (API) — источник истины для default значения**  
   Zod schema в `src/app/api/events/route.ts` определяет `.default('upcoming')`

2. **Frontend следует за backend**  
   Client компоненты используют fallback `|| "upcoming"` для синхронизации с API

3. **SSOT документация обновляется вместе с кодом**  
   `ARCHITECTURE.md` и `api-ssot.md` коммитятся в том же PR

4. **Ownership Map соблюдается**  
   - API Layer: `src/app/api/events/route.ts`
   - Service Layer: без изменений (логика фильтрации не меняется)
   - UI Layer: `src/components/events/events-grid.tsx`, `events-page-client.tsx`
   - SSOT Docs: `docs/ARCHITECTURE.md` § 10, `docs/ssot/api-ssot.md` API-025

---

## 7. Проверка корректности отображения карточек и пагинации

### 7.1. Как работает data flow

```
URL (?tab=upcoming)
  ↓
API Route (src/app/api/events/route.ts)
  ↓ tab: z.enum(['all', 'upcoming', 'my']).default('upcoming')
  ↓
Service Layer (src/lib/services/events.ts → listVisibleEventsForUserPaginated)
  ↓
  ├─ tab=my → queryEventsByIdsPaginated(userEventIds, filters, sort, pagination)
  │   └─ Собирает ID событий пользователя (owner + participant + access)
  │   └─ Запрашивает события по ID списку с фильтрами
  │
  └─ tab=all/upcoming → queryEventsPaginated(filters, sort, pagination)
      └─ tab=all: visibility='public'
      └─ tab=upcoming: visibility='public' AND date_time >= NOW()
  ↓
Repository Layer (src/lib/db/eventRepo.ts)
  ↓ SELECT с фильтрами, сортировкой, пагинацией
  ↓ Returns: { data: EventListItem[], total, page, limit, totalPages, hasMore }
  ↓
Service Layer: hydrateEventListItems()
  ↓ Batch loading: cities, currencies, categories, participants count
  ↓ Returns: EventListItemHydrated[]
  ↓
API Response: { events: EventListItemHydrated[], meta }
  ↓
Client Hook (useEventsQuery)
  ↓
UI Component (EventsGrid → EventCardDetailed)
  ↓
Отображение карточек событий
```

### 7.2. Фильтрация на уровне БД (queryEventsPaginated)

**Код:** `src/lib/db/eventRepo.ts` строки 668-673

```typescript
// Filters
if (filters.tab === 'all') {
  query = query.eq('visibility', 'public');
} else if (filters.tab === 'upcoming') {
  const now = new Date().toISOString();
  query = query.eq('visibility', 'public').gte('date_time', now);
}
```

**Ключевые моменты:**
1. `tab=all` → только `visibility='public'` (включая прошедшие события)
2. `tab=upcoming` → `visibility='public'` AND `date_time >= NOW()` (только будущие события)
3. `tab=my` → использует отдельную функцию `queryEventsByIdsPaginated()` (фильтрует по ID списку)

### 7.3. Пагинация (offset-based)

**Код:** `src/lib/db/eventRepo.ts` строки 658-696

```typescript
// Clamp limit
const limit = Math.max(1, Math.min(50, pagination.limit));
const offset = (pagination.page - 1) * limit;

// ... query building ...

// Pagination
query = query.range(offset, offset + limit - 1);

const { data, error, count } = await query; // count="exact" для total

const events = (data ?? []).map(mapDbRowToListItem);
const total = count ?? 0;
const totalPages = Math.ceil(total / limit);
const hasMore = pagination.page < totalPages;

return {
  data: events,
  total,
  page: pagination.page,
  limit,
  totalPages,
  hasMore,
};
```

**Ключевые моменты:**
1. Пагинация работает через `.range(offset, offset + limit - 1)`
2. `count="exact"` возвращает `total` для всех событий, соответствующих фильтрам
3. `totalPages` и `hasMore` вычисляются на основе `total` и `limit`
4. **НЕЗАВИСИМО** от того какой `tab` выбран, пагинация работает одинаково

### 7.4. Hydration (batch loading)

**Код:** `src/lib/services/events.ts` строки 1037-1074

```typescript
async function hydrateEventListItems(items: EventListItem[]): Promise<EventListItemHydrated[]> {
  if (items.length === 0) return [];

  const eventIds = items.map(e => e.id);

  // Batch load all reference data + counts in parallel
  const [cityMap, currencyMap, categoryMap, participantCounts] = await Promise.all([
    hydrateCitiesByIds(items),      // Map<cityId, { id, name, countryCode }>
    hydrateCurrenciesByIds(items),  // Map<code, { code, symbol }>
    hydrateCategoriesByIds(items),  // Map<categoryId, { id, name, icon }>
    getParticipantsCountByEventIds(eventIds), // Record<eventId, number>
  ]);

  // Merge hydrated data
  return items.map(event => ({
    ...event,
    city: cityMap.get(event.cityId) ?? undefined,
    currency: event.priceCurrency ? currencyMap.get(event.priceCurrency) ?? undefined : undefined,
    category: event.categoryId ? categoryMap.get(event.categoryId) ?? undefined : undefined,
    participantsCount: participantCounts[event.id] ?? 0,
  }));
}
```

**Ключевые моменты:**
1. Batch loading избегает N+1 queries (одна загрузка для всех событий на странице)
2. Hydration добавляет: `city`, `currency`, `category`, `participantsCount`
3. **НЕЗАВИСИМО** от `tab` значения, hydration работает одинаково

### 7.5. UI Rendering (EventCardDetailed)

**Код:** `src/components/events/event-card-detailed.tsx` строки 31-137

```typescript
export function EventCardDetailed({ event, onClick }: EventCardDetailedProps) {
  const fillPercentage = calculateEventFillPercentage(
    event.participantsCount ?? 0,
    event.maxParticipants
  );
  
  // Handle category (full Event has EventCategoryDto, lightweight has { id, name, icon })
  const CategoryIcon = event.category 
    ? (hasFullEvent ? getCategoryIcon(event.category as any) : Users)
    : Users;
  const categoryLabel = event.category 
    ? (hasFullEvent 
        ? getCategoryLabel(event.category as any) 
        : ('name' in event.category ? event.category.name : "Событие"))
    : "Событие";
  
  // Format price
  const priceLabel = hasFullEvent 
    ? formatEventPrice(event as Event)
    : (event.isPaid 
        ? (event.priceAmount && event.priceCurrency 
            ? `${event.priceAmount} ${event.priceCurrency}` 
            : "Платно")
        : "Бесплатно");

  // ... JSX rendering ...
}
```

**Ключевые моменты:**
1. Компонент получает `EventListItemHydrated` (уже с hydrated полями)
2. Поля: `title`, `dateTime`, `city`, `participantsCount`, `maxParticipants`, `category`, `isPaid`, `priceAmount`, `priceCurrency`
3. **НЕЗАВИСИМО** от `tab` значения, карточка отображает одинаковые поля

### 7.6. Вывод: Корректность отображения

✅ **Карточки событий будут отображаться КОРРЕКТНО**

**Причины:**
1. **Фильтрация на уровне БД:** `tab=upcoming` корректно фильтрует события (`date_time >= NOW()`)
2. **Пагинация независима от tab:** Offset-based pagination работает одинаково для всех вкладок
3. **Hydration одинакова для всех tab:** Batch loading reference data происходит ПОСЛЕ фильтрации
4. **UI компонент не зависит от tab:** `EventCardDetailed` отображает `EventListItemHydrated` одинаково

✅ **Пагинация будет работать КОРРЕКТНО**

**Причины:**
1. **total вычисляется правильно:** `count="exact"` учитывает фильтры (`tab`, `search`, `cityId`, `categoryId`)
2. **totalPages и hasMore корректны:** Вычисляются на основе `total` и `limit`
3. **URL параметры синхронизированы:** `page`, `tab`, фильтры сохраняются в URL при переключении вкладок

### 7.7. Примеры корректного поведения

**Сценарий 1: Пользователь открывает `/events` (без параметров)**
- Backend: `tab` default = `'upcoming'` (Zod schema)
- БД запрос: `visibility='public' AND date_time >= NOW()`
- Результат: Список предстоящих событий, страница 1
- Пагинация: `total` = количество предстоящих событий, `totalPages` вычислено корректно

**Сценарий 2: Пользователь переключается на вкладку "Все события"**
- URL: `/events?tab=all`
- Backend: `tab` = `'all'` (explicit из URL)
- БД запрос: `visibility='public'` (без фильтра по дате)
- Результат: Список всех событий (past + future), страница 1
- Пагинация: `total` = количество всех публичных событий

**Сценарий 3: Пользователь на вкладке "Предстоящие", страница 2**
- URL: `/events?page=2` (tab не указан → default `upcoming`)
- Backend: `tab` = `'upcoming'`, `page` = `2`
- БД запрос: `visibility='public' AND date_time >= NOW()`, offset = 12 (если limit=12)
- Результат: Вторая страница предстоящих событий
- Пагинация: `total` = общее количество предстоящих, `page` = 2, `hasMore` = true/false

**Сценарий 4: Пользователь применяет фильтр по городу на вкладке "Предстоящие"**
- URL: `/events?cityId=abc-123` (tab не указан → default `upcoming`)
- Backend: `tab` = `'upcoming'`, `cityId` = `'abc-123'`
- БД запрос: `visibility='public' AND date_time >= NOW() AND city_id='abc-123'`
- Результат: Предстоящие события в выбранном городе
- Пагинация: `total` = количество предстоящих событий в этом городе

### 7.8. Потенциальные edge cases (все покрыты)

**Edge case 1:** Нет предстоящих событий (все события в прошлом)
- БД вернёт: `{ data: [], total: 0 }`
- UI покажет: Empty state ("Ничего не найдено")
- ✅ Корректно обработано

**Edge case 2:** Пользователь на странице 5, затем переключился на "Предстоящие" (где только 2 страницы)
- Клиент: `setParam('tab', 'upcoming', { resetPage: true })` (строка 71 events-page-client.tsx)
- URL: `/events` (tab default, page reset to 1)
- ✅ Корректно обработано (page сбрасывается при смене вкладки)

**Edge case 3:** Midnight boundary (событие `date_time = "2024-12-28T23:59:59"`)
- `tab=upcoming`: `gte('date_time', '2024-12-29T00:00:00')` → событие НЕ включено (корректно, оно уже прошло)
- `tab=all`: включено (корректно)
- ✅ Корректно обработано

---

## 8. Рекомендации

✅ **Изменение безопасно для реализации**

**Причины:**
- Локальное изменение без сайд-эффектов
- Обратная совместимость (explicit URL параметры работают)
- Улучшение UX (предстоящие события более релевантны)
- Соответствие SSOT принципам
- **Карточки событий и пагинация будут работать корректно** (проверено на всех уровнях: БД, Service, API, UI)

**Следующий шаг:** Начать реализацию по плану (Этап 1 → Этап 4).

