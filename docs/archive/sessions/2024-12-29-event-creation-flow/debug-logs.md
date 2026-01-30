# Debug Логи для отслеживания создания события

**Дата:** 29 декабря 2024  
**Задача:** Добавлены debug логи для диагностики flow создания события

---

## 📝 ЧТО ДОБАВЛЕНО

Debug логи добавлены в 3 ключевых точках:

1. **Frontend** (`src/components/events/create-event-page-content.tsx`)
2. **API Route** (`src/app/api/events/route.ts`)
3. **Service Layer** (`src/lib/services/events.ts`)

---

## 🔍 FRONTEND ЛОГИ

**Файл:** `src/components/events/create-event-page-content.tsx`

### Добавленные логи:

```typescript
// 1. Начало создания
console.log('[CreateEvent] Starting event creation with payload:', payload);

// 2. Статус ответа
console.log('[CreateEvent] API response status:', res.status, res.statusText);

// 3. Ошибки
console.log('[CreateEvent] API request failed with status:', res.status);
console.log('[CreateEvent] Paywall error (402):', errorData);

// 4. Успешный ответ
console.log('[CreateEvent] Full API response:', response);
console.log('[CreateEvent] Extracted event:', createdEvent);
console.log('[CreateEvent] Event ID:', createdEvent?.id);

// 5. Редирект
console.log('[CreateEvent] ✅ Redirecting to:', targetUrl);

// 6. Отсутствие ID
console.error('[CreateEvent] ❌ No event.id in response:', response);
```

### Что показывают:

- ✅ Начало процесса создания
- ✅ Payload отправленный на сервер
- ✅ Статус HTTP ответа
- ✅ Полный JSON ответ от API
- ✅ Извлечённый объект события
- ✅ `event.id` (критично для редиректа)
- ✅ URL редиректа
- ❌ Ошибки (paywall, отсутствие id)

---

## 🔧 API ROUTE ЛОГИ

**Файл:** `src/app/api/events/route.ts`

### Добавленные логи:

```typescript
// 1. Начало обработки
console.log('[API /events POST] Starting event creation');

// 2. Текущий пользователь
console.log('[API /events POST] Current user:', currentUser?.id, currentUser?.name);
console.log('[API /events POST] ❌ No current user - throwing UnauthorizedError');

// 3. Параметры
console.log('[API /events POST] Confirm credit:', confirmCredit);

// 4. Payload
console.log('[API /events POST] Received payload:', JSON.stringify(payload, null, 2));

// 5. Успешное создание
console.log('[API /events POST] ✅ Event created successfully:', { 
  id: event.id, 
  title: event.title,
  maxParticipants: event.maxParticipants,
  clubId: event.clubId 
});

// 6. Возврат ответа
console.log('[API /events POST] Returning response with event.id:', event.id);

// 7. Ошибки
console.log('[API /events POST] ❌ Error caught:', err.name, err.message);
console.log('[API /events POST] Credit confirmation required (409)');
```

### Что показывают:

- ✅ Начало обработки POST запроса
- ✅ Аутентификация (user id, name)
- ✅ Параметры (confirm_credit)
- ✅ Полный payload (структурированный JSON)
- ✅ Созданное событие (id, title, maxParticipants, clubId)
- ✅ `event.id` перед возвратом (критично!)
- ❌ Ошибки (401, 409, 402)

---

## 🎯 SERVICE LAYER ЛОГИ

**Файл:** `src/lib/services/events.ts`

### Добавленные логи:

```typescript
// 1. Начало создания
console.log('[Service createEvent] Starting event creation', { 
  userId: currentUser?.id, 
  confirmCredit 
});

// 2. Проверка пользователя
console.log('[Service createEvent] ❌ No current user');

// 3. Валидация
console.log('[Service createEvent] Input validation passed');

// 4. Validated input
console.log('[Service createEvent] Validated input:', {
  title: validated.title,
  maxParticipants: validated.maxParticipants,
  clubId: validated.clubId,
  isPaid: validated.isPaid,
  visibility: validated.visibility,
});

// 5. Billing enforcement
console.log('[Service createEvent] Running billing enforcement...');
console.log('[Service createEvent] ✅ Billing enforcement passed');

// 6. Credit transaction
console.log('[Service createEvent] Should use credit:', shouldUseCredit);

// 7. Успешное создание
console.log('[Service createEvent] ✅ Event created successfully in database:', {
  id: event.id,
  title: event.title,
  hasId: !!event.id,
  visibility: event.visibility,
});

// 8. Возврат
console.log('[Service createEvent] Returning event with id:', event.id);
```

### Что показывают:

- ✅ Начало сервисной логики
- ✅ User ID и confirmCredit параметр
- ✅ Валидация Zod schema
- ✅ Validated input (title, maxParticipants, clubId, isPaid, visibility)
- ✅ Billing enforcement (начало + успех)
- ✅ Использование credit transaction
- ✅ Созданное событие с `id` (критично!)
- ✅ `event.id` перед return

---

## 📊 КАК ИСПОЛЬЗОВАТЬ ЛОГИ

### 1. Открыть DevTools

**Chrome/Firefox:**
- F12 или Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows)
- Перейти на вкладку **Console**

### 2. Создать событие

1. Войти в систему
2. Перейти на `/events/create`
3. Заполнить форму
4. Нажать "Создать событие"

### 3. Читать логи по порядку

**Ожидаемый flow (успешный):**

```
[CreateEvent] Starting event creation with payload: {...}
[CreateEvent] API response status: 201 Created

[API /events POST] Starting event creation
[API /events POST] Current user: uuid-here John Doe
[API /events POST] Confirm credit: false
[API /events POST] Received payload: {...}

[Service createEvent] Starting event creation { userId: 'uuid', confirmCredit: false }
[Service createEvent] Input validation passed
[Service createEvent] Validated input: { title: '...', maxParticipants: 10, ... }
[Service createEvent] Running billing enforcement...
[Service createEvent] ✅ Billing enforcement passed
[Service createEvent] Should use credit: false
[Service createEvent] ✅ Event created successfully in database: { id: 'uuid-here', ... }
[Service createEvent] Returning event with id: uuid-here

[API /events POST] ✅ Event created successfully: { id: 'uuid-here', ... }
[API /events POST] Returning response with event.id: uuid-here

[CreateEvent] Full API response: { success: true, data: { event: {...} } }
[CreateEvent] Extracted event: { id: 'uuid-here', title: '...', ... }
[CreateEvent] Event ID: uuid-here
[CreateEvent] ✅ Redirecting to: /events/uuid-here
```

### 4. Диагностировать проблемы

#### Проблема: Нет редиректа

**Проверить:**

1. **Есть ли `event.id` в ответе?**
   ```
   [CreateEvent] Event ID: undefined  ← ❌ ПРОБЛЕМА
   ```
   → Backend не возвращает `id`

2. **Редирект вызывается?**
   ```
   [CreateEvent] ✅ Redirecting to: /events/...  ← Должно быть
   ```
   → Если нет, значит `createdEvent?.id` undefined

3. **Backend создаёт событие?**
   ```
   [Service createEvent] ✅ Event created successfully in database: { id: 'uuid', ... }
   ```
   → Если нет, ошибка в сервисном слое

4. **API возвращает событие?**
   ```
   [API /events POST] ✅ Event created successfully: { id: 'uuid', ... }
   [API /events POST] Returning response with event.id: uuid
   ```
   → Если нет, проблема в API route

#### Проблема: 402 Paywall

```
[CreateEvent] API request failed with status: 402
[CreateEvent] Paywall error (402): { error: { code: 'PAYWALL', ... } }
```
→ Ожидаемо, показывается PaywallModal

#### Проблема: 409 Credit Confirmation

```
[API /events POST] Credit confirmation required (409)
```
→ Ожидаемо, показывается CreditConfirmationModal

#### Проблема: 401 Unauthorized

```
[API /events POST] ❌ No current user - throwing UnauthorizedError
```
→ JWT не прошёл middleware, проблема с аутентификацией

---

## 🧹 CLEANUP (после диагностики)

После того как проблема найдена и решена, **можно удалить** console.log statements:

1. Оставить только критичные ошибки:
   - `console.error('[CreateEvent] ❌ No event.id in response:', response);`

2. Удалить все остальные `console.log`

3. Или закомментировать для будущей диагностики:
   ```typescript
   // DEBUG: Uncomment for event creation debugging
   // console.log('[CreateEvent] Starting event creation with payload:', payload);
   ```

---

## 📚 REFERENCES

**Изменённые файлы:**
- `src/components/events/create-event-page-content.tsx` (handleSubmit)
- `src/app/api/events/route.ts` (POST handler)
- `src/lib/services/events.ts` (createEvent function)

**SSOT документация:**
- `docs/ssot/api-ssot.md` → API-028 (POST /api/events)
- `docs/sessions/2024-12-29-event-creation-flow/analysis.md` (детальный flow)

---

## ✅ ГОТОВО К ТЕСТИРОВАНИЮ

1. ✅ Debug логи добавлены в 3 слоях
2. ✅ Логи включают все критичные точки flow
3. ✅ Префиксы помогают различать слои ([CreateEvent], [API /events POST], [Service createEvent])
4. ✅ Эмодзи для быстрой визуальной идентификации (✅ успех, ❌ ошибка)
5. ✅ Линтеры пройдены без ошибок

**Теперь можно:**
- Создать событие в UI
- Открыть Console в DevTools
- Увидеть полный trace создания
- Диагностировать где именно ломается flow (если ломается)

