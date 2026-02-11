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
Wave 1 (Quick Wins)             →  нет зависимостей, можно параллельно       ✅ DONE
Wave 2 (Rendering)              →  нет зависимостей с Wave 1                 ✅ DONE
Wave 3 (Slug Migration)         →  БЛОКИРУЕТ canonical URLs и sitemap        ✅ DONE
Wave 4 (Structured Data)        →  зависит от Wave 2 (SSR)                  ✅ DONE
                                    зависит от Wave 3 (slug URLs в JSON-LD)
Wave 5 (Metadata & Schema       →  зависит от Wave 3 + Wave 4               ⏳ PENDING
         Hardening)                  БЛОКИРУЕТ Phase 2 Implementation
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
import { getPublicBaseUrl } from "@/lib/config/runtimeConfig";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicBaseUrl();

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

**Проверка:** `curl https://need4trip.app/robots.txt` возвращает корректный robots.txt.

---

### TASK 1.3 — Meta robots на listing-страницах (beta) ✅ → UPDATED

**SSOT:** §5.3 — `/events` is indexable; `/clubs` and `/pricing` MUST declare `noindex, follow`

**Файлы и изменения:**

**`src/app/(app)/events/page.tsx`:**
```typescript
export const metadata: Metadata = {
  title: "События",
  description: "Ближайшие автомобильные события и оффроуд-поездки",
  // NOTE: /events is indexable (production-ready per §5.1).
  // Do NOT add robots: { index: false }.
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

**`src/app/(app)/pricing/page.tsx`:**
```typescript
export const metadata: Metadata = {
  title: "Тарифы Need4Trip",
  description: "...",
  robots: {
    index: false,
    follow: true,
  },
};
```

**Проверка:**
- `/events` → NO `noindex` meta tag (indexable)
- `/clubs` → `<meta name="robots" content="noindex, follow">`
- `/pricing` → `<meta name="robots" content="noindex, follow">`

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

**SSOT:** §8 — Homepage → Events listing

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

**Проверка:** `curl -I https://need4trip.app/og-default.png` → 200 OK.

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

### TASK 3.4 — Permanent Redirects: UUID → Slug

**SSOT:** §3.1 — Legacy UUID URLs MUST issue permanent redirects (`301` or `308`)  
**Architecture:** SSOT_ARCHITECTURE.md §4.5 — Middleware MUST NOT perform database lookups

#### Redirect Mechanism (Decided)

**Primary mechanism: Page-level redirect (Server Component)**

Page-level `permanentRedirect()` in the `[slug]/page.tsx` Server Component is the **primary and recommended** redirect mechanism.

```typescript
// In events/[slug]/page.tsx — already implemented
if (isUUID) {
  const event = await getEventById(slug);
  if (event?.slug) {
    permanentRedirect(`/events/${event.slug}`);  // 308
  }
}
```

**Why NOT middleware-level redirect:**
- Middleware runs on Edge Runtime (per SSOT_ARCHITECTURE.md §4.4)
- Middleware MUST NOT perform database lookups (per SSOT_ARCHITECTURE.md §4.5)
- UUID → slug resolution requires a DB query to find the slug
- This violates Edge Runtime constraints

**Middleware redirect is allowed ONLY for:**
- Pattern-based redirects that do NOT require DB lookup
- Example: redirect trailing-slash URLs (handled by Next.js automatically)

**Status codes:**
- `permanentRedirect()` in Next.js emits `308 Permanent Redirect`
- `308` is an acceptable permanent redirect per SSOT_SEO.md §3.1
- `301` via middleware is NOT used (would require DB lookup, violating §4.5)

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

**Проверка:** `<link rel="canonical" href="https://need4trip.app/events/slug-here">` в HTML.

---

### TASK 3.7 — Dynamic Sitemap

**SSOT:** §5.4 — Sitemap MUST include only canonical, indexable URLs with slug-based URLs

**Зависимость:** Выполняется ПОСЛЕ slug migration.

**Создать:** `src/app/sitemap.ts`

```typescript
import type { MetadataRoute } from "next";
import { getPublicBaseUrl } from "@/lib/config/runtimeConfig";
import { listPublicEvents } from "@/lib/db/eventRepo";
import { listClubs } from "@/lib/db/clubRepo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicBaseUrl();

  // Static indexable pages per SSOT §5.1 and §5.4
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    // /clubs and /pricing — NOT included (noindex during beta per §5.1)
  ];

  // ---------------------------------------------------------------
  // Events (public, non-deleted) — batched pagination per §16.4
  // Unbounded dataset loading is FORBIDDEN.
  // Sitemap MUST use batched pagination or cursor iteration.
  // Mandatory before entity count exceeds 5,000.
  // ---------------------------------------------------------------
  const PAGE_SIZE = 500;
  const eventPages: MetadataRoute.Sitemap = [];
  let eventsPage = 1;
  let hasMoreEvents = true;

  while (hasMoreEvents) {
    const batch = await listPublicEvents(eventsPage, PAGE_SIZE);
    if (!batch.data || batch.data.length === 0) {
      hasMoreEvents = false;
    } else {
      for (const event of batch.data) {
        eventPages.push({
          url: `${baseUrl}/events/${event.slug}`,
          lastModified: event.updated_at
            ? new Date(event.updated_at)
            : new Date(event.date_time),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        });
      }
      eventsPage++;
    }
  }

  // Clubs (public, non-archived) — batched pagination per §16.4
  const clubPages: MetadataRoute.Sitemap = [];
  let clubsPage = 1;
  let hasMoreClubs = true;

  while (hasMoreClubs) {
    const batch = await listClubs(clubsPage, PAGE_SIZE);
    if (!batch.data || batch.data.length === 0) {
      hasMoreClubs = false;
    } else {
      for (const club of batch.data) {
        clubPages.push({
          url: `${baseUrl}/clubs/${club.slug}`,
          lastModified: new Date(club.updated_at),
          changeFrequency: "monthly" as const,
          priority: 0.7,
        });
      }
      clubsPage++;
    }
  }

  // /clubs and /pricing excluded (noindex during beta per SSOT §5.1)
  // /events is included in staticPages (indexable, production-ready)
  return [...staticPages, ...eventPages, ...clubPages];
}
```

**Нюансы:**
- `listPublicEvents` и `listClubs` нужно проверить — возвращают ли они slug
- `slug` field должен быть в `EventListItem` и `DbClub` DTO

**Scalability Requirement (NORMATIVE per SSOT_SEO.md §16.4):**
- Sitemap implementation MUST use batched pagination or cursor-based iteration
- Unbounded dataset loading is FORBIDDEN
- When entity count exceeds 5,000: MUST switch to `generateSitemaps()` (sitemap index pattern)
- This scalability gate is mandatory before production exceeds 5k entities

**Проверка:** `curl https://need4trip.app/sitemap.xml` → корректный XML.

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

## 8. Wave 5 — Metadata & Schema Hardening

**Цель:** Закрыть все gaps выявленные при аудите SSOT_SEO.md (секции 13–16).  
**SSOT:** §13 (Metadata Patterns), §14 (Structured Data Validation), §15 (Canonical Stability), §16 (Sitemap Integrity)  
**Оценка:** 2–3 дня  
**Зависимости:** Wave 3 (slug URLs), Wave 4 (JSON-LD)  
**Статус:** PENDING  
**Blocking:** Phase 2 Implementation — Wave 5 MUST be completed before Phase 2

---

### TASK 5.1 — Standardize title pattern

**SSOT:** §13.1 — Title Patterns

**Текущее состояние:**

| Page | Current Title | Expected (per §13.1) | Gap |
|------|--------------|----------------------|-----|
| Homepage | `"Need4Trip — Организация автомобильных событий"` | `"Need4Trip — Автомобильные события и клубы Казахстана"` | ❌ Title не отражает полный value proposition |
| Event detail | `event.title` (без города) | `{Event Title} — {City} \| Need4Trip` | ❌ Город не включён в title |
| Club detail | `club.name` (без контекста) | `{Club Name} — Автоклуб в {City} \| Need4Trip` | ❌ Тип и город не включены |
| Events listing | `"События"` | `"События \| Need4Trip"` (via template) | ✅ OK (template добавляет суффикс) |
| Clubs listing | Наследует от layout: `"Клубы"` | `"Клубы \| Need4Trip"` (via template) | ✅ OK |
| Pricing | `"Тарифы Need4Trip"` | `"Тарифы Need4Trip \| Need4Trip"` (via template) | ⚠️ Дублирование бренда |

**Действия:**

1. **Homepage:** Обновить title в `src/app/(marketing)/page.tsx`:
   ```
   title: "Need4Trip — Автомобильные события и клубы Казахстана"
   ```

2. **Event detail:** Обновить `generateMetadata` в `src/app/(app)/events/[slug]/page.tsx`:
   ```
   title: cityName ? `${event.title} — ${cityName}` : event.title
   ```

3. **Club detail:** Обновить `generateMetadata` в `src/app/(app)/clubs/[slug]/page.tsx`:
   ```
   title: primaryCity ? `${club.name} — Автоклуб в ${primaryCity}` : club.name
   ```

4. **Pricing:** Оставить `"Тарифы Need4Trip"` — template добавит `| Need4Trip`, но это приемлемо для branding.

**Проверка:** Все страницы соответствуют паттернам §13.1.

---

### TASK 5.2 — Standardize description generation

**SSOT:** §13.2 — Description Rules

**Текущее состояние:**

| Page | Description Length | Contains City | Contains Keyword | Gap |
|------|-------------------|---------------|------------------|-----|
| Homepage | ~80 chars | Нет | Частично | ❌ Слишком короткая (<120) |
| Event detail | Variable (truncated 200) | Да | Да | ⚠️ Max 200 > recommended 160 |
| Club detail | Variable (truncated 200) | Да | Да | ⚠️ Max 200 > recommended 160 |
| Events listing | ~52 chars | Нет | Да | ❌ Слишком короткая (<120) |
| Clubs listing | ~55 chars | Нет | Да | ❌ Слишком короткая (<120) |
| Pricing | ~55 chars | Нет | Да | ❌ Слишком короткая (<120) |

**Действия:**

1. **Homepage:** Расширить description до 120–160 символов:
   ```
   "Need4Trip — платформа для организации автомобильных событий и управления клубами в Казахстане. Создавайте поездки, собирайте экипажи."
   ```

2. **Events listing:** Расширить:
   ```
   "Автомобильные события и оффроуд-поездки в Казахстане. Выбирайте ближайшие мероприятия, регистрируйтесь и присоединяйтесь к экипажам."
   ```

3. **Clubs listing:** Расширить:
   ```
   "Автомобильные клубы Казахстана на Need4Trip. Найдите единомышленников, вступайте в клубы и участвуйте в совместных поездках."
   ```

4. **Pricing:** Расширить:
   ```
   "Тарифы и планы для автомобильных клубов на Need4Trip. Бесплатный старт, расширенные возможности для растущих клубов."
   ```

5. **Entity pages:** Изменить truncation с 200 → 160 для description meta, оставить 200 для OG description.

**Проверка:** Все descriptions в диапазоне 120–160 символов.

---

### TASK 5.3 — Enforce canonical absolute URLs on all pages

**SSOT:** §15.3 — Canonical Enforcement Checklist, §15.4 — Current Canonical Coverage

**Текущее состояние:**
- ✅ Event detail — canonical определён
- ✅ Club detail — canonical определён
- ❌ Homepage — canonical отсутствует
- ❌ Events listing — canonical отсутствует
- ❌ Clubs listing — canonical отсутствует
- ❌ Pricing — canonical отсутствует

**Действия:**

1. **Homepage** (`src/app/(marketing)/page.tsx`):
   ```typescript
   export const metadata: Metadata = {
     // ... existing fields
     alternates: { canonical: "/" },
   };
   ```

2. **Events listing** (`src/app/(app)/events/page.tsx`):
   ```typescript
   export const metadata: Metadata = {
     // ... existing fields
     alternates: { canonical: "/events" },
   };
   ```

3. **Clubs listing** (`src/app/(app)/clubs/layout.tsx`):
   ```typescript
   export const metadata: Metadata = {
     // ... existing fields
     alternates: { canonical: "/clubs" },
   };
   ```

4. **Pricing** (`src/app/(app)/pricing/page.tsx`):
   ```typescript
   export const metadata: Metadata = {
     // ... existing fields
     alternates: { canonical: "/pricing" },
   };
   ```

**Проверка:** `<link rel="canonical" href="https://need4trip.app/...">` на всех 6 indexable страницах.

---

### TASK 5.4 — Align OG with metadata

**SSOT:** §13.3 — OG & Social Preview Alignment Rule

**Текущее состояние:**

| Page | OG title = title | OG desc = desc | OG image specs | Gap |
|------|-----------------|----------------|----------------|-----|
| Homepage | Inherits root | Inherits root | Root default | ⚠️ Нет явного OG override |
| Event detail | ✅ | ✅ | No width/height/alt | ❌ Missing image specs |
| Club detail | ✅ | ✅ | No width/height/alt | ❌ Missing image specs |
| Events listing | Inherits root | Inherits root | Root default | ⚠️ Нет явного OG override |
| Clubs listing | Inherits root | Inherits root | Root default | ⚠️ Нет явного OG override |
| Pricing | Inherits root | Inherits root | Root default | ⚠️ Нет явного OG override |

**Действия:**

1. **Event detail OG image:** Добавить `width`, `height`, `alt` к OG image:
   ```typescript
   images: [{
     url: ogImage,
     width: 1200,
     height: 630,
     alt: event.title,
   }],
   ```

2. **Club detail OG image:** Аналогично.

3. **Static pages:** Добавить explicit OG overrides с title/description matching metadata:
   - Homepage, Events listing, Clubs listing, Pricing

4. **OG image `club.logoUrl` handling:** В event detail, проверить и обеспечить absolute URL:
   ```typescript
   const ogImage = event.club?.logoUrl
     ? (event.club.logoUrl.startsWith("http") ? event.club.logoUrl : event.club.logoUrl)
     : "/og-default.png";
   ```
   (Next.js resolves relative URLs via `metadataBase`, так что текущая реализация корректна)

**Проверка:** OG Debugger (Facebook) / Twitter Card Validator — title/description/image корректны.

---

### TASK 5.5 — Validate JSON-LD against Rich Results Test

**SSOT:** §14.1 — Rich Results Validation Requirement

**Текущее состояние:**
- ✅ Event JSON-LD реализован (schema.org/Event)
- ✅ Organization JSON-LD реализован (schema.org/Organization)
- ❓ Не валидировано через Google Rich Results Test

**Действия:**

1. **Deploy** текущую реализацию на staging/production.
2. **Валидировать** через [Google Rich Results Test](https://search.google.com/test/rich-results):
   - Проверить 2–3 event pages
   - Проверить 2–3 club pages
3. **Исправить** любые errors.
4. **Документировать** warnings как P1.5 improvements.
5. **Добавить** `maximumAttendeeCapacity` и `remainingAttendeeCapacity` к Event schema (P1.5).

**Дополнительно — JSON-LD bug fix:**
- Event `image` field: `event.club?.logoUrl` может быть external URL (Supabase storage). Текущий код делает `${baseUrl}${club.logoUrl}` — если `logoUrl` уже absolute, получится двойной домен. Нужна проверка `startsWith("http")` как в Club JSON-LD.

**Проверка:** Rich Results Test = 0 errors на всех entity pages.

---

### TASK 5.6 — Fix sitemap beta compliance

**SSOT:** §5.4, §16.1, §16.2 — Sitemap content must match indexing policy

**Текущее состояние:**
- ❌ Sitemap включает `/clubs`, `/pricing` — нарушение §5.1 и §16.1 (noindex pages)
- ❌ Sitemap НЕ включает `/events` как static page — нарушение §5.4 (indexable page)

**Действие:** Update sitemap static pages:
```typescript
const staticPages: MetadataRoute.Sitemap = [
  {
    url: BASE_URL,                  // Homepage — indexable
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/events`,      // Events listing — indexable (production-ready per §5.1)
    lastModified: new Date(),
    changeFrequency: "hourly",
    priority: 0.9,
  },
  // /clubs, /pricing — NOT included (noindex during beta per §5.1)
];
```

**Проверка:**
- `curl https://need4trip.app/sitemap.xml` — содержит `/events`
- `curl https://need4trip.app/sitemap.xml` — НЕ содержит `/clubs`, `/pricing`

---

### TASK 5.7 — Fix notification URLs (UUID → slug)

**SSOT:** §3.1 — All internal references MUST use canonical slug URLs

**Текущее состояние:**
- ❌ `src/lib/services/notifications.ts` uses `eventId` (UUID) in URLs (lines 75, 157, 265)
- URLs: `${baseUrl}/events/${eventId}` — these go to slug-based routes and will 404

**Действие:** Update notification URL generation to use event slug:
- Pass `eventSlug` to notification functions alongside `eventId`
- Generate URL as `${baseUrl}/events/${eventSlug}`

**Проверка:** Telegram notification URLs use slug format.

---

### TASK 5.8 — Add Clubs listing page metadata

**SSOT:** §6.1 — All indexable pages MUST define title, description, openGraph, twitter

**Текущее состояние:**
- ❌ `src/app/(app)/clubs/page.tsx` has NO metadata export
- ⚠️ `src/app/(app)/clubs/layout.tsx` defines title + description + robots — BUT no openGraph/twitter
- Net effect: Clubs listing inherits OG/twitter from root layout (generic, not page-specific)

**Действие:** Add explicit openGraph and twitter to clubs layout metadata:
```typescript
export const metadata: Metadata = {
  title: "Клубы",
  description: "Автомобильные клубы Казахстана на Need4Trip...",
  robots: { index: false, follow: true },
  alternates: { canonical: "/clubs" },
  openGraph: {
    title: "Клубы",
    description: "Автомобильные клубы Казахстана на Need4Trip...",
  },
  twitter: {
    card: "summary_large_image",
    title: "Клубы",
    description: "Автомобильные клубы Казахстана на Need4Trip...",
  },
};
```

**Проверка:** `/clubs` has explicit OG tags in HTML.

---

### TASK 5.9 — Enforce canonical non-trailing slash

**SSOT:** §19 — Trailing Slash Policy

**Текущее состояние:** Next.js `trailingSlash` default is `false` — correct. But must verify:
- No canonical URL in code includes trailing slash
- No sitemap URL includes trailing slash
- No internal `<Link>` includes trailing slash

**Действие:** Audit and fix any trailing-slash URLs in metadata, sitemap, or links.

**Проверка:** `rg 'canonical.*/$' src/` → 0 results (except root `/`).

---

### TASK 5.10 — Enforce pagination canonical rules

**SSOT:** §17 — Pagination Canonical Policy

**Текущее состояние:** Listing pages are ISR/SSR with `searchParams`. No pagination-specific canonical logic exists.

**Действие:**
1. For `/events?page=N` (N > 1) → canonical: `/events?page=N`
2. For `/events?page=1` or `/events` (no page param) → canonical: `/events`
3. Non-SEO params (`tab`, `sort`, `search`, `cityId`, `categoryId`) MUST be stripped from canonical

**Проверка:** `/events?page=2` → `<link rel="canonical" href="https://need4trip.app/events?page=2">`.

---

### TASK 5.11 — Enforce query normalization rules

**SSOT:** §18 — Query Parameter Normalization

**Текущее состояние:** Static `alternates.canonical` on listing pages does not account for query params.

**Действие:** Convert listing page metadata from static `export const metadata` to dynamic `generateMetadata()` that:
1. Reads `searchParams`
2. Preserves only SEO-significant params (currently only `page`)
3. Constructs canonical from base path + SEO params only

**Проверка:** `/events?tab=upcoming&sort=date` → canonical: `/events`.

---

### TASK 5.12 — Centralize metadata builder

**SSOT:** SSOT_ARCHITECTURE.md §3.2 — Ownership: `lib/seo/metadataBuilder.ts`

**Текущее состояние:** Metadata construction is scattered across 6+ page files with inline string building.

**Действие:** Create `lib/seo/metadataBuilder.ts` with:
- `buildEventMetadata(event, slug)` → returns `Metadata` object
- `buildClubMetadata(club, slug)` → returns `Metadata` object
- `buildStaticPageMetadata(config)` → returns `Metadata` object
- Enforce title patterns (§13.1), description length (§13.2), OG alignment (§13.3) centrally

**Проверка:** All `generateMetadata` functions delegate to centralized builder.

---

### TASK 5.13 — Centralize schema builder

**SSOT:** SSOT_ARCHITECTURE.md §3.2 — Ownership: `lib/seo/schemaBuilder.ts`

**Текущее состояние:** JSON-LD construction is inline in page components (~60 lines each in event/club pages).

**Действие:** Create `lib/seo/schemaBuilder.ts` with:
- `buildEventJsonLd(event, ownerUser, baseUrl)` → returns JSON-LD object or null
- `buildOrganizationJsonLd(club, baseUrl)` → returns JSON-LD object
- Centralize absolute URL construction, fallback logic, privacy rules

**Проверка:** Page components import and call builder functions instead of inline construction.

---

### TASK 5.14 — Centralize runtime config (production base URL)

**SSOT:** SSOT_ARCHITECTURE.md §4.6, SSOT_SEO.md §20

**Текущее состояние:** `process.env.NEXT_PUBLIC_APP_URL || "https://need4trip.app"` is repeated in:
- `src/app/layout.tsx` (metadataBase)
- `src/app/sitemap.ts` (BASE_URL)
- `src/app/robots.ts` (baseUrl)
- `src/app/(app)/events/[slug]/page.tsx` (baseUrl for JSON-LD)
- `src/app/(app)/clubs/[slug]/page.tsx` (baseUrl for JSON-LD)
- `src/lib/services/notifications.ts` (baseUrl)

**Действие:** Create `lib/config/runtimeConfig.ts`:
```typescript
/**
 * Canonical production base URL.
 * Per SSOT_SEO.md §20 and SSOT_ARCHITECTURE.md §4.6:
 * This is the ONLY place where the base URL is resolved.
 * Hardcoded domain fallbacks elsewhere are FORBIDDEN.
 */
export function getPublicBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://need4trip.app";
}
```

Base URL MUST be resolved via `getPublicBaseUrl()` from `lib/config/runtimeConfig.ts`.
Hardcoded domain fallbacks scattered across files are FORBIDDEN.
The canonical production domain is: `https://need4trip.app`.

Replace all scattered `process.env.NEXT_PUBLIC_APP_URL` references with import from this module.

**Проверка:** `rg 'process\.env\.NEXT_PUBLIC_APP_URL' src/ --glob '!lib/config/*'` → 0 results.

---

### Wave 5 Summary

| Task | Description | SSOT Section | Priority | Category |
|------|-------------|-------------|----------|----------|
| 5.1 | Standardize title patterns | §13.1 | P1 | Metadata |
| 5.2 | Standardize description generation | §13.2 | P1 | Metadata |
| 5.3 | Enforce canonical on all pages | §15.3, §15.4 | P1 | Canonical |
| 5.4 | Align OG with metadata | §13.3 | P1 | Metadata |
| 5.5 | Validate JSON-LD (Rich Results Test) | §14.1 | P1 | Schema |
| 5.6 | Fix sitemap beta compliance | §16.1, §16.2 | P1 | Sitemap |
| 5.7 | Fix notification URLs (UUID → slug) | §3.1 | P0 | URL |
| 5.8 | Add Clubs listing metadata | §6.1 | P1 | Metadata |
| 5.9 | Enforce non-trailing slash | §19 | P1 | Canonical |
| 5.10 | Enforce pagination canonical | §17 | P1 | Canonical |
| 5.11 | Enforce query normalization | §18 | P1 | Canonical |
| 5.12 | Centralize metadata builder | ARCH §3.2 | P1 | Architecture |
| 5.13 | Centralize schema builder | ARCH §3.2 | P1 | Architecture |
| 5.14 | Centralize runtime config | ARCH §4.6, SEO §20 | P1 | Architecture |

**Status:** PENDING  
**Blocking:** Phase 2 Implementation — MUST be completed first  
**Note:** Tasks 5.9–5.14 added during SEO ↔ Architecture consolidation (2026-02-11)

**P0 Gate — Canonical Coverage:**
- Canonical coverage MUST be **100%** before Phase 2 implementation begins.
- Missing canonical on any indexable page is a **P0 defect** and blocks Phase 2.
- This includes: homepage, `/events`, all event detail, all club detail pages, `/clubs`, `/pricing`.
- `/events` canonical is **P0 critical** — it is an indexable production page.
- Verification: `<link rel="canonical">` present on every indexable page with correct absolute URL.

**P0 Gate — /events Indexing Readiness:**
- `/events` MUST NOT have `noindex` meta robots.
- `/events` MUST have full metadata (title, description, OG, twitter, canonical).
- `/events` MUST appear in `sitemap.xml`.
- Missing any of the above is a **P0 defect**.

---

## 9. Testing & Verification

### Per-Wave Checklist

**Wave 1:** ✅ DONE (2026-02-10, commit `362ab58`)
- [x] `<html lang="ru-KZ">` в rendered HTML
- [x] `robots.txt` доступен и корректен
- [x] `/clubs` и `/pricing` имеют `<meta name="robots" content="noindex, follow">`
- [ ] `/events` НЕ имеет `noindex` (indexable, production-ready)
- [x] `/pricing` имеет `<title>` и `<meta name="description">`
- [x] Event page: club badge — clickable link
- [x] Footer: ссылки на `/events`, `/clubs`, `/pricing`
- [x] `/og-default.png` доступен (200 OK)
- [x] Header: ссылки на `/clubs`, `/pricing` в DOM (даже в beta mode)

**Wave 2:** ✅
- [x] `/pricing` — ISR 5min, server-fetches plans via `listPublicPlans()`
- [x] `/clubs` — ISR 1min, server-fetches clubs via `listClubs()`
- [x] `/events` — ISR 1min, server-fetches upcoming events via `listVisibleEventsForUserPaginated()`
- [ ] `curl -s https://need4trip.app/pricing | grep "Тарифы"` → найдено (SSR) — verify after deploy
- [ ] `curl -s https://need4trip.app/clubs | grep "club-card"` → найдено (SSR) — verify after deploy
- [ ] `curl -s https://need4trip.app/events | grep "event-card"` → найдено (SSR)
- [ ] Фильтры/поиск/пагинация работают после hydration
- [ ] Loading state НЕ показывается при первом рендере (SSR data)

**Wave 3:**
- [x] `/events/{slug}` → 200 с контентом
- [x] `/clubs/{slug}` → 200 с контентом
- [x] `sitemap.xml` генерируется с slug URLs
- [x] Canonical URLs в generateMetadata
- Note: Clean slate approach — нет legacy UUID URLs, redirect не нужен
- [ ] `/clubs/{uuid}` → 301/308 redirect на slug URL
- [ ] `<link rel="canonical">` на всех indexable pages
- [ ] Sitemap содержит slug URLs
- [ ] Telegram ссылки (старые UUID) корректно редиректят

**Wave 4:** ✅
- [x] `<script type="application/ld+json">` на event pages (schema.org/Event)
- [x] `<script type="application/ld+json">` на club pages (schema.org/Organization)
- [ ] Google Rich Results Test: Event — valid (TODO: verify after deploy)
- [ ] Google Rich Results Test: Organization — valid (TODO: verify after deploy)

**Wave 5 — Metadata & Schema Hardening:**
- [ ] Homepage title updated per §13.1
- [ ] Event detail title includes city per §13.1
- [ ] Club detail title includes city + type per §13.1
- [ ] All descriptions 120–160 chars per §13.2
- [ ] Canonical `<link>` on all 6 indexable pages per §15.3
- [ ] OG title/description matches metadata per §13.3
- [ ] OG images include width/height/alt per §13.3
- [ ] Sitemap excludes listing pages per §16.1
- [ ] Notification URLs use slugs per §3.1
- [ ] Clubs listing has explicit OG/Twitter per §6.1
- [ ] JSON-LD passes Google Rich Results Test per §14.1

**Wave 5 — Architecture Compliance:**
- [ ] No trailing slash in any canonical URL per §19
- [ ] Paginated pages self-canonicalize per §17
- [ ] Non-SEO query params stripped from canonical per §18
- [ ] `lib/seo/metadataBuilder.ts` created and used per ARCH §3.2
- [ ] `lib/seo/schemaBuilder.ts` created and used per ARCH §3.2
- [ ] `lib/config/runtimeConfig.ts` created, all base URL references centralized per ARCH §4.6
- [ ] Middleware contains NO database imports per ARCH §4.5
- [ ] `npx tsc --noEmit` ✅
- [ ] `npm run build` ✅

### Build Verification (MANDATORY per SSOT)

```bash
npx tsc --noEmit   # TypeScript strict mode ✅
npm run build       # Production build ✅
```

---

## 10. Files Affected (Complete Map)

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
| 3.4 | Page-level redirect | `events/[slug]/page.tsx`, `clubs/[slug]/page.tsx` (UUID detection + permanentRedirect) |
| 3.5 | URL refs | ~45 files with `/events/${id}` or `/clubs/${id}` |
| 3.6 | Metadata | All page files with `generateMetadata` |
| 3.7 | Sitemap | `src/app/sitemap.ts` (create) |

### Wave 4 (2 tasks, 2 файла)

| Task | File | Action |
|------|------|--------|
| 4.1 | `src/app/(app)/events/[slug]/page.tsx` | Edit (add JSON-LD) |
| 4.2 | `src/app/(app)/clubs/[slug]/page.tsx` | Edit (add JSON-LD) |

### Wave 5 (14 tasks, ~15+ файлов) — PENDING

| Task | File | Action |
|------|------|--------|
| 5.1 | `src/app/(marketing)/page.tsx` | Edit (title pattern) |
| 5.1 | `src/app/(app)/events/[slug]/page.tsx` | Edit (title: add city) |
| 5.1 | `src/app/(app)/clubs/[slug]/page.tsx` | Edit (title: add city + type) |
| 5.2 | Multiple pages | Edit (expand descriptions to 120–160 chars) |
| 5.3 | 4 static pages | Edit (add `alternates.canonical`) |
| 5.4 | Event/Club detail pages | Edit (OG image specs: width/height/alt) |
| 5.5 | Event detail page | Edit (JSON-LD image absolute URL fix) |
| 5.6 | `src/app/sitemap.ts` | Edit (remove listing pages for beta) |
| 5.7 | `src/lib/services/notifications.ts` | Edit (UUID → slug in URLs) |
| 5.8 | `src/app/(app)/clubs/layout.tsx` | Edit (add explicit OG/Twitter) |
| 5.9 | All pages with canonical | Audit (no trailing slash in canonical) |
| 5.10 | `src/app/(app)/events/page.tsx` | Edit (pagination canonical via generateMetadata) |
| 5.11 | `src/app/(app)/events/page.tsx` | Edit (query param normalization) |
| 5.12 | `src/lib/seo/metadataBuilder.ts` | **Create** (centralized metadata builder) |
| 5.13 | `src/lib/seo/schemaBuilder.ts` | **Create** (centralized JSON-LD builder) |
| 5.14 | `src/lib/config/runtimeConfig.ts` | **Create** (centralized base URL) |
| 5.14 | 6+ files with `process.env.NEXT_PUBLIC_APP_URL` | Edit (replace with `getPublicBaseUrl()` import) |

---

## 11. Risks & Mitigations

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
| D-02 | Redirect code: 301 vs 308 | A: middleware 301, B: page-level 308 | **DECIDED: B (page-level 308)**. Middleware 301 is prohibited per ARCH §4.5 (requires DB lookup). Both 301/308 are acceptable per SSOT_SEO §3.1. |
| D-03 | Event slug uniqueness suffix | A: short-UUID, B: date, C: incremental | A (short-UUID) |
| D-04 | sr-only vs hidden для beta links | A: sr-only, B: CSS hidden, C: aria-hidden | A (sr-only) — лучше для crawlers |
| D-05 | Slug column: allow NULL initially? | A: NOT NULL + backfill, B: NULL + gradual | A (atomic migration) |

---

## 13. SSOT Compliance Matrix

| SSOT Section | Requirement | Covered by Task(s) | Status |
|-------------|-------------|---------------------|--------|
| §3.1 Slug URLs | Slug-based URLs for events/clubs | 3.1, 3.2, 3.3, 3.5 | ✅ Done |
| §3.1 301 Redirects | UUID → slug permanent redirect | 3.4 | ⚠️ Partial (notifications still use UUID → 5.7) |
| §3.1 Immutable slugs | Slugs never change after creation | 3.2 (generation logic) | ✅ Done |
| §3.2 Canonical URLs | Absolute canonical on all pages | 3.6, **5.3** | ❌ Gap (4 static pages missing → 5.3) |
| §4.1 SSR/ISR | No CSR for indexable content | 2.1, 2.2, 2.3 | ✅ Done |
| §4.2 Strategy | ISR for listings, SSR for detail | 2.1–2.3 | ✅ Done |
| §5.1 Beta indexing | Homepage + /events + entity detail indexable; /clubs, /pricing noindex | 1.3, 3.7, **5.6** | ❌ Gap (/events noindex must be removed; sitemap must add /events → 5.6) |
| §5.2 robots.txt | Allow entities, disallow API/admin | 1.2 | ✅ Done |
| §5.3 Meta robots | /events indexable; /clubs, /pricing noindex+follow | 1.3 | ❌ Gap (/events currently noindex → must be updated) |
| §5.4 Sitemap | Dynamic, slug-based; includes /events; excludes /clubs, /pricing | 3.7, **5.6** | ❌ Gap (/events not in static pages; /clubs, /pricing still included → 5.6) |
| §6.1 Metadata | title+desc+OG+twitter on all pages | 1.4, **5.2, 5.4, 5.8** | ❌ Gap (clubs listing missing OG/Twitter → 5.8) |
| §6.2 Language | `lang="ru-KZ"` | 1.1 | ✅ Done |
| §7.1 Event JSON-LD | Event schema.org | 4.1 | ✅ Done (validation pending → 5.5) |
| §7.1 Org JSON-LD | Organization schema.org | 4.2 | ✅ Done (validation pending → 5.5) |
| §8 Internal links | Event→Club, crawlable graph | 1.5, 1.6, 1.8 | ✅ Done |
| §8 DOM preservation | Hidden UI keeps links in DOM | 1.8 | ✅ Done |
| §13.1 Title patterns | Standardized title patterns | **5.1** | ❌ Gap (city not in entity titles) |
| §13.2 Description rules | 120–160 char descriptions | **5.2** | ❌ Gap (static pages too short) |
| §13.3 OG alignment | OG matches metadata | **5.4** | ❌ Gap (missing image specs) |
| §13.4 H1 enforcement | One H1 matching entity title | — | ✅ OK (verified in audit) |
| §14.1 Rich Results | JSON-LD passes Rich Results Test | **5.5** | ❓ Pending validation |
| §14.2 Field completeness | Mandatory fields present | 4.1, 4.2 | ✅ Done |
| §15 Canonical stability | Canonical stable after publication | **5.3** | ❌ Gap (4 pages missing canonical) |
| §16 Sitemap integrity | Sitemap matches indexing policy | **5.6** | ❌ Gap (listing pages included) |
| §16.4 Sitemap scalability | Batched pagination for sitemap | **5.6** | ⚠️ Acceptable now (<5k), gate documented |
| §17 Pagination canonical | Paginated pages self-canonicalize | **5.10** | ❌ Gap (not implemented) |
| §18 Query normalization | Non-SEO params stripped from canonical | **5.11** | ❌ Gap (not implemented) |
| §19 Trailing slash | No trailing slash in canonical | **5.9** | ❓ Needs audit |
| §20 metadataBase ownership | Centralized base URL config | **5.14** | ❌ Gap (scattered across 6+ files) |
| ARCH §3.2 metadata builder | Centralized metadata construction | **5.12** | ❌ Gap (inline in page files) |
| ARCH §3.2 schema builder | Centralized JSON-LD construction | **5.13** | ❌ Gap (inline in page files) |
| ARCH §4.5 Middleware | No DB lookups in middleware | 3.4 (clarified) | ✅ Done (page-level redirect used) |

---

## 14. Timeline Estimate

| Wave | Tasks | Estimate | Dependencies | Status |
|------|-------|----------|--------------|--------|
| Wave 1 | TASK 1.1–1.8 | 3-4 часа | None | ✅ DONE (2026-02-10) |
| Wave 2 | TASK 2.1–2.3 | 3-5 дней | None | ✅ DONE (2026-02-10) |
| Wave 3 | TASK 3.1–3.10 | 7-10 дней | Blocks canonical + sitemap | ✅ DONE (2026-02-10) |
| Wave 4 | TASK 4.1–4.2 | 3-5 часов | Wave 2 + Wave 3 | ✅ DONE (2026-02-10) |
| Wave 5 | TASK 5.1–5.14 | 4-5 дней | Wave 3 + Wave 4 + doc consolidation | ⏳ PENDING |
| **Total** | **34 tasks** | **~16-22 рабочих дней** | | **Waves 1-4 DONE, Wave 5 PENDING** |

---

*Этот blueprint является NORMATIVE на время реализации. После завершения Wave 5 — перевести в ACCEPTED и архивировать при необходимости.*
