---
Status: ACCEPTED
Created: 2026-02-08
Author: Cursor AI
Type: INFORMATIVE
Scope: Beta Launch — Paywall & Billing Readiness
---

# Beta Paywall & Billing — Preflight Analysis

> **Read-only codebase audit.** No code was modified.  
> **Purpose:** Prepare for beta changes by mapping all paywall enforcement points, billing flows, UI entry points, and configuration architecture.

---

## Table of Contents

1. [Paywall & Billing — Enforcement Points](#1-paywall--billing--enforcement-points)
2. [Paid Event Creation Flow — Full Trace](#2-paid-event-creation-flow--full-trace)
3. [UI Visibility — All Entry Points](#3-ui-visibility--all-entry-points)
4. [Configuration — PAYWALL_MODE Injection Point](#4-configuration--paywall_mode-injection-point)
5. [Documentation Impact](#5-documentation-impact)

---

## 1. Paywall & Billing — Enforcement Points

### 1.1 PaywallError Definition

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/errors.ts` | 94–161 | Class `PaywallError` (status 402). Includes `reason`, `currentPlanId`, `requiredPlanId`, `meta`, `options[]`, `cta` |
| `src/lib/errors.ts` | 167–169 | Type guard `isPaywallError()` |

### 1.2 PaywallError Throw Sites (402)

#### `src/lib/services/accessControl.ts` — 15 throw sites

| Line | Function | Reason Code |
|------|----------|-------------|
| ~77 | `enforceClubAction()` | `SUBSCRIPTION_NOT_ACTIVE` |
| ~106 | `enforceFreeLimit()` | `PAID_EVENTS_NOT_ALLOWED` |
| ~118 | `enforceFreeLimit()` | `CSV_EXPORT_NOT_ALLOWED` |
| ~133 | `enforceFreeLimit()` | `MAX_EVENT_PARTICIPANTS_EXCEEDED` |
| ~163 | `enforcePlanLimits()` | `PAID_EVENTS_NOT_ALLOWED` |
| ~175 | `enforcePlanLimits()` | `CSV_EXPORT_NOT_ALLOWED` |
| ~189 | `enforcePlanLimits()` | `MAX_EVENT_PARTICIPANTS_EXCEEDED` |
| ~207 | `enforcePlanLimits()` | `MAX_CLUB_MEMBERS_EXCEEDED` |
| ~313 | `enforceEventPublish()` | `SUBSCRIPTION_NOT_ACTIVE` |
| ~331 | `enforceEventPublish()` | `PAID_EVENTS_NOT_ALLOWED` |
| ~364 | `enforceEventPublish()` | `MAX_EVENT_PARTICIPANTS_EXCEEDED` |
| ~415 | `enforceEventPublish()` | `PAID_EVENTS_NOT_ALLOWED` |
| ~446 | `enforceEventPublish()` | `MAX_EVENT_PARTICIPANTS_EXCEEDED` |
| ~479 | `enforceEventPublish()` | `CLUB_REQUIRED_FOR_LARGE_EVENT` |
| ~501 | `enforceEventPublish()` | `PUBLISH_REQUIRES_PAYMENT` |

#### Other files

| File | Line | Reason Code |
|------|------|-------------|
| `src/lib/db/billingCreditsRepo.ts` | ~189 | `NO_CREDIT_AVAILABLE` |
| `src/lib/services/clubs.ts` | ~591 | `CLUB_CREATION_REQUIRES_PLAN` |

### 1.3 CreditConfirmationRequiredError (409)

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/errors.ts` | 203–215 | Class definition (status 409). Includes `creditCode`, `eventId`, `requestedParticipants`, `cta` |
| `src/lib/errors.ts` | 217–219 | Type guard `isCreditConfirmationRequiredError()` |
| `src/lib/services/accessControl.ts` | ~546 | **Single throw site** — personal event 16–500 participants, credit available, `confirmCredit=false` |

### 1.4 Backend PaywallError → HTTP 402 Mapping

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/api/response.ts` | 67–79 | `respondError()` maps `PaywallError` → HTTP 402 with full payload in `details` |

### 1.5 Frontend 402 / 409 Handling

| File | Line | Description |
|------|------|-------------|
| `src/app/(app)/events/create/create-event-client.tsx` | ~113 | Catches 402 on event create |
| `src/app/(app)/events/create/create-event-client.tsx` | ~126 | Catches 409 on event create |
| `src/app/(app)/events/[id]/edit/edit-event-client.tsx` | ~99 | Catches 402 on event edit |
| `src/app/(app)/events/[id]/edit/edit-event-client.tsx` | ~78 | Catches 409 on event edit |
| `src/components/clubs/club-form.tsx` | ~104 | Catches 402 on club creation |
| `src/lib/billing/ui/parseApiError.ts` | 69, 73 | Detects `statusCode === 402` |
| `src/lib/billing/ui/handleApiError.ts` | ~50 | Routes 402 → `openPaywall()` |
| `src/lib/billing/ui/handleApiError.ts` | ~81 | Routes 409 → `openCreditConfirmation()` |

### 1.6 Entitlements — billing_credits Check & Consume

| File | Function | Description |
|------|----------|-------------|
| `src/lib/db/billingCreditsRepo.ts` | `hasAvailableCredit()` | Boolean check for available credit |
| `src/lib/db/billingCreditsRepo.ts` | `getAvailableCredits()` | List available credits for user |
| `src/lib/db/billingCreditsRepo.ts` | `consumeCredit()` | Atomic credit consumption (sets `consumed_event_id`, `consumed_at`, `status='consumed'`) |
| `src/lib/db/billingCreditsRepo.ts` | `createBillingCredit()` | Creates credit after payment completes |
| `src/lib/db/billingCreditsRepo.ts` | `getCreditById()` | Get credit by ID |
| `src/lib/db/billingCreditsRepo.ts` | `getCreditByTransactionId()` | Idempotency check |
| `src/lib/db/billingCreditsRepo.ts` | `getConsumedCreditsForEvent()` | Audit: credits consumed for event |
| `src/lib/services/creditTransaction.ts` | `executeWithCreditTransaction()` | Atomic wrapper: create event → consume credit → rollback on failure |
| `src/lib/services/accessControl.ts` | `enforceEventPublish()` (~497) | Calls `hasAvailableCredit()` for personal events |
| `src/app/api/profile/credits/route.ts` | GET handler | Queries `billing_credits` for user profile |
| `src/app/api/admin/users/[userId]/route.ts` | GET handler | Queries `billing_credits` for admin view |

### 1.7 `billing_credits.source` — Presence & Usage

| File | Description |
|------|-------------|
| `supabase/migrations/20260202_add_billing_credits_source.sql` | Migration: adds `source` column (`'user' \| 'admin' \| 'system'`), CHECK constraint, index |
| `src/lib/db/billingCreditsRepo.ts` (~297) | `mapDbRowToCredit()` — maps `row.source` to credit object |
| `src/lib/billing/admin/adminGrantOneOffCredit.ts` (~170) | Sets `source: 'admin'` when creating admin-granted credit |

**Finding:** Column `source` is present and used. Value `'system'` is reserved in the CHECK constraint but **not yet used in code** — suitable for beta auto-grant credits.

### 1.8 Enforcement Boundary for Beta Auto-Grant

| Function | File : Line | Scope |
|----------|-------------|-------|
| `enforceEventPublish()` | `src/lib/services/accessControl.ts` : ~283 | **Primary** — all event create/update billing checks |
| `enforceClubAction()` | `src/lib/services/accessControl.ts` : ~43 | **Secondary** — all club action billing checks |
| `enforceFreeLimit()` | `src/lib/services/accessControl.ts` : ~93 | Internal — free plan limit checks |
| `enforcePlanLimits()` | `src/lib/services/accessControl.ts` : ~151 | Internal — paid plan limit checks |

**Conclusion:** Early return at the top of `enforceEventPublish()` and `enforceClubAction()` = full enforcement bypass without architectural violation.

---

## 2. Paid Event Creation Flow — Full Trace

### 2.1 End-to-End Path (CREATE_PAID_EVENT)

```
Step 1 — UI
  src/app/(app)/events/create/create-event-client.tsx
  └─> handleSubmit() → submitEvent(payload) → POST /api/events

Step 2 — API Route
  src/app/api/events/route.ts → POST()
  └─> Extracts confirm_credit from query params
  └─> Calls createEvent(payload, currentUser, confirmCredit)

Step 3 — Service Layer
  src/lib/services/events.ts → createEvent()
  └─> enforceEventPublish(params, confirmCredit) [BILLING CHECK]
  └─> Determines shouldUseCredit (personal + 16-500 + confirmCredit)

Step 4 — Billing Enforcement
  src/lib/services/accessControl.ts → enforceEventPublish()
  ├── Club event:
  │   └─> Check subscription + plan limits → 402 or OK
  └── Personal event:
      ├─> ≤15 participants → OK (free)
      ├─> >500 → 402 CLUB_REQUIRED_FOR_LARGE_EVENT
      ├─> 16-500, no credit → 402 PUBLISH_REQUIRES_PAYMENT
      ├─> 16-500, has credit, !confirmCredit → 409 CREDIT_CONFIRMATION
      └─> 16-500, has credit, confirmCredit → OK (consume later)

Step 5 — Credit Consumption
  src/lib/services/creditTransaction.ts → executeWithCreditTransaction()
  └─> Step A: createEventRecord() [event created FIRST]
  └─> Step B: consumeCredit(userId, creditCode, eventId) [credit bound to event]
  └─> Step C: On failure → deleteEventForRollback()

Step 6 — Persistence
  src/lib/db/eventRepo.ts → createEvent() → INSERT events
  + replaceAllowedBrands(), saveLocations(), upsertEventAccess()
```

### 2.2 Paywall Interception Point

| Stage | File | Mechanism |
|-------|------|-----------|
| Frontend catch | `create-event-client.tsx` : ~113 | `res.status === 402` → throw → `handleError()` |
| Error router | `src/lib/billing/ui/handleApiError.ts` : ~66 | `isPaywallApiError()` → `openPaywall()` |
| Modal render | `src/components/billing/BillingModalHost.tsx` : ~49 | Renders `PaywallModal` when `modalType === "paywall"` |

### 2.3 Flow Resumption After Credit Confirmation (409)

| Stage | File | Mechanism |
|-------|------|-----------|
| Frontend catch | `create-event-client.tsx` : ~126 | `res.status === 409` → throw → `handleError()` |
| Error router | `handleApiError.ts` : ~81 | `isCreditConfirmationApiError()` → `openCreditConfirmation()` |
| Confirmation modal | `BillingModalHost.tsx` : ~64 | `CreditConfirmationModal` → user clicks "Confirm" |
| Re-submit callback | `create-event-client.tsx` : ~178 | `onConfirmCredit()` → `submitEvent(payload, { confirmCredit: true })` |
| New request | — | `POST /api/events?confirm_credit=1` |
| Backend receives | `route.ts` : ~108 | `confirmCredit = true` → `enforceEventPublish()` allows → credit consumed |

### 2.4 `confirm_credit` Parameter Usage

| File | Line | Context |
|------|------|---------|
| `src/app/api/events/route.ts` | ~108 | POST: `url.searchParams.get("confirm_credit") === "1"` |
| `src/app/api/events/[id]/route.ts` | ~68 | PUT: `url.searchParams.get("confirm_credit") === "1"` |
| `src/lib/services/events.ts` | ~470 | `createEvent()` passes `confirmCredit` to `enforceEventPublish()` |
| `src/lib/services/events.ts` | ~794 | `updateEvent()` passes `confirmCredit` to `enforceEventPublish()` |
| `src/lib/services/accessControl.ts` | ~298 | Rejects `confirmCredit=true` for club events |
| `src/lib/services/accessControl.ts` | ~526 | Checks `!confirmCredit` → throws 409 for personal events |
| `create-event-client.tsx` | ~93 | Constructs URL with `?confirm_credit=1` |
| `edit-event-client.tsx` | ~78 | Constructs URL with `?confirm_credit=1` |

### 2.5 Key Files Reference

| Step | File | Function |
|------|------|----------|
| UI Entry | `src/app/(app)/events/create/create-event-client.tsx` | `CreateEventPageClient`, `handleSubmit`, `submitEvent` |
| API Route | `src/app/api/events/route.ts` | `POST()` |
| Service | `src/lib/services/events.ts` | `createEvent()` |
| Billing Enforcement | `src/lib/services/accessControl.ts` | `enforceEventPublish()` |
| Credit Consumption | `src/lib/services/creditTransaction.ts` | `executeWithCreditTransaction()` |
| Persistence | `src/lib/db/eventRepo.ts` | `createEvent()` |
| Error Handling | `src/lib/billing/ui/handleApiError.ts` | `handleApiErrorCore()` |
| Modal Host | `src/components/billing/BillingModalHost.tsx` | `BillingModalsRenderer` |

---

## 3. UI Visibility — All Entry Points

### 3.1 Clubs

| Type | File |
|------|------|
| Clubs list | `src/app/(app)/clubs/page.tsx` |
| Club creation page | `src/app/(app)/clubs/create/page.tsx` |
| Club profile | `src/app/(app)/clubs/[id]/page.tsx` |
| Club settings (incl. billing) | `src/app/(app)/clubs/[id]/settings/page.tsx` |
| Club members | `src/app/(app)/clubs/[id]/members/page.tsx` |
| Club events | `src/app/(app)/clubs/[id]/events/page.tsx` |
| Club form component | `src/components/clubs/club-form.tsx` |
| Club card | `src/components/clubs/club-card.tsx` |
| Club subscription card | `src/components/clubs/club-subscription-card.tsx` |
| Create club button | `src/components/clubs/create-club-button.tsx` |
| Create club page content | `src/components/clubs/create-club-page-content.tsx` |
| Members list (with CSV export) | `src/components/clubs/club-members-list.tsx` |
| Admin clubs | `src/app/admin/clubs/page.tsx`, `src/app/admin/clubs/[clubId]/page.tsx` |
| Admin extend subscription | `src/app/admin/clubs/[clubId]/_components/extend-subscription-modal.tsx` |

#### Club detail subcomponents (`src/app/(app)/clubs/[id]/_components/`)

- `club-profile-header.tsx`
- `club-about-section.tsx`
- `club-members-preview-async.tsx`
- `club-events-preview-async.tsx`
- `club-join-cta.tsx`
- `subscription-async.tsx`
- `club-forbidden-page.tsx`
- `club-archived-banner.tsx`

### 3.2 Pricing

| Type | File |
|------|------|
| Pricing page | `src/app/(app)/pricing/page.tsx` |
| Pricing card button | `src/components/pricing/pricing-card-button.tsx` |

### 3.3 Upgrade / Paywall CTAs

| Type | File | Description |
|------|------|-------------|
| PaywallModal | `src/components/billing/paywall-modal.tsx` | Main paywall modal (v5), exports `usePaywall()` hook |
| CreditConfirmationModal | `src/components/billing/credit-confirmation-modal.tsx` | Credit confirmation modal (v2) |
| BillingModalHost | `src/components/billing/BillingModalHost.tsx` | Global modal provider/host |
| Credit Badge | `src/components/billing/credit-badge.tsx` | Header badge showing available credits count |
| Profile Credits Section | `src/components/profile/profile-credits-section.tsx` | Credits history in user profile |

#### Upgrade CTA Locations

| Location | File | CTA Text/Action |
|----------|------|-----------------|
| Club subscription card | `src/components/clubs/club-subscription-card.tsx` : ~118 | "Посмотреть тарифы" link |
| Club settings billing section | `src/app/(app)/clubs/[id]/settings/page.tsx` | "Выбрать тариф", "Улучшить тариф", "Продлить подписку" |
| Pricing page | `src/app/(app)/pricing/page.tsx` | Plan selection buttons |
| Profile credits (no credits) | `src/components/profile/profile-credits-section.tsx` : ~265 | "Посмотреть тарифы" |

### 3.4 Key Hooks

| Hook | File | Used In |
|------|------|---------|
| `usePaywall()` | `src/components/billing/paywall-modal.tsx` : 338–366 | `club-form.tsx`, `club-members-list.tsx` |
| `use-club-plan` | `src/hooks/use-club-plan.ts` | Forms, limit validation |

---

## 4. Configuration — PAYWALL_MODE Injection Point

### 4.1 Existing Precedent

An analogous pattern already exists:

| Env Var | File | Values |
|---------|------|--------|
| `PAYMENT_PROVIDER_MODE` | `src/lib/payments/providers/paymentProvider.ts` | `'stub' \| 'simulated'` |

Characteristics: server-only, type-safe enum, production safety guard, default value.

### 4.2 Current Environment Variables (no PAYWALL_MODE exists)

**Client-side (`NEXT_PUBLIC_*`):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_TELEGRAM_AUTH_URL`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`

**Server-side (no prefix):**
- `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_JWT_SECRET`, `TELEGRAM_BOT_TOKEN`
- `ADMIN_SECRET`, `CRON_SECRET`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `PAYMENT_PROVIDER_MODE`

**No centralized env validation schema exists** — ad-hoc `process.env.VAR` access.

**No existing `PAYWALL_MODE` or billing feature flags found.**

### 4.3 Recommended Integration Point

**Pattern:** Config Module (analogous to `paymentProvider.ts`)

| Element | Value |
|---------|-------|
| New file | `src/lib/config/paywall.ts` |
| Type | `PaywallMode = 'enabled' \| 'disabled'` |
| Env var | `PAYWALL_MODE` (server-only, no `NEXT_PUBLIC_` prefix) |
| Default | `'enabled'` (omitted variable = normal enforcement) |
| Integration | Early return in `enforceEventPublish()` and `enforceClubAction()` |

### 4.4 Integration Points in `accessControl.ts`

| Function | Line | Description |
|----------|------|-------------|
| `enforceEventPublish()` | ~283 | **Primary**: early return if `PAYWALL_MODE=disabled` |
| `enforceClubAction()` | ~43 | **Secondary**: early return if `PAYWALL_MODE=disabled` |
| `enforceFreeLimit()` | ~93 | **Optional**: separate bypass for free limits |

### 4.5 Architecture Compliance

| Concern | Status |
|---------|--------|
| Server-only (§4 Runtime Boundaries) | ✅ No `NEXT_PUBLIC_` prefix |
| Billing enforcement in canonical module (§3.2 Ownership Map) | ✅ `accessControl.ts` unchanged as owner |
| Plan limits in DB (SSOT_DATABASE) | ✅ DB untouched, only enforcement bypassed |
| No frontend changes required | ✅ Paywall simply won't trigger |
| Consistent with existing patterns | ✅ Matches `PAYMENT_PROVIDER_MODE` |

---

## 5. Documentation Impact

### 5.1 Entries Required in `BETA_TEMPORARY_GATES_AND_DEVIATIONS.md`

#### Section 3 — Temporary Feature Gates

| ID | Feature | Suggested Status | Area |
|----|---------|------------------|------|
| 3.1 | Paywall enforcement (`enforceEventPublish`) | DISABLED / SOFT MODE | Billing, Backend |
| 3.2 | Paywall enforcement (`enforceClubAction`) | DISABLED / SOFT MODE | Billing, Backend |
| 3.3 | Club creation paywall (`CLUB_CREATION_REQUIRES_PLAN`) | DISABLED / SOFT MODE | Billing, Backend |
| 3.4 | PaywallModal / CreditConfirmationModal | HIDDEN (never triggered if paywall disabled) | UI |
| 3.5 | Credit Badge visibility | HIDDEN / MODIFIED | UI |
| 3.6 | Pricing page CTAs (purchase buttons) | HIDDEN / MODIFIED | UI |

#### Section 4 — Temporary Behavior Deviations

| ID | Deviation | Affected Flow |
|----|-----------|---------------|
| 4.1 | Free plan limits not enforced (events >15 participants allowed) | Event create/update |
| 4.2 | Club subscription status not checked | All club actions |
| 4.3 | Credit consumption flow bypassed | Personal event 16–500 |

#### Section 6 — Temporary Limit Relaxations

| ID | Limit | Beta Behavior |
|----|-------|---------------|
| 6.1 | `max_event_participants` (free = 15) | Not enforced |
| 6.2 | `max_club_members` (per plan) | Not enforced |
| 6.3 | `allow_paid_events` (per plan) | Not enforced (or auto-granted) |
| 6.4 | `allow_csv_export` (per plan) | Not enforced |

#### Section 7 — Beta-Only Instrumentation

| ID | Item | Type |
|----|------|------|
| 7.1 | `PAYWALL_MODE` env var | Feature flag |
| 7.2 | Logging on enforcement bypass | Log |
| 7.3 | `billing_credits.source = 'system'` for auto-grant credits | Analytics / audit marker |

### 5.2 Other Documents Requiring Updates (at implementation time)

| Document | Reason |
|----------|--------|
| `SSOT_ARCHITECTURE.md` §18.4 | Exception Record for paywall bypass |
| `SSOT_BILLING_SYSTEM_ANALYSIS.md` | Note about beta mode |
| `SSOT_API.md` | Note: 402 responses suppressed in beta |
| `.env.example` | New `PAYWALL_MODE` variable |

---

## Appendix: Summary Statistics

| Metric | Count |
|--------|-------|
| PaywallError throw sites | 17 (15 in `accessControl.ts`, 1 in `billingCreditsRepo.ts`, 1 in `clubs.ts`) |
| `enforceClubAction()` call sites | 3 |
| `enforceEventPublish()` call sites | 2 (both in `events.ts`) |
| CreditConfirmationRequiredError throw sites | 1 |
| Frontend 402 check sites | 6 |
| Frontend 409 check sites | 4 |
| `confirm_credit` parameter check sites | 4 (backend API routes) |
| `billing_credits` repository functions | 7 |
| Club-related UI files | 20+ |
| Pricing UI files | 2 |
| Paywall/CTA UI files | 5+ |

---

## Cross-References

| Topic | Document |
|-------|----------|
| Billing enforcement rules | `docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md` |
| Database schema (billing_credits) | `docs/ssot/SSOT_DATABASE.md` § 10 |
| Architecture patterns | `docs/ssot/SSOT_ARCHITECTURE.md` |
| API contracts (402 / 409) | `docs/ssot/SSOT_API.md` |
| Beta gates template | `docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md` |
| Product vision | `docs/product/PRODUCT_VISION_AND_HYPOTHESES.md` |
| Beta scope & metrics | `docs/product/BETA_SCOPE_AND_SUCCESS_METRICS.md` |
