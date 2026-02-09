# Need4Trip — SSOT_ARCHITECTURE (Single Source of Truth)

**Status:** 🟢 Production Ready  
**Last Updated:** 2026-02-02  
**Version:** 5.4  
**Authority:** This document is the ONLY authoritative source for architectural decisions in Need4Trip.

---

## 0. Non-Negotiables

### 0.1 SSOT Supremacy
- This SSOT defines architecture rules. If code conflicts with this SSOT, code must change.
- If another doc conflicts with this SSOT, the other doc must be updated or marked obsolete (see §18).
- No “temporary deviations” without explicit, dated Exception Record (see §18.6).

### 0.2 SSOT Set (Mandatory Reading)
Before changing anything, read the relevant SSOT(s). After change, update SSOT(s) in the same commit.
- `SSOT_ARCHITECTURE.md` (this doc)
- `SSOT_DATABASE.md` (schema, RLS, indexes, migrations)
- `SSOT_API.md` (endpoints, auth/rate limits, request/response contracts)
- `SSOT_BILLING_SYSTEM_ANALYSIS.md` (plans, limits, credits, paywall)
- `SSOT_CLUBS_EVENTS_ACCESS.md` (RBAC, access rules)
- `SSOT_DESIGN_SYSTEM.md` (UI system, components, modal rules)
- `SSOT_TESTING.md` (tests, coverage, gates)

---

## 1. Purpose & Scope

### 1.1 Purpose
Provide a single authoritative reference for:
- System boundaries and layering
- Runtime constraints (Server/Client/Edge)
- Data access contracts (Repo/Service/API)
- Error model, loading model, incomplete actions behavior
- Observability minimum and operational rules
- Governance: precedence, change process, exceptions

### 1.2 In Scope
- Architecture and cross-cutting standards (NFR)
- Module ownership map
- Contracts and forbidden patterns
- Operational behavior (errors, retries, idempotency, caching, logs)

### 1.3 Out of Scope
- Feature-level specs (except where needed to define cross-cutting rules)
- Detailed UI design (owned by `SSOT_DESIGN_SYSTEM.md`)
- Detailed billing rules (owned by `SSOT_BILLING_SYSTEM_ANALYSIS.md`)
- Detailed RBAC matrices (owned by `SSOT_CLUBS_EVENTS_ACCESS.md`)

---

## 2. High-Level Architecture

### 2.1 Stack (Normative)
- Next.js App Router
- React (Server Components default, Client Components as needed)
- TypeScript strict
- Tailwind + shadcn/ui
- Supabase PostgreSQL + RLS
- JWT auth via HTTP-only cookies
- Vercel deployment model

### 2.2 Layered Model (Canonical)
Allowed flows:

**Client Components**
UI → API Route → Service → Repository → DB

**Server Components**
UI → Service → Repository → DB  
(Server Components may skip API layer ONLY for server-only reads/mutations that never run in the browser)

Forbidden flows:
- UI → Repository (never)
- API → DB (never)
- Repository → Service (reverse dependency)
- Any layer importing “upwards”

### 2.3 Boundary Principles
- **Validate at boundaries:** request validation at API; domain validation at Service; DB constraints at DB.
- **Explicit > implicit:** all runtime boundaries must be visible in code structure and imports.
- **Single responsibility:** each module has one job; cross-cutting logic has an owner module.

---

## 3. Directory & Ownership (Canonical)

### 3.1 Directory Layout (Normative)
- `src/app/**` — routes, layouts, RSC pages, API routes
- `src/components/**` — UI components (client/server as needed)
- `src/lib/**` — business logic + infrastructure
  - `lib/db/**` repositories + DB infrastructure (server-only)
  - `lib/services/**` domain/business services (server-only)
  - `lib/auth/**` authentication infrastructure (server-only)
  - `lib/api/**` response helpers + client parsing contracts
  - `lib/cache/**` caching infrastructure
  - `lib/errors/**` canonical error types
  - `lib/ui/**` async action orchestration (client-safe if needed)
- `docs/ssot/**` — SSOT docs
- `supabase/migrations/**` — DB migrations

### 3.2 Ownership Map (Rule)
- Every “cross-cutting” concern must have exactly one canonical owner module (file or folder).
- Duplicate implementations are treated as defects (must be eliminated).

Maintain an Ownership Map table (append-only; deprecations via archive):
- Auth current user source(s)
- Response envelope + parsing
- Error mapping
- Caching primitives
- Billing enforcement entrypoints
- Effective event entitlements (limits)
- Idempotency wrapper(s)
- Async UI action controller
- Hydration/batch loaders
- Permissions/visibility enforcement utilities

**Key ownership entries:**

| Concern | Canonical Module |
|---|---|
| Billing enforcement (club) | `lib/services/accessControl.ts` → `enforceClubAction()` |
| Billing enforcement (event publish) | `lib/services/accessControl.ts` → `enforceEventPublish()` |
| Effective event limits (SSOT) | `lib/services/eventEntitlements.ts` → `getEffectiveEventEntitlements()` |
| Plan data (cached) | `lib/db/planRepo.ts` (StaticCache, TTL 5 min) |
| Product data (cached) | `lib/db/billingProductsRepo.ts` (StaticCache, TTL 5 min) |
| Feedback submission + admin read | `lib/services/feedbackService.ts` → `submitFeedback()`, `getAdminFeedback()` |

---

## 4. Runtime Boundaries (Server / Client / Edge)

### 4.1 Default Runtime
- Default API runtime: Node.js
- Edge runtime: forbidden unless explicitly justified and compatible with dependencies (see §4.4)

### 4.2 Server Components (Default)
Use Server Components by default.
Client Components are allowed only when you need:
- browser APIs
- event handlers
- hooks/state
- context providers

> **RSC Access Rule:** Server Components MUST call service-layer functions directly and MUST NOT call authenticated HTTP API routes. See ADR-001.5 for rationale and enforcement.

### 4.3 Server-Only Modules (Mandatory)
Modules that MUST include `import 'server-only'` (directly or via boundary):
- `lib/db/**`
- `lib/services/**`
- `lib/auth/**` (JWT, secrets)
- any code using service role key / admin client
- any module that reads secrets directly

### 4.4 Edge Runtime Policy
Edge runtime is FORBIDDEN for:
- Supabase admin client usage
- heavy dependencies
- routes requiring revalidation operations incompatible with Edge constraints

Allowed Edge use-cases (rare):
- lightweight redirects
- middleware that does not import server-only modules

All Edge usage must include:
- explicit `runtime = 'edge'`
- a justification note + dependency audit reference

---

## 5. Data Access Architecture (Repo → Service → API)

### 5.1 Repository Layer (`lib/db/*`)
Responsibilities:
- DB queries and persistence
- explicit column selection for listing endpoints
- mapping DB snake_case ↔ domain camelCase
- query optimization and batch operations

Rules:
- Repos MUST NOT contain business rules, RBAC decisions, or HTTP logic
- Repos MUST return domain types or repo-owned DTOs (no raw DB rows in Services/UI)
- Repos MUST throw canonical Internal/DB errors (see §11)

### 5.2 Service Layer (`lib/services/*`)
Responsibilities:
- business rules and invariants
- authorization checks and policy enforcement
- orchestration of multiple repos
- domain-level validation (beyond request validation)

Rules:
- Services MUST NOT return Response objects / status codes
- Services MUST be callable from both API routes and Server Components (server-only)
- Services MUST be idempotency-aware for writes (via wrapper, §9)

### 5.3 API Route Layer (`app/api/**/route.ts`)
Responsibilities:
- parse HTTP request
- validate with Zod
- call Service
- return response envelope (see §10)

Rules:
- API routes MUST NOT contain business logic
- API routes MUST NOT call repositories directly
- API routes MUST format all errors via canonical responder

---

## 6. Type System & Validation

### 6.1 Type Rules
- TypeScript strict, no `any`
- External inputs validated with Zod
- Domain types separated from DB types
- All mappings explicit; no “partial mapping” that silently drops fields

### 6.2 Validation Layers
- API: validate shape and basic constraints (Zod)
- Service: validate domain rules and state transitions
- DB: constraints + RLS + checks

---

## 7. Caching Strategy

### 7.1 Reference Data (StaticCache Only)
Reference data (currencies, cities, categories, vehicle types, plans, billing products, etc.) MUST use the canonical StaticCache mechanism.

**Currently cached repositories:**
- `planRepo.ts` — `club_plans` (TTL 5 min, key: planId)
- `billingProductsRepo.ts` — `billing_products` (TTL 5 min, key: code)
- Other reference data repos (cities, currencies, categories, vehicle types, car brands)

Rules:
- TTL-based, bounded, race-safe
- Do not introduce ad-hoc in-memory caches elsewhere

### 7.2 User-Specific / Rapidly Changing Data
Must be fetched fresh (no caching) unless explicitly designed with shared cache (e.g., Redis) and invalidation strategy.

### 7.3 Next.js Caching Controls
- User-auth APIs: `dynamic = 'force-dynamic'`, `revalidate = 0`
- Frequently changing public data (events listings): same
- Stable public reference data: revalidate allowed only if SSOT_DATABASE/SSOT_API confirm safety

---

## 8. Authentication & Authorization

### 8.1 Auth Source of Truth
Auth mechanism: Telegram OAuth → JWT in HTTP-only cookie.
- Server obtains `CurrentUser` through canonical server-side resolver.
- Client obtains `CurrentUser` from AuthContext only (no mixing approaches).

### 8.2 Canonical Auth Resolver (NORMATIVE)

There is exactly ONE canonical server-side auth resolver:

```
resolveCurrentUser(req?) → CurrentUser | null
```

**Location:** `lib/auth/resolveCurrentUser.ts`

**Invariants:**
- Auth resolution MUST be transport-agnostic.
- The resolver encapsulates a deterministic fallback chain (middleware headers → cookies → null).
- API routes and RSC MUST NOT resolve auth manually.
- Direct reading of cookies or `x-user-id` headers outside `lib/auth` is FORBIDDEN.

**Usage:**
- API route handlers: `resolveCurrentUser(req)`
- RSC / Server Components: `resolveCurrentUser()` (no argument)

**Ownership:**
- Auth resolution logic is owned exclusively by `lib/auth`.
- No other module may implement or duplicate auth resolution logic.

> **ADR Reference:** See ADR-001.1 for architectural decision and rationale.

### 8.3 Auth Context Types (NORMATIVE)

This section defines platform-level authentication context taxonomy. One domain MUST use exactly one auth context type.

**User Context**

Represents authenticated end users interacting with the platform.

| Property | Value |
|----------|-------|
| **Resolution** | ONLY via `resolveCurrentUser(req?)` |
| **Identity** | `CurrentUser` type (user_id, profile data) |
| **Domains** | Clubs, Billing, Events, Profile |
| **Audit** | Full audit trail via user_id |

**User Context** is the default for all user-initiated domains:
- Any action triggered by a user in the UI
- Any API request from a browser or mobile client
- Billing operations (purchases, subscription changes)

**Admin Context**

Represents internal administrative actions, NOT an end user.

| Property | Value |
|----------|-------|
| **Resolution** | `resolveAdminContext(req)` in `lib/auth/resolveAdminContext.ts` |
| **Identity** | Stable `actorId` (see Phase 3 below) |
| **Domains** | Admin tools (`/api/admin/*`) |
| **Audit** | Full attribution via `admin_audit_log` table |

**Admin Context** is explicitly NOT a user:
- MUST NOT use `resolveCurrentUser()` (admin has its own resolver)
- MUST authenticate via one of two paths (see Phase 3 below)
- MUST NOT have access to user-scoped data without explicit audit
- Admin actions MUST be logged to `admin_audit_log` with actor attribution

**AdminContext Type (Phase 3 — User-based Admin Extension):**
```typescript
interface AdminContext {
  type: 'admin';
  actorType: 'admin';
  actorId: string;  // Stable, non-null (see paths below)
  authenticatedVia: 'user-session' | 'shared-secret';
}
```

**Two Explicit Authentication Paths:**

| Path | Mechanism | actorId | authenticatedVia | Use Case |
|------|-----------|---------|------------------|----------|
| **User-based Admin** (PRIMARY) | Cookie/JWT session + `ADMIN_USER_EMAILS` allowlist | `user:<userId>` | `'user-session'` | Admin UI (browser) |
| **Machine-based Admin** (FALLBACK) | `x-admin-secret` header | `ADMIN_ACTOR_ID` env or `'admin-default'` | `'shared-secret'` | CLI, scripts, ops |

**Resolution Order:**
1. Check user session + email allowlist (user-based admin)
2. If no valid admin user → check `x-admin-secret` header
3. Return null if neither path succeeds

**Security Invariants:**
- Admin UI does NOT own, store, inject, or proxy secrets
- User auth and admin auth remain distinct contexts
- No admin login UI, no admin JWTs, no new auth endpoints
- Email allowlist is server-side only (client cannot bypass)

**Cross-Reference:**
- SSOT_ADMIN_AUDIT_RULES v1.0: Audit requirements and structure
- SSOT_ADMIN_DOMAIN v1.0: Admin scope and allowed operations
- ADMIN_UI_CONTRACT v1.0: Admin UI non-authoritative rules

**System Context**

Represents background jobs, cron tasks, and system-triggered actions.

| Property | Value |
|----------|-------|
| **Resolution** | Explicit system identity passed to services |
| **Identity** | No user identity; task/job identifier |
| **Domains** | Cron jobs (`/api/cron/*`), background workers |
| **Audit** | Task execution logged, no user attribution |

**System Context** is explicitly NOT a user:
- MUST NOT use `resolveCurrentUser()`
- MUST authenticate via `CRON_SECRET` or equivalent
- MUST NOT perform user-scoped mutations without explicit design
- Explicit SystemContext type is deferred (see ARCHITECTURAL_DEBT_LOG.md)

**Cross-Reference:**
- ADR-001.1: Canonical user auth model and rationale
- ARCHITECTURAL_DEBT_LOG.md: Admin and System context formalization debt

### 8.4 Authorization Source of Truth
- RBAC and club/event access rules are owned by `SSOT_CLUBS_EVENTS_ACCESS.md`.
- Architecture rule: authorization decisions must live in Service layer (or canonical utilities invoked by Service).
- RLS is mandatory but not sufficient: Service must still enforce app policies.

---

## 9. Idempotency & Concurrency (Writes)

### 9.1 Idempotency (Mandatory for Mutations)
All POST/PUT/DELETE that can be retried by browser/network MUST be idempotent.
- Use a canonical idempotency key strategy (per endpoint contract in `SSOT_API.md`)
- Store idempotency records via repo-owned persistence
- Returning a cached success result is allowed only if it is the exact same operation

### 9.2 Concurrency Policy
- Avoid race conditions by centralizing “phase state” for UI actions (see §14)
- Server: enforce unique constraints and consistent checks at DB + Service

---

## 10. API Response Envelope & Client Parsing

### 10.1 Canonical Envelope (Mandatory)
All API responses must follow:
- Success: `{ ...data }` (with stable keys)
- Error: `{ error: { code, message, details? } }`

### 10.2 Status Codes (Normative)
- 200/201: success
- 400: validation error
- 401: unauthenticated
- 403: forbidden (authenticated but not allowed)
- 404: not found
- 409: conflict (including “requires confirmation” patterns)
- 429: rate limit
- 500: internal error

### 10.3 Client Parsing (Mandatory)
Client must use canonical `parseApiResponse<T>()` and must not:
- rely on `res.ok` with manual branching
- display raw error objects
- swallow errors silently

---

## 11. Error Handling (Server + Client)

### 11.1 Error Taxonomy (Canonical)
All errors must be represented as one of:
- Auth errors: UNAUTHORIZED / FORBIDDEN
- Validation errors: VALIDATION_FAILED
- Not found: NOT_FOUND
- Conflict: CONFLICT / CONFIRMATION_REQUIRED
- Rate limit: RATE_LIMITED
- Internal: INTERNAL_ERROR

### 11.2 Error Surface Rules (UI)
UI must never:
- show API/domain errors as “success” toasts
- show stack traces
- leak internal details

UI must:
- use inline error surfaces for form submission errors
- use page-level error state for screen-load failures
- show neutral hint for implicit aborts (see §15)

---

## 12. Loading & UI State Model

### 12.1 Canonical UI States
For any screen or component data load:
- Idle (not started)
- Loading (initial)
- Refreshing (soft reload; data exists)
- Success
- Empty (success but no content)
- Error (failed)

### 12.2 Loading Taxonomy (Mandatory)
- **Screen skeleton:** initial page fetch
- **Section skeleton:** partial data load
- **Inline spinner:** small actions
- **Button pending:** form submit / mutation

Rule: pick the smallest scope indicator that correctly reflects what is blocked.

---

## 13. Client Data Fetching (Hooks Only)

### 13.1 Rule
Client Components must not perform ad-hoc fetch in random components.
All fetches go via canonical hooks in `src/hooks/**` or via server components fetching server-side.

### 13.2 Hook Contract
A canonical hook returns:
- `data`
- `loading` / `refreshing` (if applicable)
- `error` (typed / normalized)
- `reload()` trigger

Hooks must:
- clean up on unmount
- use stable dependencies only
- log structured diagnostics (no console spam)

---

## 14. Async Actions & Forms (Canonical Orchestration)

### 14.1 Universal Action Controller
All non-trivial async UI actions (create/update/publish/pay) must use a canonical orchestration primitive:
- phases: idle → pending → success|error|cancelled
- supports retries
- guarantees no double-submit
- allows user cancellation semantics

### 14.2 Form Submission Rules
- Disable submit while pending
- Never “optimistically” show success before server confirms
- On recoverable errors: show inline surface + retry path
- On validation errors: map to field errors when possible

---

## 15. Aborted / Incomplete Actions (Canonical System Behavior)

### 15.1 Definitions
- **Explicit Abort:** user intentionally cancels (close modal, press cancel).
- **Implicit Abort:** interruption without explicit intent (network drop, tab close, app refresh, lost auth, payment redirect return without completion).

### 15.2 Canonical Rules
- Pending != error (pending may resolve later; do not lie to user)
- Payment success != action success (must confirm server-side operation result)
- Retry must be safe (idempotency required)

### 15.3 UI Rules
- Explicit abort → silent return (no hint, no toast)
- Implicit abort → neutral, non-alarming hint (“Action was not completed. Please try again.”)
- If server state is unknown → UI must re-check status on next relevant entrypoint

### 15.4 Server Rules
- Any state transition must be persisted or rejected deterministically
- Never leave “half-created” records without clear state markers (owned by DB SSOT)
- Use idempotency records for write endpoints that can be retried

---

## 16. Failure Modes & Degradation Rules

### 16.1 Categories
- Network / timeout
- Auth expired
- Rate-limited
- Validation mismatch (client/server drift)
- Dependency outage (DB, Supabase)
- Partial dependency failure (reference data cache reload fails)

### 16.2 Degradation Policy
- Reference cache reload failure: keep last known good data where safe
- For critical mutations: fail with explicit error surface + retry path
- For non-critical reads: show partial UI with clear fallback states

---

## 17. Observability Minimum (Mandatory)

### 17.1 Structured Logging
All server logs must:
- be structured (key/value)
- include request correlation id (if available)
- include error code and canonical message

### 17.2 Metrics (Minimum Set)
Track at least:
- request rate per endpoint
- latency p50/p95
- error rate per endpoint + code
- rate limit hits
- idempotency collisions

### 17.3 Sensitive Data Policy
Never log:
- JWTs, cookies, secrets
- PII beyond what is strictly needed (and only if policy allows)
- payment tokens / provider payloads

---

## 18. Governance: Precedence, Conflicts, Exceptions

### 18.1 Precedence Order
1) This SSOT (architecture)
2) Domain SSOTs (DB/Billing/Access/API/Design/Testing) for their owned concerns
3) Code (must match SSOT)
4) Non-SSOT docs (guides, notes)

### 18.2 Conflict Resolution
If SSOTs conflict:
- create a “Conflict Record” section in the newer SSOT update PR
- decide the single truth
- update all affected SSOTs in same PR, or block merge

### 18.3 Change Process (Definition of Done)
A PR that changes architecture MUST:
- update SSOT(s) in same commit
- remove dead code
- remove duplicate logic
- include “consistency checklist” evidence (see §19)

### 18.4 No Silent Deviations
Any deviation needs an Exception Record:
- what deviates
- why
- expiry date
- rollback plan
- owner

### 18.5 Archival Rules
Removed SSOT content must be archived (not silently deleted) if it may be useful for audits/postmortems.

---

## 19. SSOT-Linter Checklist (Mandatory for all PRs)

A PR is non-compliant if any item is violated.

### 19.1 Content Rules
- SSOT is framework-agnostic where possible (no “random component code” blocks unless demonstrating a strict pattern)
- No duplicated truth across SSOTs (link instead)
- All enums/strings that are “locked” must be marked as LOCKED

### 19.2 Structural Rules
- Clear section ownership
- No TODO that changes behavior without an owner and plan
- All “forbidden patterns” sections must be updated if new ones discovered

### 19.3 Engineering Rules
- No dead code
- No duplicated domain logic across layers
- Imports respect runtime boundaries
- Errors use canonical envelope + canonical mapping
- Aborted actions comply with §15

---

## 20. Forbidden Patterns (Hard Fail)

- UI calling repositories directly
- API routes calling DB directly
- Repository doing authorization
- Service returning HTTP Response objects
- Client importing server-only modules
- Ad-hoc fetch scattered across components
- Ad-hoc caches outside StaticCache / approved shared cache
- Non-canonical error envelopes
- Showing “success” UX while server outcome is unknown

---

## 21. Document History (Compressed)
- v5.5 (2026-02-02): Updated §8.3 Admin Context — Phase 3 (User-based Admin Extension). Added dual-path authentication: user-session (PRIMARY for Admin UI) and shared-secret (FALLBACK for ops). Cross-referenced ADMIN_UI_CONTRACT v1.0.
- v5.4 (2026-02-02): Updated §8.3 Admin Context — Phase 2 with stable `actorId` and `admin_audit_log` attribution. Cross-referenced SSOT_ADMIN_AUDIT_RULES v1.0.
- v5.3 (2026-01-29): Added RSC Access Rule reference in §4.2. RSC MUST call service layer directly (ADR-001.5).
- v5.2 (2026-01-29): Added §8.3 Auth Context Types (NORMATIVE). Defined platform-level auth context taxonomy (User, Admin, System). Renumbered §8.4 Authorization. Cross-referenced ARCHITECTURAL_DEBT_LOG.md for deferred context formalization.
- v5.1 (2026-01-27): Added §8.2 Canonical Auth Resolver (NORMATIVE). Locked `resolveCurrentUser(req?)` as the single transport-agnostic auth entry point.
- v5.0 (2026-01-13): Full SSOT rewrite, consolidation, explicit NFRs, governance, and canonical models.
- v4.6 (2026-01-01): SSOT-linter checklist introduced.
- v4.3–v4.4 (2026-01-01): Aborted/incomplete actions rules finalized (explicit vs implicit abort).
