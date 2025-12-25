# Client-Side Data Fetching Model — SSOT

**Version:** 1.0  
**Date:** 25 декабря 2024  
**Status:** ✅ Enforced

---

## 🎯 Purpose

This document defines the **mandatory client-side data fetching patterns** for Need4Trip.

**Goals:**
- Single fetch per data type per lifecycle
- Consistent loading/error states
- Type-safe responses
- No fetch-on-render anti-patterns

---

## 📋 Core Principles

### 1. Server Components First

**Rule:** Fetch data in Server Components whenever possible (Next.js App Router)

✅ **Good:**
```typescript
// src/app/(app)/events/[id]/page.tsx (Server Component)
export default async function EventDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventWithVisibility(id, { currentUser });
  return <EventDetailsClient event={event} />;
}
```

❌ **Bad:**
```typescript
// Client component fetching on mount
"use client";
export default function EventDetails({ id }: { id: string }) {
  const [event, setEvent] = useState(null);
  useEffect(() => {
    fetch(`/api/events/${id}`).then(...);
  }, [id]);
}
```

**Why:** Server Components fetch at build/request time, reducing client bundle and eliminating loading states.

---

### 2. Use Canonical Data Fetching Hooks

**Rule:** All client-side fetches MUST use centralized hooks from `/hooks`

**Available Hooks:**

| Hook | Purpose | Returns |
|------|---------|---------|
| `useProfileData()` | Profile + cars + brands | `{ profileData, carsData, brandsData, loading, error, reload }` |
| `useProfileDataOnly()` | Profile only | `{ data, loading, error }` |
| `useCarsData()` | Cars only | `{ data, loading, error }` |
| `useEventsData(options)` | Events with filters | `{ events, total, loading, error, reload }` |
| `useClubsData(options)` | Clubs with search/city | `{ clubs, total, loading, error, reload }` |
| `useClubData(clubId)` | Single club by ID | `{ club, loading, error, reload }` |

**Created:** 25 декабря 2024 (3 hooks: 647 lines total)

---

### 3. No Fetch-on-Render

**Rule:** NEVER fetch data in render logic (causes infinite loops)

❌ **Anti-pattern:**
```typescript
function Component() {
  const [data, setData] = useState(null);
  
  // ❌ WRONG: Fetches on every render
  if (!data) {
    fetch('/api/data').then(setData);
  }
  
  return <div>{data}</div>;
}
```

✅ **Correct:**
```typescript
function Component() {
  const { data, loading, error } = useProfileData();
  
  if (loading) return <Skeleton />;
  if (error) return <ErrorAlert message={error} />;
  return <div>{data}</div>;
}
```

---

### 4. Stable Dependencies in useEffect

**Rule:** All `useEffect` dependencies must be stable (primitives, refs, or memoized)

❌ **Bad:**
```typescript
useEffect(() => {
  loadData({ filter: filters }); // filters object changes every render
}, [filters]); // Infinite loop!
```

✅ **Good:**
```typescript
const filterStr = JSON.stringify(filters); // Stable primitive
useEffect(() => {
  loadData(JSON.parse(filterStr));
}, [filterStr]);

// OR use hook with stable API
const { data } = useEventsData({ cityId, page }); // Primitives only
```

---

### 5. Single Fetch Per Resource

**Rule:** Don't fetch the same data multiple times in a single page lifecycle

❌ **Bad:**
```typescript
function Page() {
  return (
    <>
      <Header userId={userId} /> {/* Fetches user */}
      <Profile userId={userId} /> {/* Fetches user again! */}
      <Sidebar userId={userId} /> {/* Fetches user again! */}
    </>
  );
}
```

✅ **Good (Option 1: Server Component):**
```typescript
async function Page() {
  const user = await getCurrentUser(); // Fetched once on server
  return (
    <>
      <Header user={user} />
      <Profile user={user} />
      <Sidebar user={user} />
    </>
  );
}
```

✅ **Good (Option 2: Shared Hook):**
```typescript
function Page() {
  const { profileData } = useProfileData(); // Fetched once
  return (
    <>
      <Header user={profileData?.user} />
      <Profile user={profileData?.user} />
      <Sidebar user={profileData?.user} />
    </>
  );
}
```

---

## 🔧 Hook Architecture

### Standard Hook Pattern

All data fetching hooks follow this structure:

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
        
        if (!mounted) return; // Prevent state updates after unmount
        
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
- ✅ `reload()` function for manual refetch
- ✅ Stable dependencies (no infinite loops)

---

## 📊 Before/After Comparison

### Profile Page (before)

```typescript
// src/components/profile/profile-page-client.tsx (old)
const [userData, setUserData] = useState(...);
const [cars, setCars] = useState([]);
const [brands, setBrands] = useState([]);

useEffect(() => {
  loadProfileData(); // 1st fetch
  loadCars();        // 2nd fetch
  loadBrands();      // 3rd fetch
}, []);

const loadProfileData = async () => {
  const res = await fetch('/api/profile');
  if (!res.ok) throw new Error('Failed');
  const data = await res.json();
  setUserData(data.user);
};

const loadCars = async () => {
  const res = await fetch('/api/profile/cars');
  const data = await res.json();
  if (data.success) setCars(data.data.cars);
};

const loadBrands = async () => {
  const [brandsRes, typesRes] = await Promise.all([...]);
  // ...
};
```

**Issues:**
- ❌ 3 separate fetch functions
- ❌ Inconsistent error handling
- ❌ No type safety
- ❌ Manual state management
- ❌ No cleanup on unmount

---

### Profile Page (after)

```typescript
// src/components/profile/profile-page-client.tsx (new)
const { profileData, carsData, brandsData, loading, error } = useProfileData();

if (loading) return <ProfileSkeleton />;
if (error) return <ErrorAlert message={error} />;

return <ProfileView data={profileData} cars={carsData} brands={brandsData} />;
```

**Benefits:**
- ✅ Single hook call
- ✅ Parallel fetches (4 requests → 1 hook)
- ✅ Type-safe responses
- ✅ Consistent error handling
- ✅ Automatic cleanup
- ✅ -60 lines of code

---

## 🚫 Anti-Patterns to Avoid

### 1. Manual res.ok Checks

❌ **Bad:**
```typescript
const res = await fetch('/api/data');
if (!res.ok) {
  throw new Error('Failed');
}
const data = await res.json();
```

✅ **Good:**
```typescript
const res = await fetch('/api/data');
const data = await parseApiResponse<DataType>(res); // Throws ClientError
```

---

### 2. Inconsistent Error Handling

❌ **Bad:**
```typescript
catch (error) {
  console.error('Failed:', error); // No user feedback
}
```

✅ **Good:**
```typescript
catch (err) {
  if (err instanceof ClientError) {
    setError(getErrorMessage(err));
    log.error('[Component] Failed', { code: err.code });
  }
}
```

---

### 3. No Cleanup on Unmount

❌ **Bad:**
```typescript
useEffect(() => {
  const load = async () => {
    const data = await fetch(...);
    setState(data); // May set state after unmount → memory leak
  };
  load();
}, []);
```

✅ **Good:**
```typescript
useEffect(() => {
  let mounted = true;
  
  const load = async () => {
    const data = await fetch(...);
    if (mounted) setState(data); // Safe
  };
  
  load();
  return () => { mounted = false; }; // Cleanup
}, []);
```

---

### 4. Duplicate Fetches

❌ **Bad:**
```typescript
// Component A
const { data: events } = useEventsData({ cityId });

// Component B (same page)
const { data: events } = useEventsData({ cityId }); // Duplicate fetch!
```

✅ **Good:**
```typescript
// Parent component
const { events } = useEventsData({ cityId }); // Fetch once

// Pass data down
<ComponentA events={events} />
<ComponentB events={events} />
```

---

## 📖 Usage Examples

### Example 1: Events List

```typescript
"use client";
import { useEventsData } from "@/hooks";

export function EventsPage() {
  const [cityId, setCityId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  
  const { events, total, loading, error, reload } = useEventsData({
    cityId,
    page,
    limit: 20
  });
  
  if (loading) return <EventsSkeleton />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;
  
  return (
    <>
      <CityFilter value={cityId} onChange={setCityId} />
      <EventsGrid events={events} />
      <Pagination page={page} total={total} onChange={setPage} />
    </>
  );
}
```

---

### Example 2: Club Context

```typescript
"use client";
import { useClubData } from "@/hooks";

export function CreateEventPage({ clubId }: { clubId?: string }) {
  const { club, loading, error } = useClubData(clubId);
  
  if (loading) return <ClubSkeleton />;
  if (error) return <ErrorAlert message={error} />;
  
  return <EventForm club={club} />;
}
```

---

### Example 3: Profile with Multiple Data Sources

```typescript
"use client";
import { useProfileData } from "@/hooks";

export function ProfilePage() {
  const { profileData, carsData, brandsData, loading, error } = useProfileData();
  
  if (loading) return <ProfileSkeleton />;
  if (error) return <ErrorAlert message={error} />;
  
  return (
    <>
      <ProfileHeader user={profileData.user} />
      <ProfileStats stats={profileData.stats} />
      <CarsSection cars={carsData.cars} brands={brandsData.brands} />
    </>
  );
}
```

---

## 🔄 Migration Checklist

When migrating a component from manual fetch to hooks:

- [ ] Identify fetch calls (search for `fetch('/api/...`)
- [ ] Check if canonical hook exists (see table above)
- [ ] If not, create new hook following standard pattern
- [ ] Replace manual state + fetch with hook call
- [ ] Remove `useState` for data/loading/error
- [ ] Remove `useEffect` with fetch logic
- [ ] Replace `console.error` with structured logging
- [ ] Update error handling to use `ClientError`
- [ ] Test loading, success, and error states
- [ ] Verify no memory leaks (check cleanup on unmount)
- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Commit: "refactor: migrate [component] to [hook]"

---

## 📊 Current Status

### Hooks Created ✅

| Hook | Lines | Status | Migrated Components |
|------|-------|--------|---------------------|
| `useProfileData` | 241 | ✅ Active | profile-page-client |
| `useEventsData` | 132 | ✅ Active | events/page |
| `useClubsData` | 136 | ✅ Active | clubs/page |
| `useClubData` | 120 | ✅ Active | create-event-page-content |
| **TOTAL** | **629** | **4 hooks** | **4 pages** |

---

### Components Status

| Component | Before | After | Status |
|-----------|--------|-------|--------|
| profile-page-client.tsx | Manual (3 fetches) | useProfileData | ✅ Migrated |
| events/page.tsx | Manual | useEventsData | ✅ Migrated |
| clubs/page.tsx | Manual | useClubsData | ✅ Migrated |
| create-event-page-content.tsx | Manual | useClubData | ✅ Migrated |
| notification-settings-form.tsx | Manual | N/A (form-specific) | ⏸️ Kept |
| profile/edit/page.tsx | Manual | N/A (form-specific) | ⏸️ Kept |

**Note:** Form components (notification-settings, profile/edit) use PATCH/POST requests with specific payloads, not suitable for generic hooks.

---

## 🔗 Related Documents

- `src/lib/types/errors.ts` — ClientError, parseApiResponse
- `src/hooks/` — All data fetching hooks
- `docs/ARCHITECTURE.md` — Layered architecture, ownership map

---

**Last Updated:** 25 декабря 2024  
**Next Review:** When adding new data fetching patterns

