# GAP ANALYSIS: Реализация v3.0 vs Спецификация v4

> **Дата:** 25 декабря 2024  
> **Цель:** Сравнить реализованную систему с новой спецификацией v4

---

## 🎯 КРАТКИЙ ВЫВОД

**Статус:** 70% реализовано, требуются доработки

**Критичные отличия:**
1. ❌ Отсутствует таблица `billing_products` (v4 требует)
2. ❌ Нет унифицированного endpoint `/api/billing/purchase-intent`
3. ⚠️ Publish logic частично соответствует, требует проверки

---

## ✅ ЧТО УЖЕ РЕАЛИЗОВАНО (совпадает с v4)

### Database Schema

| Элемент | v3 Статус | v4 Требование | Примечания |
|---------|-----------|---------------|------------|
| `events.published_at` | ✅ Реализовано | ✅ Требуется | Миграция 20241225_add_published_at_to_events.sql |
| `billing_transactions.product_code` | ✅ Реализовано | ✅ Требуется | Миграция 20241225_extend_billing_transactions.sql |
| `billing_transactions.user_id` | ✅ Реализовано | ✅ Требуется | Миграция 20241225_add_user_id_to_billing_transactions.sql |
| `billing_credits` таблица | ✅ Реализовано | ✅ Требуется | Миграция 20241225_create_billing_credits.sql |
| `billing_credits` indexes | ✅ Реализовано | ✅ Требуется | user_status, consumed_event, source_transaction (UNIQUE) |

### API Endpoints

| Endpoint | v3 Статус | v4 Требование | Примечания |
|----------|-----------|---------------|------------|
| `POST /api/events/:id/publish` | ✅ Реализовано | ✅ Требуется | С confirm_credit support |
| `POST /api/billing/credits/confirm` | ✅ Реализовано | ⚠️ Частично | v4 использует другой flow (через purchase-intent) |
| `POST /api/billing/credits/purchase` | ✅ Реализовано | ⚠️ Частично | v4 требует унифицированный purchase-intent |

### Backend Logic

| Компонент | v3 Статус | v4 Требование | Примечания |
|-----------|-----------|---------------|------------|
| Publish enforcement | ✅ Реализовано | ⚠️ Проверить | accessControl.enforcePublish() |
| Credit consumption | ✅ Реализовано | ✅ Требуется | billingCreditsRepo.consumeCredit() |
| 402/409 responses | ✅ Реализовано | ⚠️ Проверить format | PaywallError, CreditConfirmationError |
| Idempotency | ✅ Реализовано | ✅ Требуется | published_at check, UNIQUE(source_transaction_id) |

### Frontend Components

| Компонент | v3 Статус | v4 Требование | Примечания |
|-----------|-----------|---------------|------------|
| `PaywallModal.tsx` | ✅ Реализовано | ✅ Требуется | Multiple options support |
| `CreditConfirmationModal.tsx` | ✅ Реализовано | ✅ Требуется | 409 handling |

---

## ❌ ЧТО НЕ РЕАЛИЗОВАНО (требуется добавить)

### 1. Database: billing_products таблица

**v4 Спецификация:**
```sql
CREATE TABLE billing_products (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit')),
  price_kzt NUMERIC(10,2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'KZT',
  is_active BOOLEAN NOT NULL DEFAULT true,
  constraints JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Seed:**
```sql
INSERT INTO billing_products (code, title, type, price_kzt, constraints, is_active)
VALUES (
  'EVENT_UPGRADE_500',
  'Event Upgrade (до 500 участников)',
  'credit',
  1000.00,
  '{"scope":"personal","max_participants":500}'::jsonb,
  true
);
```

**Зачем:** 
- Убирает hardcode цен из кода
- Позволяет динамически управлять продуктами через БД
- v4 использует constraints из БД для валидации

**Статус:** ❌ Не создана

---

### 2. API: GET /api/billing/products

**v4 Спецификация:**
- Returns active public billing products (at least EVENT_UPGRADE_500)
- Include: code, title, price_kzt, currency_code, constraints, is_active

**Зачем:**
- Фронтенд получает цены и constraints динамически
- Нет hardcode в UI

**Статус:** ❌ Не реализован

**Текущее решение (v3):**
- Цена 1000 KZT hardcoded в `/api/billing/credits/purchase`
- Constraint max_participants=500 hardcoded в `accessControl.ts`

---

### 3. API: POST /api/billing/purchase-intent (унифицированный)

**v4 Спецификация:**
```typescript
POST /api/billing/purchase-intent

Input:
{
  product_code: string,            // EVENT_UPGRADE_500 или CLUB_50, CLUB_500, etc.
  quantity?: number,               // default 1
  context?: { eventId?: string }
}

Response:
{
  transaction_id,
  transaction_reference,
  payment: {
    provider: 'kaspi',
    invoice_url?: string,
    qr_payload?: string,
    instructions?: string
  }
}
```

**Зачем:**
- Унифицированный flow для клубов + one-off credits
- Возвращает payment details (invoice URL, QR)
- Не требует navigation away from event form

**Статус:** ❌ Не реализован

**Текущее решение (v3):**
- `/api/billing/credits/purchase` - только для credits
- Нет support для club access purchases через unified API
- Нет возврата Kaspi invoice URL/QR

---

### 4. API: GET /api/billing/transactions/status

**v4 Спецификация:**
- Query by transaction_reference or transaction_id
- Returns status: pending/completed/failed/refunded
- Used for polling from paywall modal

**Зачем:**
- Фронтенд может poll статус оплаты
- Real-time feedback в paywall modal

**Статус:** ❌ Не реализован

**Текущее решение (v3):**
- Нет polling mechanism
- Confirmation только через webhook (`/api/billing/credits/confirm`)

---

## ⚠️ ЧТО ТРЕБУЕТ ПРОВЕРКИ

### 1. Publish Logic: Step-by-step соответствие

**v4 Algorithm:**
```
Step 0: Idempotency (if published_at exists → 200)
Step 1: Club events branch (enforce club action, only CLUB_ACCESS option)
Step 2: Personal events branch:
  - Fits free → publish immediately (no credit consumption!)
  - > oneoff_max_participants (500) → 402 PAYWALL (only CLUB_ACCESS)
  - Exceeds free, <=500:
    - No credit → 402 PAYWALL (options: ONE_OFF + CLUB_ACCESS)
    - Has credit, no confirm → 409 CREDIT_CONFIRMATION_REQUIRED
    - Has credit, confirm=1 → consume + publish
```

**v3 Implementation:** 
- Реализовано в `accessControl.enforcePublish()`
- Требуется проверка:
  1. ✅ Step 0 (idempotency) - проверен в `/api/events/:id/publish`
  2. ⚠️ Step 1 (club branch) - требует проверки
  3. ⚠️ Step 2 (personal branch) - требует проверки
  4. ⚠️ Free limit check (НЕ consume credit if fits free)

**Action:** Прочитать `accessControl.enforcePublish()` и сверить с v4

---

### 2. Paywall Response Format

**v4 Contract:**
```typescript
// 402 PAYWALL
{
  success: false,
  error: {
    code: "PAYWALL",
    reason: string,
    meta: {...},
    options: [
      { 
        type: "ONE_OFF_CREDIT", 
        product_code, 
        price_kzt, 
        currency_code, 
        provider: "kaspi" 
      },
      { 
        type: "CLUB_ACCESS", 
        plans_preview: [...], 
        recommended_plan_id?: string, 
        provider: "kaspi" 
      }
    ]
  }
}

// 409 CREDIT_CONFIRMATION_REQUIRED
{
  success: false,
  error: {
    code: "CREDIT_CONFIRMATION_REQUIRED",
    reason: "EVENT_UPGRADE_WILL_BE_CONSUMED",
    meta: { eventId, credit_code, requestedParticipants, freeLimit },
    cta: { 
      type: "CONFIRM_CONSUME_CREDIT", 
      href: "/api/events/:id/publish?confirm_credit=1" 
    }
  }
}
```

**v3 Implementation:**
- Определено в `src/lib/types/billing.ts`
- Требуется проверка exact match с v4

**Action:** Сверить типы и response format

---

### 3. Free Limit Check

**v4 Critical Rule:**
> If requestedParticipants <= free_limit_participants:
>   - Publish immediately (set published_at), return 200
>   - IMPORTANT: Do NOT consume credit even if user has credits.

**v3 Implementation:**
- Нужно проверить что `enforcePublish()` не consume credit если событие fits free limits

**Action:** Проверить logic в accessControl.ts

---

## 📊 ПРИОРИТЕЗАЦИЯ ДОРАБОТОК

### P0 (Critical) - блокируют core functionality

1. **billing_products таблица + seed** ❌
   - Без неё hardcode цен и constraints
   - Миграция: `20241226_create_billing_products.sql`
   - Время: 15 минут

2. **GET /api/billing/products** ❌
   - Фронтенд должен получать цены динамически
   - Время: 10 минут

3. **Проверка publish logic** ⚠️
   - Критично: НЕ consume credit если fits free
   - Критично: правильные options в 402
   - Время: 30 минут (review + fix)

### P1 (High) - улучшают UX, но не блокируют

4. **POST /api/billing/purchase-intent** ❌
   - Унифицированный API для credits + clubs
   - Возврат Kaspi invoice URL/QR
   - Время: 45 минут

5. **GET /api/billing/transactions/status** ❌
   - Polling для real-time feedback
   - Время: 20 минут

### P2 (Nice to have) - опциональные улучшения

6. **Refactor /api/billing/credits/*** ⚠️
   - Перенести на purchase-intent flow
   - Backward compatibility?
   - Время: 30 минут

---

## 🎯 РЕКОМЕНДУЕМЫЙ ПЛАН ДЕЙСТВИЙ

### Вариант 1: Минимальные доработки (P0 only)

**Цель:** Соответствие core требованиям v4

**Этапы:**
1. Создать billing_products таблицу + seed (15 мин)
2. Создать GET /api/billing/products (10 мин)
3. Review + fix enforcePublish() logic (30 мин)
4. Обновить SSOT документацию (15 мин)

**Итого:** ~70 минут

**Результат:** 
- ✅ Соответствие v4 database schema
- ✅ Dynamic pricing через API
- ✅ Correct publish enforcement
- ⚠️ Старые endpoints `/api/billing/credits/*` остаются (backward compat)

---

### Вариант 2: Полная миграция на v4 (P0 + P1)

**Цель:** Полное соответствие v4 спецификации

**Этапы:**
1. Вариант 1 (70 мин)
2. Создать POST /api/billing/purchase-intent (45 мин)
3. Создать GET /api/billing/transactions/status (20 мин)
4. Обновить PaywallModal для polling (20 мин)
5. Обновить SSOT документацию (20 мин)

**Итого:** ~175 минут (~3 часа)

**Результат:**
- ✅ Полное соответствие v4
- ✅ Unified purchase API
- ✅ Real-time payment status
- ⚠️ Старые endpoints можно deprecate

---

## 🤔 ВОПРОСЫ К ПОЛЬЗОВАТЕЛЮ

1. **Какой вариант выбрать?**
   - Вариант 1: Минимальные доработки (70 мин, backward compat)
   - Вариант 2: Полная миграция на v4 (3 часа, unified API)

2. **Обратная совместимость?**
   - Оставить `/api/billing/credits/*` endpoints?
   - Или полностью мигрировать на purchase-intent?

3. **Kaspi integration:**
   - У тебя есть Kaspi API credentials?
   - Или пока stub (return mock invoice_url)?

4. **Testing:**
   - Создать unit/integration tests (QA checklist from v4)?
   - Или только manual testing?

---

## 📝 SSOT ДОКУМЕНТЫ ДЛЯ ОБНОВЛЕНИЯ

После доработок нужно обновить:

1. **DATABASE.md**
   - Добавить billing_products таблицу
   - Обновить ERD

2. **BILLING_SYSTEM_ANALYSIS.md**
   - Обновить enforcement flow (если изменился)
   - Добавить новые endpoints

3. **ARCHITECTURE.md**
   - Ownership Map (новые repos/services если есть)

---

**END OF GAP ANALYSIS**

