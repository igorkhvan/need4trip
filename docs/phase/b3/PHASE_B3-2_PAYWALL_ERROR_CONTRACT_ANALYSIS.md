# Phase B3-2: PAYWALL Error Contract Normalization

**Status:** 📋 Analysis Complete  
**Date:** 2026-01-29  
**Type:** READ-ONLY Documentation  
**Scope:** Backend → Frontend contract validation  
**Related:** DEBT-004 (Billing Authorization Gaps)

---

## Executive Summary

This document validates that ALL PAYWALL-related backend responses (HTTP 402 and 409) follow a CONSISTENT, UX-consumable contract. **No code was modified.**

### Key Findings

| Metric | Value |
|--------|-------|
| Total PAYWALL cases analyzed | 16 |
| SSOT-Compliant (has `options[]`) | 8 (50%) |
| Non-Compliant (missing `options[]`) | 7 (44%) |
| Partial compliance | 1 (6%) |
| Contract gaps identified | 6 |

---

## 1. Authoritative Inputs Used

| Document | Sections Referenced |
|----------|---------------------|
| `SSOT_API.md` | §5 Billing & Paywall Touchpoints, §6 Error Model |
| `SSOT_BILLING_SYSTEM_ANALYSIS.md` | §4 Система enforcement, PaywallError структура |
| `SSOT_ARCHITECTURE.md` | §15 Aborted / Incomplete Actions |
| `CLUBS_IMPLEMENTATION_BLUEPRINT v1` | §3.3 Error & Abort Model |
| `src/lib/errors.ts` | PaywallError, CreditConfirmationRequiredError classes |
| `src/lib/services/accessControl.ts` | enforceClubAction(), enforceEventPublish() |

---

## 2. PAYWALL Responses Inventory

### 2.1 HTTP 402 PAYWALL Cases

| # | Reason Code | Trigger Location | Function |
|---|-------------|------------------|----------|
| 1 | `SUBSCRIPTION_NOT_ACTIVE` | accessControl.ts:77-83 | `enforceClubAction()` |
| 2 | `SUBSCRIPTION_NOT_ACTIVE` | accessControl.ts:313-325 | `enforceEventPublish()` |
| 3 | `PAID_EVENTS_NOT_ALLOWED` | accessControl.ts:106-112 | `enforceFreeLimit()` |
| 4 | `PAID_EVENTS_NOT_ALLOWED` | accessControl.ts:163-170 | `enforcePlanLimits()` |
| 5 | `PAID_EVENTS_NOT_ALLOWED` | accessControl.ts:331-343 | `enforceEventPublish()` |
| 6 | `PAID_EVENTS_NOT_ALLOWED` | accessControl.ts:415-427 | `enforceEventPublish()` |
| 7 | `CSV_EXPORT_NOT_ALLOWED` | accessControl.ts:117-124 | `enforceFreeLimit()` |
| 8 | `CSV_EXPORT_NOT_ALLOWED` | accessControl.ts:175-181 | `enforcePlanLimits()` |
| 9 | `MAX_EVENT_PARTICIPANTS_EXCEEDED` | accessControl.ts:131-143 | `enforceFreeLimit()` |
| 10 | `MAX_EVENT_PARTICIPANTS_EXCEEDED` | accessControl.ts:188-199 | `enforcePlanLimits()` |
| 11 | `MAX_EVENT_PARTICIPANTS_EXCEEDED` | accessControl.ts:364-379 | `enforceEventPublish()` |
| 12 | `MAX_EVENT_PARTICIPANTS_EXCEEDED` | accessControl.ts:447-461 | `enforceEventPublish()` |
| 13 | `MAX_CLUB_MEMBERS_EXCEEDED` | accessControl.ts:207-216 | `enforcePlanLimits()` |
| 14 | `CLUB_REQUIRED_FOR_LARGE_EVENT` | accessControl.ts:479-494 | `enforceEventPublish()` |
| 15 | `PUBLISH_REQUIRES_PAYMENT` | accessControl.ts:501-523 | `enforceEventPublish()` |

### 2.2 HTTP 409 CREDIT_CONFIRMATION Cases

| # | Reason Code | Trigger Location | Function |
|---|-------------|------------------|----------|
| 16 | `EVENT_UPGRADE_WILL_BE_CONSUMED` | accessControl.ts:526-547 | `enforceEventPublish()` |

---

## 3. Normalized Contract Table

| Enforcement Case | Endpoint | Status | Error Type | Payload Fields | Missing Fields | SSOT-Compliant |
|------------------|----------|--------|------------|----------------|----------------|----------------|
| `SUBSCRIPTION_NOT_ACTIVE` (club action) | Multiple club APIs | 402 | `PaywallError` | reason, currentPlanId, meta.status | **options[]** | **NO** |
| `SUBSCRIPTION_NOT_ACTIVE` (event publish) | POST/PUT /api/events | 402 | `PaywallError` | reason, currentPlanId, meta.status, options[] | — | YES |
| `PAID_EVENTS_NOT_ALLOWED` (free limit) | POST/PUT /api/events | 402 | `PaywallError` | reason, currentPlanId, requiredPlanId | **options[]** | **NO** |
| `PAID_EVENTS_NOT_ALLOWED` (plan limits) | POST/PUT /api/events | 402 | `PaywallError` | reason, currentPlanId, requiredPlanId | **options[]** | **NO** |
| `PAID_EVENTS_NOT_ALLOWED` (event publish club) | POST/PUT /api/events | 402 | `PaywallError` | reason, currentPlanId, requiredPlanId, options[] | — | YES |
| `PAID_EVENTS_NOT_ALLOWED` (event publish personal) | POST/PUT /api/events | 402 | `PaywallError` | reason, currentPlanId, requiredPlanId, options[] | — | YES |
| `CSV_EXPORT_NOT_ALLOWED` (free) | GET /api/clubs/[id]/export | 402 | `PaywallError` | reason, currentPlanId, requiredPlanId | **options[]** | **NO** |
| `CSV_EXPORT_NOT_ALLOWED` (paid) | GET /api/clubs/[id]/export | 402 | `PaywallError` | reason, currentPlanId, requiredPlanId | **options[]** | **NO** |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` (free limit) | Multiple APIs | 402 | `PaywallError` | reason, currentPlanId, requiredPlanId, meta.{requested, limit} | **options[]** | **NO** |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` (plan limits) | Multiple APIs | 402 | `PaywallError` | reason, currentPlanId, requiredPlanId, meta.{requested, limit} | **options[]** | **NO** |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` (event publish club) | POST/PUT /api/events | 402 | `PaywallError` | reason, currentPlanId, requiredPlanId, meta, options[] | — | YES |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` (event publish personal) | POST/PUT /api/events | 402 | `PaywallError` | reason, currentPlanId, meta.{requestedParticipants, upgradeLimit}, options[] | **requiredPlanId** | **PARTIAL** |
| `MAX_CLUB_MEMBERS_EXCEEDED` | POST /api/clubs/[id]/members | 402 | `PaywallError` | reason, currentPlanId, requiredPlanId, meta.{current, limit} | **options[]** | **NO** |
| `CLUB_REQUIRED_FOR_LARGE_EVENT` | POST/PUT /api/events | 402 | `PaywallError` | reason, currentPlanId, meta, options[] | — | YES |
| `PUBLISH_REQUIRES_PAYMENT` | POST/PUT /api/events | 402 | `PaywallError` | reason, currentPlanId, meta, options[]{ONE_OFF_CREDIT, CLUB_ACCESS} | — | YES |
| `EVENT_UPGRADE_WILL_BE_CONSUMED` | POST/PUT /api/events | 409 | `CreditConfirmationRequiredError` | code, reason, meta.{creditCode, eventId, requestedParticipants}, cta | — | YES |

---

## 4. Expected PAYWALL Contract (Documentation Only)

Based on SSOT intent (SSOT_BILLING_SYSTEM_ANALYSIS.md, SSOT_API.md §5.2, SSOT_ARCHITECTURE.md §15), the **canonical PAYWALL payload** should be:

### 4.1 HTTP 402 PAYWALL (Canonical)

```typescript
// EXPECTED CONTRACT (NORMATIVE)
{
  "success": false,
  "error": {
    "code": "PAYWALL",                           // REQUIRED (machine-readable)
    "message": string,                           // REQUIRED (human-readable)
    "details": {
      "reason": PaywallReason,                   // REQUIRED (machine-readable discriminator)
      "currentPlanId": PlanId | null,            // REQUIRED (current state)
      "requiredPlanId": PlanId | undefined,      // OPTIONAL (upgrade target, when determinable)
      "meta": Record<string, unknown>,           // OPTIONAL (context-specific data)
      "options": PaywallOption[],                // REQUIRED (upgrade paths)
      "context": {                               // OPTIONAL (when relevant)
        "clubId"?: string,
        "userId"?: string
      }
    }
  }
}
```

### 4.2 PaywallReason (Enum)

| Reason | Description |
|--------|-------------|
| `SUBSCRIPTION_NOT_ACTIVE` | Club subscription status is not active |
| `SUBSCRIPTION_EXPIRED` | Club subscription has expired |
| `PAID_EVENTS_NOT_ALLOWED` | Plan doesn't allow paid events |
| `CSV_EXPORT_NOT_ALLOWED` | Plan doesn't allow CSV export |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` | Event exceeds plan participant limit |
| `MAX_CLUB_MEMBERS_EXCEEDED` | Club exceeds plan member limit |
| `CLUB_REQUIRED_FOR_LARGE_EVENT` | Event >500 participants requires club |
| `PUBLISH_REQUIRES_PAYMENT` | Personal event 16-500 needs credit |
| `CLUB_CREATION_REQUIRES_PLAN` | Club creation requires paid plan |

### 4.3 PaywallOption (Union)

```typescript
type PaywallOption = 
  | { 
      type: "ONE_OFF_CREDIT"; 
      productCode: string; 
      price: number; 
      currencyCode: string; 
      provider: string; 
    }
  | { 
      type: "CLUB_ACCESS"; 
      recommendedPlanId: PlanId; 
    }
```

### 4.4 Field Requirements Summary

| Field | Status | Description |
|-------|--------|-------------|
| `reason` | **REQUIRED** | Machine-readable discriminator for UX branching |
| `currentPlanId` | **REQUIRED** | Current plan state (null for personal context) |
| `requiredPlanId` | OPTIONAL | Target plan if upgrade is the only option |
| `meta` | OPTIONAL | Contextual data (limits, requested values) |
| `options[]` | **REQUIRED** | At least one upgrade path MUST be provided |
| `context.clubId` | OPTIONAL | Club context identifier when relevant |
| `context.userId` | OPTIONAL | User context identifier (for audit only) |

### 4.5 HTTP 409 CREDIT_CONFIRMATION (Canonical)

```typescript
// EXPECTED CONTRACT (NORMATIVE)
{
  "success": false,
  "error": {
    "code": "CREDIT_CONFIRMATION_REQUIRED",      // REQUIRED
    "reason": "EVENT_UPGRADE_WILL_BE_CONSUMED",  // REQUIRED
    "meta": {
      "creditCode": string,                      // REQUIRED
      "eventId": string | null,                  // REQUIRED (null for create)
      "requestedParticipants": number            // REQUIRED
    },
    "cta": {
      "type": "CONFIRM_CONSUME_CREDIT",          // REQUIRED
      "href"?: string                            // OPTIONAL (set by API layer)
    }
  }
}
```

---

## 5. Gap Analysis

### GAP-1: Missing `options[]` in Legacy Enforcement Functions

**Affected functions:**
- `enforceFreeLimit()` — lines 93-145
- `enforcePlanLimits()` — lines 151-219

**Observation:**
PaywallError throws in these functions lack `options[]` field. Only `enforceEventPublish()` consistently provides `options[]`.

**Impact:**
Frontend cannot determine available upgrade paths when errors originate from `enforceClubAction()` called outside event context (e.g., CSV export, member invite).

**Cases affected:**
- `SUBSCRIPTION_NOT_ACTIVE` (club action path)
- `PAID_EVENTS_NOT_ALLOWED` (free/paid limits path)
- `CSV_EXPORT_NOT_ALLOWED` (both paths)
- `MAX_EVENT_PARTICIPANTS_EXCEEDED` (free/paid limits path)
- `MAX_CLUB_MEMBERS_EXCEEDED`

---

### GAP-2: Inconsistent `requiredPlanId` Handling

**Observation:**
- Some throws use `requiredPlanId: requiredPlan === "free" ? undefined : requiredPlan`
- Some throws set `requiredPlanId: "club_50"` hardcoded
- `MAX_EVENT_PARTICIPANTS_EXCEEDED` (personal with credit) omits `requiredPlanId` entirely

**Impact:**
UX cannot reliably determine upgrade target from `requiredPlanId` alone.

---

### GAP-3: `meta` Field Shape Inconsistency

**Observation:**
Different error cases use different `meta` shapes:

| Reason | meta keys |
|--------|-----------|
| `SUBSCRIPTION_NOT_ACTIVE` | `{ status }` |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` | `{ requested, limit }` or `{ requestedParticipants, upgradeLimit }` |
| `CLUB_REQUIRED_FOR_LARGE_EVENT` | `{ requestedParticipants, maxOneOffLimit }` |
| `PUBLISH_REQUIRES_PAYMENT` | `{ requestedParticipants, freeLimit }` |

**Impact:**
Frontend must handle multiple `meta` schemas per reason code.

---

### GAP-4: SSOT_API.md vs Implementation Drift

**SSOT_API.md §5.2 declares:**
```json
"options": [
  { "type": "ONE_OFF_CREDIT", "productCode": "EVENT_UPGRADE_500" },
  { "type": "CLUB_ACCESS", "requiredPlanId": "club_500" }
]
```

**Implementation uses:**
```typescript
options: [
  { type: "CLUB_ACCESS", recommendedPlanId: "club_50" }  // ← recommendedPlanId
]
```

**Impact:**
Key name mismatch: `requiredPlanId` (SSOT) vs `recommendedPlanId` (code).

---

### GAP-5: `cta` vs `options` Ambiguity

**Observation:**
`PaywallError.cta` (fallback `OPEN_PRICING`) is used when `options` is absent. This creates two competing patterns:
1. `cta.type = "OPEN_PRICING"` with `cta.href = "/pricing"`
2. `options[]` with typed upgrade paths

**Impact:**
Frontend must check both `options` and `cta` to determine action.

---

### GAP-6: Missing `context.clubId` in Most Throws

**Observation:**
`context` field with `clubId` is not present in any current PaywallError throw, despite being relevant for club-scoped paywall resolution.

**Impact:**
When UX receives 402 PAYWALL, it cannot reliably determine which club triggered the error without additional request context.

---

## 6. Gap Summary Matrix

| Gap ID | Description | Severity | Blocking UX? |
|--------|-------------|----------|--------------|
| GAP-1 | Missing `options[]` in legacy functions | 🟠 Medium | YES |
| GAP-2 | Inconsistent `requiredPlanId` handling | 🟡 Low | NO |
| GAP-3 | `meta` field shape inconsistency | 🟡 Low | NO |
| GAP-4 | SSOT vs implementation key name drift | 🟠 Medium | YES |
| GAP-5 | `cta` vs `options` ambiguity | 🟡 Low | NO |
| GAP-6 | Missing `context.clubId` | 🟡 Low | NO |

---

## 7. Compliance Summary

| Category | Count | Percentage |
|----------|-------|------------|
| SSOT-Compliant (has `options[]`) | 8 | 50% |
| Non-Compliant (missing `options[]`) | 7 | 44% |
| Partial (missing `requiredPlanId`) | 1 | 6% |

---

## 8. Code Files Inspected

| File | Purpose |
|------|---------|
| `src/lib/errors.ts` | PaywallError, CreditConfirmationRequiredError class definitions |
| `src/lib/services/accessControl.ts` | `enforceClubAction()`, `enforceEventPublish()` |
| `src/lib/services/participants.ts` | Participant registration enforcement |
| `src/app/api/events/route.ts` | Event create API (402/409 handling) |
| `src/app/api/events/[id]/route.ts` | Event update API (402/409 handling) |
| `src/app/api/clubs/[id]/export/route.ts` | CSV export enforcement |

---

## 9. Next Steps (Out of Scope for B3-2)

The following are **identified but NOT implemented** in this phase:

1. **Normalize `options[]`** in all PaywallError throws
2. **Standardize `meta` schema** per reason code
3. **Align key names** (`requiredPlanId` vs `recommendedPlanId`)
4. **Add `context.clubId`** where relevant
5. **Update SSOT_API.md** with canonical contract
6. **Design PaywallModal** to consume normalized contract

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-29 | AI (Phase B3-2) | Initial analysis |

---

**Phase B3-2 PAYWALL contract analysis complete. No code was modified.**
