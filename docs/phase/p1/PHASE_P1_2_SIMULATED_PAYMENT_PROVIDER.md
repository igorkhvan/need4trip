# PHASE_P1_2 — SIMULATED PAYMENT PROVIDER

**Status:** ✅ COMPLETED  
**Date:** 2026-02-04  
**Updated:** P1.2A Hotfix  
**Type:** IMPLEMENTATION (BACKEND ONLY)  
**Author:** AI Executor (per WORKING CONTRACT — ARCHITECT × EXECUTOR PROCESS)

---

## 1. Purpose

Implement a first-class Simulated Payment Provider that allows:
- Creating payment intents in "simulation mode"
- Immediately settling payments server-side using the existing Settlement Orchestrator
- Keeping the rest of the system unchanged (UI, billing domain, DB schema)

This enables end-to-end testing of the payment flow without external provider interaction or manual settlement.

---

## 2. Documents Referenced (MANDATORY READING)

| Document | Location | Relevance |
|----------|----------|-----------|
| **PHASE_P1_1_PAYMENT_PROVIDER_ABSTRACTION** | `docs/phase/p1/` | Provider interface, Settlement Orchestrator |
| **PHASE_P1_D_PAYMENT_PROVIDER_ARCH_DIAGNOSTIC** | `docs/phase/p1/` | Current provider fields, provider_payment_id patterns |
| **PHASE_P1_0_FIX_INACCURACIES** | `docs/phase/p1/` | Canonical status: `completed` (not `paid`) |
| **PHASE_P0_1_SUBSCRIPTION_SETTLEMENT_IMPLEMENTATION** | `docs/phase/p0/` | Settlement semantics: REPLACE, 30-day period |
| **PHASE_P0_2_WEBHOOK_ENTRYPOINT_SKELETON** | `docs/phase/p0/` | Webhook responsibilities |
| **SSOT_ARCHITECTURE** | `docs/ssot/` | Layer boundaries (API → Payment Execution → Billing Domain) |
| **SSOT_BILLING_SYSTEM_ANALYSIS** | `docs/ssot/` | Payment Execution vs Billing Domain separation |
| **SSOT_API** | `docs/ssot/` | API layer rules |
| **SSOT_DATABASE** | `docs/ssot/` | `billing_transactions` schema, status CHECK constraint |

---

## 3. Env Switch Contract

### Environment Variable

| Variable | Type | Values | Default |
|----------|------|--------|---------|
| `PAYMENT_PROVIDER_MODE` | string | `"stub"` \| `"simulated"` | `"stub"` |

### Semantics

| Mode | Provider | Behavior | Use Case |
|------|----------|----------|----------|
| `"stub"` | StubProvider | Creates pending transaction, manual settlement via `/api/dev/billing/settle` | DEV testing with manual control |
| `"simulated"` | SimulatedProvider | Creates transaction and immediately auto-settles (provider-internal) | End-to-end flow testing |

### Server-Side Only

- Environment variable is read only on the server (Node.js runtime)
- NOT user-controlled (cannot be passed via request)
- Selection happens in `getPaymentProvider()` function

### Production Guard (P1.2A)

**SAFETY:** Simulated mode is **FORBIDDEN** in production.

```typescript
if (mode === 'simulated' && process.env.NODE_ENV === 'production') {
  throw new SimulatedModeInProductionError();
}
```

If `PAYMENT_PROVIDER_MODE=simulated` is set in production, the system will throw an error to prevent accidental misuse.

---

## 4. New/Modified Files

### New Files

| File | Purpose |
|------|---------|
| `src/lib/payments/providers/simulatedProvider.ts` | Simulated provider implementation |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/payments/providers/paymentProvider.ts` | Env-based provider selection, production guard, extended input for settlement context |
| `src/lib/payments/settlementOrchestrator.ts` | Added `simulated_provider` to caller type |
| `src/lib/payments/index.ts` | Updated exports, added `PaymentProviderMode` type |
| `src/app/api/billing/purchase-intent/route.ts` | Restructured flow: create transaction FIRST, then call provider |

---

## 5. Updated Flow Description

### 5.1 Purchase Intent in Stub Mode (Default)

```
┌──────────────┐    ┌──────────────────────────┐    ┌─────────────────────────┐
│  Frontend    │───▶│ POST /api/billing/       │───▶│  billing_transactions   │
│  Paywall     │    │   purchase-intent        │    │  status='pending'       │
└──────────────┘    │   ↓                      │    │  provider='kaspi'       │
                    │ 1. Create transaction    │    └─────────────────────────┘
                    │    (status='pending')    │
                    │   ↓                      │
                    │ 2. StubProvider          │
                    │    .createPaymentIntent()│
                    │   ↓                      │
                    │ 3. Update provider_      │
                    │    payment_id            │
                    └──────────────────────────┘
                                                              │
                                Manual settlement required:   │
                                POST /api/dev/billing/settle  │
                                   ↓                          │
                                settleTransaction()           │
```

### 5.2 Purchase Intent in Simulated Mode (Provider-Internal Settlement)

```
┌──────────────┐    ┌──────────────────────────┐    ┌─────────────────────────┐
│  Frontend    │───▶│ POST /api/billing/       │───▶│  billing_transactions   │
│  Paywall     │    │   purchase-intent        │    │  status='pending'→      │
└──────────────┘    │   ↓                      │    │  status='completed'     │
                    │ 1. Create transaction    │    │  provider='simulated'   │
                    │    (status='pending')    │    └─────────────────────────┘
                    │   ↓                      │              │
                    │ 2. SimulatedProvider     │              │
                    │    .createPaymentIntent()│              │
                    │    [PROVIDER-INTERNAL:]  │              │
                    │    a. markTransaction    │◀─────────────┘
                    │       Completed()        │
                    │    b. settleTransaction()│
                    │   ↓                      │
                    │ Entitlement Issued       │
                    └──────────────────────────┘
                              │
                              ▼
                    ┌───────────────────────────┐
                    │ Entitlement Issued:       │
                    │ - Credit (available)      │
                    │ - OR Subscription (active)│
                    └───────────────────────────┘
```

**Key difference (P1.2A):** Settlement is now entirely **provider-internal**. The API route does NOT contain any settlement logic.

---

## 6. Behavior Matrix

### 6.1 Provider Comparison

| Aspect | StubProvider | SimulatedProvider |
|--------|--------------|-------------------|
| `providerId` | `'kaspi'` | `'simulated'` |
| `providerPaymentId` format | `KASPI_{ts}_{random}` | `SIM_{ts}_{random}` |
| `paymentUrl` | `https://kaspi.kz/pay/{id}` | `undefined` |
| Settlement | Manual via DEV endpoint | **Provider-internal** (P1.2A) |
| Entitlement | After manual settle | Immediate |
| Production allowed | ✅ Yes | ❌ No (guard throws error) |

### 6.2 purchase-intent Response Shape

| Field | Stub Mode | Simulated Mode | Changed? |
|-------|-----------|----------------|----------|
| `transaction_id` | UUID | UUID | NO |
| `transaction_reference` | `KASPI_*` | `SIM_*` | ID prefix only |
| `payment.provider` | `'kaspi'` | `'simulated'` | Value only |
| `payment.invoice_url` | URL string | `undefined` | Value only |
| `payment.instructions` | Kaspi instructions | Simulation note | Content only |

**Response shape is UNCHANGED** — same fields, different values.

### 6.3 Idempotency Behavior

| Scenario | Behavior |
|----------|----------|
| First purchase-intent call (simulated) | Creates transaction → provider-internal settle → entitlement issued |
| Same transaction settle again (webhook) | `settleTransaction()` returns `idempotentSkip: true` |
| Credit idempotency | `source_transaction_id` UNIQUE constraint (DB level) |
| Subscription idempotency | Status check + upsert on `club_id` |

---

## 7. Technical Details

### 7.1 Provider Selection Logic (with Production Guard)

```typescript
function getPaymentProviderMode(): PaymentProviderMode {
  const mode = process.env.PAYMENT_PROVIDER_MODE;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (mode === 'simulated') {
    // SAFETY GUARD: Simulated mode must NOT run in production
    if (isProduction) {
      throw new SimulatedModeInProductionError();
    }
    return 'simulated';
  }
  
  // Default to stub mode
  return 'stub';
}
```

### 7.2 Provider-Internal Settlement (P1.2A)

Settlement is now **entirely inside** `SimulatedProvider.createPaymentIntent()`:

```typescript
// Inside SimulatedProvider.createPaymentIntent()
async createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentOutput> {
  // 1. Generate providerPaymentId
  const providerPaymentId = this.generateProviderPaymentId();
  
  // 2. Mark transaction completed via canonical repo function
  await markTransactionCompleted(input.transactionId, providerPaymentId);
  
  // 3. Build BillingTransaction from input.transactionContext
  const transactionForSettlement: BillingTransaction = { ... };
  
  // 4. Call settleTransaction via SettlementOrchestrator
  await settleTransaction(transactionForSettlement, "pending", { caller: "simulated_provider" });
  
  // 5. Return output
  return { provider: 'simulated', providerPaymentId, ... };
}
```

**API route has NO settlement logic.** This ensures:
- Clean separation of concerns
- Provider contract doesn't leak policy
- No direct DB updates in API route (except transaction creation)

### 7.3 Extended Input for Settlement Context

```typescript
interface CreatePaymentIntentInput {
  transactionId: string;       // The REAL transaction ID (after DB insert)
  amount: number;
  currencyCode: string;
  title: string;
  
  // P1.2A: Required for SimulatedProvider settlement
  transactionContext?: {
    clubId: string | null;
    userId: string | null;
    productCode: string;
    planId: string | null;
  };
}
```

StubProvider ignores `transactionContext`. SimulatedProvider requires it.

---

## 8. Out-of-Scope (Explicit)

| Item | Status | Reason |
|------|--------|--------|
| UI changes | ❌ NOT INCLUDED | Backend only phase |
| DB migrations / schema changes | ❌ NOT INCLUDED | No schema changes needed |
| Billing Domain changes | ❌ NOT INCLUDED | Layer boundary |
| Enforcement logic changes | ❌ NOT INCLUDED | Out of scope |
| Kaspi integration (signatures, API) | ❌ NOT INCLUDED | Future phase (P1.3) |
| Feature flags framework | ❌ NOT INCLUDED | Simple env var suffices |
| New endpoints | ❌ NOT INCLUDED | Uses existing purchase-intent |
| Status value changes | ❌ NOT INCLUDED | Uses canonical `completed` |

---

## 9. Verification

### 9.1 TypeScript Compilation

```bash
npx tsc --noEmit  # ✅ Passed
```

### 9.2 Production Build

```bash
npm run build     # ✅ Passed
```

### 9.3 Linter Errors

```bash
# No linter errors in modified files
```

---

## 10. Confirmation: Key Constraints Met

- ✅ **No UI changes** — backend only
- ✅ **No DB migrations** — no schema changes
- ✅ **No billing domain changes** — settlement via existing orchestrator
- ✅ **No enforcement logic changes** — unchanged
- ✅ **No Kaspi integration** — out of scope
- ✅ **No new endpoints** — uses existing purchase-intent
- ✅ **Canonical status `completed`** — never uses `paid`
- ✅ **API response shape unchanged** — same fields, different values
- ✅ **Server-side only env switch** — not user-controlled
- ✅ **Idempotent settlement** — via SettlementOrchestrator guarantees
- ✅ **Production guard** — throws error if simulated in prod (P1.2A)
- ✅ **No direct DB updates in route** — settlement is provider-internal (P1.2A)

---

## 11. Testing (Manual)

### Test Stub Mode (Default)

```bash
# Default behavior (no env var or PAYMENT_PROVIDER_MODE=stub)
curl -X POST http://localhost:3000/api/billing/purchase-intent \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"product_code": "EVENT_UPGRADE_500"}'

# Response has provider='kaspi', status remains 'pending'
# Manual settlement required via /api/dev/billing/settle
```

### Test Simulated Mode

```bash
# Set env var (ONLY in non-production!)
PAYMENT_PROVIDER_MODE=simulated npm run dev

# Or in .env.local:
# PAYMENT_PROVIDER_MODE=simulated

curl -X POST http://localhost:3000/api/billing/purchase-intent \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"product_code": "EVENT_UPGRADE_500"}'

# Response has provider='simulated'
# Transaction is already 'completed'
# Credit is already issued (status='available')
```

### Test Production Guard

```bash
# If PAYMENT_PROVIDER_MODE=simulated in production environment:
# → Throws SimulatedModeInProductionError
# → Request fails with 500 Internal Server Error
# → Log: "PAYMENT_PROVIDER_MODE='simulated' is NOT allowed in production"
```

---

## 12. P1.2A Hotfix Summary

| Issue | Fix |
|-------|-----|
| `shouldAutoSettle` leaked policy into provider interface | **Removed** from `CreatePaymentIntentOutput` |
| Direct DB update in purchase-intent route | **Moved** settlement into `SimulatedProvider` |
| No production safety | **Added** `SimulatedModeInProductionError` guard |
| Flow order mismatch | **Restructured** to create transaction FIRST, then call provider |

---

## 13. Next Steps

| Phase | Task | Dependency |
|-------|------|------------|
| P1.3 | Real Kaspi provider integration | This implementation |

**Awaiting explicit GO from Architect for next phase.**

---

**END OF IMPLEMENTATION DOCUMENT**
