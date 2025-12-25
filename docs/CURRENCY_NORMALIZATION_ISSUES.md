# Currency Normalization Issues (Need4Trip)

**Date**: 2024-12-26  
**Status**: 🔴 P1 - Architectural inconsistency

---

## 🎯 Проблема

Множество полей и переменных содержат `Kzt` в названии, что нарушает принцип currency-independent архитектуры.

**Почему это важно:**
- Хардкодинг валюты в названиях полей
- Невозможно поддерживать мультивалютность
- Несоответствие с нормализованной `billing_transactions` (amount + currency_code)

---

## 📊 Найденные инстансы

### 1. Database Schema (Supabase)

#### `billing_products` table:
```sql
price_kzt NUMERIC(10,2)  -- ❌ RENAME TO: price
```

#### `club_plans` table:
```sql
price_monthly_kzt NUMERIC(10,2)  -- ❌ RENAME TO: price_monthly
```

**Решение**: Добавить `currency_code` колонку с FK к `currencies`, как в `billing_transactions`.

---

### 2. TypeScript Types (`src/lib/db/types.ts`)

Generated types from Supabase:
```typescript
billing_products.price_kzt: number         // ❌
club_plans.price_monthly_kzt: number       // ❌
```

**Решение**: Регенерировать после миграции БД.

---

### 3. Domain Types (`src/lib/types/billing.ts`)

```typescript
// ❌ BillingProduct
priceKzt: z.number().positive()

// ❌ ClubPlan
priceMonthlyKzt: number

// ❌ PaywallCreditOption
priceKzt: number
```

**Решение**:
```typescript
// ✅ Generic + currency
price: number
currencyCode: string  // 'KZT', 'USD', etc.
```

---

### 4. Repository Layer

#### `src/lib/db/billingProductsRepo.ts`:
```typescript
priceKzt: Number(db.price_kzt)  // ❌ mapper
price_kzt: product.priceKzt     // ❌ insert
```

#### `src/lib/db/planRepo.ts`:
```typescript
priceMonthlyKzt: Number(db.price_monthly_kzt)  // ❌ mapper
```

**Решение**: Переименовать в `price` / `priceMonthly` + добавить `currencyCode`.

---

### 5. API Routes

#### `src/app/api/billing/purchase-intent/route.ts`:
```typescript
amount = product.priceKzt * quantity;  // ❌
amount = plan.priceMonthlyKzt;         // ❌
```

**Решение**: Использовать `product.price` / `plan.priceMonthly`.

---

### 6. Business Logic

#### `src/lib/services/accessControl.ts`:
```typescript
const oneOffPrice = oneOffProduct.priceKzt;  // ❌
priceKzt: oneOffPrice                        // ❌ в PaywallError
```

**Решение**: Generic `price` field.

---

### 7. Frontend Components

#### `src/components/billing/paywall-modal.tsx`:
```typescript
{option.priceKzt} ₸  // ❌ Hardcoded currency symbol
```

**Решение**:
```typescript
{formatCurrency(option.price, option.currencyCode)}
```

#### `src/app/(app)/pricing/page.tsx`:
```typescript
{plan.priceMonthlyKzt.toLocaleString()} ₸  // ❌
```

---

## 🎯 Recommended Solution

### Phase 1: Database Schema (P1)

**Migration 1: Normalize `billing_products`**
```sql
-- Add normalized columns
ALTER TABLE billing_products 
  ADD COLUMN price NUMERIC(10,2),
  ADD COLUMN currency_code TEXT REFERENCES currencies(code);

-- Migrate data
UPDATE billing_products SET 
  price = price_kzt, 
  currency_code = 'KZT';

-- Make NOT NULL
ALTER TABLE billing_products 
  ALTER COLUMN price SET NOT NULL,
  ALTER COLUMN currency_code SET NOT NULL,
  ALTER COLUMN currency_code SET DEFAULT 'KZT';

-- Drop old column
ALTER TABLE billing_products DROP COLUMN price_kzt;
```

**Migration 2: Normalize `club_plans`**
```sql
-- Add normalized columns
ALTER TABLE club_plans 
  ADD COLUMN price_monthly NUMERIC(10,2),
  ADD COLUMN currency_code TEXT REFERENCES currencies(code);

-- Migrate data
UPDATE club_plans SET 
  price_monthly = price_monthly_kzt, 
  currency_code = 'KZT';

-- Make NOT NULL
ALTER TABLE club_plans 
  ALTER COLUMN price_monthly SET NOT NULL,
  ALTER COLUMN currency_code SET NOT NULL,
  ALTER COLUMN currency_code SET DEFAULT 'KZT';

-- Drop old column
ALTER TABLE club_plans DROP COLUMN price_monthly_kzt;
```

---

### Phase 2: Application Code (P1)

**Order:**
1. Update domain types (`src/lib/types/billing.ts`)
2. Update repositories (`billingProductsRepo.ts`, `planRepo.ts`)
3. Update services (`accessControl.ts`)
4. Update API routes (`purchase-intent`, `publish`)
5. Update frontend components (`paywall-modal.tsx`, `pricing/page.tsx`)
6. Regenerate Supabase types

---

### Phase 3: Utility Functions (P2)

Create `src/lib/utils/currency.ts`:
```typescript
export function formatCurrency(amount: number, currencyCode: string): string {
  const symbols: Record<string, string> = {
    KZT: '₸',
    USD: '$',
    EUR: '€',
    RUB: '₽',
  };
  
  return `${amount.toLocaleString()} ${symbols[currencyCode] || currencyCode}`;
}
```

---

## ✅ Definition of Done

- [ ] `billing_products.price_kzt` → `price` + `currency_code` FK
- [ ] `club_plans.price_monthly_kzt` → `price_monthly` + `currency_code` FK
- [ ] Domain types updated (no `Kzt` suffixes)
- [ ] Repositories updated
- [ ] Services updated
- [ ] API routes updated
- [ ] Frontend components use `formatCurrency()`
- [ ] All tests pass (8/8)
- [ ] TypeScript strict mode passes
- [ ] `docs/DATABASE.md` updated

---

## 🔗 Related

- ✅ `billing_transactions` already normalized (2024-12-26)
- 🔴 `billing_products` needs normalization
- 🔴 `club_plans` needs normalization
- Pattern: Same as `billing_transactions` (generic field + FK)

---

## 📝 Notes

**Consistency principle:**
- Database: `price`, `currency_code` (snake_case)
- TypeScript: `price`, `currencyCode` (camelCase)
- Always store amount as generic number + currency reference

**Why not computed columns?**
- Future: different currencies for different products
- Explicit currency per transaction = audit trail
- Matches industry best practices (Stripe, etc.)

