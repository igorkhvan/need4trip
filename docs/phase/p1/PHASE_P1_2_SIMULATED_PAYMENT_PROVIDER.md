# PHASE_P1_2 — SIMULATED PAYMENT PROVIDER

**Status:** ✅ COMPLETED  
**Date:** 2026-02-04  
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
| `"simulated"` | SimulatedProvider | Creates transaction and immediately auto-settles | End-to-end flow testing |

### Server-Side Only

- Environment variable is read only on the server (Node.js runtime)
- NOT user-controlled (cannot be passed via request)
- Selection happens in `getPaymentProvider()` function

---

## 4. New/Modified Files

### New Files

| File | Purpose |
|------|---------|
| `src/lib/payments/providers/simulatedProvider.ts` | Simulated provider implementation |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/payments/providers/paymentProvider.ts` | Added `shouldAutoSettle` to output, env-based provider selection |
| `src/lib/payments/settlementOrchestrator.ts` | Added `simulated_provider` to caller type |
| `src/lib/payments/index.ts` | Updated exports, added `PaymentProviderMode` type |
| `src/app/api/billing/purchase-intent/route.ts` | Added auto-settle logic for simulation mode |

---

## 5. Updated Flow Description

### 5.1 Purchase Intent in Stub Mode (Default)

```
┌──────────────┐    ┌──────────────────────────┐    ┌─────────────────────────┐
│  Frontend    │───▶│ POST /api/billing/       │───▶│  billing_transactions   │
│  Paywall     │    │   purchase-intent        │    │  status='pending'       │
└──────────────┘    │   ↓                      │    │  provider='kaspi'       │
                    │ getPaymentProvider()     │    └─────────────────────────┘
                    │   ↓ (PAYMENT_PROVIDER_   │
                    │      MODE='stub')        │
                    │   ↓                      │
                    │ StubProvider             │
                    │   .createPaymentIntent() │
                    └──────────────────────────┘
                                                              │
                                Manual settlement required:   │
                                POST /api/dev/billing/settle  │
                                   ↓                          │
                                settleTransaction()           │
```

### 5.2 Purchase Intent in Simulated Mode (Auto-Settle)

```
┌──────────────┐    ┌──────────────────────────┐    ┌─────────────────────────┐
│  Frontend    │───▶│ POST /api/billing/       │───▶│  billing_transactions   │
│  Paywall     │    │   purchase-intent        │    │  status='pending'→      │
└──────────────┘    │   ↓                      │    │  status='completed'     │
                    │ getPaymentProvider()     │    │  provider='simulated'   │
                    │   ↓ (PAYMENT_PROVIDER_   │    └─────────────────────────┘
                    │      MODE='simulated')   │              │
                    │   ↓                      │              │
                    │ SimulatedProvider        │              │
                    │   .createPaymentIntent() │              │
                    │   (shouldAutoSettle=true)│              │
                    │   ↓                      │              │
                    │ [Auto-settle flow]       │              │
                    │   1. Update status       │◀─────────────┘
                    │      → 'completed'       │
                    │   2. settleTransaction() │
                    │      ↓                   │
                    │   Issue entitlement      │
                    └──────────────────────────┘
                              │
                              ▼
                    ┌───────────────────────────┐
                    │ Entitlement Issued:       │
                    │ - Credit (available)      │
                    │ - OR Subscription (active)│
                    └───────────────────────────┘
```

---

## 6. Behavior Matrix

### 6.1 Provider Comparison

| Aspect | StubProvider | SimulatedProvider |
|--------|--------------|-------------------|
| `providerId` | `'kaspi'` | `'simulated'` |
| `providerPaymentId` format | `KASPI_{ts}_{random}` | `SIM_{ts}_{random}` |
| `paymentUrl` | `https://kaspi.kz/pay/{id}` | `undefined` |
| `shouldAutoSettle` | `undefined` (false) | `true` |
| Settlement | Manual via DEV endpoint | Automatic in request |
| Entitlement | After manual settle | Immediate |

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
| First purchase-intent call (simulated) | Creates transaction → auto-settle → entitlement issued |
| Same transaction settle again (webhook) | `settleTransaction()` returns `idempotentSkip: true` |
| Credit idempotency | `source_transaction_id` UNIQUE constraint (DB level) |
| Subscription idempotency | Status check + upsert on `club_id` |

---

## 7. Technical Details

### 7.1 Provider Selection Logic

```typescript
// In getPaymentProvider()
function getPaymentProviderMode(): PaymentProviderMode {
  const mode = process.env.PAYMENT_PROVIDER_MODE;
  
  if (mode === 'simulated') {
    return 'simulated';
  }
  
  // Default to stub mode
  return 'stub';
}
```

### 7.2 Auto-Settlement Logic

```typescript
// In purchase-intent route, after transaction creation
if (paymentIntent.shouldAutoSettle === true) {
  // 1. Update transaction status to 'completed'
  await db.from("billing_transactions")
    .update({ status: "completed" })
    .eq("id", transaction.id);
  
  // 2. Settle via Settlement Orchestrator
  await settleTransaction(
    transactionForSettlement,
    "pending",  // originalStatus
    { caller: "simulated_provider" }
  );
}
```

### 7.3 SimulatedProvider Output

```typescript
{
  provider: 'simulated',
  providerPaymentId: 'SIM_1738665600000_A7BX3K2',
  paymentUrl: undefined,  // No external URL
  payload: {
    simulation_note: "This is a simulated payment. Auto-settling immediately.",
    auto_settle: true,
  },
  instructions: "[SIMULATION MODE]\n\nThis payment is simulated...",
  shouldAutoSettle: true,
}
```

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
# Set env var
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

---

## 12. Next Steps

| Phase | Task | Dependency |
|-------|------|------------|
| P1.3 | Real Kaspi provider integration | This implementation |

**Awaiting explicit GO from Architect for next phase.**

---

**END OF IMPLEMENTATION DOCUMENT**
