# SEO Implementation Blueprint

---
Status: DRAFT  
Created: 2026-02-10  
Author: Cursor AI  
Authority: NORMATIVE (during implementation phase)  
SSOT Reference: docs/ssot/SSOT_SEO.md  
Audit Reference: docs/audits/SEO_AUDIT_REPORT.md  
---

## 1. Цель

Реализовать требования SSOT_SEO.md в кодовой базе Need4Trip.

**Текущее состояние:** SEO-инфраструктура минимальна — нет robots.txt, sitemap, JSON-LD, canonical URLs; 3 публичные страницы рендерятся клиентским JS; URL используют UUID вместо slug; `lang="en"` при русском контенте.

**Целевое состояние:** Полное соответствие SSOT_SEO.md — slug-based URLs, SSR/ISR на всех публичных страницах, полные metadata, structured data, корректные indexing controls.

---

## 2. Scope

| Включено | Исключено (per SSOT §9–10) |
|----------|----------------------------|
| Slug-based URLs для events и clubs | City landing pages (`/cities/{slug}`) |
| CSR → SSR/ISR для listing-страниц | Multi-language routing |
| robots.txt, sitemap.xml | SEO A/B experiments |
| Meta robots (beta policy) | Advanced schema extensions |
| Canonical URLs | SEO KPIs, analytics tools |
| JSON-LD (Event, Organization) | Copywriting rules |
| Internal linking fixes | Dynamic OG image generation |
| `lang="ru-KZ"` fix | |
| OG-image asset creation | |

---

## 3. Waves (порядок реализации)

Реализация разбита на 4 волны с учётом зависимостей между задачами.

```
Wave 1 (Quick Wins)        →  нет зависимостей, можно параллельно
Wave 2 (Rendering)         →  нет зависимостей с Wave 1
Wave 3 (Slug Migration)    →  БЛОКИРУЕТ canonical URLs и sitemap
Wave 4 (Structured Data)   →  зависит от Wave 2 (SSR)
                               зависит от Wave 3 (slug URLs в JSON-LD)
```

---

## 4. Wave 1 — Quick Wins ✅ COMPLETED

**Цель:** Закрыть тривиальные gaps за один PR.  
**Оценка:** 3-4 часа  
**Зависимости:** Нет  
**SSOT-секции:** §5.2, §5.3, §6.1, §6.2, §8  
**Реализовано:** 2026-02-10, commit `362ab58`

### TASK 1.1 — Fix `lang` attribute ✅

**SSOT:** §6.2 — `<html lang>` MUST match actual content language

**Файл:** `src/app/layout.tsx:68`

**Текущее:**
```tsx
<html lang="en" className={inter.className}>
```

**Целевое:**
```tsx
<html lang="ru-KZ" className={inter.className}>
```

**Проверка:** Inspect rendered HTML — `<html lang="ru-KZ">`.

---

### TASK 1.2 — Создать robots.txt ✅

**SSOT:** §5.2 — robots.txt MUST allow entity pages, disallow API/admin/private

**Создать файл:** `src/app/robots.ts`

```typescript
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://need4trip.kz";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/events/", "/clubs/"],
        disallow: [
          "/api/",
          "/admin/",
          "/profile/",
          "/events/create",
          "/clubs/create",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

**Конфликты:** Middleware matcher `/api/:path*` — не конфликтует (robots.txt обслуживается по `/robots.txt`).

**Проверка:** `curl https://need4trip.kz/robots.txt` возвращает корректный robots.txt.

---

### TASK 1.3 — Meta robots на listing-страницах (beta) ✅

**SSOT:** §5.3 — Listing pages MUST declare `index: false, follow: true` during beta

**Файлы и изменения:**

**`src/app/(app)/events/page.tsx`:**
```typescript
export const metadata: Metadata = {
  title: "События",
  description: "Ближайшие автомобильные события и оффроуд-поездки",
  robots: {
    index: false,
    follow: true,
  },
};
```

**`src/app/(app)/clubs/layout.tsx`** (metadata для `/clubs`):
```typescript
export const metadata: Metadata = {
  title: "Клубы",
  description: "Автомобильные клубы на Need4Trip — найдите единомышленников",
  robots: {
    index: false,
    follow: true,
  },
};
```

**`src/app/(app)/pricing/page.tsx`** — добавить metadata (будет рефакторен в Wave 2, но metadata нужен сейчас). Поскольку файл `"use client"`, metadata нужно вынести — см. TASK 1.4.

**Проверка:** `<meta name="robots" content="noindex, follow">` в HTML.

---

### TASK 1.4 — Metadata для `/pricing` ✅

**SSOT:** §6.1 — All indexable pages MUST define title, description

**Текущее:** `/pricing` — `"use client"`, нет metadata export. Client Component не может экспортировать metadata.

**Решение:** Создать серверный wrapper:

**`src/app/(app)/pricing/page.tsx`** — переименовать текущий компонент в `PricingPageClient` (внутри файла или отдельный файл), создать Server Component wrapper:

```typescript
// src/app/(app)/pricing/page.tsx
import type { Metadata } from "next";
import { PricingPageClient } from "@/components/pricing/pricing-page-client";

export const metadata: Metadata = {
  title: "Тарифы Need4Trip",
  description: "Тарифы и планы для автомобильных клубов на Need4Trip",
  robots: {
    index: false,
    follow: true,
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
```

Текущее содержимое `src/app/(app)/pricing/page.tsx` перенести в `src/components/pricing/pricing-page-client.tsx`.

**Проверка:** `<title>Тарифы Need4Trip | Need4Trip</title>` в HTML.

---

### TASK 1.5 — Event → Club internal link ✅

**SSOT:** §8 — Event → Club link MUST use `<a>` elements

**Файл:** `src/app/(app)/events/[id]/page.tsx`

**Текущее:** Club badge отображается без `<a>` тега.

**Целевое:** Обернуть club badge в `<Link href={`/clubs/${event.clubId}`}>`.

**Дополнительно:** Проверить `src/components/events/event-card-detailed.tsx` — если club badge есть и там, добавить ссылку.

**Проверка:** На странице события клик по club badge ведёт на `/clubs/{id}`.

---

### TASK 1.6 — Footer: добавить ссылки на /clubs и /pricing ✅

**SSOT:** §8 — Homepage → Events listing (even if noindex)

**Файл:** `src/components/layout/main-footer-client.tsx`

**Текущее (секция "Продукт"):**
```tsx
<li><Link href="/events">События</Link></li>
<li><Link href="/#how-it-works">Как это работает</Link></li>
<li><button>Создать событие</button></li>
```

**Целевое:**
```tsx
<li><Link href="/events">События</Link></li>
<li><Link href="/clubs">Клубы</Link></li>
<li><Link href="/pricing">Тарифы</Link></li>
<li><Link href="/#how-it-works">Как это работает</Link></li>
```

**Примечание:** Ссылки в footer НЕ зависят от `SOFT_BETA_STRICT` — per SSOT §8: "Hidden UI MUST NOT remove links from DOM". Footer линки обеспечивают crawl-путь даже при скрытой навигации.

**Проверка:** Footer содержит ссылки на `/events`, `/clubs`, `/pricing`.

---

### TASK 1.7 — OG-image asset ✅

**Текущее:** `src/app/layout.tsx:37` ссылается на `/og-default.png`, но файл **отсутствует** в `public/`.

**Решение:** Создать файл `public/og-default.png` (1200×630px).

**Контент:** Логотип Need4Trip + слоган на русском, оранжевый брендовый цвет `#FF6F2C`, белый текст.

**Примечание:** Это дизайнерская задача. Если дизайн недоступен — создать минимальный placeholder (solid color + text).

**Проверка:** `curl -I https://need4trip.kz/og-default.png` → 200 OK.

---

### TASK 1.8 — Beta gating: DOM preservation ✅

**SSOT:** §8 — "Hidden UI MUST NOT remove links from DOM"

**Файл:** `src/components/layout/main-header.tsx:12-16`

**Текущее:**
```tsx
const navItems = [
  { href: "/events", label: "События" },
  ...(!betaStrict ? [{ href: "/clubs", label: "Клубы" }] : []),
  ...(!betaStrict ? [{ href: "/pricing", label: "Тарифы" }] : []),
];
```

**Проблема:** В `SOFT_BETA_STRICT` mode ссылки на `/clubs` и `/pricing` полностью удаляются из DOM. SSOT §8 запрещает это.

**Решение:** Всегда включать все навигационные элементы в DOM. В beta mode скрывать визуально через CSS, но сохранять `<a>` для crawlers:

```tsx
const navItems = [
  { href: "/events", label: "События", visible: true },
  { href: "/clubs", label: "Клубы", visible: !betaStrict },
  { href: "/pricing", label: "Тарифы", visible: !betaStrict },
];
```

При рендеринге: элементы с `visible: false` получают `className="sr-only"` (screen-reader only, в DOM, но визуально скрыты).

**Альтернатива:** `aria-hidden="true"` + `tabIndex={-1}` + `className="hidden"` — но `sr-only` предпочтительнее для SEO (crawlers видят, пользователи — нет).

**Проверка:** В beta mode — view source содержит `<a href="/clubs">` и `<a href="/pricing">`.

---

## 5. Wave 2 — CSR → SSR/ISR Rendering ✅ COMPLETED

**Цель:** Все публичные страницы рендерятся на сервере.  
**SSOT:** §4.1, §4.2  
**Оценка:** 3-5 дней → **выполнено за 1 сессию**  
**Зависимости:** Нет (параллельно с Wave 1)  
**Статус:** DONE (2026-02-10) — commit `ac49afe`

### Архитектурное решение

Паттерн для всех listing-страниц одинаковый:
1. Page — Server Component (fetches initial data)
2. Client Component — получает initial data как props, управляет фильтрами/пагинацией
3. Client-side refetch — при изменении фильтров fetches API (как сейчас)

```
┌────────────────────────────┐
│  page.tsx (Server)         │
│  ┌──────────────────────┐  │
│  │ await fetchData()    │  │  ← SSR: initial load
│  │ <ClientComp          │  │
│  │   initialData={data} │  │
│  │   searchParams={sp}  │  │
│  │ />                   │  │
│  └──────────────────────┘  │
└────────────────────────────┘
         │
         ▼ hydration
┌────────────────────────────┐
│  ClientComp (Client)       │
│  "use client"              │
│  ┌──────────────────────┐  │
│  │ state = initialData  │  │  ← No loading spinner on first paint
│  │ onFilterChange →     │  │
│  │   fetch('/api/...')   │  │  ← CSR: subsequent navigations
│  └──────────────────────┘  │
└────────────────────────────┘
```

---

### TASK 2.1 — `/pricing` → ISR

**Сложность:** Низкая (2-3 часа)  
**Приоритет:** Первый — самый простой, proof of concept паттерна

**Текущее:** `src/app/(app)/pricing/page.tsx` — full `"use client"`, fetch в `useEffect`

**Целевое:**

**Step 1:** Переместить UI-компонент в `src/components/pricing/pricing-page-client.tsx`:
- Перенести текущее содержимое (JSX, состояние loading/error)
- Добавить `initialPlans` prop: `PricingPageClient({ initialPlans }: { initialPlans: PricingPlan[] })`
- Если `initialPlans` передан — не делать `useEffect` fetch
- Если нет (fallback) — fetch как раньше

**Step 2:** Новый `src/app/(app)/pricing/page.tsx`:
```typescript
import type { Metadata } from "next";
import { listPublicPlans } from "@/lib/db/planRepo";
import { PricingPageClient } from "@/components/pricing/pricing-page-client";

export const metadata: Metadata = {
  title: "Тарифы Need4Trip",
  description: "Тарифы и планы для автомобильных клубов на Need4Trip",
  robots: { index: false, follow: true },
};

export const revalidate = 300; // ISR: 5 minutes (matches planRepo cache TTL)

export default async function PricingPage() {
  const plans = await listPublicPlans();
  return <PricingPageClient initialPlans={plans} />;
}
```

**Серверная функция:** `listPublicPlans()` в `src/lib/db/planRepo.ts:92` — уже существует, cached (5 min TTL).

**Проверка:**
- View source → HTML содержит pricing content (не loading spinner)
- `curl` без JS → видны тарифы
- ISR: страница обновляется без re-deploy

---

### TASK 2.2 — `/clubs` → SSR + ISR

**Сложность:** Средняя (1-1.5 дня)

**Текущее:** `src/app/(app)/clubs/page.tsx` — full `"use client"`, fetch в `useEffect`.

**Серверные функции (уже существуют):**
- `listClubs(page, limit)` → `src/lib/db/clubRepo.ts:49`
- `searchClubs(query)` → `src/lib/services/clubs.ts` (если есть)
- `listClubsByCity(cityId)` → `src/lib/services/clubs.ts` (если есть)

**Целевое:**

**Step 1:** Извлечь Client Component:
- Текущий `src/app/(app)/clubs/page.tsx` → `src/components/clubs/clubs-page-client.tsx`
- Добавить prop `initialData: { clubs: Club[], total: number }`
- При наличии `initialData` — использовать как начальное состояние
- Фильтрация/поиск/пагинация — остаётся client-side

**Step 2:** Новый `src/app/(app)/clubs/page.tsx`:
```typescript
import type { Metadata } from "next";
import { listClubs } from "@/lib/db/clubRepo";
import { mapDbClubToDomain } from "@/lib/mappers";
import { ClubsPageClient } from "@/components/clubs/clubs-page-client";

export const metadata: Metadata = {
  title: "Клубы",
  description: "Автомобильные клубы на Need4Trip — найдите единомышленников",
  robots: { index: false, follow: true },
};

export const revalidate = 60; // ISR: 1 minute

export default async function ClubsPage() {
  const result = await listClubs(1, 12);
  const clubs = result.data.map(mapDbClubToDomain);
  return (
    <ClubsPageClient
      initialClubs={clubs}
      initialTotal={result.total}
    />
  );
}
```

**Нюансы:**
- Metadata для `/clubs` сейчас в `src/app/(app)/clubs/layout.tsx` — перенести в page или оставить в layout (layout metadata + page metadata merge в Next.js)
- `window.scrollTo()` — заменить на `router.push` с scroll option или использовать только на клиенте
- Stats (totalMembers, totalEvents) — пока считаются client-side; для SEO достаточно списка клубов

**Проверка:**
- View source → HTML содержит club cards (не скелетоны)
- Фильтры работают после hydration

---

### TASK 2.3 — `/events` → SSR + ISR

**Сложность:** Средняя (1.5-2 дня)

**Текущее:** `src/app/(app)/events/page.tsx` — Server Component wrapper, делегирует в `EventsPageClient` (CSR)

**Серверные функции (уже существуют):**
- `listVisibleEventsForUserPaginated()` → `src/lib/services/events.ts:1074`
- Принимает: `filters`, `sort`, `pagination`, `userId`

**Целевое:**

**Step 1:** Обновить `EventsPageClient`:
- Добавить prop `initialData` с начальными events
- При наличии — не делать первый fetch
- Последующие фильтры → client-side fetch как раньше

**Step 2:** Обновить `src/app/(app)/events/page.tsx`:
```typescript
import type { Metadata } from "next";
import { listVisibleEventsForUserPaginated } from "@/lib/services/events";
import { resolveCurrentUser } from "@/lib/auth/currentUser";
import { EventsPageClient } from "@/components/events/events-page-client";

export const metadata: Metadata = {
  title: "События",
  description: "Ближайшие автомобильные события и оффроуд-поездки",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic"; // SSR: needs current user for visibility

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const params = await searchParams;
  const currentUser = await resolveCurrentUser();

  const result = await listVisibleEventsForUserPaginated({
    filters: {
      tab: (params.tab as string) || "upcoming",
      search: (params.search as string) || undefined,
      cityId: (params.cityId as string) || undefined,
      categoryId: (params.categoryId as string) || undefined,
    },
    sort: {
      field: (params.sort as string) || "date",
      direction: "asc",
    },
    pagination: {
      page: parseInt((params.page as string) || "1", 10),
      limit: 12,
    },
    userId: currentUser?.id ?? null,
  });

  return (
    <EventsPageClient
      initialData={result}
      initialParams={params}
    />
  );
}
```

**Нюансы:**
- `tab=my` требует auth — если нет user, server вернёт пустой список (graceful)
- `searchParams` — в Next.js 15+ это Promise, нужно await
- Categories — сейчас загружаются client-side из `/api/event-categories`; для SSR можно загрузить на сервере и передать как prop

**Проверка:**
- View source → HTML содержит event cards
- `tab=my` без auth → пустое состояние (не ошибка)
- Фильтры работают после hydration

---

## 6. Wave 3 — Slug Migration

**Цель:** URL-схема на slug вместо UUID.  
**SSOT:** §3.1, §3.2  
**Оценка:** 7-10 дней  
**Зависимости:** БЛОКИРУЕТ canonical URLs (§3.2) и sitemap (§5.4)

### Архитектурные решения

#### 6.1 Стратегия уникальности slug для Events

**Проблема:** `events.title` не уникален. Нужна стратегия slug-уникальности.

**Решение: `{title-slug}-{short-uuid}`**

Обоснование:
- Гарантированная уникальность без race condition
- Human-readable: `offroad-almaty-a1b2c3d4`
- Immutable (per SSOT §3.1)
- Не зависит от даты (дата может измениться)
- Short UUID = первые 8 символов UUID (достаточно для уникальности)

```typescript
function generateEventSlug(title: string, id: string): string {
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-zа-яёa-z0-9\s-]/gi, "")  // Keep cyrillic
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);  // Limit length

  const shortId = id.replace(/-/g, "").slice(0, 8);
  return `${titleSlug}-${shortId}`;
}
```

**Пример:** Event "Оффроуд-выезд Алматы" с UUID `550e8400-e29b-41d4-a716-446655440000` → slug `оффроуд-выезд-алматы-550e8400`

**Важно:** SSOT §3.1 — "Slugs MUST be immutable after first publication". Slug генерируется один раз при создании и **никогда не меняется**, даже если title изменится.

---

#### 6.2 Кириллица в slug

**Решение:** Разрешить кириллицу в slug.

Обоснование:
- Целевая аудитория — русскоязычные пользователи
- Google и Yandex корректно индексируют кириллические URL
- Transliteration (оффроуд → offroad) теряет смысл для целевой аудитории
- URL encoding: браузеры отображают кириллицу, но передают как `%D0%...` — допустимо

**Альтернативный вариант (если архитектор предпочтёт ASCII):**
Добавить transliteration: `кириллица → latinica` через маппинг символов.

---

### TASK 3.1 — Database migration: events.slug

**Создать:** `supabase/migrations/YYYYMMDD_add_event_slug.sql`

```sql
-- Add slug column to events
ALTER TABLE events ADD COLUMN slug TEXT;

-- Backfill slugs for existing events
UPDATE events
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      LEFT(title, 60) || '-' || LEFT(REPLACE(id::text, '-', ''), 8),
      '[^a-zа-яёa-z0-9\s-]', '', 'gi'
    ),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE events ALTER COLUMN slug SET NOT NULL;

-- Unique index (case-insensitive)
CREATE UNIQUE INDEX events_slug_idx ON events (LOWER(slug));
```

**Проверка:**
- `SELECT slug FROM events LIMIT 10;` — все slug заполнены
- `SELECT COUNT(*) FROM events WHERE slug IS NULL;` → 0
- Unique constraint работает

**SSOT_DATABASE.md:** Обновить после миграции.

---

### TASK 3.2 — Repository: добавить slug-функции

**Файл:** `src/lib/db/eventRepo.ts`

Добавить:
```typescript
export async function getEventBySlug(slug: string): Promise<DbEvent | null> {
  const db = getAdminDbSafe();
  if (!db) return null;

  const { data, error } = await db
    .from(table)
    .select("*")
    .ilike("slug", slug)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  return data as DbEvent;
}
```

**Файл:** `src/lib/db/clubRepo.ts`

Добавить:
```typescript
export async function getClubBySlug(slug: string): Promise<DbClub | null> {
  const db = getAdminDb();

  const { data, error } = await db
    .from(table)
    .select(CLUB_COLUMNS)
    .ilike("slug", slug)
    .is("archived_at", null)
    .single();

  if (error || !data) return null;
  return data as DbClub;
}
```

**Файл:** `src/lib/db/eventRepo.ts` — обновить `createEvent`:
```typescript
// В createEvent — добавить slug generation
slug: generateEventSlug(payload.title, generatedId),
```

**Проверка:** Unit test — `getEventBySlug("test-slug")` возвращает event.

---

### TASK 3.3 — Routing: `/events/[slug]` и `/clubs/[slug]`

**Решение:** Переименовать `[id]` → `[slug]` в маршрутах.

**Файлы (rename directory):**
- `src/app/(app)/events/[id]/` → `src/app/(app)/events/[slug]/`
- `src/app/(app)/clubs/[id]/` → `src/app/(app)/clubs/[slug]/`

**Логика page.tsx — dual resolution (slug + UUID fallback):**

```typescript
// src/app/(app)/events/[slug]/page.tsx
export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Try slug first, then UUID fallback (for legacy links)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  if (isUUID) {
    // Legacy UUID URL → lookup event → redirect to slug URL
    const event = await getEventById(slug);
    if (event?.slug) {
      redirect(`/events/${event.slug}`, RedirectType.replace);
      // 308 by default in Next.js redirect(), use permanentRedirect() for 308
    }
  }

  // Normal slug resolution
  const event = await getEventBasicInfo(slugValue, { ... });
  // ...
}
```

**Нюансы:**
- `redirect()` из `next/navigation` — по умолчанию 307 (temporary). Использовать `permanentRedirect()` для 308 (permanent).
- SSOT §3.1 говорит "301" — в Next.js App Router: `permanentRedirect()` отдаёт 308 (HTTP permanent redirect). Для точного 301 — использовать middleware или `NextResponse.redirect(url, 301)`.

---

### TASK 3.4 — 301 Redirects: UUID → Slug

**Предпочтительный подход:** Middleware-level redirect (быстрее, Edge Runtime).

**Файл:** `src/middleware.ts`

**Текущий matcher:** `/api/:path*`

**Обновлённый matcher:**
```typescript
export const config = {
  matcher: ['/api/:path*', '/events/:path*', '/clubs/:path*'],
};
```

**Логика redirect в middleware:**
```typescript
// В middleware() function — ДО обработки API routes:
const pathname = request.nextUrl.pathname;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Check if /events/{uuid} or /clubs/{uuid}
const eventsMatch = pathname.match(/^\/events\/([^/]+)/);
const clubsMatch = pathname.match(/^\/clubs\/([^/]+)/);

if (eventsMatch && uuidPattern.test(eventsMatch[1])) {
  // Lookup slug by UUID (lightweight DB call or cache)
  const slug = await lookupEventSlug(eventsMatch[1]);
  if (slug) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(eventsMatch[1], slug);
    return NextResponse.redirect(url, 301);
  }
}
// Аналогично для clubs
```

**Проблема:** Middleware работает на Edge Runtime — DB-запрос может быть дорогим. **Альтернатива:** page-level redirect (TASK 3.3) — проще, но не 301.

**Рекомендация:** Начать с page-level `permanentRedirect()` (308), добавить middleware 301 как оптимизацию позже.

---

### TASK 3.5 — Обновить все internal URL references

**Масштаб:** ~45 файлов (20 clubs + 25 events)

**Принцип:** Все ссылки должны использовать slug, не UUID.

**Подход:**

1. Добавить `slug` в DTO/типы:
   - `src/lib/types/event.ts` — добавить `slug: string` в Event interface
   - `src/lib/types/club.ts` — `slug` уже есть в `Club` interface

2. Обновить mappers:
   - `mapDbEventToDomain()` — маппить `slug` field

3. Обновить все URL references:
   - `href={`/events/${event.id}`}` → `href={`/events/${event.slug}`}`
   - `href={`/clubs/${club.id}`}` → `href={`/clubs/${club.slug}`}`
   - `router.push(`/events/${event.id}`)` → `router.push(`/events/${event.slug}`)`

**Ключевые файлы (неполный список):**

Events:
- `src/components/events/event-card-detailed.tsx`
- `src/components/events/event-card-compact.tsx`
- `src/components/events/event-registration-control.tsx`
- `src/components/events/event-danger-zone.tsx`
- `src/app/(marketing)/_components/upcoming-events-async.tsx`
- `src/lib/services/notifications.ts:75` — Telegram URL generation

Clubs:
- `src/components/clubs/club-card.tsx`
- `src/app/(app)/clubs/[slug]/_components/club-profile-header.tsx`
- `src/app/(app)/clubs/[slug]/_components/club-events-preview-async.tsx`

**Telegram URLs:** `src/lib/services/notifications.ts` генерирует `${baseUrl}/events/${eventId}` для Telegram-уведомлений. Обновить на `${baseUrl}/events/${eventSlug}`. Старые ссылки в Telegram будут работать через 301 redirect (TASK 3.4).

**API routes:** `/api/events/[id]` и `/api/clubs/[id]` — **НЕ менять**. API использует UUID для internal operations.

**Проверка:**
- `rg '/events/\$\{.*\.id\}' src/` → 0 результатов (все заменены на slug)
- `rg '/clubs/\$\{.*\.id\}' src/` → 0 результатов (кроме API routes)

---

### TASK 3.6 — Canonical URLs

**SSOT:** §3.2 — All indexable pages MUST define canonical URL

**Зависимость:** Выполняется ПОСЛЕ slug migration (canonical должен указывать на slug URL).

**Файлы:**

**`src/app/(app)/events/[slug]/page.tsx` (в generateMetadata):**
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  // ... existing logic ...
  return {
    // ... existing fields ...
    alternates: {
      canonical: `/events/${event.slug}`,
    },
  };
}
```

**`src/app/(app)/clubs/[slug]/page.tsx` (в generateMetadata):**
```typescript
alternates: {
  canonical: `/clubs/${club.slug}`,
},
```

**Статические страницы — в metadata export:**
```typescript
// Homepage (marketing page)
alternates: { canonical: "/" },

// Events listing
alternates: { canonical: "/events" },

// Clubs listing
alternates: { canonical: "/clubs" },

// Pricing
alternates: { canonical: "/pricing" },
```

**Проверка:** `<link rel="canonical" href="https://need4trip.kz/events/slug-here">` в HTML.

---

### TASK 3.7 — Dynamic Sitemap

**SSOT:** §5.4 — Sitemap MUST include only canonical, indexable URLs with slug-based URLs

**Зависимость:** Выполняется ПОСЛЕ slug migration.

**Создать:** `src/app/sitemap.ts`

```typescript
import type { MetadataRoute } from "next";
import { listPublicEvents } from "@/lib/db/eventRepo";
import { listClubs } from "@/lib/db/clubRepo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://need4trip.kz";

  // Static pages (indexable during beta: only homepage)
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];

  // Events (public, non-deleted)
  const eventsResult = await listPublicEvents(1, 10000);
  const eventPages: MetadataRoute.Sitemap = eventsResult.data.map((event) => ({
    url: `${baseUrl}/events/${event.slug}`,
    lastModified: event.updated_at ? new Date(event.updated_at) : new Date(event.date_time),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Clubs (public, non-archived)
  const clubsResult = await listClubs(1, 10000);
  const clubPages: MetadataRoute.Sitemap = clubsResult.data.map((club) => ({
    url: `${baseUrl}/clubs/${club.slug}`,
    lastModified: new Date(club.updated_at),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Note: listing pages (/events, /clubs, /pricing) excluded during beta per SSOT §5.1
  return [...staticPages, ...eventPages, ...clubPages];
}
```

**Нюансы:**
- `listPublicEvents` и `listClubs` нужно проверить — возвращают ли они slug
- Если > 50,000 URL — потребуется sitemap index (Next.js `generateSitemaps()`)
- `slug` field должен быть в `EventListItem` и `DbClub` DTO

**Проверка:** `curl https://need4trip.kz/sitemap.xml` → корректный XML.

---

## 7. Wave 4 — Structured Data (JSON-LD)

**Цель:** Event и Organization schema.org markup.  
**SSOT:** §7.1  
**Оценка:** 3-5 часов  
**Зависимости:** Wave 2 (SSR — данные доступны на сервере), Wave 3 (slug URLs в `url` field)

### TASK 4.1 — Event JSON-LD

**Файл:** `src/app/(app)/events/[slug]/page.tsx`

**Данные доступны через `getEventBasicInfo()`:**

| Schema.org | Source | Обязательно |
|------------|--------|-------------|
| `@type` | `"Event"` | Да |
| `name` | `event.title` | Да |
| `description` | `stripHtml(event.description)` | Да |
| `startDate` | `event.dateTime` (ISO 8601) | Да |
| `endDate` | Отсутствует в БД | Нет (допустимо) |
| `location.@type` | `"Place"` | Да |
| `location.name` | `event.locations[0]?.title` | Если есть |
| `location.address` | `event.city?.name` | Если есть |
| `location.geo` | `{ lat, lng }` | Если есть |
| `organizer.name` | `ownerUser?.name` | Если есть |
| `image` | `club?.logoUrl \|\| og-default.png` | Да |
| `url` | `${baseUrl}/events/${event.slug}` | Да |
| `offers.price` | `event.price` | Если isPaid |
| `offers.priceCurrency` | `event.currencyCode` | Если isPaid |
| `offers.availability` | Derive from capacity | Опционально |

**Имеющаяся утилита:** `stripHtml()` — `src/lib/utils/text.ts:12` (уже существует).

**Реализация:**

```tsx
// В page component, перед return JSX:
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: event.title,
  description: stripHtml(event.description),
  startDate: event.dateTime,
  ...(event.locations?.[0] && {
    location: {
      "@type": "Place",
      name: event.locations[0].title,
      ...(event.city && {
        address: {
          "@type": "PostalAddress",
          addressLocality: event.city.name,
          addressRegion: event.city.region,
          addressCountry: "KZ",
        },
      }),
      ...(event.locations[0].latitude && {
        geo: {
          "@type": "GeoCoordinates",
          latitude: event.locations[0].latitude,
          longitude: event.locations[0].longitude,
        },
      }),
    },
  }),
  ...(ownerUser && {
    organizer: {
      "@type": "Person",
      name: ownerUser.name || ownerUser.telegramHandle,
    },
  }),
  image: event.club?.logoUrl
    ? `${baseUrl}${event.club.logoUrl}`
    : `${baseUrl}/og-default.png`,
  url: `${baseUrl}/events/${event.slug}`,
  ...(event.isPaid && event.price && {
    offers: {
      "@type": "Offer",
      price: event.price,
      priceCurrency: event.currencyCode || "KZT",
      availability: event.maxParticipants && participantsCount >= event.maxParticipants
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
    },
  }),
};

// В JSX:
return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    {/* ... existing JSX ... */}
  </>
);
```

**Restricted events:** Для `visibility="restricted"` — НЕ генерировать JSON-LD (аналогично OG metadata per OG_SOCIAL_SHARING_BLUEPRINT §3.2).

**Проверка:** Google Rich Results Test → Event schema валиден.

---

### TASK 4.2 — Organization JSON-LD

**Файл:** `src/app/(app)/clubs/[slug]/page.tsx`

**Данные доступны через `getClubBasicInfo()`:**

| Schema.org | Source | Обязательно |
|------------|--------|-------------|
| `@type` | `"Organization"` | Да |
| `name` | `club.name` | Да |
| `description` | `club.description` | Если есть |
| `logo` | `club.logoUrl` | Если есть |
| `url` | `${baseUrl}/clubs/${club.slug}` | Да |
| `address` | `club.cities[].name` | Если есть |
| `sameAs` | `[club.telegramUrl, club.websiteUrl]` | Если есть |

**Реализация:**

```tsx
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: club.name,
  ...(club.description && {
    description: stripHtml(club.description),
  }),
  ...(club.logoUrl && {
    logo: `${baseUrl}${club.logoUrl}`,
  }),
  url: `${baseUrl}/clubs/${club.slug}`,
  ...(club.cities?.length && {
    address: club.cities.map((city) => ({
      "@type": "PostalAddress",
      addressLocality: city.name,
      addressCountry: "KZ",
    })),
  }),
  sameAs: [
    club.telegramUrl,
    club.websiteUrl,
  ].filter(Boolean),
};
```

**Private clubs:** Для `visibility="private"` — генерировать минимальный JSON-LD (только name + url), аналогично OG policy.

**Проверка:** Google Rich Results Test → Organization schema валиден.

---

## 8. Testing & Verification

### Per-Wave Checklist

**Wave 1:** ✅ DONE (2026-02-10, commit `362ab58`)
- [x] `<html lang="ru-KZ">` в rendered HTML
- [x] `robots.txt` доступен и корректен
- [x] Listing pages имеют `<meta name="robots" content="noindex, follow">`
- [x] `/pricing` имеет `<title>` и `<meta name="description">`
- [x] Event page: club badge — clickable link
- [x] Footer: ссылки на `/events`, `/clubs`, `/pricing`
- [x] `/og-default.png` доступен (200 OK)
- [x] Header: ссылки на `/clubs`, `/pricing` в DOM (даже в beta mode)

**Wave 2:** ✅
- [x] `/pricing` — ISR 5min, server-fetches plans via `listPublicPlans()`
- [x] `/clubs` — ISR 1min, server-fetches clubs via `listClubs()`
- [x] `/events` — ISR 1min, server-fetches upcoming events via `listVisibleEventsForUserPaginated()`
- [ ] `curl -s https://need4trip.kz/pricing | grep "Тарифы"` → найдено (SSR) — verify after deploy
- [ ] `curl -s https://need4trip.kz/clubs | grep "club-card"` → найдено (SSR) — verify after deploy
- [ ] `curl -s https://need4trip.kz/events | grep "event-card"` → найдено (SSR)
- [ ] Фильтры/поиск/пагинация работают после hydration
- [ ] Loading state НЕ показывается при первом рендере (SSR data)

**Wave 3:**
- [ ] `/events/{slug}` → 200 с контентом
- [ ] `/events/{uuid}` → 301/308 redirect на slug URL
- [ ] `/clubs/{slug}` → 200 с контентом
- [ ] `/clubs/{uuid}` → 301/308 redirect на slug URL
- [ ] `<link rel="canonical">` на всех indexable pages
- [ ] Sitemap содержит slug URLs
- [ ] Telegram ссылки (старые UUID) корректно редиректят

**Wave 4:**
- [ ] `<script type="application/ld+json">` на event pages
- [ ] `<script type="application/ld+json">` на club pages
- [ ] Google Rich Results Test: Event — valid
- [ ] Google Rich Results Test: Organization — valid

### Build Verification (MANDATORY per SSOT)

```bash
npx tsc --noEmit   # TypeScript strict mode ✅
npm run build       # Production build ✅
```

---

## 9. Files Affected (Complete Map)

### Wave 1 (8 tasks, ~10 файлов) ✅ DONE

| Task | File | Action | Status |
|------|------|--------|--------|
| 1.1 | `src/app/layout.tsx` | Edit (lang) | ✅ |
| 1.2 | `src/app/robots.ts` | **Create** | ✅ |
| 1.3 | `src/app/(app)/events/page.tsx` | Edit (robots meta) | ✅ |
| 1.3 | `src/app/(app)/clubs/layout.tsx` | Edit (robots meta) | ✅ |
| 1.4 | `src/app/(app)/pricing/page.tsx` | **Rewrite** (Server Component wrapper) | ✅ |
| 1.4 | `src/components/pricing/pricing-page-client.tsx` | **Create** (extracted client) | ✅ |
| 1.5 | `src/app/(app)/events/[id]/page.tsx` | Edit (club link) | ✅ |
| 1.6 | `src/components/layout/main-footer-client.tsx` | Edit (add links) | ✅ |
| 1.7 | `public/og-default.png` | **Create** (asset, 1200×630) | ✅ |
| 1.8 | `src/components/layout/main-header.tsx` | Edit (DOM preservation via sr-only) | ✅ |
| 1.8 | `src/components/layout/mobile-nav.tsx` | Edit (visible filter) | ✅ |

### Wave 2 (3 tasks, ~6 файлов) ✅ DONE

| Task | File | Action |
|------|------|--------|
| 2.1 | `src/app/(app)/pricing/page.tsx` | Edit (ISR + server fetch) | ✅ |
| 2.1 | `src/components/pricing/pricing-page-client.tsx` | Edit (accept initialPlans) | ✅ |
| 2.2 | `src/app/(app)/clubs/page.tsx` | **Rewrite** (Server Component) | ✅ |
| 2.2 | `src/components/clubs/clubs-page-client.tsx` | **Create** (extracted client) | ✅ |
| 2.3 | `src/app/(app)/events/page.tsx` | Edit (ISR + server fetch) | ✅ |
| 2.3 | `src/components/events/events-page-client.tsx` | Edit (accept initialData) | ✅ |
| 2.3 | `src/hooks/use-events-query.ts` | Edit (accept initialData) | ✅ |

### Wave 3 (7 tasks, ~50+ файлов)

| Task | Category | Affected Files |
|------|----------|----------------|
| 3.1 | Migration | 1 SQL file (create) |
| 3.2 | Repository | `eventRepo.ts`, `clubRepo.ts` |
| 3.3 | Routing | `events/[id]/*` → `events/[slug]/*` (rename 4+ dirs) |
| 3.3 | Routing | `clubs/[id]/*` → `clubs/[slug]/*` (rename 6+ dirs) |
| 3.4 | Middleware | `middleware.ts` (edit matcher + redirect logic) |
| 3.5 | URL refs | ~45 files with `/events/${id}` or `/clubs/${id}` |
| 3.6 | Metadata | All page files with `generateMetadata` |
| 3.7 | Sitemap | `src/app/sitemap.ts` (create) |

### Wave 4 (2 tasks, 2 файла)

| Task | File | Action |
|------|------|--------|
| 4.1 | `src/app/(app)/events/[slug]/page.tsx` | Edit (add JSON-LD) |
| 4.2 | `src/app/(app)/clubs/[slug]/page.tsx` | Edit (add JSON-LD) |

---

## 10. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Telegram old UUID links break | High | Certain | 301 redirects (TASK 3.4) |
| Slug collision on events | High | Low | Short-UUID suffix guarantees uniqueness |
| CSR→SSR breaks client interactivity | Medium | Medium | Hybrid approach: SSR initial + CSR filters |
| Middleware DB lookups slow (Edge) | Medium | Medium | Start with page-level redirect, optimize later |
| Cyrillic slug encoding issues | Low | Low | Test with Googlebot, Yandexbot, Telegram |
| ISR stale content shown | Low | Medium | Appropriate revalidation intervals |

---

## 11. Open Decisions for Architect

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| D-01 | Кириллица vs transliteration в slugs | A: кириллица, B: transliteration | A (кириллица) — целевая аудитория |
| D-02 | Redirect code: 301 vs 308 | A: middleware 301, B: page-level 308 | B first, A as optimization |
| D-03 | Event slug uniqueness suffix | A: short-UUID, B: date, C: incremental | A (short-UUID) |
| D-04 | sr-only vs hidden для beta links | A: sr-only, B: CSS hidden, C: aria-hidden | A (sr-only) — лучше для crawlers |
| D-05 | Slug column: allow NULL initially? | A: NOT NULL + backfill, B: NULL + gradual | A (atomic migration) |

---

## 12. SSOT Compliance Matrix

| SSOT Section | Requirement | Covered by Task(s) |
|-------------|-------------|---------------------|
| §3.1 Slug URLs | Slug-based URLs for events/clubs | 3.1, 3.2, 3.3, 3.5 |
| §3.1 301 Redirects | UUID → slug permanent redirect | 3.4 |
| §3.1 Immutable slugs | Slugs never change after creation | 3.2 (generation logic) |
| §3.2 Canonical URLs | Absolute canonical on all pages | 3.6 |
| §4.1 SSR/ISR | No CSR for indexable content | 2.1, 2.2, 2.3 |
| §4.2 Strategy | ISR for listings, SSR for detail | 2.1–2.3 |
| §5.1 Beta indexing | Only homepage + entity detail | 1.3, 3.7 |
| §5.2 robots.txt | Allow entities, disallow API/admin | 1.2 |
| §5.3 Meta robots | noindex+follow on listings (beta) | 1.3 |
| §5.4 Sitemap | Dynamic, slug-based, canonical only | 3.7 |
| §6.1 Metadata | title+desc+OG+twitter on all pages | 1.4, existing |
| §6.2 Language | `lang="ru-KZ"` | 1.1 |
| §7.1 Event JSON-LD | Event schema.org | 4.1 |
| §7.1 Org JSON-LD | Organization schema.org | 4.2 |
| §8 Internal links | Event→Club, crawlable graph | 1.5, 1.6, 1.8 |
| §8 DOM preservation | Hidden UI keeps links in DOM | 1.8 |

---

## 13. Timeline Estimate

| Wave | Tasks | Estimate | Dependencies | Status |
|------|-------|----------|--------------|--------|
| Wave 1 | TASK 1.1–1.8 | 3-4 часа | None | ✅ DONE (2026-02-10) |
| Wave 2 | TASK 2.1–2.3 | 3-5 дней | None | ✅ DONE (2026-02-10) |
| Wave 3 | TASK 3.1–3.7 | 7-10 дней | Blocks canonical + sitemap | PENDING |
| Wave 4 | TASK 4.1–4.2 | 3-5 часов | Wave 2 + Wave 3 | PENDING |
| **Total** | **20 tasks** | **~12-17 рабочих дней** | | **Wave 1+2 done** |

---

*Этот blueprint является NORMATIVE на время реализации. После завершения — перевести в ACCEPTED и архивировать при необходимости.*
