# 🔍 ПОЛНЫЙ АРХИТЕКТУРНЫЙ АНАЛИЗ: Custom Auth + RLS

**Дата:** 22 декабря 2024  
**Проблема:** Ошибка загрузки главной страницы после включения RLS

---

## 📋 ЧАСТЬ 1: Анализ текущей архитектуры

### **1.1. Аутентификация (Custom JWT)**

```typescript
// src/lib/auth/currentUser.ts
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value; // ← Custom cookie
  const payload = await verifyJwt(token, secret);         // ← Custom JWT
  const user = await getUserById(payload.userId);         // ← Custom DB query
  return user;
}
```

**Факты:**
- ✅ Используется **CUSTOM JWT** (не Supabase Auth)
- ✅ Токен в cookie `auth_token`
- ✅ Декодирование через `jsonwebtoken`
- ✅ User загружается напрямую из `users` таблицы

### **1.2. Supabase Clients**

```typescript
// src/lib/db/client.ts

// ANON CLIENT (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

// ADMIN CLIENT (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});
```

**Факты:**
- ✅ **2 клиента:** `supabase` (anon) и `supabaseAdmin` (service role)
- ✅ `persistSession: false` — не сохраняет сессию Supabase Auth
- ✅ `supabaseAdmin` **УЖЕ ИСПОЛЬЗУЕТСЯ** в критических местах:
  - `notificationQueueRepo` — все операции через admin
  - `userCarRepo` — CREATE/UPDATE/DELETE через admin
  - `eventLocationsRepo` — все мутации через admin
  - `notificationSettingsRepo` — все операции через admin

### **1.3. Текущее использование clients**

| Модуль | Client | Причина |
|--------|--------|---------|
| `eventRepo` | `supabase` (anon) | READ operations |
| `participantRepo` | `supabase` (anon) | READ operations |
| `userRepo` | `supabase` (anon) | READ operations |
| `clubRepo` | `supabase` (anon) | READ operations |
| **`userCarRepo`** | **`supabaseAdmin`** | ✅ Mutations |
| **`eventLocationsRepo`** | **`supabaseAdmin`** | ✅ Mutations |
| **`notificationQueueRepo`** | **`supabaseAdmin`** | ✅ All ops |
| **`notificationSettingsRepo`** | **`supabaseAdmin`** | ✅ All ops |

**Вывод:** Архитектура **СМЕШАННАЯ** — часть кода уже использует admin, часть — anon.

---

## 📋 ЧАСТЬ 2: Анализ RLS политик

### **2.1. Проблема с `auth.uid()`**

**Все RLS политики используют:**
```sql
USING (created_by_user_id = auth.uid())
USING (user_id = auth.uid())
USING (auth.uid() IS NOT NULL AND ...)
```

**`auth.uid()` — это функция Supabase Auth:**
```sql
auth.uid() → returns user ID from Supabase Auth JWT
```

**НО:**
- ❌ Вы используете **CUSTOM JWT** (не Supabase Auth JWT)
- ❌ Supabase client создан с `persistSession: false`
- ❌ Ваш JWT токен **НЕ передаётся** в Supabase client
- ❌ `auth.uid()` **ВСЕГДА возвращает NULL**

**Результат:**
```typescript
// Даже для залогиненного пользователя:
auth.uid() → NULL  // ← Потому что используется custom JWT

// Все RLS политики видят запрос как anonymous:
WHERE created_by_user_id = auth.uid()  // → WHERE created_by_user_id = NULL → FALSE
```

### **2.2. Почему GRANT не помогает**

```sql
-- Миграция 1: Grant на users
GRANT SELECT ON users TO anon;  // ✅ Разрешает чтение таблицы

-- Миграция 2: Grant на participants
GRANT SELECT ON event_participants TO anon;  // ✅ Разрешает чтение таблицы
```

**НО:**
- GRANT разрешает **доступ к таблице**
- RLS политики контролируют **видимость строк**
- Для авторизованного пользователя RLS политики **зависят от `auth.uid()`**
- `auth.uid()` = NULL → RLS блокирует доступ → ошибка

**Пример:**
```sql
-- Для anonymous (auth.uid() = NULL):
SELECT * FROM events WHERE visibility = 'public';  // ✅ Работает

-- Для "авторизованного" с custom JWT (auth.uid() = NULL):
SELECT * FROM events WHERE created_by_user_id = auth.uid();  // ❌ Блокируется RLS
```

---

## 📋 ЧАСТЬ 3: Варианты решения

### **Вариант 1: Переход на Supabase Auth**

**Что делать:**
- Заменить custom JWT на Supabase Auth
- Использовать `createServerClient` от `@supabase/ssr`
- RLS политики с `auth.uid()` заработают автоматически

**Плюсы:**
- ✅ RLS работает нативно
- ✅ Безопасность из коробки
- ✅ Меньше кастомного кода

**Минусы:**
- ❌ **Полная переделка auth системы**
- ❌ Миграция всех пользователей
- ❌ Изменение всех auth endpoints
- ❌ Telegram Login нужно интегрировать по-другому

**Вердикт:** ❌ **Слишком большой рефакторинг**

---

### **Вариант 2: Передавать custom JWT в Supabase Client**

**Что делать:**
- Создавать Supabase client для каждого запроса
- Передавать ваш custom JWT как Authorization header
- Настроить Postgres чтобы парсил custom JWT и заполнял `auth.uid()`

**Плюсы:**
- ✅ RLS продолжает работать
- ✅ Минимальные изменения в RLS политиках

**Минусы:**
- ❌ **Нужно настроить Postgres JWT verification для custom JWT**
- ❌ Сложная конфигурация Supabase
- ❌ Каждый Server Component создаёт свой client
- ❌ Overhead на создание clients

**Вердикт:** ❌ **Слишком сложная конфигурация**

---

### **Вариант 3: Service Role Key + Application-Level Authorization** ⭐

**Что делать:**
1. Использовать `supabaseAdmin` (service role) для **ВСЕХ** server-side запросов
2. Service role **BYPASS RLS** полностью
3. **Authorization checks** делаются в application code
4. RLS остаётся как **защита от SQL injection** и **прямого доступа к БД**

**Архитектура:**
```
┌─────────────────────────────────────────────┐
│  Browser / API Request                      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Next.js Server Component / API Route       │
│  ↓                                           │
│  getCurrentUser() → Custom JWT              │ ← Application Auth
│  ↓                                           │
│  if (!user) return 401;                     │ ← Application Authorization
│  if (event.owner !== user.id) return 403;  │
│  ↓                                           │
│  supabaseAdmin.from('events').select(...)  │ ← Service Role (bypasses RLS)
└─────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  PostgreSQL Database                        │
│  - RLS защищает от SQL injection            │
│  - RLS защищает от прямого DB access        │
│  - Service role key bypass RLS              │
└─────────────────────────────────────────────┘
```

**Плюсы:**
- ✅ **УЖЕ ЧАСТИЧНО ИСПОЛЬЗУЕТСЯ** (userCars, notifications, locations)
- ✅ **Минимальные изменения** — просто заменить `supabase` на `supabaseAdmin`
- ✅ Authorization в application code (более гибко)
- ✅ RLS всё ещё защищает от прямого DB access
- ✅ Работает с custom JWT
- ✅ Проще тестировать authorization logic

**Минусы:**
- ⚠️ Authorization checks нужно писать руками в application layer
- ⚠️ RLS не работает как primary defense (только secondary)

**Вердикт:** ✅ **ПРАВИЛЬНОЕ РЕШЕНИЕ** для custom auth

---

## 📋 ЧАСТЬ 4: Рекомендуемая архитектура

### **4.1. Defense in Depth Strategy**

```
┌─────────────────────────────────────────────┐
│  Layer 1: Network (Middleware)               │
│  - Rate limiting                             │
│  - JWT verification                          │
│  - Request logging                           │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Layer 2: Application (Authorization)       │ ⭐ PRIMARY DEFENSE
│  - getCurrentUser() checks                   │
│  - Ownership validation                      │
│  - Role checks                               │
│  - Visibility rules                          │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Layer 3: Database (RLS + GRANT)            │ ⭐ SECONDARY DEFENSE
│  - RLS защита от SQL injection               │
│  - GRANT контролирует table access           │
│  - Service role bypass для trusted code      │
└─────────────────────────────────────────────┘
```

### **4.2. Authorization Pattern**

```typescript
// ✅ ПРАВИЛЬНЫЙ ПАТТЕРН

// Server Component or API Route
export async function getEvent(id: string) {
  // 1. Get current user (custom JWT)
  const currentUser = await getCurrentUser();
  
  // 2. Load event (via admin client)
  const event = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  
  // 3. Authorization check (application layer)
  if (event.visibility === 'restricted') {
    if (!currentUser) throw new AuthError();
    if (event.created_by_user_id !== currentUser.id) {
      // Check explicit access
      const hasAccess = await checkEventAccess(id, currentUser.id);
      if (!hasAccess) throw new ForbiddenError();
    }
  }
  
  // 4. Return event
  return event;
}
```

### **4.3. RLS Purpose**

**RLS остаётся для защиты от:**
1. ✅ SQL Injection attacks
2. ✅ Прямого доступа к БД (если кто-то украл anon key)
3. ✅ Ошибок в application code (defence in depth)

**RLS НЕ используется для:**
- ❌ Primary authorization (делается в application layer)
- ❌ User context (custom JWT, не Supabase Auth)

---

## 🎯 ЧАСТЬ 5: ПЛАН ДЕЙСТВИЙ

### **Фаза 1: Рефакторинг Data Layer**

**Цель:** Заменить `supabase` (anon) на `supabaseAdmin` (service role) во ВСЕХ server-side запросах.

**Изменения:**
1. ✅ `eventRepo.ts` — заменить `supabase` на `supabaseAdmin`
2. ✅ `participantRepo.ts` — заменить `supabase` на `supabaseAdmin`  
3. ✅ `clubRepo.ts` — заменить `supabase` на `supabaseAdmin`
4. ✅ `eventAccessRepo.ts` — заменить `supabase` на `supabaseAdmin`
5. ✅ `cityRepo.ts`, `currencyRepo.ts`, etc. — заменить `supabase` на `supabaseAdmin`

**Исключения:**
- ❌ **Client-side** компоненты — продолжают использовать `supabase` (anon)
- ❌ API routes для **публичных данных** — могут использовать `supabase` (anon)

### **Фаза 2: Упростить RLS политики**

**Цель:** Убрать зависимость от `auth.uid()` из политик.

**Для анонимных операций:**
```sql
-- БЫЛО:
USING (visibility = 'public' OR created_by_user_id = auth.uid())

-- СТАЛО (если используем admin client):
-- RLS не нужен! Service role bypass.
-- Или упростить:
USING (true)  -- Application делает проверки
```

**Для защиты от SQL injection:**
```sql
-- Минимальные RLS политики:
CREATE POLICY events_select_all ON events FOR SELECT USING (true);
CREATE POLICY events_insert_prevent ON events FOR INSERT WITH CHECK (false); -- Block direct inserts
CREATE POLICY events_update_prevent ON events FOR UPDATE USING (false);      -- Block direct updates  
CREATE POLICY events_delete_prevent ON events FOR DELETE USING (false);      -- Block direct deletes
```

### **Фаза 3: Документация**

**Создать:**
- `docs/ARCHITECTURE_AUTH.md` — объяснение custom JWT + Service Role pattern
- `docs/SECURITY_MODEL.md` — слои защиты (Middleware, Application, Database)
- Комментарии в коде объясняющие почему используется `supabaseAdmin`

---

## 📊 ЧАСТЬ 6: Сравнение вариантов

| Критерий | Supabase Auth | Custom JWT + RLS | **Service Role + App Auth** |
|----------|---------------|------------------|------------------------------|
| Совместимость с custom JWT | ❌ Нет | ⚠️ Сложно | ✅ Да |
| Объём рефакторинга | 🔴 Огромный | 🟡 Средний | 🟢 Минимальный |
| RLS работает | ✅ Да | ⚠️ Нужна настройка | ⚠️ Только для защиты |
| Authorization logic | Supabase | Смешанная | Application |
| Уже используется | ❌ Нет | ❌ Нет | ✅ Да (частично) |
| Безопасность | 🟢 Высокая | 🟢 Высокая | 🟢 Высокая (multi-layer) |
| Гибкость | 🟡 Средняя | 🟡 Средняя | 🟢 Высокая |
| Тестируемость | 🟡 Средняя | 🟡 Средняя | 🟢 Высокая |

---

## 🏆 ИТОГОВАЯ РЕКОМЕНДАЦИЯ

### ✅ **Использовать Вариант 3: Service Role + Application Authorization**

**Причины:**
1. ✅ Совместимо с custom JWT (не нужна переделка auth)
2. ✅ Минимальный рефакторинг (заменить client в нескольких файлах)
3. ✅ **УЖЕ ИСПОЛЬЗУЕТСЯ** в проекте (notifications, userCars, locations)
4. ✅ Архитектурно правильно для custom auth
5. ✅ RLS остаётся как защита от SQL injection
6. ✅ Authorization logic явная и тестируемая
7. ✅ Проще поддерживать и понимать

**Жертвы:** ❌ **НЕТ**
- ✅ Безопасность сохраняется (multi-layer defense)
- ✅ Архитектура правильная
- ✅ Без костылей
- ✅ Production-ready

---

**Следующий шаг:** Создать детальный план миграции с примерами кода для каждого репозитория.
