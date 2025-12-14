# 🔧 ДЕТАЛЬНЫЙ ПЛАН РЕФАКТОРИНГА

**Проект:** Need4Trip  
**Дата:** 14 декабря 2025  
**Основано на:** CODEBASE_AUDIT_COMPLETE.md

---

## 📋 ПРИОРИТЕТЫ

```
P0 (CRITICAL)  - блокирует разработку, риск багов в продакшне
P1 (HIGH)      - важно, но не блокирует
P2 (MEDIUM)    - техдолг, можно отложить
P3 (LOW)       - nice to have
```

---

## 🔴 P0: КРИТИЧНЫЕ ЗАДАЧИ (1-2 дня)

### 1. Регенерация Supabase типов

**Проблема:** 59+ случаев `as any` из-за отсутствия актуальных типов

**Файлы:**
- `src/lib/types/supabase.ts` - заменить полностью

**Шаги:**
```bash
# 1. Установить Supabase CLI (если еще нет)
npm install supabase --save-dev

# 2. Залогиниться
npx supabase login

# 3. Link проект (если еще не linked)
npx supabase link --project-ref <your-project-ref>

# 4. Сгенерировать типы
npx supabase gen types typescript --linked > src/lib/types/supabase-new.ts

# 5. Проверить diff
diff src/lib/types/supabase.ts src/lib/types/supabase-new.ts

# 6. Заменить старый файл
mv src/lib/types/supabase-new.ts src/lib/types/supabase.ts

# 7. Прогнать TypeScript
npm run build
```

**Затронутые файлы (убрать `as any`):**
```
src/lib/db/clubRepo.ts
src/lib/db/clubMemberRepo.ts
src/lib/db/subscriptionRepo.ts
src/lib/db/clubPlanRepo.ts
src/lib/db/eventRepo.ts
src/lib/db/cityRepo.ts
src/lib/db/currencyRepo.ts
src/lib/db/userRepo.ts
```

**Estimate:** 1-2 часа  
**Risk:** Low  
**Impact:** HIGH - устранит 59+ случаев type unsafety

---

### 2. Исправление eventRepo.ts

**Файл:** `src/lib/db/eventRepo.ts`

#### 2.1. Удалить дублирование `const db = client as any`

**До:**
```typescript
export async function createEvent(payload: EventCreateInput): Promise<DbEvent> {
  const client = ensureClient();
  if (!client) {
    const db = client as any;
    const db = client as any;
    throw new InternalError("Supabase client is not configured");
  }
  const now = new Date().toISOString();
  // ...
  const { data, error } = await db.from(table).insert(insertPayload).select("*").single();
  // ...
}
```

**После:**
```typescript
export async function createEvent(payload: EventCreateInput): Promise<DbEvent> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }
  
  const now = new Date().toISOString();
  const insertPayload = { /* ... */ };

  const { data, error } = await supabase
    .from(table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create event", error);
    throw new InternalError("Failed to create event", error);
  }

  return data as DbEvent;
}
```

**Функции для исправления:**
- `createEvent()` (строки 73-120)
- `updateEvent()` (строки 122-182)
- `replaceAllowedBrands()` (строки 184-204)
- `getAllowedBrands()` (строки 206-229)
- `deleteEvent()` (строки 303-325)

#### 2.2. Удалить локальную функцию `ensureClient()`

**Удалить:**
```typescript
function ensureClient() {
  if (!supabase) {
    console.warn("Supabase client is not configured");
    return null;
  }
  return supabase;
}
```

**Использовать импорт:**
```typescript
import { supabase, ensureClient } from "@/lib/db/client";
```

#### 2.3. Унифицировать паттерн с другими репозиториями

**Было:** `const client = ensureClient(); const db = client as any;`  
**Стало:** `ensureClient(); if (!supabase) return null;`

**Estimate:** 30 минут  
**Risk:** Low  
**Impact:** HIGH - улучшит читаемость и консистентность

---

### 3. Исправление userRepo.ts

**Файл:** `src/lib/db/userRepo.ts`

**Проблема:** Переменная `client` не определена (строка 37)

**До:**
```typescript
export async function ensureUserExists(id: string, name?: string): Promise<DbUserRow> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }
  
  // 1. Проверяем существует ли пользователь
  const { data: existing, error: findError } = await client  // ❌ client не определен
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  // ...
}
```

**После:**
```typescript
export async function ensureUserExists(id: string, name?: string): Promise<DbUserRow> {
  ensureClient();
  if (!supabase) {
    throw new InternalError("Supabase client is not configured");
  }
  
  // 1. Проверяем существует ли пользователь
  const { data: existing, error: findError } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  
  if (findError) {
    console.error("Failed to check if user exists", findError);
    throw new InternalError("Failed to check if user exists", findError);
  }

  // 2. Если пользователь существует - возвращаем его
  if (existing) {
    return existing as DbUserRow;
  }

  // 3. Если пользователя нет - создаем нового
  const payload = {
    id,
    name: name?.trim() || "Dev User",
    phone: null,
    email: null,
    telegram_handle: null,
    telegram_id: null,
    avatar_url: null,
    car_model: null,
    experience_level: null,
  };

  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create user", error);
    throw new InternalError("Failed to create user", error);
  }

  console.log("[ensureUserExists] Created new user (dev mode):", { id, name });
  return data as DbUserRow;
}
```

**Также исправить:**
- `findUserByTelegramId()` (строка 96)
- `upsertTelegramUser()` (строка 128)

**Estimate:** 10 минут  
**Risk:** Low  
**Impact:** CRITICAL - fix runtime error

---

### 4. Исправление currencyRepo.ts

**Файл:** `src/lib/db/currencyRepo.ts`

**Проблема:** `getAllCurrencies()` фильтрует по `is_active = false` вместо получения всех

**До:**
```typescript
export async function getAllCurrencies(): Promise<Currency[]> {
  if (!supabase) {
    console.warn("[currencyRepo] Supabase client is not configured");
    return [];
  }
  
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .eq("is_active", false)  // ❌ Получаем только неактивные!
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });
  
  // ...
}
```

**После:**
```typescript
export async function getAllCurrencies(): Promise<Currency[]> {
  if (!supabase) {
    console.warn("[currencyRepo] Supabase client is not configured");
    return [];
  }
  
  // Получаем ВСЕ валюты (включая активные и неактивные)
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .order("is_active", { ascending: false })  // Активные первыми
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    console.error("[currencyRepo] Error fetching all currencies:", error);
    return [];
  }

  return (data || []).map((row: any) => mapDbCurrencyToDomain(row));
}
```

**Estimate:** 5 минут  
**Risk:** Low  
**Impact:** MEDIUM - fix функциональная ошибка

---

### 5. Добавление поля `plan` в CurrentUser

**Файлы:**
- `src/lib/auth/currentUser.ts`
- `src/lib/services/permissions.ts`
- `src/lib/services/paywall.ts`

**Шаг 1: Обновить интерфейс**
```typescript
// src/lib/auth/currentUser.ts
import { ExperienceLevel, UserPlan } from "@/lib/types/user";

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
  plan?: UserPlan; // ✅ Добавить это поле
  createdAt?: string;
  updatedAt?: string;
}
```

**Шаг 2: Обновить getCurrentUser()**
```typescript
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyJwt(token, secret);
  if (!payload?.userId) return null;

  let user: Awaited<ReturnType<typeof getUserById>> = null;
  try {
    user = await getUserById(String(payload.userId));
  } catch (err) {
    console.error("[getCurrentUser] Failed to load user from DB", err);
    return null;
  }

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    telegramHandle: user.telegramHandle,
    telegramId: user.telegramId ?? null,
    avatarUrl: user.avatarUrl,
    cityId: user.cityId ?? null,
    phone: user.phone ?? null,
    email: user.email ?? null,
    carBrandId: user.carBrandId ?? null,
    carModelText: user.carModelText ?? null,
    experienceLevel: user.experienceLevel ?? null,
    plan: user.plan ?? "free", // ✅ Добавить маппинг
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
```

**Шаг 3: Убрать `as any` в permissions.ts и paywall.ts**
```typescript
// ❌ БЫЛО
const userPlan = (user as any).plan ?? "free";

// ✅ СТАЛО
const userPlan = user.plan ?? "free";
```

**Estimate:** 15 минут  
**Risk:** Low  
**Impact:** MEDIUM - improve type safety

---

## 🟠 P1: ВАЖНЫЕ ЗАДАЧИ (2-3 дня)

### 6. Настройка proper logging

**Цель:** Заменить console.log на production-ready logging

**Шаги:**

#### 6.1. Установить Pino (fastest logger for Node.js)
```bash
npm install pino pino-pretty
```

#### 6.2. Создать logger utility
```typescript
// src/lib/utils/logger.ts
import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  enabled: !isTest,
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// Convenience methods
export const log = {
  info: logger.info.bind(logger),
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  debug: logger.debug.bind(logger),
};
```

#### 6.3. Заменить все console.log

**Примеры:**
```typescript
// ❌ БЫЛО
console.log("🔧 [Supabase Client] Configuration:");
console.error("Failed to create event", error);
console.warn("Invalid event id provided", id);

// ✅ СТАЛО
import { log } from "@/lib/utils/logger";

log.info({ url: !!supabaseUrl, key: !!supabaseAnonKey }, "Supabase client configuration");
log.error({ error }, "Failed to create event");
log.warn({ id }, "Invalid event id provided");
```

#### 6.4. Обновить все файлы

**Приоритет:**
1. `src/lib/db/*.ts` (13 файлов)
2. `src/lib/services/*.ts` (9 файлов)
3. `src/lib/auth/*.ts` (3 файла)
4. `src/app/api/**/*.ts` (20+ endpoints)

**Estimate:** 2-4 часа  
**Risk:** Low  
**Impact:** MEDIUM - better debugging, production logs

---

### 7. Убрать debug UI элементы

**Файлы:**

#### 7.1. auth-modal.tsx
```typescript
// Удалить блок (строки 263-279)
{/* Debug Info */}
{mode === 'telegram' && (
  <div className="mt-6 p-4 bg-muted rounded-lg text-xs space-y-2">
    <div>🔍 Debug:</div>
    {/* ... */}
  </div>
)}
```

#### 7.2. event-form.tsx
```typescript
// Удалить блок (строки 529-543)
{/* Debug info - remove after testing */}
{form.city && (
  <div className="text-xs text-muted-foreground">
    City ID: {form.city.id}<br />
    City Name: {form.city.name}
  </div>
)}
```

#### 7.3. Удалить debug логирование
```typescript
// event-form.tsx (строка 313)
// Debug logging
console.log('[EventForm] Submitting form:', form);

// auth-modal.tsx (строка 89)
// Debug: Log when modal state changes
console.log('[AuthModal] State changed:', { mode, isOpen });
```

**Estimate:** 30 минут  
**Risk:** Low  
**Impact:** LOW - cleaner UI

---

### 8. Унифицировать naming маппинг функций

**Проблема:** Разные naming conventions для маппинг функций

**Текущее состояние:**
```typescript
mapDbEventToDomain()           // ✅ Хорошо
mapDbParticipantToDomain()     // ✅ Хорошо
mapDbClubToDomain()            // ✅ Хорошо

mapRowToUser()                 // ❌ Плохо
mapRowToCity()                 // ❌ Плохо
mapDbCurrencyToDomain()        // ✅ Хорошо, но row: any
mapUserCar()                   // ❌ Плохо
```

**Целевое состояние:**
```typescript
// Все функции должны следовать паттерну:
mapDb{Entity}ToDomain(db: Db{Entity}): {Entity}

mapDbEventToDomain(db: DbEvent): Event
mapDbUserToDomain(db: DbUser): User
mapDbCityToDomain(db: DbCity): City
mapDbCurrencyToDomain(db: DbCurrency): Currency
mapDbUserCarToDomain(db: DbUserCar): UserCar
```

**Файлы для изменения:**
- `src/lib/db/userRepo.ts` - `mapRowToUser` → `mapDbUserToDomain`
- `src/lib/db/cityRepo.ts` - `mapRowToCity` → `mapDbCityToDomain`
- `src/lib/db/currencyRepo.ts` - исправить типизацию `row: any` → `db: DbCurrency`
- `src/lib/db/userCarRepo.ts` - `mapUserCar` → `mapDbUserCarToDomain`

**Estimate:** 1 час  
**Risk:** Low  
**Impact:** MEDIUM - better consistency

---

## 🟡 P2: СРЕДНИЕ ЗАДАЧИ (1 неделя)

### 9. Реализация TODO комментариев

**Приоритизация по impact:**

#### 9.1. HIGH IMPACT
```typescript
// src/lib/services/permissions.ts:238
// TODO: Need4Trip: Check event_user_access table for explicit access
// TODO: Need4Trip: Check if user is participant of the event

// Реализовать полную проверку доступа в canViewEvent()
```

#### 9.2. MEDIUM IMPACT
```typescript
// src/app/profile/page.tsx:85,100,140
// TODO: Real API call
// TODO: Real stats API call

// Создать API endpoints:
// - GET /api/profile/stats
// - PUT /api/profile
```

#### 9.3. LOW IMPACT (future)
```typescript
// src/lib/services/subscriptions.ts:173
// TODO: Need4Trip: Интеграция с платежной системой

// Отложить до момента, когда будет выбран payment provider
```

**Estimate:** 1-2 недели  
**Risk:** Medium  
**Impact:** VARIES

---

### 10. Выделение бизнес-логики из компонентов

**Примеры:**

#### 10.1. EventForm → useEventForm hook
```typescript
// src/lib/hooks/use-event-form.ts
export function useEventForm(mode: 'create' | 'edit', initialEvent?: Event) {
  const [form, setForm] = useState<EventFormData>(() => 
    mode === 'edit' && initialEvent 
      ? mapEventToForm(initialEvent) 
      : getDefaultForm()
  );
  
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = useCallback(() => {
    const newErrors: EventFormErrors = {};
    // Validation logic
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(/* ... */);
      // ...
    } finally {
      setIsSubmitting(false);
    }
  }, [form, validate]);

  return {
    form,
    errors,
    isSubmitting,
    setForm,
    handleSubmit,
    validate,
  };
}
```

#### 10.2. Использование в компоненте
```typescript
// src/components/events/event-form.tsx
export function EventForm({ mode, event }: EventFormProps) {
  const {
    form,
    errors,
    isSubmitting,
    setForm,
    handleSubmit,
  } = useEventForm(mode, event);

  return (
    <form onSubmit={handleSubmit}>
      {/* Только UI рендеринг */}
    </form>
  );
}
```

**Estimate:** 2-3 дня  
**Risk:** Medium  
**Impact:** HIGH - better testability

---

## 🟢 P3: НИЗКИЕ ЗАДАЧИ (долгосрочно)

### 11. Unit Tests

**Coverage target:** 70%+

#### 11.1. Setup Jest + React Testing Library
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event jest-environment-jsdom
```

#### 11.2. Создать конфиг
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
};
```

#### 11.3. Приоритеты тестирования
1. **Repositories** (db/) - unit tests
2. **Services** (services/) - unit tests
3. **Utils** (utils/) - unit tests
4. **Hooks** (hooks/) - React Testing Library
5. **Components** (components/) - React Testing Library

**Estimate:** 1-2 недели  
**Risk:** Low  
**Impact:** HIGH (для будущего)

---

### 12. E2E Tests

**Tool:** Playwright

#### 12.1. Setup
```bash
npm install -D @playwright/test
npx playwright install
```

#### 12.2. Критичные флоу для покрытия
1. Telegram авторизация
2. Создание события
3. Регистрация на событие (user + guest)
4. Редактирование события
5. Удаление события
6. Создание клуба
7. Управление участниками клуба

**Estimate:** 1-2 недели  
**Risk:** Medium  
**Impact:** HIGH (для CI/CD)

---

### 13. Performance Optimization

#### 13.1. Добавить кеширование
```typescript
// src/lib/utils/cache.ts
import { unstable_cache } from 'next/cache';

export const getCachedCities = unstable_cache(
  async () => getPopularCities(),
  ['popular-cities'],
  { revalidate: 3600 } // 1 hour
);

export const getCachedCurrencies = unstable_cache(
  async () => getActiveCurrencies(),
  ['active-currencies'],
  { revalidate: 3600 }
);
```

#### 13.2. Code splitting
```typescript
// Lazy load модальных окон
const ParticipantModal = dynamic(() => import('./participant-modal'));
const ConfirmDialog = dynamic(() => import('./confirm-dialog'));
```

#### 13.3. Image optimization
```typescript
// Использовать next/image везде
import Image from 'next/image';

<Image
  src={avatarUrl}
  alt={name}
  width={48}
  height={48}
  className="rounded-full"
/>
```

**Estimate:** 1 неделя  
**Risk:** Low  
**Impact:** MEDIUM

---

## 📊 TRACKING ПРОГРЕССА

### Метрики для отслеживания

```typescript
// Создать script для подсчета метрик
// scripts/code-metrics.ts

interface CodeMetrics {
  totalFiles: number;
  linesOfCode: number;
  typeAnyCount: number;
  todoCount: number;
  consoleLogCount: number;
  testCoverage: number;
}

// Запускать еженедельно
npm run metrics
```

### KPI

| Метрика | Current | Target | Status |
|---------|---------|--------|--------|
| `as any` count | 59 | 0 | 🔴 |
| TODO count | 89 | <20 | 🔴 |
| console.log count | 39 | 0 | 🟡 |
| Test coverage | 0% | 70% | 🔴 |
| Type coverage | 75% | 95% | 🟡 |

---

## 🎯 ЕЖЕНЕДЕЛЬНЫЕ ЧЕКЛИСТЫ

### Week 1: Critical Fixes
- [ ] День 1: Регенерировать Supabase типы (2 часа)
- [ ] День 2: Исправить eventRepo.ts (4 часа)
- [ ] День 2: Исправить userRepo.ts (1 час)
- [ ] День 3: Исправить currencyRepo.ts (1 час)
- [ ] День 3: Добавить plan в CurrentUser (2 часа)
- [ ] День 4: Code review + тесты (4 часа)
- [ ] День 5: Deploy на staging + мониторинг (4 часа)

### Week 2: High Priority
- [ ] День 1-2: Настроить proper logging (8 часов)
- [ ] День 3: Убрать debug элементы (4 часа)
- [ ] День 4: Унифицировать маппинг (4 часов)
- [ ] День 5: Code review + документация (4 часа)

### Week 3-4: Medium Priority
- [ ] Реализовать приоритетные TODO
- [ ] Выделить hooks из компонентов
- [ ] Создать unit tests для репозиториев
- [ ] Создать unit tests для сервисов

---

## 🚀 DEPLOYMENT STRATEGY

### Staging Pipeline
```yaml
# .github/workflows/staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  test:
    - npm run lint
    - npm run type-check
    - npm run test
    - npm run build

  deploy:
    - Deploy to Vercel staging
    - Run smoke tests
    - Notify team
```

### Production Pipeline
```yaml
# .github/workflows/production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    - All staging checks
    - Run E2E tests
    - Performance tests

  deploy:
    - Deploy to Vercel production
    - Run smoke tests
    - Monitor errors (Sentry)
```

---

## 📝 ЗАМЕТКИ

### Code Review Checklist
- [ ] Нет `as any` (кроме обоснованных случаев)
- [ ] Нет `console.log` (используется logger)
- [ ] Нет дублирования кода
- [ ] Типизация на 100%
- [ ] Есть error handling
- [ ] Есть комментарии для сложной логики
- [ ] Следует naming conventions

### Definition of Done
- [ ] Код написан и прошел self-review
- [ ] Добавлены/обновлены типы
- [ ] Нет type errors (npm run type-check)
- [ ] Нет lint errors (npm run lint)
- [ ] Build successful (npm run build)
- [ ] Code review пройден
- [ ] Deployed на staging
- [ ] Мануально протестировано
- [ ] (если применимо) Unit tests написаны
- [ ] Документация обновлена

---

**Последнее обновление:** 14 декабря 2025  
**Следующий review:** после Week 1
