# Bug Analysis: Logout & Profile Auth

**Date:** 2024-12-17  
**Status:** Analysis Complete → Ready for Fix  
**Priority:** P0 (Critical UX Issue)

---

## 🐛 Reported Issues

### Issue #1: Avatar Visible After Logout
**User Report:** После logout в хэдере все равно видна аватарка (пользователь выглядит залогиненным)

### Issue #2: Inconsistent Auth Protection
**User Report:**  
- При клике на "Создание события" → показывается paywall ✅  
- При клике на аватар → переход на незаполненный профиль ❌  
- **Ожидание:** Должен показываться paywall

---

## 🔍 Root Cause Analysis

### Bug #1: HeaderUserSection State Not Cleared

**File:** `src/components/layout/header-user-section.tsx:20-30`

```typescript
const checkAuth = async () => {
  try {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const response = await res.json();
      const data = response.data || response;
      setCurrentUser(data.user || null);
    }
  } catch (err) {
    console.error("[header] Failed to check auth:", err);
  }
};
```

**Problem:**
1. After logout, `/api/auth/me` returns 401 (unauthorized)
2. `res.ok` is false, so the `if` block doesn't execute
3. **`setCurrentUser` is NEVER called with `null`**
4. State retains old user data → avatar still visible

**Why it happens:**
- Logout clears cookie → middleware blocks `/api/auth/me` → 401 response
- But client state is NOT updated because `setCurrentUser(null)` only runs if `res.ok`

**Expected behavior:**
```typescript
const checkAuth = async () => {
  try {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const response = await res.json();
      const data = response.data || response;
      setCurrentUser(data.user || null);
    } else {
      // 👈 MISSING: Clear state on 401/403
      setCurrentUser(null);
    }
  } catch (err) {
    console.error("[header] Failed to check auth:", err);
    setCurrentUser(null); // 👈 ALSO MISSING
  }
};
```

---

### Bug #2: Profile Page Has No Auth Protection

**File:** `src/app/profile/page.tsx:70-130`

```typescript
export default function ProfilePage() {
  // ❌ NO AUTH CHECK - Client component loads immediately
  
  const [initialLoad, setInitialLoad] = useState(true);
  
  useEffect(() => {
    loadProfileData();
    loadCars();
    loadBrands();
  }, []);
  
  const loadProfileData = async () => {
    try {
      const res = await fetch('/api/profile');
      
      if (!res.ok) {
        throw new Error('Failed to load profile');
      }
      // ...
    } catch (error) {
      // ❌ Silent failure - shows empty skeleton
      console.error('[loadProfileData] Error:', error);
      setInitialLoad(false);
    }
  };
```

**Problem:**
1. `profile/page.tsx` is a **client component** ("use client")
2. NO server-side auth check before rendering
3. Shows skeleton loader immediately
4. Fetches `/api/profile` in `useEffect`
5. If unauthenticated: silent error → shows empty profile UI

**Compare with `events/create/page.tsx`:**
```typescript
// ✅ CORRECT: Server Component with auth check
export default async function CreateEventPage() {
  const currentUser = await getCurrentUser();
  return <CreateEventPageContent isAuthenticated={!!currentUser} />;
}

// ✅ Client component uses useProtectedAction
export function CreateEventPageContent({ isAuthenticated }) {
  const { execute } = useProtectedAction(isAuthenticated);
  
  useEffect(() => {
    execute(
      () => {}, 
      {
        reason: "REQUIRED",
        title: "Создание события",
        description: "Для создания события необходимо войти через Telegram.",
      }
    );
  }, [isAuthenticated, execute]);
```

**Why create event works:**
- Server component checks auth FIRST
- Passes `isAuthenticated` to client
- `useProtectedAction` shows modal if false

**Why profile doesn't work:**
- Pure client component
- No server-side check
- No `useProtectedAction` call
- Silent error handling

---

## 🎯 Solution Design

### Fix #1: HeaderUserSection State Management

**Approach:** Properly clear state on auth failure

```typescript
// src/components/layout/header-user-section.tsx
const checkAuth = async () => {
  try {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const response = await res.json();
      const data = response.data || response;
      setCurrentUser(data.user || null);
    } else {
      // ✅ Clear state on auth failure (401/403)
      setCurrentUser(null);
    }
  } catch (err) {
    console.error("[header] Failed to check auth:", err);
    // ✅ Clear state on network/fetch error
    setCurrentUser(null);
  }
};
```

**Impact:**
- Avatar disappears immediately after logout
- Consistent with actual auth state
- Zero breaking changes

---

### Fix #2: Profile Page Auth Protection

**Option A: Server Component + Redirect (Recommended)**

Convert profile page to server component pattern:

```typescript
// src/app/profile/page.tsx - Server Component Wrapper
import { getCurrentUser } from "@/lib/auth/currentUser";
import { redirect } from "next/navigation";
import { ProfilePageClient } from "@/components/profile/profile-page-client";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  
  // ✅ Redirect if not authenticated
  if (!currentUser) {
    redirect("/?login=required");
  }
  
  return <ProfilePageClient />;
}
```

```typescript
// src/components/profile/profile-page-client.tsx
"use client";

export function ProfilePageClient() {
  // Move all current ProfilePage() logic here
  // Auth is already guaranteed by parent server component
}
```

**Benefits:**
- ✅ Server-side auth check (secure)
- ✅ Instant redirect (no skeleton flash)
- ✅ Consistent with create event pattern
- ✅ No client-side auth state management

**Option B: useProtectedAction (Alternative)**

Keep client component, add protection hook:

```typescript
"use client";

export default function ProfilePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const { execute } = useProtectedAction(isAuthenticated);
  
  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch('/api/auth/me');
      const authed = res.ok;
      setIsAuthenticated(authed);
      setChecking(false);
      
      if (!authed) {
        execute(
          () => {},
          {
            reason: "REQUIRED",
            title: "Профиль",
            description: "Для просмотра профиля необходимо войти.",
            redirectTo: "/profile"
          }
        );
      }
    };
    checkAuth();
  }, []);
  
  if (checking) return <ProfileContentSkeleton />;
  
  // ... rest of component
}
```

**Drawbacks:**
- ❌ Skeleton flashes before redirect
- ❌ Extra client-side fetch
- ❌ More complex state management

---

## ✅ Recommended Solution

**Fix #1: HeaderUserSection** (5 min)
- Add `else` branch to clear state
- Add `setCurrentUser(null)` in catch

**Fix #2: Profile Page** (15 min)
- Create server component wrapper at `src/app/profile/page.tsx`
- Extract client logic to `src/components/profile/profile-page-client.tsx`
- Add redirect for unauthenticated users

**Total Effort:** 20 minutes  
**Risk:** LOW (follows existing patterns)  
**Impact:** HIGH (fixes critical UX bug)

---

## 🧪 Test Plan

### Manual Testing

1. **Logout Flow:**
   - Login via Telegram
   - Click avatar → verify profile loads
   - Logout
   - ✅ Verify avatar disappears immediately (not after refresh)
   - ✅ Verify header shows login icon

2. **Profile Access:**
   - Logout completely
   - Navigate to `/profile` directly
   - ✅ Verify instant redirect to home
   - ✅ Verify login modal appears (optional)
   - Login via Telegram
   - ✅ Verify redirect back to `/profile` (if implemented)

3. **Create Event (regression):**
   - Logout
   - Click "Создать событие"
   - ✅ Verify login modal still appears
   - ✅ Verify redirectTo works

### Edge Cases

- [ ] Expired token during session
- [ ] Network error during checkAuth()
- [ ] Multiple tabs (logout in one, check other)
- [ ] Browser refresh after logout

---

## 📋 Implementation Checklist

- [ ] Fix `HeaderUserSection.checkAuth()` - add state clearing
- [ ] Create `src/components/profile/profile-page-client.tsx`
- [ ] Update `src/app/profile/page.tsx` to server component
- [ ] Add redirect logic for unauthenticated users
- [ ] Test logout flow manually
- [ ] Test profile access without auth
- [ ] Test create event flow (regression)
- [ ] Commit with clear message
- [ ] Push to main

---

**Next Steps:** Proceed with implementation following the recommended solution.
