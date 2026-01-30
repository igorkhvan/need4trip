# Phase B5.0: UI Foundation Implementation

**Status:** ✅ COMPLETE  
**Date:** 2026-01-30  
**Type:** Infrastructure (no page changes)  
**Scope:** Billing error UI handling (402 PAYWALL, 409 CREDIT_CONFIRMATION)

---

## Summary

Created centralized, typed, client-safe UI infrastructure for handling billing-related API errors.

**Goal achieved:** After B5.0, pages can do `catch(err) { handleApiError(err) }` and UI shows correct modal/UX.

---

## Owner Modules Created

| Module | Location | Purpose |
|--------|----------|---------|
| **Types** | `src/lib/billing/ui/types.ts` | Client-safe types for PaywallDetails, CreditConfirmationDetails |
| **Parse/Guards** | `src/lib/billing/ui/parseApiError.ts` | `isPaywallApiError()`, `isCreditConfirmationApiError()`, extractors |
| **Mapping** | `src/lib/billing/ui/reasonMapping.ts` | Reason → Message → CTA (RU) per B3-3 matrix |
| **Context** | `src/lib/billing/ui/BillingModalContext.tsx` | Global modal state provider |
| **Handler** | `src/lib/billing/ui/handleApiError.ts` | Core error processing logic |
| **Hook** | `src/lib/billing/ui/useHandleApiError.ts` | `useHandleApiError()` hook for pages |
| **Index** | `src/lib/billing/ui/index.ts` | Public API exports |
| **Host** | `src/components/billing/BillingModalHost.tsx` | Provider + modal renderer |

---

## Exported API

### Main Entry Point (for pages)

```typescript
import { useHandleApiError } from "@/components/billing/BillingModalHost";

function MyPage() {
  const { handleError } = useHandleApiError({
    clubId: event?.clubId,
    onConfirmCredit: async (details) => {
      await saveWithConfirmation(details);
    },
  });
  
  const handleSave = async () => {
    try {
      await saveData();
    } catch (err) {
      const { handled } = handleError(err);
      if (!handled) {
        toast.error(getErrorMessage(err));
      }
    }
  };
}
```

### Provider (render once in layout)

```tsx
import { BillingModalHost } from "@/components/billing/BillingModalHost";

function Providers({ children }) {
  return (
    <BillingModalHost>
      {children}
    </BillingModalHost>
  );
}
```

### Type Guards (for custom handling)

```typescript
import {
  isPaywallApiError,
  isCreditConfirmationApiError,
  extractPaywallDetails,
  extractCreditConfirmationDetails,
} from "@/lib/billing/ui";
```

---

## Backward Compatibility

Existing usage of `usePaywall()` and `useCreditConfirmation()` in pages **continues to work**.

The hooks in `paywall-modal.tsx` and `credit-confirmation-modal.tsx` are preserved for backward compatibility but marked as deprecated in favor of `useHandleApiError()`.

---

## Known Backend Gaps (from B3-2)

The UI implements **fallback behavior** per B3-3 matrix for incomplete payloads:

| Gap | Description | UI Fallback |
|-----|-------------|-------------|
| GAP-1 | `options[]` missing in legacy enforcement | Use `cta.href` or construct `/pricing?clubId=...` |
| GAP-2 | `requiredPlanId` inconsistent | Do not pre-select plan in modal |
| GAP-3 | `meta` field shape varies | Handle multiple schemas per reason |
| GAP-4 | `recommendedPlanId` vs `requiredPlanId` key drift | Accept both keys |
| GAP-5 | `cta` vs `options[]` ambiguity | Check `options[]` first, then `cta` |
| GAP-6 | `context.clubId` missing | Infer from page context |

Reference: `docs/phase/b3/PHASE_B3-2_PAYWALL_ERROR_CONTRACT_ANALYSIS.md`

---

## Files Changed/Added

### New Files
- `src/lib/billing/ui/types.ts`
- `src/lib/billing/ui/parseApiError.ts`
- `src/lib/billing/ui/reasonMapping.ts`
- `src/lib/billing/ui/BillingModalContext.tsx`
- `src/lib/billing/ui/handleApiError.ts`
- `src/lib/billing/ui/useHandleApiError.ts`
- `src/lib/billing/ui/index.ts`
- `src/components/billing/BillingModalHost.tsx`
- `docs/phase/b5/PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md`

### Modified Files
- `src/components/billing/paywall-modal.tsx` — v5 refactor with B3-3 mapping
- `src/components/billing/credit-confirmation-modal.tsx` — v2 refactor with onConfirm callback

---

## Verification

- [x] TypeScript strict mode: `npx tsc --noEmit` ✅
- [x] No page files modified
- [x] No business logic changes
- [x] Backward compatible with existing usePaywall/useCreditConfirmation

---

## Integration Notes (for future phases)

To enable global modal handling:

1. Wrap app with `<BillingModalHost>` in layout or providers
2. Replace manual 402/409 handling in pages with `useHandleApiError()`
3. Pages will automatically show modals for billing errors

This is **optional** — existing pages continue to work without changes.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | AI (Phase B5.0) | Initial implementation |
