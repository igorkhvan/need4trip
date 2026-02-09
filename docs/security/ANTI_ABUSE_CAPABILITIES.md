---
Status: ACTIVE
Created: 2026-02-09
Last reviewed: 2026-02-09
Owner: Platform / Architecture
Scope: Anti-abuse enforcement and observability
---

# Anti-Abuse Capabilities — Current State Inventory

---

## 1. Purpose

This document is a **factual inventory** of all anti-abuse and anti-anomaly mechanisms that exist in the Need4Trip system as of the date in the header.

It describes **what is implemented today** — enforcement, observability, and manual controls — and explicitly identifies what does **not** exist.

### What this document IS

- A canonical reference for the current anti-abuse posture of the system.
- A description of enforcement boundaries (what blocks abuse), observability boundaries (what detects abuse), and manual control boundaries (what an admin can act on).
- Useful for onboarding engineers and for security-sensitive decision-making.

### What this document is NOT

- It is **not** a proposal, roadmap, or plan.
- It is **not** an audit (audits are informative, time-bound artifacts in `docs/audits/`).
- It does **not** duplicate SSOT content; it references SSOTs where applicable.
- It does **not** contain recommendations or suggestions.

---

## 2. Enforcement Mechanisms (Active)

These mechanisms **actively block** abusive or invalid requests at runtime. They are server-side, cannot be bypassed from the client, and are always enabled.

### 2.1 Rate Limiting

| Aspect | Detail |
|--------|--------|
| Technology | Upstash Redis + `@upstash/ratelimit` (sliding window) |
| Runtime | Edge (Next.js middleware) |
| Scope | All `/api/*` routes, applied **before** authentication |
| Identifier | Client IP address (via `x-forwarded-for` / `x-real-ip`) |
| Graceful degradation | If Upstash Redis is unavailable, all requests pass through |

**Tier configuration:**

| Tier | Limit | Window | Applied to |
|------|-------|--------|------------|
| `critical` | 3 req | 1 min | Telegram auth, AI generate-rules |
| `write` | 10 req | 1 min | All POST/PUT/PATCH/DELETE (default for mutations) |
| `read` | 60 req | 1 min | All GET (default for reads) |
| `guest` | 5 req | 1 min | Guest participant registration endpoints |

**Exclusions from rate limiting:**
- Admin routes (`/api/admin/*` entries in `ADMIN_ROUTES` array) — protected by `x-admin-secret` instead.
- Cron routes (`/api/cron/*`) — protected by `x-vercel-cron` / `CRON_SECRET` instead.

**Response on limit exceeded:** HTTP 429 with `Retry-After: 60` header and `X-RateLimit-*` headers.

**Known constraint:** Rate limiting runs before JWT authentication. The identifier is always IP-based at the middleware level; `userId` is not available at this stage.

**Code pointers:**
- `src/middleware.ts` (enforcement)
- `src/lib/config/rateLimits.ts` (tier definitions and route mapping)

### 2.2 Authentication & Header Security

| Mechanism | Location | Behavior |
|-----------|----------|----------|
| JWT verification | `src/middleware.ts` | Verifies token for protected routes; injects `x-user-id` header |
| `x-user-id` stripping | `src/middleware.ts` | Strips incoming `x-user-id` on all requests to prevent spoofing (ADR-001) |
| Admin secret check | `src/middleware.ts` | `ADMIN_ROUTES` entries require `x-admin-secret` at middleware level |
| Cron secret check | `src/middleware.ts` | Cron routes require `x-vercel-cron` or `CRON_SECRET` |
| Telegram HMAC-SHA256 | `src/app/api/auth/telegram/route.ts` | Signature verification with `crypto.timingSafeEqual` |
| Telegram replay prevention | `src/app/api/auth/telegram/route.ts` | In-memory cache keyed by `{id}:{auth_date}:{hash}`; `auth_date` window: 10 min past / 5 min future |

**Known constraint:** Telegram replay cache is in-memory per Edge instance and is not shared across Vercel Edge instances.

### 2.3 Paywall & Entitlement Enforcement

All billing enforcement is server-side. The frontend does not decide limits; it reacts to HTTP 402 responses.

| Function | What it enforces | Error |
|----------|-----------------|-------|
| `enforceClubAction()` | Subscription status, plan limits (max participants, max members, paid events, CSV export) | `PaywallError` (402) |
| `enforceEventPublish()` | Free event limits, one-off credit consumption, club subscription requirements | `PaywallError` (402) or `CreditConfirmationRequiredError` (409) |

Plan limits are loaded from the `club_plans` database table via `getPlanById()`.

Non-active subscription states (`grace`, `pending`, `expired`) are validated against the `billing_policy_actions` table.

**Code pointer:** `src/lib/services/accessControl.ts`

### 2.4 Authorization Guards (Service Layer)

| Guard | Location | What it enforces |
|-------|----------|-----------------|
| Club role checks | `src/lib/db/clubMemberRepo.ts` | Owner/admin/member role validation |
| Event ownership | `src/lib/services/events.ts` | Only creator can update/delete events |
| Event visibility | `src/lib/utils/eventVisibility.ts` | Public/unlisted/restricted access rules |
| Registration eligibility | `src/lib/utils/eventPermissions.ts` | Closure, past event, limit, anonymous, club membership, duplicate checks |
| Forbidden admin operations | `src/lib/billing/admin/forbiddenOperationsGuard.ts` | Explicit blocklist of admin billing operations that always throw |

### 2.5 Idempotency Guards

| Aspect | Detail |
|--------|--------|
| Scope | Event create (`POST /api/events`) and event update (`PUT /api/events/[id]`) |
| Mechanism | `Idempotency-Key` header + DB-backed key storage (`idempotency_keys` table) |
| Isolation | RLS policy `idempotency_keys_user_isolation` prevents cross-user key access |
| Key TTL | 7 days (cleanup via `cleanup_old_idempotency_keys()` DB function) |

Idempotency is **not** implemented for: club creation, join requests, participant registration, or any other mutation endpoint.

**Code pointer:** `src/lib/services/withIdempotency.ts`

### 2.6 Database-Level Protections

**Row Level Security (RLS):** Enabled on 18+ tables. Key policies prevent anonymous mutations, non-owner modifications, and cross-user data access. The application uses service role for billing operations, which bypasses RLS.

**UNIQUE constraints:** Prevent duplicate registrations (`event_participants`), duplicate memberships (`club_members`), duplicate pending join requests (`club_join_requests`), duplicate Telegram accounts (`users`), and duplicate idempotency keys.

**CHECK constraints:** Enforce closed enum sets (visibility, roles, product codes, credit sources), field length minimums (event titles, club names), coordinate ranges, and billing consistency rules.

**Triggers:** Enforce club ID immutability on events, auto-increment event version (optimistic locking), auto-create owner membership on club creation, and auto-create free subscription on club creation.

Full details are in `docs/audits/ANTI_ABUSE_EXISTING_MECHANISMS_AUDIT.md` §6.

---

## 3. Observability & Detection (Read-Only)

These mechanisms **observe and surface** abuse signals. They do **not** block, suspend, or automate any actions.

### 3.1 Abuse Telemetry

| Aspect | Detail |
|--------|--------|
| Technology | Upstash Redis INCR + EXPIRE (same instance as rate limiting) |
| Pattern | Fire-and-forget — telemetry calls never block the request path |
| Graceful degradation | If Redis is unavailable, telemetry silently degrades to no-ops |

**Per-user metrics** (15-minute sliding window, TTL = 900 s):

| Redis key pattern | Metric | Instrumented at |
|-------------------|--------|----------------|
| `abuse:u:{userId}:events.create` | Event creation count | `POST /api/events` (both idempotent and fallback paths) |
| `abuse:u:{userId}:events.update` | Event update count | `PUT /api/events/[id]` (both paths) |
| `abuse:u:{userId}:events.delete` | Event deletion count | `DELETE /api/events/[id]` |
| `abuse:u:{userId}:clubs.create` | Club creation count | `POST /api/clubs` |
| `abuse:u:{userId}:join_requests.create` | Join request count | `POST /api/clubs/[id]/join-requests` |
| `abuse:u:{userId}:club_audit_log.actions` | Club audit actions | Declared in metric set but not yet instrumented at any call site |
| `abuse:u:{userId}:errors.402` | PaywallError count | Infrastructure exists but currently **not populated** — `respondError()` does not have access to userId |
| `abuse:u:{userId}:errors.403` | ForbiddenError count | Infrastructure exists but currently **not populated** — `respondError()` does not have access to userId |
| `abuse:u:{userId}:ai.generate_rules` | AI generation count | `POST /api/ai/events/generate-rules` |

**System-wide metrics** (per-minute bucket, TTL = 120 s):

| Redis key pattern | Metric | Instrumented at |
|-------------------|--------|----------------|
| `abuse:sys:total_writes:{minuteBucket}` | Total write operations per minute | All instrumented write endpoints (via `trackWriteAction`) |
| `abuse:sys:errors.429:{minuteBucket}` | Rate limit hits per minute | `src/middleware.ts` (on 429 response) |
| `abuse:sys:errors.402:{minuteBucket}` | PaywallError count per minute | `respondError()` in `src/lib/api/response.ts` |
| `abuse:sys:errors.403:{minuteBucket}` | ForbiddenError count per minute | `respondError()` in `src/lib/api/response.ts` |

**Active users tracking:** A Redis set (`abuse:active_users`, TTL = 900 s) tracks user IDs that triggered at least one per-user metric in the current window. Used by the aggregation layer to enumerate users for dashboard display.

**Code pointers:**
- `src/lib/telemetry/redisClient.ts` (Redis client)
- `src/lib/telemetry/abuseTelemetry.ts` (metric definitions, key builders, fire-and-forget functions)

### 3.2 Aggregation Service

The aggregation service reads from Redis telemetry counters and computes summaries. It contains no auth logic and no side effects.

| Function | What it returns |
|----------|----------------|
| `getAbuseOverview()` | System-wide metrics (current minute) + per-user summaries sorted by score |
| `getAbuseUsers()` | Per-user summaries sorted by score |

**Computed fields:**

- `createThenDelete`: `min(events.create, events.delete)` — heuristic for create-then-delete pattern.
- `score`: Weighted sum of all per-user metrics. Weights are arbitrary and for **sorting only**. Score does not trigger any automated action.
- `status`: Derived from score — `normal` (< 15), `watch` (15–29), `suspicious` (>= 30). Labels are a **visual aid only**.

**Code pointer:** `src/lib/services/adminAbuse.ts`

### 3.3 Admin Abuse Dashboard

| Aspect | Detail |
|--------|--------|
| Route | `/admin/abuse` |
| Component type | React Server Component (RSC) |
| Data source | Calls `getAbuseOverview()` directly from service layer (per ADR-001.5) |
| Auth gate | Inherited from admin layout gate (`/api/admin/health` check) |
| Auto-refresh | Client component calls `router.refresh()` every 7 seconds |

**Dashboard contents:**

- **System summary panel:** Write ops/min, 429 errors/min, 402 errors/min, 403 errors/min, active user count.
- **Per-user table:** userId, events.create, events.update, clubs.create, join_requests, club_audit_log.actions, errors.402, errors.403, create_then_delete (computed), ai.calls, score, status badge.
- **Status badges:** Normal (green), Watch (yellow), Suspicious (red).

**Explicit constraint:** This dashboard is **observability only**. It does not contain write actions, blocking controls, or suspension mechanisms.

**Code pointers:**
- `src/app/admin/abuse/page.tsx` (RSC page)
- `src/app/admin/abuse/_components/abuse-dashboard-client.tsx` (client display + auto-refresh)

### 3.4 Admin HTTP API (Machine Access)

Two read-only endpoints exist for programmatic access to abuse data. They are not used by the RSC dashboard (per ADR-001.5).

| Endpoint | API ID | Auth | Purpose |
|----------|--------|------|---------|
| `GET /api/admin/abuse/overview` | API-066 | `x-admin-secret` | System-wide overview + per-user top list |
| `GET /api/admin/abuse/users` | API-067 | `x-admin-secret` | Per-user summaries sorted by score |

Both endpoints are read-only. They have no side effects and no mutations.

**Code pointers:**
- `src/app/api/admin/abuse/overview/route.ts`
- `src/app/api/admin/abuse/users/route.ts`

### 3.5 Structured Logging

The application uses a structured logger (`src/lib/utils/logger.ts`) that outputs JSON in production (Vercel Logs). Key abuse-relevant log points:

- Middleware: rate limit exceeded warnings (includes pathname, method, tier, identifier).
- `respondError()`: PaywallError and AppError details (code, message, status).
- Route handlers: structured info/error logs for authentication failures, validation errors, and service-layer errors.

These logs are available in the Vercel dashboard. No external APM (Sentry, Datadog) is configured.

### 3.6 Existing Audit Logs (Database)

| Log | Table | Contents | Mode |
|-----|-------|----------|------|
| Admin audit log | `admin_audit_log` | Admin mutations (credit grants, subscription extensions) with mandatory reason, actor ID, result | Append-only, atomic with mutation |
| Club audit log | `club_audit_log` | Club management actions (member changes, role changes) with actor user ID | Fire-and-forget |

These are retrospective audit trails, not real-time detection mechanisms.

---

## 4. Manual Control Mechanisms

### 4.1 Controls That Exist

| Control | Mechanism | Scope |
|---------|-----------|-------|
| Grant billing credit | `POST /api/admin/users/[userId]/grant-credit` | Per-user, audit-logged |
| Extend subscription | `POST /api/admin/clubs/[clubId]/extend-subscription` | Per-club, audit-logged |
| Clear static cache | `POST /api/admin/cache/clear` | System-wide |
| View admin audit log | `GET /api/admin/audit` | Read-only, filterable |
| View abuse metrics | `/admin/abuse` dashboard | Read-only |
| Paywall mode toggle | `PAYWALL_MODE` env var (`hard` / `soft_beta_strict`) | System-wide, requires redeployment |

### 4.2 Controls That Do NOT Exist

The following manual control mechanisms are **not implemented** in the current system:

| Missing control | Impact |
|-----------------|--------|
| User suspension / ban | No way to disable a specific user account |
| Content moderation (flag/hide/remove events or clubs) | No way to hide or remove user-generated content |
| IP blocking | No manual IP blocklist beyond rate limiting |
| Feature flags / kill switches | No per-feature toggles; only `PAYWALL_MODE` env var exists |
| Admin action approval workflow | All admin mutations are single-step (no two-person rule) |
| Abuse-triggered alerts or notifications | No alerting is connected to the abuse telemetry |

---

## 5. Deferred / Indirect Invariants

The following constraints are currently enforced **indirectly** rather than through explicit anti-abuse mechanisms.

### 5.1 No Limit on Club or Event Creation Count

There is no server-side limit on how many clubs a user can create or how many events a user can create, beyond rate limiting (10 write ops / min). Billing enforcement (`enforceEventPublish`) limits events based on participant count and credit availability, but does not limit event count itself.

This is indirect because: the write rate limit (10/min) provides a soft ceiling, and the billing system gates events with larger participant counts. However, a user can create an unlimited number of small events within rate limits.

### 5.2 Guest Participant Registration

Guest participant registration (`POST /api/events/[id]/participants`) does not require authentication. Protection is limited to:
- Rate limiting: guest tier (5 req / min per IP).
- UNIQUE constraint: one registration per user per event (for authenticated users).
- Service-layer checks: registration eligibility (event open, not past, not full).

This is indirect because: there is no CAPTCHA, no proof-of-work, and no fingerprinting. A determined actor rotating IPs could create many guest registrations across different events.

### 5.3 AI Endpoint Cost Exposure

The `POST /api/ai/events/generate-rules` endpoint calls OpenAI and incurs per-request cost. Protection is:
- Authentication required.
- Rate limit: critical tier (3 req / min per IP).

This is indirect because: the rate limit constrains velocity per IP, but there is no per-user daily quota or cost cap.

### 5.4 Billing Webhook Signature

The billing webhook (`POST /api/billing/webhook`) does not validate a cryptographic signature from the payment provider. Authentication relies on looking up `provider_payment_id` in the database. If the ID exists and is in `pending` status, the transaction is settled.

This is indirect because: an attacker would need to guess a valid pending `provider_payment_id` (UUID), which is computationally infeasible, but the protection is not cryptographic.

**These indirect invariants are sufficient for the current scale. They must be revisited before significant expansion of user base, feature surface, or billing volume.**

---

## 6. Explicit Non-Goals

The following mechanisms are **intentionally not implemented** and are not planned in any active ADR or blueprint:

| Mechanism | Reason for exclusion |
|-----------|---------------------|
| CAPTCHA / reCAPTCHA | Degrades UX in Telegram WebApp context; rate limits and billing guards are sufficient at current scale |
| Browser fingerprinting | Privacy concerns, GDPR implications, heavy client-side infrastructure |
| Machine learning / anomaly detection | Overengineering for current scale (< 1000 users); simple counters are sufficient |
| Behavioral sequence analysis | Requires event stream processing infrastructure (Kafka/Kinesis) not justified at current scale |
| Geo-IP anomaly detection | Requires GeoIP database; low ROI at current scale |
| Automated blocking or suspension | The system is observability-first; all blocking decisions are deferred to human operators |
| Payload similarity / deduplication detection | Idempotency uses key-based (not content-based) matching; content hashing is not implemented |
| Webhook replay detection (separate from idempotent transaction check) | The existing `provider_payment_id` lookup provides functional idempotency |

---

## 7. Relationship to Other Documents

### 7.1 SSOT Documents

| Document | Relationship |
|----------|-------------|
| `docs/ssot/SSOT_API.md` | Canonical source for all API endpoint contracts, including API-066 and API-067 (abuse endpoints). This document does not duplicate API contracts. |
| `docs/ssot/SSOT_ARCHITECTURE.md` | Defines ownership map, auth context rules, and data access patterns. Anti-abuse mechanisms follow these patterns. |
| `docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md` | Canonical source for billing enforcement rules (paywall, entitlements, plan limits). This document references but does not restate billing logic. |

### 7.2 ADRs

| Document | Relationship |
|----------|-------------|
| `docs/adr/active/ADR-001.md` | Unified Authentication Context — defines the canonical auth model. All anti-abuse enforcement respects this ADR. |
| `docs/adr/active/ADR-001.5.md` | RSC Access Rule — the Admin Abuse Dashboard (`/admin/abuse`) is implemented as an RSC that calls service-layer functions directly, per this ADR. |

### 7.3 Audit Documents

| Document | Relationship |
|----------|-------------|
| `docs/audits/ANTI_ABUSE_EXISTING_MECHANISMS_AUDIT.md` | Detailed code-level audit of every mutation endpoint, auth guard, DB constraint, and RLS policy. This document summarizes findings from that audit without duplicating the full tables. |
| `docs/audits/ANTI_ABUSE_METRICS_VALIDATION.md` | Validation of proposed metrics against the codebase. Informed the selection of metrics implemented in the telemetry layer. |

**Note:** Audit documents are **INFORMATIVE** (per `docs/DOCUMENT_GOVERNANCE.md` §2). They capture a point-in-time investigation and may become stale. This capabilities document is the **current-state reference**.

---

*End of document.*
