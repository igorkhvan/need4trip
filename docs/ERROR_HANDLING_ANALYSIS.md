# Анализ обработки ошибок в системе

## 🔍 Выявленные проблемы

### 1. **Rate Limit ошибки отображаются как "[object Object]"**

**Где:** `src/components/events/participant-form.tsx` (строка 236)

**Проблема:**
```typescript
// Middleware возвращает:
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Limit: 5 per 1 m. Please try again later."
  }
}

// handleApiError выбрасывает ошибку:
throw new Error(body?.message || body?.error || ...)
// ↑ body.error - это ОБЪЕКТ, не строка!

// getErrorMessage пытается извлечь message:
if (err.message && typeof err.message === 'string') { return err.message; }
// ↑ err.message = "[object Object]" (toString() объекта error)
```

---

### 2. **Несогласованная обработка ошибок в разных компонентах**

#### **Места обработки fetch ошибок:**

1. **participant-form.tsx** (строка 210)
   ```typescript
   if (!res.ok) {
     await handleApiError(res);  // ← Использует handleApiError
   }
   // catch (err) { setError(getErrorMessage(err)) }
   ```

2. **participants-table-client.tsx** (строка 85-88)
   ```typescript
   const body = await res.json().catch(() => ({}));
   toast({ 
     description: body?.message || "Не удалось удалить участника"
   });
   // ↑ НЕ извлекает body.error.message!
   ```

3. **owner-actions.tsx** (строка 36-37)
   ```typescript
   const body = await res.json().catch(() => ({}));
   setError(body?.message || "Не удалось удалить событие");
   // ↑ НЕ извлекает body.error.message!
   ```

4. **login-button.tsx** (строка 69-70)
   ```typescript
   const data = await res.json().catch(() => ({}));
   throw new Error(data.message || data.error || "Auth failed");
   // ↑ data.error может быть объектом!
   ```

---

## 📊 Типы ошибок в системе

### **1. Middleware ошибки (429, 401, 403)**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Limit: 5 per 1 m. Please try again later."
  }
}
```

**Источник:** `src/middleware.ts`

---

### **2. AppError ошибки (4xx, 5xx)**

```json
{
  "success": false,
  "error": {
    "code": "ConflictError",
    "message": "Вы уже зарегистрированы на это событие",
    "details": { "code": "already_registered" }
  }
}
```

**Источник:** `src/lib/api/response.ts` → `respondError()`

---

### **3. PaywallError ошибки (402)**

```json
{
  "success": false,
  "error": {
    "code": "PaywallError",
    "message": "Достигнут лимит для Free плана",
    "details": {
      "currentPlan": "free",
      "requiredPlan": "club_50",
      "limit": 3,
      "current": 3
    }
  }
}
```

**Источник:** `src/lib/api/response.ts` → `respondError()`

---

### **4. Network ошибки**

```typescript
catch (e) {
  // e instanceof Error
  // e.message = "Failed to fetch" или "Network error"
}
```

---

## ✅ Правильная структура ответа API

Все API endpoints должны возвращать:

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "message": "Успешно" // опционально
}

// Error
{
  "success": false,
  "error": {
    "code": "ErrorCode",
    "message": "Человекочитаемое сообщение",
    "details": { ... } // опционально
  }
}
```

---

## 🎯 План исправления

### **Приоритет 1: Исправить `handleApiError`**

**Файл:** `src/lib/utils/errors.ts`

**Проблема:**
```typescript
// Строка 41: body?.error может быть объектом!
throw new Error(
  body?.message || body?.error || `Ошибка сервера (${response.status})`
);
```

**Решение:**
```typescript
throw new Error(
  body?.error?.message || body?.message || `Ошибка сервера (${response.status})`
);
```

---

### **Приоритет 2: Исправить `getErrorMessage`**

**Файл:** `src/lib/utils/errors.ts`

**Текущая реализация НЕ обрабатывает:**
- Ошибки от middleware с структурой `{error: {message: ...}}`
- Когда `error.message` сам является объектом

**Решение:**
```typescript
export function getErrorMessage(error: unknown, fallback = "Произошла ошибка"): string {
  if (!error) return fallback;
  
  if (typeof error === "string") {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'object') {
    const err = error as any;
    
    // 1. Попытка: err.message (строка)
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
    
    // 2. Попытка: err.error.message (API response от middleware/routes)
    if (err.error?.message && typeof err.error.message === 'string') {
      return err.error.message;
    }
    
    // 3. Попытка: err.details.message (wrapped errors)
    if (err.details?.message && typeof err.details.message === 'string') {
      return err.details.message;
    }
    
    // 4. Попытка: err.message (объект) → извлекаем err.message.message
    if (err.message && typeof err.message === 'object' && err.message.message) {
      return String(err.message.message);
    }
  }
  
  return fallback;
}
```

---

### **Приоритет 3: Унифицировать обработку в компонентах**

#### **3.1. participants-table-client.tsx**

**БЫЛО (строки 85-88):**
```typescript
const body = await res.json().catch(() => ({}));
toast({ 
  title: "Ошибка", 
  description: body?.message || "Не удалось удалить участника",
});
```

**СТАНЕТ:**
```typescript
const body = await res.json().catch(() => ({}));
const message = body?.error?.message || body?.message || "Не удалось удалить участника";
toast({ 
  title: "Ошибка", 
  description: message,
});
```

---

#### **3.2. owner-actions.tsx**

**БЫЛО (строки 36-37):**
```typescript
const body = await res.json().catch(() => ({}));
setError(body?.message || "Не удалось удалить событие");
```

**СТАНЕТ:**
```typescript
const body = await res.json().catch(() => ({}));
const message = body?.error?.message || body?.message || "Не удалось удалить событие";
setError(message);
```

---

#### **3.3. login-button.tsx**

**БЫЛО (строки 69-70):**
```typescript
const data = await res.json().catch(() => ({}));
throw new Error(data.message || data.error || "Auth failed");
```

**СТАНЕТ:**
```typescript
const data = await res.json().catch(() => ({}));
const message = data.error?.message || data.message || "Auth failed";
throw new Error(message);
```

---

### **Приоритет 4: Добавить специальную обработку для 429**

**Зачем:** Rate limit ошибки требуют особого сообщения

**Где:** `src/lib/utils/errors.ts` → `handleApiError`

```typescript
export async function handleApiError(response: Response): Promise<never> {
  const body = await response.json().catch(() => ({}));
  
  // Rate Limiting (429)
  if (response.status === 429) {
    const message = body?.error?.message || body?.message || "Слишком много запросов. Попробуйте позже.";
    throw new Error(message);
  }
  
  // 401/403
  if (response.status === 401 || response.status === 403) {
    throw new Error("Недостаточно прав / войдите через Telegram");
  }
  
  // ... остальные статусы
  
  // Общая ошибка - ПРАВИЛЬНО извлекаем message
  const message = body?.error?.message || body?.message || `Ошибка сервера (${response.status})`;
  throw new Error(message);
}
```

---

## 📋 Итоговый план действий

### **Шаг 1: Исправить базовые утилиты (2 функции)**
1. ✅ `handleApiError` - правильно извлекать `body.error.message`
2. ✅ `getErrorMessage` - добавить обработку `err.error.message`

### **Шаг 2: Исправить компоненты (3 файла)**
3. ✅ `participants-table-client.tsx` - использовать `body.error.message`
4. ✅ `owner-actions.tsx` - использовать `body.error.message`
5. ✅ `login-button.tsx` - использовать `data.error.message`

### **Шаг 3: Тестирование**
6. ✅ Проверить rate limit ошибки (429)
7. ✅ Проверить auth ошибки (401, 403)
8. ✅ Проверить validation ошибки (400)
9. ✅ Проверить conflict ошибки (409)
10. ✅ Проверить paywall ошибки (402)

### **Шаг 4: Документация**
11. ✅ Обновить CHANGELOG.md
12. ✅ Создать SESSION_SUMMARY

---

## 🔍 Тестовые сценарии

### **1. Rate Limit Error (429)**
```bash
# Быстро создать/удалить 6+ регистраций
→ Ожидается: "Too many requests. Limit: 5 per 1 m. Please try again later."
→ НЕ должно быть: "[object Object]"
```

### **2. Auth Error (401/403)**
```bash
# Попытка удалить чужую регистрацию
→ Ожидается: "Недостаточно прав / войдите через Telegram"
```

### **3. Conflict Error (409)**
```bash
# Попытка зарегистрироваться дважды
→ Ожидается: "Вы уже зарегистрированы на это событие"
```

### **4. Paywall Error (402)**
```bash
# Превышение лимита free плана
→ Ожидается: "Достигнут лимит для Free плана"
```

---

## 📊 Затронутые файлы

### Исправления
1. `src/lib/utils/errors.ts` - 2 функции
2. `src/app/(app)/events/[id]/_components/participants-table-client.tsx` - 1 место
3. `src/components/events/owner-actions.tsx` - 1 место
4. `src/components/auth/login-button.tsx` - 1 место

### Документация
5. `CHANGELOG.md`
6. `docs/FIX_ERROR_MESSAGES_DISPLAY.md`
7. `SESSION_SUMMARY_ERROR_MESSAGES.md`

---

## ✅ Результат

После исправлений:
- ✅ Все ошибки отображаются как понятный текст
- ✅ Rate limit ошибки показывают правильное сообщение
- ✅ Middleware ошибки обрабатываются корректно
- ✅ Единый подход к обработке ошибок во всех компонентах
- ✅ НЕТ "[object Object]" в UI

