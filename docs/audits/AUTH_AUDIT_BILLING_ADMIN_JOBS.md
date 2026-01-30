# Auth Architecture Audit: Billing, Admin Tools, Background Jobs

**Date:** 2026-01-27  
**Auditor:** Principal Backend / Platform Engineer  
**Scope:** Evaluate auth resolution consistency for Billing, Admin Tools, Background Jobs domains  
**Purpose:** Fact-finding for potential expansion of canonical auth model (ADR-001)

---

## Executive Summary

This audit examines how authentication is resolved across three domains:
1. **Billing** — mixed auth resolution methods, not using canonical resolver
2. **Admin Tools** — secret-based auth via middleware, no user concept
3. **Background Jobs** — secret-based auth via middleware, no auth context in handlers

The canonical auth resolver `resolveCurrentUser(req?)` is documented in SSOT_ARCHITECTURE §8.2 and enforced for Clubs domain, but NOT consistently used across Billing, Admin, or Jobs domains.

---

## 1. Billing — Auth Resolution Analysis

### 1.1 Inventory of Billing-Related Endpoints

| Route | Method | Auth Resolution | Auth Required | Notes |
|-------|--------|-----------------|---------------|-------|
| `/api/billing/products` | GET | None | No | Public product catalog |
| `/api/billing/purchase-intent` | POST | `getCurrentUserFromMiddleware` | Yes | Protected by middleware |
| `/api/billing/transactions/status` | GET | `getCurrentUserFromMiddleware` | Yes | Protected by middleware |
| `/api/dev/billing/settle` | POST | None (env check) | No | Dev-only, `NODE_ENV` guard |
| `/api/clubs/[id]/current-plan` | GET | `resolveCurrentUser` ✅ | Yes | Uses canonical resolver |
| `/api/profile/credits` | GET | `getCurrentUser` | Yes | Cookie-based, NOT canonical |
| `/api/profile` | GET | `getCurrentUser` | Yes | Cookie-based, NOT canonical |
| `/api/profile` | PATCH | `getCurrentUserFromMiddleware` | Yes | Middleware-based |

### 1.2 Auth Resolution Code Evidence

**`/api/billing/purchase-intent/route.ts` (lines 46-52):**
```typescript
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication required (via middleware)
    const currentUser = await getCurrentUserFromMiddleware(req);
    if (!currentUser) {
      throw new UnauthorizedError("Authentication required");
    }
```
- Uses `getCurrentUserFromMiddleware`, NOT canonical `resolveCurrentUser`
- Comment says "via middleware" — relies on middleware having set `x-user-id` header

**`/api/billing/transactions/status/route.ts` (lines 22-28):**
```typescript
export async function GET(req: NextRequest) {
  try {
    // 1. Authentication required (via middleware)
    const currentUser = await getCurrentUserFromMiddleware(req);
    if (!currentUser) {
      throw new UnauthorizedError("Authentication required");
    }
```
- Same pattern as purchase-intent

**`/api/billing/products/route.ts` (lines 14-25):**
```typescript
export async function GET() {
  try {
    const products = await getActiveProducts();
    logger.info("Fetched active billing products", { count: products.length });
    return respondSuccess({ products });
  } catch (error) {
```
- NO auth resolution — intentionally public endpoint

**`/api/dev/billing/settle/route.ts` (lines 37-42):**
```typescript
export async function POST(req: NextRequest) {
  try {
    // DEV MODE CHECK (simple IP check or env var)
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenError("This endpoint is only available in development");
    }
```
- NO auth — relies on environment check only
- Comment suggests this is a stub for future Kaspi webhook

**`/api/profile/credits/route.ts` (lines 20-25):**
```typescript
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new AuthError("Необходима авторизация");
    }
```
- Uses `getCurrentUser()` — cookie-based, NOT canonical resolver
- No request object passed despite being available

### 1.3 Authorization Enforcement

Authorization (beyond auth) is enforced at:
- **Route level:** Check `!currentUser` → 401
- **Service level:** `enforceClubAction()`, `enforceEventPublish()` in `accessControl.ts`
- **DB level:** RLS policies (not audited here)

**`/api/billing/transactions/status/route.ts` (lines 62-65):**
```typescript
    // 4. Authorization check (user must own the transaction)
    // For one-off: user_id must match
    // For club: club owner must match (simplified: skip for MVP, rely on transaction_id secrecy)
    // TODO: Add proper authorization check
```
- **NOTE:** Authorization check is explicitly marked as TODO and NOT implemented

### 1.4 Billing Auth Patterns Summary

| Pattern | Count | Files |
|---------|-------|-------|
| `resolveCurrentUser(req)` (canonical) | 1 | `/api/clubs/[id]/current-plan` |
| `getCurrentUserFromMiddleware(req)` | 2 | `/api/billing/purchase-intent`, `/api/billing/transactions/status` |
| `getCurrentUser()` | 2 | `/api/profile/credits`, `/api/profile` GET |
| None (public) | 1 | `/api/billing/products` |
| None (env check) | 1 | `/api/dev/billing/settle` |

---

## 2. Admin Tools — Auth Resolution Analysis

### 2.1 Inventory of Admin Endpoints

| Route | Method | Auth Resolution | Protection |
|-------|--------|-----------------|------------|
| `/api/admin/cache/clear` | POST | None (middleware secret) | `x-admin-secret` header |

### 2.2 Auth Resolution Code Evidence

**`/api/admin/cache/clear/route.ts` (lines 19-27):**
```typescript
export async function POST(request: NextRequest) {
  try {
    // NOTE: Admin secret verified by middleware
    // This route should only be reachable if middleware passed
    
    // Dynamically import to avoid circular dependencies
    const { clearAllCaches, getAllCacheStats } = await import("@/lib/cache/staticCache");
```
- NO user auth resolution in handler
- Comment states "Admin secret verified by middleware"
- Route handler trusts middleware implicitly

**Middleware protection (`middleware.ts` lines 387-403):**
```typescript
  if (isAdminRoute(pathname)) {
    const adminSecret = request.headers.get('x-admin-secret');
    const envSecret = process.env.ADMIN_SECRET;
    
    if (!envSecret) {
      // Admin routes disabled if ADMIN_SECRET not configured
      return forbiddenResponse('Admin access not configured');
    }
    
    if (adminSecret !== envSecret) {
      return forbiddenResponse('Invalid admin credentials');
    }
    
    // Admin authenticated, continue
    return NextResponse.next();
  }
```

### 2.3 Admin Context Shape

- **No "admin user" concept exists**
- Admin is verified by shared secret, not by user role
- No `AdminContext` or `AdminUser` type defined
- No audit trail of which admin performed action (only IP would be in logs)

### 2.4 Admin Auth Patterns Summary

| Aspect | Status |
|--------|--------|
| User-based admin auth | NOT IMPLEMENTED |
| Role-based admin check | NOT IMPLEMENTED |
| Secret-based admin auth | IMPLEMENTED (middleware) |
| Admin audit trail | NOT IMPLEMENTED (no user identity) |

---

## 3. Background Jobs / System Actions — Auth Resolution Analysis

### 3.1 Inventory of Background Jobs

| Route | Method | Auth Resolution | Protection |
|-------|--------|-----------------|------------|
| `/api/cron/process-notifications` | POST | None (middleware secret) | `x-vercel-cron` or `CRON_SECRET` |
| `/api/cron/process-notifications` | GET | None (middleware secret) | Same as above |

**Vercel cron configuration (`vercel.json`):**
```json
{
  "regions": ["fra1"],
  "crons": [
    {
      "path": "/api/cron/process-notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### 3.2 Auth Resolution Code Evidence

**`/api/cron/process-notifications/route.ts` (lines 14-25):**
```typescript
export async function POST(request: NextRequest) {
  try {
    // NOTE: Cron secret verified by middleware
    // This route should only be reachable if middleware passed
    
    const startTime = Date.now();

    // Generate unique worker ID
    const workerId = `worker-${process.env.VERCEL_REGION || 'local'}-${Date.now()}`;

    // Process notifications
    const result = await processNotificationQueue(50, workerId);
```
- NO user auth context passed
- Comment states "Cron secret verified by middleware"
- Services called directly without any auth context

**Middleware protection (`middleware.ts` lines 409-429):**
```typescript
  if (isCronRoute(pathname)) {
    // Vercel Cron Jobs automatically add this header
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    
    // Manual triggers can use Authorization header with CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const envSecret = process.env.CRON_SECRET;
    
    // Allow if either:
    // 1. Called by Vercel Cron (has x-vercel-cron header)
    // 2. Manual trigger with valid CRON_SECRET
    const isVercelCron = !!vercelCronHeader;
    const isManualWithSecret = envSecret && authHeader === `Bearer ${envSecret}`;
    
    if (!isVercelCron && !isManualWithSecret) {
      return forbiddenResponse('Invalid cron credentials');
    }
    
    // Cron authenticated, continue
    return NextResponse.next();
  }
```

### 3.3 Service Layer Analysis

**`lib/services/notifications.ts` — `processNotificationQueue()` (lines 329-340):**
```typescript
export async function processNotificationQueue(
  batchSize: number = 50,
  workerId: string = `worker-${Date.now()}`
): Promise<ProcessQueueResult> {
  const result: ProcessQueueResult = {
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    console.log(`[NotificationWorker] Starting batch processing (size=${batchSize}, worker=${workerId})`);
```
- NO auth context parameter
- NO "system user" concept
- Uses `supabaseAdmin` (service role) directly

### 3.4 System User / Service Account Analysis

**Search results:**
- `system.?user` — 0 matches
- `service.?account` — 0 matches
- `internal.?user` — 0 matches

**Conclusion:** No system user or service account concept exists in the codebase.

### 3.5 Background Jobs Auth Patterns Summary

| Aspect | Status |
|--------|--------|
| Cron secret protection | IMPLEMENTED (middleware) |
| System user concept | NOT IMPLEMENTED |
| Auth context in handlers | NOT PASSED |
| Documented contract | PARTIAL (comments only) |

---

## 4. Auth Context Shapes Analysis

### 4.1 Shapes Found

| Shape | Type | Where Defined | Usage |
|-------|------|---------------|-------|
| Real user | `CurrentUser` | `lib/auth/currentUser.ts` | Standard auth for user actions |
| Admin context | Implicit (secret verified) | N/A | Middleware passes through |
| Cron/System context | Implicit (secret verified) | N/A | Middleware passes through |
| None | `null` | N/A | Public endpoints |

### 4.2 CurrentUser Interface

**`lib/auth/currentUser.ts` (lines 15-31):**
```typescript
export interface CurrentUser {
  id: string;
  name?: string | null;
  telegramHandle?: string | null;
  telegramId?: string | null;
  avatarUrl?: string | null;
  cityId?: string | null;
  phone?: string | null;
  email?: string | null;
  carBrandId?: string | null;
  carModelText?: string | null;
  experienceLevel?: ExperienceLevel | null;
  plan?: UserPlan;
  availableCreditsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
```

### 4.3 Missing Context Types

The following context types do NOT exist but are used implicitly:
- `AdminContext` (no type, just middleware pass-through)
- `SystemContext` (no type, just middleware pass-through)
- `CronContext` (no type, just middleware pass-through)

---

## 5. Observed Gaps (Factual)

### 5.1 Canonical Resolver Not Used

The canonical resolver `resolveCurrentUser(req?)` is NOT used in:

| File | Method | Current Pattern |
|------|--------|-----------------|
| `/api/profile/credits/route.ts` | GET | `getCurrentUser()` |
| `/api/profile/route.ts` | GET | `getCurrentUser()` |
| `/api/profile/route.ts` | PATCH | `getCurrentUserFromMiddleware(req)` |
| `/api/events/route.ts` | GET | `getCurrentUser()` |
| `/api/events/route.ts` | POST | `getCurrentUserFromMiddleware(req)` |
| `/api/events/[id]/route.ts` | GET | `getCurrentUser()` |
| `/api/events/[id]/route.ts` | PUT/DELETE | `getCurrentUserFromMiddleware(req)` |
| `/api/billing/purchase-intent/route.ts` | POST | `getCurrentUserFromMiddleware(req)` |
| `/api/billing/transactions/status/route.ts` | GET | `getCurrentUserFromMiddleware(req)` |
| `/api/auth/me/route.ts` | GET | `getCurrentUserFromMiddleware(req)` |

### 5.2 Transport-Dependent Auth Resolution

Auth resolution is currently transport-dependent:

| Context | Method Used | Transport Dependency |
|---------|-------------|---------------------|
| API routes (protected) | `getCurrentUserFromMiddleware(request)` | Requires `Request` object with `x-user-id` header |
| API routes (public/optional) | `getCurrentUser()` | Requires cookies (no Request) |
| RSC | `getCurrentUser()` | Requires cookies |
| Canonical | `resolveCurrentUser(req?)` | Transport-agnostic (header → cookie → null) |

### 5.3 Implicit Auth Context

Places where auth context is implicit (not passed explicitly):

| Location | What's Implicit |
|----------|-----------------|
| `/api/admin/cache/clear` | Admin identity (only secret verified) |
| `/api/cron/process-notifications` | System context (only secret verified) |
| `processNotificationQueue()` service | No auth context at all |
| `resetStuckNotificationsTask()` service | No auth context at all |

### 5.4 System Actions Bypassing Auth Intentionally

| Location | Bypass Type | Notes |
|----------|-------------|-------|
| `/api/cron/process-notifications` | Secret-only | No user auth, just `CRON_SECRET` |
| `/api/dev/billing/settle` | Env check | No auth, just `NODE_ENV !== 'production'` |
| `/api/billing/products` | Public | Intentionally no auth |
| Notification service | Direct call | No auth context passed to service |

### 5.5 Authorization TODOs

**`/api/billing/transactions/status/route.ts` (lines 62-65):**
```typescript
// 4. Authorization check (user must own the transaction)
// For one-off: user_id must match
// For club: club owner must match (simplified: skip for MVP, rely on transaction_id secrecy)
// TODO: Add proper authorization check
```
- Transaction ownership verification is NOT implemented
- Currently relies on "transaction_id secrecy" (security through obscurity)

---

## 6. Summary Table

| Domain | Canonical Resolver Used | Auth Shape | Gaps |
|--------|------------------------|------------|------|
| Billing | 1 of 7 endpoints | `CurrentUser` | Mixed resolution methods; authorization TODO |
| Admin | 0 of 1 endpoints | Implicit (secret) | No user context; no audit trail |
| Jobs | 0 of 1 endpoints | Implicit (secret) | No system user; no auth context in services |

---

## 7. Appendix: File References

### Files Audited
- `src/middleware.ts`
- `src/lib/auth/currentUser.ts`
- `src/lib/auth/resolveCurrentUser.ts`
- `src/app/api/billing/products/route.ts`
- `src/app/api/billing/purchase-intent/route.ts`
- `src/app/api/billing/transactions/status/route.ts`
- `src/app/api/dev/billing/settle/route.ts`
- `src/app/api/clubs/[id]/current-plan/route.ts`
- `src/app/api/profile/credits/route.ts`
- `src/app/api/profile/route.ts`
- `src/app/api/admin/cache/clear/route.ts`
- `src/app/api/cron/process-notifications/route.ts`
- `src/app/api/events/route.ts`
- `src/app/api/events/[id]/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/lib/services/accessControl.ts`
- `src/lib/services/notifications.ts`
- `vercel.json`

### SSOT References
- `docs/ssot/SSOT_ARCHITECTURE.md` §8.2 — Canonical Auth Resolver
- `docs/adr/ADR-001.md` — Auth Resolution Architecture Decision

---

*End of Audit Report*
