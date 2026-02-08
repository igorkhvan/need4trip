---
Status: ACCEPTED
Created: 2026-02-08
Author: Cursor AI
Type: INFORMATIVE
Scope: Beta Launch — SOFT_BETA Readiness Delta
---

# SOFT_BETA Readiness — Delta Report

> **Read-only codebase audit.** No code was modified.  
> Compares current codebase state against target SOFT_BETA behavior defined in:
> - `docs/audits/BETA_PAYWALL_PREFLIGHT_ANALYSIS.md`
> - `docs/product/PRODUCT_VISION_AND_HYPOTHESES.md`
> - `docs/product/BETA_SCOPE_AND_SUCCESS_METRICS.md`

---

## 1. Paywall Mode

### 1.1 Does `PAYWALL_MODE` exist?

**NO.** `PAYWALL_MODE` does not exist anywhere in the codebase.

Evidence:
- `grep PAYWALL_MODE` across all source files returns **zero** results (only the preflight analysis doc references it).
- `src/lib/config/` contains only `protected-routes.ts` and `rateLimits.ts` — no paywall config.
- No env var `PAYWALL_MODE` in `.env.example`, `.env.test`, or `.env.local`.

**Verdict:** NOT READY — must be introduced.

### 1.2 Exact files where `PAYWALL_MODE` must be introduced

Following the `PAYMENT_PROVIDER_MODE` pattern from `src/lib/payments/providers/paymentProvider.ts`:

| # | Action | File | Description |
|---|--------|------|-------------|
| 1 | **CREATE** | `src/lib/config/paywall.ts` | Config module: `PaywallMode` type, `getPaywallMode()`, `isPaywallEnforced()` |
| 2 | **MODIFY** | `src/lib/services/accessControl.ts` : line 51 | Add early return at top of `enforceClubAction()` |
| 3 | **MODIFY** | `src/lib/services/accessControl.ts` : line 289 | Add early return at top of `enforceEventPublish()` |
| 4 | **MODIFY** | `.env.example` | Add `# PAYWALL_MODE=enabled\|disabled (default: enabled)` |
| 5 | **SET** | `.env.local` / Vercel env | Set `PAYWALL_MODE=disabled` for beta |

### 1.3 Reference pattern (`PAYMENT_PROVIDER_MODE`)

```
src/lib/payments/providers/paymentProvider.ts
├── line 139: type PaymentProviderMode = 'stub' | 'simulated'
├── line 163: function getPaymentProviderMode(): PaymentProviderMode
├── line 164:   const mode = process.env.PAYMENT_PROVIDER_MODE
├── line 165:   const isProduction = process.env.NODE_ENV === 'production'
├── line 167:   if (mode === 'simulated') { ... safety guard ... }
└── line 176:   return 'stub'  // default
```

Target config module should mirror this pattern exactly:
- Server-only (`import 'server-only'` or used only in server modules)
- Type-safe enum
- Default = `'enabled'` (safe production default)
- No production safety guard needed (unlike simulated payments, disabled paywall is intentional for beta)

---

## 2. Enforcement Gaps

### 2.1 `enforceEventPublish()` — exact branches

File: `src/lib/services/accessControl.ts`

#### Branch: `PUBLISH_REQUIRES_PAYMENT` (402)

```
Line 497:  const creditAvailable = await hasAvailableCredit(userId, "EVENT_UPGRADE_500");
Line 499:  if (!creditAvailable) {
Line 501:    throw new PaywallError({
              reason: "PUBLISH_REQUIRES_PAYMENT",
              ...
              options: [
                { type: "ONE_OFF_CREDIT", productCode: "EVENT_UPGRADE_500", ... },
                { type: "CLUB_ACCESS", recommendedPlanId: "club_50" },
              ],
            });
Line 523:  }
```

**Trigger condition:** Personal event, 16–500 participants, user has NO available credit.

#### Branch: `CreditConfirmationRequiredError` (409)

```
Line 526:  if (!confirmCredit) {
Line 528:    const errorPayload: CreditConfirmationPayload = { ... };
Line 546:    throw new CreditConfirmationRequiredError(errorPayload);
Line 547:  }
```

**Trigger condition:** Personal event, 16–500 participants, user HAS credit, but `confirmCredit=false`.

### 2.2 Where system auto-grant must be injected

For SOFT_BETA behavior (paywall disabled), the early return must be placed **BEFORE** any enforcement logic:

**Primary — `enforceEventPublish()`:**

```
src/lib/services/accessControl.ts : line 289
(immediately after params destructuring at line 290)
```

Insert point:
```
Line 290:  const { userId, clubId, maxParticipants, isPaid, eventId } = params;
>>> INSERT HERE: if (!isPaywallEnforced()) { return; }
Line 292:  // CLUB EVENTS BRANCH
```

This bypasses ALL 12 PaywallError throw sites and the CreditConfirmationRequiredError (409) within `enforceEventPublish()`.

**Secondary — `enforceClubAction()`:**

```
src/lib/services/accessControl.ts : line 51
(immediately after params destructuring at line 52)
```

Insert point:
```
Line 52:  const { clubId, action, context } = params;
>>> INSERT HERE: if (!isPaywallEnforced()) { return; }
Line 54:  // 1. Get subscription (null = Free plan)
```

This bypasses all 3 downstream throw sites (`enforceFreeLimit`, `enforcePlanLimits`, and the status check at line 77).

**Tertiary — `clubs.ts` (club creation paywall):**

```
src/lib/services/clubs.ts : line ~591
```

The `CLUB_CREATION_REQUIRES_PLAN` throw in `clubs.ts` is NOT inside `enforceClubAction()` — it's in a separate flow. This must either:
- Be bypassed independently with the same `isPaywallEnforced()` check, OR
- Be refactored to call `enforceClubAction()` (architectural preference)

**Verdict:** NOT READY — 3 injection points identified, none yet implemented.

---

## 3. Credit Source Usage

### 3.1 `source='system'` — confirmed NOT used in code

Evidence:
- `grep source.*=.*['"]system['"]` across `src/` → **zero results**
- TypeScript type includes it: `src/lib/types/billing.ts:225` → `CREDIT_SOURCES = ["user", "admin", "system"] as const`
- DB CHECK constraint allows it: `CHECK (source IN ('user', 'admin', 'system'))`
- DB index exists: `idx_billing_credits_source`

**Used values:**
- `'user'` — DB default (set when `source` is omitted in INSERT)
- `'admin'` — `src/lib/billing/admin/adminGrantOneOffCredit.ts:170` → `source: 'admin' as CreditSource`

**`'system'` is typed, constrained, indexed, but has ZERO usage in code.**

**Verdict:** READY for `source='system'` at DB + type level.

### 3.2 `createBillingCredit()` — does NOT accept `source` parameter

Current signature (`src/lib/db/billingCreditsRepo.ts:26–30`):

```typescript
export async function createBillingCredit(data: {
  userId: string;
  creditCode: CreditCode;
  sourceTransactionId: string;
}): Promise<BillingCredit>
```

The INSERT at line 35–40 does NOT include `source` field:

```typescript
.insert({
  user_id: data.userId,
  credit_code: data.creditCode,
  status: "available" as CreditStatus,
  source_transaction_id: data.sourceTransactionId,
})
```

This means:
- The DB default `'user'` is applied automatically
- There is NO way to pass `source: 'system'` through this function

**Comparison with admin flow:**
`adminGrantOneOffCredit.ts` at line 164–176 uses `getAdminDb()` directly (bypasses `createBillingCredit()`), explicitly setting `source: 'admin'`.

**Verdict:** NOT READY — `createBillingCredit()` must be extended to accept optional `source` parameter, OR a separate `createSystemCredit()` function must be created (following `createAdminCredit()` pattern).

### 3.3 Required change

Option A (minimal, preferred):
```
src/lib/db/billingCreditsRepo.ts : line 26-30
Add optional `source?: CreditSource` to the data parameter.
Default to 'user' if omitted (preserves backward compatibility).
```

Option B (separate function, mirrors admin pattern):
```
Create createSystemCredit() in billingCreditsRepo.ts,
mirroring createAdminCredit() from adminGrantOneOffCredit.ts.
```

---

## 4. UI Compatibility

### 4.1 Flow: 402 → paywall → confirm → resubmit

The existing flow is:

```
POST /api/events → 402 PaywallError
  → Frontend catches (create-event-client.tsx:113)
  → handleApiError.ts:66 → isPaywallApiError() → openPaywall()
  → BillingModalHost.tsx:49 → renders PaywallModal
  → User sees options (ONE_OFF_CREDIT, CLUB_ACCESS)
```

For credit confirmation (409):

```
POST /api/events → 409 CreditConfirmationRequiredError
  → Frontend catches (create-event-client.tsx:126)
  → handleApiError.ts:81 → isCreditConfirmationApiError() → openCreditConfirmation()
  → BillingModalHost.tsx:64 → renders CreditConfirmationModal
  → User clicks Confirm
  → create-event-client.tsx:178 → submitEvent(payload, { confirmCredit: true })
  → POST /api/events?confirm_credit=1
```

### 4.2 SOFT_BETA impact on UI

When `PAYWALL_MODE=disabled`:
- `enforceEventPublish()` returns early → **no 402 or 409 is ever thrown**
- `enforceClubAction()` returns early → **no 402 for club actions**
- Frontend 402/409 handlers exist but are **never triggered**
- `PaywallModal`, `CreditConfirmationModal` — rendered by `BillingModalHost` but **never opened**
- `usePaywall()` hook — initialized but `showPaywall()` never called
- `credit-badge.tsx` — still shows available credits count (cosmetic, no behavioral issue)

### 4.3 Do new UI components need to be built?

**NO.** The existing UI architecture is fully compatible with SOFT_BETA:

| Component | SOFT_BETA State | New code needed? |
|-----------|-----------------|------------------|
| PaywallModal | Dormant (never triggered) | ❌ No |
| CreditConfirmationModal | Dormant (never triggered) | ❌ No |
| BillingModalHost | Mounted, inactive | ❌ No |
| credit-badge.tsx | Shows "0 credits" (cosmetic) | ❌ No |
| pricing page | Accessible but purchase flow is separate | ❌ No |
| usePaywall() hook | Initialized, never fires | ❌ No |
| 402/409 handlers | Present, never invoked | ❌ No |

**Verdict:** READY — no new UI architecture required.

---

## 5. Documentation Delta

### 5.1 `BETA_TEMPORARY_GATES_AND_DEVIATIONS.md` — current state

The document is a **blank template** with placeholder sections (3.X, 4.X, 5.X, 6.X, 7.X). No concrete entries exist.

### 5.2 Exact entries that must be added

#### Section 3 — Temporary Feature Gates

**3.1 Paywall Enforcement — Event Create/Update**

| Field | Value |
|-------|-------|
| Status | DISABLED |
| Area | Billing, Backend |
| What changed | `enforceEventPublish()` returns early when `PAYWALL_MODE=disabled`. No 402 or 409 responses sent. |
| Original behavior | Enforces free limits (15 participants), credit requirements, plan limits |
| Reason | Beta validates core product value (PRODUCT_VISION §6: "Monetization follows validated value"). Paywall blocks trip creation — the primary beta action. |
| Restoration condition | Post-beta decision to proceed to monetization (BETA_SCOPE §8) |
| Post-beta action | Enable paywall, verify all 15 throw sites still work, run billing test suite |

**3.2 Paywall Enforcement — Club Actions**

| Field | Value |
|-------|-------|
| Status | DISABLED |
| Area | Billing, Backend |
| What changed | `enforceClubAction()` returns early when `PAYWALL_MODE=disabled`. Club member limits, CSV export restrictions, paid event restrictions not enforced. |
| Original behavior | Checks subscription status + plan limits for every club action |
| Reason | Clubs are "supporting role only" in beta (BETA_SCOPE §3.3). Billing friction contradicts beta goals. |
| Restoration condition | Post-beta monetization decision |
| Post-beta action | Enable enforcement, verify subscription status checks |

**3.3 Club Creation Paywall**

| Field | Value |
|-------|-------|
| Status | DISABLED |
| Area | Billing, Backend |
| What changed | `CLUB_CREATION_REQUIRES_PLAN` PaywallError in `clubs.ts:~591` is bypassed |
| Original behavior | Club creation requires paid plan (except first club) |
| Reason | Clubs must not introduce additional cognitive load (BETA_SCOPE §3.3) |
| Restoration condition | Post-beta monetization decision |
| Post-beta action | Re-enable plan requirement for club creation |

#### Section 4 — Temporary Behavior Deviations

**4.1 Free Plan Limits Not Enforced**

| Field | Value |
|-------|-------|
| Status | SOFTENED |
| Affected flow | Event create/update (personal events) |
| Beta behavior | Events with >15 participants allowed without credit or subscription |
| Original behavior | Free plan enforces `max_event_participants=15` |
| Reason | Beta must allow real trips with real participant counts. Enforcing limits distorts activation rate metric (BETA_SCOPE §5.1). |
| Restoration condition | Beta completion + monetization decision |

**4.2 Credit Consumption Bypassed**

| Field | Value |
|-------|-------|
| Status | SOFTENED |
| Affected flow | Personal events with 16–500 participants |
| Beta behavior | No credit required; `confirm_credit` flow never triggered |
| Original behavior | User must purchase EVENT_UPGRADE_500 credit, confirm consumption via 409→confirm→resubmit flow |
| Reason | Beta is not a monetization phase (BETA_SCOPE §4: "monetization and payments" explicitly out of scope) |
| Restoration condition | Post-beta decision to enable payments |

#### Section 6 — Temporary Limit Relaxations

**6.1 Event Participant Limits**

| Field | Value |
|-------|-------|
| Limit type | Capacity |
| Beta behavior | No enforcement of `max_event_participants` from any plan |
| Original behavior | Free: 15, Club 50: 50, Club 500: 500, Unlimited: ∞ |
| Reason | Enforcing limits distorts beta participation level metric (BETA_SCOPE §5.2) |
| Restoration condition | Post-beta monetization phase |

**6.2 Club Member Limits**

| Field | Value |
|-------|-------|
| Limit type | Capacity |
| Beta behavior | No enforcement of `max_members` from any plan |
| Original behavior | Club 50: 50, Club 500: 500, Unlimited: ∞ |
| Reason | Clubs support repeat trips in beta — member limits block this |
| Restoration condition | Post-beta monetization phase |

**6.3 Paid Events / CSV Export Feature Gates**

| Field | Value |
|-------|-------|
| Limit type | Subscription |
| Beta behavior | `allow_paid_events` and `allow_csv_export` not enforced |
| Original behavior | Only plans with flags = true can use these features |
| Reason | Feature gates block organizer workflows during beta |
| Restoration condition | Post-beta monetization phase |

#### Section 7 — Beta-Only Instrumentation

**7.1 PAYWALL_MODE Environment Variable**

| Field | Value |
|-------|-------|
| Type | Feature flag |
| Purpose | Global toggle to disable paywall enforcement |
| Scope | `enforceEventPublish()`, `enforceClubAction()`, club creation paywall |
| Removal condition | Post-beta: remove or promote to permanent config |

**7.2 Enforcement Bypass Logging**

| Field | Value |
|-------|-------|
| Type | Log |
| Purpose | Track how often enforcement would have triggered (shadow mode data) |
| Scope | All enforceEventPublish() and enforceClubAction() calls |
| Removal condition | Post-beta: remove when paywall re-enabled |

---

## 6. Readiness Summary

| Check | Status | Details |
|-------|--------|---------|
| 1. `PAYWALL_MODE` env var | **NOT READY** | Does not exist. Must create `src/lib/config/paywall.ts` + modify `accessControl.ts` + `.env.example` |
| 2a. `PUBLISH_REQUIRES_PAYMENT` branch identified | **READY** | Line 499–523 in `accessControl.ts` |
| 2b. `CreditConfirmationRequiredError` branch identified | **READY** | Line 526–547 in `accessControl.ts` |
| 2c. Auto-grant injection points | **NOT READY** | 3 points identified, zero implemented |
| 3a. `source='system'` not used in code | **READY** | Confirmed: zero usage. DB + type support exists. |
| 3b. `createBillingCredit()` accepts `source` | **NOT READY** | Function signature lacks `source` param. Must extend or create `createSystemCredit()`. |
| 4. UI flow reusable without new architecture | **READY** | All modals dormant when paywall disabled. No new UI needed. |
| 5. `BETA_TEMPORARY_GATES_AND_DEVIATIONS.md` | **NOT READY** | Document is blank template. 10 concrete entries identified above. |

### Overall Verdict

**NOT READY for execution — 4 gaps must be closed:**

| # | Gap | Effort | Files |
|---|-----|--------|-------|
| 1 | Create `src/lib/config/paywall.ts` | Small | 1 new file |
| 2 | Add early returns in `accessControl.ts` | Small | 2 insertion points (lines ~290, ~52) |
| 3 | Handle club creation paywall in `clubs.ts` | Small | 1 insertion point (line ~591) |
| 4 | Extend `createBillingCredit()` with optional `source` param | Small | 1 file (`billingCreditsRepo.ts:26-40`) |
| 5 | Populate `BETA_TEMPORARY_GATES_AND_DEVIATIONS.md` | Medium | 1 doc (10 entries from §5.2 above) |
| 6 | Update `.env.example` | Trivial | 1 line |

All gaps are low-risk, well-scoped changes with zero architectural violations.

---

## Cross-References

| Topic | Document |
|-------|----------|
| Preflight analysis | `docs/audits/BETA_PAYWALL_PREFLIGHT_ANALYSIS.md` |
| Product vision | `docs/product/PRODUCT_VISION_AND_HYPOTHESES.md` |
| Beta scope | `docs/product/BETA_SCOPE_AND_SUCCESS_METRICS.md` |
| Beta gates template | `docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md` |
| Architecture rules | `docs/ssot/SSOT_ARCHITECTURE.md` |
| Billing system | `docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md` |
| DB schema (billing_credits) | `docs/ssot/SSOT_DATABASE.md` § 10 |
