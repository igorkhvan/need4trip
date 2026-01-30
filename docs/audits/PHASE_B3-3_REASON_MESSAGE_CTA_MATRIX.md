# Phase B3-3: Reason → Message → CTA Matrix

**Status:** ✅ COMPLETE  
**Date:** 2026-01-29  
**Type:** UX CONTRACT DEFINITION (documentation-only)  
**Scope:** No code modifications  
**Related:** PHASE_B3-1, PHASE_B3-2, DEBT-004

---

## Authoritative Inputs

| Document | Sections Used |
|----------|---------------|
| `PHASE_B3-1_ENFORCEMENT_TOUCHPOINT_INVENTORY.md` | Error Code Reference, Gaps Identified |
| `PHASE_B3-2_PAYWALL_ERROR_CONTRACT_ANALYSIS.md` | Normalized Contract Table, Gap Analysis |
| `SSOT_BILLING_SYSTEM_ANALYSIS.md` | §4 Enforcement, PaywallError структура |
| `SSOT_API.md` | §5.2 Paywall Response, §6 Error Model |
| `SSOT_ARCHITECTURE.md` | §15 Aborted / Incomplete Actions |

---

## Task 1 — Canonical Reason Set

### HTTP 402 PAYWALL Reason Codes (Existing)

| # | Reason Code | Source |
|---|-------------|--------|
| 1 | `SUBSCRIPTION_NOT_ACTIVE` | `accessControl.ts` (enforceClubAction, enforceEventPublish) |
| 2 | `PAID_EVENTS_NOT_ALLOWED` | `accessControl.ts` (enforceFreeLimit, enforcePlanLimits, enforceEventPublish) |
| 3 | `CSV_EXPORT_NOT_ALLOWED` | `accessControl.ts` (enforceFreeLimit, enforcePlanLimits) |
| 4 | `MAX_EVENT_PARTICIPANTS_EXCEEDED` | `accessControl.ts` (enforceFreeLimit, enforcePlanLimits, enforceEventPublish) |
| 5 | `MAX_CLUB_MEMBERS_EXCEEDED` | `accessControl.ts` (enforcePlanLimits) |
| 6 | `PUBLISH_REQUIRES_PAYMENT` | `accessControl.ts` (enforceEventPublish) |
| 7 | `CLUB_REQUIRED_FOR_LARGE_EVENT` | `accessControl.ts` (enforceEventPublish) |

### HTTP 409 CREDIT_CONFIRMATION Reason Codes (Existing)

| # | Error Code | Reason | Source |
|---|------------|--------|--------|
| 8 | `CREDIT_CONFIRMATION_REQUIRED` | `EVENT_UPGRADE_WILL_BE_CONSUMED` | `accessControl.ts` (enforceEventPublish) |

### HTTP 403 Non-Paywall Blocking Codes (Existing)

| # | Error Code | Source |
|---|------------|--------|
| 9 | `CLUB_ARCHIVED` | `clubs.ts` (assertClubNotArchived) |
| 10 | `FORBIDDEN` | Various RBAC checks |

---

## Task 2 — UX Matrix (HTTP 402 PAYWALL)

| Reason Code | User Message (RU) | Primary CTA | Secondary CTA | UI Pattern | Fallback Behavior |
|-------------|-------------------|-------------|---------------|------------|-------------------|
| `SUBSCRIPTION_NOT_ACTIVE` | Подписка клуба неактивна. Для продолжения требуется оплата. | Продлить подписку | Посмотреть тарифы | Paywall modal | IF `options[]` missing: redirect to `/pricing?clubId={clubId}`. IF `clubId` unknown: show generic pricing modal. |
| `PAID_EVENTS_NOT_ALLOWED` | Текущий тариф не поддерживает платные события. | Перейти на расширенный тариф | None | Paywall modal | IF `options[]` missing: redirect to `/pricing`. IF `requiredPlanId` present: pre-select plan in modal. |
| `CSV_EXPORT_NOT_ALLOWED` | Экспорт участников недоступен на текущем тарифе. | Перейти на расширенный тариф | None | Inline blocking message | IF `options[]` missing: show link to `/pricing`. IF in modal context: show pricing modal. |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` (club context) | Превышен лимит участников для текущего тарифа. | Перейти на расширенный тариф | None | Paywall modal | IF `options[]` missing: redirect to `/pricing?clubId={clubId}`. IF `meta.limit` present: show current limit in message. |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` (personal context) | Превышен лимит участников. Для событий более 15 человек требуется оплата. | Купить разовый доступ | Создать клуб | Paywall modal | IF `options[]` missing: show both ONE_OFF_CREDIT and CLUB_ACCESS buttons with links. |
| `MAX_CLUB_MEMBERS_EXCEEDED` | Превышен лимит участников клуба для текущего тарифа. | Перейти на расширенный тариф | None | Paywall modal | IF `options[]` missing: redirect to `/pricing?clubId={clubId}`. IF `meta.current` present: show current count. |
| `PUBLISH_REQUIRES_PAYMENT` | Для публикации события на {N} участников требуется оплата. | Купить разовый доступ | Создать клуб | Paywall modal | IF `options[]` missing: show generic purchase modal with ONE_OFF_CREDIT + CLUB_ACCESS options. Use `meta.requestedParticipants` for {N}. |
| `CLUB_REQUIRED_FOR_LARGE_EVENT` | Для событий более 500 участников требуется клуб. | Создать клуб | Посмотреть тарифы | Paywall modal | IF `options[]` missing: redirect to `/pricing` with club creation CTA. ONE_OFF_CREDIT is NOT an option for >500. |

---

## Task 3 — Credit Confirmation UX (HTTP 409)

| Reason Code | User Message (RU) | Confirmation CTA | Cancel Behavior | UI Pattern |
|-------------|-------------------|------------------|-----------------|------------|
| `EVENT_UPGRADE_WILL_BE_CONSUMED` | Для сохранения события будет использован ваш разовый доступ на {N} участников. | Подтвердить и сохранить | Return to form (silent, no toast, no error message) | Confirmation modal |

**409 Handling Rules:**

| Field | Requirement | Fallback |
|-------|-------------|----------|
| `meta.creditCode` | REQUIRED | IF missing: show generic "credit will be used" message |
| `meta.requestedParticipants` | REQUIRED for {N} substitution | IF missing: omit participant count from message |
| `meta.eventId` | OPTIONAL (null for create) | No fallback needed |
| `cta.type` | MUST be `CONFIRM_CONSUME_CREDIT` | IF missing: default to confirmation modal with standard CTA |

---

## Task 4 — Consistency Notes

### 1. Reason codes that MUST always result in a Paywall modal

| Reason Code | Modal Type | Rationale |
|-------------|------------|-----------|
| `SUBSCRIPTION_NOT_ACTIVE` | Paywall modal | Blocking action; requires subscription renewal or upgrade |
| `PAID_EVENTS_NOT_ALLOWED` | Paywall modal | Feature upgrade required |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` | Paywall modal | Limit blocking; upgrade path required |
| `MAX_CLUB_MEMBERS_EXCEEDED` | Paywall modal | Limit blocking; upgrade path required |
| `PUBLISH_REQUIRES_PAYMENT` | Paywall modal | Payment required for action |
| `CLUB_REQUIRED_FOR_LARGE_EVENT` | Paywall modal | Structural upgrade required (club creation) |

### 2. Reason codes that MUST NEVER show pricing

| Reason Code | UI Pattern | Rationale |
|-------------|------------|-----------|
| `EVENT_UPGRADE_WILL_BE_CONSUMED` (409) | Confirmation modal | User already has credit; only needs confirmation |

### 3. Context-dependent reason codes

| Reason Code | Club Context Behavior | Personal Context Behavior |
|-------------|----------------------|---------------------------|
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` | Show CLUB_ACCESS upgrade only | Show ONE_OFF_CREDIT + CLUB_ACCESS options |
| `SUBSCRIPTION_NOT_ACTIVE` | Show renewal for current club | N/A (personal events have no subscription) |
| `PAID_EVENTS_NOT_ALLOWED` | Show upgrade for club plan | Show CLUB_ACCESS only (personal can't have paid events) |
| `CSV_EXPORT_NOT_ALLOWED` | Show upgrade for club plan | N/A (CSV export is club-only feature) |

### 4. Fallback behavior when payload is incomplete

| Missing Field | Fallback Strategy |
|---------------|-------------------|
| `options[]` | Use `cta.href` if present (typically `/pricing`). Otherwise, construct URL: `/pricing` for personal, `/pricing?clubId={clubId}` for club context. |
| `requiredPlanId` / `recommendedPlanId` | Do NOT pre-select plan in UI. Show all available upgrade options. |
| `meta.limit` / `meta.requested` | Omit specific numbers from user message. Use generic phrasing. |
| `context.clubId` | Attempt to infer from request context (URL params, form state). If unavailable, show generic pricing. |
| `currentPlanId` | Display "текущий тариф" without specifics. Do not assume plan. |

---

## Compliance Matrix (Reason → Required `options[]` Types)

| Reason Code | ONE_OFF_CREDIT Required | CLUB_ACCESS Required |
|-------------|------------------------|---------------------|
| `SUBSCRIPTION_NOT_ACTIVE` | ❌ No | ✅ Yes |
| `PAID_EVENTS_NOT_ALLOWED` | ❌ No | ✅ Yes |
| `CSV_EXPORT_NOT_ALLOWED` | ❌ No | ✅ Yes |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` (club) | ❌ No | ✅ Yes |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` (personal) | ✅ Yes (if ≤500) | ✅ Yes |
| `MAX_CLUB_MEMBERS_EXCEEDED` | ❌ No | ✅ Yes |
| `PUBLISH_REQUIRES_PAYMENT` | ✅ Yes | ✅ Yes |
| `CLUB_REQUIRED_FOR_LARGE_EVENT` | ❌ No | ✅ Yes |

---

## HTTP 403 Blocking (Non-Paywall)

| Error Code | User Message (RU) | Primary CTA | UI Pattern |
|------------|-------------------|-------------|------------|
| `CLUB_ARCHIVED` | Клуб заархивирован. Операции записи недоступны. | Связаться с владельцем клуба | Read-only banner |
| `FORBIDDEN` | Недостаточно прав для выполнения действия. | None | Inline blocking message |

---

## Cross-Reference to Known Gaps

| Gap ID | From Phase | Impact on UX Contract |
|--------|------------|----------------------|
| GAP-1 | B3-2 | UX MUST handle missing `options[]` via fallback (defined in Task 4) |
| GAP-2 | B3-2 | UX MUST NOT rely on `requiredPlanId` for plan pre-selection |
| GAP-3 | B3-2 | UX MUST handle variable `meta` schema per reason code |
| GAP-4 | B3-2 | UX MUST accept both `requiredPlanId` and `recommendedPlanId` |
| GAP-5 | B3-2 | UX MUST check `options[]` first, then `cta` as fallback |
| GAP-6 | B3-2 | UX MUST infer `clubId` from request context if not in payload |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-29 | AI (Phase B3-3) | Initial UX contract matrix |

---

**Phase B3-3 UX contract matrix complete. No code was modified.**
