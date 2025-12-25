# Need4Trip - Refactoring Plan

**Status:** 🟡 Ready for Execution  
**Date:** 26 December 2024  
**Based on:** AUDIT_REPORT.md findings  
**Scope:** Architecture consolidation, SSOT compliance, performance optimization

---

## 📋 Table of Contents

1. [Refactoring Philosophy](#refactoring-philosophy)
2. [Phase 0: Safety & Validation](#phase-0-safety--validation)
3. [Phase 1: Critical SSOT Violations](#phase-1-critical-ssot-violations)
4. [Phase 2: Architecture Cleanup](#phase-2-architecture-cleanup)
5. [Phase 3: Performance Optimization](#phase-3-performance-optimization)
6. [Phase 4: Quality of Life](#phase-4-quality-of-life)
7. [Rollback Strategy](#rollback-strategy)
8. [Success Criteria](#success-criteria)

---

## 🎯 Refactoring Philosophy

### Core Principles
1. **Small, Atomic Commits** - Each change is independently reviewable and revertible
2. **Verify at Each Step** - TypeScript ✅ + Build ✅ + Test ✅ before commit
3. **SSOT Compliance First** - Fix architecture violations before optimization
4. **No Behavior Changes** - Refactoring MUST preserve existing functionality
5. **Update SSOT Documents** - Update ARCHITECTURE.md / DATABASE.md / BILLING_SYSTEM_ANALYSIS.md as needed

### Git Workflow
```bash
# After each atomic change:
npm run build       # Verify build succeeds
npx tsc --noEmit   # Verify TypeScript

git add -A
git commit -m "refactor: [description] (FINDING-XXX)"
git push origin main
```

### Rollback Strategy
- Each commit is independently revertible
- Keep CHANGELOG.md updated with breaking changes (if any)
- Tag stable points: `git tag refactor-phase-N-complete`

---

## Phase 0: Safety & Validation

**Goal:** Ensure we have safety nets before making changes  
**Duration:** 1-2 hours  
**Risk:** LOW

### Tasks

#### 0.1 Add Missing Tests for Critical Paths
**Priority:** CRITICAL  
**Effort:** 2-3 hours  
**Blocker:** YES (needed for regression detection)

**Actions:**
- [ ] Create `tests/services/accessControl.test.ts`
  - Free user creates event >15 participants → 402
  - Club 50 creates event >50 participants → 402
  - enforcePublish() with/without credit
- [ ] Create `tests/lib/utils/dates.test.ts`
  - Verify formatDateTime() consistency
  - Verify timezone handling
- [ ] Run tests: `npm test` (or setup Vitest if missing)

**Commit Message:**
```
test: add critical path tests for billing enforcement (FINDING-005)

- accessControl.ts enforcement scenarios
- dates.ts formatting consistency
- Baseline for refactoring safety
```

#### 0.2 Document Current Behavior
**Priority:** HIGH  
**Effort:** 1 hour

**Actions:**
- [ ] Screenshot key flows (event creation, publish, paywall)
- [ ] Document expected API responses (402, 409, 200)
- [ ] Note any quirks/edge cases

**Commit Message:**
```
docs: document current behavior baseline for refactoring

- API response shapes
- Known edge cases
```

---

## Phase 1: Critical SSOT Violations

**Goal:** Fix architecture violations that cause immediate risk  
**Duration:** 1-2 days  
**Risk:** MEDIUM (touching core repos)

### Task 1.1: Migrate ensureAdminClient() → getAdminDb()

**Priority:** CRITICAL  
**FINDING:** FINDING-001  
**Effort:** 2-3 hours (91 occurrences)  
**Risk:** MEDIUM (touching 13 repos)

**Files Affected:**
- `src/lib/db/userCarRepo.ts` (6 occurrences)
- `src/lib/db/userRepo.ts` (5 occurrences)
- `src/lib/db/billingTransactionsRepo.ts` (5 occurrences)
- `src/lib/db/clubSubscriptionRepo.ts` (3 occurrences)
- `src/lib/db/eventAccessRepo.ts` (2 occurrences)
- `src/lib/db/eventLocationsRepo.ts` (6 occurrences)
- `src/lib/db/clubRepo.ts` (14 occurrences)
- `src/lib/db/notificationQueueRepo.ts` (8 occurrences)
- `src/lib/db/clubMemberRepo.ts` (12 occurrences)
- `src/lib/db/participantRepo.ts` (13 occurrences)
- `src/lib/db/notificationSettingsRepo.ts` (2 occurrences)

**Pattern:**

```typescript
// ❌ OLD PATTERN (91 occurrences)
import { supabaseAdmin, ensureAdminClient } from "./client";

export async function getUser(id: string) {
  ensureAdminClient();
  if (!supabaseAdmin) return null;
  
  const { data } = await supabaseAdmin.from('users').select('*').eq('id', id).single();
  return data;
}

// ✅ NEW PATTERN (SSOT compliant)
import { getAdminDb } from "./client";

export async function getUser(id: string) {
  const db = getAdminDb(); // Throws if not available
  
  const { data } = await db.from('users').select('*').eq('id', id).single();
  return data;
}
```

**Migration Steps:**

1. **Pick one repo at a time** (start with smallest: `eventAccessRepo.ts`)
2. **Replace pattern:**
   - Remove `ensureAdminClient()` calls
   - Replace `supabaseAdmin` with `const db = getAdminDb()`
   - Remove `if (!supabaseAdmin)` checks (no longer needed)
3. **Verify:**
   ```bash
   npx tsc --noEmit
   npm run build
   ```
4. **Test manually:** Create event, register participant
5. **Commit:**
   ```bash
   git add src/lib/db/eventAccessRepo.ts
   git commit -m "refactor: migrate eventAccessRepo to getAdminDb() (FINDING-001)

   - Removed ensureAdminClient() calls
   - Use getAdminDb() wrapper (ARCHITECTURE.md §5 compliant)
   - Verified: TypeScript ✅, Build ✅"
   ```
6. **Repeat for remaining 12 repos**

**Rollback:** Single-file revert possible for each commit

**Success Criteria:**
- [ ] All 13 repos migrated
- [ ] `grep -r "ensureAdminClient" src/lib/db` → 0 results (except client.ts definition)
- [ ] Build passes
- [ ] Manual smoke tests pass

---

### Task 1.2: Fix Services → Database Direct Access

**Priority:** CRITICAL  
**FINDING:** FINDING-002  
**Effort:** 30 minutes  
**Risk:** LOW (single file)

**File:** `src/lib/services/notifications.ts` lines 232-233

**Current Code:**
```typescript
const { supabaseAdmin } = await import("@/lib/db/client");
const { data: participants, error } = await supabaseAdmin!
  .from("event_participants")
  .select("*, user:users(*)")
  .eq("event_id", eventId);
```

**Fix:**
```typescript
// Move query to participantRepo.ts
import { getParticipantsWithUser } from "@/lib/db/participantRepo";

const participants = await getParticipantsWithUser(eventId);
```

**New Repo Function:**
```typescript
// src/lib/db/participantRepo.ts
export async function getParticipantsWithUser(eventId: string): Promise<ParticipantWithUser[]> {
  const db = getAdminDb();
  
  const { data, error } = await db
    .from("event_participants")
    .select("*, user:users(*)")
    .eq("event_id", eventId);
    
  if (error) throw new InternalError("Failed to get participants", error);
  return data ?? [];
}
```

**Commit Message:**
```
refactor: move participants query to repo layer (FINDING-002)

- Removed direct DB access from notifications.ts
- Added getParticipantsWithUser() to participantRepo.ts
- ARCHITECTURE.md §5 compliant (no service → DB direct calls)

Verified: TypeScript ✅, Build ✅
```

---

### Task 1.3: Consolidate Date Formatting

**Priority:** HIGH  
**FINDING:** FINDING-003  
**Effort:** 1 hour  
**Risk:** LOW (pure refactor, no logic change)

**Files Affected (9 violations):**
- `event-card-compact.tsx:78`
- `profile-page-client.tsx:154`
- `telegram/formatters.ts:75,166`
- `ai/eventDataResolver.ts:121`
- `user-card.tsx:150`

**Pattern:**

```typescript
// ❌ OLD PATTERN (inline formatting)
{new Date(event.updatedAt).toLocaleDateString("ru-RU")}

// ✅ NEW PATTERN (use dates.ts)
import { formatDate } from "@/lib/utils/dates";
{formatDate(event.updatedAt)}
```

**Implementation:**

1. Update each file one at a time
2. Import `formatDate` or `formatDateTime` from `@/lib/utils/dates.ts`
3. Replace inline `.toLocaleDateString()` calls
4. Verify output matches (screenshot before/after)

**Commit per file:**
```bash
git add src/components/events/event-card-compact.tsx
git commit -m "refactor: use dates.ts for event card formatting (FINDING-003)

- Replaced inline toLocaleDateString()
- ARCHITECTURE.md §4 Ownership Map compliant

Verified: TypeScript ✅, Build ✅, Visual ✅"
```

**Success Criteria:**
- [ ] All 9 violations fixed
- [ ] `grep -r "toLocaleDateString" src/components` → only calendar.tsx (allowed)
- [ ] `grep -r "toLocaleDateString" src/lib/services` → 0 results

---

### Task 1.4: Remove console.log from Production Code

**Priority:** MEDIUM  
**FINDING:** FINDING-004  
**Effort:** 30 minutes  
**Risk:** LOW

**Files:**
- `lib/services/participants.ts:250` → use `log.warn()`
- `components/auth/auth-provider.tsx:108` → remove or use log.debug()
- `lib/utils/telegram-widget-debug.ts:102-110` → keep (debug utility)
- `lib/utils/logger.ts:84` → keep (fallback)

**Commit:**
```
refactor: remove console.log from production code (FINDING-004)

- participants.ts: use log.warn()
- auth-provider.tsx: removed debug log
- Kept telegram-widget-debug.ts (debug utility)

Verified: TypeScript ✅, Build ✅
```

---

## Phase 2: Architecture Cleanup

**Goal:** Ensure all layers follow SSOT architecture  
**Duration:** 2-3 days  
**Risk:** MEDIUM

### Task 2.1: Audit & Add Missing Billing Enforcement

**Priority:** CRITICAL  
**FINDING:** FINDING-005  
**Effort:** 1 day  
**Risk:** HIGH (revenue impact)

**Endpoints to Audit:**

| Endpoint | Current Status | Action Required |
|----------|---------------|-----------------|
| `POST /api/events` | ✅ Has enforceClubAction | None |
| `PUT /api/events/[id]` | ❓ Need to check | Audit |
| `POST /api/events/[id]/publish` | ✅ Has enforcePublish | None |
| `POST /api/events/[id]/participants` | ❓ Need to check | Audit |
| `POST /api/clubs` | ✅ Has enforceClubAction | None |
| `POST /api/clubs/[id]/members` | ❓ Need to check | Audit |
| `GET /api/clubs/[id]/export` | ✅ Has enforceClubAction | None |
| `POST /api/profile/cars` | ❓ Not billing-related | Skip |

**Actions:**
1. Read each mutation endpoint
2. Check if enforceClubAction() or enforcePublish() is called
3. Add enforcement if missing
4. Test with Free user attempting action

**Commit per endpoint:**
```bash
git add src/app/api/events/[id]/participants/route.ts
git commit -m "fix: add billing enforcement to participant registration (FINDING-005)

- Added enforceClubAction check
- Prevents Free users from exceeding 15 participant limit

Verified: TypeScript ✅, Build ✅, Manual test ✅"
```

---

### Task 2.2: Standardize API Error Responses

**Priority:** MEDIUM  
**FINDING:** FINDING-007  
**Effort:** 2-3 hours  
**Risk:** LOW

**Goal:** All API routes use `respondError()`/`respondSuccess()`

**Pattern:**

```typescript
// ❌ OLD PATTERN (inline NextResponse)
export async function POST(req: Request) {
  try {
    // ...
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ NEW PATTERN (use response helpers)
import { respondSuccess, respondError } from "@/lib/api/response";

export async function POST(req: Request) {
  try {
    // ...
    return respondSuccess(data, undefined, 201);
  } catch (err) {
    return respondError(err);
  }
}
```

**Actions:**
1. Scan all 32 API routes
2. Migrate inline NextResponse → respondSuccess/respondError
3. Verify error shapes match (402 PAYWALL, 409 CONFLICT, etc.)

**Commit per route:**
```bash
git add src/app/api/profile/route.ts
git commit -m "refactor: standardize error handling in profile route (FINDING-007)

- Use respondSuccess/respondError helpers
- Consistent error shapes

Verified: TypeScript ✅, Build ✅"
```

---

### Task 2.3: Consolidate API Response Modules

**Priority:** LOW  
**FINDING:** FINDING-010  
**Effort:** 30 minutes  
**Risk:** LOW

**Current State:**
- `src/lib/api/respond.ts` - newer API (respondSuccess, respondError)
- `src/lib/api/response.ts` - older API (respondJSON, respondError)

**Goal:** Single module with unified exports

**Actions:**
1. Audit which functions are used where
2. Consolidate into `src/lib/api/response.ts`
3. Update all imports
4. Delete `respond.ts`

**Commit:**
```bash
git add src/lib/api/
git commit -m "refactor: consolidate API response helpers (FINDING-010)

- Merged respond.ts into response.ts
- Updated all imports
- Single source of truth for API responses

Verified: TypeScript ✅, Build ✅"
```

---

## Phase 3: Performance Optimization

**Goal:** Reduce page load times, optimize DB queries  
**Duration:** 1-2 days  
**Risk:** MEDIUM

### Task 3.1: Add Error Boundaries to Components

**Priority:** MEDIUM  
**FINDING:** FINDING-008  
**Effort:** 1 day  
**Risk:** LOW

**Pattern:**

```typescript
// ✅ GOOD PATTERN (error boundary + loading state)
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const res = await fetch('/api/events', { method: 'POST', ... });
    if (!res.ok) throw new Error('Failed');
    // Success
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

return (
  <>
    {error && <Alert variant="destructive">{error}</Alert>}
    <Button disabled={loading}>{loading ? 'Загрузка...' : 'Создать'}</Button>
  </>
);
```

**Components to Fix (17 fetch calls):**
- `PaywallModal.tsx`
- `event-form.tsx`
- `participant-form.tsx`
- `auth-provider.tsx`
- `create-event-page-content.tsx`
- `profile-page-client.tsx`
- `city-select.tsx`

**Commit per component:**
```bash
git add src/components/events/event-form.tsx
git commit -m "feat: add error boundaries to event form (FINDING-008)

- Added loading states
- Added error display
- Disabled submit during loading

Verified: TypeScript ✅, Build ✅, UX test ✅"
```

---

### Task 3.2: Add Loading States to Prevent Double Submit

**Priority:** MEDIUM  
**FINDING:** FINDING-012  
**Effort:** 4 hours  
**Risk:** LOW

**Pattern:**

```typescript
// ❌ BAD (no loading state)
const handleSubmit = async () => {
  await createEvent();
};

// ✅ GOOD (disabled during loading)
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  if (loading) return; // Guard
  setLoading(true);
  try {
    await createEvent();
  } finally {
    setLoading(false);
  }
};

<Button disabled={loading} onClick={handleSubmit}>
  {loading ? 'Создание...' : 'Создать'}
</Button>
```

**Forms to Fix:**
- Event create/edit forms
- Participant registration form
- Club create form
- Profile edit form

**Commit per form:**
```bash
git add src/components/events/create-event-page-content.tsx
git commit -m "fix: prevent double submit in event creation (FINDING-012)

- Added loading state
- Disabled button during submit
- Guard against concurrent submissions

Verified: TypeScript ✅, Build ✅, Double-click test ✅"
```

---

## Phase 4: Quality of Life

**Goal:** Improve developer experience  
**Duration:** 2-3 days  
**Risk:** LOW

### Task 4.1: Add Dependency Analysis

**Priority:** LOW  
**FINDING:** FINDING-013  
**Effort:** 2 hours

**Tools:**
- `madge` - circular dependency detection
- `depcheck` - unused dependencies
- `ts-prune` - unused exports

**Actions:**
```bash
npm install --save-dev madge depcheck ts-prune

# Add scripts to package.json
"scripts": {
  "analyze:deps": "madge --circular src/",
  "analyze:unused": "depcheck",
  "analyze:exports": "ts-prune"
}

npm run analyze:deps
npm run analyze:unused
npm run analyze:exports
```

**Commit:**
```bash
git add package.json
git commit -m "chore: add dependency analysis tools (FINDING-013)

- Added madge for circular deps
- Added depcheck for unused deps
- Added ts-prune for unused exports

Scripts: npm run analyze:*"
```

---

### Task 4.2: Bundle Size Analysis

**Priority:** LOW  
**FINDING:** FINDING-015  
**Effort:** 30 minutes

**Actions:**
```bash
npm run build -- --profile
npx @next/bundle-analyzer
```

**Document findings:**
- Largest chunks
- Duplicate dependencies
- Opportunities for code splitting

**Commit:**
```bash
git add docs/BUNDLE_ANALYSIS.md
git commit -m "docs: bundle size analysis baseline (FINDING-015)

- Documented current bundle sizes
- Identified optimization opportunities
- No code changes, analysis only"
```

---

### Task 4.3: Verify TypeScript Strict Mode

**Priority:** MEDIUM  
**FINDING:** FINDING-014  
**Effort:** Varies (could be large if not already strict)

**Check tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,  // Should be true
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true
  }
}
```

**If strict mode is OFF:**
- Enable one flag at a time
- Fix type errors incrementally
- Commit after each flag enabled

**Commit:**
```bash
git add tsconfig.json src/**/*.ts
git commit -m "refactor: enable TypeScript strict mode (FINDING-014)

- Enabled strictNullChecks
- Fixed 47 type errors
- Improved type safety

Verified: TypeScript ✅, Build ✅"
```

---

## Rollback Strategy

### Per-Phase Rollback

**If Phase N fails:**
```bash
# Revert to last stable tag
git revert HEAD~5..HEAD  # Revert last 5 commits
git tag refactor-phase-N-reverted
git push origin main --force-with-lease
```

**Safe rollback points:**
- After Phase 0: `refactor-phase-0-complete`
- After Phase 1: `refactor-phase-1-complete`
- After Phase 2: `refactor-phase-2-complete`

### Emergency Rollback (Full)

**If production breaks:**
```bash
git revert <first-refactor-commit>..HEAD
git push origin main --force-with-lease
```

**Then:**
1. Deploy previous stable version
2. Investigate failure in dev environment
3. Fix issue
4. Re-apply refactoring with fix

---

## Success Criteria

### Phase 0
- [ ] Tests exist for billing enforcement
- [ ] Baseline behavior documented

### Phase 1
- [ ] `grep -r "ensureAdminClient" src/lib/db` → 0 results (except definition)
- [ ] No services → database direct access
- [ ] All date formatting uses dates.ts
- [ ] No console.log in production code

### Phase 2
- [ ] All mutation endpoints have billing enforcement
- [ ] All API routes use respondError/respondSuccess
- [ ] Single API response module

### Phase 3
- [ ] All fetch() calls have error handling
- [ ] All forms have loading states
- [ ] No double-submit vulnerabilities

### Phase 4
- [ ] Dependency analysis tools installed
- [ ] Bundle size documented
- [ ] TypeScript strict mode verified

### Overall
- [ ] `npx tsc --noEmit` ✅
- [ ] `npm run build` ✅
- [ ] Manual smoke tests pass ✅
- [ ] AUDIT_REPORT.md updated (all findings resolved)
- [ ] ARCHITECTURE.md updated (if patterns changed)

---

## Appendix: Quick Wins (Do First)

**These can be done immediately (low risk, high value):**

1. **Remove console.log** (30 min, FINDING-004)
2. **Consolidate API response modules** (30 min, FINDING-010)
3. **Add bundle analysis** (30 min, FINDING-015)

**Total: 1.5 hours for immediate cleanup**

---

**Last Updated:** 26 Dec 2024  
**Version:** 1.0  
**Status:** Ready for execution

