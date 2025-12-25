# Billing v4 Integration Tests — Setup Guide

**Purpose:** Run integration tests for Billing v4 system

**Status:** Jest configured, tests written, ready to run

---

## 📋 Pre-requisites

- ✅ Jest installed (done)
- ✅ Test configuration created (done)
- ⏳ Test database setup (follow instructions below)

---

## 🚀 Quick Start

### Option 1: Local Supabase (Recommended)

**Step 1: Install Supabase CLI**
```bash
# macOS
brew install supabase/tap/supabase

# Or npm global install
npm install -g supabase
```

**Step 2: Start Local Supabase**
```bash
cd /Users/igorkhvan/Git/need4trip
npx supabase start
```

This will:
- Start PostgreSQL on `localhost:54321`
- Apply all migrations from `supabase/migrations/`
- Provide anon key and service role key

**Step 3: Copy test environment**
```bash
cp .env.test.example .env.test
# Keys are already configured for local Supabase
```

**Step 4: Run tests**
```bash
npm test
# Or specific test
npm run test:billing
```

---

### Option 2: Dedicated Test Project (Supabase Cloud)

**Step 1: Create test project**
1. Go to https://supabase.com/dashboard
2. Create new project: `need4trip-test`
3. Copy URL and keys

**Step 2: Apply migrations**
```bash
# Link project
npx supabase link --project-ref your-test-project-ref

# Push migrations
npx supabase db push
```

**Step 3: Configure .env.test**
```bash
cp .env.test.example .env.test
# Edit .env.test with your test project credentials
```

**Step 4: Run tests**
```bash
npm test
```

---

## 🧪 Test Commands

```bash
# Run all tests
npm test

# Run Billing v4 tests only
npm run test:billing

# Watch mode (auto-rerun on changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

---

## 📊 Expected Output

**When ALL PASS:**
```
PASS tests/integration/billing.v4.test.ts
  Billing v4: Publish Enforcement
    ✓ publish within free limits does not consume credit (234ms)
    ✓ credit confirmation flow consumes exactly one credit (312ms)
    ✓ concurrent publish confirms consume only one credit (445ms)
    ✓ personal event >500 participants requires club (89ms)
    ✓ republish does not consume additional credit (156ms)
    ✓ duplicate transaction does not issue duplicate credit (78ms)
  Billing v4: billing_products SSOT
    ✓ enforcePublish uses billing_products constraints (45ms)
    ✓ PaywallError contains price from billing_products (67ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        3.456s
```

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to Supabase"
**Solution:** Check Supabase is running
```bash
npx supabase status
```

### Issue: "Table not found"
**Solution:** Apply migrations
```bash
npx supabase db reset  # Local only
# Or
npx supabase db push   # Cloud
```

### Issue: "EVENT_UPGRADE_500 product not found"
**Solution:** Ensure migration `20241226_create_billing_products.sql` applied
```bash
# Check applied migrations
npx supabase migration list

# If missing, reset database
npx supabase db reset
```

### Issue: Tests timeout
**Solution:** Increase timeout in `jest.setup.js` (currently 30s)

---

## 🧹 Cleanup After Tests

**Local Supabase:**
```bash
# Stop (keeps data)
npx supabase stop

# Reset database (fresh start)
npx supabase db reset

# Complete cleanup
npx supabase stop --no-backup
```

**Test Project:**
- Database auto-cleans on next migration reset
- Or manually truncate tables:
  ```sql
  TRUNCATE billing_credits, billing_transactions, events CASCADE;
  ```

---

## 📝 Test Data Management

**Current approach:** Each test creates its own data

**Recommended improvements:**
1. **Fixtures:** Create `tests/fixtures/billing-test-data.ts`
2. **Cleanup hooks:** `afterEach()` to truncate tables
3. **Factory functions:** Generate test users/events/credits

**Example:**
```typescript
// tests/fixtures/billing-test-data.ts
export async function createTestUser(): Promise<string> {
  const db = getAdminDb();
  const { data } = await db
    .from('users')
    .insert({ name: 'Test User', telegram_id: `test-${Date.now()}` })
    .select('id')
    .single();
  return data.id;
}

export async function cleanupTestData(): Promise<void> {
  const db = getAdminDb();
  await db.from('billing_credits').delete().ilike('id', '%');
  // ... cleanup other tables
}
```

---

## 🎯 Current Test Coverage

**File:** `tests/integration/billing.v4.test.ts`

**Scenarios:**
- ✅ QA-1: Free publish → no credit consumed
- ✅ QA-2: 409 → confirm → exactly one credit
- ✅ QA-3: Concurrent confirms → only one succeeds
- ✅ QA-4: Personal >500 → club only paywall
- ✅ QA-5: Idempotent publish
- ✅ QA-6: Idempotent credit issuance
- ✅ QA-7: enforcePublish reads DB constraints
- ✅ QA-8: PaywallError has price from DB

**Coverage Goals:**
- Services: `src/lib/services/accessControl.ts`
- Repos: `src/lib/db/billingCreditsRepo.ts`, `billingProductsRepo.ts`
- API: `src/app/api/billing/**`, `src/app/api/events/[id]/publish/route.ts`

---

## 🔄 CI/CD Integration (TODO)

**GitHub Actions example:**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start Supabase
        run: |
          npx supabase start
          cp .env.test.example .env.test
      
      - name: Run tests
        run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Testing Next.js Apps](https://nextjs.org/docs/testing)

---

**Last Updated:** 2024-12-26  
**Status:** Ready for execution ✅

