# PHASE_P1_D — PAYMENT PROVIDER ARCHITECTURE DIAGNOSTIC

**Status:** DIAGNOSTIC COMPLETE  
**Date:** 2026-02-04  
**Phase Type:** Diagnostic Only (NO code changes)  
**Author:** AI Executor (per WORKING CONTRACT — ARCHITECT × EXECUTOR PROCESS)

---

## 1. Purpose

Establish FACTS about the current payment execution architecture to enable:
- Simulation vs Real payment switching (Kaspi)
- Provider abstraction introduction
- Contract/terminology alignment (e.g. transaction statuses)

**SCOPE CONSTRAINT:** This document contains ONLY facts derived from code, schema, and SSOT documents. No implementation ideas, no refactors, no new abstractions proposed.

---

## 2. In-Scope / Out-of-Scope

### In-Scope

1. Current "provider" data model and usage:
   - `billing_transactions` fields: `provider`, `provider_payment_id`, `amount`, `status`
   - Where and how these fields are written/read
2. Current purchase intent flow:
   - Where pending transactions are created
   - How (stub) payment URL is generated
   - What is returned to UI
3. Current settlement entry points:
   - DEV settle route
   - Production webhook skeleton (`/api/billing/webhook`)
   - Settlement semantics for credits and subscriptions (as-is)
4. Status taxonomy:
   - ALL possible values for `billing_transactions.status`
   - DB constraints, TS types, code comparisons
   - Identification of inconsistencies
5. Boundary mapping:
   - Payment Execution vs Billing Domain
6. File inventory

### Out-of-Scope (HARD)

- Implementing Kaspi
- Signature validation design
- Simulation provider design
- Payment mode flags
- UI changes
- DB migrations

---

## 3. Current Payment Execution Architecture

### 3.1 Architecture Diagram (As-Is)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    PAYMENT EXECUTION ARCHITECTURE (Current)                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌────────────┐    ┌──────────────────────────┐    ┌─────────────────────────┐   │
│  │  Frontend  │───▶│ POST /api/billing/       │───▶│  billing_transactions   │   │
│  │  Paywall   │    │   purchase-intent        │    │  (status='pending')     │   │
│  └────────────┘    └──────────────────────────┘    │  provider='kaspi'       │   │
│                             │                      │  provider_payment_id=   │   │
│                             │                      │    'KASPI_timestamp_*'  │   │
│                             ▼                      └─────────────────────────┘   │
│                    ┌──────────────────────────┐              │                   │
│                    │ Return to UI:            │              │                   │
│                    │ - transaction_id         │              │                   │
│                    │ - transaction_reference  │              │                   │
│                    │ - payment (stub Kaspi)   │              │                   │
│                    └──────────────────────────┘              │                   │
│                                                              │                   │
│  ════════════════════════════════════════════════════════════════════════════   │
│                         SETTLEMENT ENTRY POINTS                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│                                                              │                   │
│     ┌─────────────────────────────────────────────────────────┐                 │
│     │                                                         │                 │
│     ▼                                                         ▼                 │
│  ┌──────────────────────────┐              ┌──────────────────────────────────┐ │
│  │ POST /api/dev/billing/   │              │ POST /api/billing/webhook        │ │
│  │   settle (DEV ONLY)      │              │   (Production Skeleton)          │ │
│  │                          │              │                                  │ │
│  │ Lookup by: transaction_id│              │ Lookup by: provider_payment_id   │ │
│  │ Input: { transaction_id, │              │ Input: { provider_payment_id }   │ │
│  │         status }         │              │                                  │ │
│  └──────────────────────────┘              └──────────────────────────────────┘ │
│              │                                          │                       │
│              └──────────────────────┬───────────────────┘                       │
│                                     │                                           │
│                                     ▼                                           │
│                      ┌───────────────────────────────┐                          │
│                      │     SETTLEMENT LOGIC          │                          │
│                      │ (identical in both endpoints) │                          │
│                      └───────────────────────────────┘                          │
│                                     │                                           │
│               ┌─────────────────────┼─────────────────────┐                     │
│               │                     │                     │                     │
│               ▼                     ▼                     ▼                     │
│  ┌─────────────────────┐ ┌─────────────────┐ ┌──────────────────────────────┐  │
│  │ One-off Credit      │ │ Club Subscription│ │ Admin Grant (separate path) │  │
│  │ createBillingCredit │ │ activateSubs..   │ │ provider='admin-grant'      │  │
│  │ source='user'       │ │ 30-day period    │ │ status='completed' directly │  │
│  └─────────────────────┘ └─────────────────┘ └──────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Step-by-Step: Purchase Intent → Transaction → Settlement

| Step | Component | Action | Fields Set | Source |
|------|-----------|--------|------------|--------|
| 1 | UI (PaywallModal) | User initiates purchase | - | `src/components/billing/paywall-modal.tsx` |
| 2 | `purchase-intent` | Validate product_code, user auth | - | `src/app/api/billing/purchase-intent/route.ts:47-71` |
| 3 | `purchase-intent` | Generate transaction reference | `transactionReference = 'KASPI_{timestamp}_{random}'` | line 128, 183-185 |
| 4 | `purchase-intent` | Insert `billing_transactions` | `status='pending'`, `provider='kaspi'`, `provider_payment_id=transactionReference` | lines 130-144 |
| 5 | `purchase-intent` | Generate stub payment URL | `https://kaspi.kz/pay/{transactionReference}` (STUB) | lines 195-220 |
| 6 | `purchase-intent` | Return to UI | `{ transaction_id, transaction_reference, payment: {...} }` | lines 167-171 |
| 7 | UI | Poll `/api/billing/transactions/status` | - | `paywall-modal.tsx:106` checks `status === 'completed'` |
| 8a | DEV settle | Manual trigger | Updates `status` to `'completed'`/`'failed'`/`'refunded'` | `src/app/api/dev/billing/settle/route.ts` |
| 8b | Webhook | Provider callback | Updates `status` to `'paid'` ⚠️ | `src/app/api/billing/webhook/route.ts:84` |
| 9 | Settlement | Issue entitlements | `createBillingCredit()` or `activateSubscription()` | Both endpoints |

---

## 4. Provider Fields & Identifiers

### 4.1 Database Schema (billing_transactions)

**Source:** `docs/ssot/SSOT_DATABASE.md:965-995` and migration `20241226_normalize_billing_transactions.sql`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| `provider` | `TEXT NOT NULL` | No CHECK/ENUM | Payment provider identifier |
| `provider_payment_id` | `TEXT` (nullable) | No CHECK | External payment reference from provider |
| `amount` | `NUMERIC(10,2) NOT NULL` | - | Transaction amount |
| `status` | `TEXT NOT NULL DEFAULT 'pending'` | `CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))` | Transaction state |

**Index:** `idx_billing_transactions_provider` on `(provider, provider_payment_id)`

### 4.2 Where `provider` Is Set

| Location | Value Set | Context |
|----------|-----------|---------|
| `src/app/api/billing/purchase-intent/route.ts:140` | `'kaspi'` | User purchase (hardcoded) |
| `src/lib/billing/admin/adminGrantOneOffCredit.ts:131` | `'admin-grant'` | Admin credit grant |
| `src/lib/db/billingTransactionsRepo.ts:81` | Parameter from caller | Legacy `createPendingTransaction()` |

**Observation:** `provider` is hardcoded to `'kaspi'` in the only user-facing purchase flow. No dynamic provider selection exists.

### 4.3 Where `provider_payment_id` Is Set

| Location | Value Set | Context |
|----------|-----------|---------|
| `src/app/api/billing/purchase-intent/route.ts:141` | `transactionReference` (generated) | Set at transaction creation time |
| `src/lib/billing/admin/adminGrantOneOffCredit.ts:132` | `null` | Admin grants have no external reference |
| `src/lib/db/billingTransactionsRepo.ts:82` | Parameter (optional) | Legacy function |

**Generated Format:** `KASPI_{Date.now()}_{random.toString(36).substring(2,9).toUpperCase()}`

**Example:** `KASPI_1738665600000_A7BX3K2`

### 4.4 Where `provider_payment_id` Is Read

| Location | Purpose |
|----------|---------|
| `src/app/api/billing/webhook/route.ts:57` | Lookup transaction for settlement |
| `src/lib/db/billingTransactionsRepo.ts:181-206` | `getTransactionByProviderPaymentId()` repo function |

**Important:** The webhook uses `provider_payment_id` as the primary lookup key. This is the external payment identifier that a real payment provider would send in their callback.

### 4.5 Provider Field Summary

| Aspect | Current State |
|--------|---------------|
| `provider` values in codebase | `'kaspi'`, `'admin-grant'` |
| `provider` selection mechanism | Hardcoded per path |
| `provider_payment_id` set at | Transaction creation (purchase-intent) |
| `provider_payment_id` format | Internal stub format (`KASPI_*`) |
| Real provider integration | NOT IMPLEMENTED |

---

## 5. Transaction Status Taxonomy (CRITICAL)

### 5.1 Authoritative Source: Database CHECK Constraint

**File:** `supabase/migrations/20241226_normalize_billing_transactions.sql` (lines 44-53)

```sql
ALTER TABLE billing_transactions 
DROP CONSTRAINT IF EXISTS billing_transactions_status_check;

ALTER TABLE billing_transactions 
ADD CONSTRAINT billing_transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));
```

**Canonical Statuses (DB-enforced):**

| Status | Meaning |
|--------|---------|
| `pending` | Transaction created, awaiting payment |
| `completed` | Payment successful, entitlements issued |
| `failed` | Payment failed |
| `refunded` | Payment refunded |

### 5.2 TypeScript Type Definition (INCONSISTENT)

**File:** `src/lib/types/billing.ts:168`

```typescript
export const TRANSACTION_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type TransactionStatus = typeof TRANSACTION_STATUSES[number];
```

**⚠️ INCONSISTENCY:** TypeScript uses `"paid"`, database uses `"completed"`.

### 5.3 Status Values in Code (Observed Usage)

| Status Value | Where Used | File:Line |
|--------------|------------|-----------|
| `"pending"` | Transaction creation | `purchase-intent/route.ts:139` |
| `"pending"` | Repo function | `billingTransactionsRepo.ts:85` |
| `"completed"` | DEV settle route (accepts and sets) | `settle/route.ts:32, 80, 113` |
| `"completed"` | UI polling check | `paywall-modal.tsx:106` |
| `"completed"` | Admin grant | `adminGrantOneOffCredit.ts:135` |
| `"completed"` | Transaction status route (returns) | `transactions/status/route.ts:10` |
| `"paid"` ⚠️ | Webhook idempotency check | `webhook/route.ts:71` |
| `"paid"` ⚠️ | Webhook status update | `webhook/route.ts:84` |
| `"paid"` ⚠️ | Repo function `markTransactionPaid()` | `billingTransactionsRepo.ts:114` |
| `"paid"` ⚠️ | Admin UI badge display | `admin-user-detail-client.tsx:281` |
| `"failed"` | DEV settle route (accepts) | `settle/route.ts:32` |
| `"failed"` | Repo function `markTransactionFailed()` | `billingTransactionsRepo.ts:142` |
| `"failed"` | UI polling check | `paywall-modal.tsx:114` |
| `"refunded"` | DEV settle route (accepts) | `settle/route.ts:32` |
| `"refunded"` | UI polling check | `paywall-modal.tsx:114` |

### 5.4 Status Inconsistency Summary

| Source | Success Status | Consistent? |
|--------|---------------|-------------|
| Database CHECK constraint | `'completed'` | ✅ Canonical |
| SSOT_DATABASE.md | `'completed'` | ✅ |
| TypeScript type | `'paid'` | ❌ STALE |
| DEV settle route | `'completed'` | ✅ |
| Webhook route | `'paid'` | ❌ Will fail DB constraint |
| `markTransactionPaid()` repo | `'paid'` | ❌ Will fail DB constraint |
| UI polling | `'completed'` | ✅ |
| Admin UI | `'paid'` | ❌ Badge logic incorrect |

### 5.5 Impact Assessment

**CRITICAL BUG:** The production webhook at `/api/billing/webhook` sets `status: "paid"` (line 84), but the database CHECK constraint only allows `'completed'`. This will cause:

1. **Database INSERT/UPDATE failure** when webhook tries to settle a transaction
2. **500 Internal Server Error** returned to payment provider
3. **Entitlements NOT issued** despite successful payment

**Affected Code Paths:**
- `src/app/api/billing/webhook/route.ts:84` — sets `"paid"`
- `src/lib/db/billingTransactionsRepo.ts:114` — `markTransactionPaid()` sets `"paid"`

---

## 6. Entry Points & Responsibilities

### 6.1 Entry Point Inventory

| Endpoint | Method | Purpose | Auth | Status |
|----------|--------|---------|------|--------|
| `/api/billing/purchase-intent` | POST | Create pending transaction, return payment URL | JWT required | Production |
| `/api/billing/transactions/status` | GET | Poll transaction status | JWT required | Production |
| `/api/billing/webhook` | POST | Settle transaction from provider callback | Public (no auth) | Production Skeleton |
| `/api/dev/billing/settle` | POST | Manual settlement for testing | DEV env check | DEV only |
| `/api/admin/users/[userId]/grant-credit` | POST | Admin credit grant | Admin secret | Production (Admin) |

### 6.2 Responsibility Matrix

| Entry Point | Creates Transaction | Updates Transaction | Issues Credit | Activates Subscription |
|-------------|--------------------|--------------------|---------------|------------------------|
| `purchase-intent` | ✅ (`pending`) | ❌ | ❌ | ❌ |
| `transactions/status` | ❌ | ❌ | ❌ | ❌ |
| `webhook` | ❌ | ✅ (`paid` ⚠️) | ✅ | ✅ |
| `dev/settle` | ❌ | ✅ (`completed`) | ✅ | ✅ |
| `admin/grant-credit` | ✅ (`completed`) | ❌ | ✅ | ❌ |

### 6.3 Settlement Logic Comparison

| Aspect | DEV Settle | Webhook |
|--------|------------|---------|
| Transaction lookup | By `transaction_id` | By `provider_payment_id` |
| Status set to | `'completed'` / `'failed'` / `'refunded'` | `'paid'` ⚠️ |
| Idempotency check | `transaction.status === 'completed'` | `transaction.status === "paid"` |
| Credit issuance | `createBillingCredit()` | `createBillingCredit()` |
| Subscription activation | `activateSubscription()` (30-day REPLACE) | `activateSubscription()` (30-day REPLACE) |
| Environment guard | `NODE_ENV !== "production"` | None |
| Request validation | Zod schema | Manual JSON parse |

**Observation:** Settlement logic is duplicated between DEV settle and webhook with minor differences in status values and lookup keys.

---

## 7. Boundary Mapping: Payment Execution vs Billing Domain

### 7.1 Boundary Definition

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PAYMENT EXECUTION                                  │
│  (Transaction creation, provider interaction, settlement orchestration)     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Components:                                                                │
│  - /api/billing/purchase-intent (creates transaction, returns payment URL) │
│  - /api/billing/webhook (receives provider callback, triggers settlement)  │
│  - /api/dev/billing/settle (DEV settlement trigger)                        │
│  - billing_transactions table (payment audit trail)                        │
│                                                                             │
│  Responsibilities:                                                          │
│  - Generate payment references                                              │
│  - Track payment lifecycle (pending → completed/failed)                     │
│  - Orchestrate entitlement issuance (calls into Billing Domain)            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Calls
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BILLING DOMAIN                                   │
│  (Access state, entitlements, enforcement, limits)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Components:                                                                │
│  - billing_credits table (one-off credit entitlements)                     │
│  - club_subscriptions table (subscription access state)                     │
│  - createBillingCredit() (issues credit)                                   │
│  - activateSubscription() (grants subscription access)                      │
│  - enforceClubAction() (access control)                                    │
│                                                                             │
│  Responsibilities:                                                          │
│  - Store and query access state                                             │
│  - Enforce plan limits                                                      │
│  - Grant/revoke entitlements                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Boundary Integrity Assessment

| Principle | Status | Evidence |
|-----------|--------|----------|
| Payment Execution does NOT check limits | ✅ OK | No `enforceClubAction()` calls in payment routes |
| Payment Execution does NOT directly modify access state | ✅ OK | Uses repo functions (`createBillingCredit`, `activateSubscription`) |
| Billing Domain does NOT interact with providers | ✅ OK | No provider-specific code in billing repos/services |
| `billing_transactions` is audit-only | ✅ OK | Per SSOT: "Транзакции НЕ используются для проверок доступа" |

**Conclusion:** Boundaries remain intact. No violation detected.

---

## 8. File Inventory

### 8.1 Payment Execution Layer

| File | Purpose |
|------|---------|
| `src/app/api/billing/purchase-intent/route.ts` | Create pending transaction, return payment URL |
| `src/app/api/billing/webhook/route.ts` | Production webhook skeleton |
| `src/app/api/billing/transactions/status/route.ts` | Transaction status polling |
| `src/app/api/dev/billing/settle/route.ts` | DEV settlement endpoint |
| `src/lib/db/billingTransactionsRepo.ts` | Transaction CRUD operations |

### 8.2 Billing Domain Layer

| File | Purpose |
|------|---------|
| `src/lib/db/billingCreditsRepo.ts` | Credit CRUD (`createBillingCredit`) |
| `src/lib/db/clubSubscriptionRepo.ts` | Subscription CRUD (`activateSubscription`) |
| `src/lib/services/accessControl.ts` | Enforcement logic (`enforceClubAction`) |

### 8.3 Type Definitions

| File | Purpose |
|------|---------|
| `src/lib/types/billing.ts` | All billing types (`TRANSACTION_STATUSES`, `BillingTransaction`, etc.) |

### 8.4 Admin Path (Separate)

| File | Purpose |
|------|---------|
| `src/app/api/admin/users/[userId]/grant-credit/route.ts` | Admin credit grant API |
| `src/lib/billing/admin/adminGrantOneOffCredit.ts` | Admin credit grant service |

### 8.5 Database Migrations

| File | Relevance |
|------|-----------|
| `supabase/migrations/20241215_create_billing_transactions.sql` | Initial schema |
| `supabase/migrations/20241225_extend_billing_transactions.sql` | Added `product_code` |
| `supabase/migrations/20241225_add_user_id_to_billing_transactions.sql` | Added `user_id` |
| `supabase/migrations/20241226_normalize_billing_transactions.sql` | **Changed `'paid'` → `'completed'`**, added currency FK |
| `supabase/migrations/20241226_cleanup_billing_transactions.sql` | Cleanup |

---

## 9. SSOT Cross-References

| SSOT Document | Relevant Sections | Cited For |
|---------------|-------------------|-----------|
| `docs/ssot/SSOT_DATABASE.md` | §7 `billing_transactions` schema (lines 965-1026) | Canonical schema, CHECK constraint |
| `docs/ssot/SSOT_DATABASE.md` | Line 1010: "status: 'paid' → status: 'completed'" | Migration history |
| `docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md` | §6 Unified Purchase Flow | Purchase intent flow |
| `docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md` | "Транзакции не участвуют в проверках доступа" (line 94) | Boundary confirmation |
| `docs/ssot/SSOT_ARCHITECTURE.md` | §9.1 Idempotency requirements | Settlement idempotency |
| `docs/ssot/SSOT_API.md` | API endpoints inventory | Entry point validation |

### Existing Phase Documents

| Document | Relevance |
|----------|-----------|
| `docs/phase/p0/PHASE_P0_D_PAYMENT_COMPLETION_DIAGNOSTIC.md` | Settlement semantics, subscription activation |
| `docs/phase/p0/PHASE_P0_2_WEBHOOK_ENTRYPOINT_SKELETON.md` | Webhook implementation summary |
| `docs/phase/p1/PHASE_P1_D_PAYMENT_SIMULATION_DIAGNOSTIC.md` | Payment flow diagrams, file inventory |

---

## 10. Open Questions / Unknowns

| # | Question | Evidence | Blocking? |
|---|----------|----------|-----------|
| OQ-1 | What `provider` values should be supported? | Only `'kaspi'` and `'admin-grant'` observed | YES (for P1 implementation) |
| OQ-2 | Is `provider_payment_id` format provider-specific? | Current format is internal stub (`KASPI_*`) | YES (for real Kaspi) |
| OQ-3 | Should `provider` have a CHECK constraint or ENUM? | Currently `TEXT NOT NULL` with no constraint | NO (design decision) |
| OQ-4 | Is webhook signature validation required for Kaspi? | OUT OF SCOPE per diagnostic rules | N/A |

---

## 11. Identified Inconsistencies Requiring Fix

### 11.1 CRITICAL: Status Value Mismatch

| Issue | Details |
|-------|---------|
| **ID** | INC-001 |
| **Severity** | CRITICAL |
| **Description** | TypeScript type `TRANSACTION_STATUSES` uses `"paid"`, but DB CHECK constraint requires `"completed"` |
| **Affected Files** | `src/lib/types/billing.ts:168` |
| **Impact** | Code may use invalid status value |

### 11.2 CRITICAL: Webhook Uses Wrong Status

| Issue | Details |
|-------|---------|
| **ID** | INC-002 |
| **Severity** | CRITICAL |
| **Description** | Webhook route sets `status: "paid"` which violates DB CHECK constraint |
| **Affected Files** | `src/app/api/billing/webhook/route.ts:71, 84` |
| **Impact** | **Production webhook will fail** when called with real provider callback |

### 11.3 HIGH: Repo Function Uses Wrong Status

| Issue | Details |
|-------|---------|
| **ID** | INC-003 |
| **Severity** | HIGH |
| **Description** | `markTransactionPaid()` sets `status: 'paid'` which violates DB CHECK constraint |
| **Affected Files** | `src/lib/db/billingTransactionsRepo.ts:114` |
| **Impact** | Function will fail if called |

### 11.4 LOW: Admin UI Badge Logic

| Issue | Details |
|-------|---------|
| **ID** | INC-004 |
| **Severity** | LOW |
| **Description** | Admin UI checks `tx.status === "paid"` for badge styling |
| **Affected Files** | `src/app/admin/users/[userId]/_components/admin-user-detail-client.tsx:281` |
| **Impact** | Badge will show incorrect variant for completed transactions |

### 11.5 Summary Table

| ID | File | Line | Current | Should Be | Severity |
|----|------|------|---------|-----------|----------|
| INC-001 | `types/billing.ts` | 168 | `["pending", "paid", ...]` | `["pending", "completed", ...]` | CRITICAL |
| INC-002 | `webhook/route.ts` | 71, 84 | `"paid"` | `"completed"` | CRITICAL |
| INC-003 | `billingTransactionsRepo.ts` | 114 | `'paid'` | `'completed'` | HIGH |
| INC-004 | `admin-user-detail-client.tsx` | 281 | `"paid"` | `"completed"` | LOW |

---

## 12. Conclusions for Architect

### 12.1 Facts Established

1. **Provider Model:**
   - `provider` field exists, values are hardcoded per path (`'kaspi'`, `'admin-grant'`)
   - No dynamic provider selection mechanism exists
   - `provider_payment_id` is set at transaction creation with internal stub format

2. **Purchase Intent Flow:**
   - Creates pending transaction with `provider='kaspi'`, generates stub URL
   - Returns `transaction_id`, `transaction_reference`, `payment` object to UI
   - No real provider interaction occurs

3. **Settlement Entry Points:**
   - DEV settle: works correctly with `'completed'` status
   - Webhook: **BROKEN** — uses `'paid'` which violates DB constraint
   - Both share settlement logic pattern but with status value divergence

4. **Status Taxonomy:**
   - DB canonical: `'pending'`, `'completed'`, `'failed'`, `'refunded'`
   - TypeScript type is STALE (still has `'paid'`)
   - Webhook code is BROKEN (uses `'paid'`)

5. **Boundaries:**
   - Payment Execution / Billing Domain separation is intact
   - No violations detected

### 12.2 Blockers for P1 Implementation

Before implementing simulation vs real payment switching:

1. **INC-001, INC-002, INC-003** must be fixed — status values must be aligned
2. Provider abstraction design needed (OUT OF SCOPE for this diagnostic)
3. `provider_payment_id` format may need to be provider-specific

### 12.3 Recommended P1.0 Fix Scope

Based on identified inconsistencies, a P1.0 fix phase should address:

- [ ] INC-001: Update `TRANSACTION_STATUSES` in types
- [ ] INC-002: Update webhook route status values
- [ ] INC-003: Update `markTransactionPaid()` or rename to `markTransactionCompleted()`
- [ ] INC-004: Update admin UI badge logic

**These are the minimum fixes required before any further payment provider work.**

---

**END OF DIAGNOSTIC**

*No implementation until explicit GO from Architect.*
