---
Status: ACCEPTED
Created: 2026-02-08
Author: Cursor AI
Type: INFORMATIVE
Scope: Beta Launch — SOFT_BETA_STRICT Readiness Delta
---

# SOFT_BETA_STRICT — Delta Report

> **Read-only codebase audit.** No code was modified.
>
> **Target mode: SOFT_BETA_STRICT**
> - Paywall enforcement IS executed (no early returns, no bypass).
> - Paywall UI IS shown to the user.
> - User must explicitly confirm ("Continue").
> - After confirmation: system auto-grants exactly one credit (source='system'),
>   the credit is immediately consumed via standard production path.
> - Event creation continues through unmodified production code.

---

## FORBIDDEN Approaches

The following are **explicitly prohibited** under SOFT_BETA_STRICT:

| ID | Approach | Why Forbidden |
|----|----------|---------------|
| F-1 | Early return in `enforceEventPublish()` | Skips enforcement entirely; paywall never shown |
| F-2 | Early return in `enforceClubAction()` | Same: bypasses billing checks |
| F-3 | `PAYWALL_MODE=disabled` with enforcement bypass | Produces SOFT_BETA_LIGHT, not STRICT |
| F-4 | Hardcoded `hasAvailableCredit() → true` | Fakes credit existence; violates billing invariants |
| F-5 | Removing PaywallError throw sites | Destroys production enforcement |
| F-6 | Granting credit without `billing_transactions` record | Violates FK constraint: `billing_credits.source_transaction_id NOT NULL` |
| F-7 | Creating credit with `consumed_event_id` before event exists | Violates `chk_billing_credits_consumed_state` |
| F-8 | Auto-consuming credit without user confirmation | Violates SOFT_BETA_STRICT requirement: "User must explicitly confirm" |

---

## 1. Paywall Enforcement Flow

### 1.1 Current Enforcement Path (Personal Event, 16–500 participants, no credit)

```
accessControl.ts : enforceEventPublish()
│
├── Line 472: maxParticipants > entitlements.maxEventParticipants (free limit = 15)
│   → Falls through to Decision 3–5 block
│
├── Line 497: const creditAvailable = await hasAvailableCredit(userId, "EVENT_UPGRADE_500")
│   → Returns FALSE (user has no credit)
│
└── Line 499–523: throw new PaywallError({
        reason: "PUBLISH_REQUIRES_PAYMENT",
        options: [
          { type: "ONE_OFF_CREDIT", productCode: "EVENT_UPGRADE_500", price, currencyCode, provider },
          { type: "CLUB_ACCESS", recommendedPlanId: "club_50" }
        ]
    })
```

**This flow is CORRECT for SOFT_BETA_STRICT.** The 402 must fire exactly as-is.

### 1.2 Current Enforcement Path (Personal Event, 16–500, WITH credit, no confirm)

```
accessControl.ts : enforceEventPublish()
│
├── Line 497: creditAvailable → TRUE
│
└── Line 526–546: !confirmCredit
    → throw new CreditConfirmationRequiredError({
        code: "CREDIT_CONFIRMATION_REQUIRED",
        meta: { creditCode: "EVENT_UPGRADE_500", eventId, requestedParticipants }
      })
```

**This flow is CORRECT for SOFT_BETA_STRICT.** The 409 must fire once credit exists.

### 1.3 Current Enforcement Path (Personal Event, 16–500, WITH credit, WITH confirm)

```
accessControl.ts : enforceEventPublish()
│
├── Line 497: creditAvailable → TRUE
├── Line 526: confirmCredit → TRUE → skip
│
└── Line 555–560: log + return (credit consumption deferred to transaction wrapper)
    → events.ts : createEvent() : shouldUseCredit = true
    → creditTransaction.ts : executeWithCreditTransaction()
    → billingCreditsRepo.ts : consumeCredit()
```

**This flow is CORRECT for SOFT_BETA_STRICT.** Standard consumption, unmodified.

### 1.4 Enforcement Points — NO Early Returns or Bypasses Exist

Verified: `enforceEventPublish()` (lines 283–565) contains NO early returns that would prevent the paywall from firing for personal events above free limit. All returns are legitimate:

| Line | Condition | Legitimate? |
|------|-----------|-------------|
| 383 | `return` after club event checks pass | ✅ Club path, not personal |
| 441 | `return` if event already has consumed credit (edit within limit) | ✅ Already paid |
| 474 | `return` if within free limits | ✅ No paywall needed |
| 560 | `return` (implicit) after credit confirmed | ✅ Credit will be consumed |

**Verdict: Enforcement logic requires NO modifications for SOFT_BETA_STRICT.**

### 1.5 Gap: Missing Auto-Grant Between 402 and Resubmit

The SOFT_BETA_STRICT target flow is:

```
CURRENT:  402 PUBLISH_REQUIRES_PAYMENT → PaywallModal → [user must pay] → credit created → resubmit
TARGET:   402 PUBLISH_REQUIRES_PAYMENT → PaywallModal → [user clicks "Continue"] → system auto-grant → resubmit with confirm_credit=1
```

**Gap: No mechanism exists to grant a system credit between the 402 and the resubmit.**

The grant must:
1. Create `billing_transactions` record (FK requirement)
2. Create `billing_credits` record with `source='system'`
3. Return control to the frontend for resubmit

---

## 2. Confirmation Contract

### 2.1 How `confirm_credit` Is Passed (Current)

| Step | File : Line | Mechanism |
|------|-------------|-----------|
| UI constructs URL | `create-event-client.tsx:93` | `options?.confirmCredit ? "/api/events?confirm_credit=1" : "/api/events"` |
| API extracts param | `app/api/events/route.ts:108` | `url.searchParams.get("confirm_credit") === "1"` |
| API passes to service | `app/api/events/route.ts:111` | `createEvent(payload, currentUser, confirmCredit)` |
| Service passes to enforcement | `events.ts:470` | `enforceEventPublish(params, confirmCredit)` |
| Enforcement uses param | `accessControl.ts:526` | `if (!confirmCredit)` → throw 409 or allow |

**This chain is fully functional and requires NO modification.**

### 2.2 How Confirmation Callback Works (Current)

```
create-event-client.tsx : lines 174–183

const { handleError } = useHandleApiError({
  clubId: currentClubIdRef.current ?? undefined,
  onConfirmCredit: async () => {
    if (lastSubmitPayloadRef.current) {
      await submitEvent(lastSubmitPayloadRef.current, { confirmCredit: true });
    }
  },
});
```

When a 409 is received:
1. `handleApiError.ts:81` detects 409 → calls `openCreditConfirmation(details, onConfirmCredit)`
2. `BillingModalContext.tsx:102` stores callback
3. `BillingModalHost.tsx:64` renders `CreditConfirmationModal` with callback
4. User clicks "Confirm" → `onConfirmCredit()` → `submitEvent(payload, { confirmCredit: true })`
5. Resubmit goes to `POST /api/events?confirm_credit=1`

**This chain is fully functional and requires NO modification for the second pass.**

### 2.3 Gap: No Auto-Grant in the Confirmation Path

The 409 path assumes the credit ALREADY EXISTS. In SOFT_BETA_STRICT, the credit does NOT exist at first submission time. The target sequence is:

```
Pass 1: POST /api/events → 402 (no credit)
        → PaywallModal shows
        → User clicks beta "Continue" CTA
        → [SYSTEM AUTO-GRANT HAPPENS HERE]
Pass 2: POST /api/events?confirm_credit=1
        → enforceEventPublish() → finds system-granted credit → confirmCredit=true → allows
        → executeWithCreditTransaction() → consumeCredit() → event saved
```

**Gap: The PaywallModal currently has NO CTA that triggers auto-grant + resubmit. See §4.1.**

### 2.4 Resubmit after auto-grant — Can It Skip the 409 Step?

YES. If the frontend calls the auto-grant endpoint and then immediately resubmits with `confirm_credit=1`, the enforcement flow is:

```
Line 497: hasAvailableCredit() → TRUE (system-granted credit exists)
Line 526: confirmCredit → TRUE (query param set)
→ Allows through → credit consumed via standard path
```

The 409 step is SKIPPED because `confirmCredit=true` on the first pass after grant. This is valid behavior — the user already confirmed intent in the PaywallModal.

---

## 3. Billing Credit Handling

### 3.1 Current Behavior When Credit Is Missing

File: `accessControl.ts` : lines 497–523

```
hasAvailableCredit(userId, "EVENT_UPGRADE_500") → false
→ throw PaywallError 402 PUBLISH_REQUIRES_PAYMENT
```

**Correct for SOFT_BETA_STRICT.** The 402 must fire.

### 3.2 Where System Auto-Grant Must Be Injected

The auto-grant must happen BETWEEN the 402 response and the resubmit. It is NOT inside `accessControl.ts`.

**Required injection point: A new server-side endpoint or service function.**

The auto-grant must follow the admin-grant pattern from `adminGrantOneOffCredit.ts`:

| Step | Admin Grant (existing) | System Auto-Grant (needed) |
|------|------------------------|---------------------------|
| 1. Create transaction | `createAdminTransaction()` → `billing_transactions` with `provider='admin-grant'`, `amount=0`, `status='completed'` | New: `billing_transactions` with `provider='system-beta-grant'`, `amount=0`, `status='completed'` |
| 2. Create credit | `createAdminCredit()` → `billing_credits` with `source='admin'` | New: `billing_credits` with `source='system'` |
| 3. Audit | `admin_audit_log` entry | Optional: structured log (no admin context) |

**Required files for auto-grant service:**

| # | Action | File | Reason |
|---|--------|------|--------|
| 1 | CREATE or MODIFY | Service function for system credit grant | Must create transaction + credit atomically |
| 2 | CREATE | API endpoint (e.g., `POST /api/billing/beta-grant`) | Frontend needs to call this between 402 and resubmit |

### 3.3 `source='system'` — DB and Type Support

**DB support: READY**

```sql
-- billing_credits CHECK constraint (migration 20260202):
CHECK (source IN ('user', 'admin', 'system'))

-- Index exists:
idx_billing_credits_source ON billing_credits(source)
```

**TypeScript support: READY**

```typescript
// src/lib/types/billing.ts : line 225
export const CREDIT_SOURCES = ["user", "admin", "system"] as const;
export type CreditSource = typeof CREDIT_SOURCES[number];
```

**Code usage: ZERO instances of `source='system'`**

```
grep source.*=.*['"]system['"] → 0 results in src/
```

**Verdict: `source='system'` is typed, constrained, indexed. READY for use.**

### 3.4 `createBillingCredit()` — Cannot Accept `source` Parameter

Current signature (`billingCreditsRepo.ts:26–30`):

```typescript
export async function createBillingCredit(data: {
  userId: string;
  creditCode: CreditCode;
  sourceTransactionId: string;
}): Promise<BillingCredit>
```

INSERT at lines 35–39 omits `source` field → DB applies default `'user'`.

**REQUIRED change:** Either:
- (A) Add `source?: CreditSource` to `createBillingCredit()` params (backward-compatible), OR
- (B) Create a separate `createSystemCredit()` function following `createAdminCredit()` pattern

Option (A) is minimal and preserves the single canonical function.
Option (B) follows the existing admin precedent (`adminGrantOneOffCredit.ts:157`).

### 3.5 `billing_credits.source_transaction_id` — NOT NULL FK Constraint

```sql
source_transaction_id UUID NOT NULL REFERENCES billing_transactions(id) ON DELETE CASCADE
```

**System auto-grant MUST create a `billing_transactions` record first.** This is identical to the admin-grant pattern (`adminGrantOneOffCredit.ts:118–151`), which creates a `billing_transactions` record with `amount=0`, `provider='admin-grant'`, `status='completed'`.

### 3.6 Credit Consumption — Uses Standard Mechanisms

Once the system-granted credit exists with `status='available'`, the standard production path handles consumption:

```
enforceEventPublish() : line 497 → hasAvailableCredit() → TRUE
→ confirmCredit=true → allows
→ events.ts : shouldUseCredit = true
→ creditTransaction.ts : executeWithCreditTransaction()
  → eventRepo.createEvent() [event created FIRST]
  → billingCreditsRepo.consumeCredit() [credit bound to event]
```

**No modification needed.** The system-granted credit is consumed identically to a user-purchased credit.

### 3.7 Billing Invariants — Full Compliance

| Invariant | Satisfied? | Mechanism |
|-----------|------------|-----------|
| Credit has `source_transaction_id` | ✅ | System grant creates transaction first |
| Credit `status='available'` at creation | ✅ | Same as admin/user flow |
| `consumed_event_id` NULL at creation | ✅ | Set only during `consumeCredit()` |
| `consumed_event_id` NOT NULL when consumed | ✅ | `chk_billing_credits_consumed_state` enforced by DB |
| Credit consumed AFTER event exists | ✅ | `executeWithCreditTransaction()` creates event first |
| Rollback on failure | ✅ | `deleteEventForRollback()` in transaction wrapper |

---

## 4. UI Flow Compatibility

### 4.1 PaywallModal — Current CTA Options

File: `paywall-modal.tsx` : lines 126–171

When `PaywallModal` opens after a 402, it shows:

| Option | Type | Action |
|--------|------|--------|
| "Разовая оплата" | `ONE_OFF_CREDIT` | Calls `POST /api/billing/purchase-intent` → payment flow |
| "Подписка клуба" | `CLUB_ACCESS` | Navigates to `/pricing` |
| "Отмена" | — | Closes modal (explicit abort) |

**Gap: NO "Continue" / "Продолжить" / beta CTA exists.**

The PaywallModal must be extended with a third CTA that:
1. Calls the system auto-grant endpoint
2. On success, resubmits the event creation with `confirm_credit=1`
3. On failure, shows error state in modal

**REQUIRED change to PaywallModal:**
- New CTA button (visible only when `PAYWALL_MODE=soft_beta_strict`)
- CTA calls auto-grant endpoint
- On success, triggers resubmit via existing `onConfirmCredit` pattern

### 4.2 CreditConfirmationModal — NOT Needed in SOFT_BETA_STRICT Flow

The 409 → `CreditConfirmationModal` step can be SKIPPED if the frontend resubmits with `confirm_credit=1` directly after auto-grant. The user already confirmed intent by clicking "Continue" in the PaywallModal.

**CreditConfirmationModal requires NO modification.**

### 4.3 Error Handling Chain — Fully Functional

| Component | File | SOFT_BETA_STRICT Impact |
|-----------|------|-------------------------|
| `handleApiErrorCore()` | `handleApiError.ts:57–118` | No change needed. Detects 402 → opens paywall. |
| `useHandleApiError()` | `useHandleApiError.ts:65–92` | No change needed. Connects to context. |
| `BillingModalContext` | `BillingModalContext.tsx:80–138` | No change needed. State management works. |
| `BillingModalHost` | `BillingModalHost.tsx:36–71` | No change needed. Renders modals. |

### 4.4 UI Logic That Could Suppress Paywall

Verified: **No suppression logic exists.** The chain is:

```
error thrown → catch → handleError() → isPaywallApiError() → openPaywall()
```

There are no conditionals that check a mode or flag before opening the paywall. The modal always opens on 402.

### 4.5 `create-event-client.tsx` — Resubmit Mechanism

File: `create-event-client.tsx` : lines 174–183

The `onConfirmCredit` callback already exists and resubmits with `confirm_credit=1`:

```typescript
onConfirmCredit: async () => {
  if (lastSubmitPayloadRef.current) {
    await submitEvent(lastSubmitPayloadRef.current, { confirmCredit: true });
  }
},
```

**Gap:** This callback is currently wired only to `CreditConfirmationModal` (409 path). For SOFT_BETA_STRICT, the PaywallModal "Continue" CTA must:
1. Call auto-grant endpoint
2. Then call a similar resubmit callback

**REQUIRED:** The PaywallModal needs access to a resubmit callback. Options:
- (A) Extend `BillingModalContext` to pass a resubmit callback alongside paywall details
- (B) PaywallModal emits an event/callback when "Continue" is clicked, handled by the page

The same resubmit pattern already works in `edit-event-client.tsx:145`:

```typescript
// src/app/(app)/events/[id]/edit/edit-event-client.tsx
onConfirmCredit: async () => {
  if (lastSubmitPayloadRef.current) {
    await submitEvent(lastSubmitPayloadRef.current, { confirmCredit: true });
  }
},
```

---

## 5. Configuration & Feature Flags

### 5.1 `PAYWALL_MODE` — Does Not Exist

`PAYWALL_MODE` is not defined anywhere in the codebase. The only reference is in `docs/audits/BETA_PAYWALL_PREFLIGHT_ANALYSIS.md`.

### 5.2 Required Configuration

| Element | Value |
|---------|-------|
| Env var | `PAYWALL_MODE` (server-only) |
| Type | `'enabled' \| 'soft_beta_strict'` |
| Default | `'enabled'` (standard production behavior) |
| Config file | `src/lib/config/paywall.ts` (new) |
| Pattern | Follows `PAYMENT_PROVIDER_MODE` in `src/lib/payments/providers/paymentProvider.ts:139` |

### 5.3 Where `PAYWALL_MODE` Must Be Read

| # | Location | Purpose |
|---|----------|---------|
| 1 | `src/lib/config/paywall.ts` (new) | Config module: `getPaywallMode()`, `isSoftBetaStrict()` |
| 2 | Auto-grant endpoint (new) | Validate that system grants are only allowed in `soft_beta_strict` mode |
| 3 | `PaywallModal` (UI) | Conditionally show "Continue" CTA only in `soft_beta_strict` mode |

**Note:** `PAYWALL_MODE` is NOT read by `enforceEventPublish()` or `enforceClubAction()`. Enforcement runs identically in ALL modes. The mode only affects:
- Whether the "Continue" CTA is visible in PaywallModal
- Whether the auto-grant endpoint accepts requests

### 5.4 How Mode Reaches the Frontend

Since `PAYWALL_MODE` is server-only (no `NEXT_PUBLIC_` prefix), the mode must reach the frontend via one of:
- (A) Server component passes it as prop to client component
- (B) API endpoint returns it (e.g., `GET /api/config` or inline in paywall error response)
- (C) Paywall error `options[]` includes a beta-specific option type

Option (C) is architecturally cleanest: `enforceEventPublish()` includes a `BETA_CONTINUE` option in the PaywallError response when `isSoftBetaStrict()` is true. This:
- Requires only the enforcement function to know the mode
- PaywallModal renders the CTA based on option type (already has option-based rendering)
- No new API endpoint for config needed
- Server-only env var stays server-only

### 5.5 Can SOFT_BETA_STRICT Be Enabled Without New Paywall Implementation?

**NO.** The existing PaywallModal does not have:
- A "Continue" CTA
- An auto-grant call
- A resubmit-after-grant callback

However, the changes are ADDITIVE:
- New CTA button in existing modal
- New option type in existing options array
- New callback in existing context

The existing paywall implementation is NOT replaced. It is EXTENDED.

---

## 6. Documentation Impact

### 6.1 `BETA_TEMPORARY_GATES_AND_DEVIATIONS.md` — Required Entries

The document is currently a blank template. The following entries must be added:

#### Section 3 — Temporary Feature Gates

**3.1 Paywall "Continue" CTA (SOFT_BETA_STRICT)**

| Field | Value |
|-------|-------|
| Status | SOFT MODE |
| Area | UI, Backend, Billing |
| What changed | PaywallModal shows a "Continue" CTA when `PAYWALL_MODE=soft_beta_strict`. Clicking it triggers system auto-grant of one EVENT_UPGRADE_500 credit (source='system'), then resubmits event creation with `confirm_credit=1`. |
| Original behavior | PaywallModal shows only "Pay" and "Upgrade" options. No free continuation path. |
| Reason for beta gate | Beta validates core product value, not monetization (PRODUCT_VISION §6, BETA_SCOPE §4). Paywall must be visible to establish pricing awareness, but must not block trip creation — the primary beta action. |
| Restoration condition | Post-beta decision to proceed to monetization (BETA_SCOPE §8). |
| Post-beta action | Remove "Continue" CTA. Remove auto-grant endpoint. Set `PAYWALL_MODE=enabled`. |

**3.2 System Auto-Grant Endpoint**

| Field | Value |
|-------|-------|
| Status | LIMITED |
| Area | Backend, API |
| What changed | New endpoint grants exactly one billing credit with `source='system'` without payment. Protected by `PAYWALL_MODE=soft_beta_strict` check. |
| Original behavior | Credits are only created after completed payment or admin grant. |
| Reason for beta gate | Required to enable SOFT_BETA_STRICT flow: paywall shown → user confirms → credit granted → event created. |
| Restoration condition | Post-beta monetization decision. |
| Post-beta action | Remove endpoint or disable via `PAYWALL_MODE=enabled`. |

#### Section 4 — Temporary Behavior Deviations

**4.1 Billing Enforcement Runs But Does Not Block**

| Field | Value |
|-------|-------|
| Status | SOFTENED |
| Affected flow | Personal event creation with >15 participants |
| Beta behavior | Enforcement runs fully. PaywallError 402 fires. PaywallModal shown. But user can click "Continue" to proceed without payment. |
| Original behavior | User must purchase credit or upgrade to club plan. No free continuation. |
| Reason for deviation | Beta is not a monetization phase (BETA_SCOPE §4). The paywall display establishes pricing awareness and tests user perception without blocking the core flow. |
| Restoration condition | Post-beta monetization decision. |

**4.2 System Credits Granted Without Payment**

| Field | Value |
|-------|-------|
| Status | MODIFIED |
| Affected flow | Personal event creation with 16–500 participants |
| Beta behavior | Credits created with `source='system'`, `amount=0` transaction. Consumed via standard production path. |
| Original behavior | Credits created only after `billing_transactions.status='completed'` with real payment. |
| Reason for deviation | Decouples billing visibility from billing enforcement for beta validation. |
| Restoration condition | Post-beta: remove system grant path. |

#### Section 6 — Temporary Limit Relaxations

**6.1 Event Participant Limit (Free Plan)**

| Field | Value |
|-------|-------|
| Limit type | Capacity |
| Beta behavior | Free limit (15) is ENFORCED — paywall fires. But user can bypass via "Continue" CTA (system auto-grant). |
| Original behavior | Free limit (15) is enforced and blocks creation without payment. |
| Reason | Beta must show the paywall to test pricing perception, but must not prevent trip creation. |
| Restoration condition | Post-beta: remove "Continue" CTA. |

#### Section 7 — Beta-Only Instrumentation

**7.1 `PAYWALL_MODE` Environment Variable**

| Field | Value |
|-------|-------|
| Type | Feature flag |
| Purpose | Enables SOFT_BETA_STRICT: paywall shown + system auto-grant path |
| Scope | PaywallModal CTA visibility, auto-grant endpoint authorization |
| Removal condition | Post-beta: set to `enabled` or remove |

**7.2 `billing_credits.source='system'` Marker**

| Field | Value |
|-------|-------|
| Type | Analytics / audit marker |
| Purpose | Distinguishes beta-granted credits from user-purchased and admin-granted |
| Scope | All credits created via auto-grant in SOFT_BETA_STRICT mode |
| Removal condition | Permanent — useful for post-beta analysis. Data stays in DB. |

**7.3 `billing_transactions.provider='system-beta-grant'` Marker**

| Field | Value |
|-------|-------|
| Type | Analytics / audit marker |
| Purpose | Identifies transactions created by system auto-grant (non-financial, amount=0) |
| Scope | All transactions created during beta auto-grant |
| Removal condition | Permanent — useful for post-beta analysis. |

### 6.2 Previous SOFT_BETA_LIGHT Entries — Incorrect Under SOFT_BETA_STRICT

The following entries from the previous delta report (`BETA_SOFT_MODE_DELTA_REPORT.md`) are **INCORRECT** under SOFT_BETA_STRICT:

| Previous Entry | Why Incorrect |
|----------------|---------------|
| "3.1 Paywall enforcement (`enforceEventPublish`) — DISABLED" | Enforcement MUST run. NOT disabled. |
| "3.2 Paywall enforcement (`enforceClubAction`) — DISABLED" | Enforcement MUST run. NOT disabled. |
| "4.1 Free plan limits not enforced" | Limits ARE enforced. Paywall fires. User can bypass via "Continue". |
| "4.3 Credit consumption flow bypassed" | Consumption IS NOT bypassed. Standard path used. |
| "6.1 `max_event_participants` — Not enforced" | IS enforced. Just not blocking due to "Continue" CTA. |

---

## 7. Readiness Summary

### REQUIRED Changes

| # | Change | Type | Files | Effort |
|---|--------|------|-------|--------|
| 1 | Create `src/lib/config/paywall.ts` | NEW FILE | 1 file | Small |
| 2 | Create system auto-grant service function | NEW FILE or MODIFY | `src/lib/services/` or `src/lib/billing/` | Medium |
| 3 | Create auto-grant API endpoint | NEW FILE | `src/app/api/billing/beta-grant/route.ts` or similar | Medium |
| 4 | Extend `createBillingCredit()` with optional `source` param | MODIFY | `src/lib/db/billingCreditsRepo.ts:26–40` | Small |
| 5 | Add "Continue" CTA to PaywallModal (mode-conditional) | MODIFY | `src/components/billing/paywall-modal.tsx` | Medium |
| 6 | Wire resubmit callback to PaywallModal | MODIFY | `BillingModalContext.tsx` + `create-event-client.tsx` + `edit-event-client.tsx` | Medium |
| 7 | Add `PAYWALL_MODE` to `.env.example` | MODIFY | `.env.example` | Trivial |
| 8 | OR: Add beta option type to PaywallError options | MODIFY | `accessControl.ts:509` (inside PUBLISH_REQUIRES_PAYMENT) | Small |
| 9 | Populate `BETA_TEMPORARY_GATES_AND_DEVIATIONS.md` | MODIFY | `docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md` | Medium |

### What Requires NO Modification

| Component | File | Reason |
|-----------|------|--------|
| `enforceEventPublish()` enforcement logic | `accessControl.ts:283–565` | Runs as-is. No bypass needed. |
| `enforceClubAction()` enforcement logic | `accessControl.ts:43–87` | Runs as-is. |
| `CreditConfirmationModal` | `credit-confirmation-modal.tsx` | Not triggered in SOFT_BETA_STRICT (skipped via confirm_credit=1) |
| `consumeCredit()` | `billingCreditsRepo.ts:155–232` | Standard consumption. Works with system credits. |
| `executeWithCreditTransaction()` | `creditTransaction.ts` | Standard transaction wrapper. Unchanged. |
| `hasAvailableCredit()` | `billingCreditsRepo.ts:241–260` | Finds system-granted credits by status='available'. |
| `handleApiErrorCore()` | `handleApiError.ts:57–118` | Detects 402/409 correctly. |
| `BillingModalHost` | `BillingModalHost.tsx` | Renders modals. No change. |
| `submitEvent()` with `confirm_credit=1` | `create-event-client.tsx:89–172` | Resubmit mechanism works. |
| API route `confirm_credit` extraction | `app/api/events/route.ts:108` | Query param handling works. |
| DB constraints | `chk_billing_credits_consumed_state` | Fully satisfied by standard consumption path |

### Overall Verdict

| Check | Status |
|-------|--------|
| Enforcement flow (no bypass) | ✅ READY — runs unmodified |
| Confirmation contract (`confirm_credit`) | ✅ READY — fully functional |
| `source='system'` DB + type support | ✅ READY |
| `createBillingCredit()` accepts `source` | ❌ NOT READY — param missing |
| System auto-grant service | ❌ NOT READY — does not exist |
| System auto-grant API endpoint | ❌ NOT READY — does not exist |
| PaywallModal "Continue" CTA | ❌ NOT READY — no beta CTA |
| PaywallModal resubmit callback | ❌ NOT READY — not wired |
| `PAYWALL_MODE` config | ❌ NOT READY — does not exist |
| `BETA_TEMPORARY_GATES_AND_DEVIATIONS.md` | ❌ NOT READY — blank template |

**6 gaps must be closed. All are additive. Zero destruction of existing production code.**

---

## Cross-References

| Topic | Document |
|-------|----------|
| Preflight analysis | `docs/audits/BETA_PAYWALL_PREFLIGHT_ANALYSIS.md` |
| Previous (incorrect) LIGHT delta | `docs/audits/BETA_SOFT_MODE_DELTA_REPORT.md` |
| Product vision | `docs/product/PRODUCT_VISION_AND_HYPOTHESES.md` |
| Beta scope | `docs/product/BETA_SCOPE_AND_SUCCESS_METRICS.md` |
| Beta gates template | `docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md` |
| Architecture rules | `docs/ssot/SSOT_ARCHITECTURE.md` |
| Billing system | `docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md` |
| Admin grant pattern | `src/lib/billing/admin/adminGrantOneOffCredit.ts` |
| DB schema | `docs/ssot/SSOT_DATABASE.md` § 10 (billing_credits) |
