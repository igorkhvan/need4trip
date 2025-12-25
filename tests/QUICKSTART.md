# Быстрый старт — Запуск тестов Billing v4

**Цель:** Запустить integration tests для проверки Billing v4

**Текущая конфигурация:** Использует PRODUCTION Supabase ⚠️

---

## ⚡ Шаги (2 минуты)

### 1. Создать .env.test с продовыми ключами

```bash
# Скопировать из .env.local
cp .env.local .env.test

# Добавить NODE_ENV
echo "NODE_ENV=test" >> .env.test
echo "DISABLE_RATE_LIMIT=true" >> .env.test
```

**Или создать вручную:**
```bash
cat > .env.test << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=ваш-url-из-.env.local
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-key
SUPABASE_SERVICE_ROLE_KEY=ваш-service-role-key
NODE_ENV=test
DISABLE_RATE_LIMIT=true
EOF
```

### 2. Запустить тесты

```bash
# Только Billing v4 (рекомендуется для начала)
npm run test:billing

# Или все тесты
npm test

# Watch mode (авто-перезапуск)
npm run test:watch
```

---

## ⚠️ ВАЖНО: Тесты на продовой базе

**Что делают тесты:**
- ✅ Создают тестовые users, events, transactions
- ✅ Создают и потребляют credits
- ✅ НЕ удаляют существующие данные
- ⚠️ Оставляют тестовые данные в БД после выполнения

**Рекомендации:**
1. Запускайте в нерабочее время (меньше конфликтов)
2. После тестов можно вручную очистить:
   ```sql
   -- Удалить тестовые данные
   DELETE FROM billing_credits WHERE user_id LIKE 'test-%';
   DELETE FROM billing_transactions WHERE id IN (
     SELECT id FROM billing_transactions 
     WHERE created_at > NOW() - INTERVAL '1 hour'
     AND product_code = 'EVENT_UPGRADE_500'
   );
   ```
3. Или оставить как есть (не мешают продакшену)

---

## ✅ Ожидаемый результат (ALL PASS)

```
PASS tests/integration/billing.v4.test.ts
  Billing v4: Publish Enforcement
    ✓ publish within free limits does not consume credit
    ✓ credit confirmation flow consumes exactly one credit
    ✓ concurrent publish confirms consume only one credit
    ✓ personal event >500 participants requires club
    ✓ republish does not consume additional credit
    ✓ duplicate transaction does not issue duplicate credit
  Billing v4: billing_products SSOT
    ✓ enforcePublish uses billing_products constraints
    ✓ PaywallError contains price from billing_products

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Time:        3.456s
```

---

## 🔧 Troubleshooting

### Ошибка: "Cannot connect to Supabase"

**Решение:** Проверь .env.test
```bash
# Убедись что URL и ключи правильные
cat .env.test | grep SUPABASE

# Должно быть:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Ошибка: "EVENT_UPGRADE_500 not found"

**Решение:** Миграция не применилась
```bash
# Проверь что миграция есть в продовой базе
# Supabase Dashboard → Database → Migrations
# Должна быть: 20241226_create_billing_products.sql
```

### Ошибка: "Insufficient permissions"

**Решение:** Неправильный service role key
```bash
# Убедись что используешь SERVICE ROLE key, а не ANON key
# Найди в Supabase Dashboard → Settings → API
```

---

## 🧹 После тестов

**Тесты оставляют тестовые данные.** Можно:

**Вариант 1: Оставить как есть** (не мешают продакшену)

**Вариант 2: Очистить вручную**
```sql
-- В Supabase SQL Editor
DELETE FROM billing_credits 
WHERE user_id IN (
  SELECT id FROM users WHERE telegram_id LIKE 'test-%'
);

DELETE FROM billing_transactions 
WHERE created_at > NOW() - INTERVAL '1 hour'
AND product_code = 'EVENT_UPGRADE_500';
```

---

## 📊 Что тестируется

**Файл:** `tests/integration/billing.v4.test.ts`

**8 критических сценариев:**
1. Free events не списывают credits
2. Credit confirmation flow (409 → confirm → consume)
3. Race condition безопасность (concurrent confirms)
4. Events >500 participants → club required
5. Idempotent publish
6. Idempotent credit issuance
7. enforcePublish читает constraints из billing_products
8. PaywallError содержит price из БД (no hardcode)

---

**Подробная документация:** `tests/README.md`

