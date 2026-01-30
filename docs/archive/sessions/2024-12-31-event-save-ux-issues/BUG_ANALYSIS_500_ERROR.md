# Bug Analysis #2: 500 Error Not Handled in UI

**Date:** 2024-12-31  
**Status:** 🐛 Critical Bug  
**Severity:** High (500 error, no user feedback)

---

## 🐛 Observed Behavior

**Network Log:**
```
POST /api/events?confirm_credit=1
Status: 500 Internal Server Error
Idempotency-Key: 73a81b5e-e0c6-4525-adff-f24dd9ab8789
```

**UI Behavior:**
- Modal закрывается
- Кнопка становится enabled с текстом "Создаем событие..."
- ❌ **NO ERROR MESSAGE** показано пользователю
- User не знает что произошло

---

## 🔍 Root Cause Analysis

### Problem #1: withIdempotency() throws errors, but they're not caught

**Current Code:**
```typescript
// POST /api/events
export async function POST(request: NextRequest) {
  try {
    if (idempotencyKey) {
      return withIdempotency(..., async () => {
        // This can throw PaywallError, CreditConfirmationRequiredError, etc.
        const event = await createEvent(payload, currentUser, confirmCredit);
        return { status: 201, body: { ... } };
      });
      // ❌ If withIdempotency throws, it bypasses the outer catch!
    }
  } catch (err) {
    // This ONLY catches errors from the fallback path
    if (err.name === "CreditConfirmationRequiredError") { ... }
    return respondError(err);
  }
}
```

**Issue:** `withIdempotency()` re-throws errors (line 158, 194), but these are NOT caught by the outer catch block because the return statement exits early.

### Problem #2: Client doesn't handle errors in confirm flow

**Current Code (create-event-client.tsx:159-210):**
```typescript
const handleConfirmCredit = async () => {
  await controller.confirm(async (stored) => {
    const res = await fetch(url, { ... });
    
    if (res.status === 402) { ... }
    if (!res.ok) {
      await handleApiError(res); // This shows toast
      return; // ❌ But controller doesn't know about error!
    }
    
    // Success path...
    controller.setRedirecting();
  });
};
```

**Issue:** When `!res.ok`, we call `handleApiError()` and return, but `controller.confirm()` doesn't catch the error, so it transitions to `success` state instead of `error` state.

### Problem #3: handleApiError() might not throw

Need to check if `handleApiError()` throws or just shows a toast.

---

## 💡 Solution

### Fix #1: Wrap withIdempotency call in try-catch

```typescript
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUserFromMiddleware(request);
    if (!currentUser) {
      throw new UnauthorizedError("...");
    }
    
    const idempotencyKey = extractIdempotencyKey(request);
    
    if (idempotencyKey && isValidIdempotencyKey(idempotencyKey)) {
      try {
        return await withIdempotency(
          { userId: currentUser.id, route: 'POST /api/events', key: idempotencyKey },
          async () => {
            const url = new URL(request.url);
            const confirmCredit = url.searchParams.get("confirm_credit") === "1";
            const payload = await request.json();
            const event = await createEvent(payload, currentUser, confirmCredit);
            
            return {
              status: 201,
              body: { success: true, data: { event } },
            };
          }
        );
      } catch (err: any) {
        // Handle special errors (409, 402)
        if (err.name === "CreditConfirmationRequiredError") {
          const url = new URL(request.url);
          const error = err.payload;
          error.error.cta.href = `${url.pathname}?confirm_credit=1`;
          return new Response(JSON.stringify(error), {
            status: 409,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        // All other errors
        return respondError(err);
      }
    }
    
    // Fallback path...
  } catch (err) {
    return respondError(err);
  }
}
```

### Fix #2: Client должен throw errors, не return

```typescript
const handleConfirmCredit = async () => {
  await controller.confirm(async (stored) => {
    const res = await fetch(url, { ... });
    
    if (res.status === 402) {
      const errorData = await res.json();
      const paywallError = errorData.error?.details || errorData.error;
      if (paywallError) {
        showPaywall(paywallError);
        throw new Error('Paywall required'); // ⚡ THROW instead of return
      }
    }
    
    if (!res.ok) {
      await handleApiError(res);
      throw new Error('Request failed'); // ⚡ THROW instead of return
    }
    
    // Success path...
  });
};
```

### Fix #3: Show error in UI according to SSOT

According to SSOT design system, errors should be displayed using:
1. Toast notifications (for transient errors)
2. Alert/Error state in component (for persistent errors)
3. Error boundary (for critical errors)

For this case: Use toast + reset controller to idle (allow retry).

---

## 📝 Implementation Plan

1. ✅ Fix POST /api/events to catch withIdempotency errors
2. ✅ Fix PUT /api/events/:id same way
3. ✅ Fix client to throw errors in confirm flow
4. ✅ Fix client to show error message from controller.state.lastError
5. ✅ Test all error scenarios:
   - 500 Internal Server Error
   - 402 Paywall
   - 409 Credit Confirmation
   - Network error

---

**Priority:** Critical  
**Estimated Fix Time:** 30 minutes

