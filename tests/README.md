# Need4Trip Test Suite — Quick Reference

## 📊 Test Coverage Summary

**Total**: 46 automated tests across 6 test suites

| Suite | Tests | Status | File | Purpose |
|-------|-------|--------|------|---------|
| **Core Integration** | 8 | ✅ PASS | `billing.v4.test.ts` | Publish enforcement, SSOT |
| **API: Publish** | 5 | 🆕 Ready | `api.publish.test.ts` | HTTP contracts, auth |
| **API: Billing** | 9 | 🆕 Ready | `api.billing.test.ts` | Purchase, status polling |
| **Webhook** | 7 | 🆕 Ready | `api.webhook.test.ts` | Settlement, idempotency |
| **Boundary** | 9 | 🆕 Ready | `api.boundary.test.ts` | Edge cases, limits |
| **E2E (Playwright)** | 8 | ⏸️ SKIP | `e2e/billing.flows.spec.ts` | Real browser flows |

---

## 🚀 Quick Start

### Prerequisites

```bash
# Ensure environment configured
cp .env.local .env.test
# Add SUPABASE_SERVICE_ROLE_KEY to .env.test

# Install dependencies
npm install
```

### Run Tests

```bash
# All integration tests (QA-1 to QA-38)
npm test

# Specific suite
npm test -- billing.v4.test.ts     # Core only
npm test -- api.publish.test.ts    # Publish endpoint
npm test -- api.billing.test.ts    # Billing endpoints
npm test -- api.webhook.test.ts    # Webhook handler
npm test -- api.boundary.test.ts   # Boundary cases

# E2E tests (Playwright - requires setup)
npm run test:e2e                   # Headless
npm run test:e2e:ui                # Interactive UI
```

---

## 📝 Test Organization

### Integration Tests (`tests/integration/`)

**Purpose**: Test backend logic with real database

**Characteristics**:
- Real Supabase connection
- Tests all layers (Repo → Service → API)
- No mocks for DB operations
- Isolated test data (random UUIDs)

**Files**:
- `billing.v4.test.ts` — Core enforcement logic (QA-1 to QA-8)
- `api.publish.test.ts` — Publish endpoint (QA-9 to QA-13)
- `api.billing.test.ts` — Billing endpoints (QA-14 to QA-22)
- `api.webhook.test.ts` — Webhook handler (QA-23 to QA-29)
- `api.boundary.test.ts` — Edge cases (QA-30 to QA-38)

### E2E Tests (`tests/e2e/`)

**Purpose**: Test user experience in real browser

**Characteristics**:
- Playwright-based
- Real browser automation
- No mocked UI states
- Tests frontend + backend integration

**Files**:
- `billing.flows.spec.ts` — Paywall & credit flows (QA-39 to QA-46)

**Status**: ⏸️ Requires test authentication (TODO)

---

## 🔍 Test Categories

### 1. Core Logic (QA-1 to QA-8)

**Focus**: Billing v4 business logic

**Tests**:
- Free limit enforcement (15 participants)
- Credit confirmation flow (409)
- Concurrent consumption (race conditions)
- One-off vs club limits (500 vs club access)
- Idempotency (republish, credit issuance)
- SSOT verification (no hardcoded prices/limits)

### 2. API Contracts (QA-9 to QA-22)

**Focus**: HTTP contracts, auth, status codes

**Tests**:
- Authentication (401, 403)
- Idempotency (already published → 200)
- Error responses (402 PaywallError, 409 CREDIT_CONFIRMATION_REQUIRED)
- Purchase flow (valid/invalid products)
- Status polling (pending → completed)
- Input validation (400 errors)

### 3. Webhook Security (QA-23 to QA-29)

**Focus**: Payment provider integration

**Tests**:
- Idempotent settlement (duplicate webhooks)
- Invalid transactions (404, 400)
- Failed settlements (no credit issued)
- Concurrent webhooks (UNIQUE constraint)
- End-to-end flow (purchase → settle → publish)

### 4. Boundary Cases (QA-30 to QA-38)

**Focus**: Edge cases, limits, null values

**Tests**:
- Exact limits (15, 16, 500, 501)
- Zero/negative participants
- Null max_participants
- Non-existent events
- Club vs personal separation

### 5. E2E User Flows (QA-39 to QA-46)

**Focus**: Real user interactions

**Tests**:
- PaywallModal opens on 402
- Credit purchase flow (end-to-end)
- CreditConfirmationModal (409 handling)
- UX race conditions (double-click, refresh)

---

## ⚙️ Test Configuration

### Jest (Integration Tests)

**Config**: `jest.config.js`

```javascript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }
}
```

**Setup**: `jest.setup.js` — loads `.env.test`, validates keys

### Playwright (E2E Tests)

**Config**: `playwright.config.ts`

```typescript
{
  testDir: './tests/e2e',
  baseURL: 'http://localhost:3000',
  projects: ['chromium', 'firefox', 'webkit', 'Mobile Chrome', 'Mobile Safari']
}
```

**Webserver**: Auto-starts `npm run dev` before tests

---

## 🐛 Debugging

### Integration Test Failures

```bash
# Verbose output
npm test -- --verbose

# Single test file
npm test -- api.publish.test.ts

# Specific test
npm test -- -t "QA-12"
```

**Common Issues**:
- Missing `SUPABASE_SERVICE_ROLE_KEY` in `.env.test`
- Schema mismatch (apply missing migrations)
- FK violations (seed data missing: cities, currencies)

### E2E Test Failures

```bash
# Run with UI (interactive debugging)
npm run test:e2e:ui

# Run headed (watch browser)
npm run test:e2e:headed

# Debug mode
PWDEBUG=1 npm run test:e2e
```

**Common Issues**:
- Dev server not running (auto-starts via `webServer` config)
- Authentication not implemented (tests currently skipped)

---

## 📚 Additional Resources

**SSOT Documentation**:
- `docs/TESTING.md` — Complete testing documentation
- `docs/BILLING_SYSTEM_ANALYSIS.md` — Billing architecture
- `docs/DATABASE.md` — Database schema

**Related Files**:
- `jest.config.js` — Jest configuration
- `jest.setup.js` — Test environment setup
- `playwright.config.ts` — Playwright configuration
- `.env.test` — Test environment variables

---

## ✅ Definition of Done (Testing)

A feature is **fully tested** when:

- [ ] Core logic covered by integration tests
- [ ] API routes covered (auth, idempotency, errors)
- [ ] Webhook handlers covered (idempotency, security)
- [ ] Boundary cases covered (limits, edge cases)
- [ ] E2E tests written (even if skipped pending auth)
- [ ] All tests PASS on CI/CD
- [ ] `TESTING.md` updated with new tests

---

**Last Updated**: 2024-12-26  
**Maintainer**: AI Assistant  
**Status**: ✅ Production Ready (integration), ⏸️ Auth TODO (E2E)
