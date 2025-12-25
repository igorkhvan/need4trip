# Need4Trip - Architecture (Single Source of Truth)

**Status:** 🟢 Production Ready  
**Version:** 2.0  
**Last Updated:** 25 December 2024  
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
10. [Type Safety Contracts](#type-safety-contracts)
11. [Change Process & Definition of Done](#change-process--definition-of-done)

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

### Related Documents

- **Design System:** `/docs/design/design-system.md` - UI components, styling
- **Database Schema:** `/docs/architecture/database-schema.md` - DB structure
- **Billing Specification:** `/docs/billing/billing-spec.md` - Payment system
- **Security Policies:** `/docs/architecture/security.md` - Security rules

If any of these documents contradict THIS document on architectural matters, THIS document wins.

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
│   │   ├── db/               # Database Repositories
│   │   ├── services/         # Business Logic Services
│   │   ├── types/            # TypeScript types
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
| **Date/Time Utilities** | `lib/utils/dates.ts` | None (pure) | Multiple date utils | ✅ CONSOLIDATED (STAGE 1) |
| **Supabase Admin Client** | `lib/db/client.ts` | `@supabase/supabase-js` | Direct supabase imports in repos | ✅ CENTRALIZED (STAGE 2) |
| **Event Visibility** | `lib/utils/eventVisibility.ts` | `lib/types/event`, `lib/auth/currentUser` | Inline visibility checks | ✅ CENTRALIZED (STAGE 4) |
| **Event Permissions** | `lib/utils/eventPermissions.ts` | `lib/types/event`, `lib/types/user` | Duplicate permission logic | ✅ CENTRALIZED (STAGE 4) |
| **Hydration (Cities)** | `lib/utils/hydration.ts` | `lib/db/cityRepo` | Manual city hydration | Batch loading pattern |
| **Hydration (Currencies)** | `lib/utils/hydration.ts` | `lib/db/currencyRepo` | Manual currency hydration | Batch loading pattern |
| **Hydration (Categories)** | `lib/utils/hydration.ts` | `lib/db/eventCategoryRepo` | Manual category hydration | ✅ CONSOLIDATED (STAGE 3) |
| **Price Formatting** | ❌ MISSING | N/A | Inline price formatting | ⚠️ NEEDS CREATION (see STAGE 5) |
| **Event Repository** | `lib/db/eventRepo.ts` | `lib/db/client` | Service-level DB access | Data access only |
| **Event Service** | `lib/services/events.ts` | `lib/db/eventRepo`, `lib/utils/*` | Direct DB access | Business logic only |
| **Event API** | `app/api/events/**/route.ts` | `lib/services/events` | Direct repo access | HTTP layer only |
| **Current User (Server)** | `lib/auth/currentUser.ts` | `lib/auth/jwt`, `lib/db/userRepo` | Multiple auth approaches | **SSOT for server auth** |
| **Current User (Client)** | `components/auth/auth-provider.tsx` | React Context | Server-only functions | Client context only |
| **Caching (Reference Data)** | `lib/cache/staticCache.ts` | None (infrastructure) | Multiple cache patterns | ⚠️ NEEDS EXPANSION (see STAGE 6) |
| **Error Handling** | `lib/errors.ts` | None (base classes) | Untyped errors | Custom error classes |
| **API Responses** | `lib/api/response.ts` | `lib/errors` | Inconsistent responses | Standard format |

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
- ✅ MUST use `ensureAdminClient()` at start of every function ⚠️ (STAGE 2: consolidate)
- ✅ MUST return domain types (NOT database types)
- ✅ MUST handle database errors (throw `InternalError`)
- ❌ MUST NOT contain business logic
- ❌ MUST NOT perform authorization checks
- ❌ MUST NOT validate business rules

**Example:**

```typescript
// ✅ CORRECT: lib/db/eventRepo.ts
export async function getEventById(id: string): Promise<DbEvent | null> {
  ensureAdminClient();
  if (!supabaseAdmin) return null;
  
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  
  if (error) throw new InternalError("Failed to get event", error);
  return data ? mapDbEventToDomain(data) : null;
}

// ❌ WRONG: Business logic in repository
export async function getEventById(id: string, userId: string) {
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
  // Can access database directly
  // Cannot use useState/useEffect
}

// ✅ Client Component (explicit marker required)
'use client';
export function EventForm() {
  const [title, setTitle] = useState('');
  // Can use hooks
  // Can use browser APIs
  // Cannot be async
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

### Reference Data Caching

**RULE: Reference data (cities, currencies, categories, brands) MUST be cached in-memory.**

**Implementation: StaticCache class (`lib/cache/staticCache.ts`)**

```typescript
import { StaticCache } from '@/lib/cache/staticCache';

const citiesCache = new StaticCache<City>(60_000); // 1 minute TTL

export async function getCities(): Promise<City[]> {
  return citiesCache.getOrLoad('all', async () => {
    const { data } = await supabaseAdmin.from('cities').select('*');
    return data || [];
  });
}
```

**Cached Reference Data:**

| Data Type | TTL | Why Cache | Invalidation |
|-----------|-----|-----------|--------------|
| **Cities** | 60 min | ~200 records, rarely change | On admin update |
| **Currencies** | 24 hours | ~10 records, never change | Manual (years) |
| **Event Categories** | 60 min | ~10 records, rarely change | On admin update |
| **Car Brands** | 60 min | ~50 records, rarely change | On admin update |
| **Vehicle Types** | 60 min | ~5 records, never change | Manual |
| **Plans (incl. FREE)** | 24 hours | 4 records, rarely change | On plan update |

**NOT cached:**
- ❌ Events (change frequently, user-specific visibility)
- ❌ Participants (real-time registration data)
- ❌ Users (privacy, authentication state)
- ❌ Club subscriptions (billing state)

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

**Three visibility levels:**

| Level | Who Can View | Who Can Register | Link Sharing |
|-------|--------------|------------------|--------------|
| `public` | Everyone | Everyone | Yes |
| `unlisted` | Link holders | Link holders | Yes (private link) |
| `restricted` | Explicit access | Explicit access | No (invitation only) |

**Implementation: `lib/utils/eventVisibility.ts` (SSOT)**

```typescript
export async function enforceEventVisibility(
  event: Event,
  currentUser: CurrentUser | null,
  options?: { autoGrantAccessForRestricted?: boolean }
): Promise<void> {
  // 1. Public events: always visible
  if (event.visibility === 'public') return;
  
  // 2. Owner always has access
  if (currentUser && event.createdByUserId === currentUser.id) return;
  
  // 3. Unlisted: require authentication OR participant status
  if (event.visibility === 'unlisted') {
    if (!currentUser) {
      throw new UnauthorizedError("Authentication required for unlisted events");
    }
    // Check if user is participant
    const isParticipant = await checkParticipantStatus(event.id, currentUser.id);
    if (isParticipant) return;
    
    // Check explicit access grant
    const hasAccess = await checkEventAccess(event.id, currentUser.id);
    if (hasAccess) return;
    
    throw new UnauthorizedError("Access denied to this event");
  }
  
  // 4. Restricted: require explicit access grant
  if (event.visibility === 'restricted') {
    if (!currentUser) {
      throw new UnauthorizedError("Authentication required");
    }
    
    const hasAccess = await checkEventAccess(event.id, currentUser.id);
    if (!hasAccess && options?.autoGrantAccessForRestricted) {
      await upsertEventAccess(event.id, currentUser.id, 'link');
    } else if (!hasAccess) {
      throw new UnauthorizedError("Access denied to this event");
    }
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

## 10. Type Safety Contracts

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

## 11. Change Process & Definition of Done

### Making Architectural Changes

**When you need to change architecture:**

1. **Update THIS document first** (docs/ARCHITECTURE.md)
2. **Get review** (if team > 1 person)
3. **Implement changes**
4. **Update related docs** (mark as "See ARCHITECTURE.md")
5. **Add migration notes** (if breaking changes)
6. **Commit with prefix:** `refactor:` or `arch:`

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
| `ensureAdminClient()` in every function | Code duplication | `getAdminDb()` wrapper |
| Inline visibility checks | Duplication, bugs | `lib/utils/eventVisibility.ts` |
| Direct DB access from API routes | Breaks layering | Use service layer |
| Server-only code in client components | Build breaks | Use API routes |
| `any` types | Loses type safety | Use proper types |
| Unvalidated API inputs | Security risk | Zod validation |
| Mixed caching strategies | Inconsistency | Use StaticCache |

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

## Appendix: Refactoring Roadmap

### Current Technical Debt

Based on [ARCHITECTURE_ANALYSIS_2024-12.md](../ARCHITECTURE_ANALYSIS_2024-12.md):

**Priority 1 (Critical):**
1. ⚠️ **STAGE 1:** Consolidate date/time utilities (`dates.ts` + `date-time.ts` → single module)
2. ⚠️ **STAGE 2:** Centralize DB client access (`ensureAdminClient()` duplication)
3. ⚠️ **STAGE 5:** Create price formatting utility (duplicated in 3 places)

**Priority 2 (High):**
4. ⚠️ **STAGE 3:** Merge hydration utilities (`hydration.ts` + `eventCategoryHydration.ts`)
5. ⚠️ **STAGE 4:** Remove visibility check duplication
6. ⚠️ **STAGE 6:** Unify caching strategy

**Expected outcome:** Code quality 7.5/10 → 8.5/10

See [REFACTORING_GUIDE.md](../REFACTORING_GUIDE.md) for implementation details.

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2024-12-25 | Initial creation as SSOT | AI Assistant |
| 2024-12-25 | Added ownership map and refactoring roadmap | AI Assistant |

---

**END OF ARCHITECTURE DOCUMENT**

*This is the Single Source of Truth for Need4Trip architecture. All other documents defer to this one.*

