# isClubEvent Elimination — Implementation Plan

**Date:** 2024-12-30  
**Prerequisites:** analysis.md completed ✅  
**Target:** Backend приведён к SSOT §1.2 (clubId only, no isClubEvent in API contract)

---

## Целевое состояние (Target State)

### ✅ AFTER (target):

1. **API Contract:**
   - ❌ `EventCreateInput` does NOT accept `isClubEvent`
   - ❌ `EventUpdateInput` does NOT accept `isClubEvent`
   - ❌ Payload с `isClubEvent` → 400 ValidationError с чётким сообщением
   - ✅ `clubId` — единственный source of truth для clubness

2. **Service Layer:**
   - ❌ НЕ протаскивает `isClubEvent` из input в repo
   - ✅ Все решения (auth, billing) основаны только на `clubId`

3. **Repo Layer:**
   - ❌ НЕ пишет `is_club_event` в INSERT/UPDATE (trigger делает это)
   - ✅ ЧИТАЕТ `is_club_event` из БД (для response mapping — это OK)

4. **Domain Types:**
   - ❌ `EventCreateInput.isClubEvent` удалён
   - ❌ `EventUpdateInput.isClubEvent` удалён
   - ✅ `Event.isClubEvent` остаётся (computed field для UI, читается из БД)
   - ✅ `EventListItem.isClubEvent` остаётся (computed field для listings)

5. **Tests:**
   - ✅ Тест: попытка изменить `clubId` в update → 400
   - ✅ Тест: payload с `isClubEvent` в create → 400
   - ✅ Тест: payload с `isClubEvent` в update → 400

6. **Docs:**
   - ✅ VERIFICATION doc обновлён (убраны claims beyond SSOT)
   - ❌ SSOT НЕ изменяется (уже корректен)

---

## Staged Implementation Plan

### STAGE 1: Remove `isClubEvent` from Input Types & Schemas

**Files:**
- `src/lib/types/event.ts`

**Changes:**

1.1. **EventCreateInput interface** (line 173):
```diff
export interface EventCreateInput {
  // ... other fields
- isClubEvent: boolean;
  clubId?: string | null;
  // ... other fields
}
```

1.2. **EventUpdateInput interface** (line 199):
```diff
export interface EventUpdateInput {
  // ... other fields
- isClubEvent?: boolean;
  clubId?: string | null;
  // ... other fields
}
```

1.3. **eventCreateSchema** (line 227):
```diff
export const eventCreateSchema = z.object({
  // ... other fields
- isClubEvent: z.boolean().default(false),
  clubId: z.string().uuid().nullable().optional(),
  // ... other fields
});
```

1.4. **eventUpdateSchema** (line 258):
```diff
export const eventUpdateBaseSchema = z.object({
  // ... other fields
- isClubEvent: z.boolean().optional(),
  clubId: z.string().uuid().nullable().optional(),
  // ... other fields
});
```

**Verification:**
```bash
npx tsc --noEmit
# Should show errors in services/events.ts (lines 418, 668) — expected, will fix in STAGE 2
```

**Keep unchanged:**
- `Event.isClubEvent: boolean` (line 120) — response field, OK
- `EventListItem.isClubEvent: boolean` (eventRepo.ts line 30) — response field, OK

---

### STAGE 2: Remove `isClubEvent` from Service Layer

**Files:**
- `src/lib/services/events.ts`

**Changes:**

2.1. **createEvent() — remove isClubEvent from validated payload** (line 418):
```diff
const validated: EventCreateInput = {
  title: parsed.title,
  description: parsed.description,
  // ... other fields
- isClubEvent: parsed.isClubEvent ?? false,
  clubId: parsed.clubId ?? null,
  // ... other fields
};
```

2.2. **updateEvent() — remove isClubEvent from validated payload** (line 668):
```diff
const validated: EventUpdateInput = {
  ...parsed,
  // ... other fields
- isClubEvent: parsed.isClubEvent !== undefined ? parsed.isClubEvent : undefined,
  clubId: parsed.clubId !== undefined ? parsed.clubId : undefined,
  // ... other fields
};
```

**Verification:**
```bash
npx tsc --noEmit
# Should still show errors in eventRepo.ts (lines 190, 248) — expected, will fix in STAGE 3
```

---

### STAGE 3: Remove `isClubEvent` from Repo Write Operations

**Files:**
- `src/lib/db/eventRepo.ts`

**Changes:**

3.1. **createEventRecord() — remove is_club_event from INSERT** (line 190):
```diff
const insertPayload = {
  id: crypto.randomUUID(),
  // ... other fields
- is_club_event: payload.isClubEvent,
+ club_id: payload.clubId ?? null, // Trigger will set is_club_event automatically
  is_paid: payload.isPaid,
  // ... other fields
};
```

**КРИТИЧНО:** Убедись что `club_id` передаётся (payload.clubId). Trigger `sync_event_club_flag()` установит `is_club_event` автоматически.

3.2. **updateEvent() — remove is_club_event from UPDATE** (line 248):
```diff
const patch = {
  ...(payload.title !== undefined ? { title: payload.title } : {}),
  // ... other fields
- ...(payload.isClubEvent !== undefined ? { is_club_event: payload.isClubEvent } : {}),
+ // is_club_event is trigger-maintained, do NOT write it explicitly
  ...(payload.isPaid !== undefined ? { is_paid: payload.isPaid } : {}),
  // ... other fields
};
```

**ВАЖНО:** НЕ удаляем `club_id` из insert/update. Trigger синхронизирует `is_club_event` с `club_id`.

**Verification:**
```bash
npx tsc --noEmit
# Should pass (no TypeScript errors)
```

**Keep unchanged:**
- `mapDbRowToListItem()` line 65: `isClubEvent: row.is_club_event ?? false` — **OK**, reads from DB
- `EVENT_LIST_COLUMNS` line 42: `is_club_event` in SELECT — **OK**, needed for response

---

### STAGE 4: Add API Contract Enforcement (Reject isClubEvent in Payload)

**Goal:** Если старый клиент отправляет `isClubEvent` в payload, вернуть 400 с чётким сообщением.

**Strategy:** Add explicit validation in Zod schema OR in route handler.

**Option A: Zod passthrough + explicit check (recommended)**

**Files:**
- `src/lib/types/event.ts`

**Changes:**

4.1. **Add refine to eventCreateSchema:**
```typescript
export const eventCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    // ... all fields WITHOUT isClubEvent
  })
  .passthrough() // Allow unknown keys (для backward compat проверки)
  .superRefine((val, ctx) => {
    // Existing date validation...
    
    // ⚡ NEW: Reject isClubEvent if present in payload
    if ('isClubEvent' in val) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "isClubEvent is deprecated. Use clubId to specify club context. clubId=null for personal events, clubId=<uuid> for club events.",
        path: ["isClubEvent"],
      });
    }
  });
```

4.2. **Add same check to eventUpdateSchema:**
```typescript
export const eventUpdateSchema = eventUpdateBaseSchema
  .passthrough()
  .superRefine((val, ctx) => {
    // Existing validations...
    
    // ⚡ NEW: Reject isClubEvent if present in payload
    if ('isClubEvent' in val) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "isClubEvent is deprecated. Use clubId to specify club context.",
        path: ["isClubEvent"],
      });
    }
  });
```

**Verification:**
```bash
# Manual test:
curl -X POST /api/events -H "Content-Type: application/json" -d '{"isClubEvent": true, ...}'
# Expected: 400 with error.details containing isClubEvent deprecation message
```

**Option B: Remove passthrough, strict schema (alternative, more aggressive)**

Without `.passthrough()`, Zod will strip unknown keys. But we want EXPLICIT rejection, not silent ignore.  
→ **Recommendation:** Use Option A (explicit check with clear error message).

---

### STAGE 5: Add clubId Immutability Test

**Files:**
- `tests/integration/events.enforcement.test.ts` (or new file)

**Changes:**

5.1. **Test: Attempt to change clubId in update → 400**
```typescript
test("QA-XX: updateEvent rejects clubId change (immutability)", async () => {
  // 1. Create personal event
  const personalEvent = await createEvent({ clubId: null, ... }, user);
  
  // 2. Attempt to assign to club
  await expect(
    updateEvent(personalEvent.id, { clubId: clubA.id }, user)
  ).rejects.toThrow(ValidationError);
  
  // 3. Verify error message
  expect(error.message).toContain("Невозможно изменить принадлежность события к клубу");
});

test("QA-XX: updateEvent rejects clubId change from club to personal", async () => {
  // 1. Create club event
  const clubEvent = await createEvent({ clubId: clubA.id, ... }, adminUser);
  
  // 2. Attempt to change to personal
  await expect(
    updateEvent(clubEvent.id, { clubId: null }, adminUser)
  ).rejects.toThrow(ValidationError);
});
```

5.2. **Test: Payload with isClubEvent → 400 (explicit rejection)**
```typescript
test("QA-XX: createEvent rejects isClubEvent in payload", async () => {
  const payload = {
    title: "Test",
    // ... other required fields
    isClubEvent: true, // Deprecated field
    clubId: clubA.id,
  };
  
  await expect(
    createEvent(payload, user)
  ).rejects.toThrow(ValidationError);
  
  expect(error.message).toContain("isClubEvent is deprecated");
});

test("QA-XX: updateEvent rejects isClubEvent in payload", async () => {
  const event = await createEvent({ clubId: null, ... }, user);
  
  await expect(
    updateEvent(event.id, { isClubEvent: true }, user)
  ).rejects.toThrow(ValidationError);
});
```

**Verification:**
```bash
npm test -- events.enforcement
# All tests should pass
```

---

### STAGE 6: Update Verification Doc (Remove Claims Beyond SSOT)

**Files:**
- `docs/verification/CLUBS_EVENTS_ACCESS_VERIFICATION.md`

**Changes:**

6.1. **Read current state:**
```bash
# Check for mentions of:
# - organizer role (should NOT be mentioned as valid, only as deprecated)
# - pending role (should match SSOT: "NO permissions")
# - Any rules not in SSOT
```

6.2. **Update sections:**
- Remove/update any sections that reference `organizer` as active role
- Ensure `pending` is described as "NO permissions" (matches SSOT §2)
- Add section: "✅ Verified: backend enforces clubId-only contract (no isClubEvent in API)"

6.3. **Add verification entries:**
```markdown
## Backend Contract Verification

### clubId as Source of Truth (SSOT §1.2)

**Verified:**
- ✅ API schemas do NOT accept `isClubEvent` in create/update payloads
- ✅ Payload with `isClubEvent` returns 400 ValidationError
- ✅ Service layer uses ONLY `clubId` for authorization/billing decisions
- ✅ Repo does NOT write `is_club_event` (trigger-maintained)
- ✅ DB trigger `sync_event_club_flag()` enforces `is_club_event = (club_id IS NOT NULL)`
- ✅ DB constraint `events_club_consistency_check` enforces invariant

**Files:**
- `src/lib/types/event.ts`: EventCreateInput, EventUpdateInput (NO isClubEvent field)
- `src/lib/services/events.ts`: createEvent, updateEvent (uses clubId for auth)
- `src/lib/db/eventRepo.ts`: createEventRecord, updateEvent (does NOT write is_club_event)
- `supabase/migrations/20241212_alter_events_club_and_visibility.sql`: trigger + constraint

### clubId Immutability (SSOT §5.7 implied)

**Verified:**
- ✅ updateEvent() rejects attempts to change clubId
- ✅ Error message: "Невозможно изменить принадлежность события к клубу после создания"
- ✅ Test coverage: QA-XX, QA-XX

**Files:**
- `src/lib/services/events.ts` line 684: explicit check + ValidationError
```

---

## Verification Checklist (PHASE 4)

### Pre-deployment checks:

```bash
# 1. TypeScript
npx tsc --noEmit
# Expected: ✅ No errors

# 2. Build
npm run build
# Expected: ✅ Successful build

# 3. Tests
npm test
# Expected: ✅ All tests pass (including new QA-XX tests)

# 4. Grep verification
grep -r "isClubEvent" src/lib/types/event.ts
# Expected: ONLY in Event interface (line 120) and comments — NOT in input types

grep -r "is_club_event.*payload" src/lib/db/eventRepo.ts
# Expected: 0 results (no writes to is_club_event)

grep -r "isClubEvent.*parsed" src/lib/services/events.ts
# Expected: 0 results (no протаскивание from input)
```

### Post-deployment monitoring:

1. **API Errors (400):**
   - Monitor Sentry/logs for `isClubEvent is deprecated` errors
   - Expected: 0 errors (if all clients updated)
   - If errors appear: old client version detected → force update UI

2. **DB Constraint Violations:**
   - Monitor for `events_club_consistency_check` violations
   - Expected: 0 violations (trigger prevents this)

---

## Risk Assessment

### ✅ LOW RISK (already correct):

1. **Service layer logic:** Uses `clubId` for decisions (NO changes needed)
2. **UI (EventForm):** Uses `clubId` for dropdown/checkbox (NO changes needed)
3. **DB trigger:** Already enforces `is_club_event` sync (NO migration needed)
4. **Tests:** Don't use `isClubEvent` (NO fixes needed)

### ⚠️ MEDIUM RISK:

1. **Type system changes:** Remove `isClubEvent` from input types  
   - Risk: TypeScript errors in untested code paths  
   - Mitigation: `npx tsc --noEmit` before commit

2. **Zod schema enforcement:** Reject `isClubEvent` in payload  
   - Risk: Breaking old clients (if any exist that send `isClubEvent`)  
   - Mitigation: Check production logs for `isClubEvent` in recent requests  
   - Fallback: If needed, add grace period (log warning, don't reject) — but NOT recommended

### ❌ NO HIGH RISK:

- NO database migration (trigger already exists)
- NO service logic changes (already correct)
- NO UI changes (already correct)

---

## Out of Scope (NOT in this PR)

1. **club_members.role 'organizer' removal:**
   - SSOT says "organizer deprecated"
   - DB constraint allows 'organizer'
   - **Decision:** Separate PR/task (requires DB migration + RLS update)

2. **Remove `isClubEvent` from Event/EventListItem response types:**
   - Currently used for UI convenience
   - Can be removed in Phase 2 (after UI migrates to `Boolean(clubId)`)
   - **Decision:** Keep for now (backward compat), remove in future PR

3. **SSOT updates:**
   - SSOT already correct (§1.2 clear: "clubId is source of truth")
   - NO changes needed

---

## Implementation Order (Recommended)

```
STAGE 1 (types)
  ↓
STAGE 2 (service)
  ↓
STAGE 3 (repo)
  ↓
npx tsc --noEmit ✅
  ↓
STAGE 4 (API enforcement)
  ↓
STAGE 5 (tests)
  ↓
npm test ✅
  ↓
STAGE 6 (docs)
  ↓
npm run build ✅
  ↓
PHASE 4 (final verification)
```

**Commit strategy:** 
- Option A: All stages in 1 commit (atomic, preferred)
- Option B: 3 commits: (1) types+service+repo, (2) API enforcement+tests, (3) docs

**Recommendation:** Option A (single atomic commit with all changes + verification)

---

## Rollback Plan (if needed)

If deployment breaks:

1. **Revert commit** (git revert)
2. **NO database changes** required (trigger stays, schema unchanged)
3. **Deploy previous version**

Rollback is **SAFE** because:
- NO DB migration
- NO breaking service logic changes
- Only contract enforcement tightening

---

## Next: Proceed to PHASE 3 (Implementation)

Ready? ✅ Yes


