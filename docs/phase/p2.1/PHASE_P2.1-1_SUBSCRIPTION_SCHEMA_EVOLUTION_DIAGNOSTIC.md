# Subscription Schema Evolution — Pre-Club Entitlement Model

---
Status: DRAFT
Created: 2026-02-07
Author: Cursor AI
Phase: p2.1
---

## 1. Problem Statement

**Policy (per UX_CONTRACT_CLUB_CREATION):**
- 1 subscription → 1 club
- Subscription must be purchasable **BEFORE** club creation
- Subscription is valid for **1 month** from purchase
- Subscription becomes **permanently associated** with the club at creation time
- Paywall reason: `CLUB_CREATION_REQUIRES_PLAN`

**Current blocker (Phase P2 STEP 1):**
- Enforcement has been added to `createClub()`: `hasUnlinkedActiveSubscriptionForUser(userId)` is called before creation.
- `club_subscriptions` schema does **not** support unlinked (pre-club) entitlements:
  - `club_id` is part of the primary/unique key and is NOT NULL
  - No `user_id` column exists
- Result: `hasUnlinkedActiveSubscriptionForUser()` always returns `false`; all club creation attempts yield 402. Correct per policy, but no purchase-before-creation flow can exist until schema supports user-scoped, unlinked entitlements.

**Goal of this diagnostic:**  
Design a minimal, SSOT-aligned database model that supports:
- (A) Subscription purchase **before** club creation (unlinked entitlement)
- (B) Exactly **one** club can be created per subscription
- (C) Permanent binding at club creation time
- (D) Validity: **1 month** from purchase date
- (E) No regressions to existing club subscriptions (already linked)
- (F) Queryability for enforcement: *"does user have an active/grace subscription that is NOT yet linked to a club?"*

---

## 2. Current Schema Findings (with evidence)

### 2.1 club_subscriptions — Actual Schema (from migrations)

**Evidence:** Migrations `20241212_create_club_subscriptions.sql`, `20241215_alter_club_subscriptions_v2_SAFE.sql`

| Column | Type | Constraint |
|--------|------|------------|
| `club_id` | UUID | **PRIMARY KEY**, REFERENCES clubs(id) ON DELETE CASCADE, **NOT NULL** |
| `plan_id` | TEXT | NOT NULL, FK to club_plans(id) |
| `status` | TEXT | NOT NULL, CHECK IN ('active','pending','grace','expired') |
| `current_period_start` | TIMESTAMPTZ | nullable |
| `current_period_end` | TIMESTAMPTZ | nullable |
| `grace_until` | TIMESTAMPTZ | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

**Constraints:**
- `club_subscriptions_one_active_per_club`: UNIQUE (club_id) WHERE status IN ('active','pending','grace')
- Upsert uses `onConflict: 'club_id'` (clubSubscriptionRepo.ts:122)

**No `id` column** — PK is `club_id`. SSOT_DATABASE.md shows `id UUID PRIMARY KEY` and `started_at`/`expires_at`; actual schema uses `club_id` as PK and `current_period_start`/`current_period_end`. **SSOT drift.**

### 2.2 Why Current Schema Cannot Represent Unlinked Subscription

| Limitation | Evidence |
|------------|----------|
| `club_id` NOT NULL | Migration 20241212: `club_id UUID PRIMARY KEY REFERENCES clubs(id)`; FK requires valid club |
| No `user_id` | No column in any migration |
| No unlinked state | Every row must reference a club; no row can exist before club exists |
| Validity window | `current_period_start`/`current_period_end` exist but row cannot exist without club_id |

### 2.3 billing_transactions — Pre-Club Purchase Constraint

**Evidence:** `20241225_extend_billing_transactions.sql`, `20241225_add_user_id_to_billing_transactions.sql`

- `chk_club_products_require_club`: CLUB_* products require `club_id IS NOT NULL AND plan_id IS NOT NULL`
- One-off (EVENT_UPGRADE_500): `club_id` nullable, `user_id` required
- **Conclusion:** billing_transactions **cannot** store a completed CLUB_* purchase without club_id under current constraints. Pre-club purchase would require either relaxing this constraint or using a separate entitlement store.
- **SSOT rule (BILLING):** "Transaction logs ≠ entitlement". Access state is in `club_subscriptions` (clubs) and `billing_credits` (one-off). We need an entitlement store, not just transactions.

### 2.4 billing_credits — Not Reusable for Club Entitlements

- `billing_credits`: user-level, one-off, consumed once (event binding)
- Club subscription: recurring concept, club binding, different lifecycle
- **Conclusion:** Do not overload billing_credits for club entitlements.

### 2.5 Codepaths — Blast Radius

| Location | Operation | Notes |
|----------|-----------|-------|
| `clubSubscriptionRepo.ts` | READ: getClubSubscription, getClubSubscriptionsByClubIds | By club_id |
| `clubSubscriptionRepo.ts` | READ: hasUnlinkedActiveSubscriptionForUser | Stub, returns false |
| `clubSubscriptionRepo.ts` | WRITE: upsertClubSubscription, setClubSubscriptionStatus, activateSubscription | All require clubId |
| `accessControl.ts` | READ: getClubSubscription(clubId) | Used by enforceClubAction |
| `clubs.ts` | READ: hasUnlinkedActiveSubscriptionForUser(userId) | Before createClub |
| `admin/clubs/route.ts` | READ: club_subscriptions | Admin listing |
| `adminExtendSubscriptionExpiration.ts` | UPDATE: club_subscriptions | Admin extend |
| RLS policies | club_subscriptions | `club_members.club_id = club_subscriptions.club_id` — assumes club_id exists |

**Triggers:** Auto-subscription trigger was **dropped** in `20241215_drop_auto_subscription_trigger.sql`. No trigger creates club_subscriptions on club creation.

---

## 3. Requirements (restating A–F)

| ID | Requirement |
|----|-------------|
| A | Subscription purchase BEFORE club creation (unlinked entitlement) |
| B | Exactly ONE club per subscription |
| C | Permanent binding at club creation time |
| D | Validity: 1 month from purchase date |
| E | No regressions to existing linked subscriptions |
| F | Query: "does user have active/grace subscription NOT yet linked to club?" |

---

## 4. Candidate Models

### Candidate A: Modify club_subscriptions (Additive)

**Schema sketch:**
```sql
-- Add columns
ALTER TABLE club_subscriptions ADD COLUMN id UUID DEFAULT gen_random_uuid();
ALTER TABLE club_subscriptions ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE club_subscriptions ALTER COLUMN club_id DROP NOT NULL;

-- New PK: id (surrogate)
-- Migrate: set id = gen_random_uuid() for existing rows, make id PK
-- club_id becomes nullable; UNIQUE (club_id) partial index: WHERE club_id IS NOT NULL
```

**Key columns after migration:**
- `id` UUID PRIMARY KEY (new surrogate PK)
- `user_id` UUID NOT NULL (purchaser) — required when club_id IS NULL
- `club_id` UUID NULL (linked club; NULL = unlinked)
- `plan_id`, `status`, `current_period_start`, `current_period_end`, `grace_until`, `created_at`, `updated_at`

**Constraints:**
- UNIQUE (user_id) WHERE club_id IS NULL AND status IN ('active','pending','grace') — one unlinked per user
- UNIQUE (club_id) WHERE club_id IS NOT NULL AND status IN ('active','pending','grace') — one active per club (existing semantics)
- CHECK: (club_id IS NULL AND user_id IS NOT NULL) OR (club_id IS NOT NULL)
- 1 subscription → 1 club: UNIQUE (club_id) WHERE club_id IS NOT NULL AND status IN ('active','pending','grace')

**Lifecycle:**
1. Purchase → INSERT with user_id, club_id=NULL, status='active', period = 1 month
2. Create club → UPDATE SET club_id=new_club_id WHERE id=...
3. Existing linked rows: unchanged; user_id backfilled from clubs.owner_user_id or left NULL for legacy

**Migration safety:** Medium. Requires PK change (club_id → id), data backfill, constraint updates. Existing code paths (getClubSubscription by club_id) remain valid if indexed.

---

### Candidate B: New Table `club_subscription_entitlements` (User-Level)

**Schema sketch:**
```sql
CREATE TABLE club_subscription_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES club_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active','grace','expired')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,  -- purchased_at + 1 month
  grace_until TIMESTAMPTZ,
  linked_club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,  -- NULL = unlinked
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT one_unlinked_active_per_user UNIQUE (user_id) 
    WHERE linked_club_id IS NULL AND status IN ('active','grace')
);

CREATE UNIQUE INDEX idx_entitlements_one_linked_per_club 
  ON club_subscription_entitlements(linked_club_id) 
  WHERE linked_club_id IS NOT NULL AND status IN ('active','grace');
```

**Lifecycle:**
1. Purchase → INSERT into club_subscription_entitlements (user_id, plan_id, status='active', expires_at = NOW() + 1 month)
2. Create club → INSERT club; INSERT club_members (owner); UPDATE club_subscription_entitlements SET linked_club_id = new_club_id WHERE id = selected_entitlement
3. Ongoing club operations: use existing `club_subscriptions` populated from entitlements at bind time, OR query entitlements where linked_club_id = club_id

**Two-table approach:** 
- `club_subscription_entitlements`: user-scoped, pre-club and linked
- `club_subscriptions`: club-scoped, populated when entitlement is linked (or optionally deprecated if entitlements fully replace it)

**Simpler variant:** Entitlements table only. When linking, INSERT into club_subscriptions from entitlement and mark entitlement as linked. Existing club_subscriptions remains source of truth for club-level access; entitlements is source for "can create club".

**Migration safety:** High. Additive; no changes to club_subscriptions. Existing linked clubs continue to use club_subscriptions. New flow uses entitlements.

---

### Candidate C: Reuse billing_transactions + New Entitlements View/Table

**Idea:** Extend billing_transactions to allow CLUB_* with club_id=NULL, user_id NOT NULL for completed purchases. Derive entitlement from transactions.

**Schema changes:**
- Relax `chk_club_products_require_club`: Allow (product_code LIKE 'CLUB_%' AND user_id IS NOT NULL AND club_id IS NULL) for completed pre-club purchases
- Add `billing_transactions.club_linked_at` (nullable): set when entitlement is bound to club

**Problems:**
- billing_transactions is **audit**; SSOT says "Transaction logs ≠ entitlement". Using it as entitlement store violates separation.
- Complex query: need to join transactions, deduplicate, check period, exclude already-linked. Multiple completed CLUB_* transactions per user possible (refunds, retries).
- **Conclusion:** Not recommended. Billing transactions should remain audit-only.

---

## 5. Compatibility & Migration Risk

| Candidate | Existing clubs | Migration complexity | Rollback |
|-----------|----------------|----------------------|----------|
| A | Must backfill user_id; preserve club_id semantics | High (PK change) | Complex |
| B | No change to club_subscriptions | Low | Drop new table |
| C | N/A | Medium (constraint change) | Revert constraint |

**RLS / Policies:**
- Candidate A: RLS on club_subscriptions assumes club_id. Unlinked rows (club_id NULL) need policy: user can read own rows where club_id IS NULL.
- Candidate B: New table needs RLS: user can read own rows (user_id = auth.uid()).

**Backwards compatibility:**
- `getClubSubscription(clubId)` must continue to work for linked clubs.
- `enforceClubAction(clubId, ...)` unchanged.
- `hasUnlinkedActiveSubscriptionForUser(userId)` gets real implementation.

---

## 6. Enforcement Query Spec

### hasUnlinkedActiveSubscriptionForUser(userId)

**Semantics:**
- Return `true` iff there exists a subscription/entitlement row such that:
  - `user_id` = userId (or equivalent purchaser identity)
  - `status` IN ('active', 'grace')
  - `club_id` IS NULL (or `linked_club_id` IS NULL)
  - Validity: `current_period_end` >= NOW() OR (`status` = 'grace' AND `grace_until` >= NOW())

**Candidate A (modified club_subscriptions):**
```sql
SELECT 1 FROM club_subscriptions
WHERE user_id = $1
  AND club_id IS NULL
  AND status IN ('active','grace')
  AND (
    (current_period_end IS NULL OR current_period_end >= NOW())
    OR (status = 'grace' AND grace_until IS NOT NULL AND grace_until >= NOW())
  )
LIMIT 1;
```

**Candidate B (entitlements table):**
```sql
SELECT 1 FROM club_subscription_entitlements
WHERE user_id = $1
  AND linked_club_id IS NULL
  AND status IN ('active','grace')
  AND (expires_at >= NOW() OR (grace_until IS NOT NULL AND grace_until >= NOW()))
LIMIT 1;
```

**Race-condition safety:** Use `SELECT ... FOR UPDATE SKIP LOCKED` (or equivalent) when claiming an entitlement during club creation to prevent two parallel create attempts from consuming the same entitlement.

---

## 7. Recommendation (ONE)

**Recommendation: Candidate B — New table `club_subscription_entitlements`**

**Rationale:**
1. **Minimality:** Additive only. No changes to club_subscriptions; no PK migration.
2. **Migration safety:** Zero impact on existing clubs. All current codepaths unchanged.
3. **Clear separation:** Entitlements = "right to create club"; club_subscriptions = "club’s current plan state". Matches SSOT rule: access state is explicit, not inferred from transactions.
4. **Query simplicity:** Single table, clear predicate for unlinked active/grace.
5. **1-month validity:** `expires_at` = purchased_at + 1 month is explicit.
6. **1 subscription → 1 club:** UNIQUE (user_id) WHERE linked_club_id IS NULL prevents multiple unlinked entitlements; binding sets linked_club_id, so one entitlement maps to one club.
7. **Race safety:** Use row lock when binding entitlement to club in same transaction as club creation.

**Binding flow at club creation:**
1. BEGIN
2. SELECT id FROM club_subscription_entitlements WHERE user_id=$1 AND linked_club_id IS NULL AND status IN ('active','grace') AND expires_at >= NOW() FOR UPDATE SKIP LOCKED LIMIT 1
3. If none → throw PaywallError(CLUB_CREATION_REQUIRES_PLAN)
4. INSERT club, get club_id
5. INSERT club_members (owner)
6. INSERT club_subscriptions (club_id, plan_id, status, period from entitlement) — sync club’s plan state
7. UPDATE club_subscription_entitlements SET linked_club_id=club_id WHERE id=entitlement_id
8. COMMIT

**Existing club_subscriptions** remains the source of truth for `enforceClubAction` and club plan display. Entitlements table is the source for pre-club eligibility.

---

## 8. Open Questions / Risks

1. **Naming:** `club_subscription_entitlements` vs `club_creation_entitlements` vs `club_plan_entitlements` — product alignment.
2. **Idempotency:** If club creation fails after entitlement is marked linked, need compensating update (SET linked_club_id=NULL) or explicit two-phase bind.
3. **Admin grants:** Admin can extend `club_subscriptions`. Do we need admin-created entitlements (pre-club)? If yes, add `source` column similar to billing_credits.
4. **SSOT drift:** SSOT_DATABASE.md club_subscriptions schema (id PK, started_at/expires_at) does not match migrations (club_id PK, current_period_*). Recommend resolving in separate change.
5. **Grace semantics:** For unlinked entitlement, is grace_until used? Policy says "1 month from purchase". Recommend: grace applies only after initial period; unlinked entitlement expires at expires_at unless extended.

---

## 9. Appendix: References

| Reference | Path |
|-----------|------|
| DOCUMENT_GOVERNANCE | docs/DOCUMENT_GOVERNANCE.md |
| P1 Diagnostic | docs/phase/p1/PHASE_P1_CLUB_CREATION_DIAGNOSTIC_REPORT.md |
| P2 STEP 1 | docs/phase/p2/PHASE_P2_FIX_IMPLEMENTATION.md |
| UX Contract | docs/ui-contracts/system/UX_CONTRACT_CLUB_CREATION.md |
| UX Copy | docs/ui-contracts/system/UX_COPY_CONTRACT_CLUB_CREATION_v1.1.md |
| SSOT Billing | docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md |
| SSOT Database | docs/ssot/SSOT_DATABASE.md |
| SSOT API | docs/ssot/SSOT_API.md |
| SSOT Architecture | docs/ssot/SSOT_ARCHITECTURE.md |
| clubSubscriptionRepo | src/lib/db/clubSubscriptionRepo.ts |
| accessControl | src/lib/services/accessControl.ts |
| clubs createClub | src/lib/services/clubs.ts |
| Migration club_subscriptions | supabase/migrations/20241212_create_club_subscriptions.sql |
| Migration alter v2 | supabase/migrations/20241215_alter_club_subscriptions_v2_SAFE.sql |
| Migration drop trigger | supabase/migrations/20241215_drop_auto_subscription_trigger.sql |
| Migration billing extend | supabase/migrations/20241225_extend_billing_transactions.sql |
| Migration billing user_id | supabase/migrations/20241225_add_user_id_to_billing_transactions.sql |
