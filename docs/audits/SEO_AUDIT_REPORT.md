---
Status: DRAFT
Created: 2026-02-10
Author: Cursor AI
---

# SEO Audit Report — Need4Trip

**Authority Level:** INFORMATIVE  
**Scope:** Full SEO diagnostics of the Need4Trip codebase  
**Purpose:** Input for SSOT_SEO.md design (by human Architect)

---

## 1. Executive Summary

Need4Trip — Next.js 14+ приложение для организации автомобильных (offroad) событий, развёрнутое на `need4trip.kz`.

**Ключевые факты:**

- **22 page-маршрута**, из них ~8 публичных и потенциально индексируемых
- **52 API-маршрута** (не индексируемые, но доступны ботам без robots.txt)
- **Отсутствуют** `robots.txt` и `sitemap.xml` (ни статические, ни динамические)
- **Метаданные**: полная coverage у 2 из 8 публичных страниц (Event Detail, Club Detail)
- **URL-схема** использует UUID `[id]` вместо human-readable slugs; clubs уже имеют slug в БД, но не используют его в маршрутах
- **Структурированные данные (JSON-LD)**: полностью отсутствуют
- **3 из 8 публичных страниц** рендерятся полностью на клиенте (CSR) — боты могут не увидеть контент
- **Аналитика и Search Console**: не подключены
- **`lang="en"`** на `<html>`, при том что весь контент и metadata на русском языке
- **OG-изображение** (`/og-default.png`) указано в metadata, но файл **физически отсутствует** в `public/`

---

## 2. Inventory Tables

### 2.1 Routing & URL Structure — Публичные индексируемые страницы

| # | Route | File (в `src/app/`) | Params | Slug в URL | Рендеринг | Metadata |
|---|-------|---------------------|--------|------------|-----------|----------|
| 1 | `/` | `(marketing)/page.tsx` | — | N/A | SSR (Hybrid) | Partial (title+desc) |
| 2 | `/events` | `(app)/events/page.tsx` | — | N/A | **CSR** | Partial (title+desc) |
| 3 | `/events/[id]` | `(app)/events/[id]/page.tsx` | `id` (UUID) | **Нет** | SSR | **Full** (OG+Twitter) |
| 4 | `/clubs` | `(app)/clubs/page.tsx` | — | N/A | **CSR** | Partial (title+desc в layout) |
| 5 | `/clubs/[id]` | `(app)/clubs/[id]/page.tsx` | `id` (UUID) | **Нет** | SSR | **Full** (OG+Twitter) |
| 6 | `/clubs/[id]/events` | `(app)/clubs/[id]/events/page.tsx` | `id` | Нет | SSR | **Нет** |
| 7 | `/clubs/[id]/members` | `(app)/clubs/[id]/members/page.tsx` | `id` | Нет | SSR | **Нет** |
| 8 | `/pricing` | `(app)/pricing/page.tsx` | — | N/A | **CSR** | **Нет** |

### 2.2 Приватные / неиндексируемые маршруты

| Route | Тип | Защита | Metadata |
|-------|-----|--------|----------|
| `/profile` | Private | Auth required | Нет (inherits root) |
| `/profile/edit` | Private | Auth required | Нет (inherits root) |
| `/events/create` | Private | Auth required | Нет (inherits root) |
| `/events/[id]/edit` | Private | Auth required | Нет (inherits root) |
| `/clubs/create` | Private | Auth required | Нет (inherits root) |
| `/clubs/[id]/settings` | Private | Owner/Admin | Нет (inherits root) |
| `/admin` | Private | Admin only | `noindex, nofollow` |
| `/admin/users` | Private | Admin only | Inherits admin layout |
| `/admin/users/[userId]` | Private | Admin only | Inherits admin layout |
| `/admin/clubs` | Private | Admin only | Inherits admin layout |
| `/admin/clubs/[clubId]` | Private | Admin only | Inherits admin layout |
| `/admin/audit` | Private | Admin only | Inherits admin layout |
| `/admin/abuse` | Private | Admin only | Inherits admin layout |
| `/admin/feedback` | Private | Admin only | Inherits admin layout |

### 2.3 Metadata Coverage Matrix

| Поле | `/` | `/events` | `/events/[id]` | `/clubs` | `/clubs/[id]` | `/pricing` |
|------|-----|-----------|----------------|----------|---------------|------------|
| title | Static | Static | Dynamic | Static (layout) | Dynamic | **Нет** |
| description | Static | Static | Dynamic | Static (layout) | Dynamic | **Нет** |
| openGraph | Inherit root | Inherit root | **Custom** | Inherit root | **Custom** | **Нет** |
| twitter | Inherit root | Inherit root | **Custom** | Inherit root | **Custom** | **Нет** |
| canonical | **Нет** | **Нет** | **Нет** | **Нет** | **Нет** | **Нет** |
| robots | **Нет** | **Нет** | **Нет** | **Нет** | **Нет** | **Нет** |

**Статистика:** 2/8 (25%) публичных страниц имеют полные метаданные. Canonical URLs отсутствуют на 100% страниц.

### 2.4 Root Layout Metadata (Base Defaults)

**Файл:** `src/app/layout.tsx`

| Поле | Значение |
|------|----------|
| `metadataBase` | `https://need4trip.kz` |
| `title.template` | `"%s \| Need4Trip"` |
| `title.default` | `"Need4Trip"` |
| `description` | `"Организация оффроуд-событий и регистрация участников"` |
| `openGraph.locale` | `ru_RU` |
| `openGraph.images` | `/og-default.png` (1200×630) — **файл не найден в `public/`** |
| `twitter.card` | `summary_large_image` |

### 2.5 Dynamic Metadata (generateMetadata)

Используется только на 2 страницах:

**Event Detail** (`src/app/(app)/events/[id]/page.tsx`):
- title: из `event.title`
- description: динамическая (дата, город, кол-во участников, truncated 200 chars)
- openGraph: type `article`, image из club logo или default
- twitter: `summary_large_image`
- Restricted events: показывается минимальная metadata

**Club Detail** (`src/app/(app)/clubs/[id]/page.tsx`):
- title: из `club.name`
- description: динамическая (города, кол-во участников/событий)
- openGraph: image из club logo
- twitter: `summary_large_image`
- Private clubs: показывается минимальная metadata

---

## 3. Indexing Controls

### 3.1 robots.txt

**Статус: ОТСУТСТВУЕТ**

Проверенные локации:
- `public/robots.txt` — не найден
- `src/app/robots.ts` — не найден
- `src/app/robots.tsx` — не найден

### 3.2 sitemap.xml

**Статус: ОТСУТСТВУЕТ**

Проверенные локации:
- `public/sitemap.xml` — не найден
- `src/app/sitemap.ts` — не найден
- `src/app/sitemap.tsx` — не найден

### 3.3 noindex / nofollow

| Источник | Файл | Значение |
|----------|------|----------|
| Admin layout | `src/app/admin/layout.tsx` | `robots: "noindex, nofollow"` |
| UGC links (rich-text-editor) | `src/components/ui/rich-text-editor.tsx` | `rel="noopener noreferrer nofollow"` |
| UGC links (rich-text-content) | `src/components/ui/rich-text-content.tsx` | `rel="noopener noreferrer nofollow"` |

Все остальные публичные страницы: **нет явных robots-директив** — индексируются по умолчанию.

### 3.4 Middleware (SEO-related)

**Файл:** `src/middleware.ts`  
**Matcher:** `/api/:path*` (только API routes)  
**Robots-related:** нет `X-Robots-Tag` headers, нет crawl-related логики.

### 3.5 Текущая позиция индексации

- **Индексируется по умолчанию:** все публичные pages + все API routes (нет robots.txt)
- **Явно заблокировано:** только `/admin/*` (через metadata `noindex, nofollow`)
- **Защищено middleware:** API routes (rate limiting, auth), но доступны ботам

---

## 4. Structured Data (JSON-LD)

### 4.1 Текущее состояние

**JSON-LD / Schema.org: полностью отсутствует.**

| Schema Type | Статус | Релевантность |
|-------------|--------|---------------|
| Event (schema.org) | Не реализован | Высокая — core entity |
| Organization | Не реализован | Высокая — clubs |
| Place / PostalAddress | Не реализован | Средняя — event locations |
| GeoCoordinates | Не реализован | Средняя — если координаты есть |
| BreadcrumbList | Не реализован | Средняя — навигация |
| WebSite | Не реализован | Низкая — root level |
| WebPage | Не реализован | Низкая — per page |

### 4.2 Библиотеки

- `next-seo`: не установлен
- `schema-dts`: не установлен
- Других SEO-библиотек в `package.json` нет

### 4.3 Документация

В `docs/blueprint/OG_SOCIAL_SHARING_BLUEPRINT.md` (строка 447) JSON-LD отмечен как **P2 future improvement**:
> "JSON-LD (structured data) — для лучшего SEO (`Event` schema.org type)"

---

## 5. Content Structure (SEO-relevant)

### 5.1 Homepage (`/`)

| Элемент | Значение | Тип |
|---------|----------|-----|
| H1 | "Организация автомобильных поездок и учёт экипажей в пару кликов" | Static |
| H2 | "Как это работает", "Что умеет Need4Trip", "Готовы начать?", "Предстоящие поездки" | Static |
| H3 | Step titles (3 шт.) | Static |
| H4 | Feature titles (6 шт.) | Static |
| Text content | Rich marketing content | Static |
| Dynamic section | UpcomingEventsAsync (3 события, Suspense) | Dynamic/SSR |

**SEO оценка:** Хорошая — семантические заголовки, насыщенный контент, корректная иерархия.

### 5.2 Events List (`/events`)

| Элемент | Значение | Тип |
|---------|----------|-----|
| H1 | "Все события" | Static |
| H2/H3 | **Нет** | — |
| Content | Event cards загружаются клиентским JS | CSR |
| Text | Только subtitle | Static |

**SEO оценка:** Низкая — CSR, нет heading hierarchy для секций, боты видят только заголовок.

### 5.3 Event Detail (`/events/[id]`)

| Элемент | Значение | Тип |
|---------|----------|-----|
| H1 | `event.title` | User-generated (required, min 3 chars) |
| H3 | "Описание", "Правила участия", "Стоимость участия", "Точки маршрута", "Требования к авто", "Организатор" | Static labels (conditional) |
| Description | `event.description` — HTML/rich text | User-generated (**required**, NOT NULL) |
| Rules | `event.rules` — HTML/rich text | User-generated (**optional**, NULL allowed) |
| Locations | `event.locations` — массив | User-generated (optional) |

**SEO оценка:** Хорошая (SSR) — но thin content риск при минимальном description.

### 5.4 Clubs List (`/clubs`)

| Элемент | Значение | Тип |
|---------|----------|-----|
| H1 | "Автомобильные клубы" | Static |
| H2/H3 | **Нет** (кроме error/empty states) | — |
| Content | Club cards загружаются клиентским JS | CSR |

**SEO оценка:** Низкая — CSR, нет heading hierarchy.

### 5.5 Club Detail (`/clubs/[id]`)

| Элемент | Значение | Тип |
|---------|----------|-----|
| H1 | `club.name` | User-generated (required, 2-100 chars) |
| H2 | "Города клуба" (conditional), "О клубе" | Static labels |
| Description | `club.description` | User-generated (**optional, NULL allowed**) |
| Empty state | "Описание клуба не указано" (italic, muted) | Static fallback |

**SEO оценка:** Средняя (SSR) — **высокий thin content риск** из-за optional description.

### 5.6 Pricing (`/pricing`)

| Элемент | Значение | Тип |
|---------|----------|-----|
| H1 | "Тарифы Need4Trip" | Static |
| H2 | Plan titles (4 шт.) | Dynamic (CSR) |
| Content | Feature lists для каждого плана | Dynamic (CSR) |

**SEO оценка:** Низкая — CSR, контент загружается клиентским JS.

### 5.7 Thin Content Risks Summary

| Страница | Поле | Ограничение | Риск |
|----------|------|-------------|------|
| `/clubs/[id]` | `club.description` | NULL allowed | **Высокий** — многие клубы могут не иметь описания |
| `/events/[id]` | `event.rules` | NULL allowed | Средний — секция скрыта если пусто |
| `/events/[id]` | `event.title` | min 3 chars | Низкий — формально возможен title в 3 символа |

---

## 6. Internal Linking Graph

### 6.1 Существующие связи

```
Homepage (/)
  ├── [header] → /events ✅
  ├── [header] → /clubs ✅ (hidden in SOFT_BETA_STRICT)
  ├── [header] → /pricing ✅ (hidden in SOFT_BETA_STRICT)
  ├── [content] → /events/[id] ✅ (через UpcomingEvents cards)
  └── [footer] → /events ✅
       ❌ Footer NOT linking → /clubs, /pricing

/events
  └── EventCard → /events/[id] ✅

/events/[id]
  ├── ❌ NOT linking → /clubs/[clubId] (club badge shown, no <a>)
  ├── ❌ NOT linking → city page (city pages не существуют)
  └── Organizer section (user info, no outbound link)

/clubs
  └── ClubCard → /clubs/[id] ✅

/clubs/[id]
  ├── Events preview → /events/[id] ✅
  ├── ❌ NOT linking → city pages (badges shown, no <a>)
  └── Members preview (no outbound links)

/pricing
  └── (нет исходящих content-ссылок, только header inbound)
```

### 6.2 Отсутствующие crawl-пути

| Откуда | Куда | Наблюдение |
|--------|------|------------|
| Event detail | Parent Club | Club badge отображается, но без `<a>` тега |
| Event detail | City page | Город отображается текстом, city pages не существуют |
| Club detail | City pages | Города показаны как badges, но не кликабельны |
| Footer | `/clubs` | Ссылка отсутствует |
| Footer | `/pricing` | Ссылка отсутствует |
| Любая страница | City landing | City pages (`/cities/[slug]`) **не существуют** |

### 6.3 Breadcrumbs

**Статус: ОТСУТСТВУЮТ** — ни как UI-компонент, ни как structured data.

### 6.4 City Pages

**Статус: НЕ РЕАЛИЗОВАНЫ**

- API endpoint `/api/cities/[id]` существует (reference data)
- Frontend city pages отсутствуют
- Города используются как filter/badge в events и clubs, но не имеют собственных landing pages

### 6.5 Beta Gating Impact

`SOFT_BETA_STRICT` mode (`src/components/layout/main-header.tsx:14-15`) скрывает ссылки на `/clubs` и `/pricing` из header-навигации. Однако сами страницы **доступны** по прямому URL.

---

## 7. Performance & Runtime Context (SEO-relevant)

### 7.1 Rendering Strategy по страницам

| Страница | Стратегия | `force-dynamic` | Бот видит контент? |
|----------|-----------|-----------------|-------------------|
| `/` (Homepage) | SSR Hybrid + Suspense | Нет | ✅ Да (hero + marketing) |
| `/events` | **CSR** (useEffect + fetch) | Нет | ❌ Только shell |
| `/events/[id]` | **SSR** (server fetch) | Да | ✅ Да (полный контент) |
| `/clubs` | **CSR** (`"use client"` + useEffect) | Нет | ❌ Только shell |
| `/clubs/[id]` | **SSR** (server fetch) | Да | ✅ Да (полный контент) |
| `/clubs/[id]/events` | **SSR** | Да | ✅ Да |
| `/clubs/[id]/members` | **SSR** | Да | ✅ Да |
| `/pricing` | **CSR** (`"use client"` + useEffect) | Нет | ❌ Только shell |

### 7.2 CSR-страницы — детали

**Events List** (`src/app/(app)/events/page.tsx`):
- Server Component wrapper → делегирует к `EventsPageClient` (Client Component)
- Данные: `useEventsQuery` hook → `fetch('/api/events')` в `useEffect`
- При initial render: H1 + subtitle + пустой/loading state

**Clubs List** (`src/app/(app)/clubs/page.tsx`):
- `"use client"` directive на верхнем уровне
- Данные: `useEffect` + `fetch('/api/clubs')`
- При initial render: H1 + subtitle + loading skeleton

**Pricing** (`src/app/(app)/pricing/page.tsx`):
- `"use client"` directive
- Данные: `useEffect` + `fetch('/api/plans')`
- При initial render: H1 + loading spinner

### 7.3 Suspense Boundaries (SSR pages)

| Страница | Deferred Section | Fallback |
|----------|-----------------|----------|
| Homepage | UpcomingEventsAsync | UpcomingEventsSkeleton |
| Event Detail | EventParticipantsAsync | Loading skeleton |
| Club Detail | ClubMembersPreviewAsync, ClubEventsPreviewAsync | Loading skeletons |

Основной контент (title, description, metadata) рендерится сразу; deferred — только вторичные секции.

---

## 8. Analytics & Search Tooling

### 8.1 Search Engine Verification

| Сервис | Статус |
|--------|--------|
| Google Search Console | **Не настроен** (нет `google-site-verification`) |
| Yandex.Webmaster | **Не настроен** |

### 8.2 Analytics

| Инструмент | Статус |
|------------|--------|
| Google Analytics / GA4 | **Не установлен** |
| Yandex.Metrika | **Не установлен** |
| PostHog / Mixpanel / Amplitude | **Не установлен** |
| Plausible / Umami / Fathom | **Не установлен** |
| Vercel Analytics | **Не установлен** |
| Vercel Speed Insights | **Не установлен** |

### 8.3 Error Tracking

| Инструмент | Статус |
|------------|--------|
| Sentry | **Не установлен** (документировано в SSOT_API.md: "No APM") |

### 8.4 Web Vitals

| Инструмент | Статус |
|------------|--------|
| `web-vitals` package | **Не установлен** |
| `reportWebVitals` hook | **Не используется** |
| ESLint `core-web-vitals` | ✅ Настроен (linting only) |

### 8.5 CSP Implications

`next.config.ts` содержит Content Security Policy. Подключение внешней аналитики потребует обновления CSP-политики.

---

## 9. Additional Observations

### 9.1 `lang` Attribute Mismatch

**Файл:** `src/app/layout.tsx:68`

```html
<html lang="en" className={inter.className}>
```

Весь контент на русском языке:
- metadata description: русский
- OG locale: `ru_RU`
- UI тексты: русский
- UGC: русский

**Факт:** `lang="en"` противоречит фактическому содержимому сайта.

### 9.2 OG Image Missing

**Файл:** `src/app/layout.tsx:37`

Metadata ссылается на `/og-default.png`, но в `public/` директории найдены только:
- `next.svg`, `file.svg`, `window.svg`, `vercel.svg`, `globe.svg`

Файл `og-default.png` **отсутствует**.

### 9.3 Slug vs UUID

**Clubs** имеют поле `slug` в БД:
- Файл: `src/lib/db/clubRepo.ts:19` — `slug: string`
- Генерация: `src/lib/db/clubRepo.ts:160` — `slug: payload.name.toLowerCase().replace(/\s+/g, '-')`
- Маршрут: `/clubs/[id]` — использует UUID, не slug

**Events** НЕ имеют поля slug в БД.

**Car Brands** имеют `slug` (`src/lib/db/types.ts:326`), но это reference data.

### 9.4 nofollow на UGC-ссылках

Корректно реализовано:
- `src/components/ui/rich-text-editor.tsx:191` — `rel="noopener noreferrer nofollow"`
- `src/components/ui/rich-text-content.tsx:42` — `rel="noopener noreferrer nofollow"`

### 9.5 Font Loading

Inter font загружается с `display: "swap"` и subsets `["latin", "cyrillic"]` — SEO-friendly подход (без FOUT-блокировки, поддержка кириллицы).

---

## 10. Gaps & Risks (сводка)

### КРИТИЧЕСКИЕ (блокируют индексацию)

| ID | Наблюдение | Файл/Путь |
|----|-----------|-----------|
| G-01 | `robots.txt` отсутствует | Нет `public/robots.txt` или `src/app/robots.ts` |
| G-02 | `sitemap.xml` отсутствует | Нет `public/sitemap.xml` или `src/app/sitemap.ts` |
| G-03 | CSR на listing-страницах (`/events`, `/clubs`, `/pricing`) | См. §7.1 |
| G-04 | `lang="en"` при русском контенте | `src/app/layout.tsx:68` |
| G-05 | OG-изображение не существует (`/og-default.png`) | `src/app/layout.tsx:37`, `public/` |

### ВЫСОКИЙ ПРИОРИТЕТ

| ID | Наблюдение | Детали |
|----|-----------|--------|
| G-06 | UUID в URL вместо slug | Clubs имеют slug в БД, но не используют; Events не имеют slug вообще |
| G-07 | Canonical URLs отсутствуют на 100% страниц | Риск дублированного контента |
| G-08 | JSON-LD / Structured Data = 0 | Отмечено как P2 в blueprint |
| G-09 | `/pricing` без метаданных | Публичная страница без title/description/OG |
| G-10 | Нет breadcrumbs (UI и structured data) | Отсутствует навигационная иерархия |
| G-11 | Нет Google Search Console / Yandex.Webmaster | Нет верификации |
| G-12 | Нет аналитики (GA, Metrika, Web Vitals) | Нет данных о поведении пользователей |

### СРЕДНИЙ ПРИОРИТЕТ

| ID | Наблюдение | Детали |
|----|-----------|--------|
| G-13 | Event → Club: нет ссылки | Club badge без `<a>` тега |
| G-14 | City pages не существуют | Города — badges/текст, не landing pages |
| G-15 | Footer не содержит ссылки на `/clubs` и `/pricing` | `src/components/layout/main-footer-client.tsx` |
| G-16 | Beta gating скрывает навигацию | `SOFT_BETA_STRICT` скрывает clubs/pricing из header |
| G-17 | Thin content: `club.description` optional (NULL) | Клубы без описания = placeholder |
| G-18 | Heading hierarchy неполная на listing-страницах | `/events` и `/clubs` — только H1, нет H2 |

### НИЗКИЙ ПРИОРИТЕТ (корректно реализовано)

| ID | Наблюдение |
|----|-----------|
| G-19 | UGC-ссылки корректно помечены `nofollow` |
| G-20 | Admin-секция: `noindex, nofollow` |
| G-21 | Root layout: базовые OG defaults с title template |
| G-22 | Event/Club detail: SSR с `force-dynamic`, контент доступен ботам |
| G-23 | Inter font: `display: swap`, cyrillic subset |

---

## 11. Open Questions for Architect

| # | Вопрос | Контекст |
|---|--------|----------|
| Q-01 | Планируется ли введение slug-based URLs для events и clubs? | Clubs уже имеют slug в БД. Events — нет. Переход потребует redirects и обновления всех внутренних ссылок |
| Q-02 | Нужны ли отдельные city-страницы (`/cities/[slug]`)? | Города — ключевая навигационная сущность (фильтрация, badges), но не имеют landing pages |
| Q-03 | Каков целевой язык сайта? Нужен ли multi-language? | `lang="en"` vs русский контент vs домен `.kz`. Должен быть `lang="ru"` или `lang="ru-KZ"`? |
| Q-04 | CSR listing-страницы — осознанный выбор? | Events, Clubs, Pricing рендерятся клиентом. Возможно ли SSR/ISR для улучшения индексации? |
| Q-05 | Нужно ли создать OG-изображение или удалить ссылку? | `/og-default.png` указано в metadata, но файл отсутствует |
| Q-06 | Какой приоритет SEO при текущем beta-статусе? | `SOFT_BETA_STRICT` скрывает навигацию к clubs/pricing. Нужна ли индексация сейчас? |
| Q-07 | Google Search Console и/или Yandex.Webmaster — подключать? | Целевая аудитория в Казахстане, оба сервиса релевантны |
| Q-08 | JSON-LD для events — поднимать приоритет с P2? | Event schema.org может значительно улучшить SERP для events |
| Q-09 | Какая стратегия для `robots.txt`? | Нужно определить: что индексировать, что блокировать (API routes, admin, protected pages) |
| Q-10 | Нужна ли динамическая sitemap с реальными events/clubs? | Потребует server-side генерации с actual data из БД |

---

## Appendix A: File References

| Категория | Файл |
|-----------|------|
| Root Layout (metadata base) | `src/app/layout.tsx` |
| Homepage | `src/app/(marketing)/page.tsx` |
| Events List | `src/app/(app)/events/page.tsx` |
| Event Detail | `src/app/(app)/events/[id]/page.tsx` |
| Clubs List | `src/app/(app)/clubs/page.tsx` |
| Club Detail | `src/app/(app)/clubs/[id]/page.tsx` |
| Pricing | `src/app/(app)/pricing/page.tsx` |
| Admin Layout | `src/app/admin/layout.tsx` |
| Clubs Layout (metadata) | `src/app/(app)/clubs/layout.tsx` |
| Header Navigation | `src/components/layout/main-header.tsx` |
| Footer | `src/components/layout/main-footer-client.tsx` |
| Rich Text Editor (nofollow) | `src/components/ui/rich-text-editor.tsx` |
| Rich Text Content (nofollow) | `src/components/ui/rich-text-content.tsx` |
| Club Repo (slug generation) | `src/lib/db/clubRepo.ts` |
| Event Repo | `src/lib/db/eventRepo.ts` |
| Middleware | `src/middleware.ts` |
| Next.js Config | `next.config.ts` |
| OG Blueprint | `docs/blueprint/OG_SOCIAL_SHARING_BLUEPRINT.md` |

---

*Этот документ является INFORMATIVE (не нормативный). Он предназначен как входные данные для проектирования SSOT_SEO.md человеком-архитектором.*
