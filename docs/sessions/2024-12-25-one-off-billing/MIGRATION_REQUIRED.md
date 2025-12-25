# 🚨 BILLING V4: КРИТИЧЕСКИЕ ДЕЙСТВИЯ ПЕРЕД ПРОДОЛЖЕНИЕМ

**Дата:** 26 декабря 2024  
**Статус:** Backend готов на 80%, требуется применение миграций

---

## ❗ ЧТО НУЖНО СДЕЛАТЬ СЕЙЧАС

### 1. Применить миграции в Supabase

**Миграции для применения:**
```bash
supabase/migrations/20241226_create_billing_products.sql
supabase/migrations/20241226_add_billing_credits_fk.sql
```

**Как применить:**
1. Открой Supabase Dashboard → SQL Editor
2. Скопируй содержимое `20241226_create_billing_products.sql`
3. Выполни SQL
4. Скопируй содержимое `20241226_add_billing_credits_fk.sql`
5. Выполни SQL

### 2. Регенерировать типы TypeScript

**После применения миграций:**
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/db/types.ts
```

**Что это даст:**
- Добавится таблица `billing_products` в типы
- Обновятся типы `billing_transactions` (если поля изменились)

### 3. Исправить мелкие ошибки TypeScript

После регенерации types.ts останутся мелкие ошибки:
- `@/lib/db/clubPlanRepo` - исправить импорт
- Duplicate `ProductCode` - удалить дубликат
- `createCredit` - проверить export

---

## 📊 ЧТО УЖЕ РЕАЛИЗОВАНО (backend)

### ✅ Database Migrations

1. **`20241226_create_billing_products.sql`**
   - Таблица `billing_products` (code, title, type, price_kzt, constraints)
   - Seed: `EVENT_UPGRADE_500` (1000 KZT, max 500 participants)
   - RLS policies (public read for active products)

2. **`20241226_add_billing_credits_fk.sql`**
   - Foreign key: `billing_credits.credit_code` → `billing_products.code`
   - Referential integrity

### ✅ TypeScript Types

**Файл:** `src/lib/types/billing.ts`
- `BillingProduct` interface
- `ProductType` enum
- `ProductCode` type (EVENT_UPGRADE_500, CLUB_*)

### ✅ Backend Repositories

1. **`src/lib/db/billingProductsRepo.ts`**
   - `getActiveProducts()` - публичный API
   - `getProductByCode()` - загрузка продукта
   - `isProductActive()` - проверка активности
   - `upsertProduct()`, `deactivateProduct()` - admin methods

### ✅ API Endpoints

1. **`GET /api/billing/products`**
   - Возвращает активные продукты (EVENT_UPGRADE_500)
   - Фронт получает цены динамически

2. **`POST /api/billing/purchase-intent`**
   - Унифицированный purchase flow (one-off + clubs)
   - Создаёт `billing_transactions(pending)`
   - Возвращает Kaspi payment info (stub)

3. **`GET /api/billing/transactions/status`**
   - Polling статуса транзакции
   - Query by transaction_id or transaction_reference

4. **`POST /api/dev/billing/settle`**
   - DEV ONLY - ручное завершение транзакции
   - Эмулирует Kaspi webhook
   - Создаёт credits при status=completed

### ✅ Business Logic Updates

**Файл:** `src/lib/services/accessControl.ts`
- `enforcePublish()` обновлён:
  - Загружает constraints из `billing_products` (no hardcode!)
  - Использует `oneOffMax` из БД
  - Использует `oneOffPrice` из БД

### ✅ Cleanup

- ❌ Удалены `/api/billing/credits/purchase`
- ❌ Удалены `/api/billing/credits/confirm`
- ✅ Только новые unified endpoints

---

## ⏳ ЧТО ОСТАЛОСЬ (после миграций)

### 1. Исправить TypeScript ошибки (10 мин)

После регенерации types.ts нужно:
- Исправить импорт `clubPlanRepo`
- Удалить duplicate `ProductCode`
- Проверить экспорты в `billingCreditsRepo`

### 2. Update Frontend (30 мин)

- PaywallModal: polling + unified purchase
- Удалить ссылки на старые endpoints

### 3. Integration Tests (45 мин)

Создать тесты по QA checklist:
- Publish within free → no credit consumed
- 409 → confirm → one credit consumed
- Concurrency (2 confirms)
- Personal >500 → only club option
- Idempotent publish
- Idempotent credit issuance

### 4. Update SSOT Docs (20 мин)

- DATABASE.md - billing_products таблица
- BILLING_SYSTEM_ANALYSIS.md - v4 flow
- ARCHITECTURE.md - новые endpoints

---

## 🎯 ИТОГО: Осталось ~2 часа работы

**После применения миграций:**
- 10 мин - fix TypeScript
- 30 мин - update frontend
- 45 мин - integration tests
- 20 мин - docs
- 15 мин - verification

**Total:** ~2 часа до полного соответствия v4 + Definition of Done

---

## 📝 СЛЕДУЮЩИЙ ШАГ

**СКАЖИ МНЕ КОГДА ПРИМЕНИШЬ МИГРАЦИИ И РЕГЕНЕРИШЬ ТИПЫ.**

Тогда я продолжу с исправлением TypeScript → Frontend → Tests → Docs → Verification.

---

**END OF INSTRUCTIONS**

