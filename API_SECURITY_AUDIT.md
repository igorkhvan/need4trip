# API Security Audit Report
**Date:** 2025-12-20  
**Status:** ⚠️ КРИТИЧЕСКИЕ УЯЗВИМОСТИ ОБНАРУЖЕНЫ

## 📊 Summary
- **Total Endpoints:** 27 files
- **Total Methods:** 48 methods
- **Protected by Middleware:** ~15 methods
- **❌ Unprotected Critical Methods:** 8 methods

---

## 🔴 КРИТИЧЕСКИЕ УЯЗВИМОСТИ (требуют немедленного исправления)

### 1. **Events API - Missing Protection**

#### ❌ `DELETE /api/events/[id]`
- **Требует:** Auth (только owner)
- **Защита Middleware:** ❌ НЕТ
- **Защита Route Handler:** ✅ Есть (`getCurrentUserFromMiddleware`)
- **Проблема:** Middleware не добавляет `x-user-id` → всегда 401
- **Impact:** Владелец не может удалить своё событие

#### ❌ `PATCH /api/events/[id]/registration`
- **Требует:** Auth (только owner)
- **Защита Middleware:** ❌ НЕТ
- **Защита Route Handler:** ✅ Есть (`getCurrentUserFromMiddleware`)
- **Проблема:** Middleware не добавляет `x-user-id` → всегда 401
- **Impact:** Владелец не может закрыть/открыть регистрацию

---

### 2. **Clubs Members API - Missing Protection**

#### ❌ `POST /api/clubs/[id]/members`
- **Требует:** Auth (club admin/owner)
- **Защита Middleware:** ❌ НЕТ (путь `/api/clubs/` не включает `/members`)
- **Защита Route Handler:** ✅ Есть
- **Проблема:** Middleware не защищает `/api/clubs/[id]/members`
- **Impact:** 401 при добавлении члена клуба

#### ❌ `PATCH /api/clubs/[id]/members/[userId]`
- **Требует:** Auth (club admin/owner)
- **Защита Middleware:** ❌ НЕТ
- **Защита Route Handler:** ✅ Есть
- **Impact:** 401 при изменении роли члена

#### ❌ `DELETE /api/clubs/[id]/members/[userId]`
- **Требует:** Auth (club admin/owner)
- **Защита Middleware:** ❌ НЕТ
- **Защита Route Handler:** ✅ Есть
- **Impact:** 401 при удалении члена

---

### 3. **Clubs Export API - Missing Protection**

#### ❌ `GET /api/clubs/[id]/export`
- **Требует:** Auth (club member/admin)
- **Защита Middleware:** ❌ НЕТ
- **Защита Route Handler:** ✅ Есть
- **Проблема:** GET запросы для clubs не защищены middleware
- **Impact:** 401 при экспорте данных клуба

---

### 4. **Profile Cars API - Partial Protection**

#### ⚠️ `DELETE /api/profile/cars`
- **Требует:** Auth
- **Middleware Protection:** ✅ Путь `/api/profile/cars` защищён
- **Route Handler:** ✅ Есть
- **Status:** ✅ **ЗАЩИЩЕНО**

#### ⚠️ `PATCH /api/profile/cars`
- **Требует:** Auth
- **Middleware Protection:** ✅ Путь защищён
- **Route Handler:** ✅ Есть
- **Status:** ✅ **ЗАЩИЩЕНО**

#### ⚠️ `PUT /api/profile/cars`
- **Требует:** Auth
- **Middleware Protection:** ✅ Путь защищён
- **Route Handler:** ✅ Есть
- **Status:** ✅ **ЗАЩИЩЕНО**

---

## ✅ ПРАВИЛЬНО ЗАЩИЩЁННЫЕ ENDPOINTS

### Events
- ✅ `POST /api/events` - Middleware + Route Handler
- ✅ `PUT /api/events/[id]` - Middleware + Route Handler
- ✅ `GET /api/events` - Public (правильно)
- ✅ `GET /api/events/[id]` - Public (правильно)

### Participants (Guest-friendly)
- ✅ `POST /api/events/[id]/participants` - Guest allowed (правильно)
- ✅ `PATCH /api/events/[id]/participants/[participantId]` - Guest allowed (правильно)
- ✅ `DELETE /api/events/[id]/participants/[participantId]` - Guest allowed (правильно)

### Clubs
- ✅ `POST /api/clubs` - Middleware protected
- ✅ `PATCH /api/clubs/[id]` - Middleware protected
- ✅ `DELETE /api/clubs/[id]` - Middleware protected
- ✅ `GET /api/clubs` - Public (правильно)
- ✅ `GET /api/clubs/[id]` - Public (правильно)

### Profile
- ✅ `GET /api/profile` - Middleware protected
- ✅ `PATCH /api/profile` - Middleware protected
- ✅ `GET /api/profile/cars` - Middleware protected
- ✅ `POST /api/profile/cars` - Middleware protected
- ✅ `GET /api/profile/notifications` - Middleware protected
- ✅ `PATCH /api/profile/notifications` - Middleware protected

### Auth
- ✅ `POST /api/auth/telegram` - Public (правильно)
- ✅ `GET /api/auth/me` - Middleware protected
- ✅ `POST /api/auth/logout` - Middleware protected

### AI
- ✅ `POST /api/ai/events/generate-rules` - Middleware protected

### Admin/Cron
- ✅ `POST /api/admin/cache/clear` - Admin secret protected
- ✅ `POST /api/cron/process-notifications` - Cron secret protected

### Public Data APIs
- ✅ `GET /api/cities` - Public (правильно)
- ✅ `GET /api/currencies` - Public (правильно)
- ✅ `GET /api/car-brands` - Public (правильно)
- ✅ `GET /api/event-categories` - Public (правильно)
- ✅ `GET /api/vehicle-types` - Public (правильно)
- ✅ `GET /api/plans` - Public (правильно)

---

## 🔧 REQUIRED FIXES

### Fix 1: Events API Protection
**File:** `src/middleware.ts`

**Current (line 64-65):**
```typescript
{ path: '/api/events', methods: ['POST'] },
{ path: '/api/events/', methods: ['PUT'] }, // /api/events/[id] - PUT only, PATCH/DELETE handled separately
```

**Fixed:**
```typescript
{ path: '/api/events', methods: ['POST'] },
{ path: '/api/events/', methods: ['PUT', 'PATCH', 'DELETE'] }, // /api/events/[id] - All write operations
```

---

### Fix 2: Clubs Members API Protection
**File:** `src/middleware.ts`

**Current (line 60-61):**
```typescript
// Clubs (write operations)
{ path: '/api/clubs', methods: ['POST'] },
{ path: '/api/clubs/', methods: ['PATCH', 'DELETE'] }, // /api/clubs/[id]
```

**Problem:** Не защищает `/api/clubs/[id]/members/*`

**Fixed:**
```typescript
// Clubs (write operations)
{ path: '/api/clubs', methods: ['POST'] },
{ path: '/api/clubs/', methods: ['PATCH', 'DELETE'] }, // /api/clubs/[id]
'/api/clubs/[id]/members', // All methods for members management
```

---

### Fix 3: Clubs Export API Protection
**File:** `src/middleware.ts`

**Add to PROTECTED_ROUTES:**
```typescript
'/api/clubs/[id]/export', // Export requires auth (member check in handler)
```

---

## 📋 MIDDLEWARE CONFIGURATION RECOMMENDATIONS

### Current Pattern Issues:
1. ❌ Path matching с `/` не работает для subpaths (`/api/clubs/` не защищает `/api/clubs/[id]/members`)
2. ❌ Комментарий "PATCH/DELETE handled separately" без реализации
3. ❌ Нет централизованной документации защищённых путей

### Recommended Pattern:
```typescript
const PROTECTED_ROUTES = [
  // Profile endpoints (all methods, all subpaths)
  '/api/profile',
  
  // Auth endpoints
  '/api/auth/me',
  '/api/auth/logout',
  
  // AI endpoints (all require auth)
  '/api/ai',
  
  // Clubs - Method-specific
  { path: '/api/clubs', methods: ['POST'] },                    // Create club
  { path: '/api/clubs/', methods: ['PATCH', 'DELETE'] },        // Update/Delete club
  '/api/clubs/[id]/members',                                     // All member operations
  '/api/clubs/[id]/export',                                      // Export (GET with auth)
  
  // Events - Method-specific
  { path: '/api/events', methods: ['POST'] },                    // Create event
  { path: '/api/events/', methods: ['PUT', 'PATCH', 'DELETE'] }, // All event write operations
] as const;
```

---

## 🎯 PRIORITY

### 🔴 P0 (CRITICAL - Deploy Blocker):
1. **Events DELETE/PATCH** - Полностью сломана функциональность Danger Zone
2. **Clubs Members API** - Невозможно управлять членами клуба

### 🟡 P1 (High - Should fix before next release):
3. **Clubs Export** - Экспорт данных недоступен

---

## ✅ TESTING CHECKLIST

После исправления протестировать:
- [ ] DELETE /api/events/[id] (owner)
- [ ] PATCH /api/events/[id]/registration (owner)
- [ ] POST /api/clubs/[id]/members (admin)
- [ ] PATCH /api/clubs/[id]/members/[userId] (admin)
- [ ] DELETE /api/clubs/[id]/members/[userId] (admin)
- [ ] GET /api/clubs/[id]/export (member)
- [ ] Verify 401 for non-authenticated users
- [ ] Verify 403 for non-owners/non-admins

---

## 📝 NOTES

1. **Participants API** правильно не защищён middleware - guest регистрации работают
2. **Public GET endpoints** правильно не защищены
3. **Admin/Cron endpoints** имеют отдельную защиту через secrets
4. Все route handlers имеют правильные auth checks, проблема только в middleware routing

**Estimated Fix Time:** 5 минут  
**Risk Level:** Low (добавление защиты, не breaking change)
