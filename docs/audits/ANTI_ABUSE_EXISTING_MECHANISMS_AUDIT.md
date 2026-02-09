---
Status: DRAFT
Created: 2026-02-08
Author: Cursor AI
Phase: SECURITY_AUDIT
---

# ANTI_ABUSE_EXISTING_MECHANISMS_AUDIT

Factual audit of all existing anti-abuse and anti-bot mechanisms in the Need4Trip codebase.
Code is the only source of truth. No recommendations, no suggestions, no speculative language.

---

## 1. Executive Summary

- **Rate limiting** exists at the middleware level via Upstash Redis with 4 tiers (critical: 3/min, write: 10/min, read: 60/min, guest: 5/min) covering all `/api/*` routes
- **Authentication** is enforced via JWT (Edge Runtime middleware) for protected routes; Telegram signature verification with replay attack prevention for login
- **Authorization** is enforced at the service layer: ownership checks, club role checks (owner/admin/member), billing enforcement (`enforceClubAction`, `enforceEventPublish`)
- **Idempotency** is implemented for event create/update operations via `Idempotency-Key` header + DB-backed key storage
- **Database-level protections** include RLS policies on 18+ tables, CHECK constraints on all enum/status fields, UNIQUE constraints preventing duplicate registrations/memberships, and triggers enforcing immutability rules
- **Admin audit logging** is atomic: every admin mutation is logged with mandatory reason; forbidden operations are explicitly blocked and logged
- **Billing enforcement** is server-side only: `PaywallError` (402) thrown by backend; frontend reacts to HTTP status
- **No user suspension/blocking mechanism** exists
- **No content moderation tools** exist
- **No feature flags or kill switches** exist
- **No CAPTCHA or bot detection** exists

---

## 2. User Mutation Entry Points

### 2.1 Events

| File Path | Method | Action | Auth Required | Server-Side Guard | Notes |
|-----------|--------|--------|--------------|-------------------|-------|
| `src/app/api/events/route.ts` | POST | Create event | Yes (`getCurrentUserFromMiddleware`) | Yes: `enforceEventPublish`, idempotency wrapper | Billing + idempotency enforced |
| `src/app/api/events/[id]/route.ts` | PUT | Update event | Yes (`getCurrentUserFromMiddleware`) | Yes: ownership check in service layer, `enforceEventPublish`, idempotency wrapper | Billing + ownership enforced |
| `src/app/api/events/[id]/route.ts` | DELETE | Delete event | Yes (`getCurrentUserFromMiddleware`) | Yes: ownership check in service layer | Owner-only |
| `src/app/api/events/[id]/registration/route.ts` | PATCH | Toggle registration open/closed | Yes (`getCurrentUserFromMiddleware`) | Yes: ownership check (`event.created_by_user_id !== currentUser.id` → 403), past event check | Zod validation (`registrationToggleSchema`) |
| `src/app/api/events/[id]/participants/route.ts` | POST | Register participant | No (guest access allowed) | Yes: service layer checks visibility, billing, registration eligibility | Guest session via cookie; middleware tier: `guest` (5/min) |
| `src/app/api/events/[id]/participants/[participantId]/route.ts` | PATCH | Update participant | No (guest access allowed) | Yes: service layer checks ownership or guest session match | Guest session verification |
| `src/app/api/events/[id]/participants/[participantId]/route.ts` | DELETE | Cancel participation | No (guest access allowed) | Yes: service layer checks ownership or guest session match | Guest session verification |

### 2.2 Clubs

| File Path | Method | Action | Auth Required | Server-Side Guard | Notes |
|-----------|--------|--------|--------------|-------------------|-------|
| `src/app/api/clubs/route.ts` | POST | Create club | Yes (`resolveCurrentUser`) | Yes: service layer (`createClub`) | No billing enforcement on club creation itself |
| `src/app/api/clubs/[id]/route.ts` | PATCH | Update club | Yes (`resolveCurrentUser`) | Yes: service layer checks ownership/admin role | Role-based |
| `src/app/api/clubs/[id]/route.ts` | DELETE | Archive club | Yes (`resolveCurrentUser`) | Yes: service layer checks owner role | Owner-only |
| `src/app/api/clubs/[id]/unarchive/route.ts` | POST | Unarchive club | Yes (`resolveCurrentUser`) | Yes: service layer checks owner role | Owner-only |
| `src/app/api/clubs/[id]/members/route.ts` | POST | Add member | N/A | N/A | Endpoint disabled (returns 503) |
| `src/app/api/clubs/[id]/members/[userId]/route.ts` | PATCH | Update member role | Yes (`resolveCurrentUser`) | Yes: owner-only, blocks assigning 'owner' role | Role validation |
| `src/app/api/clubs/[id]/members/[userId]/route.ts` | DELETE | Remove member | Yes (`resolveCurrentUser`) | Yes: self-leave or owner-only removal | Ownership/self check |
| `src/app/api/clubs/[id]/join-requests/route.ts` | POST | Create join request | Yes (`resolveCurrentUser`) | Yes: club exists, not archived, not already member | Zod validation (`message: max 500 chars`) |
| `src/app/api/clubs/[id]/join-requests/[requestId]/approve/route.ts` | POST | Approve join request | Yes (`resolveCurrentUser`) | Yes: owner/admin role check in service layer | Role-based |
| `src/app/api/clubs/[id]/join-requests/[requestId]/reject/route.ts` | POST | Reject join request | Yes (`resolveCurrentUser`) | Yes: owner/admin role check in service layer | Role-based |
| `src/app/api/clubs/[id]/export/route.ts` | GET | Export members CSV | Yes (`resolveCurrentUser`) | Yes: owner/admin role + `enforceClubAction(CLUB_EXPORT_PARTICIPANTS_CSV)` | Billing + role enforced; mapped to `write` rate limit tier |

### 2.3 Billing

| File Path | Method | Action | Auth Required | Server-Side Guard | Notes |
|-----------|--------|--------|--------------|-------------------|-------|
| `src/app/api/billing/beta-grant/route.ts` | POST | Grant beta credit | Yes (`getCurrentUserFromMiddleware`) | Yes: service checks `PAYWALL_MODE=soft_beta_strict` | Mode-gated |
| `src/app/api/billing/purchase-intent/route.ts` | POST | Create purchase intent | Yes (`resolveCurrentUser`) | Yes: product code validation, owner-only for club subscriptions | Zod validation (`purchaseIntentSchema`) |
| `src/app/api/billing/webhook/route.ts` | POST | Payment webhook | No (public endpoint) | Yes: transaction lookup by `provider_payment_id`; idempotent (completed = NO-OP) | No signature validation; relies on `provider_payment_id` existence in DB |

### 2.4 Profile

| File Path | Method | Action | Auth Required | Server-Side Guard | Notes |
|-----------|--------|--------|--------------|-------------------|-------|
| `src/app/api/profile/route.ts` | PATCH | Update profile | Yes (`resolveCurrentUser`) | Yes: service enforces self-update only | Zod validation (`profileUpdateSchema`) |
| `src/app/api/profile/cars/route.ts` | POST | Create car | Yes (`getCurrentUserFromMiddleware`) | Yes: service enforces user creates own cars | Zod validation (`userCarCreateSchema`) |
| `src/app/api/profile/cars/route.ts` | PUT | Update car | Yes (`getCurrentUserFromMiddleware`) | Yes: service enforces user updates own cars | Zod validation |
| `src/app/api/profile/cars/route.ts` | PATCH | Set primary car | Yes (`getCurrentUserFromMiddleware`) | Yes: service enforces user manages own cars | Car ID from query param |
| `src/app/api/profile/cars/route.ts` | DELETE | Delete car | Yes (`getCurrentUserFromMiddleware`) | Yes: service enforces user deletes own cars | Car ID from query param |
| `src/app/api/profile/notifications/route.ts` | PATCH | Update notification settings | Yes (`getCurrentUserFromMiddleware`) | Yes: service enforces self-update only | Zod validation (`notificationSettingsUpdateSchema`) |

### 2.5 Auth

| File Path | Method | Action | Auth Required | Server-Side Guard | Notes |
|-----------|--------|--------|--------------|-------------------|-------|
| `src/app/api/auth/telegram/route.ts` | POST/GET | Telegram login | No (public) | Yes: HMAC-SHA256 signature verification, `timingSafeEqual`, replay cache, auth_date time window (10 min past / 5 min future) | Rate limit tier: `critical` (3/min) |
| `src/app/api/auth/logout/route.ts` | POST/GET | Logout | No | No | Clears auth cookie |

### 2.6 AI

| File Path | Method | Action | Auth Required | Server-Side Guard | Notes |
|-----------|--------|--------|--------------|-------------------|-------|
| `src/app/api/ai/events/generate-rules/route.ts` | POST | Generate event rules via OpenAI | Yes (`getCurrentUserFromMiddleware`) | No additional guard beyond auth | Rate limit tier: `critical` (3/min); Zod validation |

### 2.7 Admin

| File Path | Method | Action | Auth Required | Server-Side Guard | Notes |
|-----------|--------|--------|--------------|-------------------|-------|
| `src/app/api/admin/users/[userId]/grant-credit/route.ts` | POST | Grant billing credit | Yes (`resolveAdminContext`) | Yes: credit code validation, user existence check, atomic audit logging | Mandatory reason field |
| `src/app/api/admin/clubs/[clubId]/extend-subscription/route.ts` | POST | Extend subscription | Yes (`resolveAdminContext`) | Yes: subscription state validation, days > 0, atomic audit logging | Mandatory reason field |
| `src/app/api/admin/cache/clear/route.ts` | POST | Clear static cache | Yes (`resolveAdminContext`) | Yes: admin context validation | Structured log |

### 2.8 System / Dev

| File Path | Method | Action | Auth Required | Server-Side Guard | Notes |
|-----------|--------|--------|--------------|-------------------|-------|
| `src/app/api/cron/process-notifications/route.ts` | POST | Process notification queue | Yes (`resolveSystemContext`) | Yes: Vercel cron header or CRON_SECRET | System-only |
| `src/app/api/dev/billing/settle/route.ts` | POST | Settle transaction (dev) | No | Yes: `NODE_ENV === "production"` → `ForbiddenError` | Dev-only; blocked in production |

---

## 3. Authentication & Authorization Guards

### 3.1 Middleware (`src/middleware.ts`)

| Aspect | Detail |
|--------|--------|
| Location | `src/middleware.ts` |
| Runtime | Edge Runtime |
| Scope | All `/api/*` routes (via `config.matcher`) |
| What it enforces | (1) Rate limiting, (2) JWT verification for protected routes, (3) Admin/Cron secret protection, (4) `x-user-id` header injection |
| Enforcement level | Middleware (before route handler) |

**Specific behaviors:**
- Rate limiting runs first (before auth)
- Admin/Cron routes skip rate limiting (have secret protection)
- Strips incoming `x-user-id` header on all routes to prevent spoofing (ADR-001)
- Returns 401 for protected routes without valid JWT
- Returns 403 for admin routes without `x-admin-secret` header
- Returns 403 for cron routes without `x-vercel-cron` or `CRON_SECRET`

### 3.2 Auth Resolvers

| Function | Location | What It Enforces | Level |
|----------|----------|-----------------|-------|
| `resolveCurrentUser(req?)` | `src/lib/auth/resolveCurrentUser.ts` | User identity resolution (canonical per ADR-001) | API route |
| `getCurrentUserFromMiddleware(request)` | `src/lib/auth/currentUser.ts` | User identity from `x-user-id` header (fast path) | API route |
| `resolveAdminContext(request)` | `src/lib/auth/resolveAdminContext.ts` | Admin identity (user session + email allowlist OR `x-admin-secret`) | API route |
| `resolveSystemContext(request, jobName)` | `src/lib/auth/resolveSystemContext.ts` | System/cron identity (`x-vercel-cron` or `CRON_SECRET`) | API route |

### 3.3 Admin Authentication

| Mechanism | Location | What It Enforces |
|-----------|----------|-----------------|
| Email allowlist | `resolveAdminContext.ts` → `isAdminEmail()` | Admin access restricted to emails in `ADMIN_USER_EMAILS` env var |
| Shared secret | `resolveAdminContext.ts` → `resolveSecretBasedAdmin()` | Admin access via `x-admin-secret` header matching `ADMIN_SECRET` env var |
| Middleware protection | `middleware.ts` → `isAdminRoute()` | `ADMIN_ROUTES` array requires `x-admin-secret` header at middleware level |

### 3.4 Service-Layer Guards

| Guard | Location | What It Enforces | Level |
|-------|----------|-----------------|-------|
| `enforceClubAction()` | `src/lib/services/accessControl.ts` | Club billing limits (subscription status, plan limits, feature access) | Service |
| `enforceEventPublish()` | `src/lib/services/accessControl.ts` | Event publish rules (free limits, credits, paywall, club vs personal) | Service |
| `getUserClubRole()` | `src/lib/db/clubMemberRepo.ts` | Club role lookup for ownership/admin checks | Service |
| `canViewEvent()` / `enforceEventVisibility()` | `src/lib/utils/eventVisibility.ts` | Event visibility rules (public/unlisted/restricted, club membership) | Service |
| `canRegisterForEvent()` | `src/lib/utils/eventPermissions.ts` | Registration eligibility (closure, past event, limit, anonymous, club membership, duplicate) | Service |
| `forbiddenOperationsGuard` | `src/lib/billing/admin/forbiddenOperationsGuard.ts` | Blocks forbidden admin billing operations (always throws) | Service |
| `withIdempotency()` | `src/lib/services/withIdempotency.ts` | Idempotency guarantees for create/update operations | Service |

### 3.5 Telegram Auth Security (`src/app/api/auth/telegram/route.ts`)

| Mechanism | Detail |
|-----------|--------|
| Signature verification | HMAC-SHA256 using bot token secret; `crypto.timingSafeEqual` for comparison |
| Replay prevention | In-memory `Map` cache keyed by `{id}:{auth_date}:{hash}` |
| Temporal validation | `auth_date` must be within 10 min past and 5 min future of server time |
| Input validation | Required fields: `id`, `hash`, `auth_date` |

---

## 4. Paywall, Entitlements & Beta Limits

### 4.1 Billing Enforcement (`src/lib/services/accessControl.ts`)

| Function | What It Enforces | Error |
|----------|-----------------|-------|
| `enforceClubAction()` | Subscription status (active/grace/pending/expired), plan limits (participants, members, paid events, CSV export) | `PaywallError` (402) |
| `enforceEventPublish()` | Free event limits, one-off credit consumption, club subscription requirements | `PaywallError` (402) or `CreditConfirmationRequiredError` (409) |

### 4.2 Plan Limits Enforcement

Limits are loaded from `club_plans` DB table via `getPlanById()`. Enforcement in `enforcePlanLimits()`:

| Limit | Action Code | Enforcement |
|-------|------------|-------------|
| Max event participants | `CLUB_CREATE_EVENT` | `context.eventParticipantsCount > plan.maxEventParticipants` → 402 |
| Max club members | `CLUB_INVITE_MEMBER` | `context.clubMembersCount >= plan.maxMembers` → 402 |
| Paid events feature | `CLUB_CREATE_PAID_EVENT` | `!plan.allowPaidEvents` → 402 |
| CSV export feature | `CLUB_EXPORT_PARTICIPANTS_CSV` | `!plan.allowCsvExport` → 402 |

### 4.3 Billing Policy (Subscription Status)

Non-active subscription states (grace/pending/expired) are checked against `billing_policy_actions` table via `isActionAllowed(status, action)`.

### 4.4 Personal Event Credits

| Scenario | Enforcement |
|----------|-------------|
| Within free limit | Allow (no credit) |
| Exceeds one-off limit (>500) | `PaywallError` (402) — club subscription required |
| Between free and 500, no credit | `PaywallError` (402) — ONE_OFF + CLUB_ACCESS options |
| Between free and 500, credit exists, not confirmed | `CreditConfirmationRequiredError` (409) |
| Between free and 500, credit confirmed | Allow with `requiresCredit: true` |
| Event already has consumed credit (edit) | Allow within effective limit |

### 4.5 Beta Mode (`src/lib/config/paywall.ts`)

| Setting | Value | Effect |
|---------|-------|--------|
| `PAYWALL_MODE=soft_beta_strict` | `isSoftBetaStrict() = true` | Paywall shown but user can continue; `BETA_CONTINUE` option in `PaywallError` |
| `PAYWALL_MODE=hard` (default) | Standard production | Paywall blocks; payment required |

### 4.6 Beta Participant Limit (`src/lib/config/betaParticipantLimit.ts`)

| Mechanism | Detail |
|-----------|--------|
| Limit | 500 participants per event in beta mode |
| Enforcement level | Client-side only (UI modal) |
| Server enforcement | Not detected |

### 4.7 Forbidden Admin Operations (`src/lib/billing/admin/forbiddenOperationsGuard.ts`)

Explicit blocklist of operations that admin cannot perform:
- Subscription lifecycle: `CREATE_SUBSCRIPTION`, `ACTIVATE_SUBSCRIPTION`, `CHANGE_SUBSCRIPTION_STATE`, `UPGRADE_PLAN`, `DOWNGRADE_PLAN`, `CANCEL_SUBSCRIPTION`
- Billing: `CREATE_PURCHASE_INTENT`, `MODIFY_TRANSACTION`, `EMULATE_PAYMENT`, `ISSUE_REFUND`
- Access: `BYPASS_BILLING_ENFORCEMENT`, `DIRECT_ACCESS_GRANT`, `MODIFY_BILLING_PRODUCTS`

All forbidden operations always throw; rejections are logged to admin audit.

---

## 5. Rate Limiting & Flood Protection

### 5.1 Middleware Rate Limiting (`src/middleware.ts` + `src/lib/config/rateLimits.ts`)

| Aspect | Detail |
|--------|--------|
| Technology | Upstash Redis + `@upstash/ratelimit` |
| Algorithm | Sliding window |
| Runtime | Edge (middleware) |
| Scope | All `/api/*` routes (except admin/cron) |
| Identifier | IP address (pre-auth); userId not used (auth runs after rate limit) |
| Graceful degradation | If Redis is unavailable, requests are allowed through |

### 5.2 Rate Limit Tiers

| Tier | Limit | Window | Applied To |
|------|-------|--------|-----------|
| `critical` | 3 requests | 1 minute | `/api/auth/telegram`, `/api/ai/events/generate-rules` |
| `write` | 10 requests | 1 minute | All POST/PUT/PATCH/DELETE operations |
| `read` | 60 requests | 1 minute | All GET requests |
| `guest` | 5 requests | 1 minute | `/api/events/[id]/participants`, `/api/events/[id]/participants/[participantId]` |

### 5.3 Rate Limit Response

- HTTP status: 429
- Error code: `RATE_LIMIT_EXCEEDED`
- `Retry-After: 60` header
- Rate limit headers on all responses: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### 5.4 Default Tier Assignment

Unmapped routes receive:
- `read` tier for GET requests
- `write` tier for POST/PUT/PATCH/DELETE requests

### 5.5 Excluded from Rate Limiting

- Admin routes (protected by `x-admin-secret`)
- Cron routes (protected by `x-vercel-cron` / `CRON_SECRET`)

### 5.6 Rate Limiting Limitations

- Identifier is IP-based only (middleware runs before JWT auth, so `userId` is not available at rate limit check time)
- In-memory Telegram replay cache is per-instance (not shared across Vercel Edge instances)

---

## 6. Database-Level Protections

### 6.1 Row Level Security (RLS)

RLS is enabled on 18+ tables. Key policies relevant to abuse prevention:

| Table | Policy | What It Prevents |
|-------|--------|-----------------|
| `events` | `events_insert_authenticated` | Anonymous event creation |
| `events` | `events_update_own` | Non-owner event modification |
| `events` | `events_delete_own` | Non-owner event deletion |
| `event_participants` | `authenticated_create_own` | Registering as another user |
| `event_participants` | `authenticated_update_own` | Modifying another user's registration |
| `event_participants` | `authenticated_delete_own` | Cancelling another user's registration |
| `users` | `authenticated_users_update_own` | Modifying another user's profile |
| `clubs` | `authenticated_create_clubs` | Anonymous club creation |
| `clubs` | `authenticated_update_own_clubs` | Non-owner/admin club modification |
| `clubs` | `authenticated_delete_own_clubs` | Non-owner club deletion |
| `club_members` | `club_owner_manage_members` | Non-owner member management |
| `user_cars` | `authenticated_create_own_cars` | Creating cars for another user |
| `idempotency_keys` | `idempotency_keys_user_isolation` | Accessing another user's idempotency keys |
| `admin_audit_log` | `admin_audit_log_service_role_all` | Non-admin access to audit records |
| `notification_queue` | (no policies) | Service role only |

### 6.2 UNIQUE Constraints (Duplicate Prevention)

| Table | Constraint | What It Prevents |
|-------|-----------|-----------------|
| `users` | `users_telegram_id_key` | Duplicate Telegram accounts |
| `event_participants` | `event_participants_event_user_unique` | Multiple registrations per user per event |
| `event_user_access` | `event_user_access_unique` | Duplicate access grants |
| `club_members` | `club_members_unique` | Multiple memberships per user per club |
| `club_invites` | `unique_pending_invite_per_user` | Multiple pending invites per user per club |
| `club_join_requests` | `unique_pending_join_request_per_user` | Multiple pending join requests per user per club |
| `club_subscriptions` | `club_subscriptions_one_active_per_club` | Multiple active subscriptions per club |
| `billing_credits` | `uix_billing_credits_source_transaction_id` | Multiple credits from same transaction |
| `idempotency_keys` | `unique_idempotency_key` | Duplicate idempotency keys per `(user_id, route, key)` |
| `notification_queue` | `uq_notification_queue_dedupe` | Duplicate notifications (via `dedupe_key`) |
| `clubs` | `clubs_slug_idx` | Duplicate club slugs (case-insensitive) |
| `user_cars` | `idx_user_cars_single_primary` | Multiple primary cars per user |

### 6.3 CHECK Constraints (Data Validation)

| Table | Constraint | What It Enforces |
|-------|-----------|-----------------|
| `events` | `events_visibility_check` | `visibility IN ('public', 'unlisted', 'restricted')` |
| `events` | `events_club_consistency_check` | `is_club_event` consistent with `club_id` |
| `events` | `events_title_length` | `char_length(title) >= 3` |
| `events` | `events_max_participants` | `max_participants IS NULL OR > 0` |
| `clubs` | name length | `char_length(name) >= 2 AND <= 100` |
| `clubs` | URL lengths | `logo_url`, `telegram_url`, `website_url` each <= 500 chars |
| `club_members` | role check | `role IN ('owner', 'admin', 'member', 'pending')` |
| `billing_transactions` | product code | `product_code IN ('EVENT_UPGRADE_500', 'CLUB_50', 'CLUB_500', 'CLUB_UNLIMITED')` |
| `billing_transactions` | club requirement | Club products require `club_id` and `plan_id` |
| `billing_credits` | consumed state | Consumed credit must have `consumed_event_id` and `consumed_at` |
| `billing_credits` | credit code | `credit_code IN ('EVENT_UPGRADE_500')` |
| `billing_credits` | source | `source IN ('user', 'admin', 'system')` |
| `admin_audit_log` | actor type | `actor_type = 'admin'` |
| `admin_audit_log` | action type | Closed set of action codes |
| `admin_audit_log` | reason | `length(trim(reason)) > 0` |
| `event_locations` | coordinates | Latitude -90..90, Longitude -180..180 |
| `idempotency_keys` | status | `status IN ('in_progress', 'completed', 'failed')` |

### 6.4 Triggers (Business Rule Enforcement)

| Table | Trigger | What It Enforces |
|-------|---------|-----------------|
| `events` | `events_prevent_club_id_change` | Club ID is immutable after event creation (SSOT §5.7) |
| `events` | `trigger_sync_event_club_flag` | `is_club_event` auto-synced with `club_id` |
| `events` | `increment_event_version` | Auto-increment version on update (optimistic locking) |
| `event_locations` | `prevent_first_location_delete` | Cannot delete location with `sort_order=1` (every event must have at least one location) |
| `clubs` (after insert) | `auto_add_creator_as_owner` | Club creator is automatically added as owner member |
| `clubs` (after insert) | `trigger_create_club_subscription` | Auto-creates default 'free' subscription |

### 6.5 Database Functions

| Function | What It Does |
|----------|-------------|
| `prevent_club_id_change()` | Raises exception if `club_id` changes on UPDATE |
| `cleanup_old_idempotency_keys()` | Deletes idempotency keys older than 7 days |
| `create_club_invite()` | Idempotent invite creation (refreshes existing pending invite) |
| `deactivate_expired_club_subscriptions()` | Deactivates expired subscriptions |
| `claim_pending_notifications()` | Atomically claims notifications for processing |
| `reset_stuck_notifications()` | Resets stuck 'processing' notifications |

---

## 7. Auditability & Admin Controls

### 7.1 Admin Audit Log

| Aspect | Detail |
|--------|--------|
| Table | `admin_audit_log` |
| Immutability | Append-only (no UPDATE/DELETE exposed) |
| Service layer | `src/lib/audit/adminAuditLog.ts` — `logAdminAction()`, `logAdminSuccess()`, `logAdminRejection()` |
| Atomic wrapper | `src/lib/audit/adminAtomic.ts` — `adminAtomicMutation()` ensures mutation + audit are atomic; rollback on audit failure |
| Action codes | Closed set: `ADMIN_GRANT_CREDIT`, `ADMIN_GRANT_CREDIT_REJECTED`, `ADMIN_EXTEND_SUBSCRIPTION`, `ADMIN_EXTEND_SUBSCRIPTION_REJECTED` |
| Mandatory fields | `actorId`, `actionType`, `targetType`, `targetId`, `reason`, `result` |

### 7.2 Club Audit Log

| Aspect | Detail |
|--------|--------|
| Table | `club_audit_log` |
| Service layer | `src/lib/services/clubAuditLog.ts` |
| Mode | Fire-and-forget (non-blocking) |
| What it logs | Club management actions (member changes, role changes) |

### 7.3 Admin API Capabilities

| Endpoint | Action | Audit Logged |
|----------|--------|-------------|
| `POST /api/admin/users/[userId]/grant-credit` | Grant billing credit to user | Yes (atomic) |
| `POST /api/admin/clubs/[clubId]/extend-subscription` | Extend subscription expiration | Yes (atomic) |
| `POST /api/admin/cache/clear` | Clear static cache | Yes (structured log) |
| `GET /api/admin/audit` | View audit log (filterable) | N/A (read-only) |
| `GET /api/admin/users` | List users with search | N/A (read-only) |
| `GET /api/admin/users/[userId]` | View user billing details | N/A (read-only) |
| `GET /api/admin/clubs` | List clubs with search | N/A (read-only) |
| `GET /api/admin/clubs/[clubId]` | View club subscription details | N/A (read-only) |

### 7.4 Admin UI

| Page | Capabilities |
|------|-------------|
| `/admin` | Navigation dashboard |
| `/admin/users` | Search users by email |
| `/admin/users/[userId]` | View credits, transactions; grant credit with reason |
| `/admin/clubs` | Search clubs by name |
| `/admin/clubs/[clubId]` | View subscription, audit history; extend subscription with reason |
| `/admin/audit` | View admin audit log with filters (actor, action, target, result) |

### 7.5 User Suspension / Blocking

Not detected. No mechanism exists to suspend, block, ban, or disable a user account.

### 7.6 Content Moderation

Not detected. No mechanism exists to flag, hide, or remove user-generated content (events, clubs, participant data).

### 7.7 Feature Flags / Kill Switches

Not detected. No feature flag system exists. The only configuration-based control is `PAYWALL_MODE` env var (hard / soft_beta_strict).

---

## 8. Factual Gaps (NO SOLUTIONS)

### 8.1 Rate Limiting

- Rate limiting identifier is IP-based only at middleware level; `userId` is not available because rate limiting runs before JWT authentication
- Telegram replay attack prevention cache is in-memory per Edge instance; not shared across Vercel Edge instances
- Admin and cron routes are excluded from rate limiting; they rely solely on secret-based protection
- Rate limiting gracefully degrades: if Upstash Redis is unavailable, all requests pass through without limits

### 8.2 Authentication & Authorization

- Billing webhook (`POST /api/billing/webhook`) has no signature validation; authentication relies solely on `provider_payment_id` lookup in the database
- Guest participant routes (`/api/events/[id]/participants`) are not protected by middleware authentication; guest session is cookie-based with no server-side session storage beyond the cookie itself
- No CAPTCHA, proof-of-work, or bot detection mechanism exists on any endpoint

### 8.3 Billing & Limits

- Beta participant limit (500) is enforced at client/UI level only (`src/lib/config/betaParticipantLimit.ts`); no server-side enforcement detected
- No DB-level constraint on the number of events a user can create
- No DB-level constraint on the number of clubs a user can create
- No server-side limit on AI generation requests beyond rate limiting (3/min)

### 8.4 Database

- `billing_credits` RLS policies: status unclear from codebase (the application uses service role for billing operations, which bypasses RLS)
- `club_invites` RLS policies: not fully defined in migration files reviewed
- `club_join_requests` RLS policies: not fully defined in migration files reviewed

### 8.5 Admin & Moderation

- No user suspension or blocking capability
- No content moderation tools (flag, hide, delete events/clubs)
- No account disabling mechanism
- No feature flag or kill switch system for emergency controls
- No admin action approval workflow (all admin mutations are single-step)

### 8.6 Idempotency

- Idempotency is implemented for event create/update only; other mutation endpoints (club create, join request, participant registration) do not use idempotency keys
- Idempotency key cleanup relies on DB function `cleanup_old_idempotency_keys()` with 7-day TTL; invocation mechanism (cron) not verified in this audit

---

*End of audit.*
