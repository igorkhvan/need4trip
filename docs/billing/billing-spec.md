# 📋 Правила биллинга и лимитов Need4Trip

> **Единственный продуктовый источник истины для тарифов, лимитов и paywall логики**

---

## 0) Цель и принципы

### Цель
Реализовать биллинг и лимиты так, чтобы продукт работал предсказуемо, а ограничения и поведение при неоплате можно было гибко менять через БД.

### Принципы

1. **Frontend не решает лимиты и доступ**  
   Фронт только показывает UI и реагирует на ошибки backend.

2. **Backend — единственный источник истины**  
   По доступу, лимитам, grace и paywall.

3. **Цены и лимиты — в БД**  
   Seed + API `/api/plans`.

4. **Поведение при неоплате — в БД**  
   Grace period, доступные действия в `pending`/`grace`/`expired`.

5. **Транзакции не участвуют в проверках доступа**  
   `billing_transactions` — аудит/история. Доступ определяется текущим состоянием подписки клуба.

---

## 1) Термины

| Термин | Описание |
|--------|----------|
| **User** | Пользователь (Telegram) |
| **Club** | Платная сущность (в Free клуб создать нельзя) |
| **Plan** | Тариф клуба (`Club 50` / `Club 500` / `Unlimited`) |
| **Subscription** | Состояние оплаты клуба: `active`/`grace`/`expired`/`pending` |
| **Limits** | Лимиты тарифа (max_members, max_event_participants, paid events, CSV export) |
| **Actions** | Операции, которые могут быть разрешены/запрещены в зависимости от подписки |
| **Billing policy** | Правила grace и разрешённые actions при pending/grace/expired |

---

## 2) Продуктовые правила

### 2.1 Free (пользовательский режим)

**Клуб создавать нельзя.**

Пользователь может:
- ✅ Создавать личные события (не привязанные к клубу)
- ✅ Делать события только бесплатными
- ✅ Лимит участников события: **15**
- ❌ CSV экспорт: нельзя

**Important:** 
- Free не является клубным тарифом. Это режим **"без клуба"**.
- **Since v2.1:** FREE план хранится в таблице `club_plans` (id='free') для унификации.
- Все лимиты FREE плана загружаются из БД через `getPlanById('free')`.

### 2.2 Клубы — только платные

- Клуб создаётся **только после успешной оплаты** (или после подтверждения провайдера)
- Минимальный клубный тариф: **Club 50**

---

## 3) Перечень Actions (канонический список)

Храним и используем строгий набор кодов (enum-like):

### Club actions

```typescript
enum ClubAction {
  CLUB_CREATE = 'CLUB_CREATE',                        // создать клуб (после оплаты)
  CLUB_UPDATE = 'CLUB_UPDATE',                        // редактировать клуб
  CLUB_INVITE_MEMBER = 'CLUB_INVITE_MEMBER',          // приглашать/добавлять участников
  CLUB_REMOVE_MEMBER = 'CLUB_REMOVE_MEMBER',          // удалять участников
  CLUB_CREATE_EVENT = 'CLUB_CREATE_EVENT',            // создавать клубные события
  CLUB_UPDATE_EVENT = 'CLUB_UPDATE_EVENT',            // редактировать клубные события
  CLUB_EXPORT_PARTICIPANTS_CSV = 'CLUB_EXPORT_PARTICIPANTS_CSV',  // экспорт участников
  CLUB_CREATE_PAID_EVENT = 'CLUB_CREATE_PAID_EVENT',  // создавать платные события
}
```

### Event actions (personal/free)

```typescript
enum PersonalAction {
  PERSONAL_CREATE_EVENT = 'PERSONAL_CREATE_EVENT',
  PERSONAL_CREATE_PAID_EVENT = 'PERSONAL_CREATE_PAID_EVENT',  // в Free запрещено
}
```

---

## 4) Модель БД (всё управляемое через БД)

### 4.1 Таблица `club_plans` (цены + лимиты + фичи тарифа)

Это основная таблица для seed и `/api/plans`.

```sql
CREATE TABLE public.club_plans (
  id TEXT PRIMARY KEY,                         -- free | club_50 | club_500 | unlimited
  title TEXT NOT NULL,

  price_monthly_kzt NUMERIC(10,2) NOT NULL,    -- 0 для free, остальные в тенге
  currency TEXT NOT NULL DEFAULT 'KZT',

  max_members INT NULL,                        -- NULL = unlimited (или не применимо для free)
  max_event_participants INT NULL,             -- NULL = unlimited

  allow_paid_events BOOLEAN NOT NULL,
  allow_csv_export BOOLEAN NOT NULL,

  is_public BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**📌 Since v2.1:** FREE план теперь хранится в этой таблице с `id='free'` для унификации архитектуры.
- `price_monthly_kzt = 0.00`
- `max_event_participants = 15`
- `allow_paid_events = false`
- `allow_csv_export = false`
- `max_members = NULL` (клубы недоступны на FREE)

**Преимущества:**
- ✅ Единый источник истины для всех планов
- ✅ Возможность изменить лимиты FREE через БД
- ✅ Унифицированный код (нет `if (plan === 'free')` с hardcoded значениями)
- ✅ Кэширование работает для всех планов одинаково

### 4.2 Таблица `billing_policy` (grace, allowed actions при неоплате)

Здесь живёт всё поведение "если не получили оплату".

```sql
CREATE TABLE public.billing_policy (
  id TEXT PRIMARY KEY,                          -- 'default'
  grace_period_days INT NOT NULL DEFAULT 7,     -- длительность grace

  -- Если оплата не получена после инициации:
  pending_ttl_minutes INT NOT NULL DEFAULT 60,  -- сколько держим pending payment intent

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Seed:**
```sql
INSERT INTO public.billing_policy (id, grace_period_days, pending_ttl_minutes)
VALUES ('default', 7, 60);
```

### 4.3 Таблица `billing_policy_actions` (разрешённые actions по статусу)

Ключевое: управление тем, что можно делать в `pending`/`grace`/`expired`, хранится в БД.

```sql
CREATE TABLE public.billing_policy_actions (
  policy_id TEXT NOT NULL REFERENCES billing_policy(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','grace','expired')),
  action TEXT NOT NULL,                         -- из списка actions
  is_allowed BOOLEAN NOT NULL DEFAULT false,

  PRIMARY KEY (policy_id, status, action)
);
```

**Рекомендуемый baseline:**
- **pending:** разрешить только просмотр, отмены, безопасные операции (обычно минимум)
- **grace:** разрешить почти всё (SaaS-практика), но можно ограничить создание платных/экспорт
- **expired:** read-only + разрешить оплату/просмотр

**Пример seed (концепт):**

```sql
-- expired: read-only
INSERT INTO public.billing_policy_actions (policy_id, status, action, is_allowed)
VALUES 
  ('default', 'expired', 'CLUB_UPDATE', false),
  ('default', 'expired', 'CLUB_CREATE_EVENT', false),
  ('default', 'expired', 'CLUB_CREATE_PAID_EVENT', false),
  ('default', 'expired', 'CLUB_EXPORT_PARTICIPANTS_CSV', false);

-- grace: почти всё разрешено
INSERT INTO public.billing_policy_actions (policy_id, status, action, is_allowed)
VALUES 
  ('default', 'grace', 'CLUB_CREATE_EVENT', true),
  ('default', 'grace', 'CLUB_CREATE_PAID_EVENT', true),
  ('default', 'grace', 'CLUB_EXPORT_PARTICIPANTS_CSV', true);

-- pending: всё запрещено (кроме просмотра, который не требует action)
```

### 4.4 Таблица `club_subscriptions` (текущее состояние подписки клуба)

Enforcement смотрит сюда + в `club_plans` + `policy`.

```sql
CREATE TABLE public.club_subscriptions (
  club_id UUID PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,

  plan_id TEXT NOT NULL REFERENCES club_plans(id),
  status TEXT NOT NULL CHECK (status IN ('pending','active','grace','expired')),

  current_period_start TIMESTAMPTZ NULL,
  current_period_end TIMESTAMPTZ NULL,

  grace_until TIMESTAMPTZ NULL,                 -- вычисляется на основании policy
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Важно:** `club_subscriptions` — текущее состояние. Это то, на что опирается доступ.

### 4.5 Таблица `billing_transactions` (история/аудит денег)

```sql
CREATE TABLE public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES club_plans(id),

  provider TEXT NOT NULL,                       -- kaspi | epay | ...
  provider_payment_id TEXT,

  amount_kzt NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KZT',

  status TEXT NOT NULL CHECK (status IN ('pending','paid','failed','refunded')),

  period_start TIMESTAMPTZ NULL,
  period_end TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_billing_transactions_club_id ON public.billing_transactions (club_id);
CREATE INDEX idx_billing_transactions_status ON public.billing_transactions (status);
```

### 4.6 Таблицы клубов и членства (для лимита max_members)

```sql
CREATE TABLE public.club_members (
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

CREATE INDEX idx_club_members_user_id ON public.club_members(user_id);
```

### 4.7 Мульти-города для клубов

Клуб привязан к нескольким городам.

```sql
CREATE TABLE public.club_cities (
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  PRIMARY KEY (club_id, city_id)
);

CREATE INDEX idx_club_cities_city_id ON public.club_cities(city_id);
```

---

## 5) Flow: создание клуба (Free запрещён)

### 5.1 UX flow (продуктовый)

1. Пользователь нажимает **"Создать клуб"**
2. Backend проверяет: есть ли право `CLUB_CREATE` в текущем режиме
3. Так как Free — клубов нет, доступ = **paywall** (нужен Club 50)
4. Пользователь выбирает тариф на `/pricing`
5. Инициализируется оплата (payment intent)
6. После подтверждения оплаты:
   - создаётся клуб
   - создаётся подписка `active`
   - создаётся запись транзакции `paid`

### 5.2 Архитектурно важное решение (рекомендуется)

**Не создавать clubs до оплаты.**

Чтобы не плодить "полумёртвые" клубы, делайте один из вариантов:

- **Вариант A (лучший):** `club_drafts` (временная сущность до оплаты)
- **Вариант B:** хранить draft в client/local storage (менее надёжно)

Если делаете `club_drafts`, то:
- `pending TTL` берём из `billing_policy.pending_ttl_minutes`
- draft удаляется/истекает автоматически (по cron/ручному cleanup или при попытке загрузить)

---

## 6) Flow: неоплата / grace / expired (всё из БД)

### 6.1 Статус-машина

```
active → если период закончился:
  └─> если в policy есть grace: grace + grace_until = period_end + grace_days
  
grace → если now() > grace_until:
  └─> expired
  
pending → если не оплачено и истёк TTL:
  └─> failed payment + cleanup draft/intent
```

### 6.2 Что разрешено делать

Backend при каждом действии оценивает:

1. **Текущий статус подписки клуба**
2. **Разрешён ли action** в `billing_policy_actions` для этого статуса
3. **Лимиты плана** (`club_plans`)
4. **Доп. метрики** (например `current_member_count`, `requested_participants`)

---

## 7) Enforcement: единая точка проверки

### 7.1 Контракт функции

```typescript
assertAllowed({ 
  scope: 'personal' | 'club',
  action: string,  // из списка actions
  clubId?: string,
  context?: {
    requestedEventParticipants?: number,
    currentClubMembers?: number,
    isPaidEvent?: boolean,
    isCsvExport?: boolean,
  }
})
```

### 7.2 Алгоритм (обязательный)

#### Для `club-scope`:

1. **Load** `club_subscriptions` by `club_id`
2. **Load** `club_plans` by `plan_id`
3. **Load** `billing_policy` + `billing_policy_actions` для `policy_id='default'`
4. **If** `status != 'active'`:
   - check if action allowed by policy for this status
   - if not allowed → **throw Paywall (402)**
5. **Apply plan limits:**
   - `max_members`
   - `max_event_participants`
   - `allow_paid_events`
   - `allow_csv_export`
6. **If violates** → **throw Paywall (402)** с required plan

#### Для `personal-scope`:

Применяем **free-ограничения** (hardcoded или отдельная `personal_plan_policy` в БД — можно позже).

Сейчас проще: `personal = Free-ограничения`:
```typescript
{
  max_event_participants: 15,
  paid_events: false,
  csv_export: false,
}
```

---

## 8) Paywall: единый формат ошибок

Backend возвращает **HTTP 402**:

```typescript
{
  "success": false,
  "error": {
    "code": "PAYWALL",
    "reason": "MAX_EVENT_PARTICIPANTS_EXCEEDED",
    "currentPlanId": "club_50",
    "requiredPlanId": "club_500",
    "meta": {
      "limit": 50,
      "requested": 120
    },
    "cta": {
      "type": "OPEN_PRICING",
      "href": "/pricing"
    }
  }
}
```

### Рекомендуемые `reason`:

```typescript
enum PaywallReason {
  CLUB_CREATION_REQUIRES_PLAN = 'CLUB_CREATION_REQUIRES_PLAN',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  PAID_EVENTS_NOT_ALLOWED = 'PAID_EVENTS_NOT_ALLOWED',
  CSV_EXPORT_NOT_ALLOWED = 'CSV_EXPORT_NOT_ALLOWED',
  MAX_EVENT_PARTICIPANTS_EXCEEDED = 'MAX_EVENT_PARTICIPANTS_EXCEEDED',
  MAX_CLUB_MEMBERS_EXCEEDED = 'MAX_CLUB_MEMBERS_EXCEEDED',
}
```

---

## 9) `/api/plans` (data source = БД)

Endpoint `/api/plans` читает `club_plans`:
- только `is_public = true`
- отдаёт цены/лимиты/флаги

**Free** можно добавить в ответ как виртуальный план (`id=free`), но:
- ❌ не хранить в `club_plans`
- ✅ генерировать в коде как отдельный объект

Это удобно для UI pricing и QA snapshot.

---

## 10) Что нужно реализовать в кодовой базе

### 10.1 Миграции

```
✅ create_club_plans.sql
✅ seed_club_plans.sql
✅ create_billing_policy.sql
✅ seed_billing_policy.sql
✅ create_billing_policy_actions.sql
✅ seed_billing_policy_actions.sql
✅ create_club_subscriptions.sql
✅ create_billing_transactions.sql
✅ create_club_members.sql (если нет)
✅ create_club_cities.sql
```

### 10.2 Repository слой (db)

**planRepo.ts:**
```typescript
listPublicPlans()
getPlanById(planId)
```

**billingPolicyRepo.ts:**
```typescript
getDefaultBillingPolicy()
getPolicyActions(policyId) // → map status → set(actions allowed)
```

**clubSubscriptionRepo.ts:**
```typescript
getClubSubscription(clubId)
setStatus(...)
activateSubscription(clubId, planId, periodStart, periodEnd, graceUntil)
```

**billingTransactionsRepo.ts:**
```typescript
createTransactionPending
markPaid
markFailed
```

### 10.3 Service слой

**accessControl.ts** (или limits.ts):
```typescript
assertAllowed(...)
resolveRequiredPlanForEventParticipants(count)
resolveRequiredPlanForClubMembers(count)
```

**billingState.ts:**
```typescript
refreshSubscriptionStatusIfNeeded(clubId)
// по времени периодов + policy
// НЕ делать постоянно тяжелые пересчёты — кэшировать на запрос (in-request) достаточно
```

### 10.4 API

**GET /api/plans**

Все club endpoints должны вызывать `assertAllowed`:
- create club → paywall если нет тарифа
- create club event
- export csv
- create paid event
- invite member

### 10.5 UI реакция

- Фронт ловит `402` и показывает **Paywall modal** / redirect `/pricing`
- Paywall modal имеет CTA на `/pricing`

---

## 11) QA: что проверять автотестами

Минимальный набор:

✅ **Free не может создать клуб:** 402 + reason `CLUB_CREATION_REQUIRES_PLAN`

✅ **Free personal event >15 участников:** 402 + `requiredPlanId: club_50`

✅ **Club 50 event 51 участник:** 402 + `requiredPlanId: club_500`

✅ **Club subscription expired:** любые действия `CLUB_CREATE_EVENT`, `CSV_EXPORT`, `PAID_EVENT` → 402 (если policy запрещает)

✅ **Grace period:** действия разрешены/запрещены строго по `billing_policy_actions`

✅ **CSV export:**
- Free: 402
- Club 50+: ok

✅ **Paid event:**
- Free: 402
- Club 50+: ok

---

## 12) Примечания по будущему подключению платежей

(без реализации провайдера)

- `billing_transactions` фиксирует суммы в **KZT**
- `club_plans.price_monthly_kzt` — единственный источник цены
- `pending`/`paid`/`failed` управляются обработчиком webhook/колбэка провайдера

---

## 13) Итог (краткая справка)

| Что | Где |
|-----|-----|
| **Лимиты, цены, фичи** | `club_plans` |
| **Grace/неоплата и разрешённые действия** | `billing_policy` + `billing_policy_actions` |
| **Текущее состояние подписки клуба** | `club_subscriptions` |
| **История денег** | `billing_transactions` |
| **Enforcement** | только backend через `assertAllowed(...)` |
| **Free** | это режим "без клуба", клуб на free не существует |

---

## 14) Готовые константы для кода

```typescript
// Free limits (hardcoded, не в БД)
export const FREE_LIMITS = {
  maxEventParticipants: 15,
  allowPaidEvents: false,
  allowCsvExport: false,
} as const;

// Plan IDs
export const PLAN_IDS = ["club_50", "club_500", "unlimited"] as const;
export type PlanId = typeof PLAN_IDS[number];

// Subscription statuses
export const SUBSCRIPTION_STATUSES = ["pending", "active", "grace", "expired"] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

// Helper: определить required plan по количеству участников
export const REQUIRED_PLAN_FOR_PARTICIPANTS = (n: number): PlanId | 'free' => {
  if (n <= 15) return "free";
  if (n <= 50) return "club_50";
  if (n <= 500) return "club_500";
  return "unlimited";
};

// Helper: определить required plan по количеству членов клуба
export const REQUIRED_PLAN_FOR_MEMBERS = (n: number): PlanId => {
  if (n <= 50) return "club_50";
  if (n <= 500) return "club_500";
  return "unlimited";
};
```

---

## 📊 Краткая таблица тарифов

| План | Участники/событие | Члены клуба | Paid events | CSV | Цена (KZT) |
|------|------------------|-------------|-------------|-----|-----------|
| **Free** | 15 | - | ❌ | ❌ | 0 |
| **Club 50** | 50 | 50 | ✅ | ✅ | 3 490 ₸/мес |
| **Club 500** | 500 | 500 | ✅ | ✅ | 11 990 ₸/мес |
| **Unlimited** | ∞ | ∞ | ✅ | ✅ | Индивидуально |

---

**Версия:** 2.0  
**Дата:** Декабрь 2024  
**Статус:** Продуктовый источник истины (финальная версия)
