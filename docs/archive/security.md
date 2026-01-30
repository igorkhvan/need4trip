# API Security Documentation

## 🔒 Защита API endpoints

Все API endpoints, требующие авторизации, защищены на уровне сервера через JWT токены в HttpOnly cookie.

### Механизм защиты

1. **JWT Token в HttpOnly Cookie**
   - Токен хранится в cookie `auth_token`
   - HttpOnly флаг → недоступен для JavaScript
   - Автоматически отправляется с каждым запросом

2. **Проверка на сервере**
   - `getCurrentUser()` → читает cookie, валидирует JWT
   - Возвращает `CurrentUser | null`
   - Если токен невалиден/отсутствует → `null`

3. **Ответ при отсутствии авторизации**
   ```json
   HTTP 401 Unauthorized
   {
     "success": false,
     "error": {
       "code": "UNAUTHORIZED",
       "message": "Авторизация обязательна..."
     }
   }
   ```

## 📋 Protected Endpoints

### POST /api/events

**Требование:** Авторизация обязательна

```typescript
// Проверка
const currentUser = await getCurrentUser();
if (!currentUser) {
  throw new UnauthorizedError("Авторизация обязательна для создания события");
}
```

**Пример запроса через Postman:**

```bash
POST https://need4trip.com/api/events
Content-Type: application/json
Cookie: auth_token=<JWT_TOKEN>

{
  "title": "Поездка на Алтай",
  "description": "...",
  ...
}
```

**Ответ без авторизации:**
```json
HTTP 401
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Авторизация обязательна для создания события"
  }
}
```

### POST /api/clubs

**Требование:** Авторизация обязательна

```typescript
// Проверка
const user = await getCurrentUser();
if (!user) {
  throw new UnauthorizedError("Авторизация обязательна для создания клуба");
}
```

**Ответ без авторизации:**
```json
HTTP 401
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Авторизация обязательна для создания клуба"
  }
}
```

### PATCH /api/events/[id]

**Требование:** Авторизация + проверка владельца

```typescript
const currentUser = await getCurrentUser();
if (!currentUser) {
  throw new UnauthorizedError();
}

// Проверка прав
if (event.organizerId !== currentUser.id) {
  throw new ForbiddenError("Только организатор может редактировать событие");
}
```

**Ответ без прав:**
```json
HTTP 403
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Только организатор может редактировать событие"
  }
}
```

## 🧪 Тестирование через Postman

### 1. Получить auth_token

Авторизуйтесь через Telegram в браузере, затем:

1. Откройте DevTools → Application → Cookies
2. Найдите `auth_token`
3. Скопируйте значение

### 2. Настроить Postman

В Headers добавьте:
```
Cookie: auth_token=<ВАШЕ_ЗНАЧЕНИЕ>
```

### 3. Попытка без токена

```bash
POST /api/events
# БЕЗ Cookie header

→ HTTP 401 UNAUTHORIZED
```

### 4. Попытка с токеном

```bash
POST /api/events
Cookie: auth_token=eyJhbGci...

→ HTTP 201 Created
{
  "success": true,
  "data": { "event": {...} }
}
```

## 🛡️ Дополнительная защита

### 1. Rate Limiting (TODO)

Для защиты от abuse:
```typescript
// src/middleware.ts
import { rateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const isAllowed = await rateLimit(request);
    if (!isAllowed) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }
}
```

### 2. CSRF Protection

HttpOnly cookie + SameSite=Lax уже обеспечивает защиту от CSRF.

### 3. Input Validation

Используем Zod schemas:
```typescript
const payload = eventCreateSchema.parse(await request.json());
```

## ✅ Checklist для новых endpoints

При создании нового protected endpoint:

- [ ] Вызвать `getCurrentUser()` в начале
- [ ] Проверить `if (!currentUser)` → throw `UnauthorizedError`
- [ ] Для owner-only: проверить `resource.ownerId === currentUser.id`
- [ ] Использовать `respondError()` для единообразия
- [ ] Добавить код в эту документацию

