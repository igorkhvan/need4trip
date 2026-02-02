# PHASE_A1.1.D — Admin Backend Diagnostic Report

---
**Status:** COMPLETE  
**Created:** 2026-02-02  
**Author:** Cursor AI  
**Phase:** A1  
**Mode:** DIAGNOSTIC ONLY  
---

## 1. Executive Summary

Admin V0 backend infrastructure is **partially implemented**:

- ✅ Admin auth context exists (`resolveAdminContext.ts`)
- ✅ Admin is separated from user auth
- ✅ One admin endpoint exists (`/api/admin/cache/clear`)
- ❌ No admin billing endpoints exist
- ❌ No admin audit infrastructure for billing operations
- ❌ No guardrails against forbidden mutations
- ❌ `billing_credits` lacks `source` field for admin attribution
- ❌ Audit is fire-and-forget (not atomic with mutations)

**Implementation Readiness:** ~30% — Foundation exists, billing-specific gaps must be resolved first.

---

## 2. Current State Overview (By Layer)

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| **Auth** | `resolveAdminContext.ts` | ✅ Exists | Phase 1 (no identity) |
| **Middleware** | Admin route protection | ✅ Exists | `x-admin-secret` validation |
| **API Routes** | `/api/admin/*` | ⚠️ Partial | Only cache/clear exists |
| **Service** | Admin billing services | ❌ Missing | No admin-specific services |
| **Repository** | `billingCreditsRepo.ts` | ⚠️ Partial | No admin grant function |
| **Repository** | `clubSubscriptionRepo.ts` | ⚠️ Partial | No guarded extend function |
| **Audit** | `clubAuditLogRepo.ts` | ⚠️ Partial | Club actions only, not admin |
| **Database** | `club_audit_log` | ⚠️ Partial | No admin actor_type support |

---

## 3. Admin Auth Findings

### 3.1 Existing Implementation

**File:** `src/lib/auth/resolveAdminContext.ts`

```typescript
export interface AdminContext {
  type: 'admin';
  authenticatedVia: 'shared-secret';
}
```

**Mechanism:**
- Header-based: `x-admin-secret`
- Validates against `process.env.ADMIN_SECRET`
- Returns `AdminContext | null`

**Middleware protection:**
- File: `src/middleware.ts` (lines 81-84, 388-403)
- ADMIN_ROUTES array: `['/api/admin/cache/clear']`
- Validates secret before route handler

### 3.2 Separation from User Auth

| Aspect | User Auth | Admin Auth |
|--------|-----------|------------|
| **Resolver** | `resolveCurrentUser(req?)` | `resolveAdminContext(req)` |
| **Location** | `lib/auth/resolveCurrentUser.ts` | `lib/auth/resolveAdminContext.ts` |
| **Mechanism** | JWT cookie | x-admin-secret header |
| **Identity** | User ID, profile | None (Phase 1) |

**Verdict:** ✅ Admin is clearly separated from user auth.

### 3.3 Admin Identity

**Current State:** NOT IMPLEMENTED (Phase 1 limitation)

Per `SSOT_ARCHITECTURE.md §8.3`:
> "Identity and audit trail formalization is deferred (see ARCHITECTURAL_DEBT_LOG.md)"

Per `ARCHITECTURAL_DEBT_LOG.md DEBT-005`:
> "No way to distinguish which admin performed an action"

**SSOT_ADMIN_AUDIT_RULES v1.0 §3.1 Requirement:**
- `actor_id`: Stable Admin identifier — REQUIRED
- `actor_type`: Always `admin` — REQUIRED

**GAP:** AdminContext lacks `actorId` field. Audit records cannot identify admin actor.

---

## 4. Admin API Findings

### 4.1 Existing Endpoints

| Endpoint | Method | Handler | Purpose | Admin V0 Scope |
|----------|--------|---------|---------|----------------|
| `/api/admin/cache/clear` | POST | `route.ts` | Clear StaticCache | ❌ Out of scope |

**Total:** 1 endpoint (infrastructure, not billing)

### 4.2 Missing Endpoints (Per SSOT_ADMIN_UI_PAGE_INVENTORY v1.0)

| Route | Required Actions | Status |
|-------|------------------|--------|
| `/admin/users` | Read user billing state | ❌ NO API |
| `/admin/users/[user_id]` | Read credits, grant credit | ❌ NO API |
| `/admin/clubs` | Read subscription state | ❌ NO API |
| `/admin/clubs/[club_id]` | Read subscription, extend | ❌ NO API |
| `/admin/audit` | Read audit log | ❌ NO API |

### 4.3 Endpoint Compliance Analysis

**SSOT_ADMIN_DOMAIN v1.0 §4–5 Allowed Operations:**

| Operation | Type | Required Endpoint | Exists |
|-----------|------|-------------------|--------|
| View user credits | READ | GET `/api/admin/users/[id]/credits` | ❌ |
| View user transactions | READ | GET `/api/admin/users/[id]/transactions` | ❌ |
| Grant credit | GRANT | POST `/api/admin/users/[id]/credits/grant` | ❌ |
| View club subscription | READ | GET `/api/admin/clubs/[id]/subscription` | ❌ |
| Extend subscription | GRANT | POST `/api/admin/clubs/[id]/subscription/extend` | ❌ |
| View audit log | READ | GET `/api/admin/audit` | ❌ |

---

## 5. Billing Interaction Findings

### 5.1 One-Off Credit Grant

**Target:** `SSOT_BILLING_ADMIN_RULES v1.0 §3`

**Existing Function:** `createBillingCredit()` in `src/lib/db/billingCreditsRepo.ts`

```typescript
export async function createBillingCredit(data: {
  userId: string;
  creditCode: CreditCode;
  sourceTransactionId: string;  // ⚠️ REQUIRED
}): Promise<BillingCredit>
```

**Problem:** `sourceTransactionId` is REQUIRED.

Admin grants per SSOT_BILLING_ADMIN_RULES v1.0 §3.2:
- "optionally create a non-financial billing transaction record (implementation detail)"

**Options:**
1. Create a sentinel billing_transaction with `source='admin'`
2. Make `sourceTransactionId` nullable for admin grants
3. Add separate `createAdminGrantedCredit()` function

**GAP:** No mechanism to create credit with `source='admin'` attribution.

### 5.2 Database Schema Gap

**Table:** `billing_credits`

Current columns (per SSOT_DATABASE.md):
```sql
- id, user_id, credit_code, status
- consumed_event_id, consumed_at
- source_transaction_id (NOT NULL)
- created_at, updated_at
```

**Missing per SSOT_BILLING_ADMIN_RULES v1.0 §1.3:**
- `source` column: `'user' | 'admin' | 'system'`

**GAP:** Cannot distinguish admin-granted credits from user-purchased credits.

### 5.3 Subscription Extension

**Target:** `SSOT_BILLING_ADMIN_RULES v1.0 §4`

**Existing Functions in `clubSubscriptionRepo.ts`:**

| Function | Can Modify | Problem |
|----------|------------|---------|
| `upsertClubSubscription()` | plan_id, status, dates | No guards against forbidden changes |
| `setClubSubscriptionStatus()` | status, grace_until | Changes status (FORBIDDEN per §4.2) |
| `activateSubscription()` | Creates new/activates | FORBIDDEN per §4.1 |

**Required Function (NOT EXISTS):**
```typescript
extendSubscriptionExpiration(
  clubId: string,
  additionalDays: number
): Promise<void>
// MUST: Only modify expires_at
// MUST NOT: Change plan_id, status
```

**GAP:** No function enforces "expires_at only" constraint.

---

## 6. Audit Findings

### 6.1 Existing Infrastructure

**Table:** `club_audit_log` (per SSOT_DATABASE.md)

```sql
CREATE TABLE public.club_audit_log (
    id BIGSERIAL PRIMARY KEY,
    club_id UUID NOT NULL,
    actor_user_id UUID NOT NULL,  -- ⚠️ USER ID, not admin
    action_code TEXT NOT NULL,
    target_user_id UUID,
    target_entity_type TEXT,
    target_entity_id TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL
);
```

**Problem:** `actor_user_id` assumes user context. Admin has no user ID.

### 6.2 Existing Action Codes

**File:** `src/lib/services/clubAuditLog.ts`

```typescript
export type ClubAuditAction =
  | 'CLUB_CREATED' | 'CLUB_UPDATED' | 'CLUB_VISIBILITY_CHANGED'
  | 'CLUB_ARCHIVED' | 'CLUB_UNARCHIVED'
  | 'INVITE_CREATED' | 'JOIN_REQUEST_CREATED' | 'JOIN_REQUEST_CANCELLED'
  | 'JOIN_REQUEST_APPROVED' | 'JOIN_REQUEST_REJECTED'
  | 'MEMBER_REMOVED' | 'ROLE_CHANGED';
```

**Missing per SSOT_ADMIN_AUDIT_RULES v1.0 §4:**

| Action Code | Purpose | Status |
|-------------|---------|--------|
| `ADMIN_GRANT_CREDIT` | One-off credit grant | ❌ MISSING |
| `ADMIN_EXTEND_SUBSCRIPTION` | Subscription extension | ❌ MISSING |
| `ADMIN_GRANT_CREDIT_REJECTED` | Failed grant attempt | ❌ MISSING |
| `ADMIN_EXTEND_SUBSCRIPTION_REJECTED` | Failed extension attempt | ❌ MISSING |

### 6.3 Atomicity Requirement

**SSOT_ADMIN_AUDIT_RULES v1.0 §5.1:**
> "Admin mutations and audit creation MUST occur in a single atomic operation"

**Current Implementation:** `appendAuditLog()` in `clubAuditLogRepo.ts`

```typescript
// Fire-and-forget. We don't want audit log failures to block...
appendAuditLog(payload);
```

**Problem:** Non-atomic. If audit fails, mutation still succeeds.

**GAP:** Violates §5.1 atomicity requirement.

### 6.4 Retention

**SSOT_ADMIN_AUDIT_RULES v1.0 §7.1:**
> "Audit records MUST be retained indefinitely"

**Current State:** No cleanup mechanism exists for `club_audit_log`. ✅ Compliant.

---

## 7. Guardrails & Enforcement Findings

### 7.1 Forbidden Operations Guard

**SSOT_ADMIN_DOMAIN v1.0 §6 — Admin MUST NOT:**

| Operation | Current Guard | Status |
|-----------|---------------|--------|
| Create subscription from scratch | None | ⚠️ `upsertClubSubscription()` allows |
| Activate subscription | None | ⚠️ `activateSubscription()` exists |
| Change subscription state | None | ⚠️ `setClubSubscriptionStatus()` allows |
| Upgrade/downgrade plan | None | ⚠️ `upsertClubSubscription()` allows |
| Cancel subscription | None | ⚠️ Not implemented but no guard |
| Modify billing transactions | RLS | ✅ No update functions exist |
| Create purchase intent | None | ⚠️ No guard (admin could call) |

### 7.2 Billing Enforcement Bypass

**SSOT_BILLING_ADMIN_RULES v1.0 §6.3:**
> "Admin MUST NOT bypass billing checks"

**Current State:** `enforceClubAction()` and `enforceEventPublish()` have no admin bypass.

**Verdict:** ✅ No bypass mechanism exists.

### 7.3 Source Attribution Guard

**SSOT_BILLING_ADMIN_RULES v1.0 §1.3:**
> "Every Admin-induced billing mutation MUST declare `source = admin`"

**Current State:** No `source` field on `billing_credits` table.

**GAP:** Cannot enforce source attribution at data level.

---

## 8. GAP LIST (Numbered, Explicit)

### GAP-1: Admin Actor Identity

**What is missing:** `AdminContext` lacks actor identity (`actorId`).

**Where it should live:** `lib/auth/resolveAdminContext.ts` (auth layer)

**SSOT violation:** SSOT_ADMIN_AUDIT_RULES v1.0 §3.1 — `actor_id` is MANDATORY.

---

### GAP-2: Admin Audit Action Codes

**What is missing:** Action codes `ADMIN_GRANT_CREDIT`, `ADMIN_EXTEND_SUBSCRIPTION`, `ADMIN_GRANT_CREDIT_REJECTED`, `ADMIN_EXTEND_SUBSCRIPTION_REJECTED`.

**Where it should live:** `lib/services/adminAuditLog.ts` (new service) or extended `clubAuditLog.ts`

**SSOT violation:** SSOT_ADMIN_AUDIT_RULES v1.0 §4 — predefined action codes required.

---

### GAP-3: Atomic Audit

**What is missing:** Audit write is fire-and-forget, not atomic with mutation.

**Where it should live:** Service layer transaction wrapper

**SSOT violation:** SSOT_ADMIN_AUDIT_RULES v1.0 §5.1 — atomicity is MANDATORY.

---

### GAP-4: Credit Source Attribution

**What is missing:** `billing_credits.source` column (`'user' | 'admin' | 'system'`)

**Where it should live:** Database schema (`SSOT_DATABASE.md`)

**SSOT violation:** SSOT_BILLING_ADMIN_RULES v1.0 §1.3 — source attribution required.

---

### GAP-5: Admin Credit Grant Function

**What is missing:** Function to create credit without `sourceTransactionId` requirement, with `source='admin'`.

**Where it should live:** `lib/db/billingCreditsRepo.ts` or new `lib/services/adminBilling.ts`

**SSOT violation:** SSOT_BILLING_ADMIN_RULES v1.0 §3 — credit grant must work without purchase.

---

### GAP-6: Guarded Subscription Extension Function

**What is missing:** Function `extendSubscriptionExpiration()` that ONLY modifies `expires_at`.

**Where it should live:** `lib/services/adminBilling.ts` (service layer with guards)

**SSOT violation:** SSOT_BILLING_ADMIN_RULES v1.0 §4.1 — only `expires_at` may be modified.

---

### GAP-7: Admin Audit Table Actor Support

**What is missing:** `club_audit_log.actor_user_id` assumes user. Admin has no user_id.

**Where it should live:** Schema change: `actor_type` + nullable `actor_user_id` OR separate admin audit table.

**SSOT violation:** SSOT_ADMIN_AUDIT_RULES v1.0 §3.1 — audit must identify admin actor.

---

### GAP-8: Admin API Endpoints

**What is missing:** All `/api/admin/users/*`, `/api/admin/clubs/*`, `/api/admin/audit` endpoints.

**Where it should live:** `src/app/api/admin/` route handlers

**SSOT violation:** SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2 — pages require backend APIs.

---

### GAP-9: Guardrails Against Forbidden Mutations

**What is missing:** Guards preventing admin from calling `upsertClubSubscription()`, `activateSubscription()`, `setClubSubscriptionStatus()` with forbidden parameters.

**Where it should live:** Service layer (admin billing service should NOT expose these functions)

**SSOT violation:** SSOT_ADMIN_DOMAIN v1.0 §6 — forbidden operations must be prevented.

---

## 9. Risks if Implementation Starts Without Fixing Gaps

| Risk | Severity | Description | Affected GAP |
|------|----------|-------------|--------------|
| **Unattributable actions** | HIGH | Cannot determine which admin performed an action during incident investigation | GAP-1, GAP-7 |
| **Audit integrity failure** | HIGH | If audit write fails, mutation succeeds but no record exists. Violates compliance. | GAP-3 |
| **Credit source ambiguity** | MEDIUM | Cannot distinguish admin-granted vs user-purchased credits for support/audit | GAP-4, GAP-5 |
| **Forbidden mutation possible** | HIGH | Admin code could accidentally call functions that change plan/status | GAP-6, GAP-9 |
| **Incomplete audit trail** | MEDIUM | Admin actions use undefined action codes, breaking audit filtering/reporting | GAP-2 |
| **API implementation blocked** | HIGH | UI pages cannot be built without corresponding API endpoints | GAP-8 |
| **Schema migration required** | LOW | Adding `source` column requires migration before credit grant can work | GAP-4 |

---

## Appendix A: File References

| File | Relevance |
|------|-----------|
| `src/lib/auth/resolveAdminContext.ts` | Admin auth resolver (Phase 1) |
| `src/lib/auth/resolveCurrentUser.ts` | User auth resolver (NOT for admin) |
| `src/middleware.ts` | Admin route protection (lines 81-84, 388-403) |
| `src/app/api/admin/cache/clear/route.ts` | Only existing admin endpoint |
| `src/lib/db/billingCreditsRepo.ts` | Credit CRUD, `createBillingCredit()` |
| `src/lib/db/clubSubscriptionRepo.ts` | Subscription CRUD, lacks guards |
| `src/lib/db/clubAuditLogRepo.ts` | Audit append (fire-and-forget) |
| `src/lib/services/clubAuditLog.ts` | Club audit action codes |
| `src/lib/services/accessControl.ts` | Billing enforcement (no admin bypass) |

---

## Appendix B: SSOT Cross-References

| Document | Sections Reviewed |
|----------|-------------------|
| SSOT_ADMIN_DOMAIN v1.0 | §1–§10 (full) |
| SSOT_BILLING_ADMIN_RULES v1.0 | §1–§10 (full) |
| SSOT_ADMIN_AUDIT_RULES v1.0 | §1–§10 (full) |
| SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 | §1–§7 (full) |
| SSOT_ARCHITECTURE.md | §8.2, §8.3 (Auth Context Types) |
| SSOT_DATABASE.md | §club_audit_log, §billing_credits |
| SSOT_API.md | §2.3.2 (Admin Routes), API-047 |
| SSOT_BILLING_SYSTEM_ANALYSIS.md | §Credit Grant, §Subscription |
| ADR-001 | Auth context model |
| ADR-001.5 | RSC Access Rule |
| ARCHITECTURAL_DEBT_LOG.md | DEBT-005 (Admin Context Formalization) |

---

**END OF DIAGNOSTIC REPORT**
