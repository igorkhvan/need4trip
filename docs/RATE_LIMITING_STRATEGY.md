# Rate Limiting Strategy

**Date:** 2024-12-17  
**Status:** Implementation in progress  
**Provider:** Upstash Redis  
**Algorithm:** Sliding Window

---

## 🎯 Objectives

1. **Prevent abuse** - Block DDoS, brute force, spam
2. **Control costs** - Limit OpenAI API usage, DB queries
3. **Fair usage** - Ensure service availability for all users
4. **Production-ready** - Global state, persistent, scalable

---

## 🏗️ Architecture

### Technology Stack

- **Provider:** Upstash Redis (Serverless)
- **Library:** `@upstash/ratelimit` v2.0+
- **Algorithm:** Sliding Window (accurate, memory-efficient)
- **Location:** Edge Middleware (runs before route handlers)
- **Identifier:** User ID (authenticated) or IP address (anonymous)

### Rate Limit Tiers

#### Tier 1: CRITICAL 🔴 (Strictest)
**Target:** Auth endpoints, high-cost operations  
**Limit:** 3 requests / 1 minute per IP  
**Endpoints:**
- `POST /api/auth/telegram` - OAuth login
- `POST /api/ai/events/generate-rules` - OpenAI API call

**Rationale:**
- Auth: Prevent brute force attacks
- AI: OpenAI costs $0.02-0.06 per request

---

#### Tier 2: WRITE OPERATIONS 🟡 (Moderate)
**Target:** Create/Update/Delete operations  
**Limit:** 10 requests / 1 minute per user  
**Endpoints:**
- `POST /api/events` - Create event
- `PUT /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event (future)
- `POST /api/clubs` - Create club
- `PATCH /api/clubs/[id]` - Update club
- `DELETE /api/clubs/[id]` - Delete club
- `PATCH /api/profile` - Update profile
- `POST /api/profile/cars` - Add car
- `PUT /api/profile/cars` - Update car
- `DELETE /api/profile/cars` - Delete car

**Rationale:**
- Prevent spam event/club creation
- DB write load control
- Balance usability vs abuse

---

#### Tier 3: READ OPERATIONS 🟢 (Lenient)
**Target:** GET requests, public data  
**Limit:** 60 requests / 1 minute per user/IP  
**Endpoints:**
- `GET /api/events` - List events
- `GET /api/events/[id]` - Get event details
- `GET /api/clubs` - List clubs
- `GET /api/clubs/[id]` - Get club details
- `GET /api/profile` - Get profile
- `GET /api/cities` - Reference data
- `GET /api/currencies` - Reference data
- `GET /api/car-brands` - Reference data
- `GET /api/event-categories` - Reference data
- `GET /api/vehicle-types` - Reference data

**Rationale:**
- Allow fast page navigation
- Reference data cached in StaticCache anyway
- 60/min = 1 req/second (reasonable for UI)

---

#### Tier 4: SPECIAL - Guest Registrations 🔵
**Target:** Participant registration (mixed auth)  
**Limit:** 5 requests / 1 minute per IP (unauthenticated)  
**Endpoints:**
- `POST /api/events/[id]/participants` - Register as participant
- `PATCH /api/events/[id]/participants/[id]` - Update registration
- `DELETE /api/events/[id]/participants/[id]` - Cancel registration

**Rationale:**
- Allow guest registrations
- Prevent mass spam registrations
- Lower limit for anonymous users

---

#### Tier 5: ADMIN & CRON ⚫ (Already Protected)
**Target:** System operations  
**Protection:** Secret-based (not rate limited)  
**Endpoints:**
- `POST /api/admin/cache/clear` - Protected by ADMIN_SECRET
- `POST /api/cron/process-notifications` - Protected by CRON_SECRET / x-vercel-cron

**Rationale:**
- Already secured by middleware
- No rate limiting needed

---

## 📊 Complete Endpoint Inventory

### Analysis: 26 route files, 45 total handlers

| Route | Methods | Tier | Limit | Protected |
|-------|---------|------|-------|-----------|
| `/api/auth/telegram` | POST | 1 🔴 | 3/min | No |
| `/api/auth/me` | GET | 3 🟢 | 60/min | Yes |
| `/api/auth/logout` | POST | 2 🟡 | 10/min | Yes |
| `/api/ai/events/generate-rules` | POST | 1 🔴 | 3/min | Yes |
| `/api/events` | GET, POST | 3,2 | 60,10 | POST only |
| `/api/events/[id]` | GET, PUT | 3,2 | 60,10 | PUT only |
| `/api/events/[id]/participants` | GET, POST | 3,4 | 60,5 | No |
| `/api/events/[id]/participants/[id]` | PATCH, DELETE | 4 | 5/min | No |
| `/api/clubs` | GET, POST | 3,2 | 60,10 | POST only |
| `/api/clubs/[id]` | GET, PATCH, DELETE | 3,2 | 60,10 | PATCH/DEL |
| `/api/clubs/[id]/members` | GET, POST | 3,2 | 60,10 | POST only |
| `/api/clubs/[id]/members/[userId]` | PATCH, DELETE | 2 | 10/min | Yes |
| `/api/clubs/[id]/export` | GET | 2 | 10/min | Yes |
| `/api/clubs/[id]/current-plan` | GET | 3 | 60/min | Yes |
| `/api/profile` | GET, PATCH | 3,2 | 60,10 | Yes |
| `/api/profile/notifications` | GET, PATCH | 3,2 | 60,10 | Yes |
| `/api/profile/cars` | GET,POST,PUT,PATCH,DEL | 3,2 | 60,10 | Yes |
| `/api/cities` | GET | 3 | 60/min | No |
| `/api/cities/[id]` | GET | 3 | 60/min | No |
| `/api/currencies` | GET | 3 | 60/min | No |
| `/api/car-brands` | GET | 3 | 60/min | No |
| `/api/event-categories` | GET | 3 | 60/min | No |
| `/api/vehicle-types` | GET | 3 | 60/min | No |
| `/api/plans` | GET | 3 | 60/min | No |
| `/api/admin/cache/clear` | POST | 5 ⚫ | N/A | Secret |
| `/api/cron/process-notifications` | POST, GET | 5 ⚫ | N/A | Secret |

**Total:** 26 routes, 45 handlers

---

## 🔧 Implementation Plan

### Step 1: Upstash Setup (15 min)

1. Create Upstash account: https://console.upstash.com/
2. Create Redis database:
   - Name: `need4trip-ratelimit-prod`
   - Region: `us-east-1` (same as Vercel)
   - Type: Regional (Free tier: 10K commands/day)
3. Get credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Add to Vercel env vars:
   ```bash
   vercel env add UPSTASH_REDIS_REST_URL production
   vercel env add UPSTASH_REDIS_REST_TOKEN production
   ```
5. Add to `.env.local` for local dev

---

### Step 2: Install Dependencies (5 min)

```bash
npm install @upstash/ratelimit @upstash/redis
```

---

### Step 3: Implement Middleware (2 hours)

**File:** `src/middleware.ts`

**Changes:**
1. Import Upstash Ratelimit
2. Create tier-based rate limiters
3. Add rate limiting logic before auth check
4. Return 429 Too Many Requests on limit exceeded
5. Add rate limit headers (X-RateLimit-*)

**Key decisions:**
- Use `identifier` = `userId` (auth) or `ip` (anonymous)
- Sliding window algorithm (accurate)
- Analytics enabled (track usage)
- Graceful fallback if Redis down

---

### Step 4: Per-Endpoint Configuration (1 hour)

**File:** `src/lib/config/rateLimits.ts`

**Structure:**
```typescript
export const RATE_LIMIT_CONFIG = {
  tiers: {
    critical: { requests: 3, window: '1 m' },
    write: { requests: 10, window: '1 m' },
    read: { requests: 60, window: '1 m' },
    guest: { requests: 5, window: '1 m' },
  },
  routes: {
    '/api/auth/telegram': 'critical',
    '/api/ai/events/generate-rules': 'critical',
    // ... full mapping
  }
};
```

---

### Step 5: Testing (45 min)

**Local:**
- Test each tier limit
- Test 429 response
- Test rate limit headers
- Test Redis fallback

**Production:**
- Verify Upstash connection
- Monitor first 100 requests
- Check Vercel logs
- Validate costs (should be $0)

---

### Step 6: Documentation (this file)

**Deliverables:**
- ✅ This strategy document
- 🔄 Update `docs/architecture/security.md`
- 🔄 Add rate limit section to API docs
- 🔄 Update `.env.example`

---

## 📈 Monitoring & Metrics

### Upstash Dashboard
- Request count per endpoint
- Rate limit violations
- Redis memory usage
- Latency (p50, p95, p99)

### Vercel Logs
- 429 responses
- Rate limit headers
- User feedback

### Key Metrics to Track
1. **429 rate** - Should be <1% of requests
2. **False positives** - Legitimate users blocked
3. **Redis latency** - Should be <10ms
4. **Cost** - Should stay in free tier (<10K/day)

---

## 🚨 Incident Response

### If Rate Limit Too Strict
1. Check Upstash analytics
2. Identify affected endpoint
3. Increase limit in `RATE_LIMIT_CONFIG`
4. Redeploy
5. Monitor for 24h

### If Redis Down
- Middleware has fallback: allow requests
- Log error to Vercel
- Alert via Upstash status page
- Fallback to in-memory (future)

### If Costs Spike
- Check Upstash usage
- Identify abuse source (IP/user)
- Block if malicious
- Optimize tier limits

---

## 🔮 Future Improvements

1. **Dynamic limits** - Adjust based on user plan (free vs pro)
2. **Burst allowance** - Allow short bursts for UX
3. **IP geoblocking** - Block high-risk countries
4. **Custom errors** - Localized 429 messages
5. **Allowlist** - Whitelist trusted IPs/users
6. **Analytics dashboard** - Real-time rate limit monitoring

---

## ✅ Success Criteria

- [x] All 26 routes analyzed
- [ ] Tier-based limits defined
- [ ] Upstash Redis configured
- [ ] Middleware implemented
- [ ] Tests passing
- [ ] Production deployed
- [ ] Zero incidents in first week
- [ ] Costs remain in free tier

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-17  
**Next Review:** 2024-12-24 (1 week post-deploy)
