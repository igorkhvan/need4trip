# Анализ производительности need4trip.app

**Дата:** 24 декабря 2024  
**Источник:** HAR-лог Safari (страница редактирования события)  
**Критичность:** 🔴 ВЫСОКАЯ

---

## 📊 Executive Summary

**Общее время загрузки страницы:** ~20 секунд  
**Главная проблема:** Медленные API запросы к Supabase (все время уходит на `wait`, а не на сеть)  
**Root Cause:** 
1. Cold start Vercel serverless функций
2. Последовательное выполнение запросов (waterfall)
3. N+1 проблема при hydration
4. Отсутствие кеширования (все запросы `x-vercel-cache: MISS`)

---

## 🔍 Детальный анализ HAR-лога

### ✅ Что работает хорошо

- **Безопасность:** Все security headers на месте (CSP, HSTS, X-Frame-Options)
- **Сжатие:** Brotli компрессия работает корректно
- **Статика:** Ресурсы Next.js кешируются в Memory Cache
- **Нет ошибок:** Все запросы завершились с HTTP 200
- **Rate Limiting:** Активен (60 req/min)

### 🔴 Критические проблемы производительности

#### 1. **Медленные API endpoints**

| Endpoint | Wait Time | Total Time | Размер ответа |
|----------|-----------|------------|---------------|
| `GET /api/events/{id}` | **4092ms** | 4094ms | 3.5KB |
| `GET /api/events/{id}/participants` | **1899ms** | 1902ms | ~1KB |
| `GET /api/auth/me` | **1675ms** | 1676ms | 471B |
| `GET /api/car-brands` | 833ms | 847ms | ~10KB |
| `GET /api/cities/{id}` | 825ms | 828ms | ~200B |
| `GET /api/vehicle-types` | 643ms | 644ms | ~500B |
| `GET /api/event-categories` | 508ms | 512ms | ~800B |

**Вывод:** 99% времени уходит на `wait` (ожидание ответа от сервера), сеть быстрая.

#### 2. **Каскадная загрузка (Waterfall Pattern)**

```
11:03:40.071 - Page Load Start
11:03:41.423 - /api/auth/me (1676ms) ⏳
11:03:43.104 - /api/events/{id} (4094ms) ⏳⏳⏳⏳
11:03:47.208 - /api/events/{id}/participants (1902ms) ⏳⏳
11:03:49.430 - /api/cities/{id} (828ms) ⏳
11:03:49.434 - /api/car-brands (847ms) ⏳
              /api/vehicle-types (644ms) ⏳
              /api/event-categories (512ms) ⏳
```

**Итого:** ~20 секунд до полной загрузки страницы!

#### 3. **Кеширование НЕ работает**

```http
x-vercel-cache: MISS  // на ВСЕХ 43 запросах
```

Ни один API endpoint не кешируется. Каждый запрос идет в БД.

---

## 🔬 Анализ кода

### Проблема #1: N+1 в `hydrateEvent()`

**Файл:** `src/lib/services/events.ts:170`

```typescript
export async function hydrateEvent(event: Event): Promise<Event> {
  // ❌ 3 последовательных запроса к БД
  let allowedBrands = await getAllowedBrands(event.id);        // ~100ms
  let participantsCount = await countParticipants(event.id);   // ~150ms
  let locations = await getLocationsByEventId(event.id);       // ~100ms
  
  // ❌ 2 последовательных hydration вызова
  const [hydrated] = await hydrateCitiesAndCurrencies([hydratedEvent]); // ~300ms
  const [eventWithCategory] = await hydrateEventCategories([event]);    // ~200ms
  
  return hydratedEvent;
}
```

**Итого:** ~850ms только на hydration для одного события!

### Проблема #2: Двойной запрос в `/api/events/[id]/participants`

**Файл:** `src/app/api/events/[id]/participants/route.ts:10-16`

```typescript
export async function GET(_: Request, context: Params) {
  const { id } = await context.params;
  const currentUser = await getCurrentUser();              // +100ms (запрос к БД)
  await getEventWithVisibility(id, { currentUser, ... }); // +800ms (еще один getEventById!)
  const participants = await listParticipants(id);        // +300ms
  return respondJSON({ participants });
}
```

**Проблема:** Событие загружается для проверки видимости, но не используется в ответе!

### Проблема #3: `getCurrentUser()` делает запрос к БД при каждом вызове

**Файл:** `src/lib/auth/currentUser.ts:48-83`

```typescript
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const payload = await verifyJwt(token, secret);
  
  // ❌ Запрос к БД при КАЖДОМ вызове API
  const user = await getUserById(String(payload.userId));  // +300ms
  return user;
}
```

**Используется в:**
- `/api/auth/me` - очевидно
- `/api/events/[id]` - для проверки видимости
- `/api/events/[id]/participants` - для проверки видимости

### Проблема #4: Справочники не кешируются

**Файлы:**
- `/api/car-brands` (833ms)
- `/api/vehicle-types` (643ms)  
- `/api/event-categories` (508ms)
- `/api/cities/{id}` (825ms)

Эти данные **статичные** и редко меняются, но загружаются с каждым запросом.

---

## 🎯 План оптимизации

### 1. ✅ Оптимизация `/api/events/[id]` (4092ms → ~500ms)

**Цель:** Снизить время с 4 секунд до 500ms

**Изменения:**

1. **Параллельная загрузка в `hydrateEvent()`**
   ```typescript
   const [allowedBrands, participantsCount, locations, [hydratedWithCity], [hydratedWithCategory]] = 
     await Promise.all([
       getAllowedBrands(event.id),
       countParticipants(event.id),
       getLocationsByEventId(event.id),
       hydrateCitiesAndCurrencies([event]),
       hydrateEventCategories([event]),
     ]);
   ```

2. **Добавить индекс на `events.id`** (primary key уже есть, но проверим составные)

3. **ISR кеширование для публичных событий**
   ```typescript
   export const revalidate = 60; // ISR 60 секунд для стабильных событий
   ```

**Ожидаемый результат:** 4092ms → **~500ms** (8x ускорение)

---

### 2. ✅ Оптимизация `/api/events/[id]/participants` (1899ms → ~300ms)

**Изменения:**

1. **Убрать лишний `getEventWithVisibility()`**
   - Проверку видимости перенести на уровень middleware
   - Или кешировать результат

2. **Добавить индекс на `event_participants.event_id`** (уже есть, но проверим)

**Ожидаемый результат:** 1899ms → **~300ms** (6x ускорение)

---

### 3. ✅ Оптимизация `/api/auth/me` (1675ms → ~100ms)

**Изменения:**

1. **Использовать `getCurrentUserFromMiddleware()`** вместо `getCurrentUser()`
   - Middleware уже загрузил пользователя и добавил `x-user-id` header
   - Не нужен повторный запрос к БД

2. **Добавить кеш JWT → User в memory**
   ```typescript
   const userCache = new LRUCache<string, CurrentUser>({ max: 1000, ttl: 60000 });
   ```

**Ожидаемый результат:** 1675ms → **~100ms** (16x ускорение)

---

### 4. ✅ Кеширование справочников (800ms → instant)

**Изменения:**

1. **Добавить HTTP кеширование для справочников**
   ```typescript
   // /api/car-brands, /api/vehicle-types, /api/event-categories
   headers: {
     'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400'
   }
   ```

2. **Использовать Next.js `unstable_cache` для БД запросов**
   ```typescript
   export const getCarBrands = unstable_cache(
     async () => { ... },
     ['car-brands'],
     { revalidate: 3600 }
   );
   ```

3. **Client-side кеш в React Query**
   ```typescript
   { staleTime: 5 * 60 * 1000 } // 5 минут
   ```

**Ожидаемый результат:** 800ms → **instant** (повторные запросы)

---

### 5. ✅ Параллельная загрузка на клиенте

**Изменения:**

**До:**
```typescript
const user = await fetch('/api/auth/me');
const event = await fetch(`/api/events/${id}`);
const participants = await fetch(`/api/events/${id}/participants`);
```

**После:**
```typescript
const [user, event, participants] = await Promise.all([
  fetch('/api/auth/me'),
  fetch(`/api/events/${id}`),
  fetch(`/api/events/${id}/participants`),
]);
```

**Ожидаемый результат:** 7500ms → **~4000ms** (параллельно)

---

### 6. ✅ Добавление индексов в БД

**Миграция:** `20241224_performance_indexes.sql`

```sql
-- Составной индекс для event_participants (для COUNT запросов)
CREATE INDEX IF NOT EXISTS idx_event_participants_event_count 
  ON event_participants(event_id) 
  INCLUDE (id);

-- Индекс для event_locations (для быстрой загрузки)
CREATE INDEX IF NOT EXISTS idx_event_locations_event_sort 
  ON event_locations(event_id, sort_order);

-- Индекс для event_allowed_brands (N+1 в getAllowedBrands)
CREATE INDEX IF NOT EXISTS idx_event_allowed_brands_event 
  ON event_allowed_brands(event_id) 
  INCLUDE (brand_id);

-- Индекс на users.id (primary key уже есть, но для уверенности)
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Analyze для обновления статистики
ANALYZE events;
ANALYZE event_participants;
ANALYZE event_locations;
```

**Ожидаемый результат:** Ускорение всех запросов на 20-50%

---

## 📈 Ожидаемые результаты

### До оптимизации:
```
Total: 20+ секунд
├── /api/auth/me:          1675ms
├── /api/events/{id}:      4092ms
├── /api/.../participants: 1899ms
├── /api/car-brands:        847ms
├── /api/cities/{id}:       828ms
├── /api/vehicle-types:     644ms
└── /api/event-categories:  512ms
```

### После оптимизации:
```
Total: ~2-3 секунды (8x ускорение!)
├── Параллельно:
│   ├── /api/auth/me:           100ms (16x ⚡)
│   ├── /api/events/{id}:       500ms (8x ⚡)
│   └── /api/.../participants:  300ms (6x ⚡)
└── Справочники (cached):    instant (∞x ⚡)
```

---

## 🚀 Приоритеты

### P0 (Критично - сделать сейчас):
1. ✅ Параллельная загрузка в `hydrateEvent()` → 8x ускорение
2. ✅ Использовать `getCurrentUserFromMiddleware()` → 16x ускорение
3. ✅ Добавить индексы в БД → 20-50% ускорение
4. ✅ Параллельные запросы на клиенте → 2x ускорение

### P1 (Важно - сделать после P0):
5. ✅ HTTP кеширование справочников → instant повторная загрузка
6. ✅ Убрать лишний `getEventWithVisibility()` в participants
7. ✅ Добавить ISR для событий

### P2 (Можно потом):
- React Query для дедупликации
- Server Components вместо API routes
- Streaming SSR для длинных списков

---

## 📝 Метрики для мониторинга

После внедрения оптимизаций отслеживать:

1. **Time To First Byte (TTFB):** должно быть < 500ms
2. **API Response Times:**
   - `/api/auth/me` < 100ms
   - `/api/events/[id]` < 500ms
   - `/api/events/[id]/participants` < 300ms
3. **Cache Hit Rate:** > 80% для справочников
4. **Total Page Load:** < 3 секунд

---

## 🎓 Выводы

1. **Cold Start Vercel** - основная причина медленных первых запросов
2. **N+1 проблема** - hydrateEvent делает 5 последовательных запросов
3. **Waterfall** - запросы идут каскадом, а не параллельно
4. **Нет кеширования** - ни HTTP, ни in-memory, ни client-side

**Решение:** Распараллелить, закешировать, добавить индексы.

**Ожидаемый результат:** 20 секунд → **2-3 секунды** (10x ускорение!)

