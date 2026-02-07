# PHASE P0.D — PAYMENT COMPLETION DIAGNOSTIC

**Status:** DIAGNOSTIC COMPLETE  
**Date:** 2026-02-03  
**Type:** Diagnostic Only (NO code changes)  
**Author:** AI Executor (per WORKING CONTRACT)

---

## 1. Purpose

This diagnostic provides fact-based analysis to unblock:

| Phase | Task | Blocker Analysis |
|-------|------|------------------|
| P0.1 | Club subscription settlement implementation | Current `/api/dev/billing/settle` has TODO for subscription activation |
| P0.2 | Production webhook entrypoint skeleton | No webhook endpoint exists; need structural requirements |

**Scope Constraint:** This document contains ONLY facts derived from SSOT and code. No implementation ideas, no refactors, no simulation mechanisms.

---

## 2. In-Scope / Out-of-Scope

### In-Scope
1. Club subscription entitlement model (schema, invariants, lifecycle)
2. Current settlement touchpoints (code facts, what is missing)
3. Minimal webhook entrypoint structural requirements

### Out-of-Scope (HARD)
- Real Kaspi integration
- Signature verification schemes
- Feature flags / payment mode selection
- Simulation provider design
- Billing enforcement changes
- UI work

---

## 3. Club Subscription Model

### 3.1 Table Schema (Actual DB from migration 20241215)

```sql
CREATE TABLE public.club_subscriptions (
  club_id UUID PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.club_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'grace', 'expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  grace_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT club_subscriptions_one_active_per_club UNIQUE (club_id) 
    WHERE status IN ('active', 'pending', 'grace')
);
```

**SOURCE:** Migration `supabase/migrations/20241215_alter_club_subscriptions_v2_SAFE.sql`

**SSOT INCONSISTENCY FLAG:** SSOT_DATABASE.md §6 shows `started_at` / `expires_at`, but actual DB columns are `current_period_start` / `current_period_end`. The repo code (`clubSubscriptionRepo.ts`) correctly uses actual column names. SSOT_DATABASE.md needs correction.

### 3.2 Key Fields

| Field | Type | Purpose | Source |
|-------|------|---------|--------|
| `club_id` | UUID PK/FK | Target club | Transaction.club_id |
| `plan_id` | TEXT FK | Subscription tier | Transaction.plan_id |
| `status` | ENUM | Lifecycle state | Settlement logic sets |
| `current_period_start` | TIMESTAMPTZ | Period start | Calculated at settlement |
| `current_period_end` | TIMESTAMPTZ | Period end | Calculated at settlement |
| `grace_until` | TIMESTAMPTZ | Grace period deadline | Calculated from billing_policy |

### 3.3 Subscription Statuses (SSOT_BILLING_SYSTEM_ANALYSIS.md §10)

| Status | Meaning | Allowed Actions |
|--------|---------|-----------------|
| `pending` | Payment intent created, awaiting payment | None (awaiting payment) |
| `active` | Subscription paid and active | All per plan |
| `grace` | Period expired, in grace period | Most (per billing_policy_actions) |
| `expired` | Grace ended, read-only | Read-only |

### 3.4 Invariants

| Invariant | Enforcement | Source |
|-----------|-------------|--------|
| One active/pending/grace subscription per club | Partial UNIQUE constraint | SSOT_DATABASE.md §6 |
| plan_id must reference valid club_plans entry | FK constraint | SSOT_DATABASE.md §6 |
| status transitions follow state machine | Service layer | SSOT_BILLING_SYSTEM_ANALYSIS.md §10 |

### 3.5 Extend vs Replace Expectation

**OPEN QUESTION:** SSOT does not explicitly define whether a new payment for an existing subscription should:
- **Extend** the current period (add 30 days to expires_at)
- **Replace** the subscription (reset period_start to NOW)

**Evidence from code:**
- `clubSubscriptionRepo.activateSubscription()` uses `upsertClubSubscription()` with `onConflict: 'club_id'`
- This suggests **REPLACE** semantics (new period replaces old)
- Admin extension logic (`adminExtendSubscriptionExpiration.ts`) explicitly **EXTENDS** from current expires_at

**Conclusion:** Cannot determine settlement behavior deterministically. Listed as Open Question.

---

## 4. Current State of Subscription Settlement

### 4.1 DEV Settle Endpoint

**File:** `src/app/api/dev/billing/settle/route.ts`

**Lines 105-113 (exact TODO):**
```typescript
} else if (transaction.club_id && transaction.plan_id) {
  // Club subscription settlement (existing logic)
  // TODO: Implement club subscription activation/extension
  logger.info("Club subscription settlement (TODO)", {
    transactionId: transaction_id,
    clubId: transaction.club_id,
    planId: transaction.plan_id,
  });
}
```

**Current Behavior:**
- One-off credits: IMPLEMENTED (lines 81-103)
- Club subscriptions: NOT IMPLEMENTED (logs TODO only)

### 4.2 One-Off Credit Settlement (Working Pattern)

**Sequence (lines 78-103):**
1. Check `transaction.product_code === "EVENT_UPGRADE_500"`
2. Check `transaction.user_id` exists
3. Call `createBillingCredit()` with idempotency via `sourceTransactionId`
4. Handle duplicate key error (23505) as idempotent success

**Idempotency Mechanism:**
- `billing_credits.source_transaction_id` has UNIQUE constraint
- Re-settle silently succeeds (logged as "Credit already issued")

### 4.3 Available Repository Functions

**File:** `src/lib/db/clubSubscriptionRepo.ts`

| Function | Purpose | Status |
|----------|---------|--------|
| `getClubSubscription(clubId)` | Fetch subscription | Used in enforcement |
| `upsertClubSubscription(subscription)` | Create or update | Available, not called from settle |
| `setClubSubscriptionStatus(clubId, status, graceUntil?)` | Update status only | Available |
| `activateSubscription(clubId, planId, periodStart, periodEnd, graceUntil?)` | Full activation | Available, not called from settle |

**Gap:** `activateSubscription()` exists but is NOT called from `/api/dev/billing/settle`.

### 4.4 What Is Missing for Subscription Settlement

| Missing Item | Type | Notes |
|--------------|------|-------|
| Call to `activateSubscription()` in settle route | Code | TODO marker exists |
| Period calculation logic | Code | periodStart = NOW, periodEnd = NOW + 30 days |
| Idempotency handling for subscriptions | Code | No equivalent to credit's source_transaction_id UNIQUE |
| Transaction → Subscription binding | Code | No field linking completed transaction to subscription |

---

## 5. Required Behavior of Settlement for Subscriptions

### 5.1 Derivable from SSOT/Code

| Behavior | Source | Confidence |
|----------|--------|------------|
| Subscription must be set to `status='active'` | SSOT_BILLING_SYSTEM_ANALYSIS.md §10 | HIGH |
| Plan must match `transaction.plan_id` | DB constraint | HIGH |
| Settlement must be idempotent | SSOT_ARCHITECTURE.md §9.1 | HIGH |

### 5.2 Open Questions (Not Derivable)

| Question | Why Unknown |
|----------|-------------|
| Extend vs Replace on re-payment | SSOT does not specify; admin extension extends, but user payment unclear |
| Period length (30 days assumed) | Hardcoded assumption; not in DB or SSOT |
| Grace period auto-set on activation | SSOT_BILLING_SYSTEM_ANALYSIS.md shows grace_period_days=7, but unclear if set at activation |
| Subscription → Transaction binding for idempotency | No FK or field in schema to track which transaction activated subscription |

---

## 6. Minimal Webhook Entrypoint Skeleton Needs

### 6.1 Route Placement (Structural Fact)

**Current API structure:**
```
src/app/api/billing/
├── products/route.ts
├── purchase-intent/route.ts
└── transactions/status/route.ts
```

**Webhook route options:**
- `src/app/api/billing/webhook/route.ts` (generic)
- `src/app/api/billing/kaspi/webhook/route.ts` (provider-specific)

**Recommendation basis:** SSOT_API.md does not specify webhook location. Either is structurally valid.

### 6.2 Expected Input Fields (From Transaction Schema)

To identify and settle a transaction, webhook needs:

| Field | Purpose | Source |
|-------|---------|--------|
| `provider_payment_id` | External payment reference | `billing_transactions.provider_payment_id` |
| Transaction amount | Verification | `billing_transactions.amount` |
| Payment status | completed/failed/refunded | Webhook payload |

**Lookup sequence:**
1. Receive webhook with `provider_payment_id`
2. Query `billing_transactions` by `provider_payment_id`
3. Call settlement logic (same as DEV settle)

### 6.3 Settlement Logic Reuse

**Fact:** DEV settle endpoint contains inline settlement logic (lines 77-114).

**For production webhook:**
- Must call SAME settlement logic as DEV settle
- Current code is NOT extracted to reusable service function
- Settlement logic is embedded in API route handler

**Structural gap:** Settlement logic not in service layer.

### 6.4 Minimal Webhook Handler Shape

```
POST /api/billing/webhook

Input: Provider-specific payload (TBD)
1. Parse and validate payload
2. Extract provider_payment_id
3. Lookup transaction by provider_payment_id
4. Verify transaction state (must be 'pending')
5. Call settlement logic (same as DEV settle)
6. Return acknowledgment
```

---

## 7. File Inventory

### 7.1 Settlement-Related Files

| Path | Purpose |
|------|---------|
| `src/app/api/dev/billing/settle/route.ts` | DEV settlement endpoint (contains TODO) |
| `src/lib/db/clubSubscriptionRepo.ts` | Subscription CRUD (has activateSubscription) |
| `src/lib/db/billingTransactionsRepo.ts` | Transaction CRUD |
| `src/lib/db/billingCreditsRepo.ts` | Credit CRUD (working settlement pattern) |

### 7.2 Type Definition Files

| Path | Purpose |
|------|---------|
| `src/lib/types/billing.ts` | All billing types (ClubSubscription, PlanId, etc.) |

### 7.3 Related API Routes

| Path | Purpose |
|------|---------|
| `src/app/api/billing/purchase-intent/route.ts` | Creates pending transaction |
| `src/app/api/billing/transactions/status/route.ts` | Polls transaction status |

### 7.4 Admin Reference (Working Pattern)

| Path | Purpose |
|------|---------|
| `src/lib/billing/admin/adminExtendSubscriptionExpiration.ts` | Admin subscription extension (reference pattern) |

---

## 8. Open Questions / Unknowns

| # | Question | Impact | Blocking? |
|---|----------|--------|-----------|
| OQ-1 | Extend vs Replace on payment completion | Affects period calculation | YES |
| OQ-2 | Subscription period length (days) | Affects expires_at calculation | YES |
| OQ-3 | Grace period auto-assignment on activation | Affects grace_until field | NO (can default to null) |
| OQ-4 | Idempotency mechanism for subscription settlement | Affects re-settle safety | YES |
| OQ-5 | Settlement logic extraction to service layer | Affects webhook implementation | NO (can duplicate initially) |
| OQ-6 | Webhook payload structure (Kaspi-specific) | Affects validation | OUT OF SCOPE |

---

## 9. SSOT Cross-References

| SSOT Document | Relevant Sections |
|---------------|-------------------|
| SSOT_DATABASE.md | §6 club_subscriptions schema |
| SSOT_BILLING_SYSTEM_ANALYSIS.md | §10 Subscription state machine, §11 Cancellation policy |
| SSOT_ARCHITECTURE.md | §9.1 Idempotency requirements |
| SSOT_API.md | API-023 current-plan, purchase-intent |

---

## 10. Conclusions for Architect

### 10.1 Facts Established

1. `club_subscriptions` schema exists and is documented
2. `clubSubscriptionRepo.activateSubscription()` function exists and is unused
3. DEV settle endpoint has explicit TODO for subscription settlement
4. One-off credit settlement pattern is working and can be followed
5. No webhook endpoint exists currently

### 10.2 Architect Decisions Required

Before P0.1/P0.2 implementation can proceed:

1. **OQ-1:** Define extend vs replace semantics for subscription settlement
2. **OQ-2:** Confirm subscription period length (30 days assumed)
3. **OQ-4:** Define idempotency mechanism for subscription settlement

### 10.3 SSOT Documentation Inconsistency

**SSOT_DATABASE.md §6** incorrectly documents `started_at` / `expires_at`.  
**Actual DB columns** (per migration 20241215): `current_period_start` / `current_period_end`.  
**Code** (`clubSubscriptionRepo.ts`): correctly uses actual column names.

**Action:** SSOT_DATABASE.md needs correction. Not blocking for P0 implementation.

---

**END OF DIAGNOSTIC**

*No implementation until explicit GO from Architect on Open Questions.*
