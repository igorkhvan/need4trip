# Phase B5.5: Read-only / Archived States Implementation

**Status:** ✅ COMPLETE (Audit Only — No Changes Required)  
**Date:** 2026-01-30  
**Type:** Audit & Verification  
**Scope:** Archived/Read-only short-circuit before billing

---

## Summary

Performed targeted audit of all UI flows that use billing error handling (`useHandleApiError`, `handleBillingError`) to verify compliance with SSOT_ARCHITECTURE.md requirement:

> **Required order of checks:**
> 1. Entity state (archived / readonly)
> 2. Permissions
> 3. Billing enforcement (402/409)

**Result:** All reviewed flows are ALREADY COMPLIANT. No code changes required.

---

## Authoritative Documents Referenced

| Document | Scope |
|----------|-------|
| `docs/ssot/SSOT_ARCHITECTURE.md` | Order of checks requirement |
| `docs/ssot/SSOT_API.md` | Archived/forbidden semantics (403/410) |
| `docs/ui-contracts/system/CLUBS_UI_VISUAL_CONTRACT V4 MEMBERS.md` | Members archived rules |
| `docs/ui-contracts/system/CLUBS_UI_VISUAL_CONTRACT V5 — MEMBERSHIP REQUESTS.md` | Join requests archived rules |
| `docs/ui-contracts/system/CLUBS_UI_VISUAL_CONTRACT V6 — CLUB PROFILE.md` | Club profile archived rules |
| `docs/phase/b5/PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md` | Billing infra boundaries |
| `docs/phase/b5/PHASE_B5-1_EVENT_CREATE_EDIT_IMPLEMENTATION.md` | Event billing wiring |
| `docs/phase/b5/PHASE_B5-3_MEMBERS_IMPLEMENTATION.md` | Members billing wiring |

---

## Inventory of Reviewed Flows

### A) Clubs Domain

| Component | File | Billing Handler | Archived Check | Verdict |
|-----------|------|-----------------|----------------|---------|
| Club Join CTA | `src/app/(app)/clubs/[id]/_components/club-join-cta.tsx` | None | ✅ Line 44: `if (isMember \|\| isArchived) return null;` | Compliant |
| Club Members List | `src/app/(app)/clubs/[id]/members/_components/club-members-list.tsx` | `handleBillingError` | ✅ Line 96: `if (!isOwner \|\| isArchived) return;` BEFORE API call | Compliant (B5.3) |
| Club Pending Join Requests | `src/app/(app)/clubs/[id]/members/_components/club-pending-join-requests.tsx` | `handleBillingError` | ✅ Lines 87, 156: `if (isArchived) return;` BEFORE API call | Compliant (B5.3) |
| Club Members Content | `src/app/(app)/clubs/[id]/members/_components/club-members-content.tsx` | `useHandleApiError` | ✅ Passes `isArchived` to child components | Compliant (B5.3) |
| Club Settings | `src/app/(app)/clubs/[id]/settings/page.tsx` | Server Actions | ✅ Line 154: Billing section hidden when `isArchived` | Compliant |
| Visibility & Privacy | `src/app/(app)/clubs/[id]/settings/_components/visibility-privacy-section.tsx` | None | ✅ All inputs `disabled={isArchived}`, Save button hidden | Compliant |
| Club Events Content | `src/app/(app)/clubs/[id]/events/_components/club-events-content.tsx` | None | ✅ Create button disabled when `isArchived` | Compliant |

### B) Events Domain

| Component | File | Billing Handler | Archived Check | Verdict |
|-----------|------|-----------------|----------------|---------|
| Event Create | `src/app/(app)/events/create/create-event-client.tsx` | `useHandleApiError` | N/A — Backend enforces | Compliant by design |
| Event Edit | `src/app/(app)/events/[id]/edit/edit-event-client.tsx` | `useHandleApiError` | N/A — Backend enforces | Compliant by design |

---

## Detailed Analysis

### Clubs Domain: UI-Level Enforcement

All club-related components with billing handling implement correct order:

**B5.3 Pattern (already implemented):**
```typescript
const handleMutation = async () => {
  // B5.3: Archived state short-circuits BEFORE any API call or billing handling
  if (isArchived) return;
  
  try {
    const response = await fetch(...);
    
    if (!response.ok) {
      // B5.3: Billing handling only if we reach this point
      if (handleBillingError) {
        const { handled } = handleBillingError(errorObj);
        if (handled) return;
      }
      // ... non-billing error handling
    }
  } catch (err) { /* ... */ }
};
```

This ensures billing modals NEVER appear for archived clubs.

### Events Domain: Backend-Level Enforcement

Event Create/Edit use `useHandleApiError` but DO NOT have explicit frontend `isArchived` checks. This is **compliant by design** because:

1. **Event Create:**
   - `manageableClubs` is loaded from `/api/profile`
   - This API returns only active clubs (archived clubs excluded)
   - Even if an archived club were selected, backend returns 403 `CLUB_ARCHIVED` BEFORE any billing check

2. **Event Edit:**
   - Event response includes `club.archivedAt` (per SSOT_API.md API-027/028)
   - Backend enforcement order:
     1. Auth check (401)
     2. Event exists (404)
     3. Permission check (403)
     4. **Club archived check (403 CLUB_ARCHIVED)**
     5. Billing check (402/409)
   - Billing handling is NEVER reached for archived club events

**Conclusion:** Backend correctly enforces order, making frontend check unnecessary.

---

## Files Changed

**None.** No code modifications were required.

---

## Verification Checklist

- [x] **B5.0 infrastructure was NOT modified**
- [x] **No UX/copy was changed**
- [x] **No other scopes were touched**
- [x] All billing handlers checked for archived short-circuit
- [x] Order is consistent: archived → permissions → billing
- [x] TypeScript strict mode verified
- [x] Production build verified

---

## Compliance Confirmation

Per SSOT_ARCHITECTURE.md §15 and PHASE B5.5 prompt requirements:

| Requirement | Status |
|-------------|--------|
| Billing modals NEVER appear for archived clubs | ✅ Verified |
| Billing modals NEVER appear for read-only contexts | ✅ Verified |
| Order is consistent across all wired flows | ✅ Verified |
| No changes made outside ordering/guards in handlers | ✅ N/A (no changes needed) |
| B5.0 infrastructure not modified | ✅ Confirmed |
| BillingModalHost placement not changed | ✅ Confirmed |
| No UX changes | ✅ Confirmed |

---

## Related Documents

- [PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md](./PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md) — B5.0 infrastructure
- [PHASE_B5-1_EVENT_CREATE_EDIT_IMPLEMENTATION.md](./PHASE_B5-1_EVENT_CREATE_EDIT_IMPLEMENTATION.md) — Event billing wiring
- [PHASE_B5-3_MEMBERS_IMPLEMENTATION.md](./PHASE_B5-3_MEMBERS_IMPLEMENTATION.md) — Members billing wiring
- [SSOT_ARCHITECTURE.md](../../ssot/SSOT_ARCHITECTURE.md) — Architectural requirements
- [SSOT_API.md](../../ssot/SSOT_API.md) — API contracts

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | AI (Phase B5.5) | Initial audit — no changes required |
