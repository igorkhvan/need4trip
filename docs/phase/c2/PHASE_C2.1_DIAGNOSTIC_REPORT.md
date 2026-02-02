# PHASE C2.1 — DIAGNOSTIC REPORT
## Private Club → Events Section Visibility (v1)

**Status:** COMPLETE ✅  
**Date:** 2026-01-30  
**Author:** AI Diagnostic Agent  
**Mode:** Diagnostic ONLY — NO code changes

---

## Rule Reference

**Source:** SSOT_CLUBS_DOMAIN.md §4.5 "Event Visibility Within Club Context"

**Normative Rule:**
> **Non-Members (including guests and pending):**
> - For **private clubs**: non-members MUST NOT see any club events (events preview is empty/hidden).

**Decision Table (SSOT §4.5):**

| Viewer | Club Visibility | Sees Events |
|--------|-----------------|-------------|
| Member/Admin/Owner | any | ✅ ALL |
| Pending | private | ❌ NONE |
| Guest | private | ❌ NONE |
| Pending | public | ✅ public only |
| Guest | public | ✅ public only |

**Interpretation:**
The phrase "events preview is empty/hidden" means the Events Preview section MUST NOT be rendered at all for private club + non-member. Showing an empty-state message is NOT compliant.

---

## Violating Scenario

| Property | Value |
|----------|-------|
| **Viewer** | Unauthenticated (guest) OR authenticated non-member |
| **Club** | `visibility = 'private'` |
| **Expected Behavior** | Events section NOT rendered |
| **Actual Behavior** | Events section rendered with empty-state message |

---

## Event Section Occurrences

### Component Inventory

| # | File | Component | Render Context | Part of Club Profile? |
|---|------|-----------|----------------|----------------------|
| 1 | `src/app/(app)/clubs/[id]/page.tsx` | `<ClubEventsPreviewAsync>` | Club Profile Page | ✅ YES |
| 2 | `src/app/(app)/clubs/[id]/_components/club-events-preview-async.tsx` | `ClubEventsPreviewAsync` | Async Server Component | ✅ YES (child) |
| 3 | `src/app/(app)/clubs/[id]/events/page.tsx` | `<ClubEventsContent>` | Club Events Page (full) | N/A (separate page) |

### Render Condition Analysis

#### 1. Club Profile Page (`/clubs/[id]/page.tsx`)

**Lines 137-141:**
```tsx
{/* SECTION: Events Preview - per Visual Contract v6 §9 */}
{/* ADR-001.4: Pass currentUser to avoid HTTP API middleware issues */}
<Suspense fallback={<ClubEventsPreviewSkeleton />}>
  <ClubEventsPreviewAsync clubId={club.id} currentUser={user} />
</Suspense>
```

**Render Condition:** UNCONDITIONAL ❌

**Available State Variables (lines 72-77):**
```tsx
const isAuthenticated = !!user;
const isMember = userRole !== null && userRole !== "pending";
const isPending = userRole === "pending";
const isArchived = !!club.archivedAt;
const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
```

**Missing Guard:**
```tsx
// NOT present in code:
// {club.visibility !== "private" || isMember) && (
//   <ClubEventsPreviewAsync ... />
// )}
```

| Condition | Checked? | Status |
|-----------|----------|--------|
| `club.visibility === "private"` | ❌ NO | MISSING |
| `isMember` | ❌ NO | MISSING |
| `isPending` | ❌ NO | MISSING |
| `isArchived` | ✅ YES (for CTA) | N/A for Events |

**Violation:** SSOT VIOLATION ❌

---

#### 2. ClubEventsPreviewAsync (`club-events-preview-async.tsx`)

**Lines 87-101:**
```tsx
export async function ClubEventsPreviewAsync({ clubId, currentUser }: ClubEventsPreviewAsyncProps) {
  const events = await getClubEvents(clubId, currentUser);

  return (
    <div className="rounded-xl border ...">
      <h2>Предстоящие события</h2>
      
      {events.length === 0 ? (
        // Empty placeholder per Visual Contract v6 §9
        <p className="text-[15px] text-muted-foreground italic">
          У клуба пока нет предстоящих событий
        </p>
      ) : (
        // ... event cards
      )}
    </div>
  );
}
```

**Render Condition:** Component ALWAYS renders UI ❌

**Behavior:**
- Receives `currentUser` from parent
- Calls `listVisibleEventsForUserPaginated()` which correctly returns `[]` for private club + non-member
- BUT: Component still renders the section with empty-state message

**Missing Guard:** Component does not receive `club.visibility` or `isMember` props to decide whether to render at all.

**Violation:** SSOT VIOLATION ❌ (propagated from parent)

---

#### 3. Club Events Page (`/clubs/[id]/events/page.tsx`)

**Lines 74-87:**
```tsx
// 403: Not authenticated or not a member (per Visual Contract v1 §7.1)
// Per Visual Contract v1 §4: Visible to member, admin, owner only
if (!user || !isMember) {
  return (
    <div className="space-y-6 pb-10 pt-12">
      <Link href={`/clubs/${id}`} ...>
        К профилю клуба
      </Link>
      <ClubForbiddenPage message="У вас нет доступа к событиям клуба. Вступите в клуб для просмотра событий." />
    </div>
  );
}
```

**Render Condition:** Explicit membership check ✅

**Status:** SSOT COMPLIANT ✅

---

## Backend Verification

### Service Layer (`src/lib/services/events.ts`)

**Function:** `listVisibleEventsForUserPaginated()` (lines 1077-1181)

**Implementation:**
```typescript
// tab=all or tab=upcoming: apply SSOT §4.5 visibility rules
const visibilityResult = await resolveClubEventVisibility(filters.clubId, currentUser);

// SSOT §4.5: Private club + non-member = NO events (return empty immediately)
if (visibilityResult.emptyResult) {
  return {
    events: [],
    meta: { total: 0, page, limit, totalPages: 0, hasMore: false, nextCursor: null },
  };
}
```

**Function:** `resolveClubEventVisibility()` (lines 1199-1242)

**Implementation:**
```typescript
// Non-member (guest, pending, or no membership record)
if (club.visibility === 'private') {
  // Private club + non-member = NO events
  return { visibilityIn: undefined, emptyResult: true };
}
```

**Status:** SSOT COMPLIANT ✅

---

## Root Cause Analysis

### Summary

| Layer | Status | Issue |
|-------|--------|-------|
| **Backend (Service)** | ✅ COMPLIANT | Returns `[]` for private club + non-member |
| **Backend (eventVisibility.ts)** | ✅ COMPLIANT | Enforces SSOT §4.5 correctly |
| **UI (Club Events Page)** | ✅ COMPLIANT | Explicit membership guard |
| **UI (Club Profile Page)** | ❌ VIOLATION | No visibility guard for Events section |
| **UI (ClubEventsPreviewAsync)** | ❌ VIOLATION | Renders empty-state instead of hiding |

### Root Cause Classification

**Type:** Missing UI Guard

**Explanation:**
1. The parent page (`/clubs/[id]/page.tsx`) has access to all necessary state:
   - `club.visibility` (via `club` object)
   - `isMember` (computed from `userRole`)
   
2. However, `<ClubEventsPreviewAsync>` is rendered **unconditionally** (lines 139-140)

3. The component relies on **data absence** (empty array) rather than **access rules** to determine visibility

4. Per SSOT §4.5, the section MUST NOT be rendered at all — not just show empty data

### Anti-Pattern Identified

```
❌ ANTI-PATTERN: Data-driven visibility
   - Backend returns empty data
   - UI renders section with "no data" message
   - User sees section existence (information disclosure)

✅ CORRECT PATTERN: Access-driven visibility
   - Check access rules BEFORE rendering
   - Hide section entirely if no access
   - User does not see section at all
```

---

## Responsibility Assignment

| Component | Responsibility | Fix Required |
|-----------|---------------|--------------|
| **Backend (Service Layer)** | Returns correct data | ❌ NO |
| **Backend (eventVisibility.ts)** | Enforces correct access | ❌ NO |
| **UI (Club Profile Page)** | Must add conditional guard | ✅ YES |
| **UI (ClubEventsPreviewAsync)** | May need props update | ⚠️ OPTIONAL |

**Primary Fix Location:** `src/app/(app)/clubs/[id]/page.tsx`

**Fix Type:** Conditional rendering guard

---

## Conclusion

This is a **UI-level SSOT compliance issue**.

**Summary:**
1. Backend correctly enforces SSOT §4.5 visibility rules
2. UI renders Events section unconditionally for all viewers
3. For private club + non-member, UI shows empty-state instead of hiding section entirely
4. This violates SSOT §4.5 which requires events preview to be "hidden" (not just empty)

**Fix Requires:**
- Conditional rendering change in Club Profile page
- No backend or auth changes required
- No API changes required

**Estimated Impact:**
- Single file change (`page.tsx`)
- Single conditional wrapper
- No breaking changes

---

## Appendix A — Code References

### A1. Club Profile Page — Events Section (VIOLATION)

```71:77:src/app/(app)/clubs/[id]/page.tsx
  const isAuthenticated = !!user;
  const isMember = userRole !== null && userRole !== "pending";
  const isPending = userRole === "pending";
  const isArchived = !!club.archivedAt;
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
  const openJoinEnabled = club.settings?.openJoinEnabled ?? false;
```

```137:141:src/app/(app)/clubs/[id]/page.tsx
      {/* SECTION: Events Preview - per Visual Contract v6 §9 */}
      {/* ADR-001.4: Pass currentUser to avoid HTTP API middleware issues */}
      <Suspense fallback={<ClubEventsPreviewSkeleton />}>
        <ClubEventsPreviewAsync clubId={club.id} currentUser={user} />
      </Suspense>
```

### A2. Club Events Page — Membership Guard (COMPLIANT)

```69:87:src/app/(app)/clubs/[id]/events/page.tsx
  // Determine states per Visual Contract v1 §7
  const isMember = userRole !== null && userRole !== "pending";
  const isArchived = !!club.archivedAt;

  // 403: Not authenticated or not a member (per Visual Contract v1 §7.1)
  // Per Visual Contract v1 §4: Visible to member, admin, owner only
  if (!user || !isMember) {
    return (
      <div className="space-y-6 pb-10 pt-12">
        <Link
          href={`/clubs/${id}`}
          className="inline-flex items-center gap-2 ..."
        >
          К профилю клуба
        </Link>
        <ClubForbiddenPage message="У вас нет доступа к событиям клуба..." />
      </div>
    );
  }
```

### A3. Service Layer — Visibility Resolution (COMPLIANT)

```1141:1157:src/lib/services/events.ts
  // tab=all or tab=upcoming: apply SSOT §4.5 visibility rules
  const visibilityResult = await resolveClubEventVisibility(filters.clubId, currentUser);
  
  // SSOT §4.5: Private club + non-member = NO events (return empty immediately)
  if (visibilityResult.emptyResult) {
    return {
      events: [],
      meta: {
        total: 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: 0,
        hasMore: false,
        nextCursor: null,
      },
    };
  }
```

```1235:1238:src/lib/services/events.ts
  if (club.visibility === 'private') {
    // Private club + non-member = NO events
    return { visibilityIn: undefined, emptyResult: true };
  }
```

---

## Appendix B — SSOT Cross-References

| Document | Section | Rule |
|----------|---------|------|
| SSOT_CLUBS_DOMAIN.md | §4.5 | Event Visibility Within Club Context |
| SSOT_CLUBS_DOMAIN.md | §4.2 | Private clubs: all activity-related content MUST be hidden |
| SSOT_CLUBS_EVENTS_ACCESS.md | §1.4 | Event read access governed by SSOT_CLUBS_DOMAIN.md §4.5 |

---

**END OF DIAGNOSTIC REPORT**

*NO FIX PROPOSALS IN THIS DOCUMENT — Diagnostic only per PHASE C2.1.D instructions.*
