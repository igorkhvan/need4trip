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
**Related:** SSOT_BILLING_SYSTEM_ANALYSIS.md, SSOT_ARCHITECTURE.md §8.3

### Description

Billing endpoints have been audited and confirmed to operate in User Context (all operations are user-initiated). However, certain authorization checks are incomplete:

1. **Transaction ownership verification** — No explicit check that the requesting user owns the transaction they are querying or modifying.
2. **Credit ownership verification** — No explicit check that the requesting user owns the credit they are consuming.

These are **authorization** gaps, not **authentication** gaps. Authentication is correctly resolved via `resolveCurrentUser(req)`.

### Why this is debt

* Potential for horizontal privilege escalation (user A accessing user B's transactions)
* Relies on implicit constraints (e.g., UI only shows own transactions) rather than explicit backend enforcement
* Violates defense-in-depth principle

### Why it is NOT fixed now

* No known exploitation vector in production (UI scoping provides first-line protection)
* Billing domain was not the focus of auth resolution work
* Fix requires careful audit of all billing endpoints and service layer changes
* Risk assessment: Low (transactions are user-scoped at creation time)

### Resolution Criteria

This debt should be addressed when **any** of the following becomes true:

* Billing API is exposed to third-party integrations
* Admin tooling allows cross-user transaction operations
* Security audit mandates explicit ownership checks
* Any incident involving unauthorized billing access

### Expected resolution approach

1. Add `user_id` ownership check in `billingTransactionsRepo.ts` queries
2. Add `user_id` ownership check in `billingCreditsRepo.ts` queries
3. Add explicit ownership verification in billing service layer
4. Add test coverage for authorization boundaries

### Priority

Medium — authorization gap with implicit mitigation

### Status

Open

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

## Rules for this document

* Only **intentional** technical or architectural debt belongs here
* Each entry must explain **why it exists** and **why it was deferred**
* If an item becomes active work, it must move to a task tracker and be marked as resolved here
* This log should remain small and curated
