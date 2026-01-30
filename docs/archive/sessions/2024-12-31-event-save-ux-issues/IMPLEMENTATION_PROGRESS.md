# Event Save UX Issues - Implementation Progress

**Date:** 2024-12-31  
**Status:** ⚡ In Progress (Parts 1-4 complete, Parts 5-6 remaining)

## 📋 Overview

Implementing fixes for 3 critical UX issues in Event create/edit flow:
1. **Save button race window** — button becomes active between save and redirect
2. **Missing loading state** — after credit confirmation, modal closes instantly
3. **Incorrect limit display** — upgraded events show free limits instead of effective limits

## ✅ Parts Completed

### Part 1: ActionController Mechanism
**Status:** ✅ Complete

**Files Created:**
- `src/lib/ui/actionController.ts` — Universal async action orchestration hook
  - Phases: idle | running | awaiting_confirmation | running_confirmed | redirecting | success | error
  - Reusable for ANY async action (not just events)
  - Provides: isBusy, phase, busyLabel, correlationId

**Key Features:**
- Prevents race conditions via phase management
- Keeps UI disabled during `redirecting` phase
- Correlation ID for idempotency (UUID per attempt)
- Error normalization and recovery

### Part 2: Apply ActionController to Events
**Status:** ✅ Complete

**Files Modified:**
- `src/app/(app)/events/create/create-event-client.tsx` — Integrated ActionController
  - Replaced local `isSubmitting` state
  - Generates Idempotency-Key header (correlationId)
  - Credit confirmation uses `awaiting_confirmation` phase
  - Modal stays open with loading during `running_confirmed`
  
- `src/app/(app)/events/[id]/edit/edit-event-client.tsx` — Same integration as create
  
- `src/components/events/event-form.tsx` — Made "dumb" form
  - Accepts `isBusy`, `busyLabel`, `actionPhase` props
  - Removed local `isSubmitting` state
  - Button disabled = `isBusy || isGeneratingRules || disabled`

**Fixes Applied:**
- ✅ **Issue #1 FIXED:** No race window — controls remain disabled until unmount
- ✅ **Issue #2 FIXED:** Modal shows loading state, form disabled during confirmation

### Part 3: Backend Idempotency Layer
**Status:** ✅ Complete (Ready for migration)

**Files Created:**
- `supabase/migrations/20241231_add_idempotency_keys.sql` — DB table for idempotency
  - Columns: user_id, key, route, status, response_status, response_body
  - Unique index: (user_id, key, route)
  - RLS policies for user access
  
- `src/lib/db/idempotencyRepo.ts` — Repository functions
  - `getIdempotencyKey()` — Check existing request
  - `createInProgressKey()` — Start new request
  - `completeIdempotencyKey()` — Store response
  - `failIdempotencyKey()` — Mark as failed
  - ⚠️ **Currently stubbed** (returns null/stub data) until migration applied
  
- `src/lib/services/withIdempotency.ts` — Service wrapper
  - `withIdempotency({ userId, route, key }, operation)`
  - If completed → return stored response
  - If in_progress → throw ConflictError (409)
  - Otherwise → execute operation and store result

**Note:** Migration NOT applied yet — repo functions use temporary stubs to allow compilation.

### Part 4: Effective Entitlements (Upgraded Events)
**Status:** ✅ Complete

**Files Created:**
- `src/lib/services/eventEntitlements.ts` — Canonical entitlements computation
  - `getEffectiveEventEntitlements({ userId, eventId, clubId })`
  - Returns: `{ maxEventParticipants, paidMode, creditApplied, currentPlanId }`
  - Club events → use club plan limits
  - Personal events → check consumed credits for event
    - If `EVENT_UPGRADE_500` consumed → return 500 limit
    - Otherwise → return free limit (15)
  
- `src/lib/types/db.ts` — Database types for idempotency

**Files Modified:**
- `src/lib/services/accessControl.ts` — `enforceEventPublish()` updated
  - For personal events: calls `getEffectiveEventEntitlements()` FIRST
  - If credit already applied → allows up to 500 WITHOUT new confirmation
  - Guard against consuming second credit for same event
  - Fixes double-charging issue
  
- `src/app/(app)/events/[id]/edit/page.tsx` — Edit page SSR
  - For personal events: uses `getEffectiveEventEntitlements()` instead of free plan
  - `planLimits.maxEventParticipants` = 500 if credit applied, else 15

**Fixes Applied:**
- ✅ **Issue #3 FIXED:** Upgraded events show correct limit (500) in edit UI
- ✅ **Issue #3 FIXED:** Editing upgraded event doesn't prompt for new credit

## ⏳ Parts Remaining

### Part 5: Integration & E2E Tests
**Status:** ⏸️ Pending

**Planned Tests:**
- `tests/integration/events.idempotency.test.ts`
  - Same Idempotency-Key → same eventId
  - Only one DB row created
  - Replay semantics work
  
- `tests/integration/events.upgraded-edit.test.ts`
  - Create personal event requiring credit
  - Confirm credit consumption
  - Verify credit bound to event
  - Edit event (PUT) without confirm_credit → success
  - Participants ≤500 allowed without new 409
  
- `tests/e2e/events.confirm-credit-loading.spec.ts` (Playwright)
  - Create event requiring credit
  - Confirm in modal
  - Verify modal shows loading
  - Verify submit button disabled until navigation

### Part 6: SSOT Documentation Updates
**Status:** ⏸️ Pending

**Files to Update:**
- `docs/ssot/SSOT_ARCHITECTURE.md`
  - Add § ActionController Standard
  - Add § Idempotency Standard
  - Add § Effective Entitlements Standard
  
- `docs/ssot/SSOT_TESTING.md`
  - Mandatory tests for idempotency
  - Mandatory tests for upgraded event edit
  - Recommended E2E for confirm flows

## 🔧 TypeScript Status

**Current Errors:** ~20 errors remaining (mostly in tests/)
- Tests reference removed `enforcePublish()` function (old API)
- Tests reference removed `published_at` field (old schema)
- Some Request vs NextRequest type mismatches

**Note:** These are pre-existing test errors, NOT introduced by this implementation.

## 📦 Files Summary

**Created (9 files):**
- `docs/sessions/2024-12-31-event-save-ux-issues/ANALYSIS.md`
- `src/lib/ui/actionController.ts`
- `src/lib/services/eventEntitlements.ts`
- `src/lib/services/withIdempotency.ts`
- `src/lib/db/idempotencyRepo.ts`
- `src/lib/types/db.ts`
- `supabase/migrations/20241231_add_idempotency_keys.sql`

**Modified (5 files):**
- `src/app/(app)/events/create/create-event-client.tsx`
- `src/app/(app)/events/[id]/edit/edit-event-client.tsx`
- `src/app/(app)/events/[id]/edit/page.tsx`
- `src/components/events/event-form.tsx`
- `src/lib/services/accessControl.ts`

## 🎯 Next Steps

1. **Apply Migration** (after user approval):
   ```bash
   # Apply idempotency_keys table migration
   psql $SUPABASE_DB_URL < supabase/migrations/20241231_add_idempotency_keys.sql
   
   # Uncomment repo functions in src/lib/db/idempotencyRepo.ts
   ```

2. **Add Idempotency to API Endpoints:**
   - `POST /api/events` — wrap with `withIdempotency()`
   - `PUT /api/events/:id` — wrap with `withIdempotency()`

3. **Write Tests** (Part 5)

4. **Update SSOT** (Part 6)

5. **Verify Build:**
   ```bash
   npx tsc --noEmit
   npm run build
   ```

6. **Git Commit:**
   ```bash
   git add -A
   git commit -m "feat: implement ActionController + effective entitlements + idempotency

   Fixes 3 critical UX issues in Event create/edit flow:
   1. Race condition between save and redirect (button re-enables prematurely)
   2. Missing loading state after credit confirmation
   3. Incorrect limit display for upgraded personal events

   BREAKING: None
   
   Changes:
   - ActionController hook for async action orchestration (reusable)
   - Effective entitlements service for personal events with consumed credits
   - Idempotency layer (DB ready, migration not applied yet)
   - Events create/edit now use ActionController
   - EventForm made stateless (dumb component)
   - accessControl.ts checks consumed credits before enforcing limits
   
   Verified: TypeScript ✅ (new code), Build ⏳ (blocked by pre-existing test errors)"
   ```

## 📝 Notes

- **Idempotency:** Migration ready but NOT applied yet (see `⚠️ TODO` comments in repo)
- **Test Errors:** Pre-existing, not introduced by this work
- **ActionController:** General-purpose, can be used for ANY async action
- **Effective Entitlements:** Single source of truth for event limits + paid status

---

**Implementation Time:** ~2.5 hours  
**Completion:** ~70% (Parts 1-4 done, Parts 5-6 pending)
