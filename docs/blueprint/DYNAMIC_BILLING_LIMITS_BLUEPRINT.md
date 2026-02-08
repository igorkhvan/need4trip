---
Status: ACCEPTED
Created: 2026-02-08
Author: Cursor AI
---

# Blueprint: Динамические лимиты биллинга из БД

**Цель:** Устранить все захардкоженные значения лимитов (15, 500) и обеспечить, чтобы при изменении лимитов в БД — UI и backend корректно реагировали.

**Scope:** Персональные события с разовым апгрейдом (one-off credit path). Клубный путь уже полностью динамический.

---

## 1. Текущее состояние

### 1.1 Источники лимитов в БД

| Таблица | Поле | Пример значения | Описание |
|---|---|---|---|
| `club_plans` (id=`free`) | `max_event_participants` | 15 | Базовый лимит Free плана |
| `billing_products` (code=`EVENT_UPGRADE_500`) | `constraints.max_participants` | 500 | Лимит разового апгрейда |

### 1.2 Карта хардкодов

| # | Файл | Строка | Хардкод | Тип | Решение |
|---|---|---|---|---|---|
| H1 | `eventEntitlements.ts` | 120 | `500` | Бизнес-логика | Шаг 1: читать из `billing_products` |
| H2 | `events.ts` | 480 | `> 15 && <= 500` | Бизнес-логика | Шаг 2: заменить на `{ requiresCredit }` из `enforceEventPublish` |
| H3 | `events.ts` | 804 | `> 15 && <= 500` | Бизнес-логика | Шаг 2: аналогично |
| H4 | `event.ts` (Zod) | 262 | `.max(500)` | Валидация | Шаг 3: убрать (backend enforcement достаточен) |
| H5-H9 | Frontend fallbacks | разные | `15` | Error fallback | Оставить (last resort) |
| H10 | `create-event-client.tsx` | 323 | `"до 500 участников"` | UI text | Шаг 5: динамический текст |

### 1.3 Оригинальный баг

При редактировании personal event с consumed credit, UI показывает "Ваш лимит: 15" вместо реального эффективного лимита. Фронтенд не знает об entitlements события.

---

## 2. План изменений

### Шаг 1: `eventEntitlements.ts` — лимит апгрейда из БД

**Файл:** `src/lib/services/eventEntitlements.ts`  
**Хардкод:** H1

Заменить `maxEventParticipants: 500` на значение из `billing_products.constraints.max_participants`.

---

### Шаг 2: `enforceEventPublish` → return `{ requiresCredit }` + убрать `shouldUseCredit`

**Файлы:** `src/lib/services/accessControl.ts`, `src/lib/services/events.ts`  
**Хардкоды:** H2, H3

**Проблема:** `events.ts` дублирует логику, которую `enforceEventPublish` уже вычислил. Переменная `shouldUseCredit` использует хардкоды `> 15 && <= 500`.

**Решение:** Изменить возвращаемый тип `enforceEventPublish` с `void` на `EnforcementResult`:

```ts
interface EnforcementResult {
  requiresCredit: boolean;
}
```

`enforceEventPublish` уже знает, нужен ли кредит (проходит все decision-ветки). Достаточно вернуть это решение вместо `void`.

В `events.ts` заменить:
```ts
// БЫЛО (хардкоды):
await enforceEventPublish({ ... }, confirmCredit);
const shouldUseCredit = confirmCredit && clubId === null && maxParticipants > 15 && maxParticipants <= 500;

// СТАЛО (из enforcement):
const { requiresCredit } = await enforceEventPublish({ ... }, confirmCredit);
```

**Обратная совместимость:** Вызовы `await enforceEventPublish(...)` в тестах, не использующие возвращаемое значение, продолжат работать без изменений.

---

### Шаг 3: Убрать `.max(500)` из Zod update schema

**Файл:** `src/lib/types/event.ts`  
**Хардкод:** H4

Create schema уже не имеет `.max(500)`. Update schema должна быть консистентна. Backend enforcement — единственный авторитетный источник проверки лимитов.

---

### Шаг 4: Обогатить `GET /api/events/:id` полем `effectiveMaxParticipants`

**Файлы:** `src/app/api/events/[id]/route.ts`, `src/app/(app)/events/[id]/edit/edit-event-client.tsx`

**Вместо** создания нового endpoint + hook, обогатить существующий ответ:

```ts
// В GET /api/events/[id]/route.ts — только для owner
if (currentUser && event.createdByUserId === currentUser.id) {
  const entitlements = await getEffectiveEventEntitlements({
    userId: currentUser.id, eventId: id, clubId: event.clubId,
  });
  hydrated.effectiveMaxParticipants = entitlements.maxEventParticipants;
}
```

В `edit-event-client.tsx` использовать `event.effectiveMaxParticipants` при формировании `planLimits`.

**Результат:** Нет нового endpoint, нет нового hook, нет нового HTTP-запроса.

---

### Шаг 5: Динамический текст баннера

**Файл:** `src/app/(app)/events/create/create-event-client.tsx`  
**Хардкод:** H10

Заменить "до 500 участников" на динамическое значение из product info.

---

### Шаг 6: StaticCache для `billing_products`

**Файл:** `src/lib/db/billingProductsRepo.ts`

Добавить `StaticCache` по образцу `planRepo.ts` (TTL 5 мин). Шаги 1-2 добавляют вызовы `getProductByCode` в hot paths.

---

## 3. Порядок выполнения

```
Шаг 6 (Cache)       ← сначала, оптимизирует все последующие шаги
  ↓
Шаг 1 (entitlements) ← ядро: динамический лимит апгрейда
  ↓
Шаг 2 (enforcement)  ← убирает shouldUseCredit, зависит от Шага 1
  ↓
Шаг 3 (Zod)          ← тривиальный, после Шага 2
  ↓
Шаг 4 (Frontend)     ← фикс UX бага, зависит от Шага 1
  ↓
Шаг 5 (Banner text)  ← косметика
```

**Группировка коммитов:**
1. **Коммит 1:** Шаги 6 + 1 + 2 + 3 (backend: динамические лимиты)
2. **Коммит 2:** Шаг 4 + 5 (frontend: UX фикс)
