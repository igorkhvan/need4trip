# Phase B5.1: Event Create / Edit Implementation

**Status:** ✅ COMPLETE  
**Date:** 2026-01-30  
**Type:** UI Wiring (no infrastructure changes)  
**Scope:** Event Create / Edit pages only

---

## Summary

Integrated `useHandleApiError()` from B5.0 infrastructure into Event Create and Event Edit pages. Both pages now use centralized billing error handling for 402 (PAYWALL) and 409 (CREDIT_CONFIRMATION_REQUIRED) responses.

---

## Files Modified

| File | Change Type |
|------|-------------|
| `src/app/(app)/events/create/create-event-client.tsx` | Refactored to use B5.0 |
| `src/app/(app)/events/[id]/edit/edit-event-client.tsx` | Refactored to use B5.0 |

**No other files were modified.**

---

## Implementation Details

### Architecture Change

Both pages were restructured to wrap content with `BillingModalHost`:

```tsx
// Before (legacy approach)
export function CreateEventPageClient() {
  const { showPaywall, PaywallModalComponent } = usePaywall();
  // ... inline 402/409 handling
  return (
    <div>
      <EventForm />
      {PaywallModalComponent}
      <CreditConfirmationModal />
    </div>
  );
}

// After (B5.0 approach)
export function CreateEventPageClient() {
  return (
    <BillingModalHost>
      <CreateEventContent />
    </BillingModalHost>
  );
}

function CreateEventContent() {
  const { handleError } = useHandleApiError({
    clubId: ...,
    onConfirmCredit: async () => { ... },
  });
  // ... error handling via handleError()
  return (
    <div>
      <EventForm />
      {/* Modals rendered by BillingModalHost */}
    </div>
  );
}
```

### Hook Initialization

In both pages, `useHandleApiError()` is initialized with:

```typescript
const { handleError } = useHandleApiError({
  clubId: event?.clubId ?? undefined,  // For context-aware pricing navigation
  onConfirmCredit: async () => {
    // Re-submit with confirm_credit=1 using stored payload
    if (lastSubmitPayloadRef.current) {
      await submitEvent(lastSubmitPayloadRef.current, { confirmCredit: true });
    }
  },
});
```

### Submit Error Handling

The submit logic now uses try/catch with `handleError()`:

```typescript
const handleSubmit = async (payload: Record<string, unknown>) => {
  // Store payload for potential credit confirmation retry
  lastSubmitPayloadRef.current = payload;
  
  await controller.start("create_event", async () => {
    try {
      await submitEvent(payload);
    } catch (err) {
      // B5.1: Use handleError for 402/409 handling
      const { handled } = handleError(err);
      
      if (!handled) {
        // Re-throw for controller to handle (existing behavior)
        throw err;
      }
      
      // If handled, modal is shown via BillingModalHost
      controller.reset();
    }
  });
};
```

### Credit Confirmation Flow

For 409 CREDIT_CONFIRMATION_REQUIRED:

1. API returns 409 with `CREDIT_CONFIRMATION_REQUIRED` code
2. `submitEvent()` throws an error object with status/code/details
3. `handleError(err)` detects 409 and opens CreditConfirmationModal via context
4. User sees modal (rendered by BillingModalHost)
5. **Cancel**: Modal closes, no side effects, form state preserved
6. **Confirm**: `onConfirmCredit` callback is invoked
7. Callback re-submits with `?confirm_credit=1` query parameter
8. Same idempotency key is reused for retry

### Error Object Structure

For `handleError()` to recognize billing errors, thrown objects include:

```typescript
// For 402 PAYWALL
{
  status: 402,
  statusCode: 402,
  code: "PAYWALL",
  error: json.error,
  details: json.error?.details,
  ...json.error?.details,  // Spread for reason extraction
}

// For 409 CREDIT_CONFIRMATION
{
  status: 409,
  statusCode: 409,
  code: "CREDIT_CONFIRMATION_REQUIRED",
  error: json.error,
  details: json.error?.details || json.error,
  ...(json.error?.details || json.error),  // Spread for meta extraction
}
```

---

## Removed Code

The following legacy patterns were removed from both pages:

1. **Legacy imports:**
   - `import { usePaywall } from "@/components/billing/paywall-modal";`
   - `import { CreditConfirmationModal } from "@/components/billing/credit-confirmation-modal";`
   - `import type { CreditCode } from "@/lib/types/billing";`

2. **Legacy hooks:**
   - `const { showPaywall, PaywallModalComponent } = usePaywall({ onAbort: ... });`

3. **Inline 402/409 handling in submit:**
   - Manual `res.status === 402` checks with `showPaywall()`
   - Manual `res.status === 409` checks with `controller.awaitConfirmation()`

4. **Legacy modal rendering:**
   - `{PaywallModalComponent}`
   - `<CreditConfirmationModal ... />`

---

## Preserved Behavior

- ActionController still manages busy state (`isBusy`, `busyLabel`, `phase`)
- Idempotency keys are still used and reused for retries
- Form state is preserved across 409 (via `lastSubmitPayloadRef`)
- Non-billing errors still throw and are handled by ActionController
- Club events defensive check: 409 for club events is treated as a bug

---

## Verification Checklist

- [x] TypeScript strict mode: `npx tsc --noEmit` ✅
- [x] Production build: `npm run build` ✅
- [x] No changes to B5.0 infrastructure
- [x] No changes to backend logic
- [x] No changes outside Event Create / Edit
- [x] Form state preserved across 409
- [x] Single submit entrypoint per page
- [x] Existing error handling preserved for non-402/409

---

## Testing Notes

To test the implementation:

1. **402 PAYWALL**: Try to create/edit event that exceeds plan limits
   - Expected: PaywallModal opens with upgrade options
   - Cancel: Modal closes, form preserved

2. **409 CREDIT_CONFIRMATION**: Try to create personal event with >15 participants (when user has credits)
   - Expected: CreditConfirmationModal opens
   - Cancel: Modal closes, form preserved
   - Confirm: Event created with credit consumed

---

## Related Documents

- [PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md](./PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md) — B5.0 infrastructure
- [PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md](../b3/PHASE_B3-3_REASON_MESSAGE_CTA_MATRIX.md) — Reason → Message → CTA mapping

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | AI (Phase B5.1) | Initial implementation |
