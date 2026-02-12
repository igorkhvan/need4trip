# SSOT_SEO.md — Need4Trip SEO Single Source of Truth

---
Status: ACCEPTED  
Created: 2026-02-10  
Updated: 2026-02-11  
Author: Human Architect  
Authority: NORMATIVE  
Scope: SEO architecture, indexing policy, URL contracts, rendering rules  
---

## 1. Purpose & Scope

This document defines the **canonical SEO architecture** for the Need4Trip platform.

Its goals are to:
- Ensure deterministic, scalable SEO behavior
- Formalize URL, rendering, and indexing contracts
- Prevent SEO regressions during feature and beta phases
- Provide a single authoritative reference for all SEO-related decisions

**If code or another document conflicts with this SSOT, the code/document MUST change.**

This SSOT governs:
- Public, indexable pages
- URL structure and slug policy
- Rendering strategy for SEO-relevant routes
- Indexing controls (robots, sitemap, meta robots)
- Metadata and language rules
- Structured data (schema.org)
- Beta-phase SEO constraints

Out of scope:
- Content writing guidelines
- Marketing copy
- Growth experiments
- Analytics dashboards (covered elsewhere)

---

## 2. SEO Entities (Canonical)

The following entities are SEO-relevant and MUST follow this SSOT:

| Entity | SEO Page | Status |
|------|---------|--------|
| Event | `/events/{slug}` | ACTIVE |
| Club | `/clubs/{slug}` | ACTIVE |
| City | `/cities/{slug}` | DEFERRED |
| Homepage | `/` | ACTIVE |
| Events listing | `/events` | ACTIVE (indexable) |
| Clubs listing | `/clubs` | ACTIVE (noindex during beta) |
| Pricing | `/pricing` | ACTIVE (noindex during beta) |

---

## 3. URL Contracts (NORMATIVE)

### 3.1 Slug-Based URLs

All public, indexable entity pages MUST use **slug-based URLs**.

#### Canonical forms:
- Events: `/events/{slug}`
- Clubs: `/clubs/{slug}`

Rules:
- UUIDs MUST NOT be exposed in public URLs
- Slugs MUST be human-readable, lowercase, hyphen-separated
- Slugs MUST be immutable after first publication
- Internal references MUST use canonical slug URLs only

Legacy UUID-based URLs MUST:
- Be preserved temporarily
- Issue permanent redirects (`301` or `308`) to canonical slug URLs

Both `301 Moved Permanently` and `308 Permanent Redirect` are acceptable permanent redirect codes.
- `301`: traditional permanent redirect; safe for GET requests
- `308`: preserves HTTP method; used by Next.js `permanentRedirect()`
- Implementation MAY use either, depending on runtime constraints (see SSOT_ARCHITECTURE.md §4.4)

---

### 3.2 Canonical URLs

All indexable pages MUST define a canonical URL.

Rules:
- Exactly one canonical per page
- Canonical MUST point to the slug-based URL
- Canonical MUST be absolute (using `metadataBase`)
- Canonical MUST be present even during beta

---

## 4. Rendering Rules (NORMATIVE)

### 4.1 Indexable Pages

All indexable pages MUST be server-rendered.

Allowed strategies:
- **ISR (recommended)**
- SSR (allowed)

Forbidden:
- Client-only rendering (CSR) for indexable content

This applies to:
- `/events`
- `/clubs`
- `/pricing`
- `/events/{slug}`
- `/clubs/{slug}`

---

### 4.2 Recommended Rendering Strategy

| Page Type | Strategy | Notes |
|----------|----------|------|
| Homepage | SSR / Hybrid | Marketing content |
| Event detail | SSR | UGC, SEO-critical |
| Club detail | SSR | UGC, SEO-critical |
| Events listing | ISR | Catalog |
| Clubs listing | ISR | Catalog |
| Pricing | ISR | Static reference |

ISR revalidation windows are implementation details and NOT defined in this SSOT.

---

## 5. Indexing & Beta Policy (NORMATIVE)

### 5.1 Beta-Phase SEO Strategy

During beta, SEO exposure is **intentionally limited but reversible**.

#### Indexing rules during beta:
- **Indexable:**
  - Homepage (`/`)
  - Events listing (`/events`) — **production-ready**
  - Event detail pages (`/events/{slug}`)
  - Club detail pages (`/clubs/{slug}`)
- **Crawlable but NOT indexable** (`noindex, follow`):
  - `/clubs` — beta-restricted until feature maturity
  - `/pricing` — beta-restricted until feature maturity

**Rationale:**
- `/events` is considered production-ready: SSR content, full metadata, stable URL. It serves as the primary SEO entry point for event discovery.
- `/clubs` and `/pricing` remain restricted until their feature sets are mature and content quality is verified.
- Entity detail pages (`/events/{slug}`, `/clubs/{slug}`) remain indexable regardless of listing page status.

---

### 5.2 robots.txt Policy

During beta, listing pages MUST remain **crawlable** but MUST declare `noindex, follow` via meta robots (§5.3).

robots.txt MUST NOT block listing pages that are intentionally marked `noindex, follow`. Blocking via robots.txt would prevent crawlers from seeing the `noindex` directive itself, and would also block PageRank flow through internal links on those pages.

robots.txt MUST:
- Allow crawling of all public pages (entity pages AND listing pages)
- Always disallow:
  - `/api/*`
  - `/admin/*`
  - Auth-only or private routes (e.g., `/profile/`, `/events/create`, `/clubs/create`)

**Rationale:**
- Crawlability is required for PageRank flow and `noindex` directive discovery
- Indexing is controlled exclusively via meta robots (§5.3), NOT via robots.txt Disallow
- When beta ends, removing `noindex` from listing pages is the only change needed (no robots.txt modification required)

---

### 5.3 Meta Robots (Page-Level)

During beta:
- `/events` MUST NOT declare `noindex` — it is indexable (production-ready)
- `/clubs` MUST declare `noindex, follow`
- `/pricing` MUST declare `noindex, follow`

Entity pages MUST NOT declare `noindex` unless explicitly private.

### 5.3.1 Events Listing Indexing Policy

`/events` is a first-class indexable page. The following rules apply:

Rules:
- `/events` MUST NOT declare `noindex`
- `/events` MUST self-canonicalize (see §17 for pagination)
- `/events` MUST define full metadata: `title`, `description`, `openGraph`, `twitter`, `canonical`
- `/events` MUST comply with pagination canonical policy (§17):
  - `/events?page=1` → canonical: `/events`
  - `/events?page=2` → canonical: `/events?page=2`
- `/events` MUST appear in `sitemap.xml`

---

### 5.4 Sitemap Policy

Sitemap MUST include:
- Homepage (`/`)
- Events listing (`/events`) — production-ready, indexable
- All public event entity pages (`/events/{slug}`)
- All public club entity pages (`/clubs/{slug}`)

Sitemap MUST NOT include:
- `/clubs` — `noindex` during beta
- `/pricing` — `noindex` during beta
- Private or restricted entities
- Any URL that declares `noindex`

Additional rules:
- Use slug-based URLs only
- Use canonical URL form for every entry
- Dynamic sitemap generation is REQUIRED once events/clubs exceed trivial counts

---

## 6. Metadata Rules (NORMATIVE)

### 6.1 Required Metadata Fields

All indexable pages MUST define:
- `title`
- `description`
- `canonical`
- `openGraph` (basic)
- `twitter` (basic)

Generic or placeholder metadata is FORBIDDEN on entity pages.

---

### 6.2 Language Rules

Current language:
- **Primary language: `ru-KZ`**

Rules:
- `<html lang>` MUST match actual content language
- Metadata language MUST match page language
- i18n is DEFERRED but MUST NOT be blocked by current design

---

## 7. Structured Data (Schema.org)

### 7.1 Mandatory Schemas (P1)

The following schemas MUST be implemented:

| Page | Schema | Status |
|----|--------|--------|
| Event detail | `Event` | ✅ Implemented |
| Club detail | `Organization` | ✅ Implemented |
| Homepage | `WebSite` + `Organization` (site-level) | ✅ Implemented (2026-02-11) |

Rules:
- JSON-LD format only
- One primary schema per page (homepage may have two: WebSite + Organization)
- Data MUST reflect actual content
- Homepage schemas MUST include `alternateName` for brand discoverability (see §21)

---

### 7.2 Site-level Schemas (Implemented)

| Schema | Page | Status |
|--------|------|--------|
| WebSite | Homepage | ✅ Implemented (2026-02-11) |
| Organization (site-level) | Homepage | ✅ Implemented (2026-02-11) |

Rules:
- WebSite and Organization schemas MUST include `alternateName` with brand variations
- Brand alternate names: `["Need for Trip", "N4T", "нид фор трип"]`
- These schemas are rendered ONLY on the homepage
- Built via `buildSiteJsonLd()` in `lib/seo/schemaBuilder.ts`

### 7.3 Deferred Schemas (P2)

| Schema | Status |
|------|--------|
| Place / City | Deferred (roadmap: city landing pages) |
| BreadcrumbList | Deferred |
| WebPage | Optional |

Deferred schemas MUST be documented before implementation.

---

## 8. Internal Linking Rules (NORMATIVE)

All entity pages MUST form a crawlable graph.

Required links:
- Event → Club
- Event → City (when city pages exist)
- Club → Events
- Homepage → Events listing

Rules:
- Links MUST use `<a>` elements (not badges-only)
- Hidden UI MUST NOT remove links from DOM
- `nofollow` allowed only for user-generated outbound links

---

## 9. Deferred Items (Explicit)

The following are intentionally postponed and MUST NOT be partially implemented without a dedicated blueprint:

- City landing pages (`/cities/{slug}`) — **HIGH PRIORITY roadmap item** for geo-search traffic (see §21.3, Blueprint Wave 8.1)
- Activity category pages (`/activities/{slug}`) — roadmap item (Blueprint Wave 8.2)
- Dynamic OG image generation (`@vercel/og`) — roadmap item (Blueprint Wave 8.3)
- Blog/Content marketing (`/blog`) — roadmap item (Blueprint Wave 8.4)
- Multi-language routing
- SEO A/B experiments

---

## 10. Non-Goals (Explicit)

This SSOT does NOT:
- Define SEO KPIs
- Mandate analytics tools
- Prescribe copywriting rules
- Optimize for specific search engines

---

## 11. Enforcement

Before implementing any SEO-related change:
1. Read this SSOT
2. Verify consistency with SSOT_ARCHITECTURE.md
3. If deviation is required, create an explicit Exception Record

Failure to comply is considered an architectural defect.

---

## 12. Change Policy

This SSOT:
- May only be modified by a human architect
- Requires explicit rationale for any change
- MUST be updated in the same commit as SEO-affecting code changes

---

## 13. Metadata Patterns (NORMATIVE)

### 13.1 Title Patterns

All indexable pages MUST follow canonical title patterns:

| Page Type | Pattern | Example |
|-----------|---------|---------|
| Homepage | `{Brand} — {Value Proposition}` | `Need4Trip — Автомобильные события и клубы Казахстана` |
| Event detail | `{Event Title} — {City} \| Need4Trip` | `Оффроуд-выезд — Алматы \| Need4Trip` |
| Club detail | `{Club Name} — Автоклуб в {City} \| Need4Trip` | `Nomad Offroad — Автоклуб в Алматы \| Need4Trip` |
| Events listing | `События \| Need4Trip` | `События \| Need4Trip` |
| Clubs listing | `Клубы \| Need4Trip` | `Клубы \| Need4Trip` |
| Pricing | `Тарифы Need4Trip \| Need4Trip` | `Тарифы Need4Trip \| Need4Trip` |

Rules:
- Root layout `title.template` (`%s | Need4Trip`) is the canonical suffix mechanism
- Homepage MAY override the template with a custom full title
- Entity pages MUST include the entity name as the primary component
- City MUST be included in title for event pages (when city is available)
- If city is unavailable, omit the city segment (do NOT use placeholder)

### 13.2 Description Rules

All indexable pages MUST define a `description` meta tag.

Rules:
- Length: **120–160 characters** (MANDATORY range)
- MUST include the primary keyword relevant to the page
- MUST include city name for event detail pages (when available)
- MUST NOT be generic or placeholder text on entity pages
- MUST NOT exceed 200 characters (hard limit; truncation applied before render)
- Entity pages MUST generate description dynamically from entity data
- Static pages MAY use hardcoded descriptions but MUST meet length requirements

Enforcement:
- Description shorter than 120 characters is a **warning** (acceptable for edge cases)
- Description longer than 200 characters is an **architectural defect**
- Empty or missing description on an indexable page is an **architectural defect**

### 13.3 OG & Social Preview Alignment Rule

All indexable pages MUST maintain strict alignment between metadata and OG/Twitter tags:

| Constraint | Rule |
|------------|------|
| OG title | MUST equal page `<title>` (without template suffix) |
| OG description | MUST equal `<meta name="description">` content |
| OG image | MUST be an absolute URL (resolved via `metadataBase`) |
| Twitter title | MUST equal OG title |
| Twitter description | MUST equal OG description |

Rules:
- No mismatch between `<title>`, `og:title`, and `twitter:title` is allowed
- No mismatch between `<meta description>`, `og:description`, and `twitter:description` is allowed
- Deviation is considered an **architectural defect**
- OG images MUST specify `width` (1200), `height` (630), and `alt` text when possible
- Entity pages MUST use entity-specific image if available (e.g., club logo)
- Fallback image: `/og-default.png` (MUST exist in `public/`)

### 13.4 H1 Enforcement Rule

All indexable entity pages MUST follow H1 rules:

Rules:
- Exactly **one `<h1>`** per page (no more, no less)
- H1 MUST match the entity title (for entity pages: event title, club name)
- H1 MUST NOT contain marketing variations, taglines, or decorative text
- Homepage H1 MAY be a marketing headline (exception: homepage is not an entity page)
- Listing pages MUST have exactly one H1 describing the collection (e.g., "Все события", "Все клубы")

Enforcement:
- Multiple H1 tags on a single page is an **architectural defect**
- H1 that does not match the entity title on an entity page is an **architectural defect**

---

## 14. Structured Data Validation (NORMATIVE)

### 14.1 Rich Results Validation Requirement

All JSON-LD structured data MUST pass the [Google Rich Results Test](https://search.google.com/test/rich-results).

Rules:
- JSON-LD that produces errors in the Rich Results Test is an **architectural defect**
- JSON-LD that produces warnings SHOULD be resolved as P1.5 improvements
- Validation MUST be performed after any change to structured data logic
- Validation results SHOULD be documented in the PR description

### 14.2 Mandatory Field Completeness

#### Event Schema (`schema.org/Event`)

| Field | Source | Required | Status |
|-------|--------|----------|--------|
| `@type` | `"Event"` | MANDATORY | ✅ Implemented |
| `name` | `event.title` | MANDATORY | ✅ Implemented |
| `description` | `stripHtml(event.description)` | MANDATORY | ✅ Implemented |
| `startDate` | `event.dateTime` (ISO 8601) | MANDATORY | ✅ Implemented |
| `eventStatus` | `EventScheduled` | MANDATORY | ✅ Implemented |
| `eventAttendanceMode` | `OfflineEventAttendanceMode` | MANDATORY | ✅ Implemented |
| `location` | Place with address/geo | MANDATORY (when available) | ✅ Implemented |
| `organizer` | Person (owner name) | RECOMMENDED | ✅ Implemented |
| `image` | club logo or default | MANDATORY | ✅ Implemented |
| `url` | absolute slug URL | MANDATORY | ✅ Implemented |
| `offers` | price + currency (paid events) | MANDATORY (when paid) | ✅ Implemented |
| `isAccessibleForFree` | `true` (free events) | RECOMMENDED | ✅ Implemented |

P1.5 Improvements (not yet implemented):
- `endDate` — not available in DB schema; add when event end time is supported
- `performer` — not applicable currently
- `maximumAttendeeCapacity` — available as `maxParticipants`; add to schema
- `remainingAttendeeCapacity` — derivable; add to schema

#### Organization Schema (`schema.org/Organization`)

| Field | Source | Required | Status |
|-------|--------|----------|--------|
| `@type` | `"Organization"` | MANDATORY | ✅ Implemented |
| `name` | `club.name` | MANDATORY | ✅ Implemented |
| `description` | `club.description` | RECOMMENDED | ✅ Implemented |
| `logo` | `club.logoUrl` (absolute) | RECOMMENDED | ✅ Implemented |
| `url` | absolute slug URL | MANDATORY | ✅ Implemented |
| `address` | PostalAddress from cities | RECOMMENDED | ✅ Implemented |
| `sameAs` | telegram, website URLs | RECOMMENDED | ✅ Implemented |

P1.5 Improvements (not yet implemented):
- `foundingDate` — not available in DB; add when club founding date is supported
- `numberOfEmployees` → `memberCount` — not standard; consider `member` array
- `areaServed` — derivable from cities; add for geo relevance

### 14.3 Fallback Handling

Rules:
- If a MANDATORY field's source data is unavailable, the field MUST be omitted (not set to empty string or null)
- Restricted events: JSON-LD MUST NOT be rendered (privacy policy)
- Private clubs: JSON-LD MUST be minimal (name + url only)
- JSON-LD MUST use absolute URLs for all URL fields (`url`, `image`, `logo`)
- Relative `logoUrl` MUST be prefixed with `baseUrl` before inclusion in JSON-LD

---

## 15. Canonical Stability Rule (NORMATIVE)

### 15.1 Canonical Persistence

Rules:
- Canonical URL MUST remain **stable** across the beta phase and beyond
- Canonical URL MUST NOT change after initial publication of an entity
- Any canonical URL change after publication is a **P0 incident** requiring redirect management

### 15.2 Canonical–Sitemap Consistency

Rules:
- Every canonical URL MUST have a corresponding entry in `sitemap.xml`
- Every `sitemap.xml` entry MUST match its page's canonical URL exactly
- Mismatch between canonical and sitemap entry is an **architectural defect**

### 15.3 Canonical Enforcement Checklist

| Constraint | Rule |
|------------|------|
| Format | MUST be absolute URL (resolved via `metadataBase`) |
| Uniqueness | Exactly one `<link rel="canonical">` per page |
| UUID prohibition | Canonical MUST NOT contain UUID path segments |
| Slug alignment | Canonical MUST use the slug-based URL |
| Static pages | Static pages MUST define explicit canonical (e.g., `/events`, `/clubs`) |

### 15.4 Current Canonical Coverage

| Page | Canonical Defined | Status |
|------|------------------|--------|
| Homepage (`/`) | **NO** | ❌ GAP — MUST add `alternates.canonical: "/"` |
| Events listing (`/events`) | **NO** | ❌ **P0** GAP — indexable page, MUST add `alternates.canonical: "/events"` |
| Clubs listing (`/clubs`) | **NO** | ❌ GAP — MUST add via layout or page metadata |
| Pricing (`/pricing`) | **NO** | ❌ GAP — MUST add `alternates.canonical: "/pricing"` |
| Event detail (`/events/{slug}`) | YES | ✅ OK |
| Club detail (`/clubs/{slug}`) | YES | ✅ OK |

---

## 16. Sitemap Integrity Rule (NORMATIVE)

### 16.1 Sitemap Content Rules

Rules:
- Sitemap MUST include `/events` (indexable, production-ready per §5.1)
- Sitemap MUST NOT include `noindex` listing pages (`/clubs`, `/pricing`) during beta
- Sitemap MUST NOT include private or restricted entities
- Sitemap MUST use slug-based URLs only (no UUIDs)
- Sitemap MUST use the canonical URL form for every entry
- Sitemap entries MUST match the page's `<link rel="canonical">` exactly

### 16.2 Current Sitemap Compliance

| Rule | Status |
|------|--------|
| `/events` in sitemap | ❌ GAP — MUST be added (indexable per §5.1) |
| `/clubs`, `/pricing` NOT in sitemap | ❌ GAP — currently included, MUST be removed |
| No private entities | ✅ OK — filtered by `visibility: "public"` |
| Slug-based URLs | ✅ OK — uses `event.slug` and `club.slug` |
| Canonical URL form | ✅ OK — uses absolute URLs with `BASE_URL` |

### 16.3 Sitemap–Robots Consistency

Rules:
- Pages disallowed in `robots.txt` SHOULD NOT appear in `sitemap.xml`
- Pages with `noindex` meta robots SHOULD NOT appear in `sitemap.xml`
- Inconsistency between robots policy and sitemap is a **warning** (not defect, but SHOULD be resolved)

### 16.4 Sitemap Scalability

Rules:
- Sitemap implementation MUST use batched pagination or cursor-based iteration for entity queries
- Loading an entire dataset into memory in a single query is FORBIDDEN
- When entity count exceeds 5,000, sitemap MUST switch to `generateSitemaps()` (sitemap index) pattern
- This is a **scalability requirement** — mandatory before entity count exceeds 5k

---

## 17. Pagination Canonical Policy (NORMATIVE)

### 17.1 Pagination Canonicalization

Paginated listing pages MUST **self-canonicalize** — each page is its own canonical.

Rules:
- `/events?page=2` → canonical: `/events?page=2`
- `/events?page=1` → canonical: `/events` (page 1 canonicalizes to base URL)
- Pagination MUST NOT canonicalize all pages to page 1
- `rel="prev"` / `rel="next"` are DEFERRED (Google deprecated them, but may be useful for accessibility)

**Rationale:** Each paginated page has unique content. Canonicalizing to page 1 would signal to search engines that pages 2+ are duplicates, causing content loss.

**Beta note:** `/events` is indexable (§5.1) — pagination canonical rules are **active and enforced**. For `/clubs` (noindex during beta), pagination canonical rules still apply to ensure correct behavior when beta ends.

---

## 18. Query Parameter Normalization (NORMATIVE)

### 18.1 SEO vs Non-SEO Parameters

Query parameters fall into two categories:

| Category | Parameters | Canonical Treatment |
|----------|-----------|-------------------|
| SEO-significant | `page` | Included in canonical |
| Non-SEO (UI state) | `tab`, `sort`, `search`, `cityId`, `categoryId` | Excluded from canonical |

### 18.2 Normalization Rules

Rules:
- Non-SEO parameters (sorting, UI state, tabs, filters) MUST canonicalize to the **base URL without those parameters**
- Example: `/events?tab=upcoming` → canonical: `/events`
- Example: `/events?sort=date&cityId=123` → canonical: `/events`
- Example: `/events?page=2&sort=date` → canonical: `/events?page=2` (only `page` preserved)
- Canonical URL MUST NOT include parameters that do not affect indexable content
- Violation is considered an **architectural defect**

**Rationale:** Non-SEO parameters create duplicate URLs for the same canonical content. Search engines waste crawl budget on parameter variants.

---

## 19. Trailing Slash Policy (NORMATIVE)

### 19.1 Trailing Slash Rules

Rules:
- Canonical URLs MUST NOT include a trailing slash (except for root `/`)
- Correct: `/events`, `/events/offroad-almaty-a1b2c3d4`, `/clubs/nomad-offroad`
- Incorrect: `/events/`, `/events/offroad-almaty-a1b2c3d4/`, `/clubs/nomad-offroad/`
- Application routing MUST enforce consistent non-trailing-slash policy
- Next.js `trailingSlash: false` (default) MUST be maintained in `next.config.ts`
- If a trailing-slash URL is accessed, it SHOULD redirect to the non-trailing-slash variant (Next.js handles this by default)

### 19.2 Enforcement

- Canonical URLs MUST be generated without trailing slash
- Sitemap entries MUST NOT include trailing slash
- Internal links MUST NOT include trailing slash
- Violation is considered a **warning** (auto-corrected by Next.js, but should not appear in source code)

---

## 20. metadataBase Ownership Rule (NORMATIVE)

### 20.1 Production Base URL

The production base URL (`https://need4trip.app`) MUST be owned by a **single canonical runtime configuration module**.

Rules:
- Root layout (`src/app/layout.tsx`) MUST define `metadataBase` using the canonical production base URL
- The base URL MUST be sourced from a single configuration module (see SSOT_ARCHITECTURE.md §3.2)
- Direct usage of `process.env.NEXT_PUBLIC_APP_URL` in page-level metadata is DISCOURAGED
- All absolute URL construction (sitemap, JSON-LD, OG images) SHOULD use the same base URL source

### 20.2 Resolution Order

1. `process.env.NEXT_PUBLIC_APP_URL` (environment variable — deployment-specific)
2. Fallback: `https://need4trip.app` (hardcoded production default)

This two-step resolution MUST be implemented exactly once in the canonical configuration module (`lib/config/runtimeConfig.ts` → `getPublicBaseUrl()`), not scattered across files.

Hardcoded domain fallbacks in any file other than the canonical configuration module are FORBIDDEN.

---

## 21. Brand Search Discoverability (NORMATIVE)

### 21.1 Brand Alternate Names

The brand MUST be discoverable by all common search variations.

Canonical brand name: `Need4Trip`

Registered alternate names:
- `Need for Trip`
- `N4T`
- `нид фор трип`

Rules:
- `alternateName` field MUST be present in both `WebSite` and `Organization` JSON-LD schemas on the homepage
- Alternate names are maintained in `BRAND_ALTERNATE_NAMES` constant in `lib/seo/schemaBuilder.ts`
- Adding new alternate names MUST be reflected in both schemaBuilder and this SSOT
- Homepage meta description SHOULD include at least one alternate name variant (e.g., "Need4Trip (Need for Trip)")

### 21.2 Keyword Strategy

Target keyword categories for organic search growth:

| Category | Example queries | Implementation |
|----------|----------------|----------------|
| Brand variants | "need for trip", "n4t", "нид фор трип" | ✅ alternateName in JSON-LD |
| Geo + activity | "поездки Алматы", "охота Астана" | 📋 City landing pages (roadmap) |
| Activity type | "оффроуд Казахстан", "рыбалка Капчагай" | 📋 Activity pages (roadmap) |
| Informational | "маршруты для оффроуда" | 📋 Blog/content (roadmap) |

Rules:
- Homepage and root layout descriptions MUST include core activity keywords (автомобильные поездки, оффроуд, экспедиции, активный отдых)
- Entity pages inherit keywords naturally from their content
- Keyword stuffing is PROHIBITED — descriptions must read naturally
- Geo-specific keywords require dedicated landing pages (not meta tag stuffing)

### 21.3 Future Keyword Expansion

When city landing pages (`/cities/{slug}`) are implemented:
- Title pattern: `"Поездки и события в {город} — Need4Trip"`
- Description: `"{город}: автомобильные поездки, оффроуд, охота, рыбалка и активный отдых. Найдите попутчиков и присоединяйтесь к клубам."`
- JSON-LD: `Place` schema with `geo` coordinates
- Each city page MUST appear in sitemap.xml

---
