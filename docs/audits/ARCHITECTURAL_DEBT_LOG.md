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
**Related:** SSOT_ARCHITECTURE.md §8.3, ADR-001.1 §10.2

### Description

Admin endpoints (`/api/admin/*`) use shared-secret authentication (`x-admin-secret` header) without:

1. **Admin identity** — No way to distinguish which admin performed an action
2. **Audit trail** — No logging of who accessed admin endpoints (only that they were accessed)
3. **Granular permissions** — All-or-nothing access; no role differentiation

### Why this is debt

* Violates principle of individual accountability
* Makes incident investigation difficult ("who did this?")
* No path to granular admin permissions without architectural change
* Single shared secret is a single point of compromise

### Why it is acceptable short-term

* Very limited admin surface (few endpoints, rarely used)
* Admin access is highly restricted (secret known only to system operators)
* No multi-admin team requiring differentiation
* Operational simplicity prioritized for early product stage

### Resolution Criteria

This debt should be addressed when **any** of the following becomes true:

* Multiple admins need differentiated access
* Compliance requirements mandate individual admin audit
* Admin tooling expands significantly
* Any incident requiring admin action attribution

### Expected resolution approach

1. Define `AdminContext` type with admin identity
2. Introduce admin authentication mechanism (e.g., admin JWT, SSO)
3. Add admin audit log with actor identity
4. Optionally: introduce admin roles/permissions

### Priority

Low — acceptable for current operational model

### Status

Open

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
**Related:** PHASE_B5-0_UI_FOUNDATION_IMPLEMENTATION.md, PHASE_B5-1_EVENT_CREATE_EDIT_IMPLEMENTATION.md

### Description

`BillingModalHost` is mounted **locally** inside the following page-level client components:

- `src/app/(app)/events/create/create-event-client.tsx`
- `src/app/(app)/events/[id]/edit/edit-event-client.tsx`

This deviates from the intended architecture where `BillingModalHost` is mounted **once at the application layout or global provider level** and shared across all pages.

The local mounting was introduced intentionally during Phase B5.1.

### Why this is debt

- Violates the "single global modal host" architectural invariant
- Introduces page-level responsibility for global UI infrastructure
- Breaks the mental model that billing UI is app-scoped, not page-scoped
- Creates a risk of accidental pattern copying to other pages

### Why it is NOT fixed now

- Phase B5.1 explicitly forbade changes outside Event Create / Edit files
- Modifying `layout.tsx` or global providers was out of scope by design
- `BillingModalHost` is idempotent and self-contained, limiting blast radius
- This approach allowed correct B5.0 infrastructure consumption without scope violation

### Why this is acceptable short-term

- The host does not leak state outside the page
- No duplication of business logic or infra code exists
- The deviation is explicit, localized, and documented
- It unblocks validation of B5.0 infrastructure in real flows

### Explicit Non-Solutions

The following are explicitly forbidden while this debt is open:

- Copying local `BillingModalHost` mounting to other pages
- Introducing additional page-level billing modal hosts
- "Fixing" this opportunistically during unrelated UI work

### Resolution Criteria

This debt should be addressed when:

- A phase explicitly allows global layout/provider changes, AND
- Billing UI usage expands beyond Event Create / Edit, OR
- A dedicated cleanup / architecture-hardening phase is scheduled

### Expected Resolution Approach

- Mount `BillingModalHost` once at the app layout or global provider level
- Remove local page-level wrappers
- Verify no behavior changes in existing billing flows

### Priority

Low–Medium (architectural hygiene)

### Status

Open

---

## Rules for this document

* Only **intentional** technical or architectural debt belongs here
* Each entry must explain **why it exists** and **why it was deferred**
* If an item becomes active work, it must move to a task tracker and be marked as resolved here
* This log should remain small and curated
