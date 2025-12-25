# Billing Transactions Normalization Issues

## 🔍 Проблемы найденные:

### 1. **Денормализация валюты**

**Текущая схема (реальная БД):**
```sql
amount_kzt NUMERIC(10,2) NOT NULL,  -- ❌ Валюта в названии колонки
currency TEXT NOT NULL              -- ❌ Нет FK к справочнику
```

**Должно быть (DATABASE.md SSOT):**
```sql
amount NUMERIC(10,2) NOT NULL,
currency_code TEXT REFERENCES currencies(code)  -- ✅ FK к справочнику
```

**Проблемы:**
- ❌ Название `amount_kzt` hardcodes валюту → невозможно поддерживать другие валюты
- ❌ Колонка `currency` не имеет FK к таблице `currencies` → нет referential integrity
- ❌ Неконсистентно с `events` таблицей (там используется `currency_code` с FK)

---

### 2. **Несоответствие status enum**

**Реальная БД:**
```sql
status CHECK IN ('pending', 'paid', 'failed', 'refunded')
```

**DATABASE.md SSOT:**
```sql
status CHECK IN ('pending', 'completed', 'failed', 'refunded')
```

**Проблема:** `'paid'` vs `'completed'` - разные названия для одного статуса

---

### 3. **Несоответствие payment_method**

**DATABASE.md SSOT:**
```sql
payment_method TEXT  -- Nullable column
```

**Реальная БД:**
```sql
-- Колонка отсутствует! Вместо неё:
provider TEXT NOT NULL           -- Обязательная
provider_payment_id TEXT         -- Nullable
```

---

## 📊 Сравнение с другими таблицами:

### events (✅ правильно нормализовано):
```sql
price NUMERIC(10,2),
currency_code TEXT REFERENCES currencies(code)
```

### billing_products (✅ правильно):
```sql
price_kzt INTEGER NOT NULL  -- OK, потому что цены только в тенге
currency_code TEXT NOT NULL DEFAULT 'KZT'
```

### billing_transactions (❌ неконсистентно):
```sql
amount_kzt NUMERIC(10,2)  -- Плохо: валюта в названии
currency TEXT             -- Плохо: нет FK
```

---

## 🔧 Решение: Миграция нормализации

**Создана:** `20241226_normalize_billing_transactions.sql`

**Что делает:**
1. ✅ Добавляет `amount` (универсальная колонка)
2. ✅ Добавляет `currency_code` с FK к `currencies`
3. ✅ Мигрирует данные: `amount_kzt` → `amount`, `currency` → `currency_code`
4. ✅ Исправляет status: `'paid'` → `'completed'`
5. ✅ Сохраняет старые колонки для обратной совместимости (DEPRECATED)
6. ✅ Добавляет индекс на `currency_code`

**Обратная совместимость:**
- Старые колонки `amount_kzt`, `currency` остаются (помечены DEPRECATED)
- Новый код должен использовать `amount`, `currency_code`
- Будущая миграция может удалить старые колонки

---

## 📝 Обновить после миграции:

### 1. DATABASE.md
Отметить что таблица нормализована, старые колонки deprecated.

### 2. TypeScript types
```typescript
// src/lib/types/billing.ts
export interface BillingTransaction {
  amount: number;           // ✅ NEW
  currency_code: string;    // ✅ NEW
  // Deprecated (remove in v5):
  amount_kzt?: number;      // DEPRECATED
  currency?: string;        // DEPRECATED
}
```

### 3. Repositories
```typescript
// src/lib/db/billingTransactionsRepo.ts
// Use amount + currency_code instead of amount_kzt + currency
```

### 4. Tests
```typescript
// tests/integration/billing.v4.test.ts
{
  amount: 1000,          // ✅ NEW
  currency_code: 'KZT',  // ✅ NEW
  // amount_kzt: 1000,   // DEPRECATED
  // currency: 'KZT',    // DEPRECATED
}
```

---

## ⚠️ Важно:

**НЕ применять миграцию сразу!**

Сначала нужно:
1. Обновить весь код чтобы использовать новые колонки
2. Протестировать
3. Применить миграцию
4. Верифицировать что всё работает
5. Удалить старые колонки в будущей миграции (v5)

**Причина:** Это breaking change для существующего кода.

