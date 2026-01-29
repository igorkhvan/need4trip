# Billing Audit Report — Phase B0

**Status:** 🔍 Audit Complete  
**Date:** 2026-01-29  
**Type:** READ-ONLY Audit & SSOT Gap Analysis  
**Related DEBT:** DEBT-004 (Billing Authorization Gaps)

---

## Executive Summary

This audit inventories all billing-related components, analyzes authorization patterns, and identifies gaps between implementation and SSOT.

### Key Findings

| Finding | Severity | Category | Status |
|---------|----------|----------|--------|
| Transaction ownership not verified (API-047) | 🟠 Medium | Authorization | Gap |
| Club subscription purchase lacks owner check | 🟠 Medium | Authorization | Gap |
| Credit queries trust caller-provided userId | 🟡 Low | Authorization | Design |
| `/api/clubs/[id]/current-plan` accessible to any auth user | 🟡 Low | Visibility | Design Decision |
| `/api/billing/products` is public (no auth) | 🟢 OK | Intended | OK |
| `/api/plans` is public (no auth) | 🟢 OK | Intended | OK |

### Top 3 Priorities

1. **Add transaction ownership verification** in `GET /api/billing/transactions/status`
2. **Add club owner check** in `POST /api/billing/purchase-intent` for club subscriptions
3. **Document visibility rules** for club plan information

---

## 1. Inventory

### 1.1 Service Layer

| File | Responsibility | Access Control | Notes |
|------|---------------|----------------|-------|
| `src/lib/services/accessControl.ts` | Central enforcement of billing limits | enforceClubAction(), enforceEventPublish() | SSOT-compliant |
| `src/lib/services/creditTransaction.ts` | Atomic credit consumption with event save | Wrapper for compensating transaction | SSOT-compliant |
| `src/lib/services/eventEntitlements.ts` | SSOT for event limits computation | Derives from plan/credits | SSOT-compliant |

### 1.2 Repository Layer

| File | Responsibility | Who Can Access | Auth Enforcement |
|------|---------------|----------------|------------------|
| `src/lib/db/billingCreditsRepo.ts` | CRUD for billing_credits | Caller provides userId | ⚠️ No ownership verification |
| `src/lib/db/billingTransactionsRepo.ts` | CRUD for billing_transactions | Caller provides clubId | ⚠️ No ownership verification |
| `src/lib/db/billingPolicyRepo.ts` | Policy rules lookup | Server-only | ✅ Internal |
| `src/lib/db/billingProductsRepo.ts` | Products catalog | Server-only | ✅ Internal |
| `src/lib/db/clubSubscriptionRepo.ts` | Club subscriptions | Caller provides clubId | ⚠️ No membership check |
| `src/lib/db/planRepo.ts` | Plan limits (cached) | Server-only | ✅ Internal |

### 1.3 API Routes

| Endpoint | Method | Auth | Authorization | Billing Touch | Status |
|----------|--------|------|---------------|---------------|--------|
| `/api/billing/products` | GET | None | Public | Product catalog | ✅ OK (intended) |
| `/api/billing/purchase-intent` | POST | `resolveCurrentUser(req)` | Authenticated user | Creates transaction | ⚠️ Gap for club purchases |
| `/api/billing/transactions/status` | GET | `resolveCurrentUser(req)` | **⚠️ NO OWNERSHIP CHECK** | Transaction status | ❌ Gap (DEBT-004) |
| `/api/dev/billing/settle` | POST | DEV only | `process.env.NODE_ENV !== 'production'` | Settlement stub | ✅ OK (dev-only) |
| `/api/plans` | GET | None | Public | Plan catalog | ✅ OK (intended) |
| `/api/clubs/[id]/current-plan` | GET | `resolveCurrentUser(req)` | Any authenticated user | Club plan info | 🟡 Design decision |
| `/api/clubs/[id]/export` | GET | `resolveCurrentUser(req)` | owner/admin + enforceClubAction | CSV export | ✅ OK |
| `/api/profile/credits` | GET | `resolveCurrentUser(req)` | Own credits only | User credits | ✅ OK |

### 1.4 UI Components

| Component | Location | Purpose | Data Source |
|-----------|----------|---------|-------------|
| `PaywallModal` | `src/components/billing/paywall-modal.tsx` | Shows 402 paywall | Error from backend |
| `CreditConfirmationModal` | `src/components/billing/credit-confirmation-modal.tsx` | Credit consumption confirmation | 409 response |
| `CreditBadge` | `src/components/billing/credit-badge.tsx` | Shows credit count | CurrentUser context |
| `usePaywall` hook | `src/components/billing/paywall-modal.tsx` | Hook for handling paywall errors | N/A |
| `useClubPlan` hook | `src/hooks/use-club-plan.ts` | Fetches club plan for forms | `/api/clubs/[id]/current-plan` |

---

## 2. Authorization Analysis

### 2.1 Authorization Matrix — Billing Operations

| Operation | Who Allowed | Where Enforced | SSOT Consistent | Gap |
|-----------|-------------|----------------|-----------------|-----|
| **Credit Purchase** | Any authenticated user | API: purchase-intent | ✅ Yes | None |
| **Credit Consumption** | Credit owner (implied) | Service: enforceEventPublish | ✅ Yes | None |
| **Transaction Status Query** | Transaction creator (intended) | API: **NOWHERE** | ❌ No | **GAP-1** |
| **Club Subscription Purchase** | Club owner (intended) | API: **NOWHERE** | ❌ No | **GAP-2** |
| **Plan Limits Check** | Any authenticated user | API: current-plan | 🟡 Design | Decision needed |
| **CSV Export** | Club owner/admin | API: export + enforceClubAction | ✅ Yes | None |

### 2.2 GAP-1: Transaction Status Query

**Location:** `src/app/api/billing/transactions/status/route.ts`

**Current behavior:**
```typescript
// Line 64-66
// TODO: Add proper authorization check
```

**Issue:**
- Any authenticated user can query status of ANY transaction if they know `transaction_id`
- `transaction_id` is returned from `purchase-intent` and may be stored in browser history/logs
- Horizontal privilege escalation possible

**Risk:** 🟠 Medium
- Transactions contain: product_code, amount, status, timestamps
- No PII exposed, but billing activity visible

**Recommendation:** Add explicit ownership check:
```typescript
// For one-off credits: verify transaction.user_id === currentUser.id
// For club subscriptions: verify currentUser is club owner
```

### 2.3 GAP-2: Club Subscription Purchase Authorization

**Location:** `src/app/api/billing/purchase-intent/route.ts`

**Current behavior:**
```typescript
// Line 117-119: For club subscriptions
club_id: context?.clubId ?? null
// No check that currentUser is club owner
```

**Issue:**
- Any authenticated user can initiate club subscription purchase for ANY club
- Transaction is created with `club_id` from request body
- If payment completes, subscription would be activated for wrong club

**Risk:** 🟠 Medium
- Payment gateway (Kaspi stub) not integrated, so no immediate exploitation
- But architecture flaw must be fixed before production payment integration

**Recommendation:** Add club ownership check before creating club subscription transaction:
```typescript
if (isClub && context?.clubId) {
  const role = await getUserClubRole(context.clubId, currentUser.id);
  if (role !== 'owner') {
    throw new ForbiddenError('Only club owner can purchase subscription');
  }
}
```

### 2.4 Credit Operations — Detail Analysis

| Function | Location | User Scoping | Gap |
|----------|----------|--------------|-----|
| `createBillingCredit` | billingCreditsRepo.ts | userId from caller | ⚠️ Trusts caller |
| `getAvailableCredits` | billingCreditsRepo.ts | Filters by userId param | ⚠️ Trusts caller |
| `consumeCredit` | billingCreditsRepo.ts | Filters by userId param | ⚠️ Trusts caller |
| `hasAvailableCredit` | billingCreditsRepo.ts | Filters by userId param | ⚠️ Trusts caller |

**Assessment:** Repository functions trust caller to provide correct userId. This is acceptable IF:
- All callers are server-side services
- All callers pass `currentUser.id` from auth resolution
- No API route directly exposes these functions with user-controlled userId

**Current state:** All callers pass `currentUser.id` from auth resolution. No direct exposure found.

**Status:** 🟢 Safe (defense-in-depth lacking, but no exploitable path)

---

## 3. Visibility Analysis

### 3.1 Who Can See What

| Data Type | Endpoint | Viewer | Visibility Rule | Consistent with SSOT |
|-----------|----------|--------|-----------------|---------------------|
| **Own Credits (available)** | `/api/profile/credits` | Self | Own credits only | ✅ Yes |
| **Own Credits (consumed)** | `/api/profile/credits` | Self | Own credits only | ✅ Yes |
| **Transaction Status** | `/api/billing/transactions/status` | Any auth user | **⚠️ No ownership check** | ❌ Gap |
| **Club Plan Info** | `/api/clubs/[id]/current-plan` | Any auth user | All club plans | 🟡 Design |
| **Public Plans** | `/api/plans` | Anyone | All public plans | ✅ Yes (intended) |
| **Products Catalog** | `/api/billing/products` | Anyone | Active products | ✅ Yes (intended) |

### 3.2 Visibility Rules vs Club Roles

| Club Role | Can See Club Plan | Can See Club Transactions | Can See Club Members Credits |
|-----------|-------------------|---------------------------|------------------------------|
| Owner | ✅ Yes | N/A (no endpoint) | N/A (no endpoint) |
| Admin | ✅ Yes | N/A | N/A |
| Member | ✅ Yes | N/A | N/A |
| Non-member | ✅ Yes | N/A | N/A |
| Guest (no auth) | ❌ No (401) | N/A | N/A |

**Finding:** Any authenticated user can see any club's plan information. This may be intentional (plans are not sensitive), but should be documented.

### 3.3 Event Owner Context

| Context | Who Sees Limits | Source |
|---------|-----------------|--------|
| Creating personal event | Event creator | eventEntitlements service |
| Creating club event | Club member (owner/admin) | Club plan via subscription |
| Editing personal event | Event creator | eventEntitlements service |
| Editing club event | Club owner/admin | Club plan via subscription |

**Assessment:** Event entitlements are correctly scoped to the event/club context. ✅

---

## 4. SSOT Gap Report

### 4.1 SSOT Documents Reviewed

| Document | Sections Reviewed | Compliance |
|----------|-------------------|------------|
| SSOT_ARCHITECTURE.md | §8.2-8.3 (Auth Context Types) | ✅ Compliant |
| SSOT_BILLING_SYSTEM_ANALYSIS.md | Full document | ✅ Compliant |
| SSOT_API.md | §9.5 (Billing endpoints) | ⚠️ Gaps found |
| ADR-001.1 | Auth resolution | ✅ Compliant |
| ADR-001.5 | RSC access rule | ✅ Compliant |

### 4.2 Violations Found

| ID | Violation | SSOT Reference | Severity | Status |
|----|-----------|----------------|----------|--------|
| V-1 | Transaction ownership not verified | SSOT_ARCHITECTURE.md §8.4 | 🟠 Medium | Open |
| V-2 | Club subscription purchase lacks owner check | SSOT_CLUBS_DOMAIN.md §14.1 | 🟠 Medium | Open |
| V-3 | TODO comment left in production code | SSOT_API.md §11 (no TODOs) | 🟡 Low | Open |

### 4.3 Mapping to DEBT-004

From `ARCHITECTURAL_DEBT_LOG.md`:

> **DEBT-004: Billing Authorization Gaps**
> 1. Transaction ownership verification — No explicit check that the requesting user owns the transaction they are querying or modifying.
> 2. Credit ownership verification — No explicit check that the requesting user owns the credit they are consuming.

**Audit Findings:**

| DEBT-004 Item | Audit Finding | Evidence |
|---------------|---------------|----------|
| Transaction ownership | ❌ **Confirmed** | `transactions/status/route.ts` line 64-66: TODO comment |
| Credit ownership | ⚠️ **Partially mitigated** | Repository functions trust caller; all current callers pass `currentUser.id` |

**Additional gap found:** Club subscription purchase authorization (not in DEBT-004).

---

## 5. Recommendations

### 5.1 Safe to Fix (No Design Decision Needed)

| Issue | Fix | Effort | Priority |
|-------|-----|--------|----------|
| GAP-1: Transaction ownership | Add `user_id` or `club_id` ownership check in API route | Low | 🔴 High |
| GAP-2: Club subscription purchase | Add club owner check before creating transaction | Low | 🔴 High |
| V-3: TODO in production | Remove TODO, implement fix | Low | 🟡 Medium |

### 5.2 Needs Design Decision

| Issue | Question | Options | Recommendation |
|-------|----------|---------|----------------|
| Club plan visibility | Should non-members see club plan info? | A) Keep open (not sensitive) B) Restrict to members | A) Keep open — plan names and limits are not sensitive |

### 5.3 OK As-Is

| Item | Rationale |
|------|-----------|
| `/api/billing/products` public | Product catalog is intentionally public for pricing page |
| `/api/plans` public | Plan catalog is intentionally public |
| Repository functions trust caller | All callers are server-side and pass `currentUser.id` |
| Credit consumption flow | Properly enforced via `enforceEventPublish()` |

---

## 6. Implementation Guidance (For Phase B1)

### 6.1 Fix for GAP-1 (Transaction Ownership)

```typescript
// In /api/billing/transactions/status/route.ts

// After fetching transaction (line 51-59):
// Add ownership verification:

// For one-off credits (user transactions):
if (transaction.user_id && transaction.user_id !== currentUser.id) {
  throw new ForbiddenError("Cannot access this transaction");
}

// For club subscriptions:
if (transaction.club_id) {
  const role = await getUserClubRole(transaction.club_id, currentUser.id);
  if (role !== 'owner') {
    throw new ForbiddenError("Only club owner can view subscription transactions");
  }
}
```

### 6.2 Fix for GAP-2 (Club Subscription Purchase)

```typescript
// In /api/billing/purchase-intent/route.ts

// After line 70 (before creating transaction):
if (isClub && context?.clubId) {
  const { getUserClubRole } = await import("@/lib/db/clubMemberRepo");
  const role = await getUserClubRole(context.clubId, currentUser.id);
  if (role !== 'owner') {
    throw new ForbiddenError("Only club owner can purchase subscription");
  }
}
```

---

## 7. Test Coverage Gaps

| Test File | Coverage | Gap |
|-----------|----------|-----|
| `tests/integration/billing.v4.test.ts` | Core billing v4 | Transaction ownership tests missing |
| `tests/integration/api.billing.test.ts` | API integration | Club subscription auth tests missing |
| `tests/integration/credit-consumption.test.ts` | Credit flow | ✅ Adequate |

**Recommendation:** Add test cases for:
- QA-XX: Transaction status query by non-owner should return 403
- QA-XX: Club subscription purchase by non-owner should return 403

---

## 8. Appendix: File Inventory

### Billing-Related Files (Complete List)

```
src/
├── app/api/
│   ├── billing/
│   │   ├── products/route.ts          # GET /api/billing/products
│   │   ├── purchase-intent/route.ts   # POST /api/billing/purchase-intent
│   │   └── transactions/status/route.ts # GET /api/billing/transactions/status
│   ├── dev/billing/settle/route.ts    # POST /api/dev/billing/settle
│   ├── plans/route.ts                 # GET /api/plans
│   ├── clubs/[id]/
│   │   ├── current-plan/route.ts      # GET /api/clubs/[id]/current-plan
│   │   └── export/route.ts            # GET /api/clubs/[id]/export
│   └── profile/credits/route.ts       # GET /api/profile/credits
├── lib/
│   ├── db/
│   │   ├── billingCreditsRepo.ts
│   │   ├── billingProductsRepo.ts
│   │   ├── billingTransactionsRepo.ts
│   │   ├── billingPolicyRepo.ts
│   │   ├── clubSubscriptionRepo.ts
│   │   └── planRepo.ts
│   ├── services/
│   │   ├── accessControl.ts           # enforceClubAction, enforceEventPublish
│   │   ├── creditTransaction.ts       # executeWithCreditTransaction
│   │   └── eventEntitlements.ts       # getEffectiveEventEntitlements
│   └── types/
│       └── billing.ts
├── components/billing/
│   ├── paywall-modal.tsx
│   ├── credit-confirmation-modal.tsx
│   └── credit-badge.tsx
└── hooks/
    └── use-club-plan.ts
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-29 | AI Audit | Initial audit |

---

**END OF AUDIT REPORT**
