# Анализ производительности после деплоя (HAR лог 24.12.2024 12:03 UTC)

**Status:** ❌ **ПРОБЛЕМА УСУГУБИЛАСЬ**

---

## 📊 Результаты

### До оптимизации (первый HAR):
```
/api/auth/me:                  360-1212ms
/api/events/[id]:              1681-2317ms
/api/events/[id]/participants: 1027-1516ms
```

### После Edge Runtime (текущий HAR):
```
/api/auth/me:                   845ms  (OK, но не улучшение)
/api/events/[id]:              3413ms  ❌ (+100% хуже!)
/api/events/[id]/participants: 4364ms  ❌ (+187% хуже!)
```

---

## 🔍 Анализ проблемы

### 1. Edge Runtime не работает

**Ожидалось:**
- Header `x-vercel-execution-region: fra1`
- Header `x-vercel-compute-unit-consumed: 0.005`
- Быстрый cold start (10-50ms)

**Реально:**
- Нет Edge Runtime headers
- `x-vercel-cache: MISS`
- Разные `instanceId` для каждого запроса

**Причина:**
Edge Runtime **несовместим** с нашим стеком:
- `@supabase/supabase-js` использует Node.js APIs (buffer, crypto)
- `revalidatePath()` доступен только в Node.js runtime
- Vercel делает **automatic fallback** на Node.js → double overhead

### 2. Новая гипотеза: Upstash Redis

Middleware делает rate limiting через Upstash Redis:

```typescript
// src/middleware.ts:328
const { success, limit, remaining, reset } = await limiter.limit(identifier);
```

**Каждый API запрос = roundtrip к Upstash:**
```
Request → Vercel Middleware → Upstash Redis (rate limit) → API Route → Supabase → Response
```

**Если Upstash медленный:**
- Region далеко от Vercel (например, Upstash в US, Vercel в EU)
- Не настроен (timeout пока ждет подключения)
- High latency (1-3 секунды на запрос)

---

## ✅ Реализованные изменения

### Commit: `8ce034f`

**1. Откат Edge Runtime**
- Удален `export const runtime = 'edge'` из всех API routes
- Вернули Node.js runtime (совместимый с Supabase)

**2. Добавлены диагностические логи**

```typescript
const rateLimitStart = Date.now();
const { success, limit, remaining, reset } = await limiter.limit(identifier);
const rateLimitDuration = Date.now() - rateLimitStart;

if (rateLimitDuration > 100) {
  console.warn('[Middleware] ⚠️ Slow rate limit check', {
    pathname,
    duration: `${rateLimitDuration}ms`,
    tier,
  });
}
```

---

## 🎯 Следующие шаги

### 1. Проверить Vercel логи (СРОЧНО)

**Откройте Vercel Dashboard → Functions → Logs**

Ищите:
```
[Middleware] ⚠️ Slow rate limit check
```

**Если есть:**
- ✅ Проблема подтверждена: Upstash Redis медленный
- Решение: Отключить rate limiting или настроить правильный region

**Если нет:**
- ❌ Проблема в другом месте
- Нужно профилировать Supabase queries

### 2. Временное решение: Отключить rate limiting

Если в логах видны медленные rate limit checks:

```typescript
// src/middleware.ts:308
if (!isAdminRoute(pathname) && !isCronRoute(pathname)) {
  const limiters = initializeRateLimiting();
  
  // TEMPORARY FIX: Skip rate limiting if slow
  if (false && limiters) {  // ⬅️ Добавить false &&
    // ... rate limiting code
  }
}
```

Это уберет 1-3 секунды latency, но **отключит защиту от DDoS**.

### 3. Постоянное решение: Правильный Upstash setup

**Проверить в Vercel Environment Variables:**
```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

**Создать Upstash database в правильном region:**
- Vercel deploym в `fra1` (Frankfurt) → Upstash EU region
- Vercel deployment в `iad1` (US East) → Upstash US East region

**Alternative:** Vercel KV (built-in Redis)
- Автоматически в том же region
- Меньше latency
- Платная фича (Pro plan)

### 4. Альтернатива: In-memory rate limiting

Для малого трафика можно использовать in-memory cache:

```typescript
// Simple in-memory rate limiter (не работает на Vercel Serverless!)
const rateLimitCache = new Map<string, number>();
```

**НО:** Не работает на Vercel Serverless (каждый request = новый instance).

---

## 📝 Технические детали

### Почему Edge Runtime не работает?

```typescript
// ❌ Не работает в Edge Runtime
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto'; // Node.js API

// ✅ Работает в Edge Runtime
import { fetch } from 'next/server';
import { headers } from 'next/headers';
```

Supabase SDK использует:
- `Buffer` (Node.js)
- `crypto.randomBytes()` (Node.js)
- `process.env` (Node.js)

### Timing breakdown (гипотеза)

```
Total: 3413ms для /api/events/[id]
├─ Cold start (Node.js):       ~500ms
├─ Middleware (rate limit):   ~2500ms  ⬅️ UPSTASH?
├─ getCurrentUser():            ~200ms
├─ getEventWithVisibility():    ~100ms
├─ hydrateEvent():              ~100ms
└─ Response encoding:            ~13ms
```

### Как проверить timing?

**Добавить логи в API route:**

```typescript
export async function GET(_: Request, { params }: Params) {
  const start = Date.now();
  
  try {
    const { id } = await params;
    console.log('[API] GET /api/events/[id] - params parsed', { duration: Date.now() - start });
    
    const userStart = Date.now();
    const currentUser = await getCurrentUser();
    console.log('[API] getCurrentUser() done', { duration: Date.now() - userStart });
    
    const eventStart = Date.now();
    const event = await getEventWithVisibility(id, { currentUser, enforceVisibility: true });
    console.log('[API] getEventWithVisibility() done', { duration: Date.now() - eventStart });
    
    const hydrateStart = Date.now();
    const hydrated = await hydrateEvent(event);
    console.log('[API] hydrateEvent() done', { duration: Date.now() - hydrateStart });
    
    console.log('[API] Total duration', { duration: Date.now() - start });
    return respondJSON({ event: hydrated });
  } catch (err) {
    return respondError(err);
  }
}
```

---

## 🎉 Положительные результаты

**Reference data кэширование работает отлично:**

```
/api/car-brands:        HIT, 264ms  ✅
/api/vehicle-types:     HIT, 153ms  ✅
/api/event-categories:  HIT, 151ms  ✅
/api/cities/[id]:       HIT, 158ms  ✅
```

Все показывают `vercelCache: HIT` и быстрые времена отклика!

---

## 🔧 Action Items

**Priority 1 (URGENT):**
- [ ] Проверить Vercel функциональные логи на `Slow rate limit check`
- [ ] Проверить Upstash configuration в Vercel Environment Variables

**Priority 2 (если Upstash проблема):**
- [ ] Настроить Upstash в правильном region (EU для fra1)
- [ ] Или временно отключить rate limiting

**Priority 3 (если не Upstash):**
- [ ] Добавить timing logs в API routes
- [ ] Профилировать Supabase queries
- [ ] Проверить Supabase connection pooling

---

**Создано:** 24 декабря 2024, 15:20 MSK  
**Commit:** 8ce034f  
**HAR Log:** need4trip.app.har (12:03:13 UTC)

