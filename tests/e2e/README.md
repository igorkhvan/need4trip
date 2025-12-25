# E2E Testing Quick Start — Need4Trip

## 🚀 Быстрый запуск

### 1. Убедись что Playwright установлен

```bash
# Проверить версию
npx playwright --version
# Должно показать: Version 1.57.0

# Если нужно установить браузеры
npx playwright install
```

### 2. Запустить E2E тесты

```bash
# Все тесты (headless)
npm run test:e2e

# Интерактивный режим (UI)
npm run test:e2e:ui

# Смотреть выполнение в браузере
npm run test:e2e:headed

# Конкретный тест
npm run test:e2e -- -g "QA-39"

# Debug режим
PWDEBUG=1 npm run test:e2e
```

## 📋 Текущий статус тестов

**8 E2E тестов (QA-39 to QA-46)**:

| Test | Status | Note |
|------|--------|------|
| QA-39: PaywallModal shows | 🔧 Ready | Requires loginAsTestUser() |
| QA-40: Purchase flow | 🔧 Ready | Requires loginAsTestUser() |
| QA-41: Pricing redirect | 🔧 Ready | Requires loginAsTestUser() |
| QA-42: Credit confirmation | 🔧 Ready | Requires loginAsTestUser() |
| QA-43: Confirm & publish | 🔧 Ready | Requires loginAsTestUser() |
| QA-44: Cancel confirmation | 🔧 Ready | Requires loginAsTestUser() |
| QA-45: Double-click | 🔧 Ready | Requires loginAsTestUser() |
| QA-46: Refresh recovery | 🔧 Ready | Requires loginAsTestUser() |

## ⚠️ Важно: Аутентификация

**Тесты требуют реализации `loginAsTestUser()` helper для полного покрытия.**

### Текущая заглушка (в tests/e2e/billing.flows.spec.ts):

```typescript
async function loginAsTestUser(page: Page) {
  // TODO: Implement Telegram auth mock for E2E testing
  // Options:
  // 1. Create test user via API with session cookie
  // 2. Mock Telegram widget response
  // 3. Use Supabase test auth
  
  await page.goto('/');
  // ... authentication flow
}
```

### Опции реализации:

**Вариант 1: API + Session Cookie (рекомендуется)**
```typescript
async function loginAsTestUser(page: Page) {
  // Create test user via API
  const testUser = await page.request.post('/api/dev/test/create-user', {
    data: { name: 'E2E Test User' }
  });
  
  const { sessionCookie } = await testUser.json();
  
  // Set session cookie
  await page.context().addCookies([{
    name: 'session',
    value: sessionCookie,
    domain: 'localhost',
    path: '/'
  }]);
  
  await page.goto('/');
}
```

**Вариант 2: Supabase Test Auth**
```typescript
async function loginAsTestUser(page: Page) {
  // Use Supabase createClient with test credentials
  // Set session in localStorage
  await page.goto('/');
  await page.evaluate(async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(/* test project */);
    await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123'
    });
  });
}
```

**Вариант 3: Mock Telegram Widget**
```typescript
async function loginAsTestUser(page: Page) {
  await page.goto('/');
  
  // Mock Telegram widget callback
  await page.evaluate(() => {
    window.onTelegramAuth?.({
      id: 12345,
      first_name: 'Test',
      username: 'testuser',
      auth_date: Date.now(),
      hash: 'test-hash'
    });
  });
}
```

## 🎯 После реализации auth

1. Убери `// TODO: Implement` комментарии
2. Запусти тесты: `npm run test:e2e`
3. Убедись что все 8 тестов проходят ✅
4. Обнови `docs/TESTING.md` статус с 🔧 на ✅

## 📊 Playwright Reports

После запуска тестов:

```bash
# Открыть HTML report
npx playwright show-report

# Trace viewer (если тест упал)
npx playwright show-trace trace.zip
```

## 🐛 Debugging

### Тест падает с timeout

```bash
# Увеличить timeout в playwright.config.ts
timeout: 30000  # 30 секунд
```

### Локаторы не находятся

```bash
# Использовать Playwright Inspector
PWDEBUG=1 npm run test:e2e -- -g "failing test"
```

### Dev server не стартует

```bash
# Проверить что порт 3000 свободен
lsof -ti:3000 | xargs kill -9

# Запустить вручную
npm run dev
```

## 📚 Документация

**SSOT**: `docs/TESTING.md` — полная документация  
**Test Code**: `tests/e2e/billing.flows.spec.ts`  
**Config**: `playwright.config.ts`

---

**Last Updated**: 2024-12-26  
**Playwright**: v1.57.0 ✅  
**Status**: Infrastructure ready, auth helper TODO

