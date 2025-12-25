# Need4Trip - Gap Analysis: Prescriptive Refactor

**Date:** 26 декабря 2024  
**Context:** После базового аудита (AUDIT_REPORT.md)  
**Scope:** 5 областей, НЕ покрытых первым аудитом

---

## 📋 Executive Summary

### Что УЖЕ сделано (AUDIT_REPORT.md)
✅ Repository layer migration (ensureAdminClient → getAdminDb)  
✅ API response consolidation (respondSuccess/respondError)  
✅ Critical billing enforcement fix  
✅ Базовая архитектурная чистка

### Что НЕ сделано (этот рефакторинг)
❌ Naming conventions & project structure  
❌ Client-side data fetching discipline  
❌ Duplication beyond repositories  
❌ Performance-critical paths optimization  
❌ Validation & error taxonomy

### Scope Границы
- **НЕ трогаем:** Repository layer (уже отрефакторен)
- **НЕ трогаем:** API response patterns (уже консолидированы)
- **ФОКУС:** 5 областей из prescriptive prompt

---

## SECTION 1: Naming & Project Structure

### Target State (Целевое состояние)

**File Naming:**
- Files: `kebab-case.ts` / `kebab-case.tsx`
- React components: `PascalCase` (inside kebab-case files)
- Hooks: `useXxx` (файл `use-xxx.ts`)
- Server actions: `verbNounAction` (файл `verb-noun-action.ts`)
- API routes: RESTful nouns, no verbs in path

**Domain Language (Single Vocabulary):**
- ✅ `event` (never `trip`)
- ✅ `publish` (single meaning: billing + visibility gate)
- ✅ `club`, `plan`, `subscription`, `credit`, `upgrade`
- ✅ `free` is a limits profile, NOT a subscription

### Current State (Текущее состояние)

**✅ GOOD (уже соответствует):**
- Все файлы уже в kebab-case ✅
- Hooks все используют `use-xxx` ✅
- API routes в правильном формате ✅
- Domain language консистентен ✅

**⚠️ MINOR ISSUES:**
1. **Console naming:** Некоторые компоненты используют `console.error/log` вместо `log.error()`
2. **Import aliases:** Не всегда используется `@/` алиас (иногда относительные пути)

### Action Plan (План действий)

#### 1.1 Standardize Logging (35 files)
**Priority:** LOW  
**Effort:** 2 hours  
**Risk:** LOW

**Pattern:**
```typescript
// ❌ BAD
console.error('[loadProfileData] Error:', error);
console.log('Debugging:', data);

// ✅ GOOD
import { log } from '@/lib/utils/logger';
log.error('[loadProfileData] Error', { error });
log.debug('Debugging', { data });
```

**Files (35 total):**
- src/lib/services/participants.ts
- src/lib/db/notificationQueueRepo.ts
- src/components/auth/auth-provider.tsx
- src/app/(app)/events/create/create-event-client.tsx
- src/components/profile/profile-page-client.tsx
- ... (see grep results)

**Exceptions (keep console):**
- `lib/utils/telegram-widget-debug.ts` (debug utility)
- `lib/utils/logger.ts` (fallback mechanism)
- `app/global-error.tsx` (critical error boundary)

#### 1.2 Создать NAMING_AND_STRUCTURE.md
**Priority:** LOW  
**Effort:** 1 hour

**Content:**
- File naming rules (kebab-case confirmed)
- Domain vocabulary (event/publish/club confirmed)
- Import conventions (@/ alias)
- Logging standards (log.xxx() over console)

**Commit:**
```bash
git add docs/NAMING_AND_STRUCTURE.md
git commit -m "docs: add naming and structure conventions (SECTION 1)

- Documented kebab-case standard (already applied)
- Domain vocabulary (event, publish, club, plan)
- Logging conventions (log.xxx() over console)
- Import alias rules (@/)

No code changes - documentation only"
```

### Deviation Count: **LOW** (консистентность хорошая)
- Основная структура уже соответствует правилам
- Единственная проблема: console.log вместо logger (легко исправить)

---

## SECTION 2: Client-Side Data Fetching Discipline

### Target State (Целевое состояние)

**Rules:**
1. No component fetches the same data twice in single render lifecycle
2. Reference data cached (memory, React cache, framework-level)
3. Mutations do NOT trigger blind refetch cascades
4. Server Components fetch authoritative data whenever possible
5. Client components consume via props or shared hooks
6. useEffect-based fetches have stable dependencies
7. No fetch-on-render patterns

### Current State (Текущее состояние)

**✅ GOOD:**
- StaticCache работает для reference data ✅
- useLoadingTransition для плавных переходов ✅
- useOptimistic для optimistic UI ✅
- Auth context предотвращает повторные запросы к /api/auth/me ✅

**❌ BAD (Violations):**

#### V1: Multiple fetch calls in single component

**Example:** `profile-page-client.tsx` (lines 133-137)
```typescript
useEffect(() => {
  loadProfileData();  // fetch /api/profile
  loadCars();         // fetch /api/profile/cars
  loadBrands();       // fetch /api/car-brands + /api/vehicle-types
}, []);
```

**Problem:**
- 3 separate useEffect calls
- No loading coordination
- No error handling

**Solution:** Consolidate into single data loader hook

#### V2: Client-side pages fetching data

**Files:**
- `src/app/(app)/events/page.tsx` (client component, fetches /api/events)
- `src/app/(app)/clubs/page.tsx` (client component, fetches /api/clubs)

**Problem:**
- Should be Server Components fetching data
- Client-side fetch adds latency + network overhead
- No SSR benefits

**Solution:** Convert to Server Components or create server-side data loader

#### V3: Repeated fetch patterns (no shared hook)

**Pattern found in:**
- `profile-page-client.tsx` → loadProfileData()
- `clubs/page.tsx` → loadClubs()
- `events/page.tsx` → loadData()

**Problem:**
- Each component implements own fetch logic
- No shared error handling
- No shared loading states

**Solution:** Create shared hooks:
- `useProfileData()` hook
- `useEvents()` hook
- `useClubs()` hook

### Action Plan (План действий)

#### 2.1 Create shared data fetching hooks
**Priority:** MEDIUM  
**Effort:** 4 hours  
**Risk:** MEDIUM

**Implementation:**

```typescript
// src/hooks/use-profile-data.ts
export function useProfileData() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to load profile');
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        setError(err.message);
        log.error('Failed to load profile', { error: err });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  
  return { data, loading, error };
}

// Similar for useEvents(), useClubs(), useProfileCars()
```

**Benefits:**
- Single source of truth for fetch logic
- Consistent error handling
- Easy to test
- Easy to add caching later

**Files to create:**
- `src/hooks/use-profile-data.ts`
- `src/hooks/use-events.ts`
- `src/hooks/use-clubs.ts`
- Update `src/hooks/index.ts` to export all

#### 2.2 Convert client pages to Server Components
**Priority:** HIGH  
**Effort:** 3 hours  
**Risk:** MEDIUM

**Pages to convert:**
- `app/(app)/events/page.tsx` → Server Component
- `app/(app)/clubs/page.tsx` → Server Component

**Pattern:**
```typescript
// ✅ Server Component (NEW)
export default async function EventsPage() {
  const events = await listEvents(); // Server-side fetch
  const currentUser = await getCurrentUser();
  
  return <EventsGridClient events={events} currentUser={currentUser} />;
}

// Client component only for interactivity
'use client';
function EventsGridClient({ events, currentUser }) {
  const [filtered, setFiltered] = useState(events);
  // ... client-side filtering, sorting
}
```

**Benefits:**
- SSR for better SEO
- Faster initial load (no client-side fetch)
- Reduced client bundle size

#### 2.3 Create CLIENT_FETCHING_MODEL.md
**Priority:** MEDIUM  
**Effort:** 2 hours

**Content:**
- Rules for Server vs Client data fetching
- When to use hooks vs props
- Cache strategy (StaticCache, React cache, SWR)
- Before/after call graphs for major flows

### Deviation Count: **MEDIUM** (6-8 violations)
- Multiple fetch patterns without shared hooks
- Some pages should be Server Components
- Loading states not coordinated

---

## SECTION 3: Duplication Beyond Repositories

### Target State (Целевое состояние)

**Rules:**
1. Business rules live in ONE place
2. Validation schemas are shared, not copy-pasted
3. UI patterns are componentized
4. Constants/enums: no string duplication
5. Zod schemas: single source, reused client/server

### Current State (Текущее состояние)

**✅ GOOD:**
- Hydration utilities consolidated ✅
- Date/time formatting centralized ✅
- Caching strategy unified ✅

**❌ BAD (Violations):**

#### V1: Inline date formatting (9 files)

**Files with toLocaleDateString:**
- src/components/events/event-form.tsx
- src/components/events/event-card-compact.tsx
- src/components/profile/profile-page-client.tsx (line 154)
- src/components/user-card.tsx
- src/components/clubs/club-members-list.tsx
- ... (9 total)

**Problem:**
```typescript
// ❌ BAD (9 occurrences)
new Date(user.createdAt).toLocaleDateString('ru-RU', {
  year: 'numeric',
  month: 'long'
})

// ✅ GOOD (use dates.ts)
import { formatDate } from '@/lib/utils/dates';
formatDate(user.createdAt, 'long') // or create formatJoinedDate()
```

**Solution:** Use `lib/utils/dates.ts` utilities EVERYWHERE

#### V2: Zod schemas duplicated (API vs Services)

**Files with inline schemas:**
- `src/app/api/events/[id]/registration/route.ts` - inline schema
- `src/app/api/billing/purchase-intent/route.ts` - inline schema
- `src/lib/services/participants.ts` - inline validation

**Problem:**
- Same validation rules in multiple places
- Hard to maintain (change one, forget others)
- No type reuse

**Solution:** Extract to `lib/types/schemas/*.ts`

```typescript
// lib/types/schemas/participant.ts
export const participantRegistrationSchema = z.object({
  eventId: z.string().uuid(),
  customFields: z.record(z.any()).optional(),
  carBrandId: z.string().uuid().optional(),
});

export type ParticipantRegistrationInput = z.infer<typeof participantRegistrationSchema>;

// Use in API route
import { participantRegistrationSchema } from '@/lib/types/schemas/participant';
const validated = participantRegistrationSchema.parse(await request.json());

// Use in service
import { type ParticipantRegistrationInput } from '@/lib/types/schemas/participant';
function registerParticipant(input: ParticipantRegistrationInput) { ... }
```

#### V3: Repeated UI patterns (not componentized)

**Examples:**
- Loading skeletons (multiple implementations)
- Error alerts (different styles)
- Empty states (no shared component)

**Files:**
- `src/app/(app)/events/page.tsx` - custom skeleton (lines 49-56)
- `src/app/(app)/clubs/page.tsx` - custom skeleton
- Multiple components with inline error handling

**Solution:** Create shared UI components:
- `<ListSkeleton />` (unified grid skeleton)
- `<ErrorAlert />` (consistent error display)
- `<EmptyState icon={X} title="..." description="..." />

### Action Plan (План действий)

#### 3.1 Fix inline date formatting (9 files)
**Priority:** LOW  
**Effort:** 1 hour  
**Risk:** LOW

**Process:**
1. Read each file
2. Replace `toLocaleDateString` with dates.ts utilities
3. Add `formatJoinedDate()` helper if needed
4. Visual regression test (screenshot before/after)

**Commit per file:**
```bash
git add src/components/profile/profile-page-client.tsx
git commit -m "refactor: use dates.ts for profile join date (SECTION 3.1)

- Replaced inline toLocaleDateString
- Use formatDate utility
- ARCHITECTURE.md Ownership Map compliant

Verified: Build ✅, Visual ✅"
```

#### 3.2 Extract Zod schemas to /lib/types/schemas
**Priority:** HIGH  
**Effort:** 2 hours  
**Risk:** LOW

**Files to create:**
- `src/lib/types/schemas/index.ts` (barrel export)
- `src/lib/types/schemas/participant.ts`
- `src/lib/types/schemas/billing.ts`
- `src/lib/types/schemas/event.ts` (if needed)

**Migration:**
1. Extract inline schemas
2. Update imports in API routes
3. Update imports in services
4. Verify TypeScript compilation

**Commit:**
```bash
git add src/lib/types/schemas src/app/api src/lib/services
git commit -m "refactor: extract Zod schemas to /lib/types/schemas (SECTION 3.2)

- Created shared schema modules
- Updated API routes to use shared schemas
- Updated services to use shared types
- Single source of truth for validation

Verified: TypeScript ✅, Build ✅"
```

#### 3.3 Create shared UI components
**Priority:** MEDIUM  
**Effort:** 3 hours  
**Risk:** LOW

**Components to create:**
- `src/components/ui/skeletons/list-skeleton.tsx` (grid skeleton)
- `src/components/ui/error-alert.tsx` (consistent errors)
- `src/components/ui/empty-state.tsx` (empty lists)

**Migration:**
1. Create components with proper props
2. Replace inline implementations
3. Visual regression test

**Commit per component:**
```bash
git add src/components/ui/skeletons/list-skeleton.tsx src/app
git commit -m "refactor: create shared ListSkeleton component (SECTION 3.3)

- Unified grid skeleton for events/clubs/etc
- Replaced 5 inline implementations
- Consistent loading UX

Verified: Build ✅, Visual ✅"
```

#### 3.4 Remove console.log (35 files)
**Priority:** LOW  
**Effort:** 2 hours  
**Risk:** LOW

**Process:**
1. Replace `console.error()` → `log.error()`
2. Replace `console.warn()` → `log.warn()`
3. Replace `console.log()` → `log.debug()` or remove
4. Keep console in debug utilities and error boundaries

**Commit:**
```bash
git add src
git commit -m "refactor: replace console.log with logger (SECTION 3.4)

- Replaced 35 console.* calls with log.*
- Kept console in debug utilities (telegram-widget-debug, logger fallback)
- Consistent structured logging

Verified: TypeScript ✅, Build ✅"
```

### Deviation Count: **HIGH** (50+ violations)
- 9 inline date formatting
- 3 duplicated Zod schemas
- 35 console.log statements
- Multiple repeated UI patterns

---

## SECTION 4: Performance-Critical Paths

### Target State (Целевое состояние)

**Rules:**
1. No obvious O(n) or repeated heavy work on critical paths
2. Client bundles minimal and predictable
3. Supabase queries explicit and indexed
4. No `select *` in production paths
5. No unbounded list queries without pagination/limits
6. Heavy UI (maps, calendars, editors) dynamically imported
7. Expensive calculations memoized or moved server-side

### Current State (Текущее состояние)

**✅ GOOD:**
- StaticCache for reference data ✅
- Hydration utilities prevent N+1 ✅
- Most pages have pagination ✅

**❌ BAD (Violations):**

#### V1: select * queries (16 occurrences)

**Files:**
- `src/lib/db/clubRepo.ts` (8 occurrences)
- `src/lib/db/participantRepo.ts` (8 occurrences)

**Problem:**
```typescript
// ❌ BAD (fetches ALL columns)
.select("*")
.eq("id", id)
.single();

// ✅ GOOD (explicit columns)
.select("id, name, description, created_at, city_id")
.eq("id", id)
.single();
```

**Impact:**
- Overfetching data (network + memory waste)
- Type safety reduced (TypeScript doesn't know which fields returned)
- Harder to spot missing indexes

**Solution:** Make all select() calls explicit

#### V2: N+1 query in getUserClubs (clubs.ts:323)

**Code:**
```typescript
// src/lib/services/clubs.ts:323-328
memberships.map(async (membership) => {
  const dbClub = await getClubById(membership.club_id); // ⚠️ N queries
  // ...
});
```

**Problem:**
- If user has 10 club memberships → 10 separate queries
- Should be 1 query with JOIN or WHERE IN

**Solution:**
```typescript
// ✅ GOOD (batch query)
const clubIds = memberships.map(m => m.club_id);
const clubs = await getClubsByIds(clubIds); // Single query with WHERE IN
```

#### V3: No dynamic imports for heavy components

**Heavy components:**
- Event form (large with validation)
- Map components (if any)
- Rich text editors (if any)

**Problem:**
- All loaded upfront in main bundle
- Increases initial page load time

**Solution:** Use dynamic imports

```typescript
// ✅ GOOD
const EventForm = dynamic(() => import('@/components/events/event-form'), {
  loading: () => <Skeleton />,
  ssr: false // if uses browser APIs
});
```

### Action Plan (План действий)

#### 4.1 Fix select * queries (16 occurrences)
**Priority:** HIGH  
**Effort:** 2 hours  
**Risk:** LOW

**Process:**
1. Read each function with select("*")
2. Determine which fields actually needed
3. Replace with explicit select
4. Update return types if needed

**Example:**
```typescript
// Before
const { data } = await db
  .from("clubs")
  .select("*")
  .eq("id", id)
  .single();

// After
const { data } = await db
  .from("clubs")
  .select("id, name, description, city_id, logo_url, created_at")
  .eq("id", id)
  .single();
```

**Commit per file:**
```bash
git add src/lib/db/clubRepo.ts
git commit -m "perf: make club queries explicit (SECTION 4.1)

- Replaced 8 select(*) with explicit columns
- Reduced overfetching
- Better type safety

Verified: TypeScript ✅, Build ✅, Manual test ✅"
```

#### 4.2 Fix N+1 in getUserClubs
**Priority:** MEDIUM  
**Effort:** 1 hour  
**Risk:** LOW

**Implementation:**
```typescript
// Add to clubRepo.ts
export async function getClubsByIds(ids: string[]): Promise<Club[]> {
  const db = getAdminDb();
  
  const { data, error } = await db
    .from("clubs")
    .select("id, name, description, city_id, logo_url")
    .in("id", ids);
  
  if (error) throw new InternalError("Failed to get clubs", error);
  return data ?? [];
}

// Update clubs service
const clubIds = memberships.map(m => m.club_id);
const clubs = await getClubsByIds(clubIds); // ✅ Single query
const clubsMap = new Map(clubs.map(c => [c.id, c]));

return memberships.map(m => ({
  ...m,
  club: clubsMap.get(m.club_id)
}));
```

**Commit:**
```bash
git add src/lib/db/clubRepo.ts src/lib/services/clubs.ts
git commit -m "perf: fix N+1 query in getUserClubs (SECTION 4.2)

- Added getClubsByIds() batch query
- Replaced loop of getClubById() calls
- Reduced queries from N to 1

Verified: TypeScript ✅, Build ✅, Manual test ✅"
```

#### 4.3 Add dynamic imports for heavy components
**Priority:** LOW  
**Effort:** 1 hour  
**Risk:** MEDIUM (can break SSR if not careful)

**Components to lazy load:**
- Event form (large)
- Profile edit form (large)
- Any map components

**Implementation:**
```typescript
import dynamic from 'next/dynamic';

const EventForm = dynamic(
  () => import('@/components/events/event-form'),
  {
    loading: () => <div className="h-96 animate-pulse bg-gray-200 rounded" />,
    ssr: true // or false if uses browser APIs
  }
);
```

**Commit:**
```bash
git add src/app
git commit -m "perf: add dynamic imports for heavy components (SECTION 4.3)

- Event form lazy loaded
- Profile form lazy loaded
- Reduced initial bundle size

Verified: Build ✅, Bundle analyzer ✅"
```

#### 4.4 Create PERFORMANCE_FINDINGS.md
**Priority:** MEDIUM  
**Effort:** 1 hour

**Content:**
- List of optimizations made
- Before/after metrics (if available)
- Bundle size analysis
- Query count analysis

### Deviation Count: **MEDIUM** (17 violations)
- 16 select * queries
- 1 N+1 query
- No critical performance bugs, but room for optimization

---

## SECTION 5: Validation & Error Taxonomy

### Target State (Целевое состояние)

**Validation:**
1. Client: UX-only validation (early feedback)
2. Server: authoritative validation (always enforced)
3. No duplicated business validation logic across layers

**Errors:**
1. Typed error shape used everywhere
2. Clear distinction:
   - 401 unauthenticated
   - 403 forbidden
   - 402 paywall
   - 409 conflict / confirmation required
   - 422 validation
   - 500 unexpected

### Current State (Текущее состояние)

**✅ GOOD:**
- API response utilities use typed errors ✅
- PaywallError (402) well-typed ✅
- respondError() handles error mapping ✅

**❌ BAD (Violations):**

#### V1: Validation schemas duplicated

**Already covered in SECTION 3.2** (Zod schemas)

#### V2: Error handling inconsistent in client components

**Files:**
- `src/components/profile/profile-page-client.tsx` (line 179)
- `src/app/(app)/events/page.tsx` (line 38)
- `src/app/(app)/clubs/page.tsx` (line 80)

**Problem:**
```typescript
// ❌ BAD (generic error handling)
} catch (error) {
  console.error('[loadProfileData] Error:', error);
  // No user feedback, no structured error
}

// ✅ GOOD (typed error handling)
} catch (err) {
  const error = err as ApiError;
  setError(error.message || 'Failed to load profile');
  log.error('[loadProfileData] Error', { error });
  // User sees feedback
}
```

**Solution:** Centralize error parsing and display

#### V3: No typed error interface for client

**Problem:**
- API returns errors in consistent shape (respondError)
- Client doesn't have typed interface for parsing

**Solution:** Create typed error interface

```typescript
// lib/types/errors.ts
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export function parseApiError(err: unknown): ApiError {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return err as ApiError;
  }
  
  if (err instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: err.message,
      statusCode: 500
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500
  };
}
```

### Action Plan (План действий)

#### 5.1 Create typed error interface
**Priority:** MEDIUM  
**Effort:** 1 hour  
**Risk:** LOW

**Files to create:**
- `src/lib/types/errors.ts` (ApiError interface + parseApiError)
- Update `src/lib/errors.ts` to export ApiError shape

**Implementation:**
```typescript
// lib/types/errors.ts
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Helper to parse fetch response
export async function parseApiResponse<T>(res: Response): Promise<T> {
  const json: ApiResponse<T> = await res.json();
  
  if (!json.success) {
    throw new ClientError(
      json.error.message,
      json.error.code,
      json.error.statusCode
    );
  }
  
  return json.data;
}

// Client-side error class
export class ClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ClientError';
  }
}
```

**Usage:**
```typescript
// In component
try {
  const res = await fetch('/api/profile');
  const data = await parseApiResponse<ProfileData>(res);
  setProfile(data);
} catch (err) {
  if (err instanceof ClientError) {
    if (err.statusCode === 401) {
      // Handle auth
    } else if (err.statusCode === 402) {
      // Show paywall
    }
    setError(err.message);
  }
}
```

**Commit:**
```bash
git add src/lib/types/errors.ts
git commit -m "feat: add typed error interface for client (SECTION 5.1)

- Created ApiError interface
- Added parseApiResponse helper
- ClientError class for type-safe error handling

Verified: TypeScript ✅, Build ✅"
```

#### 5.2 Standardize client error handling
**Priority:** MEDIUM  
**Effort:** 2 hours  
**Risk:** LOW

**Process:**
1. Update components to use parseApiResponse
2. Replace generic error handling with typed
3. Add user-facing error messages

**Example:**
```typescript
// Before
const loadProfileData = async () => {
  try {
    const res = await fetch('/api/profile');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    setUserData(data.user);
  } catch (error) {
    console.error(error);
  }
};

// After
const loadProfileData = async () => {
  try {
    const res = await fetch('/api/profile');
    const data = await parseApiResponse<{ user: User }>(res);
    setUserData(data.user);
  } catch (err) {
    if (err instanceof ClientError) {
      setError(err.message);
      log.error('Failed to load profile', { code: err.code });
    }
  }
};
```

**Commit per component:**
```bash
git add src/components/profile/profile-page-client.tsx
git commit -m "refactor: use typed error handling in profile (SECTION 5.2)

- Use parseApiResponse helper
- Type-safe error handling
- User-facing error messages

Verified: TypeScript ✅, Build ✅"
```

#### 5.3 Create ERROR_AND_VALIDATION_MODEL.md
**Priority:** MEDIUM  
**Effort:** 1 hour

**Content:**
- Error taxonomy (401/402/403/409/422/500)
- Validation strategy (client UX, server authoritative)
- Error handling patterns (parseApiResponse, ClientError)
- Examples of each error type

### Deviation Count: **LOW** (error structure already good)
- Main issue: client-side error parsing not typed
- ~10 components need standardized error handling

---

## 📊 Overall Deviation Summary

| Section | Priority | Deviation Count | Effort | Risk |
|---------|---------|----------------|--------|------|
| **1. Naming & Structure** | LOW | LOW (35 console.log) | 2h | LOW |
| **2. Client Fetching** | HIGH | MEDIUM (6-8 violations) | 7h | MEDIUM |
| **3. Duplication** | MEDIUM | HIGH (50+ violations) | 8h | LOW |
| **4. Performance** | HIGH | MEDIUM (17 violations) | 4h | LOW |
| **5. Errors & Validation** | MEDIUM | LOW (10 components) | 4h | LOW |
| **TOTAL** | - | **~90 violations** | **25h** | **LOW-MEDIUM** |

---

## 🎯 Recommended Execution Order

### Phase 1: Quick Wins (4 hours, LOW risk)
1. ✅ SECTION 3.1: Fix inline date formatting (9 files) - 1h
2. ✅ SECTION 3.4: Remove console.log (35 files) - 2h
3. ✅ SECTION 4.1: Fix select * queries (16 occurrences) - 2h

**Reasoning:** Low-hanging fruit, safe refactors

### Phase 2: High-Value Architecture (8 hours, MEDIUM risk)
4. ✅ SECTION 2.1: Create shared data fetching hooks - 4h
5. ✅ SECTION 2.2: Convert pages to Server Components - 3h
6. ✅ SECTION 3.2: Extract Zod schemas to /lib/types/schemas - 2h

**Reasoning:** Biggest architectural improvements

### Phase 3: Performance Optimization (4 hours, LOW risk)
7. ✅ SECTION 4.2: Fix N+1 in getUserClubs - 1h
8. ✅ SECTION 4.3: Add dynamic imports - 1h
9. ✅ SECTION 3.3: Create shared UI components - 3h

**Reasoning:** Visible performance gains

### Phase 4: Error Handling (4 hours, LOW risk)
10. ✅ SECTION 5.1: Create typed error interface - 1h
11. ✅ SECTION 5.2: Standardize client error handling - 2h
12. ✅ SECTION 1.1: Standardize logging (если ещё не сделано) - 2h

**Reasoning:** Better UX, easier debugging

### Phase 5: Documentation (3 hours, NO risk)
13. ✅ Create NAMING_AND_STRUCTURE.md
14. ✅ Create CLIENT_FETCHING_MODEL.md
15. ✅ Create PERFORMANCE_FINDINGS.md
16. ✅ Create ERROR_AND_VALIDATION_MODEL.md

**Reasoning:** Preserve knowledge, onboard future devs

---

## ✅ Success Criteria

### Code Quality
- [ ] No console.log in production code (except debug utils)
- [ ] All date formatting uses dates.ts
- [ ] All Zod schemas in /lib/types/schemas
- [ ] All select() queries explicit
- [ ] No N+1 queries

### Architecture
- [ ] Shared data fetching hooks exported from /hooks
- [ ] Pages use Server Components where possible
- [ ] Client components use parseApiResponse for errors
- [ ] Heavy components lazy loaded

### Documentation
- [ ] NAMING_AND_STRUCTURE.md created
- [ ] CLIENT_FETCHING_MODEL.md created
- [ ] PERFORMANCE_FINDINGS.md created
- [ ] ERROR_AND_VALIDATION_MODEL.md created

### Build & Deploy
- [ ] TypeScript compiles with no errors
- [ ] Production build succeeds
- [ ] ESLint passes
- [ ] Manual smoke tests pass
- [ ] Vercel deployment successful

---

## 🚨 Stop Conditions

**Stop and ask user if:**
1. Breaking change would affect production behavior
2. Server Component conversion breaks existing features
3. TypeScript errors can't be resolved
4. Vercel build fails
5. Any critical functionality stops working

**Do NOT:**
- Skip verification steps
- Commit broken builds
- Change SSOT documents without updating code
- Introduce new concepts not in prescriptive prompt

---

## 📝 Commit Strategy

**Atomic commits per fix:**
```bash
# Pattern
git add [files]
git commit -m "refactor: [description] (SECTION X.Y)

- Change 1
- Change 2
- Compliance with [SSOT]

Verified: TypeScript ✅, Build ✅, [Test] ✅"
```

**After each phase:**
```bash
git tag refactor-phase-N-complete
git push origin main --tags
```

---

**Last Updated:** 26 Dec 2024  
**Status:** Ready for execution  
**Next Step:** START Phase 1 (Quick Wins)

