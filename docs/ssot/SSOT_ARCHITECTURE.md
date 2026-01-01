# Need4Trip - Architecture (Single Source of Truth)

**Status:** 🟢 Production Ready  
**Last Updated:** 2026-01-01  
**Version:** 4.6  
**This document is the ONLY authoritative source for architectural decisions.**

---

## Change Log (Recent)

> **Full history:** See [Document History](#document-history) at the end of this document.

### v4.6 (2026-01-01) — SSOT-Linter Checklist
- Added § 27: SSOT-Linter Checklist (Mandatory for all PRs)
- Defines content/structural rules for SSOT documents
- Prevents framework-specific code in SSOT
- Requires archiving removed content

### v4.5 (2026-01-01) — Cleanup / Archival / Dedup
- Compressed Change Log (moved full history to Document History table)
- No normative changes

### v4.4 — Explicit vs Implicit Abort Finalization
- Added § 26.4: UI Behavior Rules (Explicit vs Implicit Abort)
- Explicit cancellation → silent return; Implicit interruption → neutral hint
- Updated § 25.10 compliance checklist

### v4.3 — Aborted / Incomplete Actions
- Added § 26: Aborted / Incomplete Actions (Canonical System Behavior)
- Deterministic rules: pending = NO-OP, cancelled ≠ error, payment success ≠ action success
- UI/Backend responsibilities split

---

## 📋 Table of Contents

1. [Purpose & Scope](#purpose--scope)
2. [High-Level Architecture](#high-level-architecture)
3. [Directory Structure](#directory-structure)
4. [Ownership Map](#ownership-map)
5. [Data Access Architecture](#data-access-architecture)
6. [Runtime Boundaries](#runtime-boundaries)
7. [Caching Strategy](#caching-strategy)
8. [Authentication & Authorization](#authentication--authorization)
9. [Events Domain Policies](#events-domain-policies)
10. [Events Listing and Pagination (SSOT)](#events-listing-and-pagination-ssot)
11. [Type Safety Contracts](#type-safety-contracts)
12. [Naming & Project Structure](#naming--project-structure)
13. [Client-Side Data Fetching](#client-side-data-fetching)
14. [Performance Optimizations](#performance-optimizations)
15. [Form State Management & Async Actions](#form-state-management--async-actions)
16. [Error Handling & Validation](#error-handling--validation)
17. [Change Process & Definition of Done](#change-process--definition-of-done)
18. [SSOT Governance and Precedence](#ssot-governance-and-precedence)
19. [SSOT Consistency Checklist](#ssot-consistency-checklist)
20. [API Error Envelope & Client Mapping](#api-error-envelope--client-mapping) ⚡ (v4.0, extended v4.2)
21. [Idempotency & Retry Policy](#idempotency--retry-policy) ⚡ (v4.0)
22. [UI State Model](#ui-state-model) ⚡ (v4.0, expanded v4.1)
    - 22.5 [UI Error Surface Model](#225-ui-error-surface-model) ⚡ NEW (v4.1)
    - 22.6 [Loading Taxonomy](#226-loading-taxonomy) ⚡ NEW (v4.1)
    - 22.7 [Loading Decision Matrix](#227-loading-decision-matrix) ⚡ NEW (v4.1)
    - 22.8 [Retry UX Policy](#228-retry-ux-policy) ⚡ NEW (v4.1)
23. [Failure Modes & Degradation Rules](#failure-modes--degradation-rules) ⚡ (v4.0, updated v4.1)
24. [Observability Minimum](#observability-minimum) ⚡ (v4.0)
25. [Operational Compliance Checklist](#operational-compliance-checklist) ⚡ (v4.0, extended v4.3)
26. [Aborted / Incomplete Actions](#aborted--incomplete-actions) ⚡ NEW (v4.3)
27. [SSOT-Linter Checklist](#ssot-linter-checklist-mandatory-for-all-prs) ⚡ NEW (v4.6)

---

## 1. Purpose & Scope

### What This Document Covers

This document defines **THE ONLY** architectural rules for Need4Trip. Any other document that contains architectural decisions MUST defer to this document or be considered obsolete.

**In scope:**
- Module ownership and boundaries
- Server/Client/Edge runtime constraints
- Data access patterns (Repositories → Services → API Routes)
- Caching policies
- Authentication flows
- Type safety contracts
- Forbidden patterns

**Out of scope:**
- Feature specifications (see `/docs/features/`)
- UI design guidelines (see `/docs/design/`)
- Deployment procedures (see `/docs/guides/`)

**Note:** Key implementation reference paths (e.g., canonical file locations, ownership map entries) are included for operational clarity and enforcement of architecture rules.

### Related SSOT Documents

- **Database Schema:** `/docs/ssot/SSOT_DATABASE.md` - **SSOT** для структуры БД, таблиц, индексов, RLS, billing credits state machine
- **Clubs & Events Access:** `/docs/ssot/SSOT_CLUBS_EVENTS_ACCESS.md` - **SSOT** для RBAC, club roles, event access rules
- **Billing System:** `/docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md` - **SSOT** для биллинга, тарифов, лимитов
- **Design System:** `/docs/ssot/SSOT_DESIGN_SYSTEM.md` - UI компоненты, стили, модалки
- **Testing:** `/docs/ssot/SSOT_TESTING.md` - Тесты, coverage, test execution results
- **API:** `/docs/ssot/SSOT_API.md` - API endpoints, auth, rate limits

**ПРАВИЛО:** Перед изменениями в БД, биллинге или RBAC ВСЕГДА читай соответствующий SSOT. После изменений ВСЕГДА обновляй SSOT.

### Принципы SSOT (Single Source of Truth)

1. **7 SSOT документов:** SSOT_ARCHITECTURE.md, SSOT_DATABASE.md, SSOT_BILLING_SYSTEM_ANALYSIS.md, SSOT_CLUBS_EVENTS_ACCESS.md, SSOT_DESIGN_SYSTEM.md, SSOT_TESTING.md, SSOT_API.md
2. **Обновление:** При изменении кода ВСЕГДА обновляй SSOT в том же коммите
3. **Архивация:** Временные документы (sessions, analysis) → удалять/архивировать
4. **Версионирование:** SSOT имеют версии и даты обновления
5. **Синхронизация:** Memory правила (.cursor) синхронизированы с SSOT файлами
6. **Governance:** See § 18 for SSOT precedence and conflict resolution rules

---

## 2. High-Level Architecture

### Technology Stack

```
Frontend:
├── Next.js 15 (App Router)
├── React 19 (Server Components + Client Components)
├── TypeScript 5.x (strict mode)
├── Tailwind CSS 3.4
└── shadcn/ui (Radix UI primitives)

Backend:
├── Next.js API Routes (Node.js runtime by default)
├── Supabase PostgreSQL 15
├── Row-Level Security (RLS)
└── JWT authentication (HTTP-only cookies)

DevOps:
├── Vercel (serverless deployment)
├── Supabase Cloud
└── GitHub (version control)
```

### Architectural Principles

1. **Server-First:** Server Components by default, Client Components only when necessary
2. **Type Safety:** 100% TypeScript coverage, strict mode, Zod validation
3. **Single Responsibility:** Each module owns ONE concern
4. **Explicit Over Implicit:** Runtime boundaries clearly marked
5. **Fail Fast:** Validation at boundaries, errors thrown early
6. **Documentation as Code:** Architecture rules are executable constraints

### Layered Architecture

```
┌─────────────────────────────────────────┐
│  Presentation Layer (UI Components)     │
│  - React Server Components              │
│  - React Client Components              │
│  - Next.js Pages                        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  API Layer (Route Handlers)             │
│  - Request validation (Zod)             │
│  - Response formatting                  │
│  - Error handling                       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Service Layer (Business Logic)         │
│  - Domain validation                    │
│  - Authorization checks                 │
│  - Event orchestration                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Repository Layer (Data Access)         │
│  - Supabase queries                     │
│  - Data mapping (DB ↔ Domain)           │
│  - Query optimization                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Database (Supabase PostgreSQL)         │
│  - Row-Level Security (RLS)             │
│  - Constraints & Indexes                │
└─────────────────────────────────────────┘
```

**Critical Rules:**
- ❌ **NEVER** call Repository from Presentation Layer directly
- ❌ **NEVER** call Database from API Layer directly
- ✅ **Client Components:** UI → API → Service → Repository → DB
- ✅ **Server Components:** UI → Service → Repository → DB (may skip API layer)
- ✅ **ALWAYS** validate at boundaries (API input for client requests, Service domain rules)

---

## 3. Directory Structure

```
need4trip/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/             # Authenticated pages group
│   │   │   ├── events/        # Events management
│   │   │   ├── clubs/         # Clubs management
│   │   │   ├── profile/       # User profile
│   │   │   └── pricing/       # Pricing page
│   │   ├── (marketing)/       # Public pages group
│   │   │   └── page.tsx       # Landing page
│   │   ├── api/               # API Route Handlers
│   │   │   ├── events/        # Events API
│   │   │   ├── clubs/         # Clubs API
│   │   │   ├── auth/          # Authentication API
│   │   │   └── ...
│   │   └── layout.tsx         # Root layout
│   │
│   ├── components/            # React Components
│   │   ├── ui/               # Base UI (shadcn/ui)
│   │   ├── events/           # Event-specific components
│   │   ├── clubs/            # Club-specific components
│   │   ├── auth/             # Auth components
│   │   └── layout/           # Layout components
│   │
│   ├── lib/                   # Core Business Logic
│   │   ├── auth/             # Authentication utilities
│   │   ├── cache/            # Caching infrastructure
│   │   ├── db/               # Database Repositories & Infrastructure
│   │   │   ├── types.ts      # Database Types (auto-generated from Supabase) ⚡
│   │   │   ├── client.ts     # Supabase client initialization
│   │   │   ├── eventRepo.ts  # Event repository
│   │   │   └── ...           # Other repositories
│   │   ├── services/         # Business Logic Services
│   │   ├── types/            # Domain Types (business logic) 📦
│   │   │   ├── event.ts      # Event domain model
│   │   │   ├── user.ts       # User domain model
│   │   │   ├── billing.ts    # Billing domain model
│   │   │   └── ...           # Other domain types
│   │   ├── utils/            # Utility functions
│   │   └── errors.ts         # Error classes
│   │
│   ├── hooks/                # React Hooks
│   └── middleware.ts         # Next.js middleware
│
├── docs/                     # Documentation
│   ├── ssot/
│   │   └── SSOT_ARCHITECTURE.md  # ← THIS DOCUMENT (SSOT)
│   ├── architecture/         # Supporting architecture docs
│   ├── billing/              # Billing system docs
│   ├── design/               # Design system
│   ├── development/          # Development guides
│   └── guides/               # How-to guides
│
└── supabase/
    └── migrations/           # Database migrations
```

---

## 4. Ownership Map

**This table defines WHO owns WHAT. No exceptions.**

| Topic | Canonical Module | Allowed Imports | Forbidden Patterns | Notes |
|-------|-----------------|-----------------|-------------------|-------|
| **Date/Time Utilities** | `lib/utils/dates.ts` | None (pure) | Multiple date utils | ✅ CONSOLIDATED |
| **Supabase Admin Client** | `lib/db/client.ts` | `@supabase/supabase-js` | Direct `createClient()` calls (use `getAdminDb()` wrapper) | ✅ CENTRALIZED |
| **Event Visibility** | `lib/utils/eventVisibility.ts` | `lib/types/event`, `lib/auth/currentUser` | Inline visibility checks | ✅ CENTRALIZED |
| **Event Permissions** | `lib/utils/eventPermissions.ts` | `lib/types/event`, `lib/types/user` | Duplicate permission logic | ✅ CENTRALIZED |
| **Hydration (Cities)** | `lib/utils/hydration.ts` | `lib/db/cityRepo` | Manual city hydration | Batch loading pattern |
| **Hydration (Currencies)** | `lib/utils/hydration.ts` | `lib/db/currencyRepo` | Manual currency hydration | Batch loading pattern |
| **Hydration (Categories)** | `lib/utils/hydration.ts` | `lib/db/eventCategoryRepo` | Manual category hydration | ✅ CONSOLIDATED |
|| **Hydration (Vehicle Types)** | `lib/utils/hydration.ts` | `lib/db/vehicleTypeRepo` | Manual vehicle type hydration | ✅ CONSOLIDATED |
| **Event Formatters** | `lib/utils/eventFormatters.ts` | `lib/types/event` | Inline price formatting | ✅ EXTRACTED |
| **Event Repository** | `lib/db/eventRepo.ts` | `lib/db/client` | Service-level DB access | Data access only |
| **Event Service** | `lib/services/events.ts` | `lib/db/eventRepo`, `lib/utils/*` | Direct DB access | Business logic only |
| **Event API** | `app/api/events/**/route.ts` | `lib/services/events` | Direct repo access | HTTP layer only |
| **Current User (Server)** | `lib/auth/currentUser.ts` | `lib/auth/jwt`, `lib/db/userRepo` | Multiple auth approaches | **SSOT for server auth** |
| **Current User (Client)** | `components/auth/auth-provider.tsx` | React Context | Server-only functions | Client context only |
| **Caching (Reference Data)** | `lib/cache/staticCache.ts` | None (infrastructure) | Multiple cache patterns | ✅ UNIFIED |
| **Error Handling (Server)** | `lib/errors.ts` | None (base classes) | Untyped errors | AppError, PaywallError, etc. |
| **Error Handling (Client)** | `lib/types/errors.ts` | None | Manual error parsing | ClientError, parseApiResponse() ⚡ |
| **API Responses** | `lib/api/response.ts` | `lib/errors` | Inconsistent responses | respondSuccess(), respondError() |
| **Toast Notifications** | `lib/utils/toastHelpers.ts` | `components/ui/use-toast` | Direct toast calls, **toast for errors** | showSuccess(), showInfo() ONLY — **NEVER for API/domain errors** (see § 22.5) |
| **Billing Enforcement** | `lib/services/accessControl.ts` | `lib/db/*Repo`, `lib/errors` | Frontend limit checks | `enforceEventPublish()` unified ⚡ |
| **Credit Transactions** | `lib/services/creditTransaction.ts` | `lib/db/billingCreditsRepo` | Direct credit consumption | `executeWithCreditTransaction()` wrapper ⚡ |
| **Credit Badge UI** | `components/billing/credit-badge.tsx` | `components/auth/auth-provider` | Manual credit display | Badge reads from AuthContext (0 API calls) ⚡ |
| **Billing Products** | `lib/db/billingProductsRepo.ts` | `lib/db/client` | Hardcoded prices | **SSOT from billing_products table** |
| **Credit Confirmation** | `components/billing/CreditConfirmationModal.tsx` | `lib/types/billing` | Manual 409 handling | Modal + `useCreditConfirmation` hook |
| **Form State Management** | `lib/ui/actionController.ts` | None (infrastructure) | Manual phase management, race conditions | ⚡ Universal async action orchestration (§15) |
| **Idempotency** | `lib/services/withIdempotency.ts` | `lib/db/idempotencyRepo` | Duplicate request handling | Backend wrapper for POST/PUT/DELETE ⚡ |
| **Effective Entitlements** | `lib/services/eventEntitlements.ts` | `lib/db/billingCreditsRepo`, `lib/db/clubSubscriptionRepo` | Hardcoded limits in UI | Canonical limits computation (accounts for consumed credits) ⚡ |

### Critical Dependencies Graph

```
Components (UI)
    ↓
API Routes (HTTP)
    ↓
Services (Business Logic)
    ↓
Repositories (Data Access)
    ↓
Supabase Client
    ↓
PostgreSQL Database
```

**Forbidden reverse dependencies:**
- ❌ Repository importing from Service
- ❌ Service importing from API Route
- ❌ API Route importing from Component
- ❌ Any layer importing from a higher layer

---

## 5. Data Access Architecture

### Pattern: Repository → Service → API Route

**All database access MUST follow this pattern. No exceptions.**

#### Repository Layer (`lib/db/*.ts`)

**Responsibilities:**
- Raw Supabase queries
- Data mapping (DB snake_case ↔ Domain camelCase)
- Query optimization
- Transaction management

**Rules:**
- ✅ MUST use `getAdminDb()` wrapper at start of every function
- ✅ MUST return **domain types** or **listing DTOs** (NOT raw database types). Listing DTOs (e.g., `EventListItem`) are colocated with repo and mapped explicitly.
- ✅ MUST handle database errors (throw `InternalError`)
- ❌ MUST NOT contain business logic
- ❌ MUST NOT perform authorization checks
- ❌ MUST NOT validate business rules

**Example:**

```typescript
// ✅ CORRECT: lib/db/eventRepo.ts
export async function getEventById(id: string): Promise<Event | null> {
  const db = getAdminDb();
  
  const { data, error } = await db
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  
  if (error) throw new InternalError("Failed to get event", error);
  return data ? mapDbEventToDomain(data) : null;
}

// ❌ WRONG: Business logic in repository
export async function getEventById(id: string, userId: string): Promise<Event> {
  const event = await fetchEvent(id);
  if (event.createdByUserId !== userId) {
    throw new UnauthorizedError(); // ❌ Authorization in repo layer
  }
  return event;
}
```

#### Service Layer (`lib/services/*.ts`)

**Responsibilities:**
- Business logic validation
- Authorization checks
- Domain rule enforcement
- Event orchestration (calling multiple repos)
- Data hydration

**Rules:**
- ✅ MUST validate business rules (e.g., max participants)
- ✅ MUST perform authorization (ownership, visibility)
- ✅ MUST coordinate multiple repositories
- ✅ MAY throw domain errors (`ValidationError`, `AuthError`)
- ❌ MUST NOT handle HTTP concerns (status codes, headers)
- ❌ MUST NOT call database directly

**Example:**

```typescript
// ✅ CORRECT: lib/services/events.ts
export async function createEvent(input: unknown, currentUser: CurrentUser | null) {
  if (!currentUser) {
    throw new AuthError("Authentication required");
  }
  
  const validated = eventCreateSchema.parse(input);
  
  // Business logic: check club limits
  if (validated.clubId) {
    await enforceClubAction({
      clubId: validated.clubId,
      action: "CLUB_CREATE_EVENT"
    });
  }
  
  const event = await createEventRecord(validated);
  return event;
}
```

#### API Route Layer (`app/api/**/route.ts`)

**Responsibilities:**
- HTTP request parsing
- Input validation (Zod schemas)
- Calling services
- Response formatting
- Error handling (HTTP status codes)

**Rules:**
- ✅ MUST validate inputs with Zod
- ✅ MUST catch and format errors
- ✅ MUST use `respondJSON()` or `respondError()`
- ✅ MUST handle authentication (JWT verification)
- ❌ MUST NOT contain business logic
- ❌ MUST NOT call repositories directly

**Example:**

```typescript
// ✅ CORRECT: app/api/events/route.ts
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserFromMiddleware(request);
    if (!currentUser) {
      throw new UnauthorizedError("Authentication required");
    }
    
    const payload = await request.json();
    const event = await createEvent(payload, currentUser);
    
    return respondJSON({ event }, undefined, 201);
  } catch (err) {
    return respondError(err);
  }
}
```

### Data Mappers

**All DB ↔ Domain mapping happens in repository files (colocated with repos).**

```typescript
// Database type (snake_case)
interface DbEvent {
  id: string;
  created_by_user_id: string | null;
  date_time: string;
  max_participants: number | null;
}

// Domain type (camelCase)
interface Event {
  id: string;
  createdByUserId: string | null;
  dateTime: string;
  maxParticipants: number | null;
}

// Mapper function
export function mapDbEventToDomain(db: DbEvent): Event {
  return {
    id: db.id,
    createdByUserId: db.created_by_user_id,
    dateTime: db.date_time,
    maxParticipants: db.max_participants,
  };
}
```

**Rules:**
- ✅ MUST be pure functions (no side effects)
- ✅ MUST handle null/undefined consistently
- ✅ MUST map ALL fields (no silent omissions)
- ✅ MUST be colocated with repos: `eventRepo.ts` exports `mapDbEventToDomain`, `mapDbEventToListItem`, etc.
- ⚠️ TODO: Add runtime validation in dev mode

---

## 6. Runtime Boundaries

### Server vs Client Components

**Default: Server Component**

Use Server Components by default. Only use Client Components when you need:
- Browser APIs (localStorage, window)
- Event handlers (onClick, onChange)
- React hooks (useState, useEffect)
- Context providers

**Marking Components:**

```typescript
// ✅ Server Component (default, no marker)
export default function EventList() {
  // Can use async/await
  // Can call Service layer directly (server-only)
  // Cannot use useState/useEffect
}

// ✅ Client Component (explicit marker required)
'use client';
export function EventForm() {
  const [title, setTitle] = useState('');
  // Can use hooks
  // Can use browser APIs
  // Cannot be async
  // Must call API routes for data (NO direct service/repo access)
}
```

### Server-Only Code

**Mark server-only modules explicitly:**

```typescript
// lib/db/client.ts
import 'server-only'; // ✅ Prevents client bundle inclusion

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ❌ Would leak in client
);
```

**Modules that MUST be server-only:**
- `lib/db/*` - Database access
- `lib/auth/jwt.ts` - JWT secrets
- `lib/services/*` - Business logic with secrets
- API route handlers

### Edge vs Node Runtime

**Default: Node.js runtime** (for compatibility with Supabase client)

```typescript
// app/api/events/route.ts
// ✅ Node runtime (default, works with Supabase)
export async function GET(request: Request) {
  const events = await listEvents();
  return Response.json(events);
}

// ❌ Edge runtime (BREAKS Supabase client)
export const runtime = 'edge'; // DON'T USE unless necessary
```

**Edge runtime is FORBIDDEN for:**
- Routes using Supabase client
- Routes using `revalidatePath()` / `revalidateTag()`
- Routes with heavy dependencies

**Edge runtime MAY be used for:**
- Simple redirects
- Lightweight middleware
- Static response generation

### Import Rules for Runtime Safety

```typescript
// ❌ FORBIDDEN: Server-only in client component
'use client';
import { supabaseAdmin } from '@/lib/db/client'; // Will break build

// ✅ CORRECT: Use API route
'use client';
async function loadEvents() {
  const res = await fetch('/api/events');
  return res.json();
}

// ❌ FORBIDDEN: Client hooks in server component
import { useState } from 'react'; // Will break - no 'use client'

// ✅ CORRECT: Pass state via props
export default function ServerParent() {
  return <ClientChild initialData={data} />;
}
```

---

## 7. Caching Strategy

### Reference Data Caching ✅

**RULE: Reference data (cities, currencies, categories, brands, plans) MUST be cached using StaticCache.**

**Implementation: StaticCache class (`lib/cache/staticCache.ts`)**

```typescript
import { StaticCache } from '@/lib/cache/staticCache';

// Define cache with TTL, name, loader, and key extractor
const currenciesCache = new StaticCache<Currency>(
  {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    name: 'currencies',
  },
  async () => {
    // Loader function - called when cache expired
    const { data } = await supabase.from('currencies').select('*').eq('is_active', true);
    return data || [];
  },
  (currency) => currency.code // Key extractor for O(1) lookups
);

// Usage
export async function getActiveCurrencies(): Promise<Currency[]> {
  return currenciesCache.getAll(); // Auto-reloads if expired
}

export async function getCurrencyByCode(code: string): Promise<Currency | null> {
  return currenciesCache.getByKey(code); // O(1) lookup
}
```

**Cached Reference Data (UNIFIED ✅):**

| Data Type | TTL | Repository | Cache Name | Reason |
|-----------|-----|------------|------------|--------|
| **Currencies** | 24h | `currencyRepo.ts` | `currencies` | ~10 records, almost never change |
| **Car Brands** | 24h | `carBrandRepo.ts` | `car_brands` | ~50 records, rarely change |
| **Event Categories** | 1h | `eventCategoryRepo.ts` | `event_categories` | ~10 records, may change |
| **Cities (popular)** | 1h | `cityRepo.ts` | `popular_cities` | Top 30, may change |
| **Club Plans** | 5min | `planRepo.ts` | `club_plans` | 4 records, pricing may update |
| **Vehicle Types** | 1h | `vehicleTypeRepo.ts` | `vehicle_types` | ~5 records, rarely change |

**TTL Strategy:**
- **24 hours**: Static data that almost never changes (currencies, brands)
- **1 hour**: Reference data that may change occasionally (categories, cities)
- **5 minutes**: Dynamic reference data (pricing, plans)

**NOT cached:**
- ❌ Events (change frequently, user-specific visibility)
- ❌ Participants (real-time registration data)
- ❌ Users (privacy, authentication state)
- ❌ Club subscriptions (billing state)

### StaticCache Features

**Production-ready features:**
- ✅ Automatic TTL-based expiration
- ✅ O(1) key lookups via Map
- ✅ Concurrent load prevention (race condition safe)
- ✅ Graceful error handling (keeps old data on reload failure)
- ✅ Built-in structured logging
- ✅ Global cache registry (`clearAllCaches()`)
- ✅ Cache statistics API (`getAllCacheStats()`)

**API:**
```typescript
cache.getAll()              // Get all items (auto-reload if expired)
cache.getByKey(key)         // O(1) lookup by key
cache.getByKeys([keys])     // Batch O(1) lookups
cache.reload()              // Force reload (safe for concurrent calls)
cache.clear()               // Manual invalidation
cache.isValid()             // Check if loaded and not expired
cache.getStats()            // Get cache statistics

clearAllCaches()            // Clear all registered caches
getAllCacheStats()          // Get stats for all caches
```

### Next.js Caching

**Route Segment Config:**

```typescript
// ✅ CORRECT: Dynamic routes (user-specific data)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ✅ CORRECT: Static routes (public reference data)
export const revalidate = 3600; // 1 hour
```

**Rules:**
- API routes with user auth → `dynamic = 'force-dynamic', revalidate = 0`
- API routes with frequently changing data (e.g. events listings) → `dynamic = 'force-dynamic', revalidate = 0` (NO cache)
- API routes with stable public data (e.g. reference tables) → `revalidate = 3600`
- Server Components → Use `cache()` from React
- DO NOT mix caching strategies (StaticCache vs unstable_cache)

### Cache Invalidation

**Manual invalidation API:**

```typescript
// POST /api/admin/cache/clear
// Clears all StaticCache instances
export async function POST(request: Request) {
  StaticCache.clearAll();
  return Response.json({ cleared: true });
}
```

**Automatic invalidation:**
- Reference data: TTL-based (StaticCache)
- User data: Never cached (always fresh)
- Route cache: `revalidatePath()` after mutations

---

## 8. Authentication & Authorization

### Authentication Flow (Telegram OAuth)

```
1. User clicks "Login with Telegram"
   ↓
2. Telegram OAuth flow (external)
   ↓
3. POST /api/auth/telegram
   - Verify signature
   - Create/update user in DB
   - Generate JWT token
   - Set HTTP-only cookie
   ↓
4. JWT stored in cookie (auth_token)
   - HttpOnly: true
   - Secure: true (production)
   - SameSite: 'lax'
   - Max-Age: 30 days
```

### Getting Current User

**THREE different approaches for THREE different contexts:**

#### 1. Server Components & API Routes (without middleware)

```typescript
import { getCurrentUser } from '@/lib/auth/currentUser';

export default async function EventPage() {
  const currentUser = await getCurrentUser();
  // Returns: CurrentUser | null
  // Source: JWT from cookies → DB query
}
```

#### 2. API Routes (with middleware protection)

```typescript
import { getCurrentUserFromMiddleware } from '@/lib/auth/currentUser';

export async function PUT(request: Request) {
  const currentUser = await getCurrentUserFromMiddleware(request);
  // Returns: CurrentUser | null
  // Source: Pre-verified by middleware
}
```

#### 3. Client Components (React Context)

```typescript
'use client';
import { useAuth } from '@/components/auth/auth-provider';

export function UserMenu() {
  const { currentUser } = useAuth();
  // Returns: CurrentUser | null
  // Source: React Context (hydrated from server)
}
```

**RULE: NEVER mix these approaches. Use the correct one for your context.**

### Authorization Patterns

#### Pattern 1: Ownership Check

```typescript
// Service layer
export async function updateEvent(id: string, data: unknown, currentUser: CurrentUser | null) {
  if (!currentUser) {
    throw new AuthError("Authentication required", undefined, 401);
  }
  
  const event = await getEventById(id);
  if (!event) {
    throw new NotFoundError("Event not found");
  }
  
  if (event.createdByUserId !== currentUser.id) {
    throw new AuthError("Insufficient permissions", undefined, 403);
  }
  
  // Proceed with update
}
```

#### Pattern 2: Visibility Check

```typescript
// Service layer
export async function getEventWithVisibility(
  id: string,
  options?: { currentUser?: CurrentUser; enforceVisibility?: boolean }
): Promise<Event> {
  const event = await getEvent(id);
  
  if (options?.enforceVisibility) {
    await enforceEventVisibility(event, options.currentUser ?? null);
  }
  
  return event;
}
```

#### Pattern 3: Role-Based Access (RBAC)

```typescript
// Service layer
export async function exportClubParticipants(clubId: string, currentUser: CurrentUser) {
  const member = await getClubMember(clubId, currentUser.id);
  
  // Canonical roles: owner, admin, member, pending (see SSOT_CLUBS_EVENTS_ACCESS.md §2)
  // Export requires owner or admin role
  if (!member || member.role === 'member' || member.role === 'pending') {
    throw new AuthError("Only club owner or admin can export data", undefined, 403);
  }
  
  // Proceed with export
}
```

### Guest Sessions

**Guests can register for events but cannot create events.**

```typescript
// Guest session ID stored in cookie
// Cookie name: 'guest_session_id'
// Format: UUID v4
// Duration: 60 days

import { ensureGuestSession } from '@/lib/auth/guestSession';

export async function registerGuest() {
  const guestSessionId = ensureGuestSession();
  // Returns: UUID (creates if not exists)
}
```

**Guest permissions:**
- ✅ View public events
- ✅ Register for events
- ✅ Edit own registrations (via guestSessionId)
- ❌ Create events
- ❌ Edit events
- ❌ Delete events

---

## 9. Events Domain Policies

### Event Visibility Rules

**Three visibility levels (enum values FIXED):**

| Level | Listed in Catalog | Direct Link Access | Authentication Required | Notes |
|-------|-------------------|-------------------|------------------------|-------|
| `public` | ✅ Yes | Everyone (anonymous OK) | ❌ No | Default, maximum visibility |
| `unlisted` | ❌ No | Everyone (anonymous OK) | ❌ No | Private link, not in catalog |
| `restricted` | ❌ No | Authenticated users only | ✅ Yes (any logged-in user) | NOT invite-only in current phase |

**Critical Rules:**

1. **Catalog (tab=all, tab=upcoming):** ONLY `public` events
2. **Direct link access:**
   - `public` → anyone can view (anonymous OK)
   - `unlisted` → anyone with link can view (anonymous OK)
   - `restricted` → requires authentication; any logged-in user can view
3. **event_user_access table:**
   - Used for inclusion in tab=my (explicit access)
   - Used for future ACL features (Phase 2+)
   - Does NOT gate view access for restricted events in Phase 1 (any logged-in user can view via direct link)
   - Optional recording on restricted event view adds event to user's tab=my

**Implementation: `lib/utils/eventVisibility.ts` (SSOT)**

```typescript
export async function enforceEventVisibility(
  event: Event,
  currentUser: CurrentUser | null,
  options?: { autoGrantAccessForRestricted?: boolean }
): Promise<void> {
  // 1. Public events: always visible to everyone (including anonymous)
  if (event.visibility === 'public') return;
  
  // 2. Owner always has access (for all visibility levels)
  if (currentUser && event.createdByUserId === currentUser.id) return;
  
  // 3. Unlisted: anyone with direct link can view (including anonymous)
  if (event.visibility === 'unlisted') {
    return; // No authentication required
  }
  
  // 4. Restricted: requires authentication (any logged-in user)
  if (event.visibility === 'restricted') {
    if (!currentUser) {
      throw new UnauthorizedError("Authentication required for restricted events");
    }
    
    // In Phase 1: any authenticated user can view restricted events via direct link
    // Future phases may add explicit ACL checks here
    
    // Optional: record access in event_user_access for tab=my inclusion
    if (options?.autoGrantAccessForRestricted) {
      await upsertEventAccess(event.id, currentUser.id, 'link');
    }
    
    return; // Access granted
  }
}
```

### Event Hydration

**Hydration = Loading related data (city, currency, category, brands)**

**Pattern: Batch loading to avoid N+1 queries**

```typescript
// ❌ BAD: N+1 query problem
const events = await listEvents();
for (const event of events) {
  event.city = await getCityById(event.cityId); // N queries
}

// ✅ GOOD: Batch hydration
const events = await listEvents();
const hydrated = await hydrateCitiesAndCurrencies(events); // 2 queries total
```

**Hydration utilities: `lib/utils/hydration.ts` (CONSOLIDATED ✅)**

```typescript
// Hydrate cities
const eventsWithCities = await hydrateCities(events);

// Hydrate currencies
const eventsWithCurrencies = await hydrateCurrencies(events);

// Hydrate both at once (parallel)
const eventsWithBoth = await hydrateCitiesAndCurrencies(events);

// Hydrate categories (events only)
const eventsWithCategories = await hydrateEventCategories(events);

// Manual batch loading (if needed)
const citiesMap = await hydrateCitiesByIds(['id1', 'id2', 'id3']);
```

**Rule: ALL hydration MUST use batch loading utilities from `hydration.ts`**

**⚠️ NEVER:**
- Load related data in loops
- Make separate queries per item
- Use other hydration utilities (all merged into one)

### Custom Fields Validation

**Custom fields are user-defined registration fields (text, select, etc.)**

**Editing rules (prevent data loss):**

```typescript
// WITHOUT participants: Full freedom
✅ Add fields
✅ Remove fields
✅ Change field types
✅ Edit labels/options

// WITH participants: Protected mode
✅ Add new fields
✅ Edit labels/options/required flag
❌ Remove existing fields (would lose participant data)
❌ Change field types (would break existing data)
```

**Validation: `lib/services/events.ts`**

```typescript
function validateCustomFieldsUpdate(
  newSchema: CustomFieldSchema[],
  existingSchema: CustomFieldSchema[]
): { valid: boolean; error?: string } {
  if (existingSchema.length === 0) {
    return { valid: true }; // No participants yet
  }
  
  // Check all existing fields still present
  for (const existingField of existingSchema) {
    const updatedField = newSchema.find(f => f.id === existingField.id);
    
    if (!updatedField) {
      return {
        valid: false,
        error: `Cannot delete field "${existingField.label}" - used by participants`
      };
    }
    
    if (updatedField.type !== existingField.type) {
      return {
        valid: false,
        error: `Cannot change type of field "${existingField.label}"`
      };
    }
  }
  
  return { valid: true };
}
```

---

## 10. Events Listing and Pagination (SSOT)

### Decision Matrix (LOCKED)

This section defines the ONLY authoritative rules for events listing, pagination, and filtering.

#### Visibility Semantics (enum values fixed: public/unlisted/restricted)

| Visibility | Listed in Catalog (tab=all) | Direct Link Access | Auth Required |
|-----------|---------------------------|-------------------|---------------|
| `public` | ✅ Yes | Everyone (anonymous OK) | ❌ No |
| `unlisted` | ❌ No | Everyone (anonymous OK) | ❌ No |
| `restricted` | ❌ No | Authenticated users only | ✅ Yes (any logged-in user) |

**Critical:** `event_user_access` table is used for tab=my inclusion and future ACL (see § 9 for full visibility rules).

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

#### Default Tab Behavior (UI)

**Default tab (when `?tab` param is missing):** `tab=upcoming`

**Rationale:**
- Most users want to see upcoming events by default
- Reduces cognitive load (one less tab to click)
- `tab=all` includes past events (less relevant for casual browsing)

**UI Tab Order:**
1. **Предстоящие** (`upcoming`) — default, показано первым
2. **Мои события** (`my`) — authenticated users only
3. **Все события** (`all`) — full catalog (past + future)

**URL behavior:**
- `/events` → defaults to `tab=upcoming` (param omitted in URL for cleaner URLs)
- `/events?tab=all` → explicit `tab=all` (past + future events)
- `/events?tab=my` → explicit `tab=my` (requires authentication)

#### Pagination (Server-Side, Offset-Based)

**Parameters:**

| Param | Type | Default | Validation | Notes |
|-------|------|---------|-----------|-------|
| `page` | integer | 1 | >= 1 | 1-based page number |
| `limit` | integer | 12 | 1-50 (clamped) | Results per page |
| `sort` | string | `date` | `date` or `name` | Sort field (date=DESC, name=ASC) |

**Sorting Rules (stable tie-breaker REQUIRED):**

```sql
-- Default: sort=date (descending)
ORDER BY date_time DESC, id DESC

-- sort=name (ascending alphabetical)
ORDER BY title ASC, id ASC

-- participants sort: DEFERRED to Phase 2 (not implemented in Phase 1)
```

**Why stable tie-breaker:** Prevents pagination drift when multiple events have same date_time or title.

**Cursor-based pagination:** Deferred to Phase 2. API response includes `nextCursor: null` (field reserved for future cursor-based pagination).

#### Search (Phase 1 Scope)

**Phase 1:** Search by `title` only (case-insensitive ILIKE)

**Phase 2+:** Extend to description, city, category (not in scope for current SSOT).

#### Repository Contract (CRITICAL)

**Rule:** Repositories MUST NOT return raw DB row types to services/API.

**For listings (GET /api/events):**

Repo MUST return lightweight DTO (`EventListItem` — a repo-owned listing DTO, not a domain type):

```typescript
export interface EventListItem {
  id: string;
  title: string;
  description: string;
  dateTime: string;
  location: string | null;
  maxParticipants: number | null;
  currentParticipantsCount: number;
  priceAmount: number | null;
  priceCurrency: string | null;
  imageUrl: string | null;
  visibility: 'public' | 'unlisted' | 'restricted';
  isPaid: boolean;
  createdByUserId: string | null;
  
  // Hydrated reference data (optional)
  city?: { id: string; name: string; countryCode: string };
  currency?: { code: string; symbol: string };
  category?: { id: string; name: string; icon: string };
}
```

**For details (GET /api/events/:id):**

Repo returns full domain `Event` type (includes all fields).

**Explicit columns required:**

```typescript
// ✅ CORRECT: Explicit SELECT for listings
const EVENT_LIST_COLUMNS = `
  id, title, description, date_time, location,
  max_participants, current_participants_count,
  price_amount, price_currency, image_url, visibility,
  is_paid, created_by_user_id, city_id, category_id
`;

const { data } = await supabase
  .from('events')
  .select(EVENT_LIST_COLUMNS)
  .eq('visibility', 'public')
  .order('date_time', { ascending: false })
  .order('id', { ascending: false })
  .range(offset, offset + limit - 1);

// ❌ FORBIDDEN for listings: select('*')
```

**Note:** `EVENT_LIST_COLUMNS` MUST be defined in `lib/db/eventRepo.ts` as a constant (canonical location for repo-specific column lists).

**For single-item getters (by ID):** `select('*')` is allowed (full row needed, see § 14).

**Mapper location:** Mappers for `EventListItem` and `Event` MUST be exported from `lib/db/eventRepo.ts` (colocated with repo).

#### API Contracts

**GET /api/events**

Request (query params):

```typescript
{
  tab?: 'all' | 'upcoming' | 'my',  // default: 'all'
  page?: number,                    // default: 1
  limit?: number,                   // default: 12, max: 50
  sort?: 'date' | 'name',          // default: 'date'
  search?: string,                  // optional (title only in Phase 1)
  cityId?: string,                  // optional
  categoryId?: string               // optional
}
```

Response (200):

```typescript
{
  events: EventListItem[],
  meta: {
    total: number,           // Total matching events
    page: number,            // Current page (1-based)
    limit: number,           // Items per page
    totalPages: number,      // Math.ceil(total / limit)
    hasMore: boolean,        // page < totalPages
    nextCursor: null         // Reserved for Phase 2 (cursor pagination)
  }
}
```

Response (401) if tab=my without auth:

```typescript
{
  error: {
    code: "UNAUTHORIZED",
    message: "Authentication required for tab=my"
  }
}
```

---

### Future: Statistics & Analytics (Guidance)

**Status:** NOT IMPLEMENTED (removed 2024-12-28)

If statistics/analytics endpoints are needed in the future, follow these principles:

#### When Statistics ARE Needed

Statistics endpoints make sense when:
- ✅ Count query is significantly simpler than full listing query
- ✅ Statistics are displayed BEFORE user applies pagination (e.g., dashboard totals)
- ✅ Multiple aggregations needed (count, sum, avg) that would be expensive to compute client-side
- ✅ Statistics refresh independently from listings (different polling intervals)

Statistics endpoints are NOT needed when:
- ❌ `meta.total` from paginated listing already provides the count
- ❌ Statistics can be computed client-side from loaded data
- ❌ Count query has same complexity as listing query (no performance gain)

#### Recommended Architecture (If Needed)

**1. Use `meta` from paginated endpoints:**

```typescript
// GET /api/events?tab=all&page=1&limit=12
{
  events: EventListItem[],
  meta: {
    total: 42,           // ← Use this for "Total Events" stat
    page: 1,
    limit: 12,
    totalPages: 4,
    hasMore: true
  }
}
```

**Benefits:**
- ✅ Single DB query (with `COUNT(*) OVER()`)
- ✅ Always synchronized with listing
- ✅ No cache invalidation issues
- ✅ Simpler codebase

**2. If separate stats endpoint is required:**

```typescript
// GET /api/events/stats (ONLY if dashboard needs it BEFORE listing loads)
{
  totalEvents: 142,
  upcomingEvents: 89,
  activeParticipants: 2341,
  // ... other aggregations
}
```

**Critical Rules:**
- ✅ **NO in-process cache** (use Redis if caching needed)
- ✅ **TTL < 60s** (stale stats worse than slightly slower query)
- ✅ **Document why** separate endpoint exists (justify in SSOT)
- ✅ **`meta` approach preferred** unless strong justification

**Why NOT in-process cache:**
- ❌ Memory leaks (unbounded growth in serverless)
- ❌ Cache invalidation complexity
- ❌ Inconsistent state across instances (Vercel multi-region)
- ❌ Stale data (60s TTL means stats lag behind listings)

**Alternative: Redis cache (if needed)**
```typescript
// Use Upstash Redis (already used for rate limiting)
const cached = await redis.get(`stats:events:${cacheKey}`);
if (cached) return JSON.parse(cached);

const stats = await computeStats();
await redis.setex(`stats:events:${cacheKey}`, 60, JSON.stringify(stats));
return stats;
```

**Benefits of Redis:**
- ✅ Centralized (consistent across instances)
- ✅ Built-in TTL
- ✅ Can invalidate explicitly
- ✅ Scales independently

#### Historical Context

**Why stats endpoint was removed (2024-12-28):**

1. **Duplication:** `GET /api/events/stats` returned `{ total: N }` which was IDENTICAL to `meta.total` from `GET /api/events`
2. **Double queries:** Every page load made 2 DB queries instead of 1 (same SQL conditions, same result)
3. **Cache overhead:** In-process Map with TTL management, cleanup logic, key normalization — all for a duplicate count
4. **Stale data risk:** Stats cached 60s, listings fresh → potential mismatch in UI
5. **No performance gain:** Count query had identical complexity to listing query (same filters, same indexes)

**Result after removal:**
- ✅ -50% API requests
- ✅ -50% DB queries
- ✅ -100% cache management code
- ✅ Single source of truth (`meta.total`)

**Decision:** Stats endpoint removal was correct. Future stats should use `meta` approach unless dashboard requirements explicitly justify separate endpoint with different aggregations.

---

#### Forbidden Patterns

```typescript
// ❌ FORBIDDEN: Hardcoded tab values in repo
if (tab === 'my') { ... }

```typescript
{
  error: {
    code: "UNAUTHORIZED",
    message: "Authentication required for tab=my"
  }
}
```

#### Caching Matrix (CRITICAL)

**Rule:** Listings are always fresh (no cache). Future statistics endpoints should use Redis if caching is needed.

| Endpoint | Tab | User-Specific | Next.js Cache | Notes |
|----------|-----|--------------|---------------|-------|
| GET /api/events | all, upcoming | ❌ No | dynamic: 'force-dynamic' | Always fresh |
| GET /api/events | my | ✅ Yes | dynamic: 'force-dynamic' | User-specific, always fresh |

**Explanation:**

1. **Listings (GET /api/events):** ALWAYS fresh (NO cache)
   - tab=all/upcoming: `dynamic: 'force-dynamic'` (public data, but frequently changing)
   - tab=my: `dynamic: 'force-dynamic'` (user-specific)
   - Rationale: Events change frequently (new registrations, edits, visibility changes)
   - `meta.total` provided in response for count statistics

2. **Future statistics endpoints:** Use Redis cache (NOT in-process)
   - Centralized caching (Upstash Redis)
   - TTL < 60s recommended
   - Explicit invalidation on mutations
   - See "Future: Statistics & Analytics (Guidance)" section above

**Implementation Details (future stats with Redis cache, if needed):**

See "Future: Statistics & Analytics (Guidance)" section in § 10 for Redis cache patterns.

---
#### Future Migration Notes (Phase 2+)

1. **Cursor-based pagination:** `nextCursor` field already reserved in response. Offset remains current implementation.
2. **Participants sorting:** Deferred due to performance concerns (requires join or materialized view).
3. **Extended search:** Description, city name, category name (requires full-text index or Algolia).
4. **Statistics/Analytics:** If needed, prefer `meta` from paginated endpoints. See "Future: Statistics & Analytics (Guidance)" section above for Redis cache patterns if separate stats endpoint is required.

---

## 11. Type Safety Contracts

### Type System Rules

1. **NO `any` types** (enforced by TypeScript strict mode)
2. **ALL external data validated with Zod**
3. **Domain types separated from DB types**
4. **Mapper functions for all conversions**

### Zod Validation Pattern

```typescript
// Define schema
export const eventCreateSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string(),
  dateTime: z.coerce.date(),
  maxParticipants: z.number().int().positive().nullable(),
});

// Infer TypeScript type
export type EventCreateInput = z.infer<typeof eventCreateSchema>;

// Use in API route
export async function POST(request: Request) {
  const payload = await request.json();
  const validated = eventCreateSchema.parse(payload); // Throws on invalid
  // validated is now EventCreateInput (type-safe)
}
```

### Type Exports

**Centralized type exports: `lib/types/*.ts`**

```typescript
// lib/types/event.ts
export interface Event {
  id: string;
  title: string;
  // ... all domain fields
}

export const eventCreateSchema = z.object({ ... });
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
```

**Import pattern:**

```typescript
// ✅ CORRECT: Import from types
import type { Event, EventCreateInput } from '@/lib/types/event';

// ❌ WRONG: Import from implementation
import type { Event } from '@/lib/db/eventRepo';
```

---

## 12. Naming & Project Structure

### File Naming Conventions

**Rule:** All files MUST use `kebab-case.ts` or `kebab-case.tsx`

✅ **Good:**
```
src/lib/utils/date-formatter.ts
src/components/events/event-card.tsx
src/hooks/use-profile-data.ts
```

❌ **Bad:**
```
src/lib/utils/dateFormatter.ts       // camelCase
src/components/events/EventCard.tsx  // PascalCase
```

**Folders:** `kebab-case` only  
**React components:** `PascalCase` (export name)  
**Hooks:** `useXxx` (camelCase with `use` prefix)  
**Server actions:** `verbNounAction` (e.g. `publishEventAction`)  
**API routes:** RESTful nouns (no verbs in path)

### Domain Language (Single Vocabulary)

**Rule:** One concept = One term across ALL files

- ✅ **event** (NEVER "trip")
- ✅ **publish** = billing check + visibility gate (single meaning)
- ✅ **club**, **plan**, **subscription**, **credit**, **upgrade**
- ✅ **free** = limits profile (NOT a subscription)

### Code Style

**Function naming:**
- React Component: `PascalCase` (e.g. `EventCard()`)
- Hook: `useXxx` (e.g. `useProfileData()`)
- Server Action: `verbNounAction` (e.g. `publishEventAction()`)
- Service: `verbNoun` (e.g. `getEventById()`)
- Repository: `verbTableName` (e.g. `createEvent()`)
- Utility: `verbNoun` (e.g. `formatDate()`)

**Constants:** `SCREAMING_SNAKE_CASE` for true constants  
**Enums:** PascalCase for type, SCREAMING_SNAKE_CASE for values

### Status

✅ **Compliance:** 100% (as of 25 декабря 2024)
- All components migrated to kebab-case
- Domain language consistent
- API routes RESTful

---

## 13. Client-Side Data Fetching

### Core Principles

1. **Server Components First** - Fetch in Server Components whenever possible
2. **Use Canonical Hooks** - All client fetches via `/hooks` (NO manual fetch in components)
3. **No Fetch-on-Render** - NEVER fetch in render logic (causes infinite loops)
4. **Stable Dependencies** - All `useEffect` deps must be primitives or memoized
5. **Single Fetch Per Resource** - Don't fetch same data multiple times

### Available Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useProfileData()` | Profile + cars + brands (parallel) | `{ profileData, carsData, brandsData, loading, error, reload }` |
| `useEventsData(options)` | Events with filters/pagination | `{ events, total, loading, error, reload }` |
| `useClubsData(options)` | Clubs with search/city filter | `{ clubs, total, loading, error, reload }` |
| `useClubData(clubId)` | Single club by ID | `{ club, loading, error, reload }` |

### Standard Hook Pattern

```typescript
export function useXxxData(options?: XxxOptions): XxxReturn {
  const [data, setData] = useState<Xxx | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(url);
        const data = await parseApiResponse<XxxResponse>(res);
        
        if (!mounted) return; // Cleanup
        
        setData(data.xxx);
      } catch (err) {
        if (!mounted) return;
        
        if (err instanceof ClientError) {
          setError(getErrorMessage(err));
          log.error('[useXxxData] Failed', { code: err.code });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => { mounted = false; }; // Cleanup
  }, [/* stable deps only */, reloadTrigger]);

  const reload = () => setReloadTrigger(prev => prev + 1);

  return { data, loading, error, reload };
}
```

**Features:**
- ✅ Type-safe via `parseApiResponse<T>()`
- ✅ Cleanup on unmount (`mounted` flag)
- ✅ Structured logging via `log.*`
- ✅ `reload()` for manual refetch
- ✅ Stable dependencies

### Anti-Patterns to Avoid

❌ **Fetch-on-render:**
```typescript
if (!data) fetch('/api/data').then(setData); // Infinite loop!
```

❌ **Manual res.ok checks:**
```typescript
if (!res.ok) throw new Error('Failed'); // Use parseApiResponse!
```

❌ **No cleanup:**
```typescript
useEffect(() => {
  fetch(...).then(setState); // May set state after unmount!
}, []);
```

✅ **Correct:**
```typescript
const { data, loading, error } = useProfileData();
```

---

## 14. Performance Optimizations

### Query Optimization (Repository Layer)

**Rule:** NO `select *` in production code for listings endpoints

✅ **Good (listing endpoint):**
```typescript
const EVENT_LIST_COLUMNS = "id, title, description, date_time, max_participants, current_participants_count";
const { data } = await db.from('events').select(EVENT_LIST_COLUMNS);
```

❌ **Bad (listing endpoint):**
```typescript
const { data } = await db.from('events').select('*'); // Overfetching
```

**Exception:** Single-item getters (by ID) MAY use `select('*')` when full row is needed (see § 10 for listing contracts).

✅ **OK (single item getter):**
```typescript
export async function getEventById(id: string): Promise<Event | null> {
  const { data } = await db.from('events').select('*').eq('id', id).maybeSingle();
  return data ? mapDbToEvent(data) : null;
}
```

### N+1 Query Prevention

**Rule:** Use batch loading for related data

❌ **Bad (N+1):**
```typescript
for (const membership of memberships) {
  const club = await getClubById(membership.club_id);     // N queries
  const sub = await getClubSubscriptionV2(club.id);       // N queries
}
```

✅ **Good (Batch Loading):**
```typescript
const clubIds = memberships.map(m => m.club_id);
const [clubs, subscriptions] = await Promise.all([
  getClubsByIds(clubIds),              // 1 query
  getClubSubscriptionsByClubIds(clubIds) // 1 query
]);
```

**Performance gain:** 10 clubs: 30 queries → 3 queries (10x faster)

### Completed Optimizations

1. **getUserClubs:** 3*N → 3 queries (batch loading)
2. **select * elimination:** clubRepo, participantRepo (explicit columns)
3. **Batch functions:** 
   - `getClubsByIds(ids)` 
   - `getClubSubscriptionsByClubIds(ids)`
   - `countMembersByClubIds(ids)`

---

## 15. Form State Management & Async Actions

### ActionController Pattern (Canonical)

**Purpose:** Universal mechanism for orchestrating async side-effect actions (create/update/delete) with complex confirmation flows.

**Implementation:** `src/lib/ui/actionController.ts`

**Problem Solved:**
- Race conditions (double-submit, save button clickable during redirect)
- Missing loading states during confirmation flows
- Lack of idempotency for network retries
- Complex state transitions (awaiting confirmation → running → redirecting)

**Phase Model:**

```typescript
type Phase = 
  | "idle"                    // Initial state, ready for action
  | "running"                 // Action executing (first attempt)
  | "awaiting_confirmation"   // Waiting for user confirmation (e.g., credit modal)
  | "running_confirmed"       // Action executing after confirmation
  | "redirecting"             // Success, navigating away
  | "error";                  // Failed
```

**Usage Pattern:**

```typescript
import { useActionController } from "@/lib/ui/actionController";

function MyForm() {
  const controller = useActionController();
  
  const handleSubmit = async (data) => {
    controller.start(); // Phase: idle → running
    
    try {
      const res = await fetch('/api/resource', {
        method: 'POST',
        headers: {
          'Idempotency-Key': controller.correlationId, // ⚡ Idempotency
        },
        body: JSON.stringify(data),
      });
      
      if (res.status === 409) {
        // Credit confirmation required
        controller.awaitConfirmation(); // Phase: running → awaiting_confirmation
        showConfirmModal({
          onConfirm: () => handleConfirmed(data), // User confirmed
        });
        return;
      }
      
      const result = await res.json();
      controller.setRedirecting(); // Phase: running → redirecting
      router.push(`/resource/${result.id}`); // UI stays disabled
    } catch (err) {
      controller.setError(err); // Phase: → error
    }
  };
  
  const handleConfirmed = async (data) => {
    controller.confirm(); // Phase: awaiting_confirmation → running_confirmed
    
    try {
      const res = await fetch('/api/resource?confirm=1', {
        headers: {
          'Idempotency-Key': controller.correlationId, // ⚡ SAME KEY
        },
        body: JSON.stringify(data),
      });
      
      const result = await res.json();
      controller.setRedirecting(); // Phase: running_confirmed → redirecting
      router.push(`/resource/${result.id}`);
    } catch (err) {
      controller.setError(err);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button disabled={controller.isBusy}> {/* Disabled during all phases except idle/error */}
        {controller.phase === "redirecting" ? "Redirecting..." : "Save"}
      </button>
      
      {controller.phase === "awaiting_confirmation" && (
        <ConfirmModal onConfirm={() => handleConfirmed(data)} />
      )}
      
      {controller.phase === "running_confirmed" && (
        <ConfirmModal loading={true} /> {/* Modal stays open with loading */}
      )}
    </form>
  );
}
```

**Key Properties:**

```typescript
controller.phase            // Current phase (see Phase type above)
controller.correlationId    // UUID for this action attempt (for Idempotency-Key)
controller.isBusy          // true if phase ∈ {running, awaiting_confirmation, running_confirmed, redirecting}
controller.error           // Error message if phase === "error"
```

**Rules:**

1. **MUST use `controller.isBusy` to disable form/button** — prevents race conditions
2. **MUST use same `correlationId` for retries** — enables backend idempotency
3. **MUST transition to `redirecting` before navigation** — keeps UI disabled during redirect
4. **Modal MUST stay open during `running_confirmed`** — shows loading state after confirmation

**Backend Integration (Idempotency):**

```typescript
// API route
import { withIdempotency } from "@/lib/services/withIdempotency";

export async function POST(request: Request) {
  return withIdempotency(request, async (req, user) => {
    // Business logic here
    const result = await createResource(data, user);
    return respondSuccess({ result }, undefined, 201);
  });
}
```

**Idempotency Behavior:**
- Same `Idempotency-Key` → replay stored response (no duplicate action)
- Concurrent requests → 409 REQUEST_IN_PROGRESS
- Failed requests → allow retry with same key

**When to Use:**
- ✅ Create/Update/Delete operations with confirmation flows
- ✅ Any async action that requires credit/payment confirmation
- ✅ Export/download operations with long processing
- ❌ Simple GET requests (no side effects)
- ❌ Real-time data fetching (use SWR/TanStack Query instead)

**Migration:** `supabase/migrations/20241231_add_idempotency_keys.sql`

**Related:**
- Idempotency service: `src/lib/services/withIdempotency.ts`
- Idempotency repo: `src/lib/db/idempotencyRepo.ts`
- Session document: `docs/sessions/2024-12-31-event-save-ux-issues/FINAL_SUMMARY.md`

---

## 16. Error Handling & Validation

### Client-Side Errors

**Use `ClientError` class for type-safe error handling:**

```typescript
import { parseApiResponse, ClientError, getErrorMessage } from "@/lib/types/errors";

try {
  const res = await fetch('/api/profile');
  const data = await parseApiResponse<{ user: User }>(res);
  setUser(data.user);
} catch (err) {
  if (err instanceof ClientError) {
    if (err.isPaywallError()) {
      showPaywall(err.details);
    } else {
      setError(getErrorMessage(err));
    }
  }
}
```

**ClientError methods:**
- `isAuthError()` - 401
- `isForbiddenError()` - 403
- `isPaywallError()` - 402
- `isConflictError()` - 409
- `isValidationError()` - 422

### Validation Strategy

**Client-side:** UX-only (early feedback)  
**Server-side:** Authoritative (always enforced)

❌ **NEVER trust client validation alone**

✅ **Always validate on server:**
```typescript
// API route
const parsed = eventCreateSchema.safeParse(body);
if (!parsed.success) {
  throw new ValidationError("Invalid input", parsed.error.errors);
}
```

### Error Taxonomy

| Code | Type | Meaning | Client Action |
|------|------|---------|---------------|
| 401 | Auth | Unauthenticated | Redirect to login |
| 403 | Forbidden | No permission | Show error |
| 402 | Paywall | Upgrade required | Show paywall modal |
| 409 | Conflict | Resource conflict | Show confirmation dialog |
| 422 | Validation | Invalid input | Show field errors |
| 500 | Internal | Server error | Show generic error |

---

## 17. Change Process & Definition of Done

### Making Architectural Changes

**When you need to change architecture:**

1. **Update THIS document first** (docs/ssot/SSOT_ARCHITECTURE.md)
2. **Get review** (if team > 1 person)
3. **Implement changes**
4. **Update related docs** (mark as "See ARCHITECTURE.md")
5. **Add migration notes** (if breaking changes)
6. **Commit with prefix:** `refactor:` or `arch:`

### Migration Policy

**SSOT changes do NOT automatically require full codebase refactor.**

When SSOT is updated:
1. **Assess violations:** Scan codebase for patterns that violate new rules
2. **Triage violations:**
   - **P0 (Critical):** Breaks builds, security risks, data loss → fix immediately
   - **P1 (High):** Performance issues, maintainability debt → fix in sprint
   - **P2 (Low):** Style inconsistencies, minor optimizations → backlog
3. **Incremental migration:** Fix P0/P1, document P2 for future cleanup

**Rule:** SSOT is prescriptive for NEW code. Existing code migrates based on priority.

### Definition of Done for Refactoring

A refactor is DONE when:

- ✅ Code compiles (`npm run build` succeeds)
- ✅ TypeScript passes (`tsc --noEmit` succeeds)
- ✅ ESLint passes (`npm run lint` succeeds)
- ✅ THIS document updated (if architecture changed)
- ✅ No conflicting documentation remains
- ✅ Vercel deployment succeeds
- ✅ All imports updated (no broken references)
- ✅ Tests pass (when tests exist)

### Forbidden Patterns

**These patterns are BANNED. Violations will be caught in code review.**

| Pattern | Why Forbidden | Alternative |
|---------|--------------|-------------|
| Multiple date utils | Causes confusion | Single `lib/utils/dates.ts` |
| ~~`ensureAdminClient()`~~ (legacy) | Code duplication | Use `getAdminDb()` wrapper (see § 5) |
| Inline visibility checks | Duplication, bugs | `lib/utils/eventVisibility.ts` |
| Direct DB access from API routes | Breaks layering | Use service layer |
| Server-only code in client components | Build breaks | Use API routes |
| `any` types | Loses type safety | Use proper types |
| Unvalidated API inputs | Security risk | Zod validation |
| Mixed caching strategies | Inconsistency | Use StaticCache for reference data |
| `select('*')` for listings | Overfetching | Explicit columns (EVENT_LIST_COLUMNS) |

### ESLint Rules (Enforcement)

```javascript
// .eslintrc.js (planned)
module.exports = {
  rules: {
    // Prevent importing server-only in client
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/lib/db/*'],
            message: 'Database access forbidden in client components. Use API routes.',
          },
        ],
      },
    ],
  },
};
```

---

## 18. SSOT Governance and Precedence

**Status:** LOCKED / Canonical

This section defines the authoritative scope of each SSOT document and rules for resolving conflicts.

### 18.1 SSOT Document Scopes

| SSOT Document | Governs | Examples |
|---------------|---------|----------|
| **SSOT_DATABASE.md** | DB invariants, constraints, persistence rules, schema definitions | CHECK constraints, RLS policies, table schemas, billing_credits state machine |
| **SSOT_CLUBS_EVENTS_ACCESS.md** | RBAC, access rules, business permission logic, club roles | Who can publish paid events, role definitions (owner/admin/member/pending), credit consumption rules |
| **SSOT_ARCHITECTURE.md** | Coding patterns, layering, architectural conventions | Repository→Service→API pattern, caching strategy, runtime boundaries |
| **SSOT_BILLING_SYSTEM_ANALYSIS.md** | Billing products, pricing, paywall rules, subscription logic | Plan limits, PaywallError structure, enforcement functions |
| **SSOT_DESIGN_SYSTEM.md** | UI/UX patterns, component design, styling rules | Modal anatomy, color system, typography |
| **SSOT_TESTING.md** | Test coverage, test execution, QA requirements | Test case inventory, integration test patterns |
| **SSOT_API.md** | API contracts, endpoint behavior, rate limits | Request/response formats, authentication headers |

### 18.2 Conflict Resolution Rules

1. **Conflicts MUST be resolved by editing SSOT docs until consistent**
   - Do NOT "interpret around" conflicts
   - Do NOT implement code that contradicts any SSOT
   - If contradiction exists, STOP and fix SSOT documents first

2. **Scope-based precedence**
   - For DB constraint questions: SSOT_DATABASE.md is authoritative
   - For access control questions: SSOT_CLUBS_EVENTS_ACCESS.md is authoritative
   - For coding pattern questions: SSOT_ARCHITECTURE.md is authoritative

3. **Cross-reference, don't duplicate**
   - When one SSOT needs to reference another's rules, use explicit cross-references
   - Example: "See SSOT_DATABASE.md §8.1 for billing_credits state machine"
   - Do NOT copy-paste rules between SSOTs (leads to drift)

4. **New rules placement**
   - Any new rule MUST be added to the correct SSOT based on scope (see table above)
   - Cross-reference from other SSOTs if they need to be aware of the rule
   - Example: Credit consumption timing is defined in both SSOT_DATABASE.md (invariants) and SSOT_CLUBS_EVENTS_ACCESS.md (access rules) but uses identical canonical text

### 18.3 Amendment Process

1. Identify which SSOT governs the topic
2. Make changes to the correct SSOT
3. Update cross-references in other SSOTs if needed
4. Update version and Change Log in all modified SSOTs
5. Commit all SSOT changes together with code changes

---

## 19. SSOT Consistency Checklist

**Purpose:** Compact checklist for reviewers to verify SSOT alignment before merge.

### Billing Credits Invariants
- [ ] `chk_billing_credits_consumed_state` constraint documented in SSOT_DATABASE.md §8.1
- [ ] Status values limited to: `available`, `consumed`
- [ ] `available` → `consumed_event_id IS NULL AND consumed_at IS NULL`
- [ ] `consumed` → `consumed_event_id IS NOT NULL AND consumed_at IS NOT NULL`

### Consumption Timing (v5+ — No Separate Publish Step)
- [ ] Credits consumed at save-time (POST/PUT), not at separate publish step
- [ ] Credits require persisted eventId at consumption time
- [ ] `confirm_credit` parameter meaningful only for personal events at save-time

### Club vs Personal Rules
- [ ] Club events (club_id ≠ NULL) NEVER consume personal credits
- [ ] Personal credits ONLY for personal events (club_id = NULL)
- [ ] Free limits do not trigger credit consumption

### Role Terminology
- [ ] No deprecated roles in examples (e.g., no "organizer")
- [ ] Canonical roles: owner, admin, member, pending
- [ ] `pending` role has NO elevated permissions

### SSOT Governance
- [ ] Governance section present in SSOT_ARCHITECTURE.md §18
- [ ] Each SSOT has clear scope definition
- [ ] Cross-references use explicit section numbers
- [ ] No duplicated rules across SSOTs (only cross-references)

### Document Hygiene
- [ ] Change Log present at top of each SSOT file
- [ ] Version and date updated
- [ ] Related SSOT paths use correct `/docs/ssot/SSOT_*.md` format

---

## 20. API Error Envelope & Client Mapping

**Status:** CANONICAL (v4.2)

This section defines the ONLY authoritative rules for API error handling across the entire application.

### 20.1 Error Response Format (Server → Client)

**ALL API routes MUST use `respondError()` from `lib/api/response.ts`:**

```typescript
// ✅ CANONICAL: lib/api/response.ts
export function respondError(
  error: AppError | Error | unknown,
  fallbackMessage: string = "Internal Server Error"
): NextResponse<ApiErrorResponse>
```

**Response Shape:**

```typescript
{
  success: false,
  error: {
    code: string,       // Machine-readable error code (e.g., "PAYWALL", "UNAUTHORIZED")
    message: string,    // Human-readable message
    details?: unknown   // Additional context (PaywallError options, validation errors)
  }
}
```

### 20.2 Error Taxonomy (LOCKED)

| HTTP Status | Error Class | `code` Value | Client Action |
|-------------|------------|--------------|---------------|
| 401 | `UnauthorizedError` | `UNAUTHORIZED` | Redirect to login or show auth modal |
| 402 | `PaywallError` | `PAYWALL` | Show `PaywallModal` with `details` |
| 403 | `ForbiddenError` | `FORBIDDEN` | Show error message, no retry |
| 404 | `NotFoundError` | `NotFound` | Show 404 page or message |
| 409 | `ConflictError` | `Conflict` | Show conflict message |
| 409 | Special | `CREDIT_CONFIRMATION_REQUIRED` | Show `CreditConfirmationModal` |
| 422 | `ValidationError` | `ValidationError` | Show field-level errors |
| 429 | (middleware) | `RateLimited` | Show "too many requests" |
| 500 | `InternalError` | `InternalError` | Show generic error, allow retry |

### 20.3 Canonical Server-Side Error Classes

**Location:** `lib/errors.ts` (SSOT)

```typescript
// Base error
class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;
}

// Specific errors
class ValidationError extends AppError { statusCode: 400 }
class UnauthorizedError extends AppError { statusCode: 401 }
class PaywallError extends AppError { statusCode: 402 }
class ForbiddenError extends AppError { statusCode: 403 }
class NotFoundError extends AppError { statusCode: 404 }
class ConflictError extends AppError { statusCode: 409 }
class InternalError extends AppError { statusCode: 500 }
```

**PaywallError Special Structure:**

```typescript
class PaywallError extends AppError {
  reason: string;           // "MAX_EVENT_PARTICIPANTS_EXCEEDED", etc.
  currentPlanId?: string;
  requiredPlanId?: string;
  meta?: Record<string, unknown>;  // { requested: 100, limit: 50 }
  options?: Array<{ type: "ONE_OFF_CREDIT" | "CLUB_ACCESS"; ... }>;
  cta?: { type: "OPEN_PRICING"; href: "/pricing" };
}
```

### 20.4 Client-Side Error Handling

**Location:** `lib/types/errors.ts` (SSOT)

```typescript
// Parse API response and throw ClientError on failure
const data = await parseApiResponse<T>(res);

// ClientError has typed status checks
if (err instanceof ClientError) {
  if (err.isPaywallError()) showPaywall(err.details);
  if (err.isConflictError()) handleConflict(err.details);
  if (err.isAuthError()) redirectToLogin();
}
```

**ClientError Methods:**

| Method | Status | Use Case |
|--------|--------|----------|
| `isAuthError()` | 401 | Trigger auth modal or redirect |
| `isPaywallError()` | 402 | Show `PaywallModal` |
| `isForbiddenError()` | 403 | Show "access denied" |
| `isConflictError()` | 409 | Handle conflicts (credit confirmation, duplicates) |
| `isValidationError()` | 422 | Show field errors |

### 20.5 409 Special Cases

**CREDIT_CONFIRMATION_REQUIRED (Personal Paid Events):**

```typescript
// Server returns 409 with meta
{
  success: false,
  error: {
    code: "CREDIT_CONFIRMATION_REQUIRED",
    message: "Credit consumption requires confirmation",
    details: {
      meta: {
        creditCode: "EVENT_UPGRADE_500",
        eventId: "uuid",
        requestedParticipants: 100
      }
    }
  }
}

// Client handles:
if (res.status === 409) {
  const error = await res.json();
  const meta = error.error?.details?.meta;
  if (meta?.creditCode) {
    controller.awaitConfirmation({ ...meta, payload });
    // Show CreditConfirmationModal
  }
}
```

### 20.6 Forbidden Patterns

| Pattern | Problem | Use Instead |
|---------|---------|-------------|
| `res.json({ error: "..." })` | Non-standard format | `respondError(new AppError(...))` |
| Manual status check `if (!res.ok)` | Duplicated logic | `parseApiResponse()` |
| `throw new Error("message")` | No status code | `throw new AppError(...)` with code |
| Direct `fetch` error handling | Inconsistent | Use canonical hooks with `ClientError` |

### 20.7 System Errors & Low-Level Failures (DB / Infra / Internal)

**Status:** CANONICAL (v4.2)

This subsection explicitly defines how system-level errors (database failures, infrastructure errors, unexpected exceptions) MUST be handled.

#### 20.7.1 Core Principle

> **Low-level errors (DB constraint violations, driver errors, internal exceptions) MUST NOT be exposed to the user verbatim.**

Frontend behavior is determined ONLY by the **mapped error class** (`status` + `code`), NOT by raw error message text, SQLSTATE codes, or vendor-specific error strings.

#### 20.7.2 Frontend Behavior Rules (LOCKED)

| Rule | Description |
|------|-------------|
| **500 → GENERIC_INTERNAL_ERROR** | Any 500 Internal Server Error MUST be treated as `GENERIC_INTERNAL_ERROR` intent (see § 22.5). No differentiation by message content. |
| **Ignore `error.details` for 500** | `error.details` field MUST be ignored by UI for 500 errors. Only whitelisted statuses (402, 409, 422) may use `details` for UI branching. |
| **No technical strings in UI** | UI MUST NOT display any text containing: `constraint`, `database`, `SQL`, `SQLSTATE`, `index`, `foreign key`, `duplicate key`, `internal error code`. |
| **Intent-based display only** | Error copy shown to user MUST come from Canonical Error Message Intents table (SSOT_DESIGN_SYSTEM.md § Error States), not from backend message. |

#### 20.7.3 Backend Mapping Responsibility (SSOT Requirement)

**Purpose:** This block documents expected backend behavior. Frontend behavior remains stable even if backend does not comply.

| Low-Level Error Type | Expected Backend Mapping | HTTP Status | Error Code |
|---------------------|--------------------------|-------------|------------|
| Unique constraint violation | `ValidationError` | 422 | `ValidationError` |
| Foreign key constraint violation | `ValidationError` or `NotFoundError` | 422 or 404 | `ValidationError` / `NotFound` |
| Check constraint violation | `ValidationError` | 422 | `ValidationError` |
| State/concurrent modification conflict | `ConflictError` | 409 | `Conflict` |
| Deadlock / lock timeout | `InternalError` (retry-able) | 500 | `InternalError` |
| DB connection failure | `InternalError` | 500 | `InternalError` |
| Unmapped / unexpected exception | `InternalError` | 500 | `InternalError` |

**CRITICAL:** If backend returns raw DB error without mapping, frontend MUST still treat it as 500 `InternalError` → `GENERIC_INTERNAL_ERROR` intent. No special handling.

#### 20.7.4 Observability vs. UI Boundary

| Layer | Allowed to access raw error | Purpose |
|-------|----------------------------|---------|
| Backend logging (structured) | ✅ YES | Debug, alerts, incident response |
| Error tracking (Sentry) | ✅ YES | Stack traces, error grouping |
| Frontend console (dev only) | ✅ YES | Development debugging |
| User-facing UI | ❌ **NEVER** | Users see only intent-based copy |

**Implementation:** `respondError()` in `lib/api/response.ts` SHOULD log full error details internally before returning sanitized response.

#### 20.7.5 Example: Constraint Violation Flow

```
1. User submits duplicate email
2. DB throws: "duplicate key value violates unique constraint 'users_email_key'"
3. Backend catches, maps to: ValidationError(422, "Email already exists", { field: "email" })
4. Frontend receives 422 → shows FormFieldError "Такое значение уже существует"
5. User never sees "duplicate key", "constraint", or "users_email_key"
```

```
1. User submits form
2. DB throws unexpected error: "could not serialize access due to concurrent update"
3. Backend fails to map (or intentionally returns 500)
4. Frontend receives 500 → shows GENERIC_INTERNAL_ERROR: "Ошибка сервера. Попробуйте позже."
5. User never sees serialization error details
```

---

## 21. Idempotency & Retry Policy

**Status:** CANONICAL (v4.0)

This section defines idempotency rules for write operations to prevent duplicate actions.

### 21.1 When Idempotency is Required

| Operation Type | Idempotency Required | Reason |
|----------------|---------------------|--------|
| Create event | ✅ YES | Prevents duplicate events |
| Update event | ✅ YES | Prevents conflicting updates |
| Register participant | ✅ YES | Prevents double registration |
| Purchase credit | ✅ YES | Prevents double charge |
| Delete resource | ✅ YES | Safe retries on network failures |
| GET requests | ❌ NO | Naturally idempotent |
| List requests | ❌ NO | Read-only |

### 21.2 Client-Side Implementation

**Location:** `lib/ui/actionController.ts` (SSOT)

```typescript
const controller = useActionController();

await controller.start("create_event", async () => {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': controller.correlationId, // ⚡ CRITICAL
    },
    body: JSON.stringify(payload),
  });
  // ...
});
```

**Rules:**

1. **MUST use same `correlationId` for retries** — enables backend idempotency
2. **`correlationId` is generated per action attempt** — new ID only on fresh action
3. **Confirmation retries MUST reuse same key** — `confirm_credit=1` uses original key

### 21.3 Server-Side Implementation

**Location:** `lib/services/withIdempotency.ts` (SSOT)

```typescript
import { withIdempotency, extractIdempotencyKey, isValidIdempotencyKey } from '@/lib/services/withIdempotency';

export async function POST(request: Request) {
  const idempotencyKey = extractIdempotencyKey(request);
  
  if (idempotencyKey && isValidIdempotencyKey(idempotencyKey)) {
    return await withIdempotency(
      { userId: currentUser.id, route: 'POST /api/events', key: idempotencyKey },
      async () => {
        // Business logic here
        return respondSuccess({ event }, undefined, 201);
      }
    );
  }
  
  // Fallback: execute without idempotency (backwards compat)
  return await createEventLogic();
}
```

**Database Table:** `idempotency_keys` (see SSOT_DATABASE.md)

### 21.4 Idempotency Key Format

```
Idempotency-Key: <UUID v4>
Example: Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

**Validation:** UUIDv4 format (36 chars, 8-4-4-4-12 hex pattern)

### 21.5 Idempotency Behavior Matrix

| Scenario | Server Response | Client Action |
|----------|-----------------|---------------|
| First request | Execute → store response | Proceed |
| Duplicate (completed) | Return stored response | Proceed (same result) |
| Duplicate (in-progress) | 409 REQUEST_IN_PROGRESS | Wait + retry |
| Duplicate (failed) | Allow retry | Retry with same key |
| Key expired (24h TTL) | Treat as new request | Execute fresh |

### 21.6 Retry Policy

**Client Retry Rules:**

| Error Type | Retry | Delay | Max Attempts |
|------------|-------|-------|--------------|
| Network error | ✅ YES | Exponential (1s, 2s, 4s) | 3 |
| 500 Internal | ✅ YES | Exponential | 3 |
| 429 Rate Limited | ✅ YES | Use `Retry-After` header | 3 |
| 409 In Progress | ✅ YES | 1s delay | 5 |
| 4xx Client Error | ❌ NO | N/A | N/A |

**Implementation:** Retry logic is NOT built into ActionController. Use manual retry or wrapper if needed.

---

## 22. UI State Model

**Status:** CANONICAL (v4.0)

This section defines canonical UI states and Next.js boundary usage.

### 22.1 Canonical UI States

Every data-driven UI MUST handle these states:

| State | Trigger | UI |
|-------|---------|-----|
| `loading` | Initial fetch or refetch | Skeleton or Spinner |
| `error` | API error (4xx, 5xx, network) | Error message + retry button |
| `empty` | Success with empty data | Empty state illustration |
| `success` | Success with data | Render data |

### 22.2 Next.js Boundary Files

**Available Boundaries:**

| File | Purpose | Scope |
|------|---------|-------|
| `error.tsx` | Error boundary for segment | Catches render/fetch errors |
| `loading.tsx` | Loading state for segment | Shows during async operations |
| `not-found.tsx` | 404 page | `notFound()` calls |

**Current State (Need4Trip):**

| Boundary | Global | Segment-Level |
|----------|--------|---------------|
| `error.tsx` | ✅ `app/error.tsx` | ❌ Not used |
| `loading.tsx` | ❌ **MISSING** | ❌ Not used |
| `not-found.tsx` | ✅ `app/not-found.tsx` | ❌ Not used |

**Recommendation:** Add global `app/loading.tsx` with branded spinner.

### 22.3 Skeleton Components (SSOT)

**Location:** `components/ui/skeletons/` (SSOT)

```typescript
// Available skeletons
import {
  EventCardSkeleton,
  EventCardSkeletonGrid,
  ClubCardSkeleton,
  ClubCardSkeletonGrid,
  ProfileSkeleton,
  TableSkeleton,
  FormSkeleton,
} from "@/components/ui/skeletons";
```

**Usage Pattern:**

```tsx
function EventsPage() {
  const { events, loading, error } = useEventsQuery(params);
  
  if (loading) return <EventCardSkeletonGrid count={12} />;
  if (error) return <ErrorMessage message={error} />;
  if (events.length === 0) return <EmptyState type="events" />;
  
  return <EventsGrid events={events} />;
}
```

### 22.4 ActionController Phases (Forms)

**For form submissions, use ActionController phases:**

```typescript
controller.phase === 'idle'                  // Ready
controller.phase === 'running'               // Submitting
controller.phase === 'awaiting_confirmation' // Modal open
controller.phase === 'running_confirmed'     // Modal + loading
controller.phase === 'redirecting'           // Success, navigating
controller.phase === 'error'                 // Failed
```

### 22.5 UI Error Surface Model

**Status:** CANONICAL (v4.1)

This subsection defines the ONLY canonical mapping from error types (§ 20.2) to UI surfaces. 

**Reference:** Visual patterns and copy intents → SSOT_DESIGN_SYSTEM.md § Error States & Messaging

#### 22.5.1 Error Surface Taxonomy

| Surface | Description | When to Use | Layout Slot |
|---------|-------------|-------------|-------------|
| **PageErrorState** | Full content-area error inside existing layout shell | Page-level fetch fails, route access denied | Main content area (inside layout wrapper) |
| **SectionErrorState** | Error within a Card/section, siblings remain functional | Independent section fails (e.g., stats card fails, list loads) | Inside Card/section container |
| **InlineErrorBanner** | Non-blocking banner above or within content | Warnings, rate limit notices, degraded functionality | Above affected content, within flow |
| **FormFieldError** | Field-level validation error | Client or server validation fails for specific field | Beneath input field |
| **FormSummaryError** | Aggregated validation errors or general form error | Multiple field errors, or form-level server error | Top of form, before first field |
| **BlockingModalError** | Error inside existing modal (not separate modal) | Modal action fails, needs user decision before close | Inside modal body, above actions |

**CRITICAL RULE:** Errors MUST render INSIDE existing layout. No "panic" full-page blank error screens. Even `app/error.tsx` MUST render the layout wrapper and show PageErrorState within content area.

#### 22.5.2 Error Taxonomy → UI Surface Mapping (LOCKED)

| HTTP Status | Error Code (§ 20.2) | UI Surface | UI Component | Retry Allowed | Notes |
|-------------|---------------------|------------|--------------|---------------|-------|
| 401 | `UNAUTHORIZED` | Special: Auth modal or redirect | `AuthModal` / `router.push('/login')` | N/A | Session-level, not error surface |
| 402 | `PAYWALL` | Special: Dedicated modal | `PaywallModal` | N/A | Shows upgrade options |
| 403 | `FORBIDDEN` | PageErrorState or SectionErrorState | `PageErrorState`/`SectionErrorState` | ❌ No | No retry—access won't change |
| 404 | `NotFound` | PageErrorState | `PageErrorState` or Next.js `not-found.tsx` | ❌ No | Use "Go back" action |
| 409 | `CREDIT_CONFIRMATION_REQUIRED` | Special: Dedicated modal | `CreditConfirmationModal` | N/A | User confirms to proceed |
| 409 | `Conflict` / `REQUEST_IN_PROGRESS` | SectionErrorState or InlineErrorBanner | `InlineErrorBanner` | ✅ Yes (wait) | Retry after short delay |
| 422 | `ValidationError` | FormFieldError + FormSummaryError | Field errors + summary | ❌ No (fix input) | User must correct input |
| 429 | `RateLimited` | InlineErrorBanner | `InlineErrorBanner` | ✅ Yes (wait) | Show `Retry-After` if available |
| 500 | `InternalError` | PageErrorState or SectionErrorState | `PageErrorState`/`SectionErrorState` | ✅ Yes | Manual retry button |
| Network | (no code) | PageErrorState or SectionErrorState | `PageErrorState`/`SectionErrorState` | ✅ Yes | Manual retry button |
| Timeout | (no code) | PageErrorState or SectionErrorState | `PageErrorState`/`SectionErrorState` | ✅ Yes | Manual retry button |

#### 22.5.3 Toast Usage Policy (CRITICAL)

| Scenario | Toast Allowed | Correct Approach |
|----------|---------------|------------------|
| **Success feedback** | ✅ YES | `showSuccess("Событие создано")` |
| **Info notification** | ✅ YES | `showInfo("Данные обновлены в фоне")` |
| **API error (4xx, 5xx)** | ❌ **NEVER** | Use PageErrorState / SectionErrorState / FormFieldError |
| **Validation error** | ❌ **NEVER** | Use FormFieldError + FormSummaryError |
| **Network error** | ❌ **NEVER** | Use PageErrorState / SectionErrorState |
| **Paywall/Credit errors** | ❌ **NEVER** | Use PaywallModal / CreditConfirmationModal |

**Rationale:** Toast disappears after 3-5 seconds. Error context is lost. User cannot retry from toast. Errors require persistent UI until resolved.

#### 22.5.4 Decision Flow for Error Surface Selection

```
Error occurs
    │
    ├─ Is 401? → Show AuthModal or redirect to /login
    │
    ├─ Is 402 PAYWALL? → Show PaywallModal
    │
    ├─ Is 409 CREDIT_CONFIRMATION_REQUIRED? → Show CreditConfirmationModal
    │
    ├─ Is form validation (422)? → FormFieldError + FormSummaryError
    │
    ├─ Is section-scoped? (only one card/section affected)
    │       → SectionErrorState inside that section
    │
    └─ Is page-scoped? (whole page content failed)
            → PageErrorState inside layout wrapper
```

---

### 22.6 Loading Taxonomy

**Status:** CANONICAL (v4.1)

This subsection enumerates ALL loading scenarios in Need4Trip with canonical UI treatment.

#### 22.6.1 Loading Variant Definitions

| Variant | Description | User Experience | Data Visibility |
|---------|-------------|-----------------|-----------------|
| **Initial Load** | First fetch, no data yet | Blocking — user waits | No data shown |
| **Background Refetch** | Data shown, refresh in background | Non-blocking — stale data visible | Stale data visible |
| **Pagination / Incremental** | Loading more items in list | Partial blocking — existing items visible | Partial data visible |
| **Navigation Transition** | Route change in progress | Blocking — previous page visible briefly | Previous route visible |
| **Mutation Submit** | Form/action submit in progress | Blocking — form disabled | Form data visible (frozen) |
| **Optimistic Update** | UI updated before server confirms | Non-blocking — optimistic state shown | Optimistic data visible |
| **Idempotency Wait (409)** | Server processing duplicate request | Blocking — wait for response | Form data visible (frozen) |
| **Awaiting Confirmation** | ActionController waiting for user modal input | Semi-blocking — modal open | Form data visible |

#### 22.6.2 Canonical Loading Indicators

| Indicator | Component | Use Case | Blocking? |
|-----------|-----------|----------|-----------|
| **Skeleton** | `*Skeleton` components | Initial load, no data yet | Yes |
| **LoadingBar** | `LoadingBar` | Background refetch (SWR) | No |
| **Spinner in Button** | `<Spinner size="sm" />` inside Button | Mutation submit | Yes (button) |
| **Inline Spinner** | `<Spinner />` at end of list | Pagination append | No |
| **Disabled CTA** | `disabled={true}` on Button | Any busy state | Yes (CTA) |
| **Progress Indicator** | Progress bar with % | File upload | Partial |

---

### 22.7 Loading Decision Matrix

**Status:** CANONICAL (v4.1)

**Rule:** Each scenario has exactly ONE canonical loading treatment. No alternatives.

#### 22.7.1 Scenario → UI Instrument Mapping

| Scenario | UI Instrument | Location | Blocking | Reference |
|----------|---------------|----------|----------|-----------|
| **Page initial load** | Skeleton layout (NEVER spinner-only blank) | Main content area | Yes | SSOT_DESIGN_SYSTEM.md § Loading Patterns |
| **List initial load** | Skeleton grid (e.g., `EventCardSkeletonGrid`) | List container | Yes | § 22.3 |
| **Background refetch** | LoadingBar (2-3px) | Top of container (inside Card/section) | No | SSOT_DESIGN_SYSTEM.md § LoadingBar |
| **List pagination** | Skeleton row(s) appended at bottom | After last visible item | No | Append skeletons, not spinner |
| **Button submit** | Spinner in button + `disabled` | Inside button | Yes (button) | § 22.4 |
| **Form submit (full)** | Button spinner + form `disabled` | Button + all fields | Yes (form) | § 15 ActionController |
| **Route navigation** | `app/loading.tsx` branded loader | Full page | Yes | § 22.2 |
| **Modal action** | Spinner in modal footer button | Modal footer | Yes (modal) | SSOT_DESIGN_SYSTEM.md § Modals |
| **Optimistic update** | No loading indicator (instant UI update) | Affected element | No | Rollback on error |
| **Idempotency 409 wait** | Same as submit (spinner + disabled) | Button that initiated | Yes | § 21.5 |
| **Awaiting confirmation** | Modal open, no spinner until confirmed | Modal visible | Semi (modal) | § 15 ActionController |

#### 22.7.2 Forbidden Loading Patterns

| Pattern | Problem | Correct Approach |
|---------|---------|------------------|
| Full-page spinner without skeleton | Bad UX, no layout hint | Use page skeleton with layout preserved |
| Spinner alone for list load | No visual structure | Use skeleton grid |
| LoadingBar for initial load | Stale data doesn't exist | Use skeleton |
| Toast for "loading..." | Distracting, provides no context | Use skeleton/spinner in place |
| Multiple loading indicators for same data | Confusing, flashing | One indicator per loading scope |
| Skeleton during background refetch | Flashing, loses scroll position | Use LoadingBar |

---

### 22.8 Retry UX Policy

**Status:** CANONICAL (v4.1)

**Reference:** Retry timing from § 21.6

#### 22.8.1 Retry Rules

| Retry Type | When Used | User Action | Implementation |
|------------|-----------|-------------|----------------|
| **Manual Retry** | Default for all errors | User clicks "Повторить" button | `onRetry` callback in ErrorState component |
| **Automatic Retry** | ONLY for 409 `REQUEST_IN_PROGRESS` | None (system waits) | 1s delay, max 5 attempts |
| **No Retry** | 401, 403, 404, 422 | User navigates away or fixes input | No retry button shown |

#### 22.8.2 Retry Button Placement

| Error Surface | Retry Button Location | Button Text (RU) |
|---------------|----------------------|------------------|
| PageErrorState | Center of error content | "Попробовать снова" |
| SectionErrorState | Bottom-right of section | "Повторить" |
| InlineErrorBanner | Right side of banner (inline) | "Повторить" |
| FormSummaryError | None (user corrects input) | N/A |

#### 22.8.3 Retry Timing (from § 21.6)

| Error Type | Auto Retry | Delay | Max Attempts |
|------------|------------|-------|--------------|
| Network error | ❌ Manual | N/A | User decides |
| 500 Internal | ❌ Manual | N/A | User decides |
| 429 Rate Limited | ❌ Manual | Show `Retry-After` | User waits |
| 409 In Progress | ✅ Auto | 1s exponential | 5 |
| 4xx Client Error | ❌ None | N/A | N/A |

**Note:** Automatic retry is NOT implemented in ActionController (v4.0). Retry is always manual except for the 409 in-progress idempotency case where the backend wrapper handles it.

---

## 23. Failure Modes & Degradation Rules

**Status:** CANONICAL (v4.0, updated v4.1)

This section defines graceful degradation strategies for failures.

### 23.1 Failure Classification

| Failure Type | Severity | User Impact | Strategy |
|--------------|----------|-------------|----------|
| Network error | Medium | Cannot load/save | PageErrorState/SectionErrorState inside layout + manual retry |
| 401 Unauthorized | Low | Session expired | Auth modal or redirect |
| 402 Paywall | Low | Feature gated | Show PaywallModal |
| 403 Forbidden | Low | Permission denied | PageErrorState inside layout, no retry |
| 404 Not Found | Low | Resource missing | PageErrorState inside layout (or `not-found.tsx`), no retry |
| 429 Rate Limited | Medium | Throttled | InlineErrorBanner + wait message + `Retry-After` |
| 500 Server Error | High | System failure | PageErrorState inside layout + manual retry |
| Database down | Critical | Full outage | *(Future)* Maintenance page — currently falls back to PageErrorState |

**CRITICAL:** All errors render INSIDE existing layout wrapper. See § 22.5 for error surface taxonomy.

**Maintenance Page Note:** Full-site maintenance page is a future exception for planned downtime or catastrophic outages. Default behavior is PageErrorState inside layout with retry.

### 23.2 Degradation Strategies

**Reference Data (Currencies, Cities, Categories):**

```typescript
// StaticCache graceful degradation
try {
  return currenciesCache.getAll();
} catch (err) {
  // Keep old data on reload failure
  return currenciesCache.getCachedData() || [];
}
```

**User Data (Events, Profile):**

```typescript
// No cache, always fresh
// On failure: show error + retry button
if (error) {
  return <ErrorMessage message={error} onRetry={reload} />;
}
```

### 23.3 Timeout Policy

| Operation | Timeout | Action on Timeout |
|-----------|---------|-------------------|
| API call | 30s (default fetch) | Show timeout error |
| File upload | 60s | Show progress + timeout |
| Polling | 30s interval, 5min total | Stop polling + message |

### 23.4 Offline Handling

**Current State:** No offline support (requires network)

**Future:** Consider service worker for static assets caching.

---

## 24. Observability Minimum

**Status:** CANONICAL (v4.0)

This section defines minimum observability requirements.

### 24.1 Structured Logging

**Location:** `lib/utils/logger.ts` (SSOT)

```typescript
import { log } from "@/lib/utils/logger";

// Levels
log.debug("Debug message", { context });
log.info("Info message", { context });
log.warn("Warning message", { context });
log.error("Error message", { error, context });
```

**Required Context for Errors:**

```typescript
log.error('[useClubData] Failed to load club', {
  code: err.code,        // Error code
  statusCode: err.statusCode,  // HTTP status
  clubId,               // Resource ID
  userId: currentUser?.id,  // Actor (if available)
});
```

### 24.2 Error Tracking

**Current State:** Console logging only

**Recommended:** Integrate Sentry for production error tracking:

```typescript
// Future integration
import * as Sentry from "@sentry/nextjs";

Sentry.captureException(error, {
  tags: { code: error.code },
  extra: { context },
});
```

### 24.3 API Request Logging

**All API routes SHOULD log:**

1. Request received (method, path, user)
2. Request completed (status, duration)
3. Errors (full context)

### 24.4 Performance Metrics

**Current State:** No metrics collection

**Recommended Future:**
- Response time histograms
- Error rate by endpoint
- Database query duration

---

## 25. Operational Compliance Checklist

**Status:** CANONICAL (v4.0)

Extended checklist for operational completeness review.

### 25.1 API Route Compliance

- [ ] Uses `respondSuccess()` / `respondError()` from `lib/api/response.ts`
- [ ] Throws typed errors from `lib/errors.ts`
- [ ] Has idempotency wrapper for POST/PUT/DELETE (if write operation)
- [ ] Validates input with Zod schema
- [ ] Logs errors with structured context

### 25.2 Client Component Compliance

- [ ] Uses `parseApiResponse()` from `lib/types/errors.ts`
- [ ] Handles `ClientError` with typed checks
- [ ] Shows PaywallModal for 402
- [ ] Shows CreditConfirmationModal for 409 (if applicable)
- [ ] Uses ActionController for form submissions
- [ ] Has loading/error/empty states

### 25.3 Form Submission Compliance

- [ ] Uses `useActionController()` hook
- [ ] Sends `Idempotency-Key` header for writes
- [ ] Reuses same key for confirmation retries
- [ ] Disables submit button via `controller.isBusy`
- [ ] Calls `controller.setRedirecting()` before navigation

### 25.4 Caching Compliance

- [ ] Reference data uses `StaticCache` from `lib/cache/staticCache.ts`
- [ ] API routes have correct `dynamic` / `revalidate` config
- [ ] No in-process caching for user-specific data

### 25.5 Duplicate Code Detection (Migration Map v4.0)

**Files to Migrate and Remove:**

| Duplicate File | Canonical Replacement | Usage Count | Action |
|---------------|----------------------|-------------|--------|
| `lib/api/respond.ts` | `lib/api/response.ts` | 4 files | Migrate → Delete |
| `lib/utils/errors.ts` (`handleApiError`) | `lib/types/errors.ts` (`parseApiResponse`) | 3 files | Migrate → Delete |
| `lib/utils/api-response.ts` | `lib/types/errors.ts` | 0 files | Delete immediately |

**Verification Command:**

```bash
# Check for old imports
grep -r "from ['\"]@/lib/api/respond['\"]" src/
grep -r "from ['\"]@/lib/utils/errors['\"]" src/
grep -r "handleApiError" src/
```

### 25.6 Next.js Boundaries

- [ ] Global `app/error.tsx` exists ✅
- [ ] Global `app/not-found.tsx` exists ✅
- [ ] Global `app/loading.tsx` exists ❌ **TODO** — Should use branded skeleton/loader
- [ ] `app/error.tsx` renders layout wrapper + PageErrorState (not blank page) ✅
- [ ] ErrorFallback component exists ✅

### 25.7 Error Surface Compliance (v4.1)

- [ ] All API errors (4xx, 5xx) rendered via PageErrorState/SectionErrorState
- [ ] **NO toast for errors** — only for success/info feedback
- [ ] 401 errors trigger AuthModal or redirect, not error surface
- [ ] 402 PAYWALL errors show PaywallModal with upgrade options
- [ ] 409 CREDIT_CONFIRMATION_REQUIRED shows CreditConfirmationModal
- [ ] 422 validation errors show FormFieldError + FormSummaryError
- [ ] 403/404 errors show PageErrorState without retry button
- [ ] 500/network/timeout errors show error surface with retry button
- [ ] Error surfaces render INSIDE layout (no panic full-page blank screens)

### 25.8 Loading Instrumentation Compliance (v4.1)

- [ ] Initial page load uses skeleton layout (not spinner-only)
- [ ] Initial list load uses skeleton grid (e.g., `EventCardSkeletonGrid`)
- [ ] Background refetch uses LoadingBar (not skeleton)
- [ ] List pagination appends skeleton rows (not inline spinner)
- [ ] Button submit shows spinner inside button + disabled state
- [ ] Form submit disables all fields + shows button spinner
- [ ] Modal actions show spinner in footer button
- [ ] **NO full-page spinner** without skeleton structure
- [ ] **NO skeleton** for background refetch (use LoadingBar)
- [ ] **NO multiple loading indicators** for same data scope
- [ ] `app/loading.tsx` uses branded loader consistent with design system

### 25.9 System Errors Compliance (v4.2)

**Reference:** § 20.7 (System Errors & Low-Level Failures), SSOT_DESIGN_SYSTEM.md § System Errors

#### Backend Compliance

- [ ] DB constraint violations mapped to 422 ValidationError (not raw 500)
- [ ] State/concurrent conflicts mapped to 409 Conflict
- [ ] All unmapped errors return 500 InternalError with generic message
- [ ] `respondError()` logs full error details internally before sanitizing response
- [ ] Error messages do NOT contain: `constraint`, `SQL`, `SQLSTATE`, `database` (technical terms)

#### Frontend Compliance

- [ ] 500 errors treated as `GENERIC_INTERNAL_ERROR` — no message parsing
- [ ] `error.details` ignored for 500 responses
- [ ] Error copy comes from Canonical Error Message Intents (SSOT_DESIGN_SYSTEM.md), not `error.message`
- [ ] **NO UI branching** based on raw error message text
- [ ] **NO toast** for system errors — use PageErrorState/SectionErrorState
- [ ] **NO special "DB error" screen** — same surface as other 500s

#### Audit Commands

```bash
# Find forbidden terms in UI components
grep -ri "database\|constraint\|SQL\|internal error" src/components/

# Find raw error.message usage (potential violation)
grep -r "error\.message\|err\.message" src/components/

# Find toast usage for errors (should only be success/info)
grep -r "toast.*error\|showError" src/components/
```

### 25.10 Aborted / Incomplete Actions Compliance (v4.4)

**Reference:** § 26 (Aborted / Incomplete Actions)

**Core Invariants:**
- [ ] Pending transactions do NOT change domain state or grant entitlements
- [ ] UI does NOT display "awaiting payment" as a persistent domain state
- [ ] Payment success does NOT imply action success — UI waits for backend confirmation
- [ ] No "countdown" or "TTL timer" shown in UI for pending transactions
- [ ] Retry after interruption re-triggers enforcement (no cached "was paying" state)

**Explicit vs Implicit Abort UX:**
- [ ] Explicit user cancellation (X, ESC, Cancel button) triggers NO UI message — silent return to context
- [ ] Implicit interruption (network drop, tab close) MAY show neutral informational hint on NEXT user action
- [ ] Hint is NOT an error, NOT a toast, NOT blocking, NOT persistent
- [ ] Hint uses informational intent (`--color-info-bg`), NOT danger/warning
- [ ] No optimistic or "awaiting-payment" domain states exist

**Paywall Behavior:**
- [ ] User-cancelled paywall does NOT trigger error UI (returns to context silently)
- [ ] Paywall may reappear on next enforcement without limit
- [ ] Form data preserved when paywall closes

**Forbidden Patterns:**
- [ ] No "Payment cancelled" toast on user cancel
- [ ] No "Resume payment" button or localStorage-based payment state
- [ ] No indefinite "Payment processing..." blocking state

---

## 26. Aborted / Incomplete Actions (Canonical System Behavior)

**Status:** CANONICAL (v4.3)

This section defines deterministic behavior for all scenarios where user actions are NOT completed: user closes paywall, payment cancelled, network interruption, tab closed, etc.

**SSOT Authority:** This section is the ONLY source of truth for aborted/incomplete action behavior. SSOT_BILLING_SYSTEM_ANALYSIS.md and SSOT_DESIGN_SYSTEM.md reference this section; they do NOT define alternative rules.

---

### 26.1 Definitions

| Term | Definition |
|------|------------|
| **Incomplete action** | Any domain operation (create event, consume credit, upgrade plan) that did not receive backend success confirmation |
| **Aborted flow** | User-initiated cancellation: closing paywall modal, pressing browser back, clicking cancel in payment UI |
| **Pending transaction** | `billing_transactions` record with `status = 'pending'` — payment initiated but not confirmed |
| **Cancelled transaction** | User explicitly cancelled at payment provider (Kaspi, etc.) |
| **Failed transaction** | Payment provider rejected (insufficient funds, declined, timeout) |
| **Domain state** | Persisted business data: events, billing_credits, club_subscriptions |
| **UI state** | Ephemeral component state: loading flags, modal visibility, form data |
| **Explicit cancellation** | User-initiated action to stop the flow: clicking X/Cancel button, pressing ESC, clicking outside modal. User made a conscious choice to cancel. |
| **Implicit interruption** | Non-explicit interruption: network drop, browser/tab close, redirect failure, app crash. User did NOT consciously cancel — flow was interrupted externally. |

---

### 26.2 Invariants (MUST)

**These rules are non-negotiable. Any implementation that violates them is incorrect.**

| ID | Invariant | Rationale |
|----|-----------|-----------|
| **INV-1** | **Pending transaction = NO-OP for domain and UI** — A `pending` transaction MUST NOT change domain access, limits, or entitlements. UI MUST NOT display "credit purchased" or "upgraded" while transaction is pending. | Eventual consistency: only `completed` transactions affect domain. |
| **INV-2** | **No optimistic entitlement** — UI MUST NOT grant access to features based on "payment started" or "payment pending". Access is granted ONLY after backend confirms domain change. | Prevents inconsistent states where user "has" something they didn't pay for. |
| **INV-3** | **UI bases decisions on backend enforcement outcomes only** — Frontend MUST NOT store or infer domain state from local variables. Each save/action triggers fresh enforcement check. | Single source of truth for constraints. |
| **INV-4** | **Payment success ≠ action success** — Even if payment completed, the domain action (event save, credit bind) may fail. UI MUST NOT assume success until backend returns success response. | Compensating transaction may fail; payment may succeed but constraint violated. |
| **INV-5** | **Idempotent-safe retry (manual) where allowed** — User may retry the same action after interruption. System MUST handle retry safely (idempotency key or state check). | Network failures and tab closes are normal; user expects to retry. |
| **INV-6** | **TTL/expiration is backend concern** — Frontend MUST NOT display countdowns, timers, or "expires in" for pending transactions. Backend handles TTL expiration. | UI simplicity; backend is authoritative for time-based cleanup. |
| **INV-7** | **User cancel is NOT an error** — User closing paywall, clicking cancel, or navigating away MUST NOT trigger error UI (toast, alert, error banner). | User has right to change mind; this is normal flow, not failure. |
| **INV-8** | **Paywall may reappear unlimited times** — Each enforcement check may trigger paywall. There is NO limit on paywall display frequency. | Until constraints are satisfied, paywall is the correct response. |

---

### 26.3 Scenario Table (Canonical Outcomes)

Each row defines the ONLY correct behavior for the scenario. No alternatives.

| # | Trigger | User Action | Backend State | UI Outcome | Next Attempt Behavior |
|---|---------|-------------|---------------|------------|----------------------|
| **S1** | Exceeds limit → Paywall shown | User closes paywall (X button, ESC, click outside) | No change (no transaction created) | Return to form/context. NO error shown. Form data preserved. | Next save → enforcement → paywall again if still exceeding |
| **S2** | User starts payment (clicks "Pay" in Paywall) | User cancels at provider (Kaspi cancel, browser back from payment page) | Transaction may be `pending` or `cancelled` depending on provider | Return to context. NO error shown. Paywall closed. | Next save → enforcement → paywall (if still exceeding). Pending tx expires via backend TTL. |
| **S3** | User starts payment | Network drops / tab closed during payment | Transaction may be `pending` (if created before drop) | N/A (user left). On return: no special state shown. | User returns, retries action → fresh enforcement → paywall if needed. If payment completed in background, user has entitlement on refresh. |
| **S4** | Payment pending (created earlier) | User retries save later | Pending transaction exists in DB (may have expired) | Normal enforcement: if pending expired or limits still exceeded → paywall. If user has new completed credit → proceed. | Standard enforcement flow. No "resume" or "continue payment" UI. |
| **S5** | Payment completed | Save/action fails (domain constraint, DB error) | Payment `completed` but credit NOT consumed (or event NOT saved) | Error shown via PageErrorState/SectionErrorState (NOT toast). Credit remains `available` if not consumed. | User retries → enforcement passes (has credit) → retry save. Credit consumed on success. |
| **S6** | User clicks Save twice quickly (double-submit) | Concurrent requests | Idempotency: second request returns same response or 409 IN_PROGRESS | First click proceeds, second is de-duplicated. No double-creation. | Automatic via idempotency key. User sees single result. |
| **S7** | `confirm_credit=1` started but request interrupted (tab close, network) | Client-side abort | If request reached server: may have consumed credit + saved event. If not: nothing happened. | On return: user checks event list / profile credits. | If action completed → event exists, credit consumed. If not → retry triggers fresh flow (paywall if no credit, confirm if credit exists). |
| **S8** | Payment polling in progress | User closes modal before polling completes | Polling stops. Transaction may complete in background. | Modal closes. No error. | On next page load / action: if payment completed, user has entitlement. If not, enforcement triggers paywall. |

---

### 26.4 UI Behavior Rules (Explicit vs Implicit Abort)

**Status:** CANONICAL (v4.4)

This section defines the ONLY correct UI behavior for explicit cancellations vs implicit interruptions.

#### 26.4.1 Explicit Cancellation → NO UI Message

**Definition:** User consciously cancels the flow (X button, ESC, "Cancel" button, click outside modal).

**MANDATORY Behavior:**
- UI MUST return to previous context silently
- NO toast, NO alert, NO banner, NO error message
- Form data MUST be preserved
- User can retry immediately or adjust input

**Rationale:** User made a choice. Respecting that choice means no feedback implying error or failure.

**Examples:**
| User Action | UI Response |
|-------------|-------------|
| Clicks X on PaywallModal | Modal closes. Form visible. Silent. |
| Presses ESC on CreditConfirmationModal | Modal closes. Form visible. Silent. |
| Clicks "Cancel" in any modal | Modal closes. Context preserved. Silent. |
| Clicks outside modal (if dismissible) | Modal closes. Silent. |
| Browser back from external payment page | Return to app context. Silent. |

#### 26.4.2 Implicit Interruption → Neutral Informational Hint

**Definition:** Flow interrupted non-explicitly (network drop, tab close, redirect failure, browser crash).

**MANDATORY Behavior:**
- On NEXT user interaction (save/submit), UI MAY show a **neutral informational hint**
- Hint is NOT an error, NOT a toast, NOT blocking, NOT persistent
- Hint uses `--color-info-bg` (informational intent), NOT danger/warning
- Hint is shown ONLY ONCE per interaction cycle
- Hint does NOT auto-appear — triggered by user action (save/submit)
- Hint does NOT imply failure or error — neutral tone

**Copy Intent (RU reference):**
> "Действие не было завершено. Вы можете попробовать снова."

**Copy Intent (EN reference):**
> "The action was not completed. You can try again."

**Hint Surface:** Inline informational banner inside existing context (e.g., above form, inside card).

**Component:** `InlineInfoBanner` (see SSOT_DESIGN_SYSTEM.md § Neutral Informational Hint)

**When to Show:**
| Scenario | Show Hint |
|----------|-----------|
| User returns to form after tab was closed during payment | ✅ On next save attempt |
| User returns after network dropped mid-flow | ✅ On next save attempt |
| User explicitly cancelled paywall | ❌ Never |
| User clicked Cancel button | ❌ Never |
| Fresh page load with no prior interrupted state | ❌ Never |

**Implementation Note:** Detection of implicit interruption is OPTIONAL. Many implementations choose to simply re-run enforcement on next save without hint. The hint is a UX enhancement, not a requirement. If implemented, it MUST follow these rules.

#### 26.4.3 Forbidden Patterns (UI)

The following UI behaviors are STRICTLY FORBIDDEN:

| Pattern | Why Forbidden |
|---------|---------------|
| Toast "Payment cancelled" on explicit cancel | User cancel is not error |
| Alert "Your payment was interrupted" on page load | Creates anxiety, no action needed |
| "Payment processing, please wait..." as indefinite state | Blocks UI; may never resolve |
| Countdown timer "Payment expires in X:XX" | TTL is backend concern |
| "Resume payment" button with stored transaction ID | Each action is independent |
| Warning banner on paywall close | User cancel is neutral |
| Error styling for cancelled/aborted flows | Cancellation is not failure |
| localStorage-based "interrupted payment" detection | Creates stale state issues |

---

### 26.5 Responsibilities Split

#### 26.5.1 Backend Responsibilities

| Responsibility | Implementation |
|----------------|----------------|
| **Transaction TTL enforcement** | Cron job / scheduled task marks `pending` → `expired` after `billing_policy.pending_ttl_minutes` |
| **Idempotency** | `withIdempotency()` wrapper stores response, returns cached response for duplicate keys |
| **Atomicity boundaries** | `executeWithCreditTransaction()` ensures credit consumption + event save are atomic. Rollback on failure. |
| **Final authority on domain state** | All enforcement checks read from DB. No client-supplied "I already paid" flags accepted. |
| **Payment webhook handling** | Webhook from provider → mark transaction `completed` → issue credit. Client polls or gets state on next request. |
| **Compensating transactions** | If credit consumed but event save fails → rollback credit (or delete event). CRITICAL log for manual review. |

#### 26.5.2 Frontend Responsibilities

| Responsibility | Implementation |
|----------------|----------------|
| **NEVER assume success** | UI waits for `respondSuccess()` / HTTP 2xx before showing success state |
| **NEVER store "awaiting payment" as domain state** | No local storage of "purchase in progress". Each action is independent. |
| **Re-run enforcement on next save** | Even if user "just closed paywall", next save triggers fresh `enforceEventPublish()` |
| **Preserve form data on paywall close** | User closes paywall → form data remains → user can adjust (e.g., reduce participants) or retry |
| **Silent return on user cancel** | `onClose` of PaywallModal does NOT call error handler or show toast |
| **Reset UI state on navigation** | If user navigates away during flow, all pending UI state (modals, loading) is discarded |
| **Use ActionController for phase management** | `controller.phase` tracks UI state; reset to `idle` on cancel or navigation |

---

### 26.6 Implementation Notes

#### 26.6.1 Paywall Close Handler

```typescript
// ✅ CORRECT: Silent close, no error
<PaywallModal
  open={showPaywall}
  onClose={() => setShowPaywall(false)}  // Just close, no error
  error={paywallError}
/>

// ❌ WRONG: Treating close as error
<PaywallModal
  onClose={() => {
    setShowPaywall(false);
    showToast({ type: 'error', message: 'Payment cancelled' });  // FORBIDDEN
  }}
/>
```

#### 26.6.2 Form Data Preservation

```typescript
// ✅ CORRECT: Form data preserved after paywall close
const handleSubmit = async () => {
  try {
    await saveEvent(formData);
  } catch (err) {
    if (err.status === 402) {
      setPaywallError(err.details);
      setShowPaywall(true);
      // formData is NOT cleared — user can retry or adjust
      return;
    }
    // Other errors...
  }
};
```

#### 26.6.3 No "Resume Payment" State

```typescript
// ❌ WRONG: Storing payment state for later
localStorage.setItem('pendingPayment', JSON.stringify({ eventId, transactionId }));

// ✅ CORRECT: Each action is independent
// On page load, just render form. User clicks save → fresh enforcement.
```

---

### 26.7 Cross-References

| Topic | SSOT Location |
|-------|---------------|
| Transaction states (pending/completed/failed) | SSOT_BILLING_SYSTEM_ANALYSIS.md § Database Schema |
| Credit consumption timing | SSOT_CLUBS_EVENTS_ACCESS.md § 10 |
| Compensating transactions | SSOT_BILLING_SYSTEM_ANALYSIS.md § Credit Consumption (v5.1) |
| Aborted purchase attempts (billing-specific) | SSOT_BILLING_SYSTEM_ANALYSIS.md § Aborted Purchase Attempts |
| Idempotency implementation | § 21 (this document) |
| ActionController phases | § 15 (this document) |
| Error UI patterns (NOT for user-cancel) | SSOT_DESIGN_SYSTEM.md § Error States |
| Neutral Informational Hint (implicit abort) | SSOT_DESIGN_SYSTEM.md § Neutral Informational Hint |
| Aborted user-initiated flows (UI patterns) | SSOT_DESIGN_SYSTEM.md § Aborted User-Initiated Flows |
| PaywallModal component | SSOT_BILLING_SYSTEM_ANALYSIS.md § Paywall Modal |

---

## 27. SSOT-Linter Checklist (Mandatory for all PRs)

**Status:** CANONICAL (v4.6)

This checklist MUST be verified before merging any PR that modifies SSOT documents.

### Content Rules

| # | Rule | Status |
|---|------|--------|
| **L1** | ❌ SSOT MUST NOT contain framework-specific code (React, TypeScript, hooks, polling, intervals) | ENFORCE |
| **L2** | ❌ SSOT MUST NOT describe "how to implement UI" — only "what behavior is required" | ENFORCE |
| **L3** | ✅ SSOT MUST describe system behavior, invariants, contracts, forbidden patterns | ENFORCE |
| **L4** | ❌ Legacy flows, historical implementations MUST live in `/docs/**/legacy/` or `/docs/ssot/archive/` | ENFORCE |
| **L5** | ✅ Exactly ONE canonical SSOT per rule — no duplicated IF–THEN rules across SSOTs | ENFORCE |
| **L6** | ❌ No duplicated normative content — use cross-references instead | ENFORCE |
| **L7** | ✅ All SSOT changes MUST include version bump + changelog entry | ENFORCE |
| **L8** | ✅ Any removed content MUST be archived (not silently deleted) OR explicitly marked as obsolete | ENFORCE |

### Structural Rules

| # | Rule | Status |
|---|------|--------|
| **S1** | SSOT files MUST be in `/docs/ssot/` with `SSOT_` prefix | ENFORCE |
| **S2** | Archive files MUST be in `/docs/ssot/archive/` or `/docs/**/legacy/` | ENFORCE |
| **S3** | Cross-references MUST use section numbers (e.g., "See § 26") | ENFORCE |
| **S4** | Implementation examples in SSOT MUST be minimal (≤10 lines) and illustrative, not copy-paste ready | ENFORCE |

### What IS Allowed in SSOT

- Contract definitions (error structures, API envelopes, status codes)
- Behavioral rules (IF condition THEN outcome)
- Invariants (MUST / MUST NOT statements)
- Cross-references to other SSOTs
- Minimal pseudo-code or type signatures
- Decision tables with deterministic outcomes

### What is NOT Allowed in SSOT

- Full React component implementations
- Hook implementations (useState, useEffect, custom hooks)
- CSS/Tailwind styling details (see SSOT_DESIGN_SYSTEM.md for UI patterns)
- Polling/interval logic
- API fetch implementations
- UI state management code
- Historical migration procedures (archive them)

### PR Verification

Before merging PR with SSOT changes:

```markdown
- [ ] No React/TypeScript code blocks > 10 lines
- [ ] No hook implementations (useState, useEffect)
- [ ] No framework-specific imports
- [ ] Version bumped in document header
- [ ] Changelog entry added
- [ ] No duplicated rules (cross-reference instead)
- [ ] Removed content archived (not deleted)
```

### Violation Handling

If SSOT contains implementation code:
1. Extract code to `/docs/**/legacy/` or actual source file
2. Replace with behavioral description or cross-reference
3. Bump version with "Removed implementation from SSOT" changelog

---

## Document History

| Date | Version | Change |
|------|---------|--------|
| 2024-12-25 | 2.0 | Initial creation as SSOT |
| 2024-12-26 | 2.1 | Added billing enforcement to Ownership Map |
| 2024-12-26 | 2.2 | Added sections 12-15 (naming, client fetching, performance, errors) |
| 2024-12-27 | 2.3 | SSOT consolidation for events listing pagination + stats (visibility + caching + repo contracts) |
| 2024-12-27 | 2.4 | Self-consistency consolidation pass: unified visibility definitions, clarified event_user_access role, explicit caching rules, canonical mapper location, runtime boundaries |
| 2024-12-28 | 2.8 | Added Vehicle Type Hydration; Removed /api/events/stats endpoint (duplicated meta.total); Updated § 10 with future stats guidance |
| 2024-12-31 | 3.1 | **Phase 1 Code Improvements:** Explicit pending checks (events.ts), DB trigger for club_id immutability (20241231_enforce_club_id_immutability_v2.sql). Compliance: 95% → 100%. See SSOT_CLUBS_EVENTS_ACCESS.md §2, §5.6 for implementation details. Audit: docs/verification/EVENTS_CREATE_EDIT_AUDIT_REPORT.md v1.1 |
| 2024-12-31 | 3.2 | **NEW § 15: Form State Management & Async Actions** — ActionController pattern (canonical mechanism for async actions with confirmation flows), phase model, idempotency integration, race condition prevention. Session: docs/sessions/2024-12-31-event-save-ux-issues/. Fixes 3 UX issues (double-submit, missing loading, incorrect limits). |
| 2026-01-01 | 3.3 | **SSOT Consistency Work:** Added §18 (SSOT Governance), §19 (Consistency Checklist). Fixed RBAC example (removed deprecated "organizers"). Updated Related SSOT paths. Cross-referenced billing_credits state machine. |
| 2026-01-01 | 3.4 | v5+ Alignment: Changed "publish-only" to "save-time (v5+)" consumption. |
| 2026-01-01 | 4.0 | **Operational Completeness:** Added §20-25 (Error Envelope, Idempotency, UI State Model, Failure Modes, Observability, Compliance Checklist). Updated Ownership Map. Identified duplicate code for migration. |
| 2026-01-01 | 4.1 | **Error & Loading UX Completeness:** Added §22.5-22.8 (UI Error Surface Model, Loading Taxonomy, Loading Decision Matrix, Retry UX Policy). Updated §23.1 (errors inside layout). Extended §25 (error/loading compliance). Clarified toast policy (success/info only). |
| 2026-01-01 | 4.2 | **System Errors Handling:** Added §20.7 (System Errors & Low-Level Failures) — DB/infra/internal error handling, backend mapping responsibility, observability boundary. Cross-ref: SSOT_DESIGN_SYSTEM.md v1.3 (System Errors UI Rules, Canonical Error Intents, FORBIDDEN UI BEHAVIOR). |
| 2026-01-01 | 4.3 | **Aborted / Incomplete Actions:** Added §26 (Aborted / Incomplete Actions — Canonical System Behavior) — deterministic rules for pending transactions (NO-OP), user-cancelled payments (NOT error), payment success ≠ action success, paywall may reappear unlimited times, scenario table with 8 canonical outcomes, UI/backend responsibilities split. Updated §25.10 (compliance checklist). Cross-ref: SSOT_BILLING_SYSTEM_ANALYSIS.md, SSOT_CLUBS_EVENTS_ACCESS.md, SSOT_DESIGN_SYSTEM.md. |
| 2026-01-01 | 4.4 | **Explicit vs Implicit Abort Finalization:** Added §26.4 (UI Behavior Rules — Explicit vs Implicit Abort). Added explicit/implicit cancellation definitions to §26.1. Explicit cancellation → silent return (no UI message). Implicit interruption → neutral informational hint on next user action (not error, not toast, not persistent). Updated §25.10 compliance checklist with explicit/implicit abort UX items. Added §26.4.3 Forbidden Patterns (UI). Cross-ref: SSOT_DESIGN_SYSTEM.md § Neutral Informational Hint. |
| 2026-01-01 | 4.5 | **Cleanup / Archival / Dedup:** Compressed Change Log (moved full history to Document History table). No normative changes. |
| 2026-01-01 | 4.6 | **SSOT-Linter Checklist:** Added § 27 (SSOT-Linter Checklist — Mandatory for all PRs). Defines content/structural rules: no framework-specific code (React/TS), no hook implementations, legacy in archive only, version bump required, cross-references over duplication. PR verification checklist. Violation handling procedure. |

---

*This is the Single Source of Truth for Need4Trip architecture. All other documents defer to this one.*

**END OF ARCHITECTURE DOCUMENT**
