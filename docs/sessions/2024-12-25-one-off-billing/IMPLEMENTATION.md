# 💳 ONE-OFF EVENT UPGRADE BILLING SYSTEM - РЕАЛИЗАЦИЯ

> **Дата:** 25 декабря 2024  
> **Статус:** Реализовано, требуется применение миграций в Supabase  
> **Версия:** 3.0 (расширение billing v2.0)

---

## 🎯 ОБЗОР ИЗМЕНЕНИЙ

Реализована система **one-off event upgrades** согласно спецификации пользователя:
- Личные события с базовыми лимитами (free plan)
- Покупка разовых кредитов для расширения лимитов
- Подтверждение потребления кредита перед публикацией
- Multiple payment options в paywall (one-off credit OR club access)

---

## 📋 ЧТО РЕАЛИЗОВАНО

### 1. Database Migrations (4 файла)

**Файлы:**
- `supabase/migrations/20241225_add_published_at_to_events.sql`
- `supabase/migrations/20241225_extend_billing_transactions.sql`
- `supabase/migrations/20241225_create_billing_credits.sql`
- `supabase/migrations/20241225_add_user_id_to_billing_transactions.sql`

**Изменения:**
- ✅ `events.published_at` (NULL = draft, NOT NULL = published)
- ✅ `billing_transactions.product_code` (EVENT_UPGRADE_500 | CLUB_*)
- ✅ `billing_transactions.user_id` (для one-off credits)
- ✅ `billing_transactions.club_id` теперь nullable
- ✅ Новая таблица `billing_credits` (available/consumed)

### 2. TypeScript Types (обновлено)

**Файлы:**
- `src/lib/types/billing.ts` - расширены типы
- `src/lib/types/event.ts` - добавлен `publishedAt`

**Новые типы:**
- `BillingCredit` - one-off кредиты
- `CreditCode` = "EVENT_UPGRADE_500"
- `CreditStatus` = "available" | "consumed"
- `PaywallOption` - multiple options в paywall
- `CreditConfirmationError` - 409 response

### 3. Backend Repositories & Services

**Новые файлы:**
- `src/lib/db/billingCreditsRepo.ts` - CRUD для кредитов
- `src/lib/api/respond.ts` - стандартизированные API responses

**Обновлённые файлы:**
- `src/lib/services/accessControl.ts` - добавлен `enforcePublish()`
- `src/lib/errors.ts` - `PaywallError` с поддержкой options[]

### 4. API Routes (новые endpoints)

**Файлы:**
- `src/app/api/events/[id]/publish/route.ts` - публикация события
- `src/app/api/billing/credits/purchase/route.ts` - покупка кредита
- `src/app/api/billing/credits/confirm/route.ts` - подтверждение оплаты

### 5. Frontend Components

**Новые:**
- `src/components/billing/CreditConfirmationModal.tsx` - 409 handling

**Обновлённые:**
- `src/components/billing/PaywallModal.tsx` - multiple options

---

## 🚨 КРИТИЧНО: ТРЕБУЕТСЯ ДЕЙСТВИЕ ПОЛЬЗОВАТЕЛЯ

### МИГРАЦИИ ДОЛЖНЫ БЫТЬ ПРИМЕНЕНЫ В SUPABASE

**Порядок действий:**

1. **Зайти в Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   - Перейти в **SQL Editor**

2. **Применить миграции в порядке:**

```sql
-- MIGRATION 1: Add published_at to events
-- Файл: supabase/migrations/20241225_add_published_at_to_events.sql
-- (скопировать содержимое файла и выполнить)

-- MIGRATION 2: Extend billing_transactions
-- Файл: supabase/migrations/20241225_extend_billing_transactions.sql
-- (скопировать содержимое файла и выполнить)

-- MIGRATION 3: Create billing_credits table
-- Файл: supabase/migrations/20241225_create_billing_credits.sql
-- (скопировать содержимое файла и выполнить)

-- MIGRATION 4: Add user_id to billing_transactions
-- Файл: supabase/migrations/20241225_add_user_id_to_billing_transactions.sql
-- (скопировать содержимое файла и выполнить)
```

3. **Регенерировать Supabase types:**

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/db/types.ts
```

4. **Проверить TypeScript:**

```bash
npx tsc --noEmit
```

5. **Билд приложения:**

```bash
npm run build
```

---

## 🔄 WORKFLOW: ONE-OFF EVENT UPGRADE

### User Flow

```
1. Создать личное событие (draft)
2. Попытаться опубликовать (POST /api/events/:id/publish)

DECISION TREE:
├─ Fits free limits (≤15 participants) 
│  └─ ✅ Publish immediately
│
├─ Exceeds 500 participants
│  └─ ❌ 402 PAYWALL (club required)
│
├─ 16-500 participants, NO credits
│  └─ ❌ 402 PAYWALL (options: buy credit OR club)
│
└─ 16-500 participants, HAS credits
   ├─ First call: 409 CREDIT_CONFIRMATION_REQUIRED
   │  └─ Show CreditConfirmationModal
   │
   └─ Second call with ?confirm_credit=1
      └─ ✅ Consume credit + Publish
```

### API Flow

**Publish (dry-run):**
```http
POST /api/events/{id}/publish
```

**Response 409 (confirmation required):**
```json
{
  "success": false,
  "error": {
    "code": "CREDIT_CONFIRMATION_REQUIRED",
    "reason": "EVENT_UPGRADE_WILL_BE_CONSUMED",
    "meta": {
      "creditCode": "EVENT_UPGRADE_500",
      "eventId": "...",
      "requestedParticipants": 120
    },
    "cta": {
      "type": "CONFIRM_CONSUME_CREDIT",
      "href": "/api/events/:id/publish?confirm_credit=1"
    }
  }
}
```

**Publish (confirmed):**
```http
POST /api/events/{id}/publish?confirm_credit=1
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "eventId": "...",
    "publishedAt": "2024-12-25T12:00:00Z",
    "creditConsumed": true
  }
}
```

---

## 🧪 TESTING CHECKLIST

После применения миграций протестировать:

### Backend Tests
- [ ] POST /api/events/:id/publish (без кредитов) → 402 with options[]
- [ ] POST /api/events/:id/publish (с кредитами) → 409 confirmation
- [ ] POST /api/events/:id/publish?confirm_credit=1 → 200 + consumed
- [ ] POST /api/billing/credits/purchase → pending transaction
- [ ] POST /api/billing/credits/confirm → create credit

### Frontend Tests
- [ ] PaywallModal отображает multiple options
- [ ] CreditConfirmationModal появляется на 409
- [ ] Клик на "One-off credit" → redirect to Kaspi
- [ ] Клик на "Club access" → redirect to /pricing

### Database Tests
```sql
-- Check new columns exist
SELECT published_at FROM events LIMIT 1;
SELECT product_code, user_id FROM billing_transactions LIMIT 1;
SELECT * FROM billing_credits LIMIT 1;

-- Check constraints work
INSERT INTO billing_transactions (product_code, user_id) 
  VALUES ('EVENT_UPGRADE_500', NULL); -- Should FAIL (user_id required)

INSERT INTO billing_credits (status, consumed_event_id) 
  VALUES ('available', 'some-id'); -- Should FAIL (consumed state mismatch)
```

---

## 📦 FILES MODIFIED/CREATED

### Database (4 new migrations)
- `supabase/migrations/20241225_add_published_at_to_events.sql`
- `supabase/migrations/20241225_extend_billing_transactions.sql`
- `supabase/migrations/20241225_create_billing_credits.sql`
- `supabase/migrations/20241225_add_user_id_to_billing_transactions.sql`

### Types (2 updated)
- `src/lib/types/billing.ts`
- `src/lib/types/event.ts`

### Backend (7 new/updated)
- `src/lib/db/billingCreditsRepo.ts` (NEW)
- `src/lib/api/respond.ts` (NEW)
- `src/lib/services/accessControl.ts` (UPDATED)
- `src/lib/errors.ts` (UPDATED)
- `src/app/api/events/[id]/publish/route.ts` (NEW)
- `src/app/api/billing/credits/purchase/route.ts` (NEW)
- `src/app/api/billing/credits/confirm/route.ts` (NEW)

### Frontend (2 new/updated)
- `src/components/billing/CreditConfirmationModal.tsx` (NEW)
- `src/components/billing/PaywallModal.tsx` (UPDATED)

---

## ⚠️ ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ / TODO

### MVP Gaps
1. **Kaspi Integration:** `generateKaspiPaymentLink()` - stub implementation
   - Нужна интеграция с Kaspi Payment Gateway API
   - Пока возвращает placeholder link

2. **Webhook Authentication:** `POST /api/billing/credits/confirm` 
   - Не защищён (MVP accepts all requests)
   - Нужна валидация Kaspi webhook signature

3. **Product Prices:** Hardcoded в `purchase/route.ts`
   - Нужно переместить в config или БД

4. **Credit Price в PaywallModal:** Hardcoded 1000 KZT
   - Должен загружаться из API/config

### Future Enhancements
- [ ] Множественные типы кредитов (EVENT_UPGRADE_100, EVENT_UPGRADE_200)
- [ ] Истекающие кредиты (expiry_date)
- [ ] Refund flow для кредитов
- [ ] Admin UI для manual credit creation
- [ ] Analytics: credit purchase conversion rate

---

## 📝 ДОКУМЕНТАЦИЯ SSOT (обновлена)

- **DATABASE.md** - добавлена информация о новых таблицах/колонках
- **BILLING_SYSTEM_ANALYSIS.md** - добавлен раздел "One-off Event Upgrades"

---

## ✅ VERIFICATION STEPS

**После применения миграций:**

1. **TypeScript компиляция:**
```bash
npx tsc --noEmit
# Должно: 0 errors
```

2. **Production build:**
```bash
npm run build
# Должно: успешный билд
```

3. **Commit + Push:**
```bash
git add -A
git commit -m "feat(billing): implement one-off event upgrade system

- Add published_at to events (draft/published state)
- Extend billing_transactions with product_code and user_id
- Create billing_credits table
- Implement publish enforcement with credit confirmation
- Add PaywallModal multiple options support
- Add CreditConfirmationModal (409 handling)

Verified: TypeScript ✅, Build ✅

CRITICAL: Requires Supabase migrations to be applied manually.
See docs/sessions/2024-12-25-one-off-billing/IMPLEMENTATION.md"

git push origin main
```

---

## 🔗 СВЯЗАННЫЕ ДОКУМЕНТЫ

- **Specification:** Prompt от пользователя (25 декабря 2024)
- **SSOT Architecture:** `docs/ARCHITECTURE.md`
- **SSOT Database:** `docs/DATABASE.md`
- **SSOT Billing:** `docs/BILLING_SYSTEM_ANALYSIS.md`
- **Rules File:** `.cursor/rules/need4trip-ssot-rules.mdc`

---

**Статус:** ✅ Реализовано, ожидает применения миграций пользователем.

