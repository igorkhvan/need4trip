# Clubs Auth Resolution — Current State Analysis

**Дата анализа:** 2026-01-27  
**Автор:** Архитектурный аудит  
**Статус:** Факты, без рекомендаций

---

> **⚠️ PARTIAL OBSOLESCENCE NOTE (2026-01-29):**
> 
> **API-057 (`/api/clubs/[id]/events`)** referenced in this document has been **REMOVED** in Phase L2.1.
> 
> References to `src/app/api/clubs/[id]/events/route.ts` are now historical — the file no longer exists.
> 
> See: SSOT_API.md v1.7.7, ARCHITECTURAL_DEBT_LOG.md DEBT-007 (CLOSED)

---

## 1. Middleware

### Расположение и конфигурация
- **Файл:** `src/middleware.ts`
- **Runtime:** Edge Runtime
- **Matcher:** `/api/:path*` — middleware запускается ТОЛЬКО на API routes

### Механизм аутентификации
- **Тип:** JWT
- **Cookie name:** `auth_token`
- **TTL:** 30 дней (см. `AUTH_COOKIE_MAX_AGE`)

### Поведение

**Чтение токена:**
```typescript
const token = request.cookies.get('auth_token')?.value;
```

**Проверка JWT:**
```typescript
const payload = await decodeAuthToken(token);
```

**Инъекция header:**
```typescript
const requestHeaders = new Headers(request.headers);
requestHeaders.set('x-user-id', payload.userId);
```

### Protected Routes (требуют auth)
```typescript
const PROTECTED_ROUTES = [
  '/api/profile',
  '/api/auth/me',
  '/api/ai',
  { path: '/api/clubs', methods: ['POST'] },
  { path: '/api/clubs/', methods: ['PATCH', 'DELETE'] },
  '/api/clubs/[id]/members',
  '/api/clubs/[id]/export',
  { path: '/api/events', methods: ['POST'] },
  { path: '/api/events/', methods: ['PUT', 'PATCH', 'DELETE'] },
  '/api/billing/purchase-intent',
  '/api/billing/transactions/status',
];
```

### Public Routes (не требуют auth для GET)
```typescript
const PUBLIC_ROUTES = [
  '/api/events',
  '/api/clubs',
  '/api/cities',
  '/api/currencies',
  '/api/car-brands',
  '/api/event-categories',
  '/api/vehicle-types',
  '/api/plans',
];
```

### Исключение для Participants
```typescript
if (pathname.includes('/participants')) {
  return false; // NOT protected
}
```

### Входящие auth headers
- **Stripping:** НЕТ — middleware не удаляет входящие headers
- **Добавление:** x-user-id добавляется к существующим headers

### Где НЕ запускается middleware
- RSC routes (page.tsx)
- Internal fetches из Server Components (если не проходят через `/api/*`)
- Static generation

---

## 2. Auth Helpers Inventory

### Function: `getCurrentUser`
- **File:** `src/lib/auth/currentUser.ts`
- **Inputs:** None (использует `cookies()` из `next/headers`)
- **Data source:** Cookie → JWT → DB lookup (`getUserById`)
- **DB access:** ДА
- **Assumes middleware ran:** НЕТ (читает cookie напрямую)
- **Behavior:**
  ```typescript
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const payload = await verifyJwt(token, secret);
  const user = await getUserById(String(payload.userId));
  ```
- **Used in (файлы):**
  - `src/app/(app)/clubs/[id]/page.tsx`
  - `src/app/(app)/clubs/[id]/settings/page.tsx`
  - `src/app/(app)/clubs/[id]/members/page.tsx`
  - `src/app/(app)/clubs/[id]/events/page.tsx`
  - `src/app/(app)/events/[id]/page.tsx`
  - `src/app/layout.tsx`
  - `src/app/(marketing)/page.tsx`
  - `src/components/auth/auth-status.tsx`
  - `src/app/api/clubs/[id]/route.ts` (GET handler only)
  - И другие RSC pages/components

---

### Function: `getCurrentUserFromMiddleware`
- **File:** `src/lib/auth/currentUser.ts`
- **Inputs:** `Request` object
- **Data source:** `x-user-id` header → DB lookup (`getUserById`)
- **DB access:** ДА
- **Assumes middleware ran:** ДА (ожидает header)
- **Behavior:**
  ```typescript
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    log.warn("getCurrentUserFromMiddleware called without x-user-id header");
    return null;
  }
  const user = await getUserById(userId);
  ```
- **Used in (файлы):**
  - `src/app/api/clubs/[id]/members/preview/route.ts`
  - `src/app/api/clubs/[id]/members/route.ts`
  - `src/app/api/clubs/[id]/members/[userId]/route.ts`
  - `src/app/api/clubs/[id]/join-requests/route.ts`
  - `src/app/api/clubs/[id]/join-requests/[requestId]/approve/route.ts`
  - `src/app/api/clubs/[id]/join-requests/[requestId]/reject/route.ts`
  - `src/app/api/clubs/[id]/events/route.ts`
  - `src/app/api/clubs/[id]/unarchive/route.ts`
  - `src/app/api/clubs/[id]/export/route.ts`
  - `src/app/api/clubs/[id]/current-plan/route.ts`
  - `src/app/api/clubs/[id]/route.ts` (PATCH/DELETE handlers)
  - `src/app/api/clubs/route.ts` (POST handler)
  - И другие API routes

---

### Function: `getCurrentUserWithFallback`
- **File:** `src/lib/auth/currentUser.ts`
- **Inputs:** `Request` object
- **Data source:** Header first, fallback to cookie
- **DB access:** ДА
- **Assumes middleware ran:** НЕТ (имеет fallback)
- **Behavior:**
  ```typescript
  let user = await getCurrentUserFromMiddleware(request);
  if (user) return user;
  
  // Fallback to direct cookie check
  log.info("getCurrentUserWithFallback: middleware header missing, trying cookie fallback");
  user = await getCurrentUser();
  return user;
  ```
- **Used in:** НЕ ИСПОЛЬЗУЕТСЯ В КОДЕ (0 imports)

---

### Function: `decodeAuthToken`
- **File:** `src/lib/auth/jwt.ts`
- **Inputs:** Token string
- **Data source:** JWT → decode with verification
- **DB access:** НЕТ
- **Used in:** `src/middleware.ts`

---

### Function: `verifyJwt`
- **File:** `src/lib/auth/jwt.ts`
- **Inputs:** Token string, secret
- **Data source:** JWT → signature verification + expiry check
- **DB access:** НЕТ
- **Used in:** `getCurrentUser()`, `decodeAuthToken()`

---

## 3. Clubs API Routes

### /api/clubs/[id]/members/preview
- **File:** `src/app/api/clubs/[id]/members/preview/route.ts`
- **Methods:** GET
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **Header reading:** `x-user-id` via middleware
- **Cookie reading:** НЕТ
- **Middleware reliance:** ДА
- **When auth missing:** Returns `null` user, checks club visibility settings for guest access
- **Relevant code:**
  ```typescript
  const user = await getCurrentUserFromMiddleware(req);
  // user may be null for guests
  const membership = user ? await getMember(clubId, user.id) : null;
  ```

---

### /api/clubs/[id]/members
- **File:** `src/app/api/clubs/[id]/members/route.ts`
- **Methods:** GET, POST

**GET handler:**
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **When auth missing:** Throws `UnauthorizedError` (401)
- **Relevant code:**
  ```typescript
  const user = await getCurrentUserFromMiddleware(req);
  if (!user) {
    throw new UnauthorizedError("Требуется авторизация");
  }
  ```

**POST handler:**
- **Status:** DISABLED (throws 503)

---

### /api/clubs/[id]/join-requests
- **File:** `src/app/api/clubs/[id]/join-requests/route.ts`
- **Methods:** GET, POST

**POST handler:**
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **When auth missing:** Throws `UnauthorizedError` (401)

**GET handler:**
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **When auth missing:** Passes `null` to service layer (service handles auth check)
- **Relevant code:**
  ```typescript
  const user = await getCurrentUserFromMiddleware(req);
  // Auth and owner check is done in service layer
  const joinRequests = await listClubJoinRequests(clubId, user);
  ```

---

### /api/clubs/[id]/join-requests/[requestId]/approve
- **File:** `src/app/api/clubs/[id]/join-requests/[requestId]/approve/route.ts`
- **Methods:** POST
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **When auth missing:** Passes `null` to service layer
- **Relevant code:**
  ```typescript
  // Auth check is done in service layer
  const user = await getCurrentUserFromMiddleware(req);
  const result = await approveClubJoinRequest(clubId, requestId, user);
  ```

---

### /api/clubs/[id]/join-requests/[requestId]/reject
- **File:** `src/app/api/clubs/[id]/join-requests/[requestId]/reject/route.ts`
- **Methods:** POST
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **When auth missing:** Passes `null` to service layer

---

### /api/clubs/[id]
- **File:** `src/app/api/clubs/[id]/route.ts`
- **Methods:** GET, PATCH, DELETE

**GET handler:**
- **Auth resolution:** `getCurrentUser()` — НЕ getCurrentUserFromMiddleware!
- **Header reading:** НЕТ
- **Cookie reading:** ДА, напрямую
- **Middleware reliance:** НЕТ
- **Relevant code:**
  ```typescript
  // GET is public, but may need user context for membership check
  const user = await getCurrentUser();
  const club = await getClubWithDetails(id, user);
  ```

**PATCH handler:**
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **Middleware reliance:** ДА

**DELETE handler:**
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **Middleware reliance:** ДА

---

### /api/clubs/[id]/events
- **File:** `src/app/api/clubs/[id]/events/route.ts`
- **Methods:** GET
- **Auth resolution:** `getCurrentUserFromMiddleware(request)`
- **When auth missing:** Throws `UnauthorizedError` (401)
- **Relevant code:**
  ```typescript
  const currentUser = await getCurrentUserFromMiddleware(request);
  if (!currentUser) {
    throw new UnauthorizedError("Авторизация обязательна");
  }
  ```

---

### /api/clubs/[id]/unarchive
- **File:** `src/app/api/clubs/[id]/unarchive/route.ts`
- **Methods:** POST
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **Middleware reliance:** ДА

---

### /api/clubs/[id]/export
- **File:** `src/app/api/clubs/[id]/export/route.ts`
- **Methods:** GET
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **When auth missing:** Throws `AuthError`
- **Relevant code:**
  ```typescript
  const user = await getCurrentUserFromMiddleware(req);
  if (!user) {
    throw new AuthError("Необходима авторизация");
  }
  ```

---

### /api/clubs/[id]/current-plan
- **File:** `src/app/api/clubs/[id]/current-plan/route.ts`
- **Methods:** GET
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **When auth missing:** Throws `AuthError`

---

### /api/clubs/[id]/members/[userId]
- **File:** `src/app/api/clubs/[id]/members/[userId]/route.ts`
- **Methods:** PATCH, DELETE
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **When auth missing:** Throws `UnauthorizedError` (401)

---

### /api/clubs
- **File:** `src/app/api/clubs/route.ts`
- **Methods:** GET, POST

**GET handler:**
- **Auth resolution:** НЕТ (public list)

**POST handler:**
- **Auth resolution:** `getCurrentUserFromMiddleware(req)`
- **When auth missing:** Throws `UnauthorizedError` (401)

---

## 4. RSC / Server Fetches

### Club Profile Page
- **File:** `src/app/(app)/clubs/[id]/page.tsx`
- **Auth source:** `getCurrentUser()` (cookie-based, без request object)
- **Fetch type:** Direct service calls (не fetch)
- **Service calls:**
  - `getClubBasicInfo(id)` — direct
  - `getUserClubRole(id, user.id)` — direct
- **Auth transport:** N/A (service calls, not HTTP)
- **Caching:** `force-dynamic`

---

### Club Settings Page
- **File:** `src/app/(app)/clubs/[id]/settings/page.tsx`
- **Auth source:** `getCurrentUser()` (cookie-based)
- **Fetch type:** Direct service calls
- **Service calls:**
  - `getClubBasicInfo(id)` — direct
  - `getUserClubRole(id, user.id)` — direct
  - `getClubCurrentPlan(id)` — direct
- **Auth transport:** N/A

---

### Club Members Page
- **File:** `src/app/(app)/clubs/[id]/members/page.tsx`
- **Auth source:** `getCurrentUser()` (cookie-based)
- **Fetch type:** Direct service calls
- **Service calls:**
  - `getClubBasicInfo(id)` — direct
  - `getUserClubRole(id, user.id)` — direct
- **Auth transport:** N/A

---

### Club Events Page
- **File:** `src/app/(app)/clubs/[id]/events/page.tsx`
- **Auth source:** `getCurrentUser()` (cookie-based)
- **Fetch type:** Direct service calls
- **Service calls:**
  - `getClubBasicInfo(id)` — direct
  - `getUserClubRole(id, user.id)` — direct
- **Auth transport:** N/A

---

### ClubMembersPreviewAsync (Server Component)
- **File:** `src/app/(app)/clubs/[id]/_components/club-members-preview-async.tsx`
- **Fetch call:**
  ```typescript
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const requestHeaders = await headers();
  const res = await fetch(`${baseUrl}/api/clubs/${clubId}/members/preview`, {
    cache: "no-store",
    headers: requestHeaders,
  });
  ```
- **Auth transport:** Headers forwarded via `headers()` from `next/headers`
- **Cookies forwarded:** ДА (в составе headers)
- **Caching:** `no-store`
- **Особенность:** ЕДИНСТВЕННЫЙ RSC компонент, который форвардит headers

---

### ClubEventsPreviewAsync (Server Component)
- **File:** `src/app/(app)/clubs/[id]/_components/club-events-preview-async.tsx`
- **Fetch call:**
  ```typescript
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/events?clubId=${clubId}&tab=upcoming&limit=3`,
    { cache: "no-store" }
  );
  ```
- **Auth transport:** НЕТ — headers не форвардятся
- **Cookies forwarded:** НЕТ
- **Caching:** `no-store`

---

### ClubEventsContent (Client Component)
- **File:** `src/app/(app)/clubs/[id]/events/_components/club-events-content.tsx`
- **Directive:** `"use client"`
- **Fetch call:**
  ```typescript
  const response = await fetch(`/api/clubs/${clubId}/events?limit=50`);
  ```
- **Auth transport:** Browser automatically includes cookies
- **Cookies forwarded:** ДА (browser default)

---

### ClubMembersContent (Client Component)
- **File:** `src/app/(app)/clubs/[id]/members/_components/club-members-content.tsx`
- **Directive:** `"use client"`
- **Fetch calls:**
  ```typescript
  const response = await fetch(`/api/clubs/${clubId}/members`);
  const response = await fetch(`/api/clubs/${clubId}/join-requests`);
  ```
- **Auth transport:** Browser automatically includes cookies
- **Cookies forwarded:** ДА (browser default)

---

## 5. Observed Gaps & Inconsistencies

### 5.1 Mixed Auth Resolution в одном файле
- **Файл:** `src/app/api/clubs/[id]/route.ts`
- **Наблюдение:**
  - GET handler использует `getCurrentUser()` (cookie-based)
  - PATCH/DELETE handlers используют `getCurrentUserFromMiddleware(req)` (header-based)
- **Код:**
  ```typescript
  // GET
  const user = await getCurrentUser();
  
  // PATCH
  const user = await getCurrentUserFromMiddleware(req);
  ```

---

### 5.2 RSC с разным подходом к auth transport
- **ClubMembersPreviewAsync:** Форвардит headers через `await headers()`
- **ClubEventsPreviewAsync:** НЕ форвардит headers/cookies
- **Код comparison:**
  ```typescript
  // ClubMembersPreviewAsync
  const requestHeaders = await headers();
  const res = await fetch(url, { headers: requestHeaders });
  
  // ClubEventsPreviewAsync  
  const res = await fetch(url, { cache: "no-store" });
  // ← NO headers
  ```

---

### 5.3 Неиспользуемая функция fallback
- **Функция:** `getCurrentUserWithFallback()`
- **Расположение:** `src/lib/auth/currentUser.ts`
- **Назначение:** Сначала пробует middleware header, потом fallback на cookie
- **Использование:** НЕ импортируется ни в одном файле кодовой базы

---

### 5.4 Protected routes ожидают header, который может не существовать
- **Все routes использующие `getCurrentUserFromMiddleware()`** ожидают `x-user-id` header
- **Middleware** добавляет этот header только для protected routes
- **Если middleware не запустился** (например, internal SSR fetch):
  - `getCurrentUserFromMiddleware()` возвращает `null`
  - Route может вернуть 401 или передать `null` в service layer

---

### 5.5 RSC pages vs API auth mismatch
- **RSC pages** вызывают `getCurrentUser()` (cookie-based)
- **Child async components** делают `fetch()` к API routes
- **API routes** используют `getCurrentUserFromMiddleware()` (header-based)
- **Если headers не форвардятся** при SSR fetch, auth контекст теряется

---

### 5.6 API routes делегируют auth check в service layer
- **Routes:** approve, reject join requests; GET join requests
- **Поведение:** Передают `null` user в service layer вместо throw 401 в route
- **Код:**
  ```typescript
  const user = await getCurrentUserFromMiddleware(req);
  // user may be null
  const result = await approveClubJoinRequest(clubId, requestId, user);
  // service throws if user is null or unauthorized
  ```

---

### 5.7 Middleware matcher ограничен API routes
- **Config:** `matcher: '/api/:path*'`
- **Следствие:**
  - RSC routes НЕ проходят через middleware
  - Page-level auth должен использовать `getCurrentUser()` (cookie-based)
  - Internal fetch из RSC к API не имеет `x-user-id` header автоматически

---

### 5.8 Явный exception для participants в middleware
- **Код:**
  ```typescript
  if (pathname.includes('/participants')) {
    return false; // NOT protected
  }
  ```
- **Причина:** Guest registration allowed
- **Следствие:** Эти routes НЕ получают `x-user-id` header даже для authenticated users

---

## Сводная таблица Auth Resolution по Clubs Routes

| Route | Method | Auth Function | Source | Throws on null |
|-------|--------|---------------|--------|----------------|
| `/api/clubs` | GET | None | N/A | N/A |
| `/api/clubs` | POST | `getCurrentUserFromMiddleware` | Header | 401 |
| `/api/clubs/[id]` | GET | `getCurrentUser` | Cookie | No |
| `/api/clubs/[id]` | PATCH | `getCurrentUserFromMiddleware` | Header | Service |
| `/api/clubs/[id]` | DELETE | `getCurrentUserFromMiddleware` | Header | Service |
| `/api/clubs/[id]/members` | GET | `getCurrentUserFromMiddleware` | Header | 401 |
| `/api/clubs/[id]/members` | POST | Disabled | N/A | 503 |
| `/api/clubs/[id]/members/preview` | GET | `getCurrentUserFromMiddleware` | Header | No (guest OK) |
| `/api/clubs/[id]/members/[userId]` | PATCH | `getCurrentUserFromMiddleware` | Header | 401 |
| `/api/clubs/[id]/members/[userId]` | DELETE | `getCurrentUserFromMiddleware` | Header | 401 |
| `/api/clubs/[id]/join-requests` | GET | `getCurrentUserFromMiddleware` | Header | Service |
| `/api/clubs/[id]/join-requests` | POST | `getCurrentUserFromMiddleware` | Header | 401 |
| `/api/clubs/[id]/join-requests/.../approve` | POST | `getCurrentUserFromMiddleware` | Header | Service |
| `/api/clubs/[id]/join-requests/.../reject` | POST | `getCurrentUserFromMiddleware` | Header | Service |
| `/api/clubs/[id]/events` | GET | `getCurrentUserFromMiddleware` | Header | 401 |
| `/api/clubs/[id]/export` | GET | `getCurrentUserFromMiddleware` | Header | AuthError |
| `/api/clubs/[id]/current-plan` | GET | `getCurrentUserFromMiddleware` | Header | AuthError |
| `/api/clubs/[id]/unarchive` | POST | `getCurrentUserFromMiddleware` | Header | Service |

---

## Сводная таблица RSC Auth + Fetch

| Component | Auth Source | Fetch Target | Headers Forwarded | Cookies Forwarded |
|-----------|-------------|--------------|-------------------|-------------------|
| `/clubs/[id]/page.tsx` | `getCurrentUser()` | Service calls | N/A | N/A |
| `/clubs/[id]/settings/page.tsx` | `getCurrentUser()` | Service calls | N/A | N/A |
| `/clubs/[id]/members/page.tsx` | `getCurrentUser()` | Service calls | N/A | N/A |
| `/clubs/[id]/events/page.tsx` | `getCurrentUser()` | Service calls | N/A | N/A |
| `club-members-preview-async.tsx` | N/A | `/api/clubs/[id]/members/preview` | ДА (`headers()`) | ДА |
| `club-events-preview-async.tsx` | N/A | `/api/events?clubId=` | НЕТ | НЕТ |
| `club-events-content.tsx` | N/A (client) | `/api/clubs/[id]/events` | Browser | Browser |
| `club-members-content.tsx` | N/A (client) | `/api/clubs/[id]/members` | Browser | Browser |

---

**Конец документа.**
