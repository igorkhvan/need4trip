# Event Creation Flow - Final Summary

**Дата:** 29 декабря 2024  
**Статус:** ✅ ЗАВЕРШЕНО И ОЧИЩЕНО

---

## 📋 ИТОГОВОЕ СОСТОЯНИЕ

### ✅ Исправленная проблема:

**Проблема:** После создания события пользователь попадал на список событий (`/events`) вместо страницы только что созданного события (`/events/{id}`).

**Корневая причина:**
1. Дублирование компонентов (старый `create-event-page-content.tsx` + новый `create-event-client.tsx`)
2. Неправильный редирект в рабочем компоненте: `router.push('/events')` вместо `router.push(\`/events/${id}\`)`

**Решение:**
1. ✅ Исправлен редирект в `create-event-client.tsx`
2. ✅ Удалён старый неиспользуемый компонент
3. ✅ Debug логи удалены (оставлен только критичный `console.error`)

---

## 🎯 ФИНАЛЬНАЯ РЕАЛИЗАЦИЯ

### Правильный компонент: `src/app/(app)/events/create/create-event-client.tsx`

```typescript
const handleSubmit = async (payload: Record<string, unknown>, retryWithCredit = false) => {
  const url = retryWithCredit ? "/api/events?confirm_credit=1" : "/api/events";
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  // Handle 409 CREDIT_CONFIRMATION_REQUIRED
  if (res.status === 409) {
    const error409 = await res.json();
    const meta = error409.error?.meta;
    
    if (meta) {
      setPendingPayload(payload);
      showConfirmation({
        creditCode: meta.creditCode,
        eventId: meta.eventId,
        requestedParticipants: meta.requestedParticipants,
      });
      return;
    }
  }
  
  // Handle 402 PAYWALL
  if (res.status === 402) {
    const errorData = await res.json();
    const paywallError = errorData.error?.details || errorData.error;
    
    if (paywallError) {
      showPaywall(paywallError);
      return;
    }
  }
  
  // Handle other errors
  if (!res.ok) {
    await handleApiError(res);
    return;
  }
  
  // ✅ SUCCESS - redirect to created event page
  const response = await res.json();
  const createdEvent = response.data?.event || response.event;
  
  if (createdEvent?.id) {
    router.push(`/events/${createdEvent.id}`); // ✅ Правильный редирект!
  } else {
    // Fallback (не должно случиться)
    console.error('[CreateEvent] No event.id in response:', response);
    router.push('/events');
    router.refresh();
  }
};
```

### Backend: `src/app/api/events/route.ts`

```typescript
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserFromMiddleware(request);
    
    if (!currentUser) {
      throw new UnauthorizedError("Авторизация обязательна для создания события");
    }
    
    const url = new URL(request.url);
    const confirmCredit = url.searchParams.get("confirm_credit") === "1";
    
    const payload = await request.json();
    const event = await createEvent(payload, currentUser, confirmCredit);
    
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
    
    return respondError(err);
  }
}
```

**Response структура:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "uuid-here",
      "title": "...",
      "description": "...",
      "dateTime": "...",
      ...
    }
  }
}
```

### Service Layer: `src/lib/services/events.ts`

```typescript
export async function createEvent(
  input: unknown, 
  currentUser: CurrentUser | null,
  confirmCredit: boolean = false
) {
  if (!currentUser) {
    throw new AuthError("Авторизация обязательна для создания события", undefined, 401);
  }
  
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
  
  // ⚡ Billing v5 Enforcement
  const { enforceEventPublish } = await import("@/lib/services/accessControl");
  
  await enforceEventPublish({
    userId: currentUser.id,
    clubId: validated.clubId ?? null,
    maxParticipants: validated.maxParticipants,
    isPaid: validated.isPaid,
    eventId: undefined,
  }, confirmCredit);
  
  // Create event in DB (with credit transaction if needed)
  const shouldUseCredit = confirmCredit && validated.clubId === null && 
    validated.maxParticipants && validated.maxParticipants > 15 && validated.maxParticipants <= 500;
  
  let event: Event;
  
  if (shouldUseCredit) {
    // Wrap in credit transaction
    const { executeWithCreditTransaction } = await import("@/lib/services/creditTransaction");
    event = await executeWithCreditTransaction(
      currentUser.id,
      "EVENT_UPGRADE_500",
      undefined,
      async () => {
        // Create event + relations
        await ensureUserExists(currentUser.id, currentUser.name ?? undefined);
        const db = await createEventRecord({ ...validated, createdByUserId: currentUser.id });
        
        if (validated.allowedBrandIds?.length) {
          await replaceAllowedBrands(db.id, validated.allowedBrandIds);
        }
        
        if (validated.locations && validated.locations.length > 0) {
          await saveLocations(db.id, validated.locations);
        } else {
          await createDefaultLocation(db.id, "Точка сбора");
        }
        
        await upsertEventAccess(db.id, currentUser.id, "owner");
        
        const mappedEvent = mapDbEventToDomain(db);
        mappedEvent.allowedBrands = await getAllowedBrands(db.id);
        mappedEvent.locations = await getLocationsByEventId(db.id);
        
        return mappedEvent;
      }
    );
  } else {
    // Direct save
    await ensureUserExists(currentUser.id, currentUser.name ?? undefined);
    const db = await createEventRecord({ ...validated, createdByUserId: currentUser.id });
    
    // ... same logic as above without credit transaction
    
    event = mapDbEventToDomain(db);
    event.allowedBrands = await getAllowedBrands(db.id);
    event.locations = await getLocationsByEventId(db.id);
  }
  
  // Queue notifications (non-blocking)
  if (event.visibility === "public" && event.cityId) {
    queueNewEventNotificationsAsync(event).catch((err) => {
      log.errorWithStack("Failed to queue new event notifications", err, { eventId: event.id });
    });
  }
  
  return event; // ✅ Возвращает event с id
}
```

---

## 📊 FLOW (Успешное создание)

```
1. User заполняет форму EventForm
   ↓
2. handleSubmit(payload) → POST /api/events
   ↓
3. API Route:
   - Auth check (getCurrentUserFromMiddleware)
   - Extract confirm_credit param
   - Call createEvent(payload, currentUser, confirmCredit)
   ↓
4. Service Layer (createEvent):
   - Validate input (Zod schema)
   - Billing enforcement (enforceEventPublish)
   - Create event in DB
   - Create relations (brands, locations, access)
   - Return Event object with id
   ↓
5. API Route:
   - respondJSON({ event }, undefined, 201)
   - Response: { success: true, data: { event: { id: 'uuid', ... } } }
   ↓
6. Frontend (handleSubmit):
   - Extract event.id from response
   - router.push(`/events/${event.id}`)
   ↓
7. Next.js navigation:
   - /events/[id]/page.tsx
   - Loads event details
   - Shows event page to user ✅
```

---

## 🧹 CLEANUP

### Удалены debug логи:

- ❌ `console.log('[API /events POST] ...')` (все логи из API route)
- ❌ `console.log('[Service createEvent] ...')` (все логи из service layer)
- ❌ `console.log('[CreateEvent] ...')` (большинство логов из frontend)

### Оставлен критичный лог:

- ✅ `console.error('[CreateEvent] No event.id in response:', response)` (только если нет id в ответе)

### Удалены файлы:

- ❌ `src/components/events/create-event-page-content.tsx` (старый неиспользуемый компонент)

---

## 📚 SSOT СТАТУС

### API SSOT (`docs/ssot/api-ssot.md`)

✅ **Уже актуален**, содержит правильную информацию:

**API-026: Create Event**
- Method: POST `/api/events`
- Auth: Required (JWT)
- Response: 201 Created with `{ success: true, data: { event: { id, ... } } }`
- Errors: 400 (validation), 401 (auth), 402 (paywall), 409 (credit confirmation)
- Note: Response includes `id` field needed for navigation

**Frontend client:**
- Extracts `response.data?.event || response.event`
- Redirects to `/events/${createdEvent.id}`
- Fallback to `/events` if no id

---

## ✅ VERIFICATION CHECKLIST

- [x] Правильный компонент определён: `create-event-client.tsx` ✅
- [x] Редирект исправлен: `/events` → `/events/{id}` ✅
- [x] Старый компонент удалён: `create-event-page-content.tsx` ✅
- [x] Debug логи удалены (кроме критичного) ✅
- [x] Линтеры пройдены ✅
- [x] TypeScript без ошибок ✅
- [x] SSOT актуален ✅

---

## 🎬 КОММИТЫ

1. **ec314b0** - feat: add comprehensive debug logs (неправильный файл, но обнаружил проблему)
2. **b300c26** - fix: redirect to created event page (CRITICAL FIX)
3. **[текущий]** - chore: remove debug logs and cleanup

---

## 📖 LESSONS LEARNED

### 1. Проверяй дублирование компонентов

**Симптомы:**
- Изменения не работают
- Логи не появляются
- Поведение не меняется

**Диагностика:**
```bash
# Найти все файлы с похожими именами
find src -name "*create-event*"

# Проверить импорты
grep -r "CreateEventPageContent" src/
grep -r "CreateEventPageClient" src/

# Проверить page.tsx
cat src/app/(app)/events/create/page.tsx
```

### 2. Naming Conventions

**Старый паттерн (deprecated):**
- `src/components/{feature}/{feature}-page-content.tsx`

**Новый паттерн (current):**
- `src/app/(app)/{feature}/{action}/{action}-client.tsx`
- Пример: `src/app/(app)/events/create/create-event-client.tsx`

### 3. Debug логи полезны только временно

- ✅ Добавляй для диагностики
- ✅ Удаляй после исправления
- ✅ Оставляй только критичные ошибки (`console.error`)
- ❌ Не коммить в production

---

## 🎉 РЕЗУЛЬТАТ

**Теперь после создания события:**

1. ✅ User создаёт событие через форму
2. ✅ POST `/api/events` → 201 Created
3. ✅ Response: `{ data: { event: { id: 'uuid', ... } } }`
4. ✅ Frontend: `router.push(\`/events/${uuid}\`)`
5. ✅ User видит страницу только что созданного события

**Никаких дополнительных действий не требуется!** 🎊

