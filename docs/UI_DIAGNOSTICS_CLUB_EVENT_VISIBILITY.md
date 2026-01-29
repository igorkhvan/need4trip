# UI Diagnostics — Club Event Visibility

**Date:** 2026-01-29  
**Phase:** C (POST Phase B Backend Fixes)  
**Scope:** All UI code paths rendering club events  
**SSOT Reference:** SSOT_CLUBS_DOMAIN.md §4.5

---

> **⚠️ PARTIAL OBSOLESCENCE NOTE (2026-01-29):**
> 
> **API-057 (`GET /api/clubs/[id]/events`) has been REMOVED** in Phase L2.1.
> 
> All findings related to "non-canonical endpoint" usage in this document are now RESOLVED.
> The endpoint no longer exists — UI cannot use it.
> 
> **Issue #1 (CRITICAL)** in this audit is CLOSED by endpoint removal.
> 
> See: SSOT_API.md v1.7.7, ARCHITECTURAL_DEBT_LOG.md DEBT-007 (CLOSED)

---

## Summary

| Metric | Value |
|--------|-------|
| **Overall Status** | ⚠️ ISSUES FOUND |
| **UI Paths Checked** | 7 |
| **Issues Found** | 2 |
| **Critical Issues** | 1 |
| **Medium Issues** | 1 |

### Key Findings

1. **CRITICAL:** `ClubEventsContent` (full events list) uses **non-canonical endpoint** `GET /api/clubs/[id]/events` instead of canonical `GET /api/events?clubId=...`

2. **MEDIUM:** Different endpoints used for same club's events → potential visibility inconsistency between preview and full list

3. **OK:** No client-side visibility filtering detected — UI correctly relies on backend

---

## Diagnostics Table

| UI Surface | Component | Endpoint Used | clubId Passed | Client Filtering | Status | Notes |
|-----------|-----------|---------------|---------------|------------------|--------|------|
| Club Card | `club-card.tsx` | N/A (static data) | N/A | ❌ None | ✅ OK | Only shows eventCount from props |
| Club Page Events Preview | `club-events-preview-async.tsx` | `GET /api/events?clubId=...` | ✅ YES | ❌ None | ✅ OK | Canonical endpoint |
| Club Page "All Events" | `club-events-content.tsx` | `GET /api/clubs/${clubId}/events` | ✅ (path param) | ❌ None | ❌ ERROR | **Non-canonical endpoint** |
| Single Event Page | `/events/[id]/page.tsx` | `getEventBasicInfo()` | N/A | ❌ None | ✅ OK | Server-side visibility |
| Events Grid (global) | `events-page-client.tsx` | `GET /api/events?...` | ❌ (optional) | ❌ None | ✅ OK | Canonical endpoint |
| Participants List | `participants-async.tsx` | `listParticipants()` (direct) | N/A | ❌ None | ✅ OK | Server-side only |
| Club Events List | `club-events-list.tsx` | N/A (receives data) | N/A | ❌ None | ✅ OK | Presentational only |

---

## Detailed Findings

### 1. Club Card (`src/components/clubs/club-card.tsx`)

**Components involved:**
- `ClubCard`

**Data Source:**
- Receives `club` object as props (no direct API call)
- `club.eventCount` is pre-populated by parent

**Endpoint:**
- N/A — Does not fetch events

**Client-side Filtering:**
- ❌ None

**Status:** ✅ OK

**Notes:**
- Purely presentational component
- Event count is absolute per SSOT §4.4 (not access-controlled)

---

### 2. Club Page Events Preview (`src/app/(app)/clubs/[id]/_components/club-events-preview-async.tsx`)

**Components involved:**
- `ClubEventsPreviewAsync`

**Data Source:**
```typescript
// Line 32-34
const res = await internalApiFetch(
  `/api/events?clubId=${clubId}&tab=upcoming&limit=3`
);
```

**Endpoint:**
- ✅ `GET /api/events?clubId=${clubId}&tab=upcoming&limit=3` — **CANONICAL**

**Query Params:**
- `clubId`: ✅ Passed correctly
- `tab`: `upcoming` (filters future events)
- `limit`: `3` (preview count)

**Client-side Filtering:**
- ❌ None — Uses `json.events || []` directly

**Empty State Logic:**
```typescript
// Line 75-78
{eventsList.length === 0 ? (
  <p>У клуба пока нет предстоящих событий</p>
) : (
  // ...render events
)}
```

**Status:** ✅ OK

**Notes:**
- Correctly uses canonical endpoint
- Empty state is neutral ("no upcoming events")
- Uses `internalApiFetch` for proper cookie forwarding per ADR-001

---

### 3. Club Page "All Events" Section (`src/app/(app)/clubs/[id]/events/_components/club-events-content.tsx`)

**Components involved:**
- `ClubEventsContent`
- `ClubEventsList`
- `ClubEventsHeader`

**Data Source:**
```typescript
// Line 72
const response = await fetch(`/api/clubs/${clubId}/events?limit=50`);
```

**Endpoint:**
- ❌ `GET /api/clubs/${clubId}/events?limit=50` — **NON-CANONICAL**

**Query Params:**
- `clubId`: ✅ Passed as path parameter
- `limit`: `50`

**Client-side Filtering:**
- ❌ None — Uses `data.events || []` directly

**Empty State Logic:**
```typescript
// Line 131-174
if (events.length === 0) {
  return (
    // "Пока нет событий" + optional Create button for owner/admin
  );
}
```

**Status:** ❌ **ERROR — NON-CANONICAL ENDPOINT**

**Issues:**

1. **Contract Violation:** Per SSOT_API.md and task instructions:
   > "Non-canonical endpoint GET /api/clubs/[id]/events MUST NOT be used by UI"

2. **Semantic Difference:**
   - Canonical `/api/events?clubId=...` calls `listVisibleEventsForUserPaginated()` with full SSOT §4.5 visibility
   - Non-canonical `/api/clubs/[id]/events` calls `listClubEventsRepo()` directly (no visibility filter)

3. **Potential Inconsistency:**
   | Endpoint | For Members | For Non-Members Public Club | For Non-Members Private Club |
   |----------|-------------|-----------------------------|-----------------------------|
   | `/api/events?clubId=...` | All events | Public events only | Empty result |
   | `/api/clubs/[id]/events` | All events | 403 Forbidden | 403 Forbidden |

   For members: Same behavior.
   For non-members: **DIFFERENT behavior** — canonical returns public events for public clubs, non-canonical returns 403.

4. **Authorization Discrepancy:**
   - Non-canonical endpoint requires authentication + membership
   - Canonical endpoint allows anonymous access (for public clubs, sees public events)

**Root Cause Analysis:**
- The Club Events page (`/clubs/[id]/events/page.tsx`) already enforces membership check at page level (line 74-86)
- So `ClubEventsContent` only renders for members
- But using non-canonical endpoint violates architectural contract

---

### 4. Single Event Page (`src/app/(app)/events/[id]/page.tsx`)

**Components involved:**
- `EventDetails` (page component)
- `EventParticipantsAsync`
- `ParticipantsTableClient`

**Data Source:**
```typescript
// Line 52-55
const event = await getEventBasicInfo(id, {
  currentUser,
  enforceVisibility: true
});
```

**Endpoint:**
- Direct service call (`getEventBasicInfo`) — Server-side rendering

**Client-side Filtering:**
- ❌ None — All filtering is server-side

**Error Handling:**
```typescript
// Line 57
if (!event) return notFound();
```

**Status:** ✅ OK (from UI perspective)

**Notes:**
- UI correctly handles 404 via `notFound()`
- Backend audit (Phase B) identified visibility issues in `canViewEvent()`, but that's backend scope
- UI does NOT apply additional visibility filtering — correct behavior

---

### 5. Events Grid / Events Page (`src/components/events/events-page-client.tsx`)

**Components involved:**
- `EventsPageClient`
- `EventsGrid`
- `EventCardDetailed`

**Data Source:**
```typescript
// useEventsQuery hook, line 65
const response = await fetch(`/api/events?${params.toString()}`, {
  cache: 'no-store',
  signal: abortController.signal,
});
```

**Endpoint:**
- ✅ `GET /api/events?...` — **CANONICAL**

**Query Params:**
- Forwarded from URL search params
- `clubId`: Optional (only when filtered by club)
- `tab`, `page`, `limit`, `sort`, `search`, `cityId`, `categoryId`

**Client-side Filtering:**
- ❌ None — Uses `data.events` directly

**Empty State Logic:**
```typescript
// events-grid.tsx, line 299-315
events.length === 0 ? (
  <div>
    <h3>Ничего не найдено</h3>
    <p>Попробуйте изменить поисковый запрос или фильтр</p>
    <Button onClick={...}>Сбросить поиск</Button>
  </div>
) : (
  // ...render events
)
```

**Status:** ✅ OK

**Notes:**
- Canonical endpoint usage
- Empty state has neutral copy and retry action
- No visibility-based client filtering

---

### 6. Participants List (`src/app/(app)/events/[id]/_components/participants-async.tsx`)

**Components involved:**
- `EventParticipantsAsync`
- `ParticipantsTableClient`

**Data Source:**
```typescript
// Line 34
const dbParticipants = await listParticipants(eventId);
```

**Endpoint:**
- Direct repository call (`listParticipants`) — Server-side rendering

**Client-side Filtering:**
- ❌ None — Uses participants directly from DB

**Status:** ✅ OK (from UI perspective)

**Notes:**
- Server-side only; visibility is handled at page level
- No additional client-side filtering

---

### 7. Club Events List Component (`src/app/(app)/clubs/[id]/events/_components/club-events-list.tsx`)

**Components involved:**
- `ClubEventsList`

**Data Source:**
- Receives `events` array as props from `ClubEventsContent`

**Endpoint:**
- N/A — Presentational component only

**Client-side Filtering:**
- ❌ None — Renders all received events

**Status:** ✅ OK

**Notes:**
- Purely presentational
- Correctly renders whatever events are passed

---

## Client-Side Filtering Audit

### Search Patterns Checked

| Pattern | Files Found | Result |
|---------|-------------|--------|
| `visibility` in .tsx | 37 matches | Only UI for visibility SELECT inputs |
| `isPublic` | 0 matches | Not used |
| `event.visibility` | Form components only | Selection, not filtering |
| `.filter(.*event` | 0 matches | No array filtering |
| `events.filter` | 0 matches | No array filtering |

### Conclusion

**No client-side visibility filtering detected.** All checked components render events exactly as received from API.

---

## Empty State Analysis

| Component | Condition | Copy | Status |
|-----------|-----------|------|--------|
| ClubEventsPreviewAsync | `eventsList.length === 0` | "У клуба пока нет предстоящих событий" | ✅ Neutral |
| ClubEventsContent | `events.length === 0` | "Пока нет событий" | ✅ Neutral |
| EventsGrid | `events.length === 0` | "Ничего не найдено" | ✅ Neutral |

**All empty states are correctly triggered by `response.length === 0`** — not by derived conditions or client-side filtering.

---

## Conclusions

### Root Causes

| # | Issue | Root Cause | Impact |
|---|-------|------------|--------|
| 1 | Non-canonical endpoint in ClubEventsContent | Direct usage of `/api/clubs/[id]/events` instead of `/api/events?clubId=...` | Violates architectural contract; different semantics for non-members |
| 2 | Potential preview/full-list mismatch | Two different endpoints for same club's events | Preview uses canonical (correct), full list uses non-canonical |

### Issue Classification

| Issue | Type | Fix Scope |
|-------|------|-----------|
| ClubEventsContent endpoint | UI-only | Change fetch URL |
| Visibility semantics | Contract mismatch | Already handled by Phase B backend |

### Recommendations for Next Action

1. **FIX REQUIRED:** Update `club-events-content.tsx` to use canonical endpoint:
   ```typescript
   // Current (NON-CANONICAL):
   const response = await fetch(`/api/clubs/${clubId}/events?limit=50`);
   
   // Should be (CANONICAL):
   const response = await fetch(`/api/events?clubId=${clubId}&limit=50`);
   ```

2. **VERIFY:** After fix, test that:
   - Club members see all club events (public/unlisted/restricted)
   - Non-members of public clubs see only public events
   - Non-members of private clubs see empty result (not 403)

3. **NO FIX NEEDED:** All other UI paths are correct.

---

## Appendix: Component File Paths

| Component | File Path |
|-----------|-----------|
| ClubCard | `src/components/clubs/club-card.tsx` |
| ClubEventsPreviewAsync | `src/app/(app)/clubs/[id]/_components/club-events-preview-async.tsx` |
| ClubEventsContent | `src/app/(app)/clubs/[id]/events/_components/club-events-content.tsx` |
| ClubEventsList | `src/app/(app)/clubs/[id]/events/_components/club-events-list.tsx` |
| ClubEventsPage | `src/app/(app)/clubs/[id]/events/page.tsx` |
| EventDetails | `src/app/(app)/events/[id]/page.tsx` |
| EventsPageClient | `src/components/events/events-page-client.tsx` |
| EventsGrid | `src/components/events/events-grid.tsx` |
| ParticipantsAsync | `src/app/(app)/events/[id]/_components/participants-async.tsx` |
| useEventsQuery | `src/hooks/use-events-query.ts` |

---

**END OF UI DIAGNOSTICS REPORT**
