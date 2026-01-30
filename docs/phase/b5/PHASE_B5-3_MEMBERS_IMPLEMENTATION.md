# Phase B5.3: Club Members Implementation

**Status:** ✅ COMPLETE  
**Date:** 2026-01-30  
**Type:** UI Wiring (no infrastructure changes)  
**Scope:** Club Members pages only (Members list + Join Requests)

---

## Summary

Integrated `useHandleApiError()` from B5.0 infrastructure into Club Members page components. All members-related mutations now use centralized billing error handling for 402 (PAYWALL) responses.

**Note:** Credit confirmation (409 CREDIT_CONFIRMATION_REQUIRED) is NOT applicable to members actions per B3-3 matrix — `MAX_CLUB_MEMBERS_EXCEEDED` is a 402 PAYWALL error, not a credit consumption scenario.

---

## Files Modified

| File | Change Type |
|------|-------------|
| `src/app/(app)/clubs/[id]/members/_components/club-members-content.tsx` | Added BillingModalHost wrapper + useHandleApiError |
| `src/app/(app)/clubs/[id]/members/_components/club-members-list.tsx` | Wired handleBillingError to Remove member action |
| `src/app/(app)/clubs/[id]/members/_components/club-pending-join-requests.tsx` | Wired handleBillingError to Approve/Reject actions |

**No other files were modified.**

---

## Implementation Details

### Architecture Change

Per B5.1 pattern, `ClubMembersContent` was restructured with a wrapper:

```tsx
// B5.3: Wrapper component providing BillingModalHost context
export function ClubMembersContent(props: ClubMembersContentProps) {
  return (
    <BillingModalHost>
      <ClubMembersContentImpl {...props} />
    </BillingModalHost>
  );
}

function ClubMembersContentImpl({ clubId, ... }) {
  // No onConfirmCredit — credit confirmation doesn't apply to members
  const { handleError } = useHandleApiError({ clubId });
  
  return (
    <>
      <ClubMembersList handleBillingError={handleError} />
      <ClubPendingJoinRequests handleBillingError={handleError} />
    </>
  );
}
```

### Hook Initialization

```typescript
const { handleError } = useHandleApiError({ clubId });
// No onConfirmCredit - per B3-3 matrix, MAX_CLUB_MEMBERS_EXCEEDED
// is 402 PAYWALL, not 409 CREDIT_CONFIRMATION
```

### Mutation Error Handling

All three member mutations now use the pattern:

```typescript
const handleMutation = async () => {
  // B5.3: Archived state short-circuits BEFORE any API call or billing handling
  if (isArchived) return;
  
  try {
    const response = await fetch(...);
    
    if (!response.ok) {
      const data = await response.json();
      
      // B5.3: Try billing error handling first (402 PAYWALL)
      if (handleBillingError) {
        const errorObj = {
          status: response.status,
          statusCode: response.status,
          code: data.error?.code,
          error: data.error,
          details: data.error?.details,
          ...(data.error?.details || {}),
        };
        
        const { handled } = handleBillingError(errorObj);
        if (handled) {
          // Modal shown via BillingModalHost, no further action
          return;
        }
      }
      
      // Non-billing errors: existing handling preserved
      if (response.status === 401) { ... }
      if (response.status === 409) { ... }
      // etc.
    }
    
    // Success
  } catch (err) {
    // Existing error handling
  }
};
```

---

## Members Actions Wired

| Action | Handler | API | Billing Reason |
|--------|---------|-----|----------------|
| Approve join request | `handleApprove()` | API-055 | `MAX_CLUB_MEMBERS_EXCEEDED` (402) |
| Reject join request | `handleReject()` | API-056 | Possible 402 |
| Remove member | `handleRemoveMember()` | API-022 | Possible 402 |

---

## Credit Confirmation (409)

**NOT APPLICABLE to members actions.**

Per B3-3 matrix (`PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md`), the only members-related billing reason is `MAX_CLUB_MEMBERS_EXCEEDED`, which is:
- HTTP 402 PAYWALL
- CTA: "Перейти на расширенный тариф"
- NOT a credit consumption scenario

Therefore:
- `useHandleApiError` initialized WITHOUT `onConfirmCredit` callback
- 409 responses are handled as existing non-billing errors (inline message + refetch)

---

## Archived Rules Preservation

Per Visual Contract v4/v5 and B5.3 prompt requirements, archived state is checked BEFORE any API call or billing handling:

| Handler | Check | Line |
|---------|-------|------|
| `handleApprove` | `if (isArchived) return;` | First line |
| `handleReject` | `if (isArchived) return;` | First line |
| `handleRemoveMember` | `if (!isOwner \|\| isArchived) return;` | First line |

This ensures:
- UI buttons are disabled when archived (enforced by `disabled={isArchived}`)
- Handler functions short-circuit before any action
- Billing modals CANNOT appear for archived clubs

---

## Verification Checklist

- [x] TypeScript strict mode: `npx tsc --noEmit` ✅
- [x] Production build: `npm run build` ✅
- [x] **B5.0 infrastructure was NOT modified**
- [x] **Members UI contract (V4/V5) was NOT violated**
- [x] **No other scopes were touched**
- [x] All member mutations use handleError
- [x] CTAs are NOT hidden due to billing limits
- [x] Archived rules enforced visually and behaviorally
- [x] clubId always passed to useHandleApiError
- [x] No inline billing logic exists

---

## Preserved Behavior

All existing non-billing behaviors are preserved:

| Error Code | Existing Behavior | After B5.3 |
|------------|-------------------|------------|
| 401 | Redirect to login | Unchanged |
| 403 (archived) | Inline error + archived hint | Unchanged |
| 404 | Refetch list | Unchanged |
| 409 | Inline message + refetch | Unchanged |
| Other | Generic error message | Unchanged |

---

## Related Documents

- [PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md](./PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md) — B5.0 infrastructure
- [PHASE_B5-1_EVENT_CREATE_EDIT_IMPLEMENTATION.md](./PHASE_B5-1_EVENT_CREATE_EDIT_IMPLEMENTATION.md) — Reference wiring pattern
- [PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md](../b3/PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md) — Reason → Message → CTA mapping
- [CLUBS_UI_VISUAL_CONTRACT V4 MEMBERS.md](../../ui-contracts/system/CLUBS_UI_VISUAL_CONTRACT%20V4%20MEMBERS.md) — Members UI contract (LOCKED)
- [CLUBS_UI_VISUAL_CONTRACT V5 — MEMBERSHIP REQUESTS.md](../../ui-contracts/system/CLUBS_UI_VISUAL_CONTRACT%20V5%20—%20MEMBERSHIP%20REQUESTS.md) — Join Requests UI contract (LOCKED)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | AI (Phase B5.3) | Initial implementation |
