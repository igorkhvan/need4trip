# Need4Trip Billing System — Testing Documentation (SSOT)

> **Single Source of Truth для тестирования биллинговой системы**  
> Последнее обновление: 2024-12-26  
> Статус: ✅ Production Ready (8/8 tests PASS)

---

## 📋 Содержание

1. [Обзор тестирования](#обзор-тестирования)
2. [Набор тестов](#набор-тестов)
3. [Результаты выполнения](#результаты-выполнения)
4. [Конфигурация тестирования](#конфигурация-тестирования)
5. [Способ проведения тестов](#способ-проведения-тестов)
6. [Continuous Testing](#continuous-testing)

---

## 🎯 Обзор тестирования

### Цель

Автоматизированная проверка критических путей Billing v4 системы:
- Publish enforcement логика
- One-off credits lifecycle
- Idempotency & race conditions
- SSOT для pricing (billing_products)

### Тип тестов

**Integration Tests** — полнофункциональные тесты с реальной БД:
- ✅ Используют production Supabase
- ✅ Тестируют все слои (Repository → Service → API)
- ✅ Проверяют FK constraints, RLS, triggers
- ✅ Реальные race conditions и concurrency

### Покрытие

**8 критических сценариев** (QA 1-8):
- Publish enforcement (6 tests)
- SSOT verification (2 tests)

**Время выполнения**: ~24-25 секунд

---

## 🧪 Набор тестов

### Test Suite 1: Billing v4 — Publish Enforcement

#### QA-1: Free Limits (No Credit Consumption)

**Файл**: `tests/integration/billing.v4.test.ts:96-123`

**Цель**: Убедиться что события в рамках free лимитов публикуются БЕЗ потребления кредитов.

**Сценарий**:
```typescript
Given: User has available credit (EVENT_UPGRADE_500)
When: Publish event with ≤15 participants (within free)
Then: 
  ✅ Publish allowed immediately
  ✅ decision.willConsumeCredit = undefined
  ✅ Credit status = 'available' (NOT consumed)
```

**Проверяет**:
- Decision tree: Branch A (free limits)
- No side effects на credits
- Корректное определение free лимита

**Результат**: ✅ PASS (3529 ms)

---

#### QA-2: Credit Confirmation Flow

**Файл**: `tests/integration/billing.v4.test.ts:128-172`

**Цель**: Проверить полный цикл 409 → confirm → credit consumed.

**Сценарий**:
```typescript
Given: User has credit, event exceeds free (100 participants)
When: First attempt (confirmCredit=false)
Then: 
  ✅ decision.allowed = false
  ✅ decision.requiresCreditConfirmation = true

When: Second attempt (confirmCredit=true)
Then:
  ✅ decision.allowed = true
  ✅ decision.willConsumeCredit = true
  
When: consumeCredit() called
Then:
  ✅ Exactly ONE credit consumed
  ✅ credit.status = 'consumed'
  ✅ credit.consumed_event_id = testEventId
```

**Проверяет**:
- Decision tree: Branch D (credit confirmation required)
- Two-step confirmation flow
- Credit lifecycle: available → consumed
- Atomic credit consumption

**Результат**: ✅ PASS (5375 ms)

---

#### QA-3: Concurrent Credit Consumption (Race Condition)

**Файл**: `tests/integration/billing.v4.test.ts:179-228`

**Цель**: Убедиться что только ОДИН кредит потребляется при concurrent requests.

**Сценарий**:
```typescript
Given: User has ONE credit
When: TWO concurrent publish requests (Promise.all)
Then:
  ✅ At least one request succeeds
  ✅ ONLY ONE credit consumed (no double-spend)
  ✅ UNIQUE constraint on source_transaction_id prevents duplicates
```

**Проверяет**:
- Race condition protection
- Idempotency via unique constraints
- Database-level concurrency safety
- **NOTE**: Current implementation lacks FOR UPDATE lock (P1 task)

**Результат**: ✅ PASS (4539 ms)

**Known Limitation**: 
- Both requests may succeed, but only ONE credit actually consumed
- P1 task: Add FOR UPDATE lock via RPC for better concurrency control

---

#### QA-4: Personal Event >500 Requires Club

**Файл**: `tests/integration/billing.v4.test.ts:233-257`

**Цель**: Проверить что события >500 участников требуют club (one-off не подходит).

**Сценарий**:
```typescript
Given: Event with 600 participants (exceeds one-off limit)
When: enforcePublish() called
Then:
  ✅ Throws PaywallError
  ✅ reason = 'CLUB_REQUIRED_FOR_LARGE_EVENT'
  ✅ options contains ONLY 'CLUB_ACCESS'
  ✅ options does NOT contain 'ONE_OFF_CREDIT'
```

**Проверяет**:
- Decision tree: Branch B (exceeds one-off max)
- Correct paywall options
- Dynamic limits from billing_products

**Результат**: ✅ PASS (1676 ms)

---

#### QA-5: Idempotent Republish

**Файл**: `tests/integration/billing.v4.test.ts:262-305`

**Цель**: Убедиться что повторный publish НЕ потребляет дополнительный кредит.

**Сценарий**:
```typescript
Given: Event already published with credit consumed
When: API route checks events.published_at
Then:
  ✅ published_at IS NOT NULL → return 200 OK immediately
  ✅ enforcePublish() NOT called again
  ✅ Still ONLY ONE consumed credit (no additional consumption)
```

**Проверяет**:
- API route idempotency check
- Published state tracking (events.published_at)
- No double consumption on republish

**Результат**: ✅ PASS (4968 ms)

---

#### QA-6: Idempotent Credit Issuance

**Файл**: `tests/integration/billing.v4.test.ts:310-349`

**Цель**: Проверить что duplicate transaction НЕ выдаёт duplicate credit.

**Сценарий**:
```typescript
Given: Billing transaction with ID = txId
When: createBillingCredit(sourceTransactionId=txId) called TWICE
Then:
  ✅ First call succeeds
  ✅ Second call FAILS (UNIQUE constraint violation)
  ✅ Exactly ONE credit issued per transaction
```

**Проверяет**:
- Idempotency via source_transaction_id UNIQUE constraint
- Protection against webhook replays
- Database-level duplicate prevention

**Результат**: ✅ PASS (3078 ms)

---

### Test Suite 2: Billing v4 — SSOT Verification

#### QA-7: billing_products Constraints in enforcePublish

**Файл**: `tests/integration/billing.v4.test.ts:356-367`

**Цель**: Убедиться что enforcePublish использует constraints из billing_products.

**Сценарий**:
```typescript
Given: billing_products table seeded with EVENT_UPGRADE_500
When: getProductByCode('EVENT_UPGRADE_500') called
Then:
  ✅ product.price = 1000 (normalized)
  ✅ product.currencyCode = 'KZT'
  ✅ product.constraints.max_participants = 500
  
When: enforcePublish() called
Then:
  ✅ Uses these dynamic constraints (verified in QA-4)
```

**Проверяет**:
- SSOT pattern: No hardcoded values
- Dynamic constraint loading
- Currency normalization in types

**Результат**: ✅ PASS (484 ms)

---

#### QA-8: PaywallError Contains Price from DB

**Файл**: `tests/integration/billing.v4.test.ts:372-391`

**Цель**: Проверить что PaywallError содержит цены из billing_products (не hardcoded).

**Сценарий**:
```typescript
Given: User without credit, event exceeds free
When: enforcePublish() throws PaywallError
Then:
  ✅ error.options[0].type = 'ONE_OFF_CREDIT'
  ✅ error.options[0].price = 1000 (from DB, NOT hardcoded)
  ✅ error.options[0].currencyCode = 'KZT' (normalized)
```

**Проверяет**:
- SSOT for pricing: All prices from billing_products
- No hardcoded values in error responses
- Currency normalization in PaywallError

**Результат**: ✅ PASS (871 ms)

---

## 📊 Результаты выполнения

### Summary

```
Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        24.669 s
```

### Детальные результаты

| Test | Status | Time | Coverage |
|------|--------|------|----------|
| QA-1: Free limits | ✅ PASS | 3529 ms | Decision A, no credit consumption |
| QA-2: Credit confirmation | ✅ PASS | 5375 ms | Decision D, full lifecycle |
| QA-3: Concurrent consumption | ✅ PASS | 4539 ms | Race condition, idempotency |
| QA-4: >500 requires club | ✅ PASS | 1676 ms | Decision B, paywall options |
| QA-5: Republish idempotency | ✅ PASS | 4968 ms | API route, published_at check |
| QA-6: Credit issuance idempotency | ✅ PASS | 3078 ms | UNIQUE constraint, webhooks |
| QA-7: SSOT constraints | ✅ PASS | 484 ms | billing_products usage |
| QA-8: SSOT pricing | ✅ PASS | 871 ms | No hardcoded prices |

**Total**: 8/8 PASS ✅

### Performance

- **Fastest test**: QA-7 (484 ms)
- **Slowest test**: QA-2 (5375 ms)
- **Average**: ~3065 ms per test
- **Total suite**: ~24-25 seconds

### Code Coverage

**Tested modules**:
- ✅ `src/lib/services/accessControl.ts` (enforcePublish)
- ✅ `src/lib/db/billingCreditsRepo.ts` (createBillingCredit, consumeCredit)
- ✅ `src/lib/db/billingProductsRepo.ts` (getProductByCode)
- ✅ Database constraints (UNIQUE, FK, CHECK)
- ✅ Race conditions & concurrency

**Not covered** (requires manual QA or E2E):
- Frontend components (PaywallModal, CreditConfirmationModal)
- API routes (`/api/events/:id/publish`, `/api/billing/*`)
- Webhook handlers (payment provider integration)

---

## ⚙️ Конфигурация тестирования

### Environment

**Test Database**: Production Supabase (временно, до создания test project)

**Configuration files**:
- `.env.test` — test environment variables
- `jest.config.js` — Jest configuration
- `jest.setup.js` — test environment setup
- `tsconfig.json` — TypeScript paths resolution

### Environment Variables

```bash
# .env.test (example)
NEXT_PUBLIC_SUPABASE_URL=https://djbqwsipllhdydshuokg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Required for admin operations
```

**Validation**: `jest.setup.js` validates required keys on startup.

### Jest Configuration

**File**: `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],
};
```

**Key settings**:
- `preset: 'ts-jest'` — TypeScript support
- `testEnvironment: 'node'` — Node.js runtime (not browser)
- `moduleNameMapper` — resolve `@/` imports
- `setupFilesAfterEnv` — load `.env.test` before tests

### Test Helpers

**File**: `tests/integration/billing.v4.test.ts:18-41`

```typescript
async function createTestCredit(userId: string) {
  const db = getAdminDb();
  const transactionId = randomUUID();
  
  // 1. Create billing_transaction (normalized schema)
  await db.from('billing_transactions').insert({
    id: transactionId,
    user_id: userId,
    product_code: 'EVENT_UPGRADE_500',
    amount: 1000,
    currency_code: 'KZT',
    status: 'completed',
    provider: 'test',
  });
  
  // 2. Issue credit (links to transaction)
  return await createBillingCredit({
    userId,
    creditCode: 'EVENT_UPGRADE_500',
    sourceTransactionId: transactionId,
  });
}
```

**Purpose**: Simplify test setup, satisfy FK constraints, ensure data consistency.

### Test Data Setup

**beforeEach hook** (runs before each test):

1. **Create test user** (satisfies FK constraints)
   ```typescript
   testUserId = randomUUID();
   await db.from('users').insert({
     id: testUserId,
     name: 'Test User',
     telegram_id: `test-${testUserId}`,
   });
   ```

2. **Create test event** (required for consumed_event_id FK)
   ```typescript
   testEventId = randomUUID();
   await db.from('events').insert({
     id: testEventId,
     title: 'Test Event',
     created_by_user_id: testUserId,
     city_id: cityId, // Fetched from DB
     // ... other required fields
   });
   ```

**Result**: Clean state for each test, no data pollution.

---

## 🚀 Способ проведения тестов

### Prerequisites

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup test environment**:
   ```bash
   cp .env.local .env.test
   # Edit .env.test, ensure SUPABASE_SERVICE_ROLE_KEY is set
   ```

3. **Apply migrations** (if using local Supabase):
   ```bash
   supabase db push
   ```

4. **Seed test data**:
   - Ensure `cities` table has at least one row
   - Ensure `currencies` table seeded (KZT, USD, etc.)
   - Ensure `billing_products` seeded (EVENT_UPGRADE_500)
   - Ensure `club_plans` seeded (free, club_50, etc.)

### Running Tests

#### Run all tests:
```bash
npm test
```

#### Run specific file:
```bash
npm test -- billing.v4.test.ts
```

#### Run with verbose output:
```bash
npm test -- --verbose
```

#### Watch mode (for development):
```bash
npm test -- --watch
```

### CI/CD Integration

**Recommended setup** (not yet configured):

1. **GitHub Actions workflow**:
   ```yaml
   - name: Run integration tests
     run: npm test
     env:
       NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
       SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SERVICE_ROLE_KEY }}
   ```

2. **Pre-commit hook** (optional):
   ```bash
   npx husky add .husky/pre-commit "npm test"
   ```

3. **PR checks**: Require tests PASS before merge

### Debugging Failed Tests

1. **Check test output**:
   ```bash
   npm test -- --verbose
   ```

2. **Inspect database state**:
   - Use `tests/verify-schema.js` to check schema
   - Query tables directly in Supabase SQL Editor

3. **Common issues**:
   - **Missing SUPABASE_SERVICE_ROLE_KEY**: Check `.env.test`
   - **Schema mismatch**: Apply missing migrations
   - **PostgREST cache**: Run `NOTIFY pgrst, 'reload schema';`
   - **FK violations**: Ensure seed data present

4. **Isolate failing test**:
   ```bash
   npm test -- -t "test name pattern"
   ```

---

## 🔄 Continuous Testing

### Test Maintenance

**After schema changes**:
1. ✅ Update test helpers if FK constraints change
2. ✅ Regenerate types: `supabase gen types typescript`
3. ✅ Update test assertions if business logic changes
4. ✅ Run full test suite: `npm test`

**After adding new features**:
1. ✅ Write integration tests for critical paths
2. ✅ Follow existing test patterns (QA-1 to QA-8 style)
3. ✅ Document test in this SSOT
4. ✅ Ensure tests are idempotent and isolated

### Test Quality Guidelines

**DO**:
- ✅ Use descriptive test names (what is tested, not how)
- ✅ Follow AAA pattern: Arrange, Act, Assert
- ✅ Test one concern per test
- ✅ Use real database (integration tests)
- ✅ Clean up test data in `beforeEach`
- ✅ Verify side effects (credit status, published_at, etc.)

**DON'T**:
- ❌ Mock database in integration tests
- ❌ Share state between tests
- ❌ Use hardcoded IDs (use randomUUID())
- ❌ Skip FK constraint checks
- ❌ Assume test execution order

### Future Improvements

**P1** (High Priority):
- [ ] Separate test Supabase project (don't use production)
- [ ] Add FOR UPDATE lock test (after RPC implementation)
- [ ] E2E tests for frontend flows (Playwright)
- [ ] Test /api/dev/billing/settle endpoint

**P2** (Nice to have):
- [ ] Test coverage reporting (Jest coverage)
- [ ] Performance benchmarks (baseline times)
- [ ] Load testing (concurrent requests at scale)
- [ ] Webhook integration tests (mock payment provider)

---

## 📚 Related Documentation

- **Billing Spec**: `docs/BILLING_SYSTEM_ANALYSIS.md`
- **Database Schema**: `docs/DATABASE.md`
- **Audit Report**: `docs/sessions/2024-12-26-billing-v4-audit/BILLING_V4_EXHAUSTIVE_AUDIT_REPORT.md`
- **Test Setup**: `tests/README.md`, `tests/QUICKSTART.md`

---

## ✅ Definition of Done (Testing)

A feature is **fully tested** when:

- [ ] ✅ Integration tests cover all critical paths
- [ ] ✅ Tests verify database constraints (FK, UNIQUE, CHECK)
- [ ] ✅ Race conditions & idempotency tested
- [ ] ✅ Error cases covered (PaywallError, validation errors)
- [ ] ✅ SSOT verified (no hardcoded values)
- [ ] ✅ All tests PASS on CI/CD
- [ ] ✅ Test documentation updated in this SSOT
- [ ] ✅ Manual QA script available (if applicable)

---

**Last test run**: 2024-12-26  
**Status**: ✅ 8/8 PASS (24.669s)  
**Environment**: Production Supabase (djbqwsipllhdydshuokg)

