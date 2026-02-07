# PHASE_P1_D — PAYMENT SIMULATION DIAGNOSTIC

**Status:** DIAGNOSTIC COMPLETE  
**Date:** 2026-02-03  
**Phase Type:** Diagnostic Only  
**Author:** AI Assistant (Architect × Executor Process)

---

## 0. Purpose

Establish FACTS about the current payment flow for:
- One-off credits (EVENT_UPGRADE_500)
- Club subscriptions (CLUB_50, CLUB_500, CLUB_UNLIMITED)

This document maps:
- Entry points and responsibilities
- Transaction lifecycle
- Settlement mechanism
- Webhook handling
- Boundary between Payment Execution and Billing Domain

**SCOPE CONSTRAINT:** This is DIAGNOSTIC ONLY. No solutions, no implementation ideas, no refactors.

---

## 1. In-Scope / Out-of-Scope

### In-Scope
- One-off credit purchase flow
- Club subscription purchase flow
- `billing_transactions` lifecycle
- Settlement logic (current state)
- Webhook flow (if exists)
- Boundary definition: Payment Execution ↔ Billing Domain
- File inventory

### Out-of-Scope
- Admin billing operations (covered by SSOT_BILLING_ADMIN_RULES)
- Enforcement logic internals
- Credit consumption internals (beyond boundary)
- UI/Frontend components
- Future payment providers

---

## 2. Current Payment Flow — One-Off Credits

### 2.1 Flow Diagram (As-Is)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ONE-OFF CREDIT FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐    ┌───────────────────────┐    ┌─────────────────────────┐    │
│  │ Frontend │───▶│ POST /api/billing/    │───▶│ billing_transactions    │    │
│  │ Paywall  │    │   purchase-intent      │    │ (status='pending')      │    │
│  └─────────┘    └───────────────────────┘    └─────────────────────────┘    │
│       │                                                │                     │
│       ▼                                                ▼                     │
│  ┌─────────────────┐                          ┌─────────────────┐           │
│  │ Return Kaspi    │                          │ transaction_id  │           │
│  │ stub (fake URL) │                          │ returned to UI  │           │
│  └─────────────────┘                          └─────────────────┘           │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                        PAYMENT EXECUTION GAP                                 │
│            (No real Kaspi integration, no production webhook)                │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  ┌─────────────────────────┐    ┌───────────────────────┐                   │
│  │ DEV ONLY: POST          │───▶│ Update transaction    │                   │
│  │ /api/dev/billing/settle │    │ status='completed'    │                   │
│  └─────────────────────────┘    └───────────────────────┘                   │
│                                         │                                    │
│                                         ▼                                    │
│                              ┌───────────────────────┐                      │
│                              │ createBillingCredit() │                      │
│                              │ billing_credits       │                      │
│                              │ (status='available')  │                      │
│                              └───────────────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Step-by-Step Breakdown

| Step | Actor | Action | Result |
|------|-------|--------|--------|
| 1 | User | Triggers paywall (event >15 participants) | 402 PAYWALL response |
| 2 | Frontend | User clicks "Buy Credit" | Calls purchase-intent API |
| 3 | `purchase-intent` | Validates product_code, user auth | Creates pending transaction |
| 4 | `purchase-intent` | Generates Kaspi stub | Returns fake payment URL |
| 5 | ⚠️ GAP | User "pays" | No real payment processing |
| 6 | DEV ONLY | Manual settle call | Transaction → completed |
| 7 | `settle` | If completed + one-off | `createBillingCredit()` |
| 8 | DB | Credit created | `status='available'`, `source='user'` |

### 2.3 Transaction Lifecycle (One-Off)

```
pending ─────────────────────▶ completed ─────────────────▶ (end)
    │                              │
    │                              └──▶ billing_credits created
    │
    └──────▶ failed ─────────────▶ (end, no credit)
    │
    └──────▶ refunded ───────────▶ (future: revoke credit?)
```

---

## 3. Current Payment Flow — Club Subscriptions

### 3.1 Flow Diagram (As-Is)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLUB SUBSCRIPTION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐    ┌───────────────────────┐    ┌─────────────────────────┐    │
│  │ Club    │───▶│ POST /api/billing/    │───▶│ billing_transactions    │    │
│  │ Owner   │    │   purchase-intent      │    │ (status='pending',      │    │
│  │ UI      │    │   product_code=CLUB_*  │    │  club_id, plan_id set)  │    │
│  └─────────┘    └───────────────────────┘    └─────────────────────────┘    │
│       │                                                │                     │
│       ▼                                                ▼                     │
│  ┌─────────────────┐                          ┌─────────────────┐           │
│  │ Return Kaspi    │                          │ transaction_id  │           │
│  │ stub (fake URL) │                          │ returned to UI  │           │
│  └─────────────────┘                          └─────────────────┘           │
│                                                                              │
│  ════════════════════════════════════════════════════════════════════════   │
│                        PAYMENT EXECUTION GAP                                 │
│            (No real Kaspi integration, no production webhook)                │
│  ════════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  ┌─────────────────────────┐    ┌───────────────────────┐                   │
│  │ DEV ONLY: POST          │───▶│ Update transaction    │                   │
│  │ /api/dev/billing/settle │    │ status='completed'    │                   │
│  └─────────────────────────┘    └───────────────────────┘                   │
│                                         │                                    │
│                                         ▼                                    │
│                              ┌───────────────────────┐                      │
│                              │ ⚠️ TODO: Activate     │                      │
│                              │ club_subscriptions    │                      │
│                              │ (NOT IMPLEMENTED)     │                      │
│                              └───────────────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Step-by-Step Breakdown

| Step | Actor | Action | Result |
|------|-------|--------|--------|
| 1 | Club Owner | Initiates subscription purchase | Validation: must be owner |
| 2 | `purchase-intent` | Validates club_id, owner role | Creates pending transaction |
| 3 | `purchase-intent` | Generates Kaspi stub | Returns fake payment URL |
| 4 | ⚠️ GAP | User "pays" | No real payment processing |
| 5 | DEV ONLY | Manual settle call | Transaction → completed |
| 6 | ⚠️ **NOT IMPLEMENTED** | Should activate subscription | **Currently: logs TODO, no action** |

### 3.3 Transaction Lifecycle (Club Subscription)

```
pending ─────────────────────▶ completed ─────────────────▶ (end)
    │                              │
    │                              └──▶ ⚠️ club_subscriptions NOT updated
    │                                   (TODO in code, no implementation)
    │
    └──────▶ failed ─────────────▶ (end)
```

### 3.4 Critical Finding: Club Subscription Settlement NOT Implemented

**Location:** `/src/app/api/dev/billing/settle/route.ts`, lines 105-113

**Current code:**
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

**Fact:** After a club subscription payment is "settled", no changes occur to `club_subscriptions` table. The transaction is marked completed but no subscription is activated.

---

## 4. Settlement Mechanism

### 4.1 Current State

| Environment | Endpoint | Status |
|-------------|----------|--------|
| Development | `POST /api/dev/billing/settle` | ✅ Exists (DEV only) |
| Production | Kaspi Webhook | ❌ Does not exist |

### 4.2 Settlement Endpoint Analysis

**File:** `/src/app/api/dev/billing/settle/route.ts`

**Behavior:**
1. Blocked in production (`NODE_ENV=production` check)
2. Accepts `transaction_id` and target `status`
3. Updates `billing_transactions.status`
4. If `completed` + `product_code=EVENT_UPGRADE_500`:
   - Calls `createBillingCredit()` with idempotency via `source_transaction_id` UNIQUE constraint
5. If `completed` + club subscription:
   - **Logs TODO, takes no action**

### 4.3 Idempotency Mechanism

**For one-off credits:**
- `billing_credits.source_transaction_id` has UNIQUE constraint
- Duplicate settlements will fail with DB constraint violation
- Settle endpoint catches duplicates and logs warning

**For club subscriptions:**
- No idempotency mechanism (settlement not implemented)

---

## 5. Webhook Flow

### 5.1 Current State

**FACT:** No production webhook endpoint exists.

**Evidence:**
- No files in `/src/app/api/webhooks/`
- No files matching pattern `**/webhook*/**/*.ts`
- SSOT_API.md explicitly states: "Webhook endpoints (if Kaspi/Telegram webhooks exist, they're not in `/api/*` folder)"
- Self-audit note in SSOT_API.md: "Club subscription settlement in API-038: TODO comment, not yet implemented"

### 5.2 Expected Webhook Flow (Not Implemented)

```
┌─────────────┐      ┌─────────────────┐      ┌──────────────────┐
│ Kaspi       │─────▶│ POST /api/      │─────▶│ Validate         │
│ Payment     │      │ webhooks/kaspi  │      │ signature/origin │
│ Completed   │      │ (NOT EXISTS)    │      │                  │
└─────────────┘      └─────────────────┘      └──────────────────┘
                                                      │
                                                      ▼
                                               ┌──────────────────┐
                                               │ Same logic as    │
                                               │ /dev/settle      │
                                               │ (+ security)     │
                                               └──────────────────┘
```

---

## 6. Boundary Definition: Payment Execution ↔ Billing Domain

### 6.1 Payment Execution Domain (Responsibilities)

| Responsibility | Current Handler | Notes |
|----------------|-----------------|-------|
| Create purchase intent | `purchase-intent/route.ts` | Creates pending transaction |
| Generate payment URL/QR | `purchase-intent/route.ts` | STUB only |
| Handle webhook callback | ❌ NOT EXISTS | - |
| Update transaction status | `settle/route.ts` (DEV) | - |
| Issue credit after payment | `settle/route.ts` | Calls `createBillingCredit()` |
| Activate subscription after payment | ⚠️ NOT IMPLEMENTED | TODO in settle |
| Poll transaction status | `transactions/status/route.ts` | - |

### 6.2 Billing Domain (Responsibilities)

| Responsibility | Handler | Notes |
|----------------|---------|-------|
| Enforce limits | `accessControl.ts` | `enforceClubAction`, `enforceEventPublish` |
| Check subscription status | `clubSubscriptionRepo.ts` | `getClubSubscription()` |
| Consume credits | `billingCreditsRepo.ts` | `consumeCredit()` |
| Check credit availability | `billingCreditsRepo.ts` | `hasAvailableCredit()` |
| Plan limits lookup | `planRepo.ts` | `getPlanById()`, `getRequiredPlanForParticipants()` |

### 6.3 Boundary Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PAYMENT EXECUTION DOMAIN                           │
│                                                                             │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ purchase-intent│  │ settle (webhook)│  │ transaction status polling  │  │
│  │ API            │  │ DEV/Production  │  │ API                         │  │
│  └────────┬───────┘  └────────┬────────┘  └─────────────────────────────┘  │
│           │                   │                                             │
│           │                   │                                             │
│           ▼                   ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    billing_transactions table                        │   │
│  │                    (pending → completed/failed)                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                 │                                           │
│                                 │ ON COMPLETED:                             │
│                                 ▼                                           │
│  ┌──────────────────────┐   ┌───────────────────────────────────────────┐  │
│  │ createBillingCredit()│   │ activateSubscription() ⚠️ NOT IMPLEMENTED │  │
│  │ (one-off)            │   │ (club)                                    │  │
│  └──────────┬───────────┘   └───────────────────────────────────────────┘  │
│             │                                                               │
└─────────────│───────────────────────────────────────────────────────────────┘
              │
══════════════│═══════════════════════════════════════════════════════════════
              │              B O U N D A R Y
══════════════│═══════════════════════════════════════════════════════════════
              │
┌─────────────│───────────────────────────────────────────────────────────────┐
│             ▼                                                               │
│  ┌────────────────────┐   ┌───────────────────────────────────────────────┐ │
│  │ billing_credits    │   │ club_subscriptions table                      │ │
│  │ (status=available) │   │ (status=active/grace/expired)                 │ │
│  └────────────────────┘   └───────────────────────────────────────────────┘ │
│             │                          │                                    │
│             ▼                          ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         BILLING DOMAIN                               │   │
│  │                                                                      │   │
│  │  enforceClubAction()    enforceEventPublish()    consumeCredit()    │   │
│  │  hasAvailableCredit()   getClubSubscription()    getPlanById()      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                          BILLING DOMAIN (READ + ENFORCE)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Boundary Contract (As-Is)

| From | To | Contract |
|------|------|----------|
| Payment Execution | Billing | Writes to `billing_credits` (creates entitlement) |
| Payment Execution | Billing | Should write to `club_subscriptions` (⚠️ NOT IMPLEMENTED) |
| Billing | Payment Execution | Reads `billing_credits.status` |
| Billing | Payment Execution | Reads `club_subscriptions.status` |

---

## 7. File Inventory

### 7.1 API Routes (Payment Execution)

| File | Purpose |
|------|---------|
| `/src/app/api/billing/purchase-intent/route.ts` | Create purchase intent (pending transaction) |
| `/src/app/api/billing/transactions/status/route.ts` | Poll transaction status |
| `/src/app/api/billing/products/route.ts` | List purchasable products |
| `/src/app/api/dev/billing/settle/route.ts` | DEV: Manual settlement |
| `/src/app/api/plans/route.ts` | List plans (public pricing) |

### 7.2 Repositories

| File | Domain | Purpose |
|------|--------|---------|
| `/src/lib/db/billingTransactionsRepo.ts` | Payment Execution | Transaction CRUD |
| `/src/lib/db/billingCreditsRepo.ts` | Billing | Credit CRUD + consumption |
| `/src/lib/db/billingProductsRepo.ts` | Payment Execution | Product lookup |
| `/src/lib/db/clubSubscriptionRepo.ts` | Billing | Subscription CRUD |
| `/src/lib/db/planRepo.ts` | Billing | Plan limits lookup |
| `/src/lib/db/billingPolicyRepo.ts` | Billing | Policy actions lookup |

### 7.3 Services

| File | Domain | Purpose |
|------|--------|---------|
| `/src/lib/services/accessControl.ts` | Billing | Enforcement (`enforceClubAction`, `enforceEventPublish`) |
| `/src/lib/services/creditTransaction.ts` | Billing | Atomic credit consumption |

### 7.4 Types

| File | Purpose |
|------|---------|
| `/src/lib/types/billing.ts` | Type definitions (transactions, credits, plans, paywall) |

### 7.5 Database Tables (from SSOT_DATABASE.md)

| Table | Domain | Purpose |
|-------|--------|---------|
| `billing_transactions` | Payment Execution | Transaction audit trail |
| `billing_credits` | Billing | User entitlements (one-off) |
| `club_subscriptions` | Billing | Club entitlements |
| `billing_products` | Payment Execution | Product definitions |
| `club_plans` | Billing | Plan definitions and limits |
| `billing_policy` | Billing | Grace period, TTL |
| `billing_policy_actions` | Billing | Allowed actions per status |

---

## 8. Known Constraints and Invariants (from SSOT)

### 8.1 From SSOT_DATABASE.md

| Constraint | Description |
|------------|-------------|
| `chk_billing_credits_consumed_state` | `consumed` status requires `consumed_event_id IS NOT NULL AND consumed_at IS NOT NULL` |
| `uix_billing_credits_source_transaction_id` | One credit per transaction (idempotency) |
| `billing_club_requires_club_id` | `CLUB_*` products require `club_id IS NOT NULL` |
| `billing_oneoff_requires_user_id` | Non-club products require `user_id IS NOT NULL` |
| `club_subscriptions_one_active_per_club` | One active/pending/grace subscription per club |

### 8.2 From SSOT_BILLING_SYSTEM_ANALYSIS.md

| Invariant | Description |
|-----------|-------------|
| Transaction ≠ entitlement | `billing_transactions.status='pending'` does NOT grant access |
| Completed payment ≠ auto-applied | Credit is NOT automatically bound to event |
| Payment completed but action failed | Credit remains `status='available'` |

### 8.3 From SSOT_BILLING_ADMIN_RULES.md

| Invariant | Description |
|-----------|-------------|
| Admin ≠ Purchaser | Admin never creates purchase intents |
| Explicit source attribution | Admin grants use `source='admin'` |

---

## 9. Open Questions / Unknowns

### 9.1 Documented Gaps

| ID | Gap | Source | Impact |
|----|-----|--------|--------|
| GAP-1 | Club subscription settlement NOT IMPLEMENTED | `/api/dev/billing/settle/route.ts` line 107 | Club subscriptions cannot be activated via payment |
| GAP-2 | No production webhook endpoint | Codebase audit | No way for Kaspi to notify of completed payments |
| GAP-3 | Kaspi integration is STUB only | `purchase-intent/route.ts` line 195 | Returns fake payment URLs |

### 9.2 Questions Requiring Clarification

| ID | Question | Context |
|----|----------|---------|
| Q-1 | What is the expected Kaspi webhook signature validation mechanism? | Security for production webhook |
| Q-2 | Should subscription activation be idempotent? If so, what is the key? | Currently no implementation |
| Q-3 | What happens if subscription already exists when payment completes? | Extend vs replace behavior |
| Q-4 | Should failed/refunded transactions revoke issued credits/subscriptions? | Not implemented |

---

## 10. SSOT Cross-References

| Document | Relevant Sections |
|----------|-------------------|
| `SSOT_BILLING_SYSTEM_ANALYSIS.md` | §6 Unified Purchase Flow, §5 One-off Credits |
| `SSOT_DATABASE.md` | §7 billing_transactions, §10 billing_credits, §6 club_subscriptions |
| `SSOT_API.md` | API-036 purchase-intent, API-037 transaction status, API-038 DEV settle |
| `SSOT_BILLING_ADMIN_RULES.md` | §1 Core Invariants (Admin ≠ Purchaser) |
| `SSOT_ARCHITECTURE.md` | §26 Aborted/Incomplete Actions |

---

## 11. Diagnostic Summary

### 11.1 Payment Execution Current State

| Capability | One-Off Credits | Club Subscriptions |
|------------|-----------------|-------------------|
| Create purchase intent | ✅ Implemented | ✅ Implemented |
| Payment URL generation | ⚠️ STUB only | ⚠️ STUB only |
| Transaction status polling | ✅ Implemented | ✅ Implemented |
| Settlement (DEV) | ✅ Implemented | ⚠️ TODO (logs only) |
| Settlement (Production) | ❌ No webhook | ❌ No webhook |
| Issue entitlement | ✅ `createBillingCredit()` | ❌ NOT IMPLEMENTED |

### 11.2 Key Finding

**The payment execution domain is partially implemented:**
- One-off credits: Complete flow (purchase → settle → credit issued) works in DEV
- Club subscriptions: Flow stops at settlement (no subscription activation)
- Production: No real payment provider integration

---

## 12. No Implementation Recommendations

**Per WORKING CONTRACT — ARCHITECT × EXECUTOR PROCESS:**

This document establishes FACTS ONLY. No solutions, flags, abstractions, or simulation approaches are proposed.

**Next steps require explicit GO from Architect.**

---

**END OF DIAGNOSTIC DOCUMENT**

---

**Document Metadata:**
- Phase: P1
- Type: Diagnostic
- Created: 2026-02-03
- Files Analyzed: 15+
- SSOT Documents Referenced: 5
- Critical Gaps Identified: 3
- Open Questions: 4
