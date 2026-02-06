# PHASE FIX — Club Create Subscription Enforcement

**Status:** Implemented  
**Scope:** Backend only, single guard, single commit  
**Commit:** `enforce club creation requires active club subscription`

---

## 1. Summary

Creating a club is a **PAID** action. A user **without** an active CLUB SUBSCRIPTION must not create a club. Enforcement is done **in the backend only**; the UI is not a source of truth. The existing global club-paywall mechanism is used (no new modals or UI changes).

---

## 2. Decisions (Locked)

- Creating a club requires an **active club subscription** (user must have at least one club where they are a member and that club has `club_subscriptions.status === 'active'`).
- Enforcement point: **before** club creation in the service layer.
- Canonical error: **HTTP 402**, **PaywallError**, **reason:** `CLUB_CREATION_REQUIRES_PLAN`.
- No UI code changes; frontend reacts via existing paywall handling to 402.

---

## 3. Implementation

### 3.1 Guard: `enforceClubCreation` (accessControl.ts)

- **Signature:** `enforceClubCreation(params: { userId: string }): Promise<void>`  
- **Logic:**
  1. Load user’s clubs: `listUserClubsWithRole(userId)`.
  2. If no memberships → throw `PaywallError` with reason `CLUB_CREATION_REQUIRES_PLAN`.
  3. Load subscriptions for those clubs: `getClubSubscriptionsByClubIds(clubIds)`.
  4. If no subscription has `status === 'active'` → throw same `PaywallError`.
  5. Otherwise return (allow).
- **Imports added:** `listUserClubsWithRole` (clubMemberRepo), `getClubSubscriptionsByClubIds` (clubSubscriptionRepo).

### 3.2 Call site: `createClub` (clubs.ts)

- After auth check, **before** validation and `createClubRepo`:
  - `await enforceClubCreation({ userId: currentUser.id });`
- If the guard throws, no club is created (no side effects).

### 3.3 Target flow

- **POST /api/clubs** → `createClub(body, user)` → `enforceClubCreation({ userId })` → on success: `createClubRepo(...)`.

---

## 4. Testing

**File:** `tests/integration/club.create.enforcement.test.ts`

| Case | Setup | Action | Expected |
|------|--------|--------|----------|
| 1 | Authenticated user, **no** clubs (no active subscription) | `createClub(body, currentUser)` | 402 PaywallError, `reason === 'CLUB_CREATION_REQUIRES_PLAN'`, no club row created |
| 2 | Same user, one club with **active** subscription (DB seed: club + club_members + club_subscriptions) | `createClub(body, currentUser)` | Success, club created; user has 2 clubs |

---

## 5. Files Changed

- `src/lib/services/accessControl.ts` — `enforceClubCreation` rewritten to enforce active club subscription; throws PaywallError(402) with `CLUB_CREATION_REQUIRES_PLAN`.
- `src/lib/services/clubs.ts` — import `enforceClubCreation`; call `enforceClubCreation({ userId: currentUser.id })` in `createClub` before repo.
- `tests/integration/club.create.enforcement.test.ts` — new integration tests (Case 1 and Case 2).
- `docs/phase/fix/PHASE_FIX_CLUB_CREATE_SUBSCRIPTION_ENFORCEMENT.md` — this document.

---

## 6. Verification

- `npm test -- tests/integration/club.create.enforcement.test.ts` — passes.
- No UI or paywall component changes.
- Single guard, single commit, backend-only.
