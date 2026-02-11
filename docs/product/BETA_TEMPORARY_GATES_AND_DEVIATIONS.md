---
Status: ACTIVE
Created: 2026-02-08
Updated: 2026-02-11
Owner: Product
Type: INFORMATIVE
Scope: Beta Launch
---

# Need4Trip — Beta Temporary Gates & Deviations

## 1. Purpose

This document tracks all temporary changes, feature gates, and behavioral deviations introduced for the beta launch of Need4Trip.

It ensures:
- Full traceability of every beta-time change
- Clear restoration path for returning to production behavior
- No hidden or undocumented modifications

Every entry must specify **what changed**, **why**, and **how to restore**.

---

## 2. General Rules

- **Scope:** Only beta-specific changes that deviate from standard production behavior.
- **What must be documented:** Feature gates, behavior deviations, UX simplifications, limit relaxations, beta-only instrumentation.
- **Out of scope:** Bug fixes, performance improvements, and changes that persist post-beta.
- **Adding entries:** Each entry must include Status, Area, What changed, Original behavior, Reason, Restoration condition, and Post-beta action.
- **Updating entries:** Change Status when conditions change. Never delete entries — mark as RESTORED.

---

## 3. Temporary Feature Gates

### 3.1 Paywall "Continue" CTA (SOFT_BETA_STRICT)

**Status:** SOFT MODE

**Area:**
- UI
- Backend
- Billing

**What changed:**
- PaywallModal shows a "Продолжить" (Continue) CTA when `PAYWALL_MODE=soft_beta_strict`.
- Clicking it triggers system auto-grant of one EVENT_UPGRADE_500 credit (`source='system'`), then resubmits event creation with `confirm_credit=1`.
- Standard payment options (ONE_OFF_CREDIT, CLUB_ACCESS) are replaced with the single BETA_CONTINUE option.

**Original behavior:**
- PaywallModal shows only "Разовая оплата" (Pay) and "Подписка клуба" (Club Subscription) options.
- No free continuation path exists.

**Reason for beta gate:**
- Beta validates core product value, not monetization (PRODUCT_VISION §6, BETA_SCOPE §4).
- Paywall must be visible to establish pricing awareness, but must not block trip creation — the primary beta action.

**Restoration condition:**
- Post-beta decision to proceed to monetization (BETA_SCOPE §8).

**UI suppression (STRICT):**
- In SOFT_BETA_STRICT, legacy HARD pricing options (ONE_OFF_CREDIT, CLUB_ACCESS) are fully
  suppressed at UI render level. They are excluded from the normalized data model
  (`getPaywallUiConfig`) and defensively filtered in the `PaywallModal` component.
  This is covered by automated tests: `tests/unit/paywall-ui-suppression.test.ts`
  (26 test cases: suppression, HARD regression, semantic validation, structure assertions).

**Post-beta action:**
- Remove BETA_CONTINUE option injection in `accessControl.ts`.
- Remove beta-grant API endpoint.
- Set `PAYWALL_MODE=hard` (or remove env var — defaults to `hard`).

---

### 3.2 System Auto-Grant Endpoint

**Status:** LIMITED

**Area:**
- Backend
- API

**What changed:**
- New endpoint `POST /api/billing/beta-grant` grants exactly one billing credit with `source='system'` without payment.
- Protected by `isSoftBetaStrict()` check — rejects requests when `PAYWALL_MODE != soft_beta_strict`.
- Creates `billing_transactions` record (`provider='system-beta-grant'`, `amount=0`, `status='completed'`).
- Creates `billing_credits` record (`source='system'`, `status='available'`).

**Original behavior:**
- Credits are only created after completed payment or admin grant.
- No system auto-grant mechanism exists.

**Reason for beta gate:**
- Required to enable SOFT_BETA_STRICT flow: paywall shown → user confirms → credit granted → event created.

**Restoration condition:**
- Post-beta monetization decision.

**Post-beta action:**
- Remove endpoint or disable via `PAYWALL_MODE=hard`.
- System-granted credits remain in DB for analytics.

---

### 3.3 Clubs Hidden (UI)

**Status:** HIDDEN

**Area:**
- UI
- Navigation (header + footer)

**What changed:**
- "Клубы" (Clubs) navigation item hidden from main header and footer when `PAYWALL_MODE=soft_beta_strict`.
- Header: link stays in DOM with `sr-only` class (SSOT_SEO.md §8 — crawlers can still follow).
- Footer: link stays in DOM with `sr-only` class, `tabIndex={-1}`, `aria-hidden`.
- Backend logic, data models, and API endpoints remain unchanged.

**Original behavior:**
- "Клубы" navigation item always visible in header and footer.

**Reason for beta gate:**
- Clubs are not the primary value proposition for beta (BETA_SCOPE §3.3).
- Hiding reduces cognitive load for beta users focused on trip creation.

**Restoration condition:**
- Post-beta: clubs feature re-evaluation.

**Post-beta action:**
- Set `PAYWALL_MODE=hard` to restore navigation items.
- Remove `sr-only`/`aria-hidden`/`tabIndex` conditionals from `main-header.tsx`, `mobile-nav.tsx`, `main-footer-client.tsx`.

---

### 3.4 Pricing Hidden (UI)

**Status:** HIDDEN

**Area:**
- UI
- Navigation (header + footer)

**What changed:**
- "Тарифы" (Pricing) navigation item hidden from main header and footer when `PAYWALL_MODE=soft_beta_strict`.
- Header: link stays in DOM with `sr-only` class (SSOT_SEO.md §8 — crawlers can still follow).
- Footer: link stays in DOM with `sr-only` class, `tabIndex={-1}`, `aria-hidden`.
- Pricing page, backend, and billing logic remain unchanged.

**Original behavior:**
- "Тарифы" navigation item always visible in header and footer.

**Reason for beta gate:**
- Monetization is explicitly out of scope for beta (BETA_SCOPE §4).
- Pricing page would confuse beta users who cannot pay.

**Restoration condition:**
- Post-beta monetization decision.

**Post-beta action:**
- Set `PAYWALL_MODE=hard` to restore navigation items.
- Remove `sr-only`/`aria-hidden`/`tabIndex` conditionals from `main-header.tsx`, `mobile-nav.tsx`, `main-footer-client.tsx`.

---

### 3.5 Event Participant Hard Cap (UI Modal)

**Status:** ACTIVE

**Area:**
- UI
- Event Form (create & edit)

**What changed:**
- In `SOFT_BETA_STRICT` mode, a UI-level hard cap of 500 participants per event is enforced.
- When user attempts to save/publish an event with >500 participants, a system-level modal appears explaining the beta limitation.
- The modal blocks event submission. Closing the modal returns user to the form. User must reduce participant count to ≤500.
- No PaywallError is raised. No billing UI (PaywallModal) is opened.
- The enforcement is entirely on the frontend — backend logic is not touched.

**Original behavior:**
- >500 participants triggers `CLUB_REQUIRED_FOR_LARGE_EVENT` paywall, requiring a club subscription.
- No UI-level cap on participant count (enforcement happens on backend).

**Reason for beta gate:**
- Clubs and club subscriptions are intentionally hidden during beta (§3.3).
- The club subscription paywall for >500 participants would be confusing since clubs are not visible.
- A temporary UI modal explaining the beta limit is a cleaner UX.

**Modal copy (SSOT_UI_COPY §7.4):**
- Title: "Ограничение бета-версии"
- Message: "В бета-версии максимальное количество участников события — 500."
- Primary action: "Понятно"

**Restoration condition:**
- Post-beta: club subscriptions re-enabled, clubs visible in navigation.
- Remove `isBetaMode` prop and `shouldShowBetaParticipantLimitModal()` calls from create/edit event client components.
- Remove `BetaParticipantLimitModal` component.
- Remove copy from `SSOT_UI_COPY.md §7.4`.

**Post-beta action:**
- Set `PAYWALL_MODE=hard` to restore standard paywall behavior.
- Standard `CLUB_REQUIRED_FOR_LARGE_EVENT` paywall resumes for >500 participants.

**Covered by automated tests:**
- `tests/unit/beta-participant-limit.test.ts` (4 test groups, ~20 assertions)

---

### 3.6 Paid Events Hidden (UI)

**Status:** HIDDEN

**Area:**
- UI
- Event Form (create & edit)

**What changed:**
- In `SOFT_BETA_STRICT` mode, the "Тип участия" (participation type) field — along with the dependent "Цена" (price) and "Валюта" (currency) fields — is hidden from the event creation and editing forms.
- `isPaid` is forced to `false` in beta mode, regardless of `initialValues`.
- The payload always sends `isPaid: false`, `price: null`, `currencyCode: null` in beta mode.
- All events created during beta are free.

**Original behavior:**
- "Тип участия" select is always visible with "Бесплатное" (free) and "Платное" (paid) options.
- When "Платное" is selected, price and currency fields appear.

**Reason for beta gate:**
- Monetization is explicitly out of scope for beta (BETA_SCOPE §4).
- Payment collection is not available during beta.
- Showing a paid event option that cannot be used would confuse beta users.

**Restoration condition:**
- Post-beta: monetization decision made, payment collection enabled.

**Post-beta action:**
- Set `PAYWALL_MODE=hard` to restore "Тип участия" field visibility.
- Remove `isBetaMode` conditional from `EventBasicInfoSection`.
- Remove `isPaid` force-override from `EventForm`.

---

### 3.7 Footer Contacts Hidden (UI)

**Status:** HIDDEN

**Area:**
- UI
- Footer

**What changed:**
- "Контакты" section (Telegram link, Поддержка email) hidden from footer when `PAYWALL_MODE=soft_beta_strict`.
- Entire contacts `<div>` stays in DOM with `sr-only` class, `aria-hidden` (SSOT_SEO.md §8 — crawlers can still follow links).
- Individual links get `tabIndex={-1}` so keyboard navigation skips them.
- No backend or data changes.

**Original behavior:**
- "Контакты" section always visible in footer with Telegram and support email links.

**Reason for beta gate:**
- Contact details are not finalized for beta; hiding reduces noise and avoids premature support expectations.

**Restoration condition:**
- Post-beta: contacts finalized and ready for public display.

**Post-beta action:**
- Set `PAYWALL_MODE=hard` to restore contacts section visibility.
- Remove `betaStrict` conditionals (`sr-only`/`aria-hidden`/`tabIndex`) from `main-footer-client.tsx` contacts block.

---

## 4. Temporary Behavior Deviations

### 4.1 Billing Enforcement Runs But Does Not Block

**Status:** SOFTENED

**Affected flow:**
- Personal event creation with >15 participants.

**Beta behavior:**
- Enforcement runs fully. PaywallError 402 fires. PaywallModal shown.
- But user can click "Продолжить" to proceed without payment.
- System auto-grants one billing credit and consumes it via standard production path.

**Original behavior:**
- User must purchase credit or upgrade to club plan. No free continuation.

**Reason for deviation:**
- Beta is not a monetization phase (BETA_SCOPE §4). The paywall display establishes pricing awareness and tests user perception without blocking the core flow.

**Restoration condition:**
- Post-beta monetization decision.

---

### 4.2 System Credits Granted Without Payment

**Status:** MODIFIED

**Affected flow:**
- Personal event creation with participants above free plan limit (limits from DB: `club_plans.free.max_event_participants` to `billing_products.constraints.max_participants`).

**Beta behavior:**
- Credits created with `source='system'`, `amount=0` transaction. Consumed via standard production path.
- Credit lifecycle is identical to user-purchased credits after creation.

**Original behavior:**
- Credits created only after `billing_transactions.status='completed'` with real payment.

**Reason for deviation:**
- Decouples billing visibility from billing enforcement for beta validation.

**Restoration condition:**
- Post-beta: remove system grant path.

---

## 5. Temporary UX & Copy Changes

### 5.1 Beta Paywall Copy

**Area:**
- System messages
- Labels

**Beta version:**
- Title: "Платная функция"
- Message: "Создание события на {N} участников требует оплаты. В бета-версии действие доступно без оплаты."
- Primary CTA: "Продолжить"
- Cancel: "Отмена"
- Error (loop protection): "Действие не выполнено" / "Не удалось выполнить действие. Повторная попытка невозможна."

**Original version:**
- Title: "Требуется оплата"
- Primary CTA: "Купить разовый доступ"
- Secondary CTA: "Создать клуб"

**Reason:**
- Beta users cannot pay. Copy must communicate that this is a paid boundary without requiring payment.

**Restoration condition:**
- Post-beta: remove beta copy from `reasonMapping.ts`. Standard PUBLISH_REQUIRES_PAYMENT copy resumes.

---

## 6. Temporary Limit Relaxations

### 6.1 Event Participant Limit (Free Plan)

**Limit type:**
- Capacity

**Beta behavior:**
- Free limit (from `club_plans.free.max_event_participants`, currently 15) is ENFORCED — paywall fires.
- But user can bypass via "Продолжить" CTA (system auto-grant).
- Effective limit becomes upgrade product limit (from `billing_products.constraints.max_participants`, currently 500).

**Original behavior:**
- Free limit is enforced and blocks creation without payment.

**Note:** All limits are now dynamic from DB (not hardcoded). See SSOT_BILLING_SYSTEM_ANALYSIS.md §Кэширование.

**Reason:**
- Beta must show the paywall to test pricing perception, but must not prevent trip creation.

**Restoration condition:**
- Post-beta: remove BETA_CONTINUE option. Standard paywall blocks.

---

## 7. Beta-Only Instrumentation & Logging

### 7.1 `PAYWALL_MODE` Environment Variable

**Type:**
- Feature flag

**Purpose:**
- Enables SOFT_BETA_STRICT: paywall shown + system auto-grant path.

**Scope:**
- PaywallModal CTA visibility, auto-grant endpoint authorization, navigation feature gating.

**Removal condition:**
- Post-beta: set to `hard` or remove.

---

### 7.2 `billing_credits.source='system'` Marker

**Type:**
- Analytics / audit marker

**Purpose:**
- Distinguishes beta-granted credits from user-purchased and admin-granted.

**Scope:**
- All credits created via auto-grant in SOFT_BETA_STRICT mode.

**Removal condition:**
- Permanent — useful for post-beta analysis. Data stays in DB.

---

### 7.3 `billing_transactions.provider='system-beta-grant'` Marker

**Type:**
- Analytics / audit marker

**Purpose:**
- Identifies transactions created by system auto-grant (non-financial, amount=0).

**Scope:**
- All transactions created during beta auto-grant.

**Removal condition:**
- Permanent — useful for post-beta analysis.

---

### 7.4 Beta Telemetry Events

**Type:**
- Analytics event

**Purpose:**
- Captures beta-specific monetization-intent signals.

**Scope:**
- UI: PAYWALL_SHOWN_BETA, PAYWALL_CONFIRMED_BETA, PAYWALL_CANCELLED_BETA
- Backend: BETA_BILLING_AUTO_GRANT, BETA_CREDIT_CONSUMED

**Removal condition:**
- Post-beta: remove telemetry emission from `betaGrant.ts` and `paywall-modal.tsx`.

---

## 8. Review Checklist (Post-Beta)

- [ ] All feature gates reviewed (§3.1–3.7)
- [ ] All behavior deviations reviewed (§4.1–4.2)
- [ ] All UX/copy changes reviewed (§5.1)
- [ ] All relaxed limits reviewed (§6.1)
- [ ] All beta-only instrumentation reviewed (§7.1–7.4)
- [ ] `PAYWALL_MODE` set to `hard` or removed
- [ ] BETA_CONTINUE option removed from `accessControl.ts`
- [ ] `/api/billing/beta-grant` endpoint removed or disabled
- [ ] Beta copy removed from `reasonMapping.ts`
- [ ] Navigation items restored (header, footer, mobile nav)

---

## 9. Decision Log (References)

- `docs/product/PRODUCT_VISION_AND_HYPOTHESES.md`
- `docs/product/BETA_SCOPE_AND_SUCCESS_METRICS.md`
- `docs/product/POST_BETA_DECISION_FRAMEWORK.md`
- `docs/ui-contracts/system/UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT.md`
- `docs/audits/BETA_SOFT_STRICT_DELTA_REPORT.md`

---

## 10. Final Rule

Every entry in this document represents a **conscious, documented deviation** from production behavior. Each deviation MUST be resolved post-beta — either restored to original behavior or promoted to permanent with a decision record.

Ownership: Product team is responsible for reviewing this ledger at beta conclusion.
