# SSOT_SEO.md — Need4Trip SEO Single Source of Truth

---
Status: ACCEPTED  
Created: 2026-02-10  
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
| Listing pages | `/events`, `/clubs`, `/pricing` | ACTIVE (restricted in beta) |

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
- Issue permanent redirects (`301`) to canonical slug URLs

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
  - Event detail pages (`/events/{slug}`)
  - Club detail pages (`/clubs/{slug}`)
- **Not indexable:**
  - `/events`
  - `/clubs`
  - `/pricing`

This ensures:
- Early SEO signals for UGC
- No premature catalog exposure
- Zero URL or content debt when beta ends

---

### 5.2 robots.txt Policy

robots.txt MUST:
- Allow crawling of public entity pages
- Disallow listing pages during beta
- Always disallow:
  - `/api/*`
  - `/admin/*`
  - Auth-only or private routes

robots.txt changes are the **primary mechanism** for opening SEO after beta.

---

### 5.3 Meta Robots (Page-Level)

During beta:
- Listing pages MUST declare:
index: false
follow: true

Entity pages MUST NOT declare `noindex` unless explicitly private.

---

### 5.4 Sitemap Policy

Sitemap MUST:
- Include only canonical, indexable URLs
- Exclude listing pages during beta
- Exclude private or restricted entities
- Use slug-based URLs only

Dynamic sitemap generation is REQUIRED once events/clubs exceed trivial counts.

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

| Page | Schema |
|----|--------|
| Event detail | `Event` |
| Club detail | `Organization` |

Rules:
- JSON-LD format only
- One primary schema per page
- Data MUST reflect actual content

---

### 7.2 Deferred Schemas (P2)

| Schema | Status |
|------|--------|
| Place / City | Deferred |
| BreadcrumbList | Deferred |
| WebSite | Optional |
| WebPage | Optional |

Deferred schemas MUST be documented before implementation.

---

## 8. Internal Linking Rules (NORMATIVE)

All entity pages MUST form a crawlable graph.

Required links:
- Event → Club
- Event → City (when city pages exist)
- Club → Events
- Homepage → Events listing (even if noindex)

Rules:
- Links MUST use `<a>` elements (not badges-only)
- Hidden UI MUST NOT remove links from DOM
- `nofollow` allowed only for user-generated outbound links

---

## 9. Deferred Items (Explicit)

The following are intentionally postponed and MUST NOT be partially implemented:

- City landing pages (`/cities/{slug}`)
- Multi-language routing
- SEO A/B experiments
- Advanced schema extensions

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
