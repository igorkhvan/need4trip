# PHASE_P0_2 — WEBHOOK ENTRYPOINT SKELETON

**Status:** ✅ COMPLETED  
**Date:** 2026-02-03  
**Type:** IMPLEMENTATION (BACKEND ONLY)

---

## Summary

Introduced a production webhook entrypoint skeleton for payment completion.  
This is a **structural entrypoint** — not provider-specific (no Kaspi signature validation, no provider payload mapping).

The handler follows the same settlement semantics as the existing DEV settle endpoint.

---

## Files Added/Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `src/app/api/billing/webhook/route.ts` | **ADDED** | Webhook handler skeleton |
| `src/lib/db/billingTransactionsRepo.ts` | **MODIFIED** | Added `getTransactionByProviderPaymentId()` helper |

---

## Request Contract

### Endpoint

```
POST /api/billing/webhook
Content-Type: application/json
```

### Request Body (Minimal)

```json
{
  "provider_payment_id": "string (required)"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider_payment_id` | string | ✅ | Unique payment identifier from provider |

### Response

**Success (200):**
```json
{ "ok": true }
```

**Error responses:**
- `400 Bad Request` — Invalid JSON or missing `provider_payment_id`
- `404 Not Found` — Transaction with given `provider_payment_id` not found
- `500 Internal Server Error` — Unexpected failure

---

## Behavior Matrix

| Scenario | Condition | Action | HTTP Status |
|----------|-----------|--------|-------------|
| **Missing ID** | `provider_payment_id` is missing or empty | Return error | `400` |
| **Not Found** | Transaction lookup returns null | Return error | `404` |
| **Already Completed** | `transaction.status === "paid"` | NO-OP, return success | `200` |
| **Pending → Completed** | `transaction.status !== "paid"` | Mark paid, issue entitlement | `200` |

---

## Settlement Logic

Settlement behavior mirrors DEV settle endpoint (`/api/dev/billing/settle`):

### One-off Credit (EVENT_UPGRADE_500)

```
IF transaction.productCode === "EVENT_UPGRADE_500" AND transaction.userId:
  → createBillingCredit({
      userId,
      creditCode: "EVENT_UPGRADE_500",
      sourceTransactionId: transaction.id
    })
  → Idempotent via source_transaction_id UNIQUE constraint
```

### Club Subscription (CLUB_50 / CLUB_500 / CLUB_UNLIMITED)

```
IF transaction.clubId AND transaction.planId:
  → periodStart = NOW
  → periodEnd = NOW + 30 days
  → activateSubscription(clubId, planId, periodStart, periodEnd, null)
  → REPLACE semantics (upsert on club_id conflict)
  → graceUntil = NULL
```

---

## Idempotency Guarantees

| Path | Mechanism |
|------|-----------|
| Transaction status | Explicit check before update |
| Credit issuance | `source_transaction_id` UNIQUE constraint (catches 23505) |
| Subscription | Upsert with `onConflict: 'club_id'` |

---

## Repository Method Added

```typescript
// src/lib/db/billingTransactionsRepo.ts

export async function getTransactionByProviderPaymentId(
  providerPaymentId: string
): Promise<BillingTransaction | null>
```

- Uses existing database index: `idx_billing_transactions_provider`
- Returns `null` if not found (PGRST116 handled)
- Throws on unexpected DB errors

---

## Out of Scope (Confirmed)

| Item | Status |
|------|--------|
| UI changes | ❌ NOT INCLUDED |
| DB migrations / schema changes | ❌ NOT INCLUDED |
| Changes to purchase-intent | ❌ NOT INCLUDED |
| Changes to enforcement/billing domain logic | ❌ NOT INCLUDED |
| Kaspi signature verification | ❌ NOT INCLUDED |
| Feature flags / PAYMENT_MODE | ❌ NOT INCLUDED |
| Simulation provider work | ❌ NOT INCLUDED |

---

## Verification

```bash
npx tsc --noEmit  # ✅ Passed
npm run build     # ✅ Passed
```

---

## Next Steps

Awaiting explicit GO from Architect for PHASE_P0_3.
