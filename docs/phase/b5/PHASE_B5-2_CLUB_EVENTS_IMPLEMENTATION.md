# Phase B5.2: Club Events Implementation

**Status:** ✅ COMPLETE (No Code Changes Required)  
**Date:** 2026-01-30  
**Type:** Discovery & Verification (documentation-only)  
**Scope:** Club → Events UI entry points

---

## Summary

Phase B5.2 performed a comprehensive discovery of all Club Events UI entry points to determine what billing integration (402 PAYWALL / 409 CREDIT_CONFIRMATION_REQUIRED) was needed.

**Discovery Result:** Club Events scope **does not contain any mutable actions**. All club event mutations flow through Event Create/Edit pages, which were already wired in Phase B5.1.

**Conclusion:** No code changes required for B5.2.

---

## Discovery Results

### Club Events Components Analyzed

| File | Path | Type | API Calls | Mutable? |
|------|------|------|-----------|----------|
| Events Page | `src/app/(app)/clubs/[id]/events/page.tsx` | Server Component | None (service layer for auth) | ❌ No |
| Events Header | `src/app/(app)/clubs/[id]/events/_components/club-events-header.tsx` | UI Component | None | ❌ No |
| Events Content | `src/app/(app)/clubs/[id]/events/_components/club-events-content.tsx` | Client Component | `GET /api/events?clubId=...` | ❌ Read-only |
| Events List | `src/app/(app)/clubs/[id]/events/_components/club-events-list.tsx` | UI Component | None | ❌ No |
| Events Preview | `src/app/(app)/clubs/[id]/_components/club-events-preview-async.tsx` | Server Component | Service layer (read) | ❌ Read-only |

### CTAs Found in Club Events Scope

| Location | CTA | Action Type | Target |
|----------|-----|-------------|--------|
| `club-events-header.tsx` | "Создать событие" | Navigation (Link) | `/events/create?clubId={clubId}` |
| `club-events-content.tsx` (empty state) | "Создать событие" | Navigation (Link) | `/events/create?clubId={clubId}` |
| `club-events-list.tsx` | Event card click | Navigation (Link) | `/events/{eventId}` |

### Key Finding

All "Create Event" CTAs in Club Events pages are **navigation links** (`<Link>` components), not action handlers. They redirect to:

```
/events/create?clubId={clubId}
```

This URL is handled by `create-event-client.tsx`, which:
1. Reads `clubId` from URL query params
2. Pre-fills club selection in EventForm
3. **Already uses `useHandleApiError()` for billing (B5.1)**

---

## Billing Enforcement Coverage

### Club Event Mutations That Hit Billing Enforcement

| Action | API Endpoint | Enforcement | Handler |
|--------|--------------|-------------|---------|
| Create club event | `POST /api/events` | `enforceEventPublish()` | `create-event-client.tsx` ✅ B5.1 |
| Edit club event | `PUT /api/events/[id]` | `enforceEventPublish()` | `edit-event-client.tsx` ✅ B5.1 |

### Verification: B5.1 Already Handles Club Context

In `create-event-client.tsx`:

```typescript
const { handleError } = useHandleApiError({
  clubId: event?.clubId ?? undefined,  // ← Club context passed when creating club event
  onConfirmCredit: async () => {
    if (lastSubmitPayloadRef.current) {
      await submitEvent(lastSubmitPayloadRef.current, { confirmCredit: true });
    }
  },
});
```

When a user navigates from Club Events to `/events/create?clubId={clubId}`:
1. `clubId` is extracted from URL and set in form state
2. On submit, `POST /api/events` includes `clubId` in payload
3. If 402/409 occurs, `handleError()` opens modal with correct club context

---

## Files Modified

**None.** No code changes were required.

---

## Verification Checklist

- [x] All Club Events UI entry points identified
- [x] No mutable actions found in Club Events scope
- [x] All mutations route through Event Create/Edit pages
- [x] B5.1 already handles `clubId` context for billing
- [x] B5.0 infrastructure not modified
- [x] No other scopes touched

---

## Compliance Confirmation

| Requirement | Status |
|-------------|--------|
| CTAs remain visible regardless of billing limits | ✅ Verified — buttons are always visible |
| Backend enforcement remains the only gate | ✅ Verified — no frontend billing checks |
| No inline "upgrade required" hints | ✅ Verified — none present |
| `clubId` passed when context is club-scoped | ✅ Verified — via URL param to Event Create |
| B5.0 infra not modified | ✅ Verified — no changes |
| No changes outside Club → Events scope | ✅ Verified — discovery only |

---

## Why No Code Changes

Club Events pages follow a **navigation-based architecture** where:

1. **List pages** display read-only data
2. **Action CTAs** navigate to dedicated action pages (Event Create/Edit)
3. **Action pages** handle all billing enforcement

This is the correct architecture per SSOT_ARCHITECTURE.md:
- No inline mutations in list components
- Single-submit entrypoints for forms
- Centralized error handling

Since Event Create/Edit pages already implement B5.0 billing integration (via B5.1), Club Events scope is automatically covered.

---

## Related Documents

- [PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md](./PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md) — B5.0 infrastructure
- [PHASE_B5-1_EVENT_CREATE_EDIT_IMPLEMENTATION.md](./PHASE_B5-1_EVENT_CREATE_EDIT_IMPLEMENTATION.md) — Event Create/Edit wiring
- [PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md](../b3/PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md) — Reason → Message → CTA mapping

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | AI (Phase B5.2) | Initial discovery — no code changes required |
