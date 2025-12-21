# Паттерны аутентификации в Need4Trip

## Обзор

В приложении используются **два паттерна аутентификации** в зависимости от требований endpoint'а:

1. **Protected Routes** - обязательная аутентификация через middleware
2. **Optional Auth Routes** - необязательная аутентификация, проверяется в route handler

---

## 1. Protected Routes (Обязательная аутентификация)

### Принцип работы

```
User → Request + JWT Cookie → Middleware → Проверка JWT → Добавляет x-user-id header → Route Handler
```

### Характеристики

- ✅ Middleware **блокирует** все запросы без валидного JWT токена (401)
- ✅ Route handler **гарантированно** получает `currentUser`
- ✅ Используется для endpoints, требующих авторизации

### Реализация

#### Middleware (src/middleware.ts)

```typescript
const PROTECTED_ROUTES = [
  '/api/profile',
  '/api/auth/me',
  { path: '/api/events', methods: ['POST'] },
  { path: '/api/events/', methods: ['PUT', 'PATCH', 'DELETE'] },
  { path: '/api/clubs', methods: ['POST'] },
  // ... другие защищенные routes
];

// Middleware проверяет JWT и добавляет x-user-id header
if (requiresAuth(pathname, method)) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return unauthorizedResponse('Authentication required');
  }
  
  const payload = await decodeAuthToken(token);
  if (!payload) {
    return unauthorizedResponse('Invalid or expired token');
  }
  
  // Добавляем header для route handler
  requestHeaders.set('x-user-id', payload.userId);
}
```

#### Route Handler

```typescript
import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";

export async function POST(request: Request) {
  // Получаем user из middleware header
  const currentUser = await getCurrentUserFromMiddleware(request);
  
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Бизнес-логика с гарантированным currentUser
  // ...
}
```

### Примеры Protected Routes

| Endpoint | Методы | Описание |
|----------|--------|----------|
| `/api/profile` | ALL | Профиль пользователя |
| `/api/profile/cars` | ALL | Управление автомобилями |
| `/api/profile/notifications` | ALL | Настройки уведомлений |
| `/api/auth/me` | GET | Информация о текущем пользователе |
| `/api/events` | POST | Создание события |
| `/api/events/[id]` | PUT, PATCH, DELETE | Редактирование/удаление события |
| `/api/clubs` | POST | Создание клуба |
| `/api/clubs/[id]` | PATCH, DELETE | Редактирование/удаление клуба |
| `/api/clubs/[id]/members` | ALL | Управление участниками клуба |
| `/api/ai/events/generate-rules` | POST | AI генерация правил |

---

## 2. Optional Auth Routes (Необязательная аутентификация)

### Принцип работы

```
User → Request + JWT Cookie (optional) → Middleware → Пропускает без проверки → Route Handler → Проверяет JWT напрямую
```

### Характеристики

- ✅ Middleware **пропускает** все запросы (с токеном и без)
- ✅ Route handler **сам проверяет** наличие JWT токена в cookies
- ✅ Поддерживает как авторизованных, так и гостевых пользователей
- ✅ Используется для endpoints с гибкими правами доступа

### Реализация

#### Middleware (src/middleware.ts)

```typescript
// Middleware НЕ блокирует эти routes
function requiresAuth(pathname: string, method: string): boolean {
  // EXCEPTION: Participants routes are NOT protected (guest access)
  if (pathname.includes('/participants')) {
    return false; // Пропускаем без проверки
  }
  
  // ... другие проверки
}
```

#### Route Handler

```typescript
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getGuestSessionId } from "@/lib/auth/guestSession";

export async function POST(request: Request) {
  // Пытаемся получить авторизованного пользователя
  let currentUser = await getCurrentUser(); // Читает JWT напрямую из cookies
  let guestSessionId: string | null = null;
  
  if (!currentUser) {
    // Если не авторизован - используем guest session
    guestSessionId = await getGuestSessionId();
  }
  
  // Бизнес-логика с currentUser OR guestSessionId
  // Права доступа определяются внутри service layer
}
```

### Примеры Optional Auth Routes

| Endpoint | Методы | Описание | Права доступа |
|----------|--------|----------|---------------|
| `/api/events/[id]/participants` | POST | Регистрация на событие | Авторизованные + Гости |
| `/api/events/[id]/participants/[participantId]` | PATCH | Редактирование регистрации | Owner события + Сам участник (auth/guest) |
| `/api/events/[id]/participants/[participantId]` | DELETE | Удаление регистрации | Owner события + Сам участник (auth/guest) |

---

## Сравнение паттернов

| Аспект | Protected Routes | Optional Auth Routes |
|--------|------------------|---------------------|
| **Middleware блокирует без токена** | ✅ Да | ❌ Нет |
| **Функция в route handler** | `getCurrentUserFromMiddleware(request)` | `getCurrentUser()` |
| **Проверка JWT** | Middleware | Route handler |
| **Поддержка гостей** | ❌ Нет | ✅ Да |
| **Использование** | Строгая аутентификация | Гибкие права доступа |

---

## Безопасность

### Вопрос: Безопасны ли Optional Auth Routes?

**Ответ: ДА, абсолютно безопасны!**

Оба паттерна выполняют **ОДИНАКОВУЮ** проверку JWT:

#### Protected Routes (Middleware)
```typescript
1. Middleware: decodeAuthToken(token) → проверяет signature + expiry
2. Middleware: Добавляет x-user-id в header
3. Route: getCurrentUserFromMiddleware() → getUserById(userId)
```

#### Optional Auth Routes (Direct)
```typescript
1. Route: getCurrentUser() → verifyJwt(token, secret) → проверяет signature + expiry
2. Route: getUserById(userId)
```

**Вывод:** Разница только в **месте проверки**, но не в **уровне безопасности**.

---

## Функции для работы с пользователем

### `getCurrentUserFromMiddleware(request: Request)`

**Использование:** Protected Routes

**Источник:** Header `x-user-id`, установленный middleware

**Возвращает:** `CurrentUser | null`

```typescript
export async function getCurrentUserFromMiddleware(request: Request): Promise<CurrentUser | null> {
  const userId = request.headers.get('x-user-id');
  
  if (!userId) {
    log.warn("getCurrentUserFromMiddleware called without x-user-id header");
    return null;
  }
  
  const user = await getUserById(userId);
  if (!user) {
    return null;
  }
  
  return user; // Преобразование в CurrentUser
}
```

---

### `getCurrentUser()`

**Использование:** Optional Auth Routes + Server Components

**Источник:** JWT токен из cookies (напрямую)

**Возвращает:** `CurrentUser | null`

```typescript
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;
  
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  
  // Проверяем JWT signature и expiry
  const payload = await verifyJwt(token, secret);
  if (!payload?.userId) return null;
  
  const user = await getUserById(String(payload.userId));
  if (!user) return null;
  
  return user; // Преобразование в CurrentUser
}
```

---

## Гостевые сессии

### Концепция

Гостевые пользователи идентифицируются через `guest_session_id` в cookies:
- Генерируется при первой необходимости (регистрация на событие)
- Хранится в cookies (httpOnly, secure)
- Используется для связи анонимных действий с одной "сессией"

### Функции

#### `getOrCreateGuestSessionId()`

Создает новый `guest_session_id` если его нет:

```typescript
export async function getOrCreateGuestSessionId(): Promise<string> {
  let sessionId = await getGuestSessionId();
  
  if (!sessionId) {
    sessionId = generateSecureToken(); // UUID v4
    const cookieStore = await cookies();
    cookieStore.set(GUEST_SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 год
    });
  }
  
  return sessionId;
}
```

#### `getGuestSessionId()`

Возвращает существующий `guest_session_id` или `null`:

```typescript
export async function getGuestSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_SESSION_COOKIE_NAME)?.value ?? null;
}
```

---

## Разделение идентичностей (Identity Separation)

### Принцип

**Анонимные и авторизованные пользователи - это РАЗНЫЕ идентичности.**

Это означает:
- ✅ Гостевая регистрация на событие НЕ привязывается к user_id при последующем логине
- ✅ Предотвращает случайную ассоциацию действий с чужого устройства
- ✅ Упрощает логику системы

### Пример сценария

```
1. Пользователь регистрируется на событие как гость на чужом ПК
   → event_participants: { guest_session_id: "abc123", user_id: null }

2. Владелец ПК логинится в систему
   → Его user_id НЕ ассоциируется с гостевой регистрацией

3. Результат: две отдельные идентичности, как и должно быть
```

### Уникальные ограничения в БД

```sql
-- Для авторизованных пользователей: один user может зарегистрироваться на событие только 1 раз
CREATE UNIQUE INDEX idx_event_participants_user_unique 
ON event_participants(event_id, user_id)
WHERE user_id IS NOT NULL;

-- Для гостей: один guest_session_id + display_name может зарегистрироваться только 1 раз
-- (Это позволяет одной сессии регистрировать разных людей с разными именами)
CREATE UNIQUE INDEX idx_event_participants_guest_unique 
ON event_participants(event_id, guest_session_id, display_name)
WHERE user_id IS NULL AND guest_session_id IS NOT NULL;
```

---

## Лучшие практики

### ✅ DO

1. **Используйте правильную функцию для паттерна:**
   - Protected Routes → `getCurrentUserFromMiddleware(request)`
   - Optional Auth Routes → `getCurrentUser()`

2. **Всегда проверяйте права доступа в service layer:**
   ```typescript
   // В deleteParticipant:
   const isOwner = currentUser?.id === event.createdByUserId;
   const isSelf = /* логика проверки */;
   
   if (!isOwner && !isSelf) {
     throw new AuthError("Недостаточно прав");
   }
   ```

3. **Документируйте паттерн в комментариях:**
   ```typescript
   // POST uses Optional Auth pattern:
   // - Middleware doesn't block this route
   // - Check JWT directly from cookies
   // - Fallback to guest session if not authenticated
   let currentUser = await getCurrentUser();
   ```

### ❌ DON'T

1. **НЕ используйте `getCurrentUserFromMiddleware` в Optional Auth routes:**
   ```typescript
   // ❌ НЕПРАВИЛЬНО в Optional Auth route:
   let currentUser = await getCurrentUserFromMiddleware(request);
   
   // ✅ ПРАВИЛЬНО:
   let currentUser = await getCurrentUser();
   ```

2. **НЕ пропускайте проверку прав в service layer:**
   ```typescript
   // ❌ НЕПРАВИЛЬНО: доверяем только наличию currentUser
   if (currentUser) {
     await deleteParticipant(id);
   }
   
   // ✅ ПРАВИЛЬНО: проверяем права внутри service
   await deleteParticipant(id, currentUser, guestSessionId);
   // ^ service сам проверит isOwner или isSelf
   ```

3. **НЕ ассоциируйте guest_session_id с user_id при логине:**
   - Это нарушает принцип Identity Separation
   - Может привести к нежелательной связи действий

---

## История изменений

### 2024-12-22: Исправление Optional Auth для participants routes

**Проблема:**
- Routes `/api/events/[id]/participants/*` использовали `getCurrentUserFromMiddleware()`
- Middleware пропускал эти routes, не добавляя `x-user-id` header
- Owner событий не мог удалять/редактировать участников (получал 403)

**Решение:**
- Заменили `getCurrentUserFromMiddleware(request)` на `getCurrentUser()`
- Теперь JWT проверяется напрямую из cookies в route handler
- Owner корректно определяется как авторизованный пользователь

**Затронутые файлы:**
- `src/app/api/events/[id]/participants/route.ts` (POST)
- `src/app/api/events/[id]/participants/[participantId]/route.ts` (PATCH, DELETE)

---

## Связанные документы

- [Security Overview](./security.md)
- [Rate Limiting Strategy](../RATE_LIMITING_STRATEGY.md)
- [Middleware Documentation](../../src/middleware.ts)

