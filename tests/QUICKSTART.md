# Быстрый старт — Запуск тестов Billing v4

**Цель:** Запустить integration tests для проверки Billing v4

---

## ⚡ Шаги (5 минут)

### 1. Запустить локальный Supabase

```bash
cd /Users/igorkhvan/Git/need4trip
supabase start
```

**Что происходит:**
- Запускается PostgreSQL в Docker
- Применяются все миграции из `supabase/migrations/`
- Создаётся база с тестовыми данными (EVENT_UPGRADE_500)

**Вывод будет содержать:**
```
API URL: http://localhost:54321
anon key: eyJhbGci...
service_role key: eyJhbGci...
```

### 2. Создать .env.test (если нет)

```bash
# Скопировать пример
cp .env.test.example .env.test

# Или создать вручную:
cat > .env.test << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NODE_ENV=test
DISABLE_RATE_LIMIT=true
EOF
```

### 3. Запустить тесты

```bash
# Все тесты
npm test

# Только Billing v4
npm run test:billing

# Watch mode (авто-перезапуск)
npm run test:watch
```

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

**Решение:**
```bash
# Проверить статус
supabase status

# Если не запущен
supabase start

# Если порт занят
supabase stop
supabase start
```

### Ошибка: "EVENT_UPGRADE_500 not found"

**Решение:** Миграция не применилась
```bash
# Сбросить БД и применить все миграции
supabase db reset
```

### Ошибка: "Table events not found"

**Решение:** База не инициализирована
```bash
# Полный reset
supabase stop
supabase start
```

---

## 🧹 После тестов

```bash
# Остановить Supabase (данные сохраняются)
supabase stop

# Или полная очистка
supabase stop --no-backup
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

