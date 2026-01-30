# PHASE C1.D — DIAGNOSTIC REPORT: Unauth → Club Join → 404

**Status:** COMPLETE  
**Date:** 2026-01-30  
**Author:** AI Diagnostic Agent  
**Classification:** ROOT CAUSE ANALYSIS (NO FIX)

---

## Scenario

**Repro Steps:**
1. Неавторизованный пользователь (unauth) открывает `/clubs/[id]`
2. Видит кнопку "Вступить в клуб" или "Подать заявку"
3. Нажимает на CTA
4. **Результат:** 404 Not Found

---

## Entry Point

| Property | Value |
|----------|-------|
| **Component** | `ClubJoinCTA` |
| **File** | `src/app/(app)/clubs/[id]/_components/club-join-cta.tsx` |
| **CTA Type** | `onClick` Handler → Navigation (`router.push`) |
| **Lines** | 59-62, 145 |

### Code Fragment (Lines 58-62):

```typescript
// Handle login redirect for unauthenticated users
const handleLoginClick = () => {
  const returnUrl = encodeURIComponent(`/clubs/${clubId}`);
  router.push(`/login?returnUrl=${returnUrl}`);  // ← DEFECT
};
```

### CTA Rendering (Lines 143-149):

```typescript
// Guest (not authenticated) - prompt to log in
if (!isAuthenticated) {
  return (
    <Button onClick={handleLoginClick} className="w-full sm:w-auto">
      <UserPlus className="h-4 w-4" />
      <span>{openJoinEnabled ? "Вступить в клуб" : "Подать заявку"}</span>
    </Button>
  );
}
```

---

## Actual Flow

1. **User lands on** `/clubs/[id]`
2. **Server Component** (`page.tsx`) resolves auth via `resolveCurrentUser()` → `null`
3. **`isAuthenticated` computed** as `!!user` → `false` (line 72)
4. **`ClubJoinCTA` rendered** with `isAuthenticated={false}` (line 117)
5. **User clicks** "Вступить в клуб" / "Подать заявку"
6. **`handleLoginClick()` executes** → `router.push('/login?returnUrl=/clubs/${clubId}')`
7. **Next.js App Router** attempts to resolve `/login`
8. **Route `/login` DOES NOT EXIST** → `not-found.tsx` renders
9. **User sees** 404 "Страница не найдена"

---

## Root Cause

### Primary Defect

**Blind navigation to non-existent route** — The `ClubJoinCTA` component attempts client-side navigation to `/login`, but **no such page exists** in the application.

### Evidence

```bash
# No login page exists:
find src/app -name "*login*" -type d
# Result: (empty)

find src/app -path "*/login/page.tsx"
# Result: (empty)
```

### Architectural Context

The application uses **modal-based authentication** via `AuthModal`, not page-based login:

| Component | File | Pattern |
|-----------|------|---------|
| `AuthModal` | `src/components/auth/auth-modal.tsx` | Modal dialog with Telegram widget |
| `AuthModalProvider` | `src/components/auth/auth-modal-provider.tsx` | React Context provider |
| `useAuthModalContext()` | `src/lib/hooks/use-auth-modal.ts` | Hook to trigger modal |

### Canonical Pattern (CORRECT)

Used by: `mobile-nav.tsx`, `header-user-section.tsx`, `protected-page.tsx`, `events-page-client.tsx`

```typescript
const { openModal } = useAuthModalContext();

// On CTA click for unauth user:
openModal({
  reason: "REQUIRED",
  title: "Войти в Need4Trip",
  description: "Чтобы продолжить, войдите через Telegram.",
});
```

### Defective Pattern (ClubJoinCTA)

```typescript
// ❌ WRONG: Navigates to non-existent route
const handleLoginClick = () => {
  router.push(`/login?returnUrl=${returnUrl}`);
};
```

---

## Violated Invariant

### 1. Canonical Auth Order (SSOT_ARCHITECTURE.md §8)

**Expected order:** visibility → **AUTH (modal)** → action  
**Actual order:** visibility → navigation (404) → ❌

### 2. Auth Pattern Consistency

| Component | Auth Pattern | Status |
|-----------|--------------|--------|
| `mobile-nav.tsx` | `useAuthModalContext().openModal()` | ✅ Correct |
| `header-user-section.tsx` | `useAuthModalContext().openModal()` | ✅ Correct |
| `protected-page.tsx` | `useAuthModalContext().openModal()` | ✅ Correct |
| `events-page-client.tsx` | `useAuthModalContext().openModal()` | ✅ Correct |
| **`ClubJoinCTA`** | `router.push('/login')` | ❌ **DEFECT** |

### 3. UI Error Surfacing (SSOT_ARCHITECTURE.md §11.2)

**Rule:** UI must NOT expose routing errors for auth flows  
**Violation:** 404 displayed for missing auth page

---

## Responsibility

| Layer | Responsibility | Status |
|-------|----------------|--------|
| **UI (ClubJoinCTA)** | Use canonical auth modal | ❌ **PRIMARY FAULT** |
| Routing | N/A — no `/login` route expected | ⚠️ Consistent (no page exists) |
| Middleware | N/A — not invoked for page routes | ✅ Not involved |
| Backend | N/A — API never called | ✅ Not involved |

### Primary Layer at Fault: **UI**

The component `ClubJoinCTA` was implemented without integration with the canonical `AuthModalProvider` context.

---

## Additional Findings

### 1. Component Architecture

`ClubJoinCTA` is a **Client Component** (`"use client"`) but does NOT import or use:
- `useAuthModalContext`
- `AuthModalProvider`
- Any auth modal mechanism

### 2. Auth State Awareness

| Question | Answer |
|----------|--------|
| Is `useAuth()` / user available? | ❌ No — component receives `isAuthenticated` as prop |
| Is `user === null` handled? | Partially — shows CTA button, but incorrect action |
| Does component KNOW user is unauth? | ✅ Yes (via `isAuthenticated` prop) |
| Is that knowledge used correctly? | ❌ No — triggers navigation instead of modal |

### 3. Prop Flow

```
page.tsx (Server Component)
  ↓ resolveCurrentUser() → null
  ↓ isAuthenticated = !!user → false
  ↓
ClubJoinCTA (Client Component)
  ↓ isAuthenticated={false}
  ↓ renders Button with onClick={handleLoginClick}
  ↓ handleLoginClick → router.push('/login') → 404
```

---

## Conclusion

### Classification

**UI-level auth gating bug** — The `ClubJoinCTA` component uses an incorrect pattern for handling unauthenticated users. Instead of opening the canonical `AuthModal` via `useAuthModalContext().openModal()`, it attempts navigation to a non-existent `/login` page.

### Summary

| Aspect | Finding |
|--------|---------|
| Bug Type | Auth pattern violation |
| Trigger | Click on Join CTA as unauth user |
| Root Cause | `router.push('/login')` to non-existent route |
| Layer | UI (Client Component) |
| Backend Involved | ❌ No |
| Middleware Involved | ❌ No |
| Fix Scope | Single component (`ClubJoinCTA`) |

### Defect Location

```
File: src/app/(app)/clubs/[id]/_components/club-join-cta.tsx
Lines: 59-62 (handleLoginClick function)
Line: 145 (Button onClick binding)
```

---

## NO FIX PROPOSALS IN THIS DOCUMENT

Per PHASE C1.D protocol, this document contains **diagnostic findings only**.

Fix implementation is deferred to subsequent phases.

---

## References

- `docs/ssot/SSOT_ARCHITECTURE.md` §8 (Auth), §11.2 (Error Handling)
- `src/components/auth/auth-modal.tsx` — Canonical auth modal
- `src/components/auth/auth-modal-provider.tsx` — Context provider
- `src/lib/hooks/use-auth-modal.ts` — Hook implementation
- `src/app/not-found.tsx` — 404 page shown to users
