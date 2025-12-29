# Анализ: Процесс создания события и редирект

**Дата:** 29 декабря 2024  
**Статус:** Диагностика завершена  
**Ожидаемое поведение:** После создания события должна открываться страница просмотра только что созданного события

---

## 📋 EXECUTIVE SUMMARY

**Проблема:** Необходимо продиагностировать, как работает создание события и редирект на страницу просмотра после успешного создания.

**Результат анализа:** ✅ **Механизм работает корректно**, редирект реализован правильно.

**Текущая реализация:**
1. ✅ Frontend отправляет POST `/api/events`
2. ✅ Backend создаёт событие и возвращает `{ success: true, data: { event: {...} } }`
3. ✅ Frontend извлекает `event.id` из ответа
4. ✅ Frontend выполняет `router.push(\`/events/${createdEvent.id}\`)`
5. ✅ Открывается страница `/events/[id]` с деталями события

---

## 🔍 ДЕТАЛЬНЫЙ FLOW (По шагам)

### STEP 1: Пользователь заполняет форму

**Файл:** `src/components/events/event-form.tsx`

```typescript
// Строки 437-514
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // 1. Валидация полей
  const { issues, parsedDate, trimmedTitle, trimmedDescription, trimmedPrice } = validate();
  if (Object.keys(issues).length) {
    setFieldErrors(issues);
    scrollToFirstError({ offset: 100 });
    return;
  }
  
  setIsSubmitting(true);
  setErrorMessage(null);
  setFieldErrors({});

  // 2. Формирование payload
  const payload = {
    title: trimmedTitle,
    description: trimmedDescription,
    categoryId,
    dateTime: parsedDate.toISOString(),
    cityId,
    locations,
    maxParticipants: maxParticipantsValue,
    customFieldsSchema: customFields.filter(f => f.label.trim()),
    visibility,
    vehicleTypeRequirement,
    allowedBrandIds,
    rules,
    isClubEvent,
    clubId: club?.id ?? null,
    isPaid,
    price: finalPrice,
    currencyCode: isPaid ? currencyCode : null,
    allowAnonymousRegistration,
  };

  // 3. Вызов onSubmit (передан из CreateEventPageContent)
  await onSubmit(payload);
};
```

**✅ Корректно:** Форма собирает все данные и передаёт их в `onSubmit` prop.

---

### STEP 2: CreateEventPageContent отправляет POST запрос

**Файл:** `src/components/events/create-event-page-content.tsx`

```typescript
// Строки 52-88
const handleSubmit = async (payload: Record<string, unknown>) => {
  // 1. Отправляем POST /api/events
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  // 2. Обработка ошибок (402 Paywall, 409 Credit Confirmation, другие)
  if (!res.ok) {
    if (res.status === 402) {
      const errorData = await res.json();
      const paywallError = errorData.error?.details || errorData.error;
      if (paywallError) {
        showPaywall(paywallError);
        return;
      }
    }
    await handleApiError(res);
    return;
  }
  
  // 3. ✅ SUCCESS - извлекаем event.id из ответа
  const response = await res.json();
  const createdEvent = response.data?.event || response.event;
  
  // 4. ✅ REDIRECT к странице события
  if (createdEvent?.id) {
    router.push(`/events/${createdEvent.id}`);
  } else {
    // Fallback (не должно случиться)
    console.error('No event.id in response:', response);
    router.push('/events');
    router.refresh();
  }
};
```

**✅ Корректно:**
- Проверяет статус ответа
- Извлекает `event.id` из `response.data.event` или `response.event` (поддержка обоих форматов)
- Выполняет `router.push()` к странице события
- Есть fallback на случай отсутствия `id`

---

### STEP 3: API Route обрабатывает запрос

**Файл:** `src/app/api/events/route.ts`

```typescript
// Строки 80-114
export async function POST(request: Request) {
  try {
    // 1. Auth check
    const currentUser = await getCurrentUserFromMiddleware(request);
    if (!currentUser) {
      throw new UnauthorizedError("Авторизация обязательна для создания события");
    }
    
    // 2. Extract confirm_credit from query params
    const url = new URL(request.url);
    const confirmCredit = url.searchParams.get("confirm_credit") === "1";
    
    // 3. Валидация и создание события через сервисный слой
    const payload = await request.json();
    const event = await createEvent(payload, currentUser, confirmCredit);
    
    // 4. ✅ RETURN SUCCESS с event объектом
    return respondJSON({ event }, undefined, 201);
    
  } catch (err: any) {
    // Handle CreditConfirmationRequiredError (409)
    if (err.name === "CreditConfirmationRequiredError") {
      const url = new URL(request.url);
      const error = err.payload;
      error.error.cta.href = `${url.pathname}?confirm_credit=1`;
      
      return new Response(JSON.stringify(error), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Other errors (PaywallError, etc)
    return respondError(err);
  }
}
```

**✅ Корректно:**
- Возвращает `respondJSON({ event }, undefined, 201)`
- Статус код: 201 Created
- Обрабатывает billing ошибки (402, 409)

---

### STEP 4: respondJSON формирует стандартный ответ

**Файл:** `src/lib/api/response.ts`

```typescript
// Строки 30-52
export function respondSuccess<T>(
  data?: T,
  message?: string,
  status: number = 200,
  headers?: Record<string, string>
): NextResponse<ApiSuccessResponse<T>> {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    message,
  };
  
  const response = NextResponse.json(payload, { status });
  
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

export const respondJSON = respondSuccess;
```

**✅ Структура ответа:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "uuid-here",
      "title": "...",
      "description": "...",
      // ... все поля события
    }
  },
  "message": undefined
}
```

**✅ Корректно:** 
- `response.data.event` содержит полный объект события с `id`
- Frontend извлекает `response.data?.event || response.event` (оба варианта)

---

### STEP 5: createEvent в сервисном слое

**Файл:** `src/lib/services/events.ts`

```typescript
// Строки 392-534
export async function createEvent(
  input: unknown, 
  currentUser: CurrentUser | null,
  confirmCredit: boolean = false
) {
  // 1. Auth check
  if (!currentUser) {
    throw new AuthError("Авторизация обязательна для создания события", undefined, 401);
  }
  
  // 2. Валидация через Zod schema
  const parsed = eventCreateSchema.parse(input) as any;
  const validated: EventCreateInput = {
    title: parsed.title,
    description: parsed.description,
    categoryId: parsed.categoryId ?? null,
    dateTime: parsed.dateTime,
    cityId: parsed.cityId,
    locations: parsed.locations,
    maxParticipants: parsed.maxParticipants ?? null,
    customFieldsSchema: parsed.customFieldsSchema ?? [],
    createdByUserId: parsed.createdByUserId ?? null,
    visibility: parsed.visibility ?? "public",
    vehicleTypeRequirement: parsed.vehicleTypeRequirement ?? "any",
    allowedBrandIds: parsed.allowedBrandIds ?? [],
    rules: parsed.rules ?? null,
    isClubEvent: parsed.isClubEvent ?? false,
    clubId: parsed.clubId ?? null,
    isPaid: parsed.isPaid ?? false,
    price: parsed.price ?? null,
    currencyCode: parsed.currencyCode ?? null,
    allowAnonymousRegistration: parsed.allowAnonymousRegistration ?? true,
  };
  
  // 3. ⚡ Billing v5 Enforcement
  const { enforceEventPublish } = await import("@/lib/services/accessControl");
  await enforceEventPublish({
    userId: currentUser.id,
    clubId: validated.clubId ?? null,
    maxParticipants: validated.maxParticipants,
    isPaid: validated.isPaid,
    eventId: undefined,
  }, confirmCredit);
  
  // 4. Создание события (с credit transaction если нужно)
  const shouldUseCredit = confirmCredit && validated.clubId === null && 
    validated.maxParticipants && validated.maxParticipants > 15 && validated.maxParticipants <= 500;
  
  let event: Event;
  
  if (shouldUseCredit) {
    // Wrap в compensating transaction
    const { executeWithCreditTransaction } = await import("@/lib/services/creditTransaction");
    event = await executeWithCreditTransaction(
      currentUser.id,
      "EVENT_UPGRADE_500",
      undefined,
      async () => {
        // Создание события + связанных данных
        await ensureUserExists(currentUser.id, currentUser.name ?? undefined);
        const db = await createEventRecord({
          ...validated,
          createdByUserId: currentUser.id,
        });
        
        // Brands, locations, access
        if (validated.allowedBrandIds?.length) {
          await replaceAllowedBrands(db.id, validated.allowedBrandIds);
        }
        if (validated.locations && validated.locations.length > 0) {
          await saveLocations(db.id, validated.locations);
        } else {
          await createDefaultLocation(db.id, "Точка сбора");
        }
        await upsertEventAccess(db.id, currentUser.id, "owner");
        
        // Map to domain
        const mappedEvent = mapDbEventToDomain(db);
        mappedEvent.allowedBrands = await getAllowedBrands(db.id);
        mappedEvent.locations = await getLocationsByEventId(db.id);
        
        return mappedEvent;
      }
    );
  } else {
    // No credit - direct save
    await ensureUserExists(currentUser.id, currentUser.name ?? undefined);
    const db = await createEventRecord({
      ...validated,
      createdByUserId: currentUser.id,
    });
    
    // Brands, locations, access
    if (validated.allowedBrandIds?.length) {
      await replaceAllowedBrands(db.id, validated.allowedBrandIds);
    }
    if (validated.locations && validated.locations.length > 0) {
      await saveLocations(db.id, validated.locations);
    } else {
      await createDefaultLocation(db.id, "Точка сбора");
    }
    await upsertEventAccess(db.id, currentUser.id, "owner");
    
    event = mapDbEventToDomain(db);
    event.allowedBrands = await getAllowedBrands(db.id);
    event.locations = await getLocationsByEventId(db.id);
  }
  
  // 5. Queue notifications (non-blocking)
  if (event.visibility === "public" && event.cityId) {
    queueNewEventNotificationsAsync(event).catch((err) => {
      log.errorWithStack("Failed to queue new event notifications", err, { eventId: event.id });
    });
  }
  
  // 6. ✅ RETURN созданное событие с ID
  return event;
}
```

**✅ Корректно:**
- Создаёт событие в БД через `createEventRecord()`
- Возвращает полный объект `Event` с `id`, `allowedBrands`, `locations`
- Billing enforcement ПЕРЕД созданием (throws 402 или 409)
- Notifications в фоне (non-blocking)

---

### STEP 6: Редирект на страницу события

**Файл:** `src/app/(app)/events/[id]/page.tsx`

```typescript
// Строки 1-50
export const dynamic = "force-dynamic";

export default async function EventDetails({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await params;
  
  // 1. Загружаем currentUser и guestSessionId параллельно
  const [currentUser, guestSessionId] = await Promise.all([
    getCurrentUserSafe(),
    (async () => {
      const u = await getCurrentUserSafe();
      return u ? null : await getGuestSessionId();
    })(),
  ]);
  
  // 2. Загружаем событие с контекстом пользователя
  // ВАЖНО: currentUser должен быть загружен ДО проверки видимости,
  // чтобы владельцы могли видеть свои unlisted/restricted события
  const eventBasicInfo = await getEventBasicInfo(id, currentUser, guestSessionId);
  
  // 3. Если события нет - 404
  if (!eventBasicInfo) {
    return notFound();
  }
  
  // 4. Рендерим страницу с деталями события
  // ...
}
```

**✅ Корректно:**
- Server Component с `dynamic = "force-dynamic"`
- Загружает событие через `getEventBasicInfo()`
- Проверяет visibility (владелец видит любое своё событие)
- Отображает детали: участники, локации, правила, регистрация

---

## 🎯 ВЫВОД

### ✅ Текущая реализация работает правильно

**FLOW (создание + редирект):**

```
1. User заполняет форму (EventForm)
   ↓
2. EventForm → onSubmit(payload)
   ↓
3. CreateEventPageContent → POST /api/events
   ↓
4. API Route → createEvent(payload, currentUser, confirmCredit)
   ↓
5. createEvent → billing enforcement → create DB record → return Event{id, ...}
   ↓
6. API Route → respondJSON({ event }, undefined, 201)
   ↓
7. CreateEventPageContent → extract event.id → router.push(`/events/${id}`)
   ↓
8. Next.js navigation → /events/[id]/page.tsx
   ↓
9. EventDetails page → getEventBasicInfo(id, currentUser) → render
```

### ✅ Что работает корректно

1. **Backend:** 
   - ✅ Создаёт событие в БД
   - ✅ Возвращает полный объект `Event` с `id`
   - ✅ Структура ответа: `{ success: true, data: { event: {...} } }`
   - ✅ Статус код: 201 Created

2. **Frontend:**
   - ✅ Извлекает `event.id` из ответа (поддержка двух форматов)
   - ✅ Выполняет `router.push(\`/events/${createdEvent.id}\`)`
   - ✅ Есть fallback на `/events` если нет `id`

3. **Event Details Page:**
   - ✅ `dynamic = "force-dynamic"` (no caching)
   - ✅ Загружает событие через `getEventBasicInfo()`
   - ✅ Владелец видит своё событие (любой visibility)
   - ✅ Отображает полную информацию

4. **Error Handling:**
   - ✅ Paywall (402) → показывает PaywallModal
   - ✅ Credit Confirmation (409) → CreditConfirmationModal
   - ✅ Другие ошибки → handleApiError()

### 🔍 Возможные проблемы (если редирект не происходит)

Если редирект НЕ работает, возможные причины:

1. **Backend не возвращает `event.id`:**
   - Проверить: `createEvent()` возвращает `Event` с заполненным `id`?
   - Проверить: `respondJSON({ event })` правильно сериализует объект?

2. **Frontend не извлекает `event.id`:**
   - Проверить: `response.data?.event || response.event` правильно парсит JSON?
   - Проверить: `createdEvent?.id` не undefined/null?

3. **Router.push() не работает:**
   - Проверить: `useRouter()` из `next/navigation` импортирован?
   - Проверить: нет JavaScript ошибок в консоли?

4. **Event Details Page недоступна:**
   - Проверить: `/events/[id]` route существует?
   - Проверить: `getEventBasicInfo()` находит только что созданное событие?

---

## 🧪 КАК ПРОТЕСТИРОВАТЬ

### Manual Test

1. Войти в систему (Telegram)
2. Перейти на `/events/create`
3. Заполнить форму:
   - Название: "Тестовое событие"
   - Описание: "..."
   - Дата/время
   - Город
   - Максимум участников: 10
4. Нажать "Создать событие"
5. ✅ **Ожидаемый результат:** Редирект на `/events/{uuid}` с деталями события

### Debug Steps (если не работает)

1. **Открыть DevTools → Network tab**
2. Создать событие
3. Найти запрос `POST /api/events`
4. Проверить **Response:**
   ```json
   {
     "success": true,
     "data": {
       "event": {
         "id": "uuid-here",  // ← ДОЛЖЕН БЫТЬ ЗАПОЛНЕН
         "title": "...",
         // ...
       }
     }
   }
   ```
5. **Открыть DevTools → Console tab**
6. Проверить логи:
   - Ошибки при парсинге ответа?
   - `router.push()` вызывается?
   - Navigation происходит?

### Code Inspection Points

```typescript
// src/components/events/create-event-page-content.tsx (строка 77-87)
const response = await res.json();
console.log('API Response:', response); // ← ADD DEBUG

const createdEvent = response.data?.event || response.event;
console.log('Extracted event:', createdEvent); // ← ADD DEBUG
console.log('Event ID:', createdEvent?.id); // ← ADD DEBUG

if (createdEvent?.id) {
  console.log('Redirecting to:', `/events/${createdEvent.id}`); // ← ADD DEBUG
  router.push(`/events/${createdEvent.id}`);
} else {
  console.error('No event.id in response:', response); // ← ALREADY EXISTS
  router.push('/events');
}
```

---

## 📚 REFERENCES

**Документация (SSOT):**
- `docs/ssot/api-ssot.md` → API-028 (POST /api/events)
- `docs/ARCHITECTURE.md` → § 4.3 (Services Layer)
- `docs/BILLING_SYSTEM_ANALYSIS.md` → § 4 (Enforcement)

**Код:**
- API: `src/app/api/events/route.ts` (строки 80-114)
- Service: `src/lib/services/events.ts` (строки 392-534)
- UI: `src/components/events/create-event-page-content.tsx` (строки 52-88)
- Page: `src/app/(app)/events/[id]/page.tsx`

---

## 🎬 NEXT STEPS

**Если flow работает корректно:** Никаких действий не требуется.

**Если обнаружена проблема:**
1. Добавить debug логи (см. выше)
2. Воспроизвести проблему
3. Собрать логи из Network + Console
4. Определить на каком этапе flow ломается
5. Исправить + обновить SSOT

**Возможные улучшения:**
- ✅ Добавить loading state во время редиректа (spinner)
- ✅ Показывать toast "Событие создано!" перед редиректом
- ✅ Preload `/events/[id]` page для faster navigation

---

**Статус:** ✅ Анализ завершён. Механизм редиректа реализован правильно.

