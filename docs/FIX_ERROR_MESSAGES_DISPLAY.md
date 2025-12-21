# Исправление отображения сообщений об ошибках

## 📋 Проблема

### Симптомы
При получении Rate Limit ошибки (429) и других ошибок от API, пользователи видят `[object Object]` вместо понятного текста:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Limit: 5 per 1 m. Please try again later."
  }
}
```

**В UI отображается:** `[object Object]`  
**Должно отображаться:** "Too many requests. Limit: 5 per 1 m. Please try again later."

---

## 🔍 Корневые причины

### 1. **handleApiError неправильно извлекает сообщения**

**Было (строка 41):**
```typescript
throw new Error(
  body?.message || body?.error || `Ошибка сервера (${response.status})`
);
// ↑ body.error - это ОБЪЕКТ {code: "...", message: "..."}, не строка!
```

**Проблема:** `body?.error` - объект, который при преобразовании в строку становится `[object Object]`

---

### 2. **getErrorMessage неправильный порядок приоритетов**

**Было:**
```typescript
// Проверялось в таком порядке:
1. err.message (строка)
2. err.details.message
3. err.error.message  // ← Самый низкий приоритет!
```

**Проблема:** Middleware и API routes возвращают `{error: {message: "..."}}`, но эта проверка была последней.

---

### 3. **Компоненты не извлекают body.error.message**

**Примеры:**

```typescript
// participants-table-client.tsx (строка 88)
const body = await res.json().catch(() => ({}));
description: body?.message || "Не удалось удалить участника"
// ↑ Не проверяет body.error.message!

// owner-actions.tsx (строка 37)
setError(body?.message || "Не удалось удалить событие");
// ↑ Не проверяет body.error.message!

// login-button.tsx (строка 70)
throw new Error(data.message || data.error || "Auth failed");
// ↑ data.error может быть объектом!
```

---

## ✅ Решение

### 1. **Переработана handleApiError**

**Стало:**
```typescript
export async function handleApiError(response: Response): Promise<never> {
  const body = await response.json().catch(() => ({}));
  
  // Rate Limiting (429) - специальная обработка
  if (response.status === 429) {
    const message = body?.error?.message || body?.message || "Слишком много запросов. Попробуйте позже.";
    throw new Error(message);
  }
  
  // Auth errors (401, 403)
  if (response.status === 401 || response.status === 403) {
    const message = body?.error?.message || body?.message || "Недостаточно прав / войдите через Telegram";
    throw new Error(message);
  }
  
  // ... остальные статусы
  
  // Общая ошибка - правильный порядок приоритетов
  const message = body?.error?.message || body?.message || `Ошибка сервера (${response.status})`;
  throw new Error(message);
}
```

**Изменения:**
- ✅ Добавлена специальная обработка для Rate Limit (429)
- ✅ Все статусы используют правильный порядок: `body.error.message` → `body.message` → fallback
- ✅ Понятные сообщения для всех типов ошибок

---

### 2. **Улучшена getErrorMessage**

**Стало:**
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
    
    // Priority 1: err.error.message (API response от middleware/routes)
    if (err.error?.message && typeof err.error.message === 'string') {
      return err.error.message;
    }
    
    // Priority 2: err.message (direct message)
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
    
    // Priority 3: err.details.message (wrapped errors)
    if (err.details?.message && typeof err.details.message === 'string') {
      return err.details.message;
    }
    
    // Edge case: err.message - объект с message
    if (err.message && typeof err.message === 'object' && err.message.message) {
      return String(err.message.message);
    }
  }
  
  return fallback;
}
```

**Изменения:**
- ✅ **Priority 1:** `err.error.message` - для middleware/route ответов
- ✅ **Priority 2:** `err.message` - для обычных ошибок
- ✅ **Priority 3:** `err.details.message` - для wrapped ошибок
- ✅ Обрабатывает edge case с объектом в `message`

---

### 3. **Унифицирована обработка в компонентах**

#### **participants-table-client.tsx**

**Было:**
```typescript
const body = await res.json().catch(() => ({}));
toast({ 
  description: body?.message || "Не удалось удалить участника",
});
```

**Стало:**
```typescript
const body = await res.json().catch(() => ({}));
const message = body?.error?.message || body?.message || "Не удалось удалить участника";
toast({ 
  description: message,
});
```

---

#### **owner-actions.tsx**

**Было:**
```typescript
const body = await res.json().catch(() => ({}));
setError(body?.message || "Не удалось удалить событие");
```

**Стало:**
```typescript
const body = await res.json().catch(() => ({}));
const message = body?.error?.message || body?.message || "Не удалось удалить событие";
setError(message);
```

---

#### **login-button.tsx**

**Было:**
```typescript
const data = await res.json().catch(() => ({}));
throw new Error(data.message || data.error || "Auth failed");
```

**Стало:**
```typescript
const data = await res.json().catch(() => ({}));
const message = 
  (typeof data.error === 'object' && data.error?.message) || 
  (typeof data.error === 'string' && data.error) ||
  data.message || 
  "Auth failed";
throw new Error(message);
```

---

## 📊 Типы ошибок в системе

### Единая структура ответа

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Успешно"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ErrorCode",
    "message": "Человекочитаемое сообщение",
    "details": { ... }
  }
}
```

---

### Все типы ошибок

| Статус | Тип | Пример сообщения | Источник |
|--------|-----|-----------------|----------|
| 429 | Rate Limit | "Too many requests. Limit: 5 per 1 m..." | Middleware |
| 401 | Unauthorized | "Недостаточно прав / войдите через Telegram" | Middleware/API |
| 403 | Forbidden | "Недостаточно прав / войдите через Telegram" | Middleware/API |
| 400 | Validation | "Ошибка валидации" | API routes |
| 409 | Conflict | "Вы уже зарегистрированы на это событие" | API routes |
| 402 | Paywall | "Эта функция доступна на платных тарифах" | API routes |
| 404 | Not Found | "Ресурс не найден" | API routes |
| 500 | Server Error | "Ошибка сервера" | API routes |

---

## ✅ Результаты

### До и После

| Сценарий | До | После |
|----------|-----|-------|
| Rate Limit (429) | `[object Object]` | "Too many requests. Limit: 5 per 1 m..." |
| Auth error (401/403) | ✅ Работает | ✅ Работает |
| Validation (400) | ✅ Работает | ✅ Работает |
| Conflict (409) | ✅ Работает | ✅ Работает |
| Paywall (402) | ✅ Работает | ✅ Работает |
| Not Found (404) | ✅ Работает | ✅ Работает |
| Server Error (500) | ✅ Работает | ✅ Работает |

---

### Преимущества решения

- ✅ **Единообразие:** Все компоненты используют одинаковый подход
- ✅ **Надежность:** Правильный порядок приоритетов извлечения сообщений
- ✅ **Понятность:** Пользователи видят понятные сообщения, а не `[object Object]`
- ✅ **Полнота:** Обрабатываются все типы ошибок (429, 401, 403, 400, 409, 402, 404, 500)
- ✅ **Maintainability:** Централизованная логика в `handleApiError` и `getErrorMessage`

---

## 📁 Измененные файлы

### Код (4 файла)
```
src/lib/utils/errors.ts
  - handleApiError (переработана)
  - getErrorMessage (улучшена)

src/app/(app)/events/[id]/_components/participants-table-client.tsx
  - Унифицирована обработка ошибок

src/components/events/owner-actions.tsx
  - Унифицирована обработка ошибок

src/components/auth/login-button.tsx
  - Унифицирована обработка ошибок
```

### Документация (3 файла)
```
docs/ERROR_HANDLING_ANALYSIS.md (полный анализ)
docs/FIX_ERROR_MESSAGES_DISPLAY.md (этот файл)
CHANGELOG.md (обновлен)
```

### Статистика
- **Изменено файлов:** 4
- **Переработано функций:** 2
- **Унифицировано компонентов:** 3
- **Linter errors:** 0
- **Breaking changes:** 0

---

## 🧪 Как проверить

### 1. **Проверить Rate Limit (429)**

```bash
# Быстро создать/удалить 6+ регистраций на событие
1. Создать событие
2. Быстро зарегистрироваться 6 раз подряд
3. Должно появиться: "Too many requests. Limit: 5 per 1 m. Please try again later."
4. НЕ должно быть: "[object Object]"
```

### 2. **Проверить Auth Error (401/403)**

```bash
# Попытка удалить чужую регистрацию без прав
1. Зайти как guest
2. Попытаться удалить чужую регистрацию
3. Должно появиться: "Недостаточно прав / войдите через Telegram"
```

### 3. **Проверить Conflict Error (409)**

```bash
# Попытка зарегистрироваться дважды
1. Зарегистрироваться на событие
2. Попытаться зарегистрироваться снова
3. Должно появиться: "Вы уже зарегистрированы на это событие"
```

### 4. **Проверить Validation Error (400)**

```bash
# Отправить невалидные данные
1. Создать событие с пустым названием
2. Должно появиться понятное сообщение валидации
```

---

## 🎯 Ключевые инсайты

1. **API всегда возвращает `{error: {message: "..."}}`** - важно извлекать правильно
2. **Порядок приоритетов имеет значение** - `error.error.message` должен быть первым
3. **Middleware ошибки требуют особого внимания** - специально обработать 429
4. **Единообразие критично** - все компоненты должны использовать один подход
5. **Централизованная логика** - `handleApiError` и `getErrorMessage` в одном месте

---

## 📚 Связанные документы

- `docs/ERROR_HANDLING_ANALYSIS.md` - полный анализ всех типов ошибок
- `src/lib/api/response.ts` - структура API responses
- `src/middleware.ts` - где генерируются middleware ошибки
- `CHANGELOG.md` - история изменений

