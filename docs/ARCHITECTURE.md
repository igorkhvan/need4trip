# Need4Trip - Architecture (Single Source of Truth)

**Status:** 🟢 Production Ready  
**Version:** 2.3  
**Last Updated:** 27 December 2024  
**This document is the ONLY authoritative source for architectural decisions.**

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
10. [Events Listing, Pagination, and Stats (SSOT)](#events-listing-pagination-and-stats-ssot) ⚡
11. [Type Safety Contracts](#type-safety-contracts)
12. [Naming & Project Structure](#naming--project-structure)
13. [Client-Side Data Fetching](#client-side-data-fetching)
14. [Performance Optimizations](#performance-optimizations)
15. [Error Handling & Validation](#error-handling--validation)
16. [Change Process & Definition of Done](#change-process--definition-of-done)

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

### Related SSOT Documents

- **Database Schema:** `/docs/DATABASE.md` - **SSOT** для структуры БД, таблиц, индексов, RLS
- **Billing System:** `/docs/BILLING_SYSTEM_ANALYSIS.md` - **SSOT** для биллинга, тарифов, лимитов
- **Design System:** `/docs/design/design-system.md` - UI компоненты, стили
- **Development Guides:** `/docs/development/` - Нотификации, кэширование, AI фичи

**ПРАВИЛО:** Перед изменениями в БД или биллинге ВСЕГДА читай соответствующий SSOT. После изменений ВСЕГДА обновляй SSOT.

### Принципы SSOT (Single Source of Truth)

1. **3 главных SSOT:** ARCHITECTURE.md, DATABASE.md, BILLING_SYSTEM_ANALYSIS.md
2. **Обновление:** При изменении кода ВСЕГДА обновляй SSOT в том же коммите
3. **Архивация:** Временные документы (sessions, analysis) → удалять/архивировать
4. **Версионирование:** SSOT имеют версии и даты обновления
5. **Синхронизация:** Memory правила (.cursor) синхронизированы с SSOT файлами

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
- ✅ **ALWAYS** flow: UI → API → Service → Repository → DB
- ✅ **ALWAYS** validate at boundaries (API input, Service domain rules)

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
│   ├── ARCHITECTURE.md       # ← THIS DOCUMENT (SSOT)
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
| **Supabase Admin Client** | `lib/db/client.ts` | `@supabase/supabase-js` | Direct supabase imports in repos | ✅ CENTRALIZED |
| **Event Visibility** | `lib/utils/eventVisibility.ts` | `lib/types/event`, `lib/auth/currentUser` | Inline visibility checks | ✅ CENTRALIZED |
| **Event Permissions** | `lib/utils/eventPermissions.ts` | `lib/types/event`, `lib/types/user` | Duplicate permission logic | ✅ CENTRALIZED |
| **Hydration (Cities)** | `lib/utils/hydration.ts` | `lib/db/cityRepo` | Manual city hydration | Batch loading pattern |
| **Hydration (Currencies)** | `lib/utils/hydration.ts` | `lib/db/currencyRepo` | Manual currency hydration | Batch loading pattern |
| **Hydration (Categories)** | `lib/utils/hydration.ts` | `lib/db/eventCategoryRepo` | Manual category hydration | ✅ CONSOLIDATED |
| **Event Formatters** | `lib/utils/eventFormatters.ts` | `lib/types/event` | Inline price formatting | ✅ EXTRACTED |
| **Event Repository** | `lib/db/eventRepo.ts` | `lib/db/client` | Service-level DB access | Data access only |
| **Event Service** | `lib/services/events.ts` | `lib/db/eventRepo`, `lib/utils/*` | Direct DB access | Business logic only |
| **Event API** | `app/api/events/**/route.ts` | `lib/services/events` | Direct repo access | HTTP layer only |
| **Current User (Server)** | `lib/auth/currentUser.ts` | `lib/auth/jwt`, `lib/db/userRepo` | Multiple auth approaches | **SSOT for server auth** |
| **Current User (Client)** | `components/auth/auth-provider.tsx` | React Context | Server-only functions | Client context only |
| **Caching (Reference Data)** | `lib/cache/staticCache.ts` | None (infrastructure) | Multiple cache patterns | ✅ UNIFIED |
| **Error Handling** | `lib/errors.ts` | None (base classes) | Untyped errors | Custom error classes |
| **API Responses** | `lib/api/response.ts` | `lib/errors` | Inconsistent responses | Standard format |
| **Billing Enforcement** | `lib/services/accessControl.ts` | `lib/db/*Repo`, `lib/errors` | Frontend limit checks | `enforceEventPublish()` unified ⚡ |
| **Credit Transactions** | `lib/services/creditTransaction.ts` | `lib/db/billingCreditsRepo` | Direct credit consumption | `executeWithCreditTransaction()` wrapper ⚡ |
| **Credit Badge UI** | `components/billing/credit-badge.tsx` | `components/auth/auth-provider` | Manual credit display | Badge reads from AuthContext (0 API calls) ⚡ |
| **Billing Products** | `lib/db/billingProductsRepo.ts` | `lib/db/client` | Hardcoded prices | **SSOT from billing_products table** |
| **Credit Confirmation** | `components/billing/CreditConfirmationModal.tsx` | `lib/types/billing` | Manual 409 handling | Modal + `useCreditConfirmation` hook |

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
- ✅ MUST return domain types (NOT database types)
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

**All DB ↔ Domain mapping happens in `lib/mappers.ts`.**

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
- ⚠️ Mappers MAY be colocated with repos (e.g., `eventRepo.ts` exports `mapDbEventToDomain`) OR centralized in `lib/db/mappers/*.ts`
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
- ❌ Events (change frequently, user-specific visibility; **exception:** event counts/stats may use short-lived in-process cache, see § 10)
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
- API routes with user auth → `dynamic = 'force-dynamic'`
- API routes with public data → `revalidate = 3600`
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
  
  if (!member || member.role === 'member') {
    throw new AuthError("Only organizers can export data", undefined, 403);
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
| `public` | ✅ Yes | ✅ Everyone (including anonymous) | ❌ No | Default, maximum visibility |
| `unlisted` | ❌ No | ✅ Everyone (including anonymous) | ❌ No | Private link, not in catalog |
| `restricted` | ❌ No | ✅ Authenticated users only | ✅ Yes (any logged-in user) | NOT invite-only in current phase |

**Critical Rules:**

1. **Catalog (tab=all, tab=upcoming):** ONLY `public` events
2. **Direct link access:**
   - `public` → anyone can view (including anonymous)
   - `unlisted` → anyone with link can view (including anonymous)
   - `restricted` → requires authentication; any logged-in user can view
3. **event_user_access table:**
   - Used for inclusion in tab=my (explicit access)
   - Used for future ACL features (Phase 2+)
   - NOT required to view restricted events in Phase 1

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

## 10. Events Listing, Pagination, and Stats (SSOT)

### Decision Matrix (LOCKED)

This section defines the ONLY authoritative rules for events listing, pagination, filtering, and stats endpoints.

#### Visibility Semantics (enum values fixed: public/unlisted/restricted)

| Visibility | Listed in Catalog (tab=all) | Direct Link Access | Auth Required |
|-----------|---------------------------|-------------------|---------------|
| `public` | ✅ Yes | Everyone (anonymous OK) | ❌ No |
| `unlisted` | ❌ No | Everyone (anonymous OK) | ❌ No |
| `restricted` | ❌ No | Authenticated users only | ✅ Yes (any logged-in user) |

**Critical:** `event_user_access` table is used for tab=my inclusion and future ACL, but NOT required to view restricted events in Phase 1.

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

**API behavior for tab=my without auth:** Return 401 (NOT empty list, NOT redirect). UI may show auth modal.

#### Pagination (Server-Side, Offset-Based)

**Parameters:**

| Param | Type | Default | Validation | Notes |
|-------|------|---------|-----------|-------|
| `page` | integer | 1 | >= 1 | 1-based page number |
| `limit` | integer | 12 | 1-50 (clamped) | Results per page |
| `sort` | string | `date` | `date` or `name` | Sort field |

**Sorting Rules (stable tie-breaker REQUIRED):**

```sql
-- Default sort (date descending)
ORDER BY date_time DESC, id DESC

-- Name sort (alphabetical ascending)
ORDER BY title ASC, id ASC

-- participants sort: DEFERRED to Phase 2 (not implemented in Phase 1)
```

**Why stable tie-breaker:** Prevents pagination drift when multiple events have same date_time or title.

**Cursor-based pagination:** Reserved for Phase 2. API response includes `nextCursor: null` for future migration.

#### Search (Phase 1 Scope)

**Phase 1:** Search by `title` only (case-insensitive ILIKE)

**Phase 2+:** Extend to description, city, category (not in scope for current SSOT).

#### Repository Contract (CRITICAL)

**Rule:** Repositories MUST NOT return raw DB row types to services/API.

**For listings (GET /api/events):**

Repo MUST return lightweight DTO:

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

**For single-item getters (by ID):** `select('*')` is allowed (full row needed).

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

**GET /api/events/stats**

Request (query params):

```typescript
{
  tab?: 'all' | 'upcoming' | 'my',  // default: 'all'
  search?: string,                  // optional
  cityId?: string,                  // optional
  categoryId?: string               // optional
}
```

Response (200):

```typescript
{
  total: number  // Total events matching filters (before pagination)
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

#### Caching Matrix (CRITICAL)

**Rule:** Listings are always fresh (no Next.js cache). Stats endpoints use selective caching for performance.

| Endpoint | Tab | User-Specific | Next.js Cache | In-Process Cache | TTL |
|----------|-----|--------------|---------------|-----------------|-----|
| GET /api/events | all, upcoming | ❌ No | dynamic: 'force-dynamic' | ❌ None | 0s |
| GET /api/events | my | ✅ Yes | dynamic: 'force-dynamic' | ❌ None | 0s |
| GET /api/events/stats | all, upcoming | ❌ No | revalidate: 60 | ❌ None | 60s |
| GET /api/events/stats | my | ✅ Yes | dynamic: 'force-dynamic' | keyed by userId+filters | 60s |

**Explanation:**

1. **Listings (GET /api/events):** ALWAYS fresh (NO cache)
   - tab=all/upcoming: `dynamic: 'force-dynamic'` (public data, but frequently changing)
   - tab=my: `dynamic: 'force-dynamic'` (user-specific)
   - Rationale: Events change frequently (new registrations, edits, visibility changes)

2. **Stats (GET /api/events/stats):**
   - tab=all/upcoming: `revalidate: 60` (Next.js cache, public count, lightweight)
   - tab=my: `dynamic: 'force-dynamic'` + in-process cache keyed by `${userId}|${filters}` with TTL 60s
   - Rationale: Stats is a lightweight count query. Caching reduces DB load for repeated calls.

**Implementation Example (stats with user-keyed cache):**

```typescript
// app/api/events/stats/route.ts
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const statsCache = new Map<string, { count: number; expires: number }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'all';
  
  const currentUser = await getCurrentUser();
  
  if (tab === 'my') {
    if (!currentUser) {
      return respondError(new UnauthorizedError("Authentication required for tab=my"));
    }
    
    // User-keyed cache
    const cacheKey = `${currentUser.id}|${tab}|${searchParams.toString()}`;
    const cached = statsCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expires) {
      return respondJSON({ total: cached.count });
    }
    
    const total = await getEventsStatsForUser(currentUser.id, { tab, ...otherFilters });
    
    statsCache.set(cacheKey, { count: total, expires: Date.now() + 60_000 });
    
    return respondJSON({ total });
  }
  
  // Public stats (tab=all/upcoming): no in-process cache, rely on Next.js revalidate
  const total = await getEventsStatsPublic({ tab, ...otherFilters });
  return respondJSON({ total });
}
```

**For tab=all/upcoming stats (public) — Alternative with revalidate:**

```typescript
// app/api/events/stats/route.ts (if separating public endpoint)
export const revalidate = 60; // Next.js cache, public data

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'all';
  
  // If tab=my requested, require auth and use force-dynamic approach
  if (tab === 'my') {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return respondError(new UnauthorizedError("Authentication required"));
    }
  }
  
  const total = await getEventsStats({ tab, ...otherFilters });
  return respondJSON({ total });
}
```

**CANONICAL APPROACH for Need4Trip:**

Use the FIRST example (combined endpoint with explicit branching):
- tab=my: `dynamic: 'force-dynamic'` + in-process cache keyed by userId
- tab=all/upcoming: Next.js revalidate handled by route segment config (may add `export const revalidate = 60` for public-only branches if separated)

#### Future Migration Notes (Phase 2+)

1. **Cursor-based pagination:** `nextCursor` field already reserved in response. Offset remains current implementation.
2. **Participants sorting:** Deferred due to performance concerns (requires join or materialized view).
3. **Extended search:** Description, city name, category name (requires full-text index or Algolia).

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

**Exception:** Single-item getters (by ID) MAY use `select('*')` when full row is needed.

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

## 15. Error Handling & Validation

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

## 16. Change Process & Definition of Done

### Making Architectural Changes

**When you need to change architecture:**

1. **Update THIS document first** (docs/ARCHITECTURE.md)
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
| `ensureAdminClient()` in every function | Code duplication | Use `getAdminDb()` wrapper |
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

## Document History

| Date | Version | Change |
|------|---------|--------|
| 2024-12-25 | 2.0 | Initial creation as SSOT |
| 2024-12-26 | 2.1 | Added billing enforcement to Ownership Map |
| 2024-12-26 | 2.2 | Added sections 12-15 (naming, client fetching, performance, errors) |
| 2024-12-27 | 2.3 | SSOT consolidation for events listing pagination + stats (visibility + caching + repo contracts) |

---

**END OF ARCHITECTURE DOCUMENT**

*This is the Single Source of Truth for Need4Trip architecture. All other documents defer to this one.*
