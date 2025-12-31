# Bug Analysis: Modal Closes After Confirmation

**Date:** 2024-12-31  
**Status:** 🐛 Bug Identified  
**Severity:** Medium (UX issue, но не data corruption)

---

## 🐛 Observed Behavior

**Scenario:** Create event с кредитом (50 participants)

**Steps:**
1. User fills form, clicks "Создать событие"
2. Modal appears: "Подтверждение публикации события"
3. User clicks "Подтвердить и опубликовать"
4. ❌ **UNEXPECTED:** Modal closes after ~200ms
5. ❌ **UNEXPECTED:** Main form button shows "Создаем событие..." but is ENABLED
6. ✅ Event creation succeeds (redirect happens)

**Expected:**
- Modal should stay open with loading spinner until redirect
- Main form button should remain DISABLED

---

## 🔍 Root Cause Analysis

### Timeline

```
T=0ms: User clicks "Подтвердить и опубликовать"
  → controller.confirm() called
  → setState({ phase: 'running_confirmed', isBusy: true })
  → Modal shows loading ✅

T=50ms: handleConfirmCredit() executes
  → fetch POST /api/events?confirm_credit=1
  → Response received (201)
  
T=100ms: Inside handleConfirmCredit()
  → controller.setRedirecting() called
  → setState({ phase: 'redirecting', isBusy: true })
  → router.push('/events/123')
  
T=150ms: confirm() callback completes successfully
  → Checks: if (prev.phase === 'running_confirmed')
  → Phase is NOW 'redirecting' (from T=100ms)
  → Condition FALSE → state unchanged ✅ GOOD
  
T=200ms: React re-render
  → Modal visibility check:
    (controller.phase === 'awaiting_confirmation' || controller.phase === 'running_confirmed')
  → phase is 'redirecting' ❌ NOT in list
  → Modal closes ❌ BAD
  
  → EventForm isBusy check:
    isBusy = controller.isBusy (true from 'redirecting')
  → Button DISABLED ✅ GOOD
  
  WAIT, WHY is button ENABLED???
  
  → Let me check...
```

### Code Evidence

**1. Modal Visibility Logic (create-event-client.tsx:279)**
```tsx
{(controller.phase === 'awaiting_confirmation' || controller.phase === 'running_confirmed') && ...}
```

**Problem:** When phase transitions to `redirecting`, modal immediately unmounts.

**2. Button State Logic (event-form.tsx)**
```tsx
<Button disabled={isBusy || isGeneratingRules || disabled}>
  {externalBusyLabel || (isBusy ? "Сохраняем..." : submitLabel)}
</Button>
```

**Problem:** Если `isBusy` из controller === true, button ДОЛЖНА быть disabled. Но user сообщает что button ENABLED. Это значит `controller.isBusy` почему-то становится false.

### Deeper Dive: Why isBusy becomes false?

Прочитаю awaitConfirmation logic:

```typescript
// actionController.ts:314
const awaitConfirmation = useCallback((payload: TConfirmPayload) => {
  setState(prev => ({
    ...prev,
    phase: 'awaiting_confirmation',
    isBusy: true, // ✅ Set to true
    confirmationPayload: payload,
  }));
}, []);
```

Wait, но в create-event-client когда происходит 409, мы вызываем `controller.awaitConfirmation()` из ВНУТРИ `controller.start()` callback!

```typescript
// create-event-client.tsx:83
await controller.start("create_event", async () => {
  // ...
  if (res.status === 409) {
    controller.awaitConfirmation({...}); // Called INSIDE start()
    return; // Early return
  }
  // ...
});
```

Что происходит в `start()` после `awaitConfirmation()` вызывается?

```typescript
// actionController.ts:276-310
const start = useCallback(async (actionName: string, fn: () => Promise<void>) => {
  setState({ phase: 'running', isBusy: true, ... });
  
  try {
    await fn(); // fn() calls awaitConfirmation() and returns
    
    // After fn() completes:
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        phase: 'success', // ❌ Transitions to success!
        isBusy: false,    // ❌ Sets isBusy to FALSE!
      }));
    }
  } catch (error) {
    // ...
  }
}, [normalizeError]);
```

**EUREKA! Found it!**

When `start()` callback returns (after calling `awaitConfirmation()`), the `start()` function thinks the operation completed successfully and transitions to `success` phase with `isBusy = false`.

But we're in `awaiting_confirmation` phase! The state transition is:

```
1. running (from start())
2. awaiting_confirmation (from awaitConfirmation() inside fn())
3. success (from start() after fn() returns) ❌ WRONG!
```

This OVERWRITES the `awaiting_confirmation` state!

---

## 🎯 Root Cause Summary

**Problem 1:** `start()` doesn't know that `awaitConfirmation()` was called inside its callback.

After the callback returns, `start()` unconditionally transitions to `success` phase with `isBusy = false`, which **overwrites** the `awaiting_confirmation` state set by `awaitConfirmation()`.

**Problem 2:** Modal visibility doesn't include `redirecting` phase.

Even if Problem 1 is fixed, the modal would still close when `setRedirecting()` is called.

---

## 💡 Solution

### Option 1: Check current phase before transitioning (Recommended)

In `start()`, only transition to `success` if still in `running` phase:

```typescript
const start = useCallback(async (actionName: string, fn: () => Promise<void>) => {
  setState({ phase: 'running', isBusy: true, ... });
  
  try {
    await fn();
    
    if (isMountedRef.current) {
      setState(prev => {
        // Only transition to success if still in 'running' phase
        if (prev.phase === 'running') {
          return { ...prev, phase: 'success', isBusy: false };
        }
        // Otherwise, keep current phase (awaiting_confirmation, redirecting, etc.)
        return prev;
      });
    }
  } catch (error) {
    // ...
  }
}, [normalizeError]);
```

### Option 2: Include 'redirecting' in modal visibility

```tsx
{(controller.phase === 'awaiting_confirmation' 
  || controller.phase === 'running_confirmed'
  || controller.phase === 'redirecting') && ...}
```

**BUT:** This doesn't fix Problem 1 (button becoming enabled).

### Recommendation: Implement BOTH fixes

1. Fix `start()` to not overwrite phase if it changed
2. Include `redirecting` in modal visibility for better UX

---

## 🧪 Verification Steps

After fix:

1. Create event with 50 participants
2. Click "Создать событие"
3. Modal appears ✅
4. Click "Подтвердить и опубликовать"
5. ✅ Modal should stay open with loading
6. ✅ Button should show "Создаем событие..." and be DISABLED
7. ✅ Redirect happens
8. ✅ Modal closes only on unmount

---

## 📝 Files to Modify

1. `src/lib/ui/actionController.ts` — Fix `start()` to check phase
2. `src/app/(app)/events/create/create-event-client.tsx` — Include `redirecting` in modal visibility
3. `src/app/(app)/events/[id]/edit/edit-event-client.tsx` — Same fix for edit flow

---

**Priority:** High (UX regression in new code)  
**Estimated Fix Time:** 15 minutes

