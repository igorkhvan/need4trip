# PHASE_P1_1 — PAYMENT PROVIDER ABSTRACTION (FOUNDATION)

**Status:** ✅ COMPLETED  
**Date:** 2026-02-04  
**Type:** IMPLEMENTATION (BACKEND ONLY)  
**Author:** AI Executor (per WORKING CONTRACT — ARCHITECT × EXECUTOR PROCESS)

---

## 1. Purpose

Introduce a Payment Provider Abstraction layer that:

1. **Separates Payment Execution from concrete providers** (Kaspi, future simulation)
2. **Centralizes settlement logic** to eliminate duplication between DEV settle and production webhook
3. **Preserves existing behavior 100%** — this is a pure structural refactor

This is a **FOUNDATION** phase. NO new features, NO behavior changes.

---

## 2. Documents Referenced (MANDATORY READING)

| Document | Location | Relevance |
|----------|----------|-----------|
| **PHASE_P1_D_PAYMENT_PROVIDER_ARCH_DIAGNOSTIC** | `docs/phase/p1/` | Current payment architecture, provider fields |
| **PHASE_P1_0_FIX_INACCURACIES** | `docs/phase/p1/` | Canonical status: `completed` (not `paid`) |
| **PHASE_P0_1_SUBSCRIPTION_SETTLEMENT_IMPLEMENTATION** | `docs/phase/p0/` | Settlement semantics: REPLACE, 30-day period |
| **PHASE_P0_2_WEBHOOK_ENTRYPOINT_SKELETON** | `docs/phase/p0/` | Webhook responsibilities |
| **SSOT_ARCHITECTURE** | `docs/ssot/` | Layer boundaries (API → Payment Execution → Billing Domain) |
| **SSOT_BILLING_SYSTEM_ANALYSIS** | `docs/ssot/` | Billing Domain vs Payment Execution separation |
| **SSOT_API** | `docs/ssot/` | API layer rules |
| **SSOT_DATABASE** | `docs/ssot/` | `billing_transactions` schema, CHECK constraint |

---

## 3. New Modules / Files

### 3.1 Payment Provider Abstraction

| File | Purpose |
|------|---------|
| `src/lib/payments/providers/paymentProvider.ts` | Provider interface contract |
| `src/lib/payments/providers/stubProvider.ts` | Stub provider (current hardcoded logic) |
| `src/lib/payments/settlementOrchestrator.ts` | Centralized settlement logic |
| `src/lib/payments/index.ts` | Public exports |

### 3.2 Directory Structure

```
src/lib/payments/
├── index.ts                      # Public exports
├── settlementOrchestrator.ts     # Centralized settlement logic
└── providers/
    ├── paymentProvider.ts        # Provider interface
    └── stubProvider.ts           # Stub implementation
```

---

## 4. Updated Payment Flow

### 4.1 Before P1.1 (Hardcoded)

```
┌──────────────┐    ┌──────────────────────────┐    ┌─────────────────────────┐
│  Frontend    │───▶│ POST /api/billing/       │───▶│  billing_transactions   │
│  Paywall     │    │   purchase-intent        │    │  provider='kaspi' (hc)  │
└──────────────┘    │   [hardcoded stub logic] │    └─────────────────────────┘
                    └──────────────────────────┘
                                                              │
       ┌──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│  DEV settle                  │    │  Webhook                     │
│  [duplicated settlement]     │    │  [duplicated settlement]     │
└──────────────────────────────┘    └──────────────────────────────┘
```

### 4.2 After P1.1 (Abstracted)

```
┌──────────────┐    ┌──────────────────────────┐    ┌─────────────────────────┐
│  Frontend    │───▶│ POST /api/billing/       │───▶│  billing_transactions   │
│  Paywall     │    │   purchase-intent        │    │  provider=<from provider>│
└──────────────┘    │   ↓                      │    └─────────────────────────┘
                    │ getPaymentProvider()     │
                    │   ↓                      │
                    │ StubProvider             │
                    │   .createPaymentIntent() │
                    └──────────────────────────┘
                                                              │
       ┌──────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│  DEV settle                  │    │  Webhook                     │
│   ↓                          │    │   ↓                          │
│ settleTransaction()          │    │ settleTransaction()          │
│   (shared orchestrator)      │    │   (shared orchestrator)      │
└──────────────────────────────┘    └──────────────────────────────┘
                    │                           │
                    └───────────┬───────────────┘
                                │
                                ▼
                ┌───────────────────────────────┐
                │   Settlement Orchestrator     │
                │   - One-off credit            │
                │   - Club subscription         │
                │   (shared logic)              │
                └───────────────────────────────┘
```

---

## 5. Provider Interface

```typescript
interface PaymentProvider {
  readonly providerId: string;
  
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentOutput>;
}

interface CreatePaymentIntentInput {
  transactionId: string;
  amount: number;
  currencyCode: string;
  title: string;
}

interface CreatePaymentIntentOutput {
  provider: string;
  providerPaymentId: string;
  paymentUrl?: string;
  payload?: Record<string, unknown>;
  instructions: string;
}
```

---

## 6. Behavior Matrix

### 6.1 purchase-intent

| Aspect | Before P1.1 | After P1.1 | Changed? |
|--------|-------------|------------|----------|
| Provider value | `'kaspi'` (hardcoded) | `'kaspi'` (from StubProvider) | NO |
| Provider payment ID format | `KASPI_{ts}_{random}` | `KASPI_{ts}_{random}` | NO |
| Payment URL format | `https://kaspi.kz/pay/{id}` | `https://kaspi.kz/pay/{id}` | NO |
| Response shape | `{ transaction_id, transaction_reference, payment }` | Same | NO |

### 6.2 DEV settle

| Aspect | Before P1.1 | After P1.1 | Changed? |
|--------|-------------|------------|----------|
| Lookup by | `transaction_id` | `transaction_id` | NO |
| One-off credit | `createBillingCredit()` inline | Via `settleTransaction()` | NO (same logic) |
| Club subscription | `activateSubscription()` inline | Via `settleTransaction()` | NO (same logic) |
| Idempotency | Status check | Status check (via orchestrator) | NO |
| Settlement semantics | REPLACE, 30-day | REPLACE, 30-day | NO |

### 6.3 Production webhook

| Aspect | Before P1.1 | After P1.1 | Changed? |
|--------|-------------|------------|----------|
| Lookup by | `provider_payment_id` | `provider_payment_id` | NO |
| One-off credit | `createBillingCredit()` inline | Via `settleTransaction()` | NO (same logic) |
| Club subscription | `activateSubscription()` inline | Via `settleTransaction()` | NO (same logic) |
| Idempotency | Status check | Status check (via orchestrator) | NO |
| Settlement semantics | REPLACE, 30-day | REPLACE, 30-day | NO |

---

## 7. Settlement Orchestrator Details

### 7.1 Centralized Logic

The `settleTransaction()` function handles:

1. **One-off credits** (EVENT_UPGRADE_500)
   - Calls `createBillingCredit()`
   - Idempotency via `source_transaction_id` UNIQUE constraint

2. **Club subscriptions** (CLUB_50, CLUB_500, CLUB_UNLIMITED)
   - Calls `activateSubscription()` with 30-day REPLACE semantics
   - Idempotency via original status check + upsert on `club_id`

### 7.2 Settlement Constants

| Constant | Value | Source |
|----------|-------|--------|
| Subscription period | 30 days | PHASE_P0_1 ARCHITECT decision |
| Settlement semantics | REPLACE | PHASE_P0_1 ARCHITECT decision |
| graceUntil | NULL | Admin extension OUT OF SCOPE |

---

## 8. Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `src/app/api/billing/purchase-intent/route.ts` | Modified | Use provider abstraction |
| `src/app/api/dev/billing/settle/route.ts` | Modified | Use settlement orchestrator |
| `src/app/api/billing/webhook/route.ts` | Modified | Use settlement orchestrator |

---

## 9. Out-of-Scope (Explicit)

| Item | Status | Reason |
|------|--------|--------|
| UI changes | ❌ NOT INCLUDED | Backend only phase |
| DB migrations / schema changes | ❌ NOT INCLUDED | Foundation phase |
| Billing Domain changes | ❌ NOT INCLUDED | Layer boundary |
| Enforcement logic changes | ❌ NOT INCLUDED | Out of scope |
| Feature flags (PAYMENT_MODE, etc.) | ❌ NOT INCLUDED | Future phases |
| Simulation provider implementation | ❌ NOT INCLUDED | Future phase (P1.2) |
| Real Kaspi integration | ❌ NOT INCLUDED | Future phase (P1.3) |
| Signature validation | ❌ NOT INCLUDED | Future phases |
| Webhook redesign | ❌ NOT INCLUDED | Out of scope |
| Status changes | ❌ NOT INCLUDED | Canonical: pending\|completed\|failed\|refunded |

---

## 10. Verification

```bash
npx tsc --noEmit  # ✅ Passed
npm run build     # ✅ Passed
```

---

## 11. Confirmation: NO BEHAVIOR CHANGE

**EXPLICIT CONFIRMATION:**

- ✅ Provider value remains `'kaspi'`
- ✅ Provider payment ID format unchanged: `KASPI_{timestamp}_{random}`
- ✅ Payment URL format unchanged: `https://kaspi.kz/pay/{id}`
- ✅ Settlement semantics unchanged: REPLACE, 30-day period
- ✅ Idempotency behavior unchanged
- ✅ API response shapes unchanged
- ✅ No billing domain logic touched
- ✅ No enforcement logic touched
- ✅ No DB schema changes

This phase is **PURELY STRUCTURAL**.

---

## 12. Next Steps

| Phase | Task | Dependency |
|-------|------|------------|
| P1.2 | Simulated provider implementation | This implementation |
| P1.3 | Real Kaspi provider | P1.2 |

**Awaiting explicit GO from Architect for next phase.**

---

**END OF IMPLEMENTATION DOCUMENT**
