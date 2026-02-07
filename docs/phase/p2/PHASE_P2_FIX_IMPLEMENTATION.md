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

**END OF STEP 1 IMPLEMENTATION NOTE**
