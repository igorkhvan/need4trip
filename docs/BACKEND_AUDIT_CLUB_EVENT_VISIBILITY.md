# Backend Audit — Club Event Visibility (SSOT §4.5)

**Date:** 2026-01-29  
**Auditor:** AI Assistant  
**SSOT Reference:** SSOT_CLUBS_DOMAIN.md §4.5 (v1.5.1)  
**Scope:** All backend READ paths that return event data or reveal event existence

---

## Summary

### High-Level Findings

| Category | Count | Notes |
|----------|-------|-------|
| **Compliant** | 3 | Canonical listing, counts, cron |
| **Non-Compliant** | 3 | Single event read, participants, derived reads |
| **Partial** | 1 | Non-canonical club endpoint (different semantic) |

### Key Risks

1. **CRITICAL:** Single event read (`GET /api/events/[id]`) does NOT enforce club membership visibility rules. Non-members can access private club events by direct URL.

2. **CRITICAL:** Participants endpoint (`GET /api/events/[id]/participants`) inherits the same vulnerability — leaks participant data for private club events.

3. **HIGH:** Event visibility helper (`eventVisibility.ts`) only implements personal visibility (public/unlisted/restricted), NOT club-scoped visibility per SSOT §4.5.

4. **MEDIUM:** Auth resolution inconsistency — some endpoints use legacy `getCurrentUser()` instead of canonical `resolveCurrentUser(req)` per ADR-001.1.

5. **MEDIUM:** Existence leakage — 403 response reveals event existence; should return 404 for unauthorized club events.

---

## Audit Table

| Endpoint / Function | File | Lines | Current Behavior | SSOT §4.5 Compliant | Risk | Notes |
|---------------------|------|-------|------------------|---------------------|------|-------|
| GET /api/events | `src/app/api/events/route.ts` | 39-81 | Calls `listVisibleEventsForUserPaginated` with club visibility | ✅ YES | LOW | Canonical endpoint, correct implementation |
| GET /api/events/[id] | `src/app/api/events/[id]/route.ts` | 14-29 | Calls `getEventWithVisibility` — NO club membership check | ❌ NO | **CRITICAL** | Missing club-scoped visibility |
| GET /api/events/[id]/participants | `src/app/api/events/[id]/participants/route.ts` | 15-33 | Calls `getEventWithVisibility` — NO club membership check | ❌ NO | **CRITICAL** | Leaks participant data |
| GET /api/clubs/[id]/events | `src/app/api/clubs/[id]/events/route.ts` | 54-139 | Members-only, denies non-members completely | ⚠️ PARTIAL | MEDIUM | Non-canonical; doesn't allow public events for public clubs |
| `listVisibleEventsForUserPaginated` | `src/lib/services/events.ts` | 1077-1181 | Implements `resolveClubEventVisibility` correctly | ✅ YES | LOW | Correct implementation |
| `resolveClubEventVisibility` | `src/lib/services/events.ts` | 1199-1242 | Full SSOT §4.5 decision table | ✅ YES | LOW | Reference implementation |
| `canViewEvent` | `src/lib/utils/eventVisibility.ts` | 50-119 | Personal visibility ONLY (public/unlisted/restricted) | ❌ NO | **CRITICAL** | Missing club-scoped rules |
| `enforceEventVisibility` | `src/lib/utils/eventVisibility.ts` | 232-249 | Delegates to `canViewEvent` — same issue | ❌ NO | **CRITICAL** | Inherits non-compliance |
| `countClubEvents` | `src/lib/db/eventRepo.ts` | 422-437 | Absolute count, no visibility filter | ✅ YES | LOW | §4.4: counts are absolute |
| `countActiveClubEvents` | `src/lib/db/eventRepo.ts` | 442-460 | Absolute count, no visibility filter | ✅ YES | LOW | §4.4: counts are absolute |
| `/api/cron/process-notifications` | `src/app/api/cron/process-notifications/route.ts` | 52-115 | System context, queue-based | ✅ N/A | LOW | Recipients filtered at queue time |

---

## Detailed Findings

### 1. GET /api/events/[id] (Single Event Read)

**File:** `src/app/api/events/[id]/route.ts`  
**Lines:** 14-29

**Current Logic:**

```typescript
export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    const event = await getEventWithVisibility(id, {
      currentUser,
      enforceVisibility: true,
    });
    const hydrated = await hydrateEvent(event);
    return respondJSON({ event: hydrated });
  } catch (err) {
    return respondError(err);
  }
}
```

**SSOT §4.5 Alignment:**

| Requirement | Implemented | Notes |
|-------------|-------------|-------|
| Member sees all club events | ❌ | No membership check |
| Non-member private club: NO events | ❌ | Returns event if visibility=public |
| Non-member public club: public only | ❌ | No club visibility filter |
| Pending = non-member | ❌ | No pending check |

**Issues:**

1. Uses `getCurrentUser()` (legacy) instead of `resolveCurrentUser(req)` (canonical per ADR-001.1)
2. `getEventWithVisibility()` → `enforceEventVisibility()` → `canViewEvent()` does NOT check:
   - Whether event is a club event (`event.clubId`)
   - Viewer's club membership role
   - Club visibility (public/private)
3. Returns 403 for unauthorized access → reveals event existence (should be 404)

**Behavior Analysis:**

| Viewer | Club Visibility | Event Visibility | Current | Expected (§4.5) |
|--------|-----------------|------------------|---------|-----------------|
| Member | any | any | ✅ via personal | ✅ |
| Pending | private | any | ❌ 403 | ❌ 404 |
| Pending | public | public | ✅ | ✅ |
| Pending | public | non-public | ❌ 403 | ❌ 404 |
| Guest | private | any | ❌ 403 | ❌ 404 |
| Guest | public | public | ✅ | ✅ |
| Guest | public | non-public | ❌ 403 | ❌ 404 |

**Risk:** CRITICAL — Information disclosure vulnerability for private club events.

---

### 2. GET /api/events/[id]/participants

**File:** `src/app/api/events/[id]/participants/route.ts`  
**Lines:** 15-33

**Current Logic:**

```typescript
export async function GET(_: Request, context: Params) {
  try {
    const { id } = await context.params;
    const currentUser = await getCurrentUser();
    
    const [participants] = await Promise.all([
      listParticipantsRepo(id).then(rows => rows.map(mapDbParticipantToDomain)),
      getEventWithVisibility(id, { currentUser, enforceVisibility: true })
    ]);
    
    return respondJSON({ participants });
  } catch (err) {
    return respondError(err);
  }
}
```

**SSOT §4.5 Alignment:**

Inherits all issues from single event read. Additionally:

- Loads participants BEFORE visibility check completes (parallel Promise.all)
- If visibility check fails, error is thrown but participants were already queried

**Issues:**

1. Same visibility gap as GET /api/events/[id]
2. Uses `getCurrentUser()` (legacy)
3. Participant data leakage for private club events

**Risk:** CRITICAL — Leaks sensitive participant information.

---

### 3. GET /api/clubs/[id]/events (API-057, Non-Canonical)

**File:** `src/app/api/clubs/[id]/events/route.ts`  
**Lines:** 54-139

**Current Logic:**

```typescript
export async function GET(request: NextRequest, { params }: Params) {
  // ...
  const currentUser = await resolveCurrentUser(request);
  if (!currentUser) {
    throw new UnauthorizedError("...");
  }
  
  const club = await getClubById(clubId);
  if (!club) {
    throw new NotFoundError("...");
  }
  
  const role = await getUserClubRole(clubId, currentUser.id);
  
  if (!role) {
    throw new ForbiddenError("...");
  }
  
  const result = await listClubEventsRepo(clubId, page, limit);
  // ...
}
```

**SSOT §4.5 Alignment:**

| Requirement | Implemented | Notes |
|-------------|-------------|-------|
| Member sees all club events | ✅ | Returns all events for members |
| Non-member private club: NO events | ✅ | Returns 403 (denies access) |
| Non-member public club: public only | ❌ | Returns 403 (should return public events) |
| Pending = non-member | ✅ | `getUserClubRole` returns null for pending |

**Issues:**

1. Does NOT implement public club visibility for non-members
2. Per SSOT §4.5: Non-members of **public** clubs should see public events
3. Current behavior: Denies ALL non-members regardless of club visibility

**Note:** Endpoint is marked NON-CANONICAL in SSOT_API.md. UI MUST use `GET /api/events?clubId=...` instead. However, semantics should still align with SSOT §4.5 if endpoint exists.

**Risk:** MEDIUM — Non-canonical endpoint, but incorrect semantics may cause confusion.

---

### 4. Canonical Listing: listVisibleEventsForUserPaginated

**File:** `src/lib/services/events.ts`  
**Lines:** 1077-1181 (main), 1199-1242 (visibility resolver)

**Current Logic:**

```typescript
export async function listVisibleEventsForUserPaginated(
  params: { filters, sort, pagination },
  currentUser: CurrentUser | null
): Promise<ListVisibleEventsResult> {
  // ...
  const visibilityResult = await resolveClubEventVisibility(filters.clubId, currentUser);
  
  if (visibilityResult.emptyResult) {
    return { events: [], meta: { ... } };
  }
  
  const filtersWithVisibility: EventListFilters = {
    ...filters,
    visibilityIn: visibilityResult.visibilityIn,
  };
  
  const result = await queryEventsPaginated(filtersWithVisibility, sort, pagination);
  // ...
}
```

**resolveClubEventVisibility Implementation:**

```typescript
async function resolveClubEventVisibility(
  clubId: string | undefined,
  currentUser: CurrentUser | null
): Promise<{ visibilityIn?: string[]; emptyResult: boolean }> {
  // Global listing (no clubId): public events only
  if (!clubId) {
    return { visibilityIn: ['public'], emptyResult: false };
  }
  
  const club = await getClubById(clubId);
  if (!club) {
    return { visibilityIn: undefined, emptyResult: true };
  }
  
  // Determine viewer's role
  let viewerRole = null;
  if (currentUser) {
    const membership = await getMember(clubId, currentUser.id);
    viewerRole = membership?.role ?? null;
  }
  
  // Member/Admin/Owner see ALL events
  if (viewerRole === 'owner' || viewerRole === 'admin' || viewerRole === 'member') {
    return { visibilityIn: undefined, emptyResult: false };
  }
  
  // Non-member + private club = NO events
  if (club.visibility === 'private') {
    return { visibilityIn: undefined, emptyResult: true };
  }
  
  // Non-member + public club = public events only
  return { visibilityIn: ['public'], emptyResult: false };
}
```

**SSOT §4.5 Alignment:** ✅ FULLY COMPLIANT

Decision table implemented correctly:

| Viewer | Club Visibility | Implementation | Result |
|--------|-----------------|----------------|--------|
| Member/Admin/Owner | any | `visibilityIn: undefined` | ALL events |
| Pending | private | `viewerRole=null` → `emptyResult: true` | NO events |
| Pending | public | `viewerRole=null` → `visibilityIn: ['public']` | Public only |
| Guest | private | `emptyResult: true` | NO events |
| Guest | public | `visibilityIn: ['public']` | Public only |

**Risk:** LOW — Canonical implementation is correct.

---

### 5. eventVisibility.ts (Visibility Helper)

**File:** `src/lib/utils/eventVisibility.ts`  
**Lines:** 50-119 (canViewEvent), 232-249 (enforceEventVisibility)

**Current Logic:**

```typescript
export async function canViewEvent(
  event: Event,
  currentUser: CurrentUser | null,
  options?: { autoGrantAccessForRestricted?: boolean }
): Promise<VisibilityCheckResult> {
  // 1. Public events are always visible
  if (event.visibility === "public") {
    return { canView: true };
  }
  
  // 2. Owner always has access
  if (currentUser && event.createdByUserId === currentUser.id) {
    return { canView: true };
  }
  
  // 3. Unlisted events are accessible by direct link
  if (event.visibility === "unlisted") {
    return { canView: true };
  }
  
  // 4. Restricted events require authentication
  if (!currentUser) {
    return { canView: false, reason: 'not_authenticated' };
  }
  
  // 5. Check participant/explicit access
  // ...
}
```

**SSOT §4.5 Alignment:** ❌ NOT COMPLIANT

**Missing Logic:**

1. No check for `event.clubId` existence
2. No club membership verification
3. No club visibility (public/private) consideration
4. Pending role not treated as non-member

**Expected Logic (per §4.5):**

```
IF event.clubId IS NOT NULL:
  IF viewer is club member (owner/admin/member):
    ALLOW (see all club events)
  ELSE:
    IF club.visibility = 'private':
      DENY (existence leakage: return 404)
    ELSE (public club):
      IF event.visibility = 'public':
        ALLOW
      ELSE:
        DENY (existence leakage: return 404)
ELSE:
  // Personal event visibility rules (current implementation)
```

**Risk:** CRITICAL — This is the root cause of non-compliance in single event reads.

---

### 6. Aggregated Counts

**Files:** `src/lib/db/eventRepo.ts`  
**Functions:** `countClubEvents`, `countActiveClubEvents`, `countPastClubEvents`

**Current Logic:**

```typescript
export async function countClubEvents(clubId: string): Promise<number> {
  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId);
  return count ?? 0;
}
```

**SSOT §4.4 Alignment:** ✅ COMPLIANT

Per SSOT_CLUBS_DOMAIN.md §4.4:
> Aggregated fields (e.g., memberCount, eventsCount) represent absolute club state, not access-controlled.

Counts are correctly absolute — no visibility filter applied.

**Risk:** LOW — Correct per SSOT.

---

### 7. Cron/Notifications

**File:** `src/app/api/cron/process-notifications/route.ts`  
**Service:** `src/lib/services/notifications.ts`

**Current Logic:**

- Cron uses `resolveSystemContext(request)` ✅ (ADR-001.3 compliant)
- Notifications are queued at event creation time
- Queue population filters recipients at queue time (not delivery time)
- Cron processes queue entries, not events directly

**SSOT §4.5 Alignment:** ✅ NOT APPLICABLE

System context operates on notification queue, not on events. Recipients are filtered when notifications are queued (e.g., city-based filtering for new events).

**Risk:** LOW — System context, not user-facing.

---

### 8. Auth Resolution Inconsistency

**Finding:** Mixed usage of auth resolution functions across endpoints.

| Endpoint | Auth Function | ADR-001.1 Compliant |
|----------|---------------|---------------------|
| GET /api/events | `getCurrentUser()` | ❌ No |
| GET /api/events/[id] | `getCurrentUser()` | ❌ No |
| GET /api/events/[id]/participants | `getCurrentUser()` | ❌ No |
| POST /api/events | `getCurrentUserFromMiddleware(request)` | ❌ No |
| GET /api/clubs/[id]/events | `resolveCurrentUser(request)` | ✅ Yes |

**ADR-001.1 Requirement:**
> All viewer-dependent backend logic MUST resolve authentication via a single transport-agnostic resolver: `resolveCurrentUser(req)`.

**Risk:** MEDIUM — Inconsistent auth resolution may cause transport-dependent behavior.

---

## Conclusions

### Paths Requiring Phase B Fix (CRITICAL/HIGH)

| Priority | Path | Issue | Fix Required |
|----------|------|-------|--------------|
| **P0** | `canViewEvent()` | Missing club-scoped visibility | Add club membership + visibility checks |
| **P0** | `enforceEventVisibility()` | Inherits canViewEvent issue | Will be fixed by canViewEvent |
| **P0** | GET /api/events/[id] | Uses broken visibility helper | Will be fixed by canViewEvent |
| **P0** | GET /api/events/[id]/participants | Uses broken visibility helper | Will be fixed by canViewEvent |
| **P1** | All event endpoints | Legacy auth functions | Migrate to resolveCurrentUser(req) |
| **P1** | Error responses | 403 reveals existence | Return 404 for unauthorized club events |

### Safe Paths (No Fix Required)

| Path | Notes |
|------|-------|
| `listVisibleEventsForUserPaginated` | Correct SSOT §4.5 implementation |
| `resolveClubEventVisibility` | Reference implementation |
| `countClubEvents`, `countActiveClubEvents` | Correct per §4.4 (absolute counts) |
| `/api/cron/process-notifications` | System context, not user-facing |

### Non-Canonical Endpoint Status

| Endpoint | Status | Recommendation |
|----------|--------|----------------|
| GET /api/clubs/[id]/events | Non-canonical per SSOT_API.md | Fix semantics OR deprecate/remove |

---

## Appendix: SSOT §4.5 Decision Table (Reference)

| Viewer | Club Visibility | Event Visibility | Sees Event |
|--------|-----------------|------------------|------------|
| Member/Admin/Owner | any | any | ✅ |
| Pending | private | any | ❌ |
| Pending | public | public | ✅ |
| Pending | public | non-public | ❌ |
| Guest | private | any | ❌ |
| Guest | public | public | ✅ |
| Guest | public | non-public | ❌ |

---

**END OF AUDIT DOCUMENT**
