# Bug Analysis: Auth Modal Redirect After Login

**Date:** 2024-12-17  
**Status:** Analysis Complete → Ready for Fix  
**Priority:** P1 (UX Issue)

---

## 🐛 Reported Issue

**User Report:**  
- **Before:** Click avatar (when not logged in) → Auth modal → After login → Redirect to `/profile` ✅  
- **Now:** Click avatar → Auth modal → After login → NO redirect ❌  
- **But:** Click "Create Event" → Auth modal → After login → Redirect to `/events/create` ✅

**Expected:** Consistent redirect behavior - avatar click should redirect to `/profile` after login.

---

## 🔍 Root Cause Analysis

### Problem: Missing `redirectTo` Parameter

**File:** `src/components/layout/header-user-section.tsx:76-80`

```typescript
<button
  onClick={() => openModal({
    reason: "REQUIRED",
    title: "Войти в Need4Trip",
    description: "Чтобы продолжить, войдите через Telegram.",
    // ❌ MISSING: afterLoginRedirectTo: "/profile"
  })}
  ...
>
```

**Compare with working example:**

**File:** `src/components/events/create-event-page-content.tsx:35-43`

```typescript
useEffect(() => {
  execute(
    () => {},
    {
      reason: "REQUIRED",
      title: "Создание события",
      description: "Для создания события необходимо войти через Telegram.",
      redirectTo: '/events/create', // ✅ HAS redirectTo
    }
  );
}, [isAuthenticated, execute]);
```

---

## 🏗️ Architecture Flow

### Auth Modal Redirect Chain:

1. **Component calls `openModal(opts)`**
   - `opts.afterLoginRedirectTo` → passed to hook

2. **`useAuthModal` hook** (`src/lib/hooks/use-auth-modal.ts:26-35`)
   ```typescript
   const openModal = useCallback((opts?: OpenAuthModalOptions) => {
     setState({
       open: true,
       afterLoginRedirectTo: opts?.afterLoginRedirectTo, // ← Stored in state
       ...
     });
   }, []);
   ```

3. **`AuthModal` component** (`src/components/auth/auth-modal.tsx:146-148`)
   ```typescript
   // After successful login:
   if (afterLoginRedirectTo) {
     setTimeout(() => router.push(afterLoginRedirectTo), 200);
   }
   ```

### `useProtectedAction` Pattern:

**File:** `src/lib/hooks/use-protected-action.ts`

```typescript
export function useProtectedAction(isAuthenticated: boolean) {
  const { openModal } = useAuthModalContext();
  
  const execute = useCallback((
    action: () => void,
    modalOptions?: {
      reason?: AuthModalReason;
      title?: string;
      description?: string;
      redirectTo?: string; // ← Different param name
      onSuccess?: () => void;
    }
  ) => {
    if (!isAuthenticated) {
      openModal({
        reason: modalOptions?.reason || "REQUIRED",
        title: modalOptions?.title,
        description: modalOptions?.description,
        afterLoginRedirectTo: modalOptions?.redirectTo, // ← Mapped here
        onSuccess: modalOptions?.onSuccess,
      });
      return;
    }
    action();
  }, [isAuthenticated, openModal]);
  
  return { execute };
}
```

**Key Insight:**
- `useProtectedAction` accepts `redirectTo` in options
- Maps to `afterLoginRedirectTo` when calling `openModal`
- HeaderUserSection calls `openModal` directly WITHOUT this mapping

---

## ✅ Solution Design

### Option A: Direct `afterLoginRedirectTo` (Recommended)

Add the missing parameter directly to `openModal` call:

```typescript
// src/components/layout/header-user-section.tsx
<button
  onClick={() => openModal({
    reason: "REQUIRED",
    title: "Войти в Need4Trip",
    description: "Чтобы продолжить, войдите через Telegram.",
    afterLoginRedirectTo: "/profile", // ✅ ADD THIS
  })}
  ...
>
```

**Benefits:**
- ✅ Minimal change (1 line)
- ✅ Direct, clear intent
- ✅ Consistent with `openModal` API
- ✅ Zero breaking changes

**Drawbacks:**
- None

---

### Option B: Use `useProtectedAction` (Alternative)

Refactor HeaderUserSection to use the same pattern as CreateEventPageContent:

```typescript
"use client";

import { useEffect } from "react";
import { useProtectedAction } from "@/lib/hooks/use-protected-action";

export function HeaderUserSection({ currentUser: initialUser }: HeaderUserSectionProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initialUser);
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialUser);
  const { execute } = useProtectedAction(isAuthenticated);
  
  // ... existing checkAuth logic ...
  
  return (
    <div className="flex items-center gap-3">
      {currentUser ? (
        /* User Profile Icon */
        <Link href="/profile" ...>...</Link>
      ) : (
        /* User Icon (opens login modal) */
        <button
          onClick={() => execute(
            () => {}, // No action needed
            {
              reason: "REQUIRED",
              title: "Войти в Need4Trip",
              description: "Чтобы продолжить, войдите через Telegram.",
              redirectTo: "/profile", // ✅ ADD THIS
            }
          )}
          ...
        >
```

**Benefits:**
- ✅ Consistent pattern with create event
- ✅ Clearer separation of concerns

**Drawbacks:**
- ❌ More complex change
- ❌ Adds unnecessary abstraction (no action to protect)
- ❌ Requires state management refactor

---

## 🎯 Recommended Solution

**Option A: Direct `afterLoginRedirectTo`**

**Why:**
- HeaderUserSection is NOT protecting an action
- It's just opening a login modal with a redirect preference
- `openModal` API directly supports this use case
- Minimal, surgical change

**Implementation:**
1. Add `afterLoginRedirectTo: "/profile"` to `openModal` call
2. Test login flow via avatar
3. Verify redirect works

**Effort:** 2 minutes  
**Risk:** ZERO (single parameter addition)  
**Impact:** HIGH (fixes user-reported bug)

---

## 🧪 Test Plan

### Manual Testing:

1. **Avatar Login Flow:**
   - Logout completely
   - Click avatar icon in header (User icon)
   - ✅ Verify auth modal opens
   - Login via Telegram
   - ✅ Verify redirect to `/profile` after 200ms
   - ✅ Verify profile page loads correctly

2. **Create Event Flow (Regression):**
   - Logout
   - Navigate to `/events/create` (or click button)
   - ✅ Verify auth modal opens
   - Login via Telegram
   - ✅ Verify redirect to `/events/create` works
   - ✅ Verify create form loads

3. **Direct Profile Access (Regression):**
   - Logout
   - Navigate to `/profile` directly
   - ✅ Verify server-side redirect to `/?auth=required`
   - ✅ Verify no double modal issue

### Edge Cases:

- [ ] Multiple avatar clicks before login (modal should not duplicate)
- [ ] Cancel modal (no redirect)
- [ ] Login failure (no redirect)
- [ ] Network error during login (no redirect)

---

## 📋 Implementation Checklist

- [ ] Add `afterLoginRedirectTo: "/profile"` to HeaderUserSection
- [ ] Test avatar login flow
- [ ] Test create event flow (regression)
- [ ] Test profile direct access (regression)
- [ ] Verify no console errors
- [ ] Commit with clear message
- [ ] Push to main

---

## 📝 Code Change

**File:** `src/components/layout/header-user-section.tsx`

**Change:** Line 76-80

```diff
<button
  onClick={() => openModal({
    reason: "REQUIRED",
    title: "Войти в Need4Trip",
    description: "Чтобы продолжить, войдите через Telegram.",
+   afterLoginRedirectTo: "/profile",
  })}
  className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:bg-[#F9FAFB]"
>
```

**That's it.** One line change.

---

## 🔄 Related Components

**No changes needed in:**
- `src/components/auth/auth-modal.tsx` - Already handles `afterLoginRedirectTo`
- `src/lib/hooks/use-auth-modal.ts` - Already passes it through
- `src/lib/hooks/use-protected-action.ts` - Works correctly for create event
- `src/app/profile/page.tsx` - Server-side auth is separate concern

---

**Next Steps:** Proceed with Option A implementation (single line fix).
