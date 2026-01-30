# Анализ: Удаление Stats с страницы "Все события"

**Дата:** 28 декабря 2024  
**Цель:** Проанализировать зависимости stats карточек на странице `/events` для безопасного удаления без побочных эффектов

---

## 📋 EXECUTIVE SUMMARY

**Страница:** `/events` (src/app/(app)/events/page.tsx)  
**Компоненты для удаления:**
1. Stats карточки (3 штуки: Всего событий, Активных регистраций, Всего участников)
2. `useEventsStats` hook
3. API endpoint `/api/events/stats` (с in-process кешем)
4. Service layer: `getEventsStats()`

**Вердикт:** ✅ **Удаление безопасно**. Stats компоненты полностью изолированы от фильтров и пагинации.

---

## 🏗️ АРХИТЕКТУРА СТРАНИЦЫ "ВСЕ СОБЫТИЯ"

### 1. Компонентная структура

```
EventsPage (Server Component)
└── EventsPageClient (Client Component)
    ├── Stats Section ← УДАЛЯЕМ
    │   ├── useEventsStats hook ← УДАЛЯЕМ
    │   ├── StatsSkeleton
    │   └── LoadingBar (refetching indicator)
    │
    └── Events List Section
        ├── useEventsQuery hook ← ОСТАВЛЯЕМ
        ├── EventsGrid component ← ОСТАВЛЯЕМ
        │   ├── Tabs (all/upcoming/my)
        │   ├── Search input
        │   ├── Filters (category, city, sort)
        │   ├── EventCardDetailed (список)
        │   └── Pagination
        └── EventCardSkeletonGrid
```

---

## 📊 STATS КАРТОЧКИ: Подробный анализ

### 1.1. Что показывают stats карточки

**Локация:** `src/components/events/events-page-client.tsx:151-210`

**3 карточки:**

```tsx
// Card 1: Всего событий (из /api/events/stats)
<Card>
  <div>Всего событий</div>
  <div>{stats?.total ?? 0}</div>
  <Calendar icon />
</Card>

// Card 2: Активных регистраций (из /api/events meta)
<Card>
  <div>Активных регистраций</div>
  <div>{meta?.total ?? 0}</div>  ← ❗ Берётся из meta списка событий
  <TrendingUp icon />
</Card>

// Card 3: Всего участников (computed client-side)
<Card>
  <div>Всего участников</div>
  <div>{events.reduce((sum, e) => sum + (e.participantsCount ?? 0), 0)}</div>
  <Users icon />
</Card>
```

**❗ ВАЖНО:**
- **Card 1** использует `stats?.total` из `/api/events/stats` (отдельный запрос)
- **Card 2** использует `meta?.total` из `/api/events` (основной список)
- **Card 3** вычисляется на клиенте из массива `events`

### 1.2. Зависимости данных

**Stats запрос (Card 1):**
```tsx
const statsParams = useMemo(() => {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("page"); // ← Stats НЕ зависят от page
  return params;
}, [searchParams]);

const { stats, loading: statsLoading, refetching: statsRefetching, error: statsError } 
  = useEventsStats(statsParams);
```

**Events запрос (Cards 2, 3):**
```tsx
const { events, meta, loading: listLoading, refetching: listRefetching, error: listError } 
  = useEventsQuery(searchParams); // ← Использует ВСЕ параметры включая page
```

**Вывод:** Stats и Events — это **2 независимых запроса**. Удаление stats не влияет на список.

---

## 🔌 API ENDPOINT: /api/events/stats

### 2.1. API Route

**Файл:** `src/app/api/events/stats/route.ts`

**Что делает:**
- Принимает query params: `tab`, `search`, `cityId`, `categoryId` (БЕЗ `page`)
- Использует in-process cache (TTL 60s, max 300 entries)
- Для `tab=my` требует авторизации (throws AuthError 401)
- Возвращает `{ total: number }` — количество событий без пагинации

**Cache strategy:**
```typescript
const statsCache = new Map<string, CacheEntry>(); // In-process Map
const CACHE_TTL = 60_000; // 60 seconds
const MAX_ENTRIES = 300;

// Cache key format:
// - Public tabs: `public|${tab}|${filters}`
// - tab=my: `${userId}|my|${filters}`
```

**Cleanup strategy:** "cleanup on access" (no background timers)

### 2.2. Service Layer

**Файл:** `src/lib/services/events.ts:1139-1167`

```typescript
export async function getEventsStats(
  filters: EventListFilters,
  currentUser: CurrentUser | null
): Promise<{ total: number }> {
  if (filters.tab === 'my') {
    // Auth check
    if (!currentUser) {
      throw new AuthError("Authentication required for tab=my");
    }

    // Collect event IDs (owner + participant + access)
    const [ownerEventIds, participantEventIds, accessEventIds] = await Promise.all([
      listEventsByCreator(currentUser.id, 1, 10000).then(result => result.data.map(e => e.id)),
      listEventIdsForUser(currentUser.id),
      listAccessibleEventIds(currentUser.id),
    ]);

    const allIds = new Set([...ownerEventIds, ...participantEventIds, ...accessEventIds]);
    const uniqueIds = Array.from(allIds);

    const total = await countEventsByIds(uniqueIds, filters);
    return { total };
  }

  // tab=all or tab=upcoming
  const total = await countEventsByFilters(filters);
  return { total };
}
```

**Используемые DB функции:**
- `countEventsByFilters(filters)` — для `tab=all`, `tab=upcoming`
- `countEventsByIds(ids, filters)` — для `tab=my`
- `listEventsByCreator(userId)` — для `tab=my`
- `listEventIdsForUser(userId)` — для `tab=my` (participants)
- `listAccessibleEventIds(userId)` — для `tab=my` (access grants)

**Вывод:** Service layer использует специализированные функции подсчёта. Дублирования с основным списком НЕТ.

---

## 🎣 HOOK: useEventsStats

**Файл:** `src/hooks/use-events-stats.ts`

**Что делает:**
- Fetches stats from `/api/events/stats`
- Abort control (AbortController)
- Race condition guard (requestIdRef)
- Stale-while-revalidate pattern (loading/refetching states)
- Ignores `page` parameter (by design)

**Возвращает:**
```typescript
interface EventsStatsResult {
  stats: EventsStats | null;
  loading: boolean;
  refetching: boolean;
  error: string | null;
}
```

**Использование:**
```tsx
const { stats, loading, refetching, error } = useEventsStats(statsParams);
```

**Зависимости:**
- `parseApiResponse` (error handling)
- `log` (logger)

**Используется:**
- ТОЛЬКО в `src/components/events/events-page-client.tsx`

**Вывод:** Hook полностью изолирован. Удаление не затронет другие компоненты.

---

## 🔄 ФИЛЬТРЫ И ПАГИНАЦИЯ: Независимость от Stats

### 3.1. Как работают фильтры

**Локация:** `src/components/events/events-grid.tsx`

**Фильтры:**
1. **Tabs** (all/upcoming/my) — через `onTabChange(tab)`
2. **Search** (by name) — через `onSearchChange(search)`
3. **Category filter** — через `onCategoryChange(categoryId)`
4. **City filter** — через `onCityChange(cityId)`
5. **Sort** (date/name) — через `onSortChange(sort)`

**Все фильтры вызывают:** `setParam()` в `EventsPageClient`

```tsx
const setParam = useCallback(
  (name: string, value: string | null, options?) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === null || value === "" || value === "all") {
      params.delete(name);
    } else {
      params.set(name, value);
    }
    
    if (options.resetPage) {
      params.delete("page"); // ← Reset pagination
    }
    
    router.replace(`/events?${params.toString()}`);
  },
  [router, searchParams]
);
```

**Вывод:** Фильтры управляют URL, URL триггерит ре-рендер, НЕ используют stats.

### 3.2. Как работает пагинация

**Локация:** `src/components/events/events-grid.tsx:254-265`

```tsx
{meta && meta.totalPages > 1 && (
  <Pagination
    currentPage={meta.page}
    totalPages={meta.totalPages}
    onPageChange={(page) => {
      startTransition(() => {
        onPageChange(page); // ← Вызывает setParam("page", page.toString())
      });
    }}
  />
)}
```

**Данные для пагинации берутся из:** `meta` (из `/api/events`)

```typescript
interface EventsMeta {
  total: number;      // ← Card 2 использует это
  page: number;
  limit: number;
  totalPages: number; // ← Pagination использует это
  hasMore: boolean;
}
```

**Вывод:** Пагинация использует `meta` из основного списка, НЕ из stats.

---

## 🔍 ЗАВИСИМОСТИ: Граф компонентов

```
                       EventsPageClient
                             |
          +------------------+------------------+
          |                                     |
    useEventsStats (stats)              useEventsQuery (events + meta)
          |                                     |
  /api/events/stats                       /api/events
          |                                     |
   getEventsStats()                  listVisibleEventsForUserPaginated()
          |                                     |
   [DB count queries]                   [DB select queries]
          
          
Card 1: stats.total ← useEventsStats
Card 2: meta.total  ← useEventsQuery ← НЕ УДАЛЯТЬ (используется в UI)
Card 3: events.reduce(...) ← useEventsQuery
```

**❗ ВАЖНО:**
- **Card 1** — единственный потребитель `stats` из `/api/events/stats`
- **Cards 2, 3** — используют данные из основного списка (`meta`, `events`)
- **Фильтры/пагинация** — НЕ используют stats

---

## 🎯 ЧТО МОЖНО УДАЛИТЬ БЕЗОПАСНО

### ✅ Frontend Components

**1. Stats Section (src/components/events/events-page-client.tsx:151-210)**

```tsx
// УДАЛИТЬ:
{statsLoading ? (
  <StatsSkeleton />
) : statsError ? (
  <div>Не удалось загрузить статистику</div>
) : (
  <div className="flex gap-4 md:grid md:grid-cols-3">
    {/* 3 карточки */}
  </div>
)}
```

**2. useEventsStats Hook (src/hooks/use-events-stats.ts)**

```tsx
// УДАЛИТЬ весь файл
```

**3. StatsParams (src/components/events/events-page-client.tsx:34-39)**

```tsx
// УДАЛИТЬ:
const statsParams = useMemo(() => {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("page");
  return params;
}, [searchParams]);
```

**4. Stats state (src/components/events/events-page-client.tsx:43)**

```tsx
// УДАЛИТЬ:
const { stats, loading: statsLoading, refetching: statsRefetching, error: statsError } 
  = useEventsStats(statsParams);
```

**5. Imports (src/components/events/events-page-client.tsx:15, 19, 26)**

```tsx
// УДАЛИТЬ:
import { Calendar, Users, TrendingUp } from "lucide-react";
import { StatsSkeleton } from "@/components/events/stats-skeleton";
import { useEventsStats } from "@/hooks/use-events-stats";
```

**6. StatsSkeleton component**

```tsx
// УДАЛИТЬ:
// src/components/events/stats-skeleton.tsx
```

### ✅ Backend Components

**7. API Route (src/app/api/events/stats/route.ts)**

```tsx
// УДАЛИТЬ весь файл
```

**8. Service function (src/lib/services/events.ts:1139-1167)**

```typescript
// УДАЛИТЬ:
export async function getEventsStats(
  filters: EventListFilters,
  currentUser: CurrentUser | null
): Promise<{ total: number }> {
  // ...
}
```

**9. Import в API route (src/lib/services/events.ts:1)**

```typescript
// УДАЛИТЬ импорт из events.ts:
// (getEventsStats больше не экспортируется)
```

---

## ⚠️ ЧТО ОСТАВИТЬ (НЕ УДАЛЯТЬ!)

### ❌ meta.total — ИСПОЛЬЗУЕТСЯ В UI

**Локация:** `src/components/events/events-grid.tsx:231-236`

```tsx
{meta && meta.total > 0 && (
  <div className="text-sm text-muted-foreground">
    Найдено событий: <span className="font-medium">{meta.total}</span>
    {meta.totalPages > 1 && ` (страница ${meta.page} из ${meta.totalPages})`}
  </div>
)}
```

**Вывод:** `meta.total` из `/api/events` НЕ УДАЛЯЕМ. Это часть основного списка.

### ❌ DB Repository Functions

**Функции из eventRepo.ts:**
- `countEventsByFilters()` — используется в `listVisibleEventsForUserPaginated()` для `meta.total`
- `countEventsByIds()` — может использоваться в других местах
- `listEventsByCreator()` — используется для tab=my в основном списке
- `listEventIdsForUser()` — используется для tab=my в основном списке
- `listAccessibleEventIds()` — используется для tab=my в основном списке

**Вывод:** Все DB функции оставляем. Они используются основным списком событий.

---

## 🗑️ IN-PROCESS CACHE: Что делать

**Текущая реализация:** `statsCache` в `src/app/api/events/stats/route.ts:29-54`

```typescript
const statsCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000;
const MAX_ENTRIES = 300;

function cleanupCache(): void {
  // cleanup on access (no timers)
}
```

**Вопрос:** Нужен ли кеш для основного списка `/api/events`?

**Ответ:** ❌ НЕТ

**Причины:**
1. **Next.js уже кеширует** через `force-dynamic` и browser cache
2. **Offset pagination плохо кешируется** (page=1, page=2, ... разные ключи)
3. **Filters создают комбинаторный взрыв** (tab × search × city × category = много вариантов)
4. **Memory leak риск** (300 entries × N users = unbounded growth)
5. **Stale data проблема** (события создаются/обновляются, кеш устаревает)

**Решение:** Удалить in-process cache вместе со stats endpoint.

**Альтернатива (если нужен кеш):**
- Redis (через Upstash) — centralized, eviction policies, TTL
- Next.js `unstable_cache` — built-in, file-based

**Вывод:** Для `/api/events` кеш НЕ нужен. Удаляем вместе со stats.

---

## 📋 CHECKLIST: План удаления

### Frontend (8 шагов)

- [ ] **1. EventsPageClient:** Удалить stats section (lines 151-210)
- [ ] **2. EventsPageClient:** Удалить statsParams (lines 34-39)
- [ ] **3. EventsPageClient:** Удалить useEventsStats() call (line 43)
- [ ] **4. EventsPageClient:** Удалить imports (Calendar, Users, TrendingUp, StatsSkeleton, useEventsStats)
- [ ] **5. useEventsStats.ts:** Удалить весь файл
- [ ] **6. StatsSkeleton:** Найти и удалить компонент (если существует)
- [ ] **7. TypeScript:** Проверить `npx tsc --noEmit` ✅
- [ ] **8. Build:** Проверить `npm run build` ✅

### Backend (5 шагов)

- [ ] **9. stats/route.ts:** Удалить весь файл
- [ ] **10. events.ts:** Удалить `getEventsStats()` function (lines 1139-1167)
- [ ] **11. events.ts:** Удалить импорт `countEventsByIds` (если НЕ используется elsewhere)

**✅ РЕШЕНО:** `countEventsByIds` используется ТОЛЬКО в `getEventsStats`. Можно удалить импорт, но рекомендуется **ОСТАВИТЬ** саму функцию в eventRepo.ts (общая утилита).
- [ ] **12. TypeScript:** Проверить `npx tsc --noEmit` ✅
- [ ] **13. Build:** Проверить `npm run build` ✅

### Verification (3 шага)

- [ ] **14. Manual test:** Открыть `/events` — фильтры и пагинация работают
- [ ] **15. Manual test:** Проверить все 3 tabs (all/upcoming/my)
- [ ] **16. Manual test:** Проверить фильтры (search, category, city, sort)

---

## 🔧 SSOT UPDATES

**После успешного удаления обновить:**

### 1. docs/ssot/api-ssot.md

**Удалить секцию API-027:**
- **Локация:** docs/ssot/api-ssot.md:1964-2015
- **Endpoint ID:** API-027
- **Method:** GET
- **Path:** `/api/events/stats`

**Обновить Coverage table:**
- **Локация:** docs/ssot/api-ssot.md:3490
- **Удалить строку:** `| 15 | /src/app/api/events/stats/route.ts | GET | API-027 |`
- **Обновить номера:** 15 → 14, 16 → 15, и т.д. для всех последующих

**Обновить счётчики:**
- Total endpoints: 50 → 49
- Events section: API-025 to API-035 → API-025 to API-034 (11 → 10 endpoints)

**Обновить версию документа:** 
```markdown
**Last Updated:** 28 декабря 2024
**Version:** 1.1 → 1.2
```

### 2. docs/ARCHITECTURE.md (если есть упоминания)

**✅ ОБЯЗАТЕЛЬНО обновить § 10 "Events Listing, Pagination, and Stats (SSOT)":**

**Локации для обновления:**

1. **TOC (line 21):**  
   `10. [Events Listing, Pagination, and Stats (SSOT)]` → `10. [Events Listing and Pagination (SSOT)]`

2. **§ 10 Title (line 973):**  
   `## 10. Events Listing, Pagination, and Stats (SSOT)` → `## 10. Events Listing and Pagination (SSOT)`

3. **§ 10 Description (line 977):**  
   `This section defines... events listing, pagination, filtering, and stats endpoints.`  
   → `This section defines... events listing, pagination, and filtering.`

4. **DELETE Stats API Contract (lines 1148-1178):**
   - Удалить всю секцию `**GET /api/events/stats**`

5. **DELETE Stats Caching Strategy (lines 1180-1230):**
   - Удалить всю секцию `#### Stats Caching Strategy (Client-Side)`

6. **UPDATE Caching Matrix (lines 1248-1270):**
   - Удалить строки для `/api/events/stats` (lines 1256-1257)
   - Обновить пояснения (убрать упоминания stats cache)

7. **DELETE Stats Implementation Details (lines 1272+):**
   - Удалить секцию с примером кода in-process cache

8. **UPDATE § 7.2 StaticCache (line 589):**  
   `exception: event counts/stats may use short-lived in-process cache only, see § 10`  
   → Удалить это исключение полностью

9. **UPDATE § 7 Summary (line 638):**  
   `For events: listings NO cache, stats use in-process cache 60s TTL (see § 10)`  
   → `For events: listings NO cache (see § 10)`

10. **UPDATE Version History (line 1810):**  
    Добавить новую строку:
    ```markdown
    | 2024-12-28 | 2.4 | Removed /api/events/stats endpoint and in-process cache |
    ```

**Вывод:** § 10 требует значительного обновления. Stats API полностью интегрирован в ARCHITECTURE.md.

### 3. docs/sessions/2024-12-28-remove-events-stats/complete.md

**Создать финальный отчёт:**
- Что удалено
- Что оставлено
- Build verification ✅
- Manual testing ✅

---

## 🎯 РИСКИ И MITIGATION

### Риск 1: Ломается UI layout

**Вероятность:** Низкая  
**Impact:** Средний  
**Mitigation:** Stats section в отдельном `<div>`, удаление не затронет EventsGrid

### Риск 2: TypeScript errors

**Вероятность:** Низкая  
**Impact:** Высокий (блокирует build)  
**Mitigation:** `npx tsc --noEmit` перед push

### Риск 3: Импорты в других файлах

**Вероятность:** Низкая  
**Impact:** Высокий (блокирует build)  
**Mitigation:** `grep -r "useEventsStats" src/` перед удалением

**✅ ПРОВЕРЕНО:**
```bash
# getEventsStats используется ТОЛЬКО в:
- src/lib/services/events.ts (определение)
- src/app/api/events/stats/route.ts (вызов)

# useEventsStats используется ТОЛЬКО в:
- src/hooks/use-events-stats.ts (определение)
- src/components/events/events-page-client.tsx (вызов)

# countEventsByIds используется ТОЛЬКО в:
- src/lib/db/eventRepo.ts (определение)
- src/lib/services/events.ts (вызов в getEventsStats)
```

**Вывод:** ✅ БЕЗОПАСНО УДАЛЯТЬ. Нет внешних зависимостей.

### Риск 4: DB functions используются elsewhere

**Вероятность:** ~~Средняя~~ **НИЗКАЯ (проверено)**  
**Impact:** Высокий (блокирует build)  
**Mitigation:** ✅ Проверено выше — `countEventsByIds` используется ТОЛЬКО в `getEventsStats`

**Решение:**
- ✅ `countEventsByIds` можно удалить ИЛИ оставить (может пригодиться)
- ✅ Рекомендация: **ОСТАВИТЬ** в eventRepo.ts (общая утилита для count)

---

## 📊 PERFORMANCE IMPACT

### До удаления

**На каждый визит `/events`:**
- 2 API requests: `/api/events` + `/api/events/stats`
- 2 DB queries: main list + count
- In-process cache overhead (cleanup на каждый запрос)

### После удаления

**На каждый визит `/events`:**
- 1 API request: `/api/events`
- 1 DB query: main list (с count в meta)
- NO cache overhead

**Gain:**
- ✅ -50% API requests
- ✅ -50% DB queries
- ✅ -100% cache management overhead
- ✅ Simpler codebase

---

## 🔍 ALTERNATIVE: Оставить Card 2 (Активных регистраций)

**Если нужно оставить хоть одну карточку:**

**Вариант A: Только "Найдено событий"** (recommended)

```tsx
<div className="rounded-xl border p-4 bg-white">
  <div className="text-sm text-muted-foreground mb-1">Найдено событий</div>
  <div className="text-4xl font-bold">{meta?.total ?? 0}</div>
</div>
```

**Плюсы:**
- Не требует stats API
- Использует данные из meta (уже есть)
- Простой, понятный UI

**Минусы:**
- Только одна карточка (может выглядеть неполно)

**Вариант B: Оставить 3 карточки, но БЕЗ stats API**

```tsx
<Card>
  <div>Всего событий</div>
  <div>{meta?.total ?? 0}</div>  {/* Вместо stats.total */}
</Card>

<Card>
  <div>Активных регистраций</div>
  <div>{meta?.total ?? 0}</div>
</Card>

<Card>
  <div>Всего участников</div>
  <div>{events.reduce((sum, e) => sum + (e.participantsCount ?? 0), 0)}</div>
</Card>
```

**Плюсы:**
- Сохраняет визуальный баланс (3 карточки)
- НЕ требует stats API
- Card 1 и Card 2 показывают одно и то же (дубль, но безопасный)

**Минусы:**
- Card 1 и Card 2 дублируют данные (confusing)
- Card 3 показывает только участников на ТЕКУЩЕЙ странице (не total)

**Рекомендация:** **Вариант A** (одна карточка "Найдено событий") или **полное удаление**.

---

## ✅ ВЫВОД

**БЕЗОПАСНО УДАЛИТЬ:**
- ✅ Stats карточки (все 3 или первую) — **РЕКОМЕНДАЦИЯ: удалить все 3**
- ✅ useEventsStats hook — `src/hooks/use-events-stats.ts`
- ✅ /api/events/stats endpoint — `src/app/api/events/stats/route.ts`
- ✅ getEventsStats() service function — `src/lib/services/events.ts:1139-1167`
- ✅ In-process cache — удаляется вместе с route.ts
- ✅ StatsSkeleton component — `src/components/events/stats-skeleton.tsx`
- ✅ countEventsByIds import — `src/lib/services/events.ts:15` (функция остаётся в repo)

**НЕ УДАЛЯТЬ:**
- ❌ meta.total — используется в UI "Найдено событий"
- ❌ DB repository functions (используются в основном списке)
- ❌ useEventsQuery hook (основа страницы)
- ❌ countEventsByIds function — **ОСТАВИТЬ** в eventRepo.ts (общая утилита)

**ЗАВИСИМОСТИ:**
- 🔄 Stats и Events — независимые запросы ✅
- 🔄 Фильтры и пагинация — НЕ зависят от stats ✅
- 🔄 Удаление stats НЕ повлияет на фильтры/пагинацию ✅
- 🔄 Нет внешних зависимостей от useEventsStats ✅
- 🔄 Нет внешних зависимостей от getEventsStats ✅

**КОЛИЧЕСТВО ФАЙЛОВ:**
- **Удалить:** 5 файлов
  1. `src/components/events/events-page-client.tsx` (частично, stats section)
  2. `src/hooks/use-events-stats.ts` (полностью)
  3. `src/app/api/events/stats/route.ts` (полностью)
  4. `src/lib/services/events.ts` (частично, getEventsStats function)
  5. `src/components/events/stats-skeleton.tsx` (полностью)

- **Обновить документацию:** 2 SSOT файла
  1. `docs/ssot/api-ssot.md` (удалить API-027, обновить счётчики)
  2. `docs/ARCHITECTURE.md` (обновить § 10, § 7, TOC)

**ПЛАН:**
1. **Frontend:** Удалить stats section, hook, imports (30 мин)
2. **Backend:** Удалить API route, service function (15 мин)
3. **Verify:** TypeScript + Build + Manual test (15 мин)
4. **SSOT:** Обновить api-ssot.md + ARCHITECTURE.md (30 мин)
5. **Session:** Создать complete.md (15 мин)
6. **Git:** Commit + push (5 мин)

**ВРЕМЯ:** **~1 час 50 минут total**

**РИСКИ:** ✅ Минимальные (все зависимости проверены)

---

## 📎 REFERENCES

- **API SSOT:** `docs/ssot/api-ssot.md` (API-XXX: /api/events/stats)
- **ARCHITECTURE:** `docs/ARCHITECTURE.md` (Caching Strategy)
- **Files:**
  - `src/components/events/events-page-client.tsx`
  - `src/hooks/use-events-stats.ts`
  - `src/app/api/events/stats/route.ts`
  - `src/lib/services/events.ts`

---

**Next Steps:** Переходи к implementation после одобрения плана.

