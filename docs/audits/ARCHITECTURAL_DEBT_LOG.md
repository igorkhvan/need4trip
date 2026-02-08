# Architectural Debt Log

This document tracks **consciously accepted technical and architectural debt**.
Each entry represents a known deviation, imperfection, or incomplete refactor that was **intentionally deferred**, with clear reasoning and resolution criteria.

This is **not** a backlog and **not** a TODO list.

---

## DEBT-001: Dead auth parameter in `getClubWithDetails()`

**Domain:** Clubs
**Area:** Data / Service layer
**Type:** Code hygiene / Architectural clarity
**Introduced:** 2026-01-27
**Related ADR:** ADR-001 — Unified Authentication Context Resolution

### Description

The service function `getClubWithDetails()` accepts a `currentUser` parameter but does not use it internally.

The API route `/api/clubs/[id]` passes the resolved user into this function, which creates the **false impression** that the returned data is viewer-dependent or access-controlled.

In reality:

* the service returns identical data regardless of user
* no access control is enforced at this layer
* the parameter is effectively dead code

### Why this is debt

* Misleading function signature increases cognitive load
* Suggests access semantics that do not exist
* Can confuse future contributors during audits or refactors

### Why it is NOT fixed now

* Endpoint is intentionally auth-agnostic
* No functional or security impact
* Fix would require refactoring service signatures and call sites without immediate benefit
* Architectural focus is currently on enforcing **correct auth resolution**, not code hygiene

### Resolution Criteria

This debt should be addressed when **any** of the following becomes true:

* `/api/clubs/[id]` becomes viewer-dependent
* `getClubWithDetails()` needs user-specific logic
* Clubs domain undergoes a planned refactor cycle

### Priority

Low

### Status

Open

---

## DEBT-002: Misleading `clubId` parameter in `/api/events`

**Domain:** Events / Clubs
**Area:** API integration / Data semantics
**Type:** Semantic mismatch / Integration debt
**Introduced:** 2026-01-27

### Description

The Club Profile Events Preview passes a `clubId` parameter to the global `/api/events` endpoint
(e.g. `/api/events?clubId=<clubId>&tab=upcoming`).

However:

* `clubId` is not defined in the API query schema
* the parameter is ignored by the backend
* the endpoint always returns **global public upcoming events**, not club-scoped events

This creates the false impression that Events Preview is scoped to the current club,
while in reality it is not.

### Why this is debt

* Misleading parameter usage obscures actual backend behavior
* UI and aggregation semantics appear inconsistent
* Blurs the domain boundary between Clubs and Events
* Increases the risk of incorrect future fixes

### Why it is NOT fixed now

* No functional failure occurs at runtime
* Events Preview is intentionally public and auth-agnostic
* A correct fix requires an explicit architectural decision:

  * extend `/api/events` to support club-scoping, or
  * introduce a dedicated club-scoped events endpoint
* This decision impacts API design and must be handled via a separate ADR

### Resolution Criteria

This debt should be addressed when any of the following occurs:

* Club-scoped event listing becomes a product requirement
* Event visibility rules are revisited
* A dedicated `/api/clubs/[id]/events` listing endpoint is introduced

### Priority

Medium

### Status

Open

---

## DEBT-003: Legacy auth helper functions not yet removed

**Domain:** Platform / Auth
**Area:** Infrastructure / Code hygiene
**Type:** Deprecation debt
**Introduced:** 2026-01-27
**Related ADR:** ADR-001.1 — Transport-Agnostic Authentication Context Resolution

### Description

The following auth helper functions are **deprecated** but remain in the codebase:

- `getCurrentUser()` in `lib/auth/currentUser.ts`
- `getCurrentUserFromMiddleware()` in `lib/auth/currentUser.ts`
- `getCurrentUserWithFallback()` in `lib/auth/currentUser.ts`

These functions have been replaced by the canonical `resolveCurrentUser(req?)` resolver, which:

- is transport-agnostic
- implements a deterministic fallback chain
- is the only approved entry point for auth resolution

All Clubs API routes have been migrated to use `resolveCurrentUser(req?)`. Legacy functions are no longer called by Clubs routes.

### Why this is debt

- Multiple auth resolution functions increase cognitive load
- Risk of future contributors using deprecated patterns
- Inconsistent naming and behavior across the codebase
- Code surface area larger than necessary

### Why they were NOT removed now

1. **Non-Clubs routes still use legacy functions** — Removing them would require migrating all other API routes (Events, Profile, Billing, Admin, etc.)
2. **No functional or security impact** — Legacy functions still work correctly; they are not broken, just deprecated
3. **Risk management** — Full migration was scoped to Clubs domain first to validate the pattern before broader rollout
4. **ADR-001.1 scope** — The ADR explicitly scoped enforcement to "Clubs viewer-dependent routes"

### Resolution Criteria

This debt should be addressed when **any** of the following becomes true:

- A general auth infrastructure refactor is planned
- A non-Clubs route exhibits auth inconsistency bugs
- The team decides to enforce canonical auth across all domains
- Codebase audit requires removal of deprecated code

### Expected resolution approach

1. Migrate remaining routes to `resolveCurrentUser(req?)`
2. Add deprecation warnings or lint rules
3. Remove legacy functions
4. Update SSOT_API.md endpoint descriptions to remove legacy function references

### Priority

Low — no functional or security impact

### Status

Open

---

## DEBT-004: Billing Authorization Gaps

**Domain:** Billing
**Area:** Authorization / Data access
**Type:** Security / Authorization debt
**Introduced:** 2026-01-29
**Partially Resolved:** 2026-01-29
**Related:** SSOT_BILLING_SYSTEM_ANALYSIS.md, SSOT_ARCHITECTURE.md §8.3, BILLING_AUDIT_REPORT.md

### Description

Billing endpoints have been audited and confirmed to operate in User Context (all operations are user-initiated). However, certain authorization checks were incomplete:

1. **Transaction ownership verification** — No explicit check that the requesting user owns the transaction they are querying or modifying.
2. **Credit ownership verification** — No explicit check that the requesting user owns the credit they are consuming.
3. **Club subscription purchase authorization** — Any authenticated user could initiate subscription purchase for any club.

These are **authorization** gaps, not **authentication** gaps. Authentication is correctly resolved via `resolveCurrentUser(req)`.

### Why this was debt

* Potential for horizontal privilege escalation (user A accessing user B's transactions)
* Relies on implicit constraints (e.g., UI only shows own transactions) rather than explicit backend enforcement
* Violates defense-in-depth principle

### Resolution Progress

**2026-01-29 (Phase B1):**

| Gap | Status | Fix |
|-----|--------|-----|
| GAP-1: Transaction ownership | ✅ FIXED | `GET /api/billing/transactions/status` now verifies: user_id match OR club owner for club_id transactions. Returns 404 on mismatch (no existence leakage). |
| GAP-2: Club subscription purchase | ✅ FIXED | `POST /api/billing/purchase-intent` now requires club owner role for club subscription purchases. Returns 403 on unauthorized. |
| Credit ownership | ⚠️ MITIGATED | Repository functions trust caller; all callers pass `currentUser.id`. No exploitable path found. |

**Files changed:**
- `src/app/api/billing/transactions/status/route.ts`
- `src/app/api/billing/purchase-intent/route.ts`

### Remaining Items

* Credit ownership verification at repository level (defense-in-depth) — Low priority, no exploitable path

### Resolution Criteria for Full Closure

This debt can be marked CLOSED when:

* ~~GAP-1 (Transaction ownership) is fixed~~ ✅
* ~~GAP-2 (Club subscription purchase) is fixed~~ ✅
* Credit repo functions add explicit user_id scoping (optional, defense-in-depth)

### Priority

~~Medium~~ → Low — confirmed gaps fixed, remaining item is defense-in-depth

### Status

**PARTIALLY RESOLVED** — GAP-1 and GAP-2 fixed. Credit ownership remains implicit but safe.

---

## DEBT-005: Admin Context Formalization

**Domain:** Platform / Admin
**Area:** Authentication / Authorization / Audit
**Type:** Security / Architectural debt
**Introduced:** 2026-01-29
**Partially Resolved:** 2026-02-02
**Related:** SSOT_ARCHITECTURE.md §8.3, ADR-001.1 §10.2, SSOT_ADMIN_AUDIT_RULES v1.0

### Description

Admin endpoints (`/api/admin/*`) use shared-secret authentication (`x-admin-secret` header) without:

1. ~~**Admin identity** — No way to distinguish which admin performed an action~~ ✅ RESOLVED
2. ~~**Audit trail** — No logging of who accessed admin endpoints (only that they were accessed)~~ ✅ RESOLVED
3. **Granular permissions** — All-or-nothing access; no role differentiation

### Why this was debt

* Violates principle of individual accountability
* Makes incident investigation difficult ("who did this?")
* No path to granular admin permissions without architectural change
* Single shared secret is a single point of compromise

### Resolution Progress

**2026-02-02 (Phase A1.1 STEP 1):**

| Item | Status | Resolution |
|------|--------|------------|
| Admin identity | ✅ FIXED | `AdminContext` now includes stable `actorId` (from `ADMIN_ACTOR_ID` env or default) |
| Audit trail | ✅ FIXED | New `admin_audit_log` table with full actor attribution |
| Granular permissions | ⚠️ DEFERRED | All-or-nothing access remains; acceptable for single-admin model |

**Files changed:**
- `src/lib/auth/resolveAdminContext.ts` — Extended `AdminContext` with `actorId`
- `src/lib/audit/adminAuditActions.ts` — Canonical admin action codes
- `src/lib/audit/adminAuditLog.ts` — Admin audit service
- `src/lib/db/adminAuditLogRepo.ts` — Admin audit repository
- `supabase/migrations/20260202_create_admin_audit_log.sql` — New audit table

### Remaining Items

* Granular admin permissions (RBAC) — Deferred, not needed for single-admin model

### Resolution Criteria for Full Closure

This debt can be marked CLOSED when:

* ~~Admin identity is implemented~~ ✅
* ~~Admin audit log exists with actor attribution~~ ✅
* Granular permissions are implemented (optional, deferred)

### Priority

~~Low~~ → Low — Core items resolved, granular permissions remain deferred

### Status

**PARTIALLY RESOLVED** — Admin identity and audit trail implemented. Granular permissions deferred.

---

## DEBT-006: System Context Formalization

**Domain:** Platform / System
**Area:** Background jobs / Cron / Audit
**Type:** Architectural debt
**Introduced:** 2026-01-29
**Related:** SSOT_ARCHITECTURE.md §8.3, ADR-001.1 §10.2

### Description

Cron/system endpoints (`/api/cron/*`) and background jobs operate without an explicit `SystemContext`:

1. **No typed context** — Services receive no explicit marker that they are being called by system (not user)
2. **Implicit bypass** — System routes simply don't call `resolveCurrentUser()`, but this is implicit
3. **No system audit trail** — Task execution is logged, but no standardized "system actor" identity

### Why this is debt

* Services cannot distinguish user-initiated vs system-initiated calls at runtime
* Implicit "no user = system" convention is fragile
* No standardized way to audit system actions separately from user actions
* Future system operations may require explicit context (e.g., system-initiated billing cleanup)

### Why this is intentional

* Current system jobs are simple and infrequent
* No complex system-initiated workflows exist yet
* Explicit SystemContext adds complexity without immediate benefit
* Auth resolution work intentionally scoped to User Context first

### Resolution Criteria

This debt should be addressed when **any** of the following becomes true:

* System jobs need to perform user-scoped operations on behalf of the system
* Audit requirements mandate explicit system actor tracking
* New complex system workflows are introduced
* Service layer needs to branch logic based on caller context type

### Expected resolution approach

1. Define `SystemContext` type with job/task identifier
2. Modify system routes to explicitly create and pass `SystemContext`
3. Update service signatures to accept `UserContext | SystemContext | AdminContext`
4. Add system-specific audit logging

### Priority

Low — intentional deferral, no current operational impact

### Status

Open

---

## DEBT-007: Duplicate club-scoped events read endpoint

**Domain:** Events / Clubs
**Area:** API surface / SSOT compliance
**Type:** Duplication debt / Architectural clarity
**Introduced:** 2026-01-29
**Closed:** 2026-01-29
**Related:** SSOT_API.md §4.5, SSOT_ARCHITECTURE.md

### Description

The endpoint `GET /api/clubs/[id]/events` provided club-scoped event listing, duplicating read responsibility that canonically belongs to `GET /api/events`.

The canonical events listing endpoint `GET /api/events` supports query parameters for filtering (including club-scoping), making the club-specific endpoint redundant as a read surface.

### Why this was debt

* **Duplicated read surface** — Two endpoints served overlapping event-read responsibility, violating the single-responsibility principle for API design
* **Risk of divergence** — Filtering logic, pagination, visibility rules, and response format could drift between the two endpoints over time
* **SSOT violation risk** — SSOT §4.5 establishes canonical data access patterns; duplicate endpoints increased the risk of inconsistent behavior
* **Maintenance burden** — Changes to event listing behavior had to be synchronized across both endpoints

### Resolution

**Phase L2.1 (2026-01-29):**
1. Usage audit confirmed zero runtime callers
2. All UI components were already using canonical endpoint `GET /api/events?clubId=...`
3. Route handler `src/app/api/clubs/[id]/events/route.ts` permanently deleted
4. SSOT_API.md updated — API-057 marked as ⛔ REMOVED

**Canonical replacement:**
- `GET /api/events?clubId=<id>&tab=all&limit=<limit>` (API-025)

### Priority

~~Low~~ — Resolved

### Status

**CLOSED** ✅

API-057 removed in Phase L2.1 after zero-usage verification. Debt eliminated by endpoint removal rather than maintenance.

---

## DEBT-008: Local `BillingModalHost` mounting in Event Create / Edit

**Domain:** Billing / Events  
**Area:** UI Architecture / Composition  
**Type:** Architectural compromise / Scope-induced debt  
**Introduced:** 2026-01-30  
**Closed:** 2026-01-30  
**Related:** PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md, PHASE_B5-1_EVENT_CREATE_EDIT_IMPLEMENTATION.md

### Description

`BillingModalHost` was mounted **locally** inside the following page-level client components:

- `src/app/(app)/events/create/create-event-client.tsx`
- `src/app/(app)/events/[id]/edit/edit-event-client.tsx`
- `src/app/(app)/clubs/[id]/members/_components/club-members-content.tsx`

This deviated from the intended architecture where `BillingModalHost` is mounted **once at the application layout or global provider level** and shared across all pages.

The local mounting was introduced intentionally during Phase B5.1 and B5.3.

### Why this was debt

- Violated the "single global modal host" architectural invariant
- Introduced page-level responsibility for global UI infrastructure
- Broke the mental model that billing UI is app-scoped, not page-scoped
- Created a risk of accidental pattern copying to other pages

### Resolution

**Phase B5.D1 (2026-01-30):**

1. `BillingModalHost` moved to global root layout (`src/app/layout.tsx`)
2. Placed inside `AuthModalProvider`, wrapping the main app container
3. Removed local wrappers from all three page-level components:
   - `create-event-client.tsx` — wrapper removed, `useHandleApiError` retained
   - `edit-event-client.tsx` — wrapper removed, `useHandleApiError` retained
   - `club-members-content.tsx` — wrapper removed, `useHandleApiError` retained
4. All billing modals continue to work correctly (402 PAYWALL, 409 CREDIT_CONFIRMATION)
5. No behavioral or UX changes

**Verification:**
- TypeScript strict mode: ✅
- Production build: ✅
- Single BillingModalHost in runtime tree: ✅

### Priority

~~Low–Medium~~ — Resolved

### Status

**CLOSED** ✅

Debt eliminated in Phase B5.D1 (commit `8b0aea2`). `BillingModalHost` now follows the canonical "global modal host" pattern alongside `AuthModalHost`.

---

## DEBT-009: Hardcoded `"club_500"` in personal events branch of `accessControl.ts`

**Domain:** Billing
**Area:** Enforcement / Plan recommendations
**Type:** Consistency debt / Dynamic limits incomplete
**Introduced:** 2026-02-08
**Related:** SSOT_BILLING_SYSTEM_ANALYSIS.md §Тарифные планы, DYNAMIC_BILLING_LIMITS_BLUEPRINT.md

### Description

During the dynamic billing limits refactoring (2026-02-08), all hardcoded plan IDs in the **club events branch** of `accessControl.ts` were replaced with dynamic lookups (`getMinPlanForPaidEvents()`, `getMinPlanForCsvExport()`, `getRequiredPlanForParticipants()`).

However, the **personal events branch** of `enforceEventPublish()` still contains 2 hardcoded `"club_500"` references in `PaywallError.options`:

- **Line ~353:** When an already-upgraded event exceeds the credit limit (`paidMode === 'personal_credit'` and `maxParticipants > entitlements.maxEventParticipants`)
- **Line ~386:** When a personal event exceeds the one-off upgrade limit (`maxParticipants > oneOffLimit`)

In both cases, `recommendedPlanId: "club_500"` is hardcoded instead of being dynamically resolved.

### Why this is debt

* Inconsistency: club branch uses dynamic plan resolution, personal branch does not
* If plan tiers change (e.g., new plan between club_50 and club_500), the recommendation could be suboptimal
* Violates the principle established by the dynamic limits refactoring

### Why it is NOT fixed now

* **No functional impact** — The recommendation is cosmetic (UI shows "upgrade to Club 500"), not enforcement
* **Correct for current data** — With current plan tiers, "club_500" is the correct recommendation for >500 participants
* **Low risk** — Plan tier structure changes are infrequent and would require broader UI/UX review anyway
* **Context-specific** — Unlike club branch (where `getRequiredPlanForParticipants` can dynamically pick), personal branch always exceeds the one-off limit, making "club_500" semantically correct

### Resolution Criteria

This debt should be addressed when **any** of the following becomes true:

* New club plans are added between club_50 and club_500
* One-off upgrade product limit changes to something other than 500
* A broader refactoring of `enforceEventPublish` personal branch is planned

### Priority

Low — cosmetic only, no enforcement or security impact

### Status

Open

---

## DEBT-010: SSOT_BILLING missing `PUBLISH_REQUIRES_PAYMENT` and `CLUB_REQUIRED_FOR_LARGE_EVENT` reason codes

**Domain:** Billing / Documentation
**Area:** SSOT documentation completeness
**Type:** Documentation debt
**Introduced:** 2026-02-08
**Related:** SSOT_BILLING_SYSTEM_ANALYSIS.md §PaywallError структура

### Description

The "Причины paywall (reason codes)" table in SSOT_BILLING_SYSTEM_ANALYSIS.md lists 7 reason codes but is missing 2 that are actively used in the codebase:

| Missing Reason | Where Generated | Description |
|----------------|-----------------|-------------|
| `PUBLISH_REQUIRES_PAYMENT` | `accessControl.ts` ~line 423 | Personal event exceeds free limit, no credit available |
| `CLUB_REQUIRED_FOR_LARGE_EVENT` | `accessControl.ts` ~line 377 | Personal event exceeds one-off upgrade limit |

Both codes are:
- Implemented in `accessControl.ts`
- Handled in `reasonMapping.ts` (with proper UI copy and CTA configuration)
- Registered in `billing.ts` PAYWALL_REASONS type
- Used in the active personal events flow

### Why this is debt

* SSOT_BILLING claims to be the complete reference for paywall reasons but is incomplete
* New contributors reading only the SSOT would miss 2 reason codes
* Frontend `reasonMapping.ts` has full coverage, creating an asymmetry between doc and code

### Why it is NOT fixed now

* **No functional impact** — Code is correct and complete; only documentation lags
* **Low confusion risk** — The reason codes are self-descriptive and follow naming conventions
* **Audit-driven discovery** — This gap was found during a systematic audit, not during active development

### Resolution Criteria

This debt should be addressed when:

* SSOT_BILLING_SYSTEM_ANALYSIS.md undergoes its next version update
* Any billing reason code changes are made

### Expected resolution

Add both reason codes to the "Причины paywall" table in SSOT_BILLING_SYSTEM_ANALYSIS.md with their descriptions.

### Priority

Low — documentation only, no code impact

### Status

Open

---

## DEBT-011: Hardcoded "500" in `reasonMapping.ts` UI copy

**Domain:** Billing / UI
**Area:** UI copy / Dynamic limits consistency
**Type:** Consistency debt
**Introduced:** 2026-02-08
**Related:** SSOT_BILLING_SYSTEM_ANALYSIS.md §One-off Credits, reasonMapping.ts

### Description

In `src/lib/billing/ui/reasonMapping.ts`, the `CLUB_REQUIRED_FOR_LARGE_EVENT` reason config contains a hardcoded number in the user-facing message:

```
message: "Для событий более 500 участников требуется клуб."
```

The value "500" corresponds to `billing_products.EVENT_UPGRADE_500.constraints.max_participants`, which is now dynamic from DB. If this DB value changes, the UI copy will show an incorrect number.

### Why this is debt

* Backend enforcement uses dynamic limit from DB, but UI copy shows a static number
* Creates a potential inconsistency if the product constraint changes
* Violates the "limits from DB" principle established by the dynamic limits refactoring

### Why it is NOT fixed now

* **No current mismatch** — The DB value is currently 500, matching the hardcoded text
* **reasonMapping.ts is a static map** — It runs on the client side and does not have access to server-side DB values
* **Meta substitution exists** — The `meta` object in `PaywallError` contains `maxOneOffLimit`, which could be used for substitution, but this would require changing the UI layer to read `meta` for this specific reason
* **Low change probability** — The EVENT_UPGRADE_500 product name itself contains "500", suggesting this limit is unlikely to change without broader product changes

### Resolution Criteria

This debt should be addressed when:

* `billing_products.EVENT_UPGRADE_500.constraints.max_participants` value changes in DB
* A new one-off upgrade product with a different limit is introduced
* UI copy is refactored to use meta-driven message substitution

### Priority

Low — correct for current data, low probability of mismatch

### Status

Open

---

## DEBT-012: Fallback price `5000` in `billingCreditsRepo.ts` vs documentation value `1000`

**Domain:** Billing
**Area:** Error handling / Last-resort fallbacks
**Type:** Consistency debt
**Introduced:** 2026-02-08
**Related:** SSOT_BILLING_SYSTEM_ANALYSIS.md §One-off Credits

### Description

In `src/lib/db/billingCreditsRepo.ts` (~line 205), when the `EVENT_UPGRADE_500` product cannot be loaded from DB, a last-resort fallback price is used:

```typescript
price: product?.price ?? 5000  // dynamic from DB, last-resort fallback
```

However, SSOT_BILLING_SYSTEM_ANALYSIS.md documents the product price as `1000 KZT`.

The fallback value `5000` is a historical artifact from when the product price was 5000 KZT (before a price reduction).

### Why this is debt

* Fallback price does not match current documented/DB price
* If the product somehow fails to load, users would see an incorrect (inflated) price in the paywall modal
* Creates confusion when reading code vs documentation

### Why it is NOT fixed now

* **Last-resort only** — This fallback triggers only if `getProductByCode("EVENT_UPGRADE_500")` returns null, which should not happen in production (product is seeded in DB and cached)
* **No observed production impact** — The cache is always warm after first request; fallback has never been triggered
* **Safety margin** — Showing a higher price (5000) is arguably safer than showing a lower one, as it would not create false expectations
* **In beta mode** — During `SOFT_BETA_STRICT`, credits are auto-granted for free, so the price displayed is informational only

### Resolution Criteria

This debt should be addressed when:

* Beta mode ends and real payments are processed
* `billingCreditsRepo.ts` is refactored
* Fallback strategy is standardized across the codebase

### Priority

Low — last-resort fallback, no production impact during beta

### Status

Open

---

## DEBT-013: `SUBSCRIPTION_EXPIRED` reason code registered but never generated

**Domain:** Billing
**Area:** Type system / Dead code
**Type:** Code hygiene
**Introduced:** 2026-02-08
**Related:** SSOT_BILLING_SYSTEM_ANALYSIS.md §PaywallError структура

### Description

The reason code `SUBSCRIPTION_EXPIRED` is:

- Registered in `billing.ts` (`PAYWALL_REASONS` array)
- Has UI copy in `reasonMapping.ts` (title, message, CTA)
- Listed in SSOT_BILLING_SYSTEM_ANALYSIS.md reason codes table

However, `accessControl.ts` never generates a `PaywallError` with this reason. When a subscription is expired, the code uses `SUBSCRIPTION_NOT_ACTIVE` (which covers all non-active states: `grace`, `pending`, `expired`).

This means the `SUBSCRIPTION_EXPIRED` path in `reasonMapping.ts` is technically dead code — it can never be reached from the current enforcement logic.

### Why this is debt

* Dead reason code with UI mapping creates maintenance burden
* Distinction between EXPIRED and NOT_ACTIVE could be useful for UX (different copy)
* Creates ambiguity: documentation suggests EXPIRED is a separate case, code unifies it

### Why it is NOT fixed now

* **Reserved for future use** — If subscription status handling is refined, having a distinct `SUBSCRIPTION_EXPIRED` reason allows differentiated UX (e.g., "expired" vs "pending payment")
* **No functional impact** — `SUBSCRIPTION_NOT_ACTIVE` correctly covers expired subscriptions
* **Safe to keep** — The dead path in `reasonMapping.ts` causes no runtime overhead; it's a static map entry
* **Removal risk** — Removing now and re-adding later would require touching types, mapping, and documentation

### Resolution Criteria

This debt should be addressed when:

* Subscription status handling is refined to distinguish expired vs other non-active states
* A general billing reason codes cleanup is planned
* `accessControl.ts` is refactored to generate status-specific reasons

### Priority

Very Low — no functional, security, or performance impact

### Status

Open

---

## Rules for this document

* Only **intentional** technical or architectural debt belongs here
* Each entry must explain **why it exists** and **why it was deferred**
* If an item becomes active work, it must move to a task tracker and be marked as resolved here
* This log should remain small and curated
