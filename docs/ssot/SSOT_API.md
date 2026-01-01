# Need4Trip API SSOT (Single Source of Truth)

**Status:** 🟢 Production  
**Version:** 1.2.1  
**Last Updated:** 1 января 2026  
**This document is the ONLY authoritative source for all API endpoints.**

---

## Change Log (SSOT)

### 1.2.1 (2026-01-01)
- **Removed deprecated `organizer` role** — Replaced with canonical roles (`owner`, `admin`, `member`, `pending`) per SSOT_CLUBS_EVENTS_ACCESS.md §2.
- **Updated SSOT reference paths** — Changed `/docs/ARCHITECTURE.md` and `/docs/BILLING_SYSTEM_ANALYSIS.md` to `/docs/ssot/SSOT_*.md` format.
- **Updated CreditConfirmationRequiredError description** — Aligned with publish-on-save semantics (v5+). Added cross-reference to SSOT_CLUBS_EVENTS_ACCESS.md §10.

---

## Purpose & Scope

This document provides a **complete inventory** of all HTTP endpoints in the Need4Trip backend. It serves as:

- **SSOT for API contracts** — Request/response schemas, authentication, authorization
- **Security checklist** — Rate limiting, abuse risks, sensitive data exposure
- **Developer onboarding** — Complete API reference without code access
- **Refactoring baseline** — Before/after comparison for API changes

**Critical Rule:** 
- Any new endpoint MUST be documented here in the same PR.
- Any endpoint behavior change MUST update this file.
- Outdated documentation outside this file should be deleted or merged.

---

## Table of Contents

1. [Global Conventions](#1-global-conventions)
2. [Authentication & Session Model](#2-authentication--session-model)
3. [Authorization Model](#3-authorization-model)
4. [Rate Limiting & Abuse Protection](#4-rate-limiting--abuse-protection)
5. [Billing & Paywall Touchpoints](#5-billing--paywall-touchpoints)
6. [Error Model](#6-error-model)
7. [Observability & Logging](#7-observability--logging)
8. [External Dependencies Overview](#8-external-dependencies-overview)
9. [Endpoints Inventory](#9-endpoints-inventory)
   - [9.1 Auth](#91-auth)
   - [9.2 Users & Profile](#92-users--profile)
   - [9.3 Clubs](#93-clubs)
   - [9.4 Events](#94-events)
   - [9.5 Billing](#95-billing)
   - [9.6 Reference Data](#96-reference-data)
   - [9.7 AI](#97-ai)
   - [9.8 Admin](#98-admin)
   - [9.9 Cron](#99-cron)
10. [Coverage & Self-Audit](#10-coverage--self-audit)
11. [SSOT Rules for This Project](#11-ssot-rules-for-this-project)

---

## 1. Global Conventions

### 1.1 Base URL

```
Production: https://need4trip.vercel.app
Development: http://localhost:3000
```

### 1.2 HTTP Methods

- `GET` — Retrieve data (cacheable, idempotent)
- `POST` — Create resources (non-idempotent)
- `PUT` — Full resource update (idempotent)
- `PATCH` — Partial resource update (idempotent)
- `DELETE` — Delete resource (idempotent)

### 1.3 Request Format

- **Content-Type:** `application/json` (unless otherwise specified)
- **Query Params:** URL-encoded, used for filtering, pagination, sorting
- **Body:** JSON payload for POST/PUT/PATCH requests

### 1.4 Response Format

**Success (2xx):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```

**Error (4xx, 5xx):**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* Optional structured details */ }
  }
}
```

### 1.5 Runtime

- **Default:** Node.js runtime (serverless)
- **Some endpoints:** Edge-compatible (where noted)
- **Location:** Vercel (globally distributed)

---

## 2. Authentication & Session Model

### 2.1 Mechanism

- **Type:** JWT (JSON Web Token)
- **Storage:** HTTP-only cookie (`auth_token`)
- **TTL:** 30 days (configurable via `AUTH_COOKIE_MAX_AGE`)
- **Secret:** `AUTH_JWT_SECRET` (env variable)

### 2.2 Authentication Flow

1. **Login:** `POST /api/auth/telegram` (Telegram Widget или payload)
2. **Token issued:** JWT stored in HTTP-only cookie
3. **Middleware verification:** JWT validated on protected routes
4. **User ID injection:** Middleware adds `x-user-id` header for route handlers
5. **Logout:** `POST /api/auth/logout` (clears cookie)

### 2.3 Protected vs Public Routes

**Protected (requires auth):**
- All `/api/profile/*` endpoints
- `/api/auth/me`
- AI endpoints: `/api/ai/*`
- Billing: `/api/billing/purchase-intent`, `/api/billing/transactions/status`
- Clubs (write): POST/PATCH/DELETE on `/api/clubs/*`
- Events (write): POST/PUT/PATCH/DELETE on `/api/events/*`

**Public (no auth):**
- Auth: `/api/auth/telegram`, `/api/auth/logout`
- Events (read): `GET /api/events`, `GET /api/events/[id]`
- Clubs (read): `GET /api/clubs`, `GET /api/clubs/[id]`
- Reference data: `/api/cities`, `/api/currencies`, `/api/car-brands`, `/api/event-categories`, `/api/vehicle-types`, `/api/plans`
- Participants: All methods (guest access via `guest_session_id`)

**Special (secret-protected):**
- Admin: `/api/admin/*` (requires `x-admin-secret` header)
- Cron: `/api/cron/*` (requires `x-vercel-cron` OR `Authorization: Bearer CRON_SECRET`)

### 2.4 Guest Sessions

- **For:** Event participant registration/management without login
- **Mechanism:** Cookie `guest_session_id` (UUID)
- **Scope:** Per-device, cross-event
- **Limitations:** No profile, club access, or credits

---

## 3. Authorization Model

### 3.1 Layers

1. **Authentication:** Middleware verifies JWT
2. **Ownership:** Route handler checks `currentUser.id === resource.created_by_user_id`
3. **Role-based:** Club membership roles (`owner`, `admin`, `member`, `pending`)
4. **Visibility:** Events have `visibility` field (`public`, `unlisted`, `restricted`)

Canonical club roles and permissions are defined in SSOT_CLUBS_EVENTS_ACCESS.md §2; this section is descriptive.

### 3.2 Event Visibility Rules

| Visibility | Who Can View | Auto-Grant Access |
|-----------|--------------|-------------------|
| `public` | Everyone (including anonymous) | N/A |
| `unlisted` | Anyone with link (including anonymous) | N/A |
| `restricted` | Authenticated users | Auto-grant on first view |

**SSOT:** `/docs/ssot/SSOT_ARCHITECTURE.md § 9` (Events Domain Policies)

### 3.3 Club Roles

| Role | Permissions |
|------|-------------|
| `owner` | Full control (edit, delete, manage members, billing) |
| `admin` | Create/manage club events (free), manage club content; cannot manage members; cannot publish paid club events (default policy) |
| `member` | View, participate in events |
| `pending` | No elevated permissions (same as non-member/guest) |

See SSOT_CLUBS_EVENTS_ACCESS.md §2 for normative rules.

---

## 4. Rate Limiting & Abuse Protection

### 4.1 Implementation

- **Provider:** Upstash Redis
- **Strategy:** Sliding window
- **Enforcement:** Middleware (runs BEFORE auth checks)
- **Identifier:** User ID (if authenticated), IP address (if anonymous)

### 4.2 Rate Limit Tiers

| Tier | Requests/Window | Window | Applies To |
|------|-----------------|--------|------------|
| **critical** | 3 / 1 minute | 60s | AI endpoints |
| **write** | 30 / 1 minute | 60s | POST/PUT/PATCH/DELETE |
| **read** | 300 / 5 minutes | 300s | GET endpoints |
| **guest** | 10 / 1 minute | 60s | Guest participant actions |

### 4.3 Headers

**Response headers:**
- `X-RateLimit-Limit` — Total allowed requests
- `X-RateLimit-Remaining` — Remaining requests
- `X-RateLimit-Reset` — Timestamp when limit resets

**Error (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Limit: X per Y. Please try again later."
  }
}
```

### 4.4 Disabled for

- Admin routes (secret-protected)
- Cron routes (Vercel-internal)

---

## 5. Billing & Paywall Touchpoints

### 5.1 Billing System Architecture

- **SSOT:** `/docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md`
- **Plans:** FREE, CLUB_50, CLUB_500, CLUB_UNLIMITED (DB: `club_plans`)
- **Products:** EVENT_UPGRADE_500 (one-off credit) (DB: `billing_products`)
- **Enforcement:** `enforceClubAction()` in `/lib/services/accessControl.ts`

### 5.2 Paywall Response (402)

```json
{
  "success": false,
  "error": {
    "code": "PAYWALL",
    "message": "Human-readable limit message",
    "details": {
      "reason": "MAX_EVENT_PARTICIPANTS_EXCEEDED",
      "currentPlanId": "club_50",
      "requiredPlanId": "club_500",
      "meta": { "requested": 100, "limit": 50 },
      "options": [
        { "type": "ONE_OFF_CREDIT", "productCode": "EVENT_UPGRADE_500" },
        { "type": "CLUB_ACCESS", "requiredPlanId": "club_500" }
      ]
    }
  }
}
```

### 5.3 Frontend Integration

- **Modal:** `PaywallModal.tsx` (типизированный)
- **Trigger:** Catch 402 from backend
- **Actions:** Show upgrade options, link to pricing

---

## 6. Error Model

### 6.1 Error Classes

| Class | Status | Code | Usage |
|-------|--------|------|-------|
| `AppError` | 400 | `AppError` | Base class |
| `ValidationError` | 400 | `ValidationError` | Invalid input |
| `NotFoundError` | 404 | `NotFound` | Resource not found |
| `ConflictError` | 409 | `Conflict` | Duplicate resource |
| `AuthError` | 401 | `AuthError` | Authentication failed |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | Auth required |
| `ForbiddenError` | 403 | `FORBIDDEN` | Access denied |
| `InternalError` | 500 | `InternalError` | Server error |
| `PaywallError` | 402 | `PAYWALL` | Plan limit exceeded |

### 6.2 Special Errors

**CreditConfirmationRequiredError (409):**
- Triggered during POST/PUT when saving a personal paid event would require consuming a one-off credit
- Requires explicit `confirm_credit=1` query parameter to consume one credit
- `confirm_credit` param is meaningful only for personal events (`club_id` must be `NULL`); for club events it is ignored
- Normative credit usage rules: SSOT_CLUBS_EVENTS_ACCESS.md §10 + SSOT_DATABASE.md §8.1 (billing_credits state machine)

**PaywallError (402):**
- Triggered by `enforceClubAction()` when plan limits exceeded
- Frontend shows upgrade modal

---

## 7. Observability & Logging

### 7.1 Logging

- **Library:** Custom logger (`/lib/utils/logger.ts`)
- **Levels:** `debug`, `info`, `warn`, `error`
- **Structured:** JSON format with context (userId, eventId, etc.)
- **Destination:** Vercel logs (stdout)

### 7.2 Performance Tracking

- **Middleware:** Logs slow rate limit checks (>100ms)
- **API Routes:** Log key operations (event creation, AI generation, etc.)
- **No APM:** Manual logging only (no Sentry/DataDog in current implementation)

---

## 8. External Dependencies Overview

| Service | Usage | Endpoints Affected |
|---------|-------|-------------------|
| **Supabase PostgreSQL** | Primary database | All |
| **Upstash Redis** | Rate limiting | All (middleware) |
| **Telegram API** | Auth (widget signature verification) | `/api/auth/telegram` |
| **OpenAI API** | AI rules generation | `/api/ai/events/generate-rules` |
| **Kaspi** | Payment provider (STUB) | `/api/billing/purchase-intent` |
| **Vercel Cron** | Scheduled jobs | `/api/cron/process-notifications` |

**Environment Variables:**
```
# Database
NEXT_PUBLIC_SUPABASE_URL=<url>
SUPABASE_SERVICE_ROLE_KEY=<key>

# Auth
AUTH_JWT_SECRET=<secret>
TELEGRAM_BOT_TOKEN=<token>

# Rate Limiting
UPSTASH_REDIS_REST_URL=<url>
UPSTASH_REDIS_REST_TOKEN=<token>

# AI
OPENAI_API_KEY=<key>
OPENAI_MODEL=gpt-4o-mini

# Admin/Cron
ADMIN_SECRET=<secret>
CRON_SECRET=<secret>
```

---

## 9. Endpoints Inventory

### 9.1 Auth

#### API-001: Telegram Login

**Endpoint ID:** API-001  
**Method:** POST, GET  
**Path:** `/api/auth/telegram`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** Telegram widget signature verification (HMAC-SHA256)  
**Authorization:** N/A  

**Purpose:**  
Authenticate user via Telegram Login Widget. Verifies signature, upserts user, issues JWT.

**Request:**

- **Content-Type:** `application/json` (POST) or query params (GET)
- **Body/Query params:**
  - `id` (required): Telegram user ID
  - `hash` (required): HMAC-SHA256 signature
  - `auth_date` (required): Unix timestamp
  - `first_name` (optional): User first name
  - `last_name` (optional): User last name
  - `username` (optional): Telegram username
  - `photo_url` (optional): Avatar URL
- **Idempotency:** Upsert user (duplicate telegram_id updates existing user)

**Response:**

- **Success:** 200
  ```json
  {
    "ok": true,
    "user": {
      "id": "uuid",
      "name": "User Name",
      "telegramHandle": "@username",
      "avatarUrl": "https://..."
    }
  }
  ```
- **Side effects:** 
  - Sets `auth_token` cookie (HTTP-only, 30 days)
  - Revalidates Next.js layout cache

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Missing id/hash/auth_date | Bad request |
| 403 | Invalid signature | HMAC verification failed |
| 403 | Expired auth_date (>10 min) | Timestamp too old |
| 403 | Replay attack detected | Duplicate payload in cache |
| 500 | Missing env vars | TELEGRAM_BOT_TOKEN not configured |
| 503 | Database error | Supabase unavailable |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Medium (upsert DB operation, but idempotent)
- **Sensitive data exposure:** No (only public Telegram data)

**Dependencies:**

- Supabase (users table)
- Crypto (Node.js built-in, HMAC-SHA256)

**Code pointers:**

- Route handler: `/src/app/api/auth/telegram/route.ts`
- Key functions: `verifyTelegram()`, `upsertTelegramUser()`, `createAuthToken()`

---

#### API-002: Get Current User

**Endpoint ID:** API-002  
**Method:** GET  
**Path:** `/api/auth/me`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** Middleware JWT verification, `x-user-id` header  
**Authorization:** N/A (returns own user)  

**Purpose:**  
Return currently authenticated user data. Optimized: reads user from middleware header (no DB query).

**Request:**

- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "name": "User Name",
        "telegramHandle": "@username",
        "avatarUrl": "https://...",
        "cityId": "uuid",
        "plan": "free",
        "availableCreditsCount": 0
      }
    }
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 401 | No JWT token | Middleware blocks |
| 401 | Invalid/expired JWT | Middleware blocks |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (no DB query, middleware header read)
- **Sensitive data exposure:** No (returns own user data)

**Dependencies:**

- Middleware (`x-user-id` header)

**Code pointers:**

- Route handler: `/src/app/api/auth/me/route.ts`
- Key functions: `getCurrentUserFromMiddleware()`

---

#### API-003: Logout

**Endpoint ID:** API-003  
**Method:** POST, GET  
**Path:** `/api/auth/logout`  
**Runtime:** Node.js  
**Auth:** None (must work with expired token)  
**Auth mechanism:** N/A  
**Authorization:** N/A  

**Purpose:**  
Clear auth cookie, revalidate cache. Works even with invalid/expired token.

**Request:**

- **Body:** None
- **Idempotency:** Yes (idempotent cookie clear)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": { "ok": true }
  }
  ```
- **Side effects:** 
  - Clears `auth_token` cookie
  - Revalidates Next.js layout cache

**Errors:**

- None (always succeeds)

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Low (no external calls, just cookie clear)
- **Sensitive data exposure:** No

**Dependencies:**

- None

**Code pointers:**

- Route handler: `/src/app/api/auth/logout/route.ts`
- Key functions: `clearAuthCookie()`

---

### 9.2 Users & Profile

#### API-004: Get Profile

**Endpoint ID:** API-004  
**Method:** GET  
**Path:** `/api/profile`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Returns own profile only  

**Purpose:**  
Get full user profile with clubs, event stats.

**Request:**

- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "user": { /* CurrentUser */ },
      "clubs": [ /* ClubMembership[] */ ],
      "stats": {
        "clubsCount": 2,
        "totalEvents": 15,
        "completedEvents": 10,
        "organizedEvents": 3
      }
    }
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 401 | Not authenticated | Middleware blocks |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only)
- **Sensitive data exposure:** No (own data)

**Dependencies:**

- Supabase (users, clubs, club_members, events tables)

**Code pointers:**

- Route handler: `/src/app/api/profile/route.ts`
- Key functions: `getCurrentUser()`, `getUserClubs()`, `getUserEventStats()`

---

#### API-005: Update Profile

**Endpoint ID:** API-005  
**Method:** PATCH  
**Path:** `/api/profile`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Can only update own profile  

**Purpose:**  
Update user profile fields (name, email, bio, phone, cityId, car data).

**Request:**

- **Content-Type:** `application/json`
- **Body schema:** (Zod: `profileUpdateSchema`)
  ```typescript
  {
    name?: string;
    email?: string;
    bio?: string;
    phone?: string;
    cityId?: string; // UUID
    carBrandId?: string; // UUID
    carModelText?: string;
  }
  ```
- **Idempotency:** Yes (PUT-style update)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "user": { /* Updated CurrentUser with hydrated city */ }
    }
  }
  ```
- **Side effects:** Updates `users` table

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Zod schema violation |
| 401 | Not authenticated | Middleware blocks |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Low (single DB update)
- **Sensitive data exposure:** No (own data)

**Dependencies:**

- Supabase (users, cities tables)

**Code pointers:**

- Route handler: `/src/app/api/profile/route.ts`
- Key functions: `updateUser()`, `getCityById()`

---

#### API-006: Get User Credits

**Endpoint ID:** API-006  
**Method:** GET  
**Path:** `/api/profile/credits`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Returns own credits only  

**Purpose:**  
Get detailed credits information (available, consumed, with transaction/event details).

**Request:**

- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "available": [ /* BillingCredit[] */ ],
      "consumed": [ /* BillingCredit[] */ ],
      "count": {
        "available": 2,
        "consumed": 5,
        "total": 7
      }
    }
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 401 | Not authenticated | Middleware blocks |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only)
- **Sensitive data exposure:** No (own billing data)

**Dependencies:**

- Supabase (billing_credits, billing_transactions, events tables)

**Code pointers:**

- Route handler: `/src/app/api/profile/credits/route.ts`

---

#### API-007: Get Notification Settings

**Endpoint ID:** API-007  
**Method:** GET  
**Path:** `/api/profile/notifications`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Returns own settings  

**Purpose:**  
Get user notification preferences.

**Request:**

- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "eventReminders": true,
      "eventUpdates": true,
      "clubInvites": false,
      ...
    }
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 401 | Not authenticated | Middleware blocks |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (notification_settings table)

**Code pointers:**

- Route handler: `/src/app/api/profile/notifications/route.ts`
- Key functions: `getUserNotificationSettings()`

---

#### API-008: Update Notification Settings

**Endpoint ID:** API-008  
**Method:** PATCH  
**Path:** `/api/profile/notifications`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Can only update own settings  

**Purpose:**  
Update user notification preferences.

**Request:**

- **Content-Type:** `application/json`
- **Body schema:** (Zod: `notificationSettingsUpdateSchema`)
  ```typescript
  {
    eventReminders?: boolean;
    eventUpdates?: boolean;
    clubInvites?: boolean;
    ...
  }
  ```
- **Idempotency:** Yes (PATCH-style update)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": { /* Updated notification_settings */ }
  }
  ```
- **Side effects:** Updates `notification_settings` table

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Zod schema violation |
| 401 | Not authenticated | Middleware blocks |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Low (single DB update)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (notification_settings table)

**Code pointers:**

- Route handler: `/src/app/api/profile/notifications/route.ts`
- Key functions: `updateUserNotificationSettings()`

---

#### API-009: Get User Cars

**Endpoint ID:** API-009  
**Method:** GET  
**Path:** `/api/profile/cars`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Returns own cars only  

**Purpose:**  
Get list of user cars with hydrated brand/vehicle type data.

**Request:**

- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "cars": [
        {
          "id": "uuid",
          "carBrand": { "id": "uuid", "name": "Toyota" },
          "carModelText": "Land Cruiser",
          "vehicleType": { "id": "uuid", "nameRu": "Внедорожник" },
          "isPrimary": true
        }
      ]
    }
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 401 | Not authenticated | Middleware blocks |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only)
- **Sensitive data exposure:** No (own car data)

**Dependencies:**

- Supabase (user_cars, car_brands, vehicle_types tables)

**Code pointers:**

- Route handler: `/src/app/api/profile/cars/route.ts`
- Key functions: `getUserCars()`, `hydrateUserCars()`

---

#### API-010: Create User Car

**Endpoint ID:** API-010  
**Method:** POST  
**Path:** `/api/profile/cars`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Can only create own cars  

**Purpose:**  
Add new car to user profile.

**Request:**

- **Content-Type:** `application/json`
- **Body schema:** (Zod: `userCarCreateSchema`)
  ```typescript
  {
    carBrandId: string; // UUID
    carModelText?: string;
    vehicleTypeId: string; // UUID
    isPrimary?: boolean;
  }
  ```
- **Idempotency:** No (creates new record)

**Response:**

- **Success:** 201
  ```json
  {
    "success": true,
    "data": {
      "car": { /* Created UserCar (hydrated) */ }
    }
  }
  ```
- **Side effects:** Inserts into `user_cars` table

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Zod schema violation |
| 401 | Not authenticated | Middleware blocks |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Medium (DB insert, no limit on car count)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (user_cars, car_brands, vehicle_types tables)

**Code pointers:**

- Route handler: `/src/app/api/profile/cars/route.ts`
- Key functions: `createUserCar()`, `hydrateUserCars()`

---

#### API-011: Update User Car

**Endpoint ID:** API-011  
**Method:** PUT  
**Path:** `/api/profile/cars?id=<carId>`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Can only update own cars  

**Purpose:**  
Update existing user car.

**Request:**

- **Content-Type:** `application/json`
- **Query params:** `id` (UUID)
- **Body schema:** Same as API-010
- **Idempotency:** Yes (full update)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "car": { /* Updated UserCar (hydrated) */ }
    }
  }
  ```
- **Side effects:** Updates `user_cars` table

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Missing car ID | Query param required |
| 400 | Validation error | Zod schema violation |
| 401 | Not authenticated | Middleware blocks |
| 404 | Car not found | Or not owned by user |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Low (ownership check, single DB update)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (user_cars, car_brands, vehicle_types tables)

**Code pointers:**

- Route handler: `/src/app/api/profile/cars/route.ts`
- Key functions: `updateUserCar()`, `hydrateUserCars()`

---

#### API-012: Set Primary Car

**Endpoint ID:** API-012  
**Method:** PATCH  
**Path:** `/api/profile/cars?id=<carId>`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Can only update own cars  

**Purpose:**  
Mark car as primary (unmarks others).

**Request:**

- **Query params:** `id` (UUID)
- **Body:** None (or empty JSON)
- **Idempotency:** Yes (atomic update)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "message": "Основной автомобиль изменен"
    }
  }
  ```
- **Side effects:** Updates `user_cars` table (sets `is_primary`)

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Missing car ID | Query param required |
| 401 | Not authenticated | Middleware blocks |
| 404 | Car not found | Or not owned by user |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Low (ownership check, single DB update)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (user_cars table)

**Code pointers:**

- Route handler: `/src/app/api/profile/cars/route.ts`
- Key functions: `setPrimaryUserCar()`

---

#### API-013: Delete User Car

**Endpoint ID:** API-013  
**Method:** DELETE  
**Path:** `/api/profile/cars?id=<carId>`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Can only delete own cars  

**Purpose:**  
Remove car from user profile.

**Request:**

- **Query params:** `id` (UUID)
- **Idempotency:** Yes (delete is idempotent)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "message": "Автомобиль удален"
    }
  }
  ```
- **Side effects:** Deletes from `user_cars` table

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Missing car ID | Query param required |
| 401 | Not authenticated | Middleware blocks |
| 404 | Car not found | Or not owned by user |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Low (ownership check, single DB delete)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (user_cars table)

**Code pointers:**

- Route handler: `/src/app/api/profile/cars/route.ts`
- Key functions: `deleteUserCar()`

---

### 9.3 Clubs

#### API-014: List Clubs

**Endpoint ID:** API-014  
**Method:** GET  
**Path:** `/api/clubs`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** N/A  
**Authorization:** N/A (public list)  

**Purpose:**  
List all clubs with optional search/filter by city, pagination.

**Request:**

- **Query params:**
  - `q` (optional): Search query (club name)
  - `cityId` (optional): Filter by city UUID
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 12)
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "clubs": [ /* Club[] */ ],
      "total": 42,
      "hasMore": true,
      "page": 1,
      "limit": 12
    }
  }
  ```
- **Side effects:** None

**Errors:**

- None (always returns data, empty array if no results)

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only, paginated)
- **Sensitive data exposure:** No (public club data)

**Dependencies:**

- Supabase (clubs, cities tables)

**Code pointers:**

- Route handler: `/src/app/api/clubs/route.ts`
- Key functions: `listClubs()`, `searchClubs()`, `listClubsByCity()`

---

#### API-015: Create Club

**Endpoint ID:** API-015  
**Method:** POST  
**Path:** `/api/clubs`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Any authenticated user can create club  

**Purpose:**  
Create new club (user becomes owner).

**Request:**

- **Content-Type:** `application/json`
- **Body schema:** (Zod: `clubCreateSchema`)
  ```typescript
  {
    name: string;
    description?: string;
    cityId?: string; // UUID
    logoUrl?: string;
  }
  ```
- **Idempotency:** No (creates new record)

**Response:**

- **Success:** 201
  ```json
  {
    "success": true,
    "data": {
      "club": { /* Created Club */ }
    }
  }
  ```
- **Side effects:** 
  - Inserts into `clubs` table
  - Inserts owner into `club_members` table

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Zod schema violation |
| 401 | Not authenticated | Middleware blocks |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Medium (DB insert, no limit on club count per user)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (clubs, club_members tables)

**Code pointers:**

- Route handler: `/src/app/api/clubs/route.ts`
- Key functions: `createClub()`

---

#### API-016: Get Club Details

**Endpoint ID:** API-016  
**Method:** GET  
**Path:** `/api/clubs/[id]`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** N/A  
**Authorization:** Public club data  

**Purpose:**  
Get club details with current plan, subscription, member count.

**Request:**

- **Path params:** `id` (UUID)
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "club": {
        "id": "uuid",
        "name": "Club Name",
        "currentPlan": { /* Plan */ },
        "subscription": { /* Subscription */ },
        "memberCount": 25,
        "isMember": true,
        "userRole": "owner"
      }
    }
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 404 | Club not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only)
- **Sensitive data exposure:** No (public club data)

**Dependencies:**

- Supabase (clubs, club_members, club_subscriptions, club_plans tables)

**Code pointers:**

- Route handler: `/src/app/api/clubs/[id]/route.ts`
- Key functions: `getClubWithDetails()`

---

#### API-017: Update Club

**Endpoint ID:** API-017  
**Method:** PATCH  
**Path:** `/api/clubs/[id]`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Owner only  

**Purpose:**  
Update club details (name, description, logo).

**Request:**

- **Content-Type:** `application/json`
- **Path params:** `id` (UUID)
- **Body schema:** (Zod: `clubUpdateSchema`)
  ```typescript
  {
    name?: string;
    description?: string;
    logoUrl?: string;
  }
  ```
- **Idempotency:** Yes (PATCH-style update)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "club": { /* Updated Club */ }
    }
  }
  ```
- **Side effects:** Updates `clubs` table

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Zod schema violation |
| 401 | Not authenticated | Middleware blocks |
| 403 | Not owner | Authorization check |
| 404 | Club not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Low (ownership check, single DB update)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (clubs, club_members tables)

**Code pointers:**

- Route handler: `/src/app/api/clubs/[id]/route.ts`
- Key functions: `updateClub()`

---

#### API-018: Delete Club

**Endpoint ID:** API-018  
**Method:** DELETE  
**Path:** `/api/clubs/[id]`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Owner only  

**Purpose:**  
Delete club (cascades members, subscriptions, events).

**Request:**

- **Path params:** `id` (UUID)
- **Idempotency:** Yes (delete is idempotent)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": { "success": true }
  }
  ```
- **Side effects:** 
  - Deletes from `clubs` table
  - Cascades to `club_members`, `club_subscriptions`, `events`

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 401 | Not authenticated | Middleware blocks |
| 403 | Not owner | Authorization check |
| 404 | Club not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Medium (cascading delete, permanent)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (clubs, club_members, club_subscriptions, events tables)

**Code pointers:**

- Route handler: `/src/app/api/clubs/[id]/route.ts`
- Key functions: `deleteClub()`

---

#### API-019: Get Club Members

**Endpoint ID:** API-019  
**Method:** GET  
**Path:** `/api/clubs/[id]/members`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** N/A  
**Authorization:** Public member list  

**Purpose:**  
Get list of club members with roles, user details.

**Request:**

- **Path params:** `id` (UUID)
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "members": [
        {
          "userId": "uuid",
          "role": "owner",
          "joinedAt": "2024-01-01T00:00:00Z",
          "user": { /* User profile */ }
        }
      ]
    }
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 404 | Club not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only)
- **Sensitive data exposure:** No (public member list)

**Dependencies:**

- Supabase (club_members, users tables)

**Code pointers:**

- Route handler: `/src/app/api/clubs/[id]/members/route.ts`
- Key functions: `getClubMembers()`

---

#### API-020: Add Club Member

**Endpoint ID:** API-020  
**Method:** POST  
**Path:** `/api/clubs/[id]/members`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Owner or admin only  

**Purpose:**  
Add member to club with specified role.

**Request:**

- **Content-Type:** `application/json`
- **Path params:** `id` (UUID)
- **Body schema:**
  ```typescript
  {
    userId: string; // UUID
    role: "member" | "admin" | "owner";
  }
  ```
- **Idempotency:** No (creates new membership, duplicate throws Conflict)

**Response:**

- **Success:** 201
  ```json
  {
    "success": true,
    "data": {
      "member": { /* Created ClubMember */ }
    }
  }
  ```
- **Side effects:** Inserts into `club_members` table

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Missing fields | userId, role required |
| 401 | Not authenticated | Middleware blocks |
| 403 | Not owner/admin | Authorization check |
| 404 | Club not found | Invalid UUID |
| 409 | Already member | Duplicate membership |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Medium (DB insert, no limit check)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (club_members, clubs tables)

**Code pointers:**

- Route handler: `/src/app/api/clubs/[id]/members/route.ts`
- Key functions: `addClubMember()`

---

#### API-021: Update Club Member Role

**Endpoint ID:** API-021  
**Method:** PATCH  
**Path:** `/api/clubs/[id]/members/[userId]`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Owner or admin only  

**Purpose:**  
Change member role (member → admin, etc).

**Request:**

- **Content-Type:** `application/json`
- **Path params:** `id` (club UUID), `userId` (member UUID)
- **Body schema:**
  ```typescript
  {
    role: "member" | "admin" | "owner";
  }
  ```
- **Idempotency:** Yes (update role)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "member": { /* Updated ClubMember */ }
    }
  }
  ```
- **Side effects:** Updates `club_members` table

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Missing role | Required field |
| 401 | Not authenticated | Middleware blocks |
| 403 | Not owner/admin | Authorization check |
| 404 | Club or member not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Low (authorization check, single DB update)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (club_members table)

**Code pointers:**

- Route handler: `/src/app/api/clubs/[id]/members/[userId]/route.ts`
- Key functions: `updateClubMemberRole()`

---

#### API-022: Remove Club Member

**Endpoint ID:** API-022  
**Method:** DELETE  
**Path:** `/api/clubs/[id]/members/[userId]`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Owner or admin (or self if member)  

**Purpose:**  
Remove member from club.

**Request:**

- **Path params:** `id` (club UUID), `userId` (member UUID)
- **Idempotency:** Yes (delete is idempotent)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": { "success": true }
  }
  ```
- **Side effects:** Deletes from `club_members` table

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 401 | Not authenticated | Middleware blocks |
| 403 | Not owner/admin/self | Authorization check |
| 404 | Club or member not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Low (authorization check, single DB delete)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (club_members table)

**Code pointers:**

- Route handler: `/src/app/api/clubs/[id]/members/[userId]/route.ts`
- Key functions: `removeClubMember()`

---

#### API-023: Get Club Current Plan

**Endpoint ID:** API-023  
**Method:** GET  
**Path:** `/api/clubs/[id]/current-plan`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Any authenticated user (public club plan info)  

**Purpose:**  
Get club's current plan and limits (for frontend form validation).

**Request:**

- **Path params:** `id` (club UUID)
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "planId": "club_50",
      "planTitle": "Club 50",
      "subscription": {
        "status": "active",
        "currentPeriodStart": "2024-01-01T00:00:00Z",
        "currentPeriodEnd": "2024-02-01T00:00:00Z",
        "graceUntil": null
      },
      "limits": {
        "maxMembers": 50,
        "maxEventParticipants": 50,
        "allowPaidEvents": true,
        "allowCsvExport": true
      }
    }
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 401 | Not authenticated | Middleware blocks |
| 404 | Club not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only)
- **Sensitive data exposure:** No (public plan info)

**Dependencies:**

- Supabase (clubs, club_subscriptions, club_plans tables)

**Code pointers:**

- Route handler: `/src/app/api/clubs/[id]/current-plan/route.ts`
- Key functions: `getClubCurrentPlan()`

---

#### API-024: Export Club Members (CSV)

**Endpoint ID:** API-024  
**Method:** GET  
**Path:** `/api/clubs/[id]/export`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Owner or admin only + CSV export plan feature  

**Purpose:**  
Export club members to CSV file (requires plan with `allowCsvExport`).

**Request:**

- **Path params:** `id` (club UUID)
- **Idempotency:** Yes (read-only, generates CSV on-the-fly)

**Response:**

- **Success:** 200 (CSV file)
  - **Content-Type:** `text/csv; charset=utf-8`
  - **Content-Disposition:** `attachment; filename="ClubName_members_2024-12-28.csv"`
  - **Body:** CSV data (user_id, name, telegram_handle, city, car_brand, car_model, role, joined_at)
- **Side effects:** None (read-only)

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 401 | Not authenticated | Middleware blocks |
| 402 | Plan limit (no CSV export) | PaywallError: CLUB_EXPORT_PARTICIPANTS_CSV |
| 403 | Not owner/admin | Authorization check |
| 404 | Club not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Medium (generates CSV, could be large)
- **Sensitive data exposure:** Yes (member personal data: telegram, city, car)

**Dependencies:**

- Supabase (club_members, users, cities, car_brands tables)
- Billing enforcement (via `enforceClubAction()`)

**Code pointers:**

- Route handler: `/src/app/api/clubs/[id]/export/route.ts`
- Key functions: `getClub()`, `listMembers()`, `enforceClubAction()`

---

### 9.4 Events

#### API-025: List Events

**Endpoint ID:** API-025  
**Method:** GET  
**Path:** `/api/events`  
**Runtime:** Node.js  
**Auth:** Optional (tab=my requires auth)  
**Auth mechanism:** JWT (optional for public tabs)  
**Authorization:** Visibility-based (public, unlisted, restricted)  

**Purpose:**  
List events with filters, search, pagination. Server-side rendering.

**Request:**

- **Query params:**
  - `tab` (optional): `all` | `upcoming` | `my` (default: `upcoming`)
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (min: 1, max: 50, default: 12)
  - `sort` (optional): `date` | `name` (default: `date`)
  - `search` (optional): Search query (event title)
  - `cityId` (optional): Filter by city UUID
  - `categoryId` (optional): Filter by category UUID
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "events": [ /* EventListItem[] */ ],
    "meta": {
      "total": 42,
      "page": 1,
      "limit": 12,
      "totalPages": 4,
      "hasMore": true,
      "nextCursor": null
    }
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Invalid query params (Zod) |
| 401 | tab=my without auth | AuthError |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only, paginated)
- **Sensitive data exposure:** No (public event data)

**Dependencies:**

- Supabase (events, cities, event_categories, users tables)

**Code pointers:**

- Route handler: `/src/app/api/events/route.ts`
- Key functions: `listVisibleEventsForUserPaginated()`
- SSOT: `/docs/ssot/SSOT_ARCHITECTURE.md § 10` (Events Listing, Pagination, and Stats)

---

#### API-026: Create Event

**Endpoint ID:** API-026  
**Method:** POST  
**Path:** `/api/events`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Any authenticated user  

**Purpose:**  
Create new event (personal or club).

**Request:**

- **Content-Type:** `application/json`
- **Query params:** `confirm_credit=1` (optional, for one-off credit consumption)
- **Body schema:** (Zod: `eventCreateSchema`)
  ```typescript
  {
    title: string;
    description?: string;
    startDate: string; // ISO 8601
    cityId: string; // UUID
    categoryId: string; // UUID
    maxParticipants: number;
    clubId?: string; // UUID (if club event)
    visibility: "public" | "unlisted" | "restricted";
    isPaid?: boolean;
    priceAmount?: number;
    priceCurrencyCode?: string;
    ...
  }
  ```
- **Idempotency:** No (creates new record)

**Response:**

- **Success:** 201
  ```json
  {
    "success": true,
    "data": {
      "event": {
        "id": "uuid",
        "title": "string",
        "description": "string",
        "dateTime": "ISO 8601",
        "cityId": "uuid",
        "categoryId": "uuid",
        "maxParticipants": 100,
        "participantsCount": 0,
        "visibility": "public",
        "isPaid": false,
        "price": null,
        "currencyCode": null,
        "createdByUserId": "uuid",
        "clubId": null,
        "allowedBrands": [],
        "locations": [
          {
            "id": "uuid",
            "title": "Точка сбора",
            "sortOrder": 1,
            "latitude": null,
            "longitude": null
          }
        ],
        "vehicleTypeRequirement": "any",
        "customFieldsSchema": [],
        "rules": null,
        "allowAnonymousRegistration": true,
        "registrationManuallyClosed": false,
        "createdAt": "ISO 8601",
        "updatedAt": "ISO 8601"
      }
    }
  }
  ```
  **Note:** Response follows global success format (§ 1.4). Event object includes `id` field needed for navigation.
  
- **Side effects:** Inserts into `events` table, creates default location, grants owner access

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Zod schema violation |
| 401 | Not authenticated | Middleware blocks |
| 402 | Plan limit exceeded | PaywallError (club event, maxParticipants > plan limit) |
| 409 | Credit confirmation required | CreditConfirmationRequiredError (personal event 16-500 participants) |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Medium (DB insert, could create many events)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (events, clubs tables)
- Billing enforcement (via `enforceClubAction()` for club events)

**Code pointers:**

- Route handler: `/src/app/api/events/route.ts`
- Key functions: `createEvent()`

---

#### API-027: Get Event Details

**Endpoint ID:** API-028  
**Method:** GET  
**Path:** `/api/events/[id]`  
**Runtime:** Node.js  
**Auth:** Optional (visibility check may require auth for restricted events)  
**Auth mechanism:** JWT (optional)  
**Authorization:** Visibility-based + auto-grant for restricted events  

**Purpose:**  
Get full event details with hydrated relations (city, category, organizer, participants).

**Request:**

- **Path params:** `id` (UUID)
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "event": {
      "id": "uuid",
      "title": "Event Title",
      "city": { /* City */ },
      "category": { /* EventCategory */ },
      "organizer": { /* User */ },
      "participantsCount": 10,
      "maxParticipants": 50,
      ...
    }
  }
  ```
- **Side effects:** 
  - Auto-grant access for restricted events (first view by authenticated user)

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 404 | Event not found | Invalid UUID |
| 403 | Restricted event, no auth | Visibility check failed |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only)
- **Sensitive data exposure:** No (public event data)

**Dependencies:**

- Supabase (events, cities, event_categories, users, event_access_grants tables)

**Code pointers:**

- Route handler: `/src/app/api/events/[id]/route.ts`
- Key functions: `getEventWithVisibility()`, `hydrateEvent()`

---

#### API-028: Update Event

**Endpoint ID:** API-028  
**Method:** PUT  
**Path:** `/api/events/[id]`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Event owner only  

**Purpose:**  
Update event details.

**Request:**

- **Content-Type:** `application/json`
- **Path params:** `id` (UUID)
- **Query params:** `confirm_credit=1` (optional, for one-off credit consumption)
- **Body schema:** (Zod: `eventUpdateSchema`) — same as API-026
- **Idempotency:** Yes (full update)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "event": { /* Updated Event */ }
    }
  }
  ```
  **Note:** Response follows global success format (§ 1.4).
  
- **Side effects:** 
  - Updates `events` table
  - Revalidates Next.js cache (`/events/[id]`, `/events`)

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Zod schema violation |
| 401 | Not authenticated | Middleware blocks |
| 402 | Plan limit exceeded | PaywallError (club event) |
| 403 | Not event owner | Authorization check |
| 404 | Event not found | Invalid UUID |
| 409 | Credit confirmation required | CreditConfirmationRequiredError (personal event 16-500 participants) |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Low (ownership check, single DB update)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (events table)
- Billing enforcement (via `enforceClubAction()` for club events)

**Code pointers:**

- Route handler: `/src/app/api/events/[id]/route.ts`
- Key functions: `updateEvent()`

---

#### API-029: Delete Event

**Endpoint ID:** API-029  
**Method:** DELETE  
**Path:** `/api/events/[id]`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Event owner only  

**Purpose:**  
Delete event (cascades participants, access grants).

**Request:**

- **Path params:** `id` (UUID)
- **Idempotency:** Yes (delete is idempotent)

**Response:**

- **Success:** 200
  ```json
  {
    "ok": true
  }
  ```
- **Side effects:** 
  - Deletes from `events` table
  - Cascades to `event_participants`, `event_access_grants`
  - Revalidates Next.js cache

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 401 | Not authenticated | Middleware blocks |
| 403 | Not event owner | Authorization check |
| 404 | Event not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Medium (permanent delete, cascading)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (events, event_participants, event_access_grants tables)

**Code pointers:**

- Route handler: `/src/app/api/events/[id]/route.ts`
- Key functions: `deleteEvent()`

---

#### API-030: Toggle Event Registration

**Endpoint ID:** API-030  
**Method:** PATCH  
**Path:** `/api/events/[id]/registration`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Event owner only  

**Purpose:**  
Manually open/close event registration (for future events only).

**Request:**

- **Content-Type:** `application/json`
- **Path params:** `id` (UUID)
- **Body schema:**
  ```typescript
  {
    registrationManuallyClosed: boolean;
  }
  ```
- **Idempotency:** Yes (update flag)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "registrationManuallyClosed": true
  }
  ```
- **Side effects:** 
  - Updates `events` table (`registration_manually_closed`)
  - Revalidates Next.js cache

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Past event | Can't toggle for past events (security) |
| 401 | Not authenticated | Middleware blocks |
| 403 | Not event owner | Authorization check |
| 404 | Event not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Low (ownership check, single DB update)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (events table)

**Code pointers:**

- Route handler: `/src/app/api/events/[id]/registration/route.ts`

---

#### API-031: Get Event Participants

**Endpoint ID:** API-031  
**Method:** GET  
**Path:** `/api/events/[id]/participants`  
**Runtime:** Node.js  
**Auth:** Optional (visibility check may require auth)  
**Auth mechanism:** JWT (optional)  
**Authorization:** Event visibility check (must have access to event)  

**Purpose:**  
Get list of event participants with status, user details.

**Request:**

- **Path params:** `id` (UUID)
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "participants": [
        {
          "id": "uuid",
          "status": "confirmed",
          "user": { /* User profile (if registered) */ },
          "guestName": "Guest Name (if guest)",
          ...
        }
      ]
    }
  }
  ```
  **Note:** Response follows global success format (§ 1.4).
  
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 403 | No access to event | Visibility check failed |
| 404 | Event not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only)
- **Sensitive data exposure:** No (public participant list)

**Dependencies:**

- Supabase (event_participants, users, events tables)

**Code pointers:**

- Route handler: `/src/app/api/events/[id]/participants/route.ts`
- Key functions: `listParticipants()`, `getEventWithVisibility()`

---

#### API-032: Register for Event (Guest or User)

**Endpoint ID:** API-032  
**Method:** POST  
**Path:** `/api/events/[id]/participants`  
**Runtime:** Node.js  
**Auth:** Optional (allows guest registration)  
**Auth mechanism:** JWT (optional) OR `guest_session_id` cookie  
**Authorization:** Event visibility check + registration open check  

**Purpose:**  
Register for event (authenticated user OR guest).

**Request:**

- **Content-Type:** `application/json`
- **Path params:** `id` (UUID)
- **Body schema:** (Zod: `participantCreateSchema`)
  ```typescript
  {
    guestName?: string; // Required if not authenticated
    guestPhone?: string;
    status?: "confirmed" | "maybe" | "declined"; // Default: confirmed
    vehicleCount?: number;
    ...
  }
  ```
- **Idempotency:** No (duplicate registration throws Conflict)

**Response:**

- **Success:** 201
  ```json
  {
    "participant": { /* Created Participant */ }
  }
  ```
- **Side effects:** 
  - Inserts into `event_participants` table
  - Revalidates Next.js cache
  - Creates `guest_session_id` cookie (if guest)

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Zod schema violation (e.g. missing guestName for guest) |
| 403 | Registration closed | Event full or manually closed |
| 404 | Event not found | Invalid UUID |
| 409 | Already registered | Duplicate user_id OR guest_session_id |

**Security & Abuse:**

- **Rate limit:** guest tier (10 req/min) for guests, write tier (30 req/min) for authenticated
- **Spam / Cost abuse risk:** High (guest registrations, no auth required)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (event_participants, events tables)

**Code pointers:**

- Route handler: `/src/app/api/events/[id]/participants/route.ts`
- Key functions: `registerParticipant()`, `getOrCreateGuestSessionId()`

---

#### API-033: Update Participant

**Endpoint ID:** API-033  
**Method:** PATCH  
**Path:** `/api/events/[id]/participants/[participantId]`  
**Runtime:** Node.js  
**Auth:** Optional (guest can update own registration)  
**Auth mechanism:** JWT (optional) OR `guest_session_id` cookie  
**Authorization:** Participant owner (user_id OR guest_session_id match)  

**Purpose:**  
Update participant status, vehicle count, etc.

**Request:**

- **Content-Type:** `application/json`
- **Path params:** `id` (event UUID), `participantId` (participant UUID)
- **Body schema:** (Zod: `participantUpdateSchema`)
  ```typescript
  {
    status?: "confirmed" | "maybe" | "declined";
    vehicleCount?: number;
    ...
  }
  ```
- **Idempotency:** Yes (PATCH-style update)

**Response:**

- **Success:** 200
  ```json
  {
    "participant": { /* Updated Participant */ }
  }
  ```
- **Side effects:** 
  - Updates `event_participants` table
  - Revalidates Next.js cache

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Zod schema violation |
| 403 | Not participant owner | Authorization check (user_id OR guest_session_id mismatch) |
| 404 | Participant not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** guest tier (10 req/min) for guests, write tier (30 req/min) for authenticated
- **Spam / Cost abuse risk:** Low (ownership check, single DB update)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (event_participants table)

**Code pointers:**

- Route handler: `/src/app/api/events/[id]/participants/[participantId]/route.ts`
- Key functions: `updateParticipant()`, `getGuestSessionId()`

---

#### API-034: Delete Participant

**Endpoint ID:** API-034  
**Method:** DELETE  
**Path:** `/api/events/[id]/participants/[participantId]`  
**Runtime:** Node.js  
**Auth:** Optional (guest can delete own registration)  
**Auth mechanism:** JWT (optional) OR `guest_session_id` cookie  
**Authorization:** Participant owner (user_id OR guest_session_id match) OR event owner  

**Purpose:**  
Cancel event registration.

**Request:**

- **Path params:** `id` (event UUID), `participantId` (participant UUID)
- **Idempotency:** Yes (delete is idempotent)

**Response:**

- **Success:** 200
  ```json
  {
    "ok": true
  }
  ```
- **Side effects:** 
  - Deletes from `event_participants` table
  - Revalidates Next.js cache

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 403 | Not participant owner/event owner | Authorization check |
| 404 | Participant not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** guest tier (10 req/min) for guests, write tier (30 req/min) for authenticated
- **Spam / Cost abuse risk:** Low (ownership check, single DB delete)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (event_participants, events tables)

**Code pointers:**

- Route handler: `/src/app/api/events/[id]/participants/[participantId]/route.ts`
- Key functions: `deleteParticipant()`, `getGuestSessionId()`

---

### 9.5 Billing

#### API-035: Get Billing Products

**Endpoint ID:** API-035  
**Method:** GET  
**Path:** `/api/billing/products`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** N/A  
**Authorization:** N/A  

**Purpose:**  
List active purchasable products (one-off credits).

**Request:**

- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": [
      {
        "code": "EVENT_UPGRADE_500",
        "title": "Event Upgrade (500 participants)",
        "price": 5000,
        "currencyCode": "KZT",
        "isActive": true
      }
    ]
  }
  ```
- **Side effects:** None

**Errors:**

- None (always returns data, empty array if no products)

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only)
- **Sensitive data exposure:** No (public pricing)

**Dependencies:**

- Supabase (billing_products table)

**Code pointers:**

- Route handler: `/src/app/api/billing/products/route.ts`
- Key functions: `getActiveProducts()`

---

#### API-036: Create Purchase Intent

**Endpoint ID:** API-036  
**Method:** POST  
**Path:** `/api/billing/purchase-intent`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Any authenticated user  

**Purpose:**  
Create purchase intent for one-off credit OR club subscription. Returns Kaspi payment details (STUB).

**Request:**

- **Content-Type:** `application/json`
- **Body schema:**
  ```typescript
  {
    product_code: string; // "EVENT_UPGRADE_500" | "CLUB_50" | "CLUB_500" | "CLUB_UNLIMITED"
    quantity: number; // Default: 1 (must be 1 for club subscriptions)
    context?: {
      eventId?: string;
      clubId?: string;
    };
  }
  ```
- **Idempotency:** No (creates new transaction)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "transaction_id": "uuid",
      "transaction_reference": "KASPI_123_ABC",
      "payment": {
        "provider": "kaspi",
        "invoice_url": "https://kaspi.kz/pay/...",
        "qr_payload": "kaspi://pay/...",
        "instructions": "...",
        "dev_note": "DEV MODE: Use /api/dev/billing/settle to complete"
      }
    }
  }
  ```
- **Side effects:** Creates pending transaction in `billing_transactions` table

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Invalid product_code | Unknown product |
| 400 | Invalid quantity | Must be 1 for club subscriptions |
| 401 | Not authenticated | Middleware blocks |
| 404 | Product/plan not found | DB lookup failed |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Medium (creates pending transaction, no payment yet)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (billing_transactions, billing_products, club_plans tables)
- Kaspi API (STUB mode, returns fake payment URL)

**Code pointers:**

- Route handler: `/src/app/api/billing/purchase-intent/route.ts`
- Key functions: `getProductByCode()`, `getPlanById()`

---

#### API-037: Get Transaction Status

**Endpoint ID:** API-037  
**Method:** GET  
**Path:** `/api/billing/transactions/status`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Transaction owner (user_id match, TODO: add club owner check)  

**Purpose:**  
Poll transaction status (for payment confirmation in paywall).

**Request:**

- **Query params:**
  - `transaction_id` (required if no transaction_reference): UUID
  - `transaction_reference` (required if no transaction_id): String
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "transaction_id": "uuid",
      "status": "pending" | "completed" | "failed" | "refunded",
      "product_code": "EVENT_UPGRADE_500",
      "amount": 5000,
      "currency_code": "KZT",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Missing transaction_id/reference | At least one required |
| 401 | Not authenticated | Middleware blocks |
| 404 | Transaction not found | Invalid UUID/reference |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only, but could poll frequently)
- **Sensitive data exposure:** Yes (transaction amount, but only own transactions)

**Dependencies:**

- Supabase (billing_transactions table)

**Code pointers:**

- Route handler: `/src/app/api/billing/transactions/status/route.ts`

---

#### API-038: DEV Settle Transaction

**Endpoint ID:** API-038  
**Method:** POST  
**Path:** `/api/dev/billing/settle`  
**Runtime:** Node.js  
**Auth:** None (DEV only, disabled in production)  
**Auth mechanism:** N/A (ENV check)  
**Authorization:** Disabled in production (NODE_ENV=production check)  

**Purpose:**  
**DEV ONLY** — Manually complete/fail transaction (stub for Kaspi webhook).

**Request:**

- **Content-Type:** `application/json`
- **Body schema:**
  ```typescript
  {
    transaction_id: string; // UUID
    status: "completed" | "failed" | "refunded";
  }
  ```
- **Idempotency:** Yes (update status)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "transaction_id": "uuid",
      "status": "completed",
      "message": "Transaction marked as completed"
    }
  }
  ```
- **Side effects:** 
  - Updates `billing_transactions` table
  - Creates `billing_credits` record (if completed + one-off credit)
  - Creates/extends `club_subscriptions` (if completed + club subscription, TODO)

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Zod schema violation |
| 403 | Production environment | Endpoint disabled |
| 404 | Transaction not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** write tier (30 req/min)
- **Spam / Cost abuse risk:** Critical (could issue free credits, but DEV only)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (billing_transactions, billing_credits, club_subscriptions tables)

**Code pointers:**

- Route handler: `/src/app/api/dev/billing/settle/route.ts`
- Key functions: `createBillingCredit()`

---

### 9.6 Reference Data

#### API-039: List Plans

**Endpoint ID:** API-039  
**Method:** GET  
**Path:** `/api/plans`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** N/A  
**Authorization:** N/A  

**Purpose:**  
List all club plans (for pricing page).

**Request:**

- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "plans": [
        {
          "id": "free",
          "title": "Free",
          "priceMonthly": 0,
          "maxMembers": 0,
          "maxEventParticipants": 15,
          "allowPaidEvents": false,
          "allowCsvExport": false
        },
        ...
      ]
    }
  }
  ```
- **Side effects:** None

**Errors:**

- None (always returns data)

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only, cached in DB)
- **Sensitive data exposure:** No (public pricing)

**Dependencies:**

- Supabase (club_plans table)

**Code pointers:**

- Route handler: `/src/app/api/plans/route.ts`
- Key functions: `listPublicPlans()`

---

#### API-040: List Cities

**Endpoint ID:** API-040  
**Method:** GET  
**Path:** `/api/cities`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** N/A  
**Authorization:** N/A  

**Purpose:**  
List cities with search, filter (popular, by IDs).

**Request:**

- **Query params:**
  - `q` (optional): Search query (city name)
  - `popular` (optional): `true` (get popular cities only)
  - `ids` (optional): Comma-separated UUIDs (get cities by IDs)
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "cities": [
        {
          "id": "uuid",
          "name": "Алматы",
          "region": "Алматы",
          "country": "Казахстан",
          "isPopular": true
        }
      ]
    }
  }
  ```
- **Side effects:** None

**Errors:**

- None (always returns data, empty array if no results)

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only, reference data)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (cities table)

**Code pointers:**

- Route handler: `/src/app/api/cities/route.ts`
- Key functions: `searchCities()`, `getPopularCities()`, `getAllCities()`, `getCitiesByIds()`

---

#### API-041: Get City by ID

**Endpoint ID:** API-041  
**Method:** GET  
**Path:** `/api/cities/[id]`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** N/A  
**Authorization:** N/A  

**Purpose:**  
Get city details by UUID.

**Request:**

- **Path params:** `id` (UUID)
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  - **Cache-Control:** `public, s-maxage=86400, stale-while-revalidate=604800` (24h cache)
  ```json
  {
    "success": true,
    "data": {
      "city": {
        "id": "uuid",
        "name": "Алматы",
        "region": "Алматы",
        "country": "Казахстан"
      }
    }
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 404 | City not found | Invalid UUID |

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only, heavily cached)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (cities table)

**Code pointers:**

- Route handler: `/src/app/api/cities/[id]/route.ts`
- Key functions: `getCityById()`

---

#### API-042: List Currencies

**Endpoint ID:** API-042  
**Method:** GET  
**Path:** `/api/currencies`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** N/A  
**Authorization:** N/A  

**Purpose:**  
List active currencies (for paid events).

**Request:**

- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": [
      {
        "code": "KZT",
        "name": "Тенге",
        "symbol": "₸",
        "isActive": true
      }
    ]
  }
  ```
- **Side effects:** None

**Errors:**

- None (always returns data)

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only, small reference table)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (currencies table)

**Code pointers:**

- Route handler: `/src/app/api/currencies/route.ts`
- Key functions: `getActiveCurrencies()`

---

#### API-043: List Event Categories

**Endpoint ID:** API-043  
**Method:** GET  
**Path:** `/api/event-categories`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** N/A  
**Authorization:** N/A  

**Purpose:**  
List active event categories (offroad, camping, etc).

**Request:**

- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  - **Cache-Control:** `public, s-maxage=3600, stale-while-revalidate=86400` (1h cache)
  ```json
  {
    "success": true,
    "data": {
      "categories": [
        {
          "id": "uuid",
          "code": "offroad",
          "nameRu": "Оффроуд",
          "nameEn": "Offroad",
          "icon": "🚙",
          "isDefault": false
        }
      ]
    }
  }
  ```
- **Side effects:** None

**Errors:**

- None (always returns data)

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only, cached 1h)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (event_categories table)

**Code pointers:**

- Route handler: `/src/app/api/event-categories/route.ts`
- Key functions: `getActiveEventCategories()`

---

#### API-044: List Car Brands

**Endpoint ID:** API-044  
**Method:** GET  
**Path:** `/api/car-brands`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** N/A  
**Authorization:** N/A  

**Purpose:**  
List car brands (Toyota, Land Rover, etc).

**Request:**

- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  - **Cache-Control:** `public, s-maxage=3600, stale-while-revalidate=86400` (1h cache)
  ```json
  {
    "success": true,
    "data": {
      "brands": [
        {
          "id": "uuid",
          "name": "Toyota",
          "displayOrder": 1
        }
      ]
    }
  }
  ```
- **Side effects:** None

**Errors:**

- None (always returns empty array on failure)

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only, cached 1h)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (car_brands table)

**Code pointers:**

- Route handler: `/src/app/api/car-brands/route.ts`
- Key functions: `listCarBrands()`

---

#### API-045: List Vehicle Types

**Endpoint ID:** API-045  
**Method:** GET  
**Path:** `/api/vehicle-types`  
**Runtime:** Node.js  
**Auth:** None (public)  
**Auth mechanism:** N/A  
**Authorization:** N/A  

**Purpose:**  
List active vehicle types (SUV, sedan, etc) for forms.

**Request:**

- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  - **Cache-Control:** `public, s-maxage=3600, stale-while-revalidate=86400` (1h cache)
  ```json
  {
    "success": true,
    "data": {
      "vehicleTypes": [
        {
          "value": "uuid",
          "label": "Внедорожник"
        }
      ]
    }
  }
  ```
- **Side effects:** None

**Errors:**

- None (always returns data)

**Security & Abuse:**

- **Rate limit:** read tier (300 req/5min)
- **Spam / Cost abuse risk:** Low (read-only, cached 1h)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (vehicle_types table)

**Code pointers:**

- Route handler: `/src/app/api/vehicle-types/route.ts`
- Key functions: `getActiveVehicleTypes()`

---

### 9.7 AI

#### API-046: Generate Event Rules (AI)

**Endpoint ID:** API-046  
**Method:** POST  
**Path:** `/api/ai/events/generate-rules`  
**Runtime:** Node.js  
**Auth:** Required (JWT)  
**Auth mechanism:** JWT via middleware  
**Authorization:** Any authenticated user  

**Purpose:**  
Generate event rules text using OpenAI GPT (based on event data).

**Request:**

- **Content-Type:** `application/json`
- **Body schema:** (Zod: `generateRulesRequestSchema`)
  ```typescript
  {
    eventId?: string; // UUID (if editing existing event)
    title: string;
    categoryId: string; // UUID
    cityId: string; // UUID
    maxParticipants: number;
    isPaid?: boolean;
    priceAmount?: number;
    description?: string;
    ...
  }
  ```
- **Idempotency:** No (generates new text each time)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "rulesText": "Правила участия:\n1. ...\n2. ..."
    }
  }
  ```
- **Side effects:** 
  - OpenAI API call (costs money per token)
  - Logs usage

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 400 | Validation error | Zod schema violation |
| 401 | Not authenticated | Middleware blocks |
| 500 | OpenAI API error | API key invalid, quota exceeded, etc |

**Security & Abuse:**

- **Rate limit:** critical tier (3 req/min) — STRICT LIMIT
- **Spam / Cost abuse risk:** Critical (OpenAI API costs per token, abuse = $$)
- **Sensitive data exposure:** No (OpenAI key never exposed to client)

**Dependencies:**

- OpenAI API (gpt-4o-mini)
- Supabase (event_categories, cities tables — for hydration)

**Code pointers:**

- Route handler: `/src/app/api/ai/events/generate-rules/route.ts`
- Key functions: `resolveEventData()`, `buildRulesSystemPrompt()`, `generateText()`

---

### 9.8 Admin

#### API-047: Clear Caches

**Endpoint ID:** API-047  
**Method:** POST  
**Path:** `/api/admin/cache/clear`  
**Runtime:** Node.js  
**Auth:** Admin secret required  
**Auth mechanism:** `x-admin-secret` header (must match `ADMIN_SECRET` env)  
**Authorization:** Admin only  

**Purpose:**  
Manually clear all in-memory static caches (plans, currencies, car brands, etc).

**Request:**

- **Headers:** `x-admin-secret: <ADMIN_SECRET>`
- **Body:** None
- **Idempotency:** Yes (clearing already-cleared cache is safe)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "message": "All static caches cleared successfully",
      "timestamp": "2024-12-28T00:00:00Z",
      "clearedCaches": ["plans", "currencies", "car_brands", ...]
    }
  }
  ```
- **Side effects:** Clears in-memory StaticCache instances

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 403 | Invalid/missing admin secret | Middleware blocks |
| 500 | Error clearing caches | Internal error |

**Security & Abuse:**

- **Rate limit:** None (admin-only, secret-protected)
- **Spam / Cost abuse risk:** Low (admin-only, no external calls)
- **Sensitive data exposure:** No

**Dependencies:**

- StaticCache (`/lib/cache/staticCache.ts`)

**Code pointers:**

- Route handler: `/src/app/api/admin/cache/clear/route.ts`
- Key functions: `clearAllCaches()`

---

### 9.9 Cron

#### API-048: Process Notifications Queue

**Endpoint ID:** API-048  
**Method:** POST  
**Path:** `/api/cron/process-notifications`  
**Runtime:** Node.js  
**Auth:** Cron secret OR Vercel cron header  
**Auth mechanism:** `x-vercel-cron` header (Vercel Cron) OR `Authorization: Bearer <CRON_SECRET>`  
**Authorization:** Vercel Cron or manual trigger with secret  

**Purpose:**  
Process notification queue (send pending notifications, reset stuck ones).

**Request:**

- **Headers:** `x-vercel-cron: 1` (Vercel Cron) OR `Authorization: Bearer <CRON_SECRET>`
- **Body:** None
- **Idempotency:** Yes (safe to run multiple times, worker ID prevents conflicts)

**Response:**

- **Success:** 200
  ```json
  {
    "success": true,
    "data": {
      "workerId": "worker-iad1-123456789",
      "duration": 1234,
      "processed": {
        "sent": 10,
        "failed": 1,
        "skipped": 0
      },
      "maintenance": {
        "reset": 2
      },
      "queueStats": {
        "pending": 5,
        "processing": 0,
        "sent": 100,
        "failed": 3
      }
    }
  }
  ```
- **Side effects:** 
  - Sends notifications via Telegram
  - Updates `notification_queue` table
  - Resets stuck notifications (processing > 30 min)

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 403 | Invalid/missing cron secret | Middleware blocks |
| 500 | Error processing queue | Internal error |

**Security & Abuse:**

- **Rate limit:** None (cron-only, secret-protected)
- **Spam / Cost abuse risk:** Low (cron-only, but sends real Telegram messages)
- **Sensitive data exposure:** No

**Dependencies:**

- Telegram Bot API (sends messages)
- Supabase (notification_queue, notification_settings, users tables)

**Code pointers:**

- Route handler: `/src/app/api/cron/process-notifications/route.ts`
- Key functions: `processNotificationQueue()`, `resetStuckNotificationsTask()`

---

#### API-049: Get Notification Queue Stats (Manual)

**Endpoint ID:** API-049  
**Method:** GET  
**Path:** `/api/cron/process-notifications`  
**Runtime:** Node.js  
**Auth:** Cron secret OR Vercel cron header  
**Auth mechanism:** Same as API-049  
**Authorization:** Same as API-049  

**Purpose:**  
Get current notification queue stats without triggering processing (for monitoring).

**Request:**

- **Headers:** Same as API-049
- **Query params:** None
- **Idempotency:** Yes (read-only)

**Response:**

- **Success:** 200
  ```json
  {
    "queueStats": {
      "pending": 5,
      "processing": 0,
      "sent": 100,
      "failed": 3
    },
    "message": "Use POST to trigger processing"
  }
  ```
- **Side effects:** None

**Errors:**

| Status | Condition | Notes |
|--------|-----------|-------|
| 403 | Invalid/missing cron secret | Middleware blocks |

**Security & Abuse:**

- **Rate limit:** None (cron-only, secret-protected)
- **Spam / Cost abuse risk:** Low (read-only)
- **Sensitive data exposure:** No

**Dependencies:**

- Supabase (notification_queue table)

**Code pointers:**

- Route handler: `/src/app/api/cron/process-notifications/route.ts`
- Key functions: `getQueueStats()`

---

## 10. Coverage & Self-Audit

### 10.1 Route Handler Files Found

Total route handlers discovered: **33 files**

| # | Path | Methods | API IDs |
|---|------|---------|---------|
| 1 | `/src/app/api/auth/telegram/route.ts` | POST, GET | API-001 |
| 2 | `/src/app/api/auth/me/route.ts` | GET | API-002 |
| 3 | `/src/app/api/auth/logout/route.ts` | POST, GET | API-003 |
| 4 | `/src/app/api/profile/route.ts` | GET, PATCH | API-004, API-005 |
| 5 | `/src/app/api/profile/credits/route.ts` | GET | API-006 |
| 6 | `/src/app/api/profile/notifications/route.ts` | GET, PATCH | API-007, API-008 |
| 7 | `/src/app/api/profile/cars/route.ts` | GET, POST, PUT, PATCH, DELETE | API-009 to API-013 |
| 8 | `/src/app/api/clubs/route.ts` | GET, POST | API-014, API-015 |
| 9 | `/src/app/api/clubs/[id]/route.ts` | GET, PATCH, DELETE | API-016 to API-018 |
| 10 | `/src/app/api/clubs/[id]/members/route.ts` | GET, POST | API-019, API-020 |
| 11 | `/src/app/api/clubs/[id]/members/[userId]/route.ts` | PATCH, DELETE | API-021, API-022 |
| 12 | `/src/app/api/clubs/[id]/current-plan/route.ts` | GET | API-023 |
| 13 | `/src/app/api/clubs/[id]/export/route.ts` | GET | API-024 |
| 14 | `/src/app/api/events/route.ts` | GET, POST | API-025, API-026 |
| 15 | `/src/app/api/events/[id]/route.ts` | GET, PUT, DELETE | API-027 to API-029 |
| 16 | `/src/app/api/events/[id]/registration/route.ts` | PATCH | API-030 |
| 17 | `/src/app/api/events/[id]/participants/route.ts` | GET, POST | API-031, API-032 |
| 18 | `/src/app/api/events/[id]/participants/[participantId]/route.ts` | PATCH, DELETE | API-033, API-034 |
| 19 | `/src/app/api/billing/products/route.ts` | GET | API-035 |
| 20 | `/src/app/api/billing/purchase-intent/route.ts` | POST | API-036 |
| 21 | `/src/app/api/billing/transactions/status/route.ts` | GET | API-037 |
| 22 | `/src/app/api/dev/billing/settle/route.ts` | POST | API-038 |
| 23 | `/src/app/api/plans/route.ts` | GET | API-039 |
| 24 | `/src/app/api/cities/route.ts` | GET | API-040 |
| 25 | `/src/app/api/cities/[id]/route.ts` | GET | API-041 |
| 26 | `/src/app/api/currencies/route.ts` | GET | API-042 |
| 27 | `/src/app/api/event-categories/route.ts` | GET | API-043 |
| 28 | `/src/app/api/car-brands/route.ts` | GET | API-044 |
| 29 | `/src/app/api/vehicle-types/route.ts` | GET | API-045 |
| 30 | `/src/app/api/ai/events/generate-rules/route.ts` | POST | API-046 |
| 31 | `/src/app/api/admin/cache/clear/route.ts` | POST | API-047 |
| 32 | `/src/app/api/cron/process-notifications/route.ts` | POST, GET | API-048, API-049 |

### 10.2 Coverage Summary

- **Total route handler files:** 32
- **Total endpoints documented:** 49 (API-001 to API-049)
- **Discrepancy:** Some files contain multiple HTTP methods (e.g. `/profile/cars` has GET, POST, PUT, PATCH, DELETE)

**Verification:**

✅ All route handlers discovered via `glob_file_search` are documented  
✅ Every endpoint has unique `Endpoint ID`  
✅ Every endpoint has `Security & Abuse` section  
✅ No endpoint is missing

### 10.3 Security Sanity Check

**Endpoints without rate limiting:**
- None (all endpoints have middleware rate limiting OR secret protection)

**Endpoints with HIGH abuse risk:**
- API-032: Register for Event (guest registration, no auth, DB insert)

**Endpoints with CRITICAL cost abuse risk:**
- API-046: Generate Event Rules (AI) — OpenAI API costs per token, rate limit 3 req/min

**Endpoints returning sensitive data:**
- API-024: Export Club Members (CSV) — member personal data (telegram, city, car)
- API-037: Get Transaction Status — transaction amount (but only own transactions)

**Billing/Credits/AI cost touchpoints:**
- API-026, API-028: Create/Update Event (consumes one-off credits for personal events 16-500 participants)
- API-036: Create Purchase Intent (creates pending transaction)
- API-038: DEV Settle Transaction (issues credits, DEV only)
- API-046: Generate Event Rules (OpenAI API costs)

### 10.4 Unknowns & Gaps

**Known gaps:**
1. **Authorization TODO** in API-037: Transaction status query doesn't check club owner access (only user_id match)
2. **Club subscription settlement** in API-038: TODO comment, not yet implemented
3. **Kaspi payment provider** in API-036: STUB mode, fake payment URLs
4. **Rate limiting on AI endpoint:** 3 req/min tier exists, but might need per-user quota tracking for production abuse prevention
5. **Guest participant spam:** API-032 allows unlimited guest registrations per IP (rate limit 10 req/min, but could rotate IPs)

**Infrastructure unknowns:**
- Actual Upstash Redis latency in production (middleware logs slow checks >100ms)
- OpenAI API quota limits (env var configurable, but no monitoring)
- Telegram Bot API rate limits (notification queue sends messages, no backpressure)

**Missing from code analysis:**
- Webhook endpoints (if Kaspi/Telegram webhooks exist, they're not in `/api/*` folder)
- Health check endpoint (no `/api/health` found)
- Metrics endpoint (no `/api/metrics` found)

---

## 11. SSOT Rules for This Project

### 11.1 API SSOT Mandate

**`docs/ssot/SSOT_API.md` is the ONLY authoritative source for all API contracts, security policies, and endpoint behavior.**

### 11.2 Rules

1. **New Endpoint:**
   - MUST be documented in this file (same PR as code)
   - MUST follow the template in § 9 (Endpoint ID, Method, Path, Auth, etc)
   - MUST include Security & Abuse section

2. **Endpoint Change:**
   - MUST update this file with changed behavior
   - MUST increment document version
   - MUST note breaking changes explicitly

3. **Secondary Documentation:**
   - Any API documentation outside this file is considered **outdated** unless explicitly referencing this SSOT
   - Duplicate/conflicting docs should be deleted or merged into this file

4. **Rule for AI / Cursor usage:**
   - When analyzing, refactoring, adding, or discussing API logic, Cursor MUST read and account for `docs/ssot/SSOT_API.md`
   - API SSOT has same priority as `SSOT_ARCHITECTURE.md`, `SSOT_BILLING_SYSTEM_ANALYSIS.md`
   - Code/SSOT mismatches MUST be explicitly called out

### 11.3 Change Process

**Before Push:**
1. Implement endpoint code
2. Document in this file (or update existing entry)
3. Run `npx tsc --noEmit` (TypeScript check)
4. Run `npm run build` (production build)
5. Commit code + SSOT together

**Git Commit Message:**
```
feat: Add POST /api/ai/events/generate-rules

- OpenAI GPT integration for event rules generation
- Rate limit: 3 req/min (critical tier)
- Updated API SSOT (API-047)

Verified: TypeScript ✅, Build ✅
```

---

## 12. Metadata

**Document Stats:**
- Total endpoints: 50
- Total route handlers: 33
- Lines: ~2500
- Last audit: 28 December 2024

**Maintenance:**
- Review quarterly (every 3 months)
- Update on every API change
- Archive old versions in `/docs/ssot/archive/`

---

**END OF API SSOT**

