# Phase P2 — Club Creation Billing Gate

**Status:** In Progress  
**Document type:** Implementation Log  
**Date:** 2026-02-07

---

## STEP 1 — Backend Enforcement: Create Club

### What Was Added

- **Eligibility check** in `createClub()` (service layer)
- **Location:** `src/lib/services/clubs.ts` — immediately after auth validation, before any DB writes
- **Repository function:** `hasUnlinkedActiveSubscriptionForUser(userId)` in `src/lib/db/clubSubscriptionRepo.ts`

### Check Logic

Per UX_CONTRACT_CLUB_CREATION and Architect policy:

> A club may be created ONLY if there exists an active or grace subscription that is NOT yet linked to a club.  
> Each subscription grants the right to create EXACTLY ONE club.

- If user has no unlinked active/grace subscription → **throw PaywallError** with reason `CLUB_CREATION_REQUIRES_PLAN`
- `respondError()` converts PaywallError to HTTP 402
- UI is expected to show PaywallModal on 402 (handled in subsequent steps)

### Schema Limitation (Current)

The current `club_subscriptions` table has:

- `club_id UUID NOT NULL` as primary key
- No `user_id` column

Therefore, **no unlinked subscription can exist** in the current schema. The function `hasUnlinkedActiveSubscriptionForUser()` returns `false` until Step 2 adds schema support for user-scoped / pre-club entitlements (e.g. `club_id` nullable + `user_id`, or equivalent).

**Effect:** All club creation attempts currently result in 402. This is correct per policy: no user can have entitlement until the purchase-before-creation flow exists.

### Alignment with UX_CONTRACT_CLUB_CREATION

| State | Expected | Implementation |
|-------|----------|----------------|
| S1 — No subscription | Paywall | ✅ PaywallError |
| S2 — Subscription exists, club_id NULL | Create allowed | ⏳ Schema not ready; check will support when Step 2 adds it |
| S3 — Subscription used (club_id set) | Paywall | ✅ PaywallError (no unlinked sub) |
| S4 — Expired/cancelled | Paywall | ✅ PaywallError |

### No UI Changes in This Step

- No changes to forms, pages, or PaywallModal wiring
- UI 402 handling for club creation will be added in a later step

### Verification

- S1 (no subscription) → PaywallError ✅
- S2 (would require schema) → N/A
- S3 (subscription linked) → PaywallError ✅
- S4 (expired) → PaywallError ✅

---

## STEP 2 — Pre-Club Subscription Entitlements

### Schema Summary

**New table:** `club_subscription_entitlements`

| Column      | Type        | Constraint                          |
|-------------|-------------|-------------------------------------|
| id          | UUID        | PK, default gen_random_uuid()       |
| user_id     | UUID        | NOT NULL, FK → users.id             |
| plan_id     | TEXT        | NOT NULL, FK → club_plans.id        |
| status      | TEXT        | CHECK IN (active, consumed, expired, cancelled) |
| valid_from  | TIMESTAMPTZ | NOT NULL                            |
| valid_until | TIMESTAMPTZ | NOT NULL                            |
| consumed_at | TIMESTAMPTZ | NULL                                |
| club_id     | UUID        | NULL, FK → clubs.id, UNIQUE         |
| created_at  | TIMESTAMPTZ | NOT NULL                            |
| updated_at  | TIMESTAMPTZ | NOT NULL                            |

**Constraints:**
- One entitlement → one club (club_id UNIQUE when set)
- Consumed exactly once (status = consumed, consumed_at set, club_id set)
- No cascading delete that could "free" an entitlement

**Migration:** `supabase/migrations/20260207_create_club_subscription_entitlements.sql`

### Eligibility Query Semantics

`hasUnlinkedActiveSubscriptionForUser(userId)`:
- user_id matches
- status = 'active'
- valid_from <= now < valid_until
- club_id IS NULL

**Location:** `src/lib/db/clubSubscriptionEntitlementRepo.ts`

### Atomicity Guarantees

- **RPC:** `create_club_consuming_entitlement(p_user_id, p_name, ...)`
- Single transaction:
  1. SELECT entitlement FOR UPDATE SKIP LOCKED (row lock, race-safe)
  2. If none → RAISE EXCEPTION 'CLUB_CREATION_REQUIRES_PLAN'
  3. INSERT clubs
  4. Trigger adds owner to club_members
  5. UPDATE entitlement (status=consumed, consumed_at, club_id)
  6. INSERT club_subscriptions
  7. INSERT club_cities
- Parallel create attempts → only one succeeds; others get PaywallError

### Reference

- ADR-002: docs/adr/active/ADR-002_PRE_CLUB_SUBSCRIPTION_ENTITLEMENTS.md

---

## STEP 3 — UI Handling: 402 → Paywall

### What Was Added

- **402 Paywall handling** in `ClubForm` component
- **Location:** `src/components/clubs/club-form.tsx` — `handleSubmit` function
- **Hook:** `usePaywall()` from `@/components/billing/paywall-modal`

### Implementation Details

**Handler Logic:**
1. After `fetch()` response, check `res.status === 402` AND `mode === "create"`
2. Parse error response: `json.error || json`
3. Verify paywall code: `errorData.details?.code === 'PAYWALL' || errorData.code === 'PAYWALL'`
4. Call `showPaywall(errorData.details || errorData)` — passes full PaywallError payload
5. Return early (no generic error toast)

**Component Changes:**
- Added `usePaywall()` hook import and initialization
- Added `PaywallModalComponent` to JSX (renders conditionally when paywall is shown)
- 402 handling only applies to `mode === "create"` (edit mode unchanged)

### Alignment with UX_CONTRACT_CLUB_CREATION

| State | Expected UX | Implementation |
|-------|-------------|----------------|
| S1 — No subscription | PaywallModal | ✅ 402 → showPaywall() |
| S2 — Active entitlement | Club creation form | ✅ Success flow (no 402) |
| S3 — Entitlement used | PaywallModal | ✅ 402 → showPaywall() |
| S4 — Expired entitlement | PaywallModal | ✅ 402 → showPaywall() |

**Per UX_CONTRACT §6:**
> HTTP 402 MUST always trigger PaywallModal

**Per UX_CONTRACT §5.1, 5.5, 5.6:**
> Paywall reason: `CLUB_CREATION_REQUIRES_PLAN`

### Error Response Format

Backend returns (via `respondError()`):
```json
{
  "success": false,
  "error": {
    "code": "PAYWALL",
    "message": "...",
    "details": {
      "reason": "CLUB_CREATION_REQUIRES_PLAN",
      "code": "PAYWALL",
      "currentPlanId": "...",
      "requiredPlanId": "...",
      ...
    }
  }
}
```

UI extracts `errorData.details || errorData` and passes to `showPaywall()`.

### Reference Implementation

Pattern matches existing 402 handling in:
- `src/components/clubs/club-members-list.tsx` (lines 49-57)

### Verification

**S1 — No entitlement:**
- Submit create club → HTTP 402 → PaywallModal shown ✅

**S2 — Active entitlement:**
- Submit create club → HTTP 201 → Success redirect ✅

**S3 — Entitlement already used:**
- Submit create club → HTTP 402 → PaywallModal shown ✅

**S4 — Expired entitlement:**
- Submit create club → HTTP 402 → PaywallModal shown ✅

### Compliance

- ✅ UI reacts to backend decision (no client-side eligibility checks)
- ✅ Generic error NOT shown on 402
- ✅ PaywallModal shown with canonical reason mapping
- ✅ Only applies to club creation (edit mode unchanged)

---

**END OF STEP 3 IMPLEMENTATION NOTE**
