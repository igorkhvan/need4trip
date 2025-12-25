# Need4Trip - Refactoring Backlog

**Created:** 26 декабря 2024  
**Based on:** GAP_ANALYSIS_PRESCRIPTIVE_REFACTOR.md  
**Status:** Phase 1 Complete ✅, Phase 2-5 Pending

---

## ✅ ЗАВЕРШЕНО (Phase 1: Quick Wins)

### Phase 1.1: Date Formatting ✅
- Commit: `6506c8c`
- Добавлена `formatJoinedDate()` в dates.ts
- Исправлено 4 компонента

### Phase 1.2: Console.log → Logger (PARTIAL) ✅
- Commit: `f53381f`
- Исправлено 2 критичных файла (services/repos)
- **Осталось:** ~120 console.* в компонентах (низкий приоритет)

### Phase 1.3: Select * Optimization ✅
- Commit: `5eb4bb6`
- clubRepo.ts: 8 select * → CLUB_COLUMNS
- participantRepo.ts: 8 select * → PARTICIPANT_COLUMNS

---

## 🔥 КРИТИЧНЫЕ ЗАДАЧИ (High Priority)

### CRITICAL-1: N+1 Query в getUserClubs
**Приоритет:** 🔴 HIGH (Performance Impact)  
**Файл:** `src/lib/services/clubs.ts:323-328`  
**Effort:** 1 hour  
**Risk:** LOW

**Проблема:**
```typescript
memberships.map(async (membership) => {
  const dbClub = await getClubById(membership.club_id); // ⚠️ N queries
});
```

**Решение:**
```typescript
// Добавить в clubRepo.ts
export async function getClubsByIds(ids: string[]): Promise<DbClub[]> {
  const db = getAdminDb();
  const { data, error } = await db
    .from("clubs")
    .select(CLUB_COLUMNS)
    .in("id", ids);
  
  if (error) throw new InternalError("Failed to get clubs", error);
  return data ?? [];
}

// Использовать в clubs.ts
const clubIds = memberships.map(m => m.club_id);
const clubs = await getClubsByIds(clubIds); // ✅ 1 query
const clubsMap = new Map(clubs.map(c => [c.id, c]));
```

**Коммит:**
```bash
git add src/lib/db/clubRepo.ts src/lib/services/clubs.ts
git commit -m "perf: fix N+1 query in getUserClubs (CRITICAL-1)

- Added getClubsByIds() batch query
- Replaced loop of getClubById() calls
- Reduced queries from N to 1

Verified: TypeScript ✅, Build ✅, Manual test ✅"
```

---

### CRITICAL-2: Typed Error Interface для Client
**Приоритет:** 🔴 HIGH (UX Impact)  
**Файл:** Новый `src/lib/types/errors.ts`  
**Effort:** 2 hours  
**Risk:** LOW

**Проблема:**
- API возвращает typed errors (respondError)
- Client не имеет typed interface для парсинга
- Inconsistent error handling в 10+ компонентах

**Решение:**
```typescript
// lib/types/errors.ts
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Helper to parse fetch response
export async function parseApiResponse<T>(res: Response): Promise<T> {
  const json: ApiResponse<T> = await res.json();
  
  if (!json.success) {
    throw new ClientError(
      json.error.message,
      json.error.code,
      json.error.statusCode
    );
  }
  
  return json.data;
}

// Client-side error class
export class ClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ClientError';
  }
}
```

**Миграция компонентов:**
```typescript
// Before
const loadProfileData = async () => {
  try {
    const res = await fetch('/api/profile');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    setUserData(data.user);
  } catch (error) {
    console.error(error);
  }
};

// After
const loadProfileData = async () => {
  try {
    const res = await fetch('/api/profile');
    const data = await parseApiResponse<{ user: User }>(res);
    setUserData(data.user);
  } catch (err) {
    if (err instanceof ClientError) {
      setError(err.message);
      log.error('Failed to load profile', { code: err.code });
    }
  }
};
```

**Файлы для миграции (10 компонентов):**
- profile-page-client.tsx
- clubs/page.tsx
- events/page.tsx
- create-event-client.tsx
- PaywallModal.tsx
- ... (остальные с fetch calls)

**Коммиты:**
1. `feat: add typed error interface for client (CRITICAL-2)`
2. `refactor: migrate profile to typed error handling (CRITICAL-2)`
3. `refactor: migrate clubs/events pages to typed errors (CRITICAL-2)`

---

### CRITICAL-3: Shared Data Fetching Hooks
**Приоритет:** 🟡 MEDIUM (Architecture)  
**Effort:** 4 hours  
**Risk:** MEDIUM

**Проблема:**
- Duplicate fetch logic в profile-page-client, clubs/page, events/page
- No shared error handling
- No shared loading states

**Решение:**
```typescript
// hooks/use-profile-data.ts
export function useProfileData() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/profile');
        const json = await parseApiResponse<{ user: User, stats: Stats }>(res);
        setData(json);
      } catch (err) {
        if (err instanceof ClientError) {
          setError(err.message);
          log.error('Failed to load profile', { error: err });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  
  return { data, loading, error };
}
```

**Hooks to create:**
- `use-profile-data.ts` (profile, cars, brands)
- `use-events.ts` (list events with filters)
- `use-clubs.ts` (list clubs with filters)

**Коммиты:**
1. `feat: add shared data fetching hooks (CRITICAL-3)`
2. `refactor: migrate components to use shared hooks (CRITICAL-3)`

---

## 📋 СРЕДНИЙ ПРИОРИТЕТ (Medium Priority)

### MEDIUM-1: Zod Schemas Extraction
**Effort:** 2 hours  
**Risk:** LOW

**Создать:**
- `src/lib/types/schemas/index.ts` (barrel export)
- `src/lib/types/schemas/participant.ts`
- `src/lib/types/schemas/billing.ts`
- `src/lib/types/schemas/event.ts`

**Файлы с inline schemas:**
- `src/app/api/events/[id]/registration/route.ts`
- `src/app/api/billing/purchase-intent/route.ts`
- `src/lib/services/participants.ts`

---

### MEDIUM-2: Server Components Conversion
**Effort:** 3 hours  
**Risk:** MEDIUM

**Pages to convert:**
- `app/(app)/events/page.tsx` → Server Component
- `app/(app)/clubs/page.tsx` → Server Component

**Benefits:**
- SSR for better SEO
- Faster initial load (no client-side fetch)
- Reduced client bundle size

---

### MEDIUM-3: Shared UI Components
**Effort:** 3 hours  
**Risk:** LOW

**Create:**
- `components/ui/skeletons/list-skeleton.tsx` (grid skeleton)
- `components/ui/error-alert.tsx` (consistent errors)
- `components/ui/empty-state.tsx` (empty lists)

**Replace in:**
- events/page.tsx (custom skeleton)
- clubs/page.tsx (custom skeleton)
- Multiple components with inline error handling

---

## 🔵 НИЗКИЙ ПРИОРИТЕТ (Low Priority)

### LOW-1: Remaining Console.log (~120 calls)
**Effort:** 3-4 hours  
**Risk:** LOW

**Strategy:**
1. Add ESLint rule to prevent new console.* calls
2. Fix remaining calls incrementally
3. Keep exceptions: telegram-widget-debug.ts, logger.ts, global-error.tsx

---

### LOW-2: Dynamic Imports для Heavy Components
**Effort:** 1 hour  
**Risk:** MEDIUM

**Components to lazy load:**
- Event form (large with validation)
- Profile edit form (large)
- Map components (if any)

```typescript
const EventForm = dynamic(
  () => import('@/components/events/event-form'),
  {
    loading: () => <Skeleton />,
    ssr: true
  }
);
```

---

### LOW-3: Naming Conventions Audit
**Effort:** 1 hour  
**Risk:** LOW

**Status:** Already compliant ✅
- Files: kebab-case ✅
- Hooks: use-xxx ✅
- API routes: RESTful ✅
- Domain language: consistent ✅

**Action:** Document in NAMING_AND_STRUCTURE.md

---

## 📚 ДОКУМЕНТАЦИЯ (Documentation)

### DOC-1: NAMING_AND_STRUCTURE.md
**Effort:** 1 hour  
**Content:**
- File naming rules (kebab-case confirmed)
- Domain vocabulary (event, publish, club, plan)
- Import conventions (@/ alias)
- Logging standards (log.xxx() over console)

---

### DOC-2: CLIENT_FETCHING_MODEL.md
**Effort:** 2 hours  
**Content:**
- Rules for Server vs Client data fetching
- When to use hooks vs props
- Cache strategy (StaticCache, React cache)
- Before/after call graphs for major flows

---

### DOC-3: PERFORMANCE_FINDINGS.md
**Effort:** 1 hour  
**Content:**
- List of optimizations made (select *, N+1 fix)
- Before/after metrics
- Query count analysis

---

### DOC-4: ERROR_AND_VALIDATION_MODEL.md
**Effort:** 1 hour  
**Content:**
- Error taxonomy (401/402/403/409/422/500)
- Validation strategy (client UX, server authoritative)
- Error handling patterns (parseApiResponse, ClientError)
- Examples of each error type

---

## 📊 Summary

| Категория | Задач | Effort | Статус |
|-----------|-------|--------|--------|
| **Phase 1 (Quick Wins)** | 3 | 4h | ✅ DONE |
| **CRITICAL** | 3 | 7h | ⏳ NEXT |
| **MEDIUM** | 3 | 8h | 📋 BACKLOG |
| **LOW** | 3 | 5h | 📋 BACKLOG |
| **DOCS** | 4 | 5h | 📋 BACKLOG |
| **TOTAL** | 16 | 29h | - |

---

## 🎯 Recommended Execution Order

### Iteration 1: Critical Performance (3-4 hours)
1. ✅ CRITICAL-1: N+1 Query fix (1h) — **HIGHEST IMPACT**
2. ✅ CRITICAL-2: Typed Error Interface (2h) — **BETTER UX**

### Iteration 2: Architecture Cleanup (7 hours)
3. CRITICAL-3: Shared Data Fetching Hooks (4h)
4. MEDIUM-1: Zod Schemas Extraction (2h)
5. MEDIUM-2: Server Components Conversion (3h)

### Iteration 3: Polish & Docs (6 hours)
6. MEDIUM-3: Shared UI Components (3h)
7. DOC-1 to DOC-4: All documentation (5h)

### Iteration 4: Low Priority (Optional, 9 hours)
8. LOW-1: Remaining console.log (3-4h)
9. LOW-2: Dynamic Imports (1h)
10. LOW-3: Naming audit doc (1h)

---

## ✅ Definition of Done

Задача считается done когда:
- [ ] Код реализован
- [ ] TypeScript compiles ✅
- [ ] Production build succeeds ✅
- [ ] Manual smoke test passed ✅
- [ ] Git commit с описанием
- [ ] Push to main
- [ ] SSOT документы обновлены (если нужно)

---

**Next Action:** Start with CRITICAL-1 (N+1 Query fix)

**Last Updated:** 26 декабря 2024

