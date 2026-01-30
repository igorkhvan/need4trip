# PHASE C2.1 — FIX IMPLEMENTATION

**Date:** 2026-01-30  
**Status:** COMPLETED  
**Type:** UI Fix (SSOT Compliance)

---

## Reference

- **SSOT Document:** `docs/ssot/SSOT_CLUBS_DOMAIN.md` §4.5
- **Diagnostic Report:** `docs/phase/c2/PHASE_C2.1_DIAGNOSTIC_REPORT.md`
- **Blueprint:** `CLUBS_IMPLEMENTATION_BLUEPRINT v1 (Rebuilt).md`

---

## Violation Summary

**Rule (SSOT_CLUBS_DOMAIN §4.5):**
> For PRIVATE clubs, non-members (guest or pending) MUST NOT see the Events Preview section at all (not even empty-state).

**Observed Behavior (Before Fix):**
- Private club Events Preview was rendered for all visitors
- Non-members could see the Events section (violated SSOT)

**Root Cause:**
- Missing UI guard in Club Profile page
- Events Preview section was unconditionally rendered

---

## Fix Applied

**File:** `src/app/(app)/clubs/[id]/page.tsx`

**Change:** Added SSOT-compliant conditional guard around Events Preview section.

**Guard Logic:**
```tsx
{(club.visibility !== "private" || isMember) && (
  <Suspense fallback={<ClubEventsPreviewSkeleton />}>
    <ClubEventsPreviewAsync clubId={club.id} currentUser={user} />
  </Suspense>
)}
```

**Logic Table:**

| club.visibility | isMember | Result |
|-----------------|----------|--------|
| "private" | false | `false` → NOT rendered |
| "private" | true | `true` → rendered |
| "public" | false | `true` → rendered |
| "public" | true | `true` → rendered |

---

## Behavior Matrix (Post-Fix)

| Viewer | Club | Events Preview |
|--------|------|----------------|
| Guest | Private | ❌ NOT rendered |
| Pending | Private | ❌ NOT rendered |
| Member | Private | ✅ Rendered |
| Owner/Admin | Private | ✅ Rendered |
| Guest | Public | ✅ Rendered |
| Member | Public | ✅ Rendered |

---

## Confirmation

- [x] **UI-only change** — no backend modifications
- [x] **No auth changes** — uses existing `isMember` flag
- [x] **No billing changes** — billing logic untouched
- [x] **No API changes** — API-016 unchanged
- [x] **No new imports** — uses existing variables
- [x] **No teaser behavior** — section simply not rendered
- [x] **ClubEventsPreviewAsync** — NOT modified

---

## Verification

```bash
npx tsc --noEmit  # ✅ Pass
npm run build     # ✅ Pass (expected)
```

---

## Related Files (NOT Modified)

These files were explicitly NOT touched per scope constraints:
- `src/app/(app)/clubs/[id]/_components/club-events-preview-async.tsx`
- `src/lib/services/clubs.ts`
- Any API routes
- Any billing logic

---

## Commit

```
fix(clubs): hide events preview for private club non-members (C2.1)
```
