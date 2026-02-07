# PHASE_P1_3_D — KASPI PROVIDER DIAGNOSTIC & INTEGRATION PLAN

**Status:** 🔶 DIAGNOSTIC COMPLETE (WITH OPEN QUESTIONS)  
**Date:** 2026-02-04  
**Phase Type:** Diagnostic Only (NO code changes)  
**Author:** AI Executor (per WORKING CONTRACT — ARCHITECT × EXECUTOR PROCESS)

---

## 1. Purpose

Establish FACTS about Kaspi payment integration to enable safe implementation in PHASE_P1_3.

**Deliverable:** Fact-based analysis of:
- Kaspi payment lifecycle
- Identifier mapping to `provider_payment_id`
- Callback/webhook mechanics
- Status mapping to internal canonical statuses
- Required changes inventory (NO implementation)

**Constraint:** This document contains ONLY facts. NO implementation, NO code.

---

## 2. Documents Referenced (MANDATORY READING)

| Document | Location | Relevance |
|----------|----------|-----------|
| **PHASE_P1_2_SIMULATED_PAYMENT_PROVIDER** | `docs/phase/p1/` | Provider abstraction, SettlementOrchestrator, production guard |
| **PHASE_P1_1_PAYMENT_PROVIDER_ABSTRACTION** | `docs/phase/p1/` | Provider interface contract |
| **PHASE_P1_D_PAYMENT_PROVIDER_ARCH_DIAGNOSTIC** | `docs/phase/p1/` | Current provider fields, provider_payment_id lifecycle |
| **PHASE_P1_0_FIX_INACCURACIES** | `docs/phase/p1/` | Canonical statuses: `pending | completed | failed | refunded` |
| **PHASE_P0_2_WEBHOOK_ENTRYPOINT_SKELETON** | `docs/phase/p0/` | Webhook responsibilities, lookup by `provider_payment_id` |
| **SSOT_ARCHITECTURE** | `docs/ssot/` | Layer boundaries (API → Payment Execution → Billing Domain) |
| **SSOT_BILLING_SYSTEM_ANALYSIS** | `docs/ssot/` | Billing Domain invariants |
| **SSOT_API** | `docs/ssot/` | API layer rules |
| **SSOT_DATABASE** | `docs/ssot/` | `billing_transactions` schema, CHECK constraints |

---

## 3. Kaspi Payment Integration Options

### 3.1 Identified Integration Paths

Based on public documentation, Kaspi offers multiple integration options:

| Path | Description | Use Case |
|------|-------------|----------|
| **Kaspi Merchant API** | Marketplace order management | E-commerce sellers on Kaspi marketplace |
| **Kaspi Pay QR** | Direct QR-code payments | B2C payments, service providers |
| **Kaspi Pay Link** | Payment link generation | Online services, subscriptions |
| **Kaspi POS** | Point-of-sale terminal | Physical retail |

**Relevant for Need4Trip:** Kaspi Pay QR or Kaspi Pay Link (direct B2C payments for subscriptions/credits).

### 3.2 Kaspi Pay QR Flow (Based on ePayment.kz / Halyk Bank Documentation)

The Kazakhstan banking ecosystem uses a standardized QR payment flow:

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Merchant    │───▶│  Token Request   │───▶│  Payment        │
│  Backend     │    │  (OAuth)         │    │  Provider       │
└──────────────┘    └──────────────────┘    └─────────────────┘
       │                                            │
       │ ← access_token (20 min TTL)                │
       ▼                                            │
┌──────────────────┐                                │
│  QR Generation   │                                │
│  POST /qr/generate                                │
│  - postLink      │                                │
│  - failurePostLink                                │
└──────────────────┘                                │
       │                                            │
       │ ← qrcode, billNumber, status=NEW           │
       ▼                                            │
┌──────────────────┐    ┌──────────────────────────┐
│  User Scans QR   │───▶│  Bank App (Halyk/Kaspi)  │
└──────────────────┘    │  User confirms payment   │
                        └──────────────────────────┘
                                    │
       ┌────────────────────────────┘
       ▼
┌──────────────────────────────────────────────────┐
│  CALLBACK to postLink / failurePostLink          │
│  Status: PAID or REJECTED                        │
└──────────────────────────────────────────────────┘
```

### 3.3 QR Payment Statuses (ePayment.kz Standard)

| Status | Description | Terminal? |
|--------|-------------|-----------|
| `NEW` | QR generated, awaiting scan | NO |
| `SCANNED` | User scanned in bank app | NO |
| `CLOSED` | User closed bank app (session invalid) | YES (requires new QR) |
| `RETURN` | User returned to scan window (session invalid) | YES (requires new QR) |
| `BLOCKED` | Funds blocked, awaiting confirmation | NO |
| `PAID` | Payment successful | YES ✅ |
| `REJECTED` | Payment failed or timeout | YES ❌ |

**Critical:** QR codes expire after **20 minutes**. If no final status (PAID/REJECTED) within 20 min, QR is auto-cancelled and marked REJECTED.

---

## 4. Kaspi Merchant API Status Taxonomy (Marketplace Orders)

If using Kaspi Marketplace API (alternative path), the following apply:

### 4.1 Order States (OrdersState)

| State | Description |
|-------|-------------|
| `NEW` | New order created |
| `SIGN_REQUIRED` | Signature required for delivery |
| `PICKUP` | Ready for pickup |
| `DELIVERY` | In delivery |
| `KASPI_DELIVERY` | Using Kaspi delivery service |
| `ARCHIVE` | Archived order |

### 4.2 Order Statuses (OrdersStatus)

| Status | Description | Terminal? |
|--------|-------------|-----------|
| `APPROVED_BY_BANK` | Payment approved by bank | NO |
| `ACCEPTED_BY_MERCHANT` | Merchant accepted order | NO |
| `COMPLETED` | Order completed | YES ✅ |
| `CANCELLED` | Order cancelled | YES ❌ |
| `CANCELLING` | Cancellation in progress | NO |
| `KASPI_DELIVERY_RETURN_REQUESTED` | Return requested | NO |
| `RETURN_ACCEPTED_BY_MERCHANT` | Merchant accepted return | NO |
| `RETURNED` | Order returned | YES (refund) |

---

## 5. Identifier Mapping to `provider_payment_id`

### 5.1 Current Internal Format (Stub)

**Source:** PHASE_P1_D_PAYMENT_PROVIDER_ARCH_DIAGNOSTIC §4.4

```
KASPI_{timestamp}_{random}
Example: KASPI_1738665600000_A7BX3K2
```

This is an **internally generated stub** format. Real Kaspi integration will receive external IDs.

### 5.2 Kaspi External Identifiers

| Integration Path | Identifier Field | Format | Stable? |
|------------------|------------------|--------|---------|
| QR Payment | `billNumber` | Integer | ✅ Stable (assigned by provider) |
| QR Payment | `invoiceID` | String (merchant-provided) | ✅ Merchant-controlled |
| Merchant API | `order.id` | String (UUID-like) | ✅ Stable |
| Merchant API | `order.attributes.code` | String | ✅ Stable |

### 5.3 Recommended `provider_payment_id` Mapping

| Path | Use as `provider_payment_id` | Rationale |
|------|------------------------------|-----------|
| QR Payment | `invoiceID` (merchant-generated) | Merchant-controlled, can be set before payment |
| Merchant API | `order.id` or `order.attributes.code` | Kaspi-assigned, stable |

**CRITICAL:** For QR payments, merchant generates `invoiceID` at transaction creation time. This becomes the lookup key for webhook callbacks.

---

## 6. Status Mapping Table (Kaspi → Internal)

### 6.1 Canonical Internal Statuses

**Source:** PHASE_P1_0_FIX_INACCURACIES, SSOT_DATABASE

| Internal Status | Meaning |
|-----------------|---------|
| `pending` | Transaction created, awaiting payment |
| `completed` | Payment successful, entitlements issued |
| `failed` | Payment failed |
| `refunded` | Payment refunded |

### 6.2 QR Payment Status Mapping

| Kaspi QR Status | → Internal Status | Notes |
|-----------------|-------------------|-------|
| `NEW` | `pending` | QR generated, awaiting user action |
| `SCANNED` | `pending` | User in payment flow |
| `BLOCKED` | `pending` | Funds blocked, awaiting confirmation |
| `PAID` | `completed` | **Terminal success** |
| `REJECTED` | `failed` | **Terminal failure** (includes timeout) |
| `CLOSED` | `failed` | Session invalidated by user |
| `RETURN` | `failed` | Session invalidated by user |

### 6.3 Merchant API Status Mapping

| Kaspi Merchant Status | → Internal Status | Notes |
|-----------------------|-------------------|-------|
| `APPROVED_BY_BANK` | `pending` | Payment confirmed, order processing |
| `ACCEPTED_BY_MERCHANT` | `pending` | Merchant processing |
| `COMPLETED` | `completed` | **Terminal success** |
| `CANCELLED` | `failed` | **Terminal failure** |
| `CANCELLING` | `pending` | Cancellation in progress |
| `RETURNED` | `refunded` | Refund completed |
| `RETURN_ACCEPTED_BY_MERCHANT` | `pending` | Refund in progress |

### 6.4 Mapping Ambiguities

| Issue | Status | Resolution |
|-------|--------|------------|
| `CLOSED` vs `REJECTED` | Both map to `failed` | ✅ OK — both are terminal failures |
| `BLOCKED` | Maps to `pending` | ⚠️ May trigger settlement prematurely if misinterpreted |
| `CANCELLING` | Maps to `pending` | ✅ OK — await final `CANCELLED` |

---

## 7. Callback / Webhook Mechanics

### 7.1 QR Payment Callbacks

| Callback | When Triggered | HTTP Method | Expected |
|----------|----------------|-------------|----------|
| `postLink` | Payment successful (PAID) | POST | Merchant confirms receipt |
| `failurePostLink` | Payment failed (REJECTED) | POST | Merchant handles failure |

**Payload:** Documentation does not fully specify callback payload structure. **OPEN QUESTION.**

### 7.2 Webhook Authentication

| Method | Description | Documented? |
|--------|-------------|-------------|
| HMAC Signature | Payload signed with shared secret | ⚠️ UNCLEAR |
| IP Allowlist | Kaspi sends from known IPs | ⚠️ UNCLEAR |
| Bearer Token | Token in Authorization header | ⚠️ UNCLEAR |

**STOP CONDITION:** Callback authentication mechanism is NOT clearly documented in public sources.

### 7.3 Retry Semantics

| Aspect | Expected Behavior | Documented? |
|--------|-------------------|-------------|
| Retry on timeout | Provider retries callback | ⚠️ UNCLEAR |
| Retry count | Unknown | ⚠️ UNCLEAR |
| Idempotency expectation | Merchant must handle duplicates | ✅ ASSUMED |

---

## 8. Idempotency & Retry Considerations

### 8.1 Current Idempotency Guarantees

**Source:** PHASE_P1_1_PAYMENT_PROVIDER_ABSTRACTION, PHASE_P0_2_WEBHOOK_ENTRYPOINT_SKELETON

| Layer | Mechanism |
|-------|-----------|
| Transaction status | `status === 'completed'` check before settlement |
| Credit issuance | `source_transaction_id` UNIQUE constraint |
| Subscription activation | Upsert on `club_id` conflict |

### 8.2 Kaspi-Specific Considerations

| Scenario | Handling |
|----------|----------|
| Duplicate `postLink` callback | Check transaction status before settlement |
| `BLOCKED` → `PAID` race | `BLOCKED` should NOT trigger settlement; wait for `PAID` |
| Multiple QR generations | Each QR has unique `billNumber`/`invoiceID` |
| Timeout (20 min) | Auto-`REJECTED` by provider |

### 8.3 Recommended Approach

```
1. On callback receipt:
   a. Extract provider_payment_id (invoiceID)
   b. Lookup transaction by provider_payment_id
   c. IF status === 'completed' → return 200 OK (idempotent skip)
   d. IF status === 'pending' → process settlement
   e. IF status === 'failed' → reject (already failed)
   
2. Settlement:
   a. markTransactionCompleted(transactionId, providerPaymentId)
   b. settleTransaction(transaction, "pending", { caller: "kaspi_webhook" })
```

---

## 9. Security Considerations

### 9.1 Required Security Measures

| Measure | Priority | Status |
|---------|----------|--------|
| Webhook signature validation | HIGH | ⚠️ Kaspi method unclear |
| IP allowlist | MEDIUM | ⚠️ Kaspi IPs unknown |
| HTTPS only | HIGH | ✅ Required by provider |
| Replay attack prevention | HIGH | ✅ Via idempotency + timestamp check |
| Rate limiting | MEDIUM | ✅ Via existing middleware |

### 9.2 Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| Kaspi Client ID | `KASPI_CLIENT_ID` env var | Server-only |
| Kaspi Client Secret | `KASPI_CLIENT_SECRET` env var | Server-only |
| Kaspi Terminal ID | `KASPI_TERMINAL_ID` env var | Server-only |
| Webhook Secret (if HMAC) | `KASPI_WEBHOOK_SECRET` env var | Server-only |

### 9.3 Logging Constraints

| Data Type | Loggable? | Notes |
|-----------|-----------|-------|
| Transaction ID | ✅ YES | Internal reference |
| Provider Payment ID | ✅ YES | External reference (non-sensitive) |
| Payment amount | ✅ YES | Non-PII |
| Customer name/phone | ❌ NO | PII — redact or omit |
| Raw webhook payload | ❌ NO | May contain sensitive data |
| Tokens/secrets | ❌ NO | Never log |

---

## 10. Required Changes for PHASE_P1_3 (LIST ONLY)

### 10.1 New Files Required

| File | Purpose |
|------|---------|
| `src/lib/payments/providers/kaspiProvider.ts` | Real Kaspi provider implementation |
| `src/lib/payments/kaspiClient.ts` | Kaspi API client (token, QR generation) |
| `src/lib/payments/kaspiWebhookVerifier.ts` | Webhook signature verification |

### 10.2 Modified Files

| File | Change |
|------|--------|
| `src/lib/payments/providers/paymentProvider.ts` | Add `'kaspi'` to provider mode enum |
| `src/app/api/billing/webhook/route.ts` | Add Kaspi-specific payload parsing |
| `src/lib/payments/settlementOrchestrator.ts` | Add `'kaspi_webhook'` to caller type (if needed) |

### 10.3 Environment Variables Required

| Variable | Purpose | Required For |
|----------|---------|--------------|
| `KASPI_CLIENT_ID` | OAuth client ID | Token generation |
| `KASPI_CLIENT_SECRET` | OAuth client secret | Token generation |
| `KASPI_TERMINAL_ID` | Terminal ID for QR | QR generation |
| `KASPI_WEBHOOK_SECRET` | Webhook HMAC secret | Signature verification (if applicable) |
| `KASPI_API_BASE_URL` | API base URL | TEST vs PROD switching |

### 10.4 DB Fields (Evaluation Only — NO MIGRATION)

| Field | Table | Purpose | Required? |
|-------|-------|---------|-----------|
| `provider_metadata` | `billing_transactions` | Store Kaspi-specific data (billNumber, etc.) | ⚠️ EVALUATE |

**Note:** Current schema may be sufficient. `provider_payment_id` stores external reference. Additional metadata may be stored in existing `provider_payment_id` or via JSONB extension if needed.

### 10.5 Configuration Required

| Config | Purpose |
|--------|---------|
| Kaspi Merchant Cabinet | Register as merchant, obtain credentials |
| Webhook URL registration | Configure callback URLs in Kaspi |
| IPSec VPN (if required) | Secure tunnel for API access |

---

## 11. Integration Boundaries

### 11.1 What Belongs in KaspiProvider

| Responsibility | In Provider? |
|----------------|--------------|
| Token generation (OAuth) | ✅ YES |
| QR code generation | ✅ YES |
| Invoice ID generation | ✅ YES |
| Payment URL construction | ✅ YES |

### 11.2 What Belongs in Webhook Verification Layer

| Responsibility | In Verifier? |
|----------------|--------------|
| Signature validation | ✅ YES |
| IP allowlist check | ✅ YES |
| Payload parsing | ✅ YES |
| Status extraction | ✅ YES |

### 11.3 What Belongs in SettlementOrchestrator

| Responsibility | In Orchestrator? |
|----------------|------------------|
| Credit issuance | ✅ YES |
| Subscription activation | ✅ YES |
| Idempotency check | ✅ YES |
| Transaction status update | ✅ YES |

### 11.4 What MUST NOT Cross into Billing Domain

| Responsibility | Billing Domain? |
|----------------|-----------------|
| Kaspi status codes | ❌ NO |
| Webhook payloads | ❌ NO |
| Provider-specific logic | ❌ NO |
| QR generation | ❌ NO |

---

## 12. Open Questions / Unknowns

### 12.1 CRITICAL (Blocking)

| # | Question | Impact | Required Action |
|---|----------|--------|-----------------|
| **OQ-1** | What is Kaspi webhook callback payload structure? | Cannot implement webhook handler | Obtain Kaspi merchant documentation |
| **OQ-2** | What is Kaspi webhook authentication mechanism (HMAC, IP, etc.)? | Cannot verify callbacks securely | Obtain Kaspi merchant documentation |
| **OQ-3** | Does Kaspi Pay QR support subscription-style recurring? | Affects billing flow design | Clarify with Kaspi or use one-time payments |

### 12.2 HIGH PRIORITY

| # | Question | Impact | Required Action |
|---|----------|--------|-----------------|
| **OQ-4** | What are Kaspi's retry semantics for failed callbacks? | Affects idempotency design | Obtain documentation or test empirically |
| **OQ-5** | Is IPSec VPN mandatory for production? | Affects infrastructure | Clarify with Kaspi merchant support |
| **OQ-6** | What is the exact `postLink` POST payload format? | Affects webhook parsing | Obtain documentation |

### 12.3 MEDIUM PRIORITY

| # | Question | Impact | Required Action |
|---|----------|--------|-----------------|
| **OQ-7** | Does Kaspi support partial refunds? | Affects refund flow | Evaluate based on documentation |
| **OQ-8** | What happens if user abandons payment after scan? | Affects UX flow | Test empirically |
| **OQ-9** | Can QR code expiry be extended beyond 20 min? | UX consideration | Clarify with Kaspi |

---

## 13. STOP CONDITIONS

### 13.1 Documentation Gaps

The following STOP conditions are currently active:

| Condition | Status | Resolution Path |
|-----------|--------|-----------------|
| Kaspi webhook payload structure unknown | ⚠️ ACTIVE | Obtain official Kaspi merchant documentation |
| Kaspi webhook authentication method unknown | ⚠️ ACTIVE | Obtain official Kaspi merchant documentation |
| Kaspi API credentials not available | ⚠️ ACTIVE | Register with Kaspi Merchant Cabinet |

### 13.2 Required Before PHASE_P1_3

1. **Obtain Kaspi merchant documentation** (official, not third-party)
2. **Register as Kaspi merchant** (or obtain test credentials)
3. **Clarify webhook authentication** (HMAC signature, IP allowlist, or other)
4. **Clarify callback payload format** (exact fields and structure)

---

## 14. Recommendations for Architect

### 14.1 Immediate Actions

1. **Request access to official Kaspi Merchant API documentation**
   - URL referenced: `kaspi.kz/merchantcabinet/support/pages/viewpage.action?pageId=917615`
   - Requires merchant account or partnership

2. **Clarify integration path**
   - Kaspi Pay QR (direct payments) vs Kaspi Merchant API (marketplace)
   - Need4Trip likely needs Kaspi Pay QR for direct B2C payments

3. **Obtain test environment credentials**
   - Client ID, Client Secret, Terminal ID for TEST environment

### 14.2 Architecture Decisions Needed

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Integration path | QR Payment vs Merchant API | QR Payment (direct B2C) |
| Invoice ID generation | UUID vs timestamp-based | Match existing `KASPI_{ts}_{random}` format |
| Webhook verification | HMAC vs IP allowlist | Depends on Kaspi documentation |

### 14.3 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Kaspi documentation unavailable | MEDIUM | HIGH | Use ePayment.kz/Halyk as reference |
| Webhook verification unclear | HIGH | HIGH | Implement IP allowlist + signature if available |
| 20-min QR timeout too short | LOW | MEDIUM | Display countdown in UI |

---

## 15. Explicit Confirmation

### 15.1 NO IMPLEMENTATION DONE

**CONFIRMED:** This document contains ONLY diagnostic information and planning.

- ❌ No code changes made
- ❌ No Kaspi SDK used
- ❌ No signature verification implemented
- ❌ No environment variables added
- ❌ No simulation changes
- ❌ No UI changes
- ❌ No DB migrations
- ❌ No provider implementation

### 15.2 Status Mapping Validated

**CONFIRMED:** Status mapping is defined in §6 with the following guarantees:

| Kaspi Status | → Internal | Terminal? |
|--------------|------------|-----------|
| `PAID` | `completed` | ✅ |
| `REJECTED` | `failed` | ✅ |
| `COMPLETED` (Merchant API) | `completed` | ✅ |
| `CANCELLED` | `failed` | ✅ |
| `RETURNED` | `refunded` | ✅ |

### 15.3 Boundaries Preserved

**CONFIRMED:** All proposed changes in §10 respect existing architecture:

- Provider abstraction (§11.1)
- Webhook verification layer (§11.2)
- SettlementOrchestrator (§11.3)
- Billing Domain isolation (§11.4)

---

## 16. Next Steps

| Phase | Task | Blocker |
|-------|------|---------|
| Pre-P1.3 | Obtain Kaspi merchant documentation | OQ-1, OQ-2 |
| Pre-P1.3 | Register test merchant account | OQ-3 credentials |
| Pre-P1.3 | Clarify webhook authentication | OQ-2 |
| P1.3 | Implement KaspiProvider | Documentation obtained |
| P1.3 | Implement webhook verification | Authentication clarified |
| P1.3 | Integration testing | Test credentials obtained |

**Awaiting explicit GO from Architect after blockers are resolved.**

---

**END OF DIAGNOSTIC**

*No implementation until:*
1. *Official Kaspi documentation obtained*
2. *Webhook authentication mechanism clarified*
3. *Explicit GO from Architect*
