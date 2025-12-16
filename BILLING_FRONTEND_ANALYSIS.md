# 🔍 Анализ: Ограничения тарифов на фронтенде

**Дата:** 16 декабря 2024  
**Статус:** ✅ Анализ complete  
**Цель:** Найти все hardcoded ограничения тарифов на фронтенде и подключить их к backend

---

## 📋 Executive Summary

### Текущая ситуация:

✅ **Backend:** Полностью реализована система биллинга v2.0
- `accessControl.ts` - централизованная проверка лимитов
- `PaywallError` - правильный формат ошибок (402)
- Динамические лимиты из БД (`club_plans`)

❌ **Frontend:** Есть hardcoded ограничения
- Event form: жестко задано max=15 participants
- Validation: проверка на 1-15 в клиентском коде
- Нет динамической подгрузки лимитов текущего плана

---

## 🔴 Проблемы (Issues Found)

### Issue #1: Hardcoded лимит участников в Event Form

**Файл:** `src/components/events/event-form.tsx`

**Hardcoded значения:**

```typescript
// Строка 228-230: Валидация
if (participantsCount < 1 || participantsCount > 15) {
  issues.maxParticipants = "Допустимый диапазон: 1–15.";
}

// Строка 484: HTML max attribute
<Input
  max={15}
  placeholder="15"
/>
```

**Проблема:**
- Лимит 15 жестко прописан на фронте
- Не учитывает текущий тариф клуба
- Не позволяет создать событие на 50+ участников даже если у клуба есть подписка

---

### Issue #2: Валидация на уровне Zod Schema

**Файл:** `src/lib/types/event.ts`

```typescript
// Строка 149: eventCreateSchema
maxParticipants: z.number().int().min(1).max(500).nullable().optional()

// Строка 181: eventUpdateSchema  
maxParticipants: z.number().int().min(1).max(500).nullable().optional()
```

**Проблема:**
- Максимум 500 захардкожен в схеме
- Не учитывает, что "Unlimited" план позволяет ∞ участников
- Схема валидирует до того, как бэкенд проверит лимиты

---

### Issue #3: FREE_LIMITS hardcoded на фронте

**Файл:** `src/lib/types/billing.ts`

```typescript
// Строка 179-183
export const FREE_LIMITS = {
  maxEventParticipants: 15,
  allowPaidEvents: false,
  allowCsvExport: false,
} as const;
```

**Статус:** ⚠️ Полудублирование
- Эти же лимиты есть на бэкенде в `accessControl.ts`
- На фронте используются только для отображения (/pricing page)
- Не критично, но желательно получать с `/api/plans`

---

### Issue #4: Отсутствует динамическая подгрузка лимитов

**Проблема:**
- Event form не знает о текущем плане клуба
- Не показывает пользователю его реальные лимиты
- UX: пользователь узнает об ограничении только после отправки формы (402)

**Желательно:**
```typescript
// В event form:
const { plan, limits } = useClubPlan(clubId);

// Показывать:
"Ваш план: Club 50 (до 50 участников)"
"Для большего количества перейдите на Club 500"
```

---

## ✅ Что уже работает правильно

### 1. Backend Enforcement ✅

**Файл:** `src/lib/services/accessControl.ts`

```typescript
export async function enforceClubAction(params: {
  clubId: string;
  action: BillingActionCode;
  context?: {
    eventParticipantsCount?: number;
    // ...
  };
})
```

**Алгоритм:**
1. Загружает subscription из БД
2. Загружает plan limits из БД
3. Проверяет статус (active/grace/expired)
4. Применяет policy rules (billing_policy_actions)
5. Проверяет лимиты плана
6. Выбрасывает `PaywallError` (402) при нарушении

✅ **Работает идеально!**

---

### 2. PaywallError Format ✅

**Файл:** `src/lib/errors.ts`

```typescript
export class PaywallError extends AppError {
  reason: string;
  currentPlanId?: string;
  requiredPlanId?: string;
  meta?: Record<string, unknown>;
  cta: { type: "OPEN_PRICING"; href: "/pricing" };
}
```

✅ Machine-readable формат  
✅ Соответствует спецификации (docs/BILLING_AND_LIMITS.md)

---

### 3. PaywallModal Component ✅

**Файл:** `src/components/billing/PaywallModal.tsx`

```typescript
export function PaywallModal({ open, onClose, error }: PaywallModalProps) {
  // Показывает понятные сообщения
  // Кнопка "Посмотреть тарифы" → /pricing
}

export function usePaywall() {
  // Hook для перехвата 402 ошибок
}
```

✅ Правильный UI компонент  
✅ Hook готов к использованию  
✅ Локализованные сообщения

---

### 4. API Response Handler ✅

**Файл:** `src/lib/api/response.ts`

```typescript
export function respondError(error: AppError | Error | unknown) {
  if (isPaywallError(error)) {
    return NextResponse.json(
      { success: false, error: { details: error.toJSON() } },
      { status: 402 }
    );
  }
}
```

✅ Автоматически сериализует PaywallError  
✅ Правильный HTTP 402 статус

---

### 5. Create Event - Backend Check ✅

**Файл:** `src/lib/services/events.ts`

```typescript
export async function createEvent(input: unknown, currentUser: CurrentUser | null) {
  // ...
  if (parsed.clubId) {
    await enforceClubAction({
      clubId: parsed.clubId,
      action: parsed.isPaid ? "CLUB_CREATE_PAID_EVENT" : "CLUB_CREATE_EVENT",
      context: {
        eventParticipantsCount: parsed.maxParticipants ?? undefined,
        isPaidEvent: parsed.isPaid,
      },
    });
  }
  // ...
}
```

✅ **Правильно вызывается проверка лимитов!**

---

## 🎯 Что НЕ работает сейчас (Реальные баги)

### Bug #1: Нельзя создать событие >15 участников на фронте

**Steps to reproduce:**
1. Пользователь с Club 50 планом (лимит 50)
2. Открывает форму создания события
3. Пытается указать 30 участников
4. **Frontend validation блокирует:** "Допустимый диапазон: 1–15"
5. **Backend никогда не вызывается**

**Expected:** Можно указать до 50 (лимит плана)  
**Actual:** Блокируется на 15 (hardcoded)

---

### Bug #2: Unlimited план не может создать событие >500

**Steps to reproduce:**
1. Клуб с Unlimited планом (∞ участников)
2. Пытается создать событие на 1000 участников
3. **Zod schema блокирует:** `max(500)`
4. **Backend никогда не вызывается**

**Expected:** Можно указать любое число  
**Actual:** Блокируется на 500 (hardcoded schema)

---

## 📊 Где используется paywall сейчас

### 1. CSV Export (⚠️ Stub Implementation)

**Файл:** `src/app/api/clubs/[id]/export/route.ts`

```typescript
// TODO: Migrate to new billing v2.0 accessControl system
const checkPaywall = async (...args: any[]) => null;  // STUB!
```

**Статус:** ❌ НЕ РАБОТАЕТ  
**Проблема:** Временная заглушка, не проверяет лимиты

---

### 2. Club Members List (❌ Commented Out)

**Файл:** `src/components/clubs/club-members-list.tsx`

```typescript
// TODO: Migrate to new billing v2.0 PaywallModal
// TODO: Migrate to usePaywall from billing v2.0
// TODO: Handle 402 Paywall with new billing v2.0 modal
```

**Статус:** ❌ Старый код закомментирован, новый не подключен

---

### 3. Event Creation (✅ Работает!)

**Файл:** `src/lib/services/events.ts` → `enforceClubAction()`

**Статус:** ✅ Правильно проверяет лимиты  
**Но:** Frontend validation блокирует раньше!

---

## 🔧 Архитектурные моменты

### Правильная flow сейчас:

```
User fills form
  ↓
Frontend validation (HARDCODED 1-15) ❌
  ↓
[BLOCKED HERE if >15]
  ↓
POST /api/events
  ↓
eventCreateSchema.parse() (max 500) ❌
  ↓
[BLOCKED HERE if >500]
  ↓
createEvent() service
  ↓
enforceClubAction() ✅
  ↓
Check DB subscription + plan limits ✅
  ↓
If violated → PaywallError (402) ✅
```

### Правильная flow должна быть:

```
User fills form
  ↓
Frontend shows current plan limits ℹ️
"Club 50: до 50 участников"
  ↓
Frontend validation (1 - currentPlanLimit) ✅
  ↓
POST /api/events
  ↓
eventCreateSchema.parse() (remove max!) ✅
  ↓
createEvent() service
  ↓
enforceClubAction() ✅
  ↓
Check DB subscription + plan limits ✅
  ↓
If violated → PaywallError (402) ✅
  ↓
Frontend catches 402 → shows PaywallModal ✅
```

---

## 📝 API для получения лимитов

### Существует: GET /api/plans ✅

**Файл:** `src/app/api/plans/route.ts`

```typescript
export async function GET() {
  const plans = await listPublicPlans();
  
  // + добавляет виртуальный Free plan
  const allPlans = [
    {
      id: "free",
      title: "Free",
      maxMembers: null,
      maxEventParticipants: 15,
      allowPaidEvents: false,
      allowCsvExport: false,
    },
    ...plans,
  ];
  
  return respondSuccess(allPlans);
}
```

**Статус:** ✅ API готов  
**Используется:** Только на `/pricing` странице  
**Не используется:** В event form (нужно подключить!)

---

## 🎯 Рекомендации (Plan of Action)

### 1. Добавить API: GET /api/clubs/[id]/current-plan

**Зачем:** 
- Получать текущий план конкретного клуба
- Возвращать лимиты для UI

**Response:**
```typescript
{
  "success": true,
  "data": {
    "planId": "club_50",
    "planTitle": "Club 50",
    "subscription": {
      "status": "active",
      "currentPeriodEnd": "2025-01-15T00:00:00Z"
    },
    "limits": {
      "maxMembers": 50,
      "maxEventParticipants": 50,
      "allowPaidEvents": true,
      "allowCsvExport": true
    }
  }
}
```

**Использовать:** `getClubCurrentPlan()` из `accessControl.ts` (уже есть!)

---

### 2. Создать hook: useClubPlan(clubId)

**Файл:** `src/hooks/use-club-plan.ts`

```typescript
export function useClubPlan(clubId: string | null) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!clubId) {
      setPlan({ planId: "free", limits: FREE_LIMITS });
      return;
    }
    
    fetchClubPlan(clubId).then(setPlan);
  }, [clubId]);
  
  return { plan, limits: plan?.limits, loading };
}
```

---

### 3. Обновить Event Form

**Изменения:**

1. **Подгрузить лимиты:**
```typescript
const { limits, loading } = useClubPlan(club?.id);
const maxAllowed = limits?.maxEventParticipants ?? 15;
```

2. **Динамическая валидация:**
```typescript
if (participantsCount > maxAllowed) {
  issues.maxParticipants = `Максимум для вашего плана: ${maxAllowed}`;
}
```

3. **Показать hint:**
```tsx
<Label>
  Максимум участников
  {limits && (
    <span className="text-muted-foreground">
      (ваш лимит: {limits.maxEventParticipants === null ? '∞' : limits.maxEventParticipants})
    </span>
  )}
</Label>
```

4. **Динамический max:**
```tsx
<Input
  max={maxAllowed === null ? undefined : maxAllowed}
  placeholder={String(maxAllowed ?? '')}
/>
```

---

### 4. Убрать hardcoded лимиты из Zod схемы

**Файл:** `src/lib/types/event.ts`

**Было:**
```typescript
maxParticipants: z.number().int().min(1).max(500).nullable().optional()
```

**Должно быть:**
```typescript
maxParticipants: z.number().int().min(1).nullable().optional()
// Backend сам проверит лимит плана через enforceClubAction()
```

**Причина:** Backend - единственный источник истины о лимитах

---

### 5. Подключить PaywallModal в Event Form

**Добавить:**
```typescript
const { showPaywall, PaywallModalComponent } = usePaywall();

const handleSubmit = async () => {
  try {
    await onSubmit(payload);
  } catch (err) {
    if (err.response?.status === 402) {
      showPaywall(err.response.data.error.details);
      return;
    }
    // handle other errors
  }
};

return (
  <>
    <form onSubmit={handleSubmit}>...</form>
    {PaywallModalComponent}
  </>
);
```

---

### 6. Мигрировать CSV Export

**Файл:** `src/app/api/clubs/[id]/export/route.ts`

**Заменить stub:**
```typescript
// OLD
const checkPaywall = async (...args: any[]) => null;

// NEW
import { enforceClubAction } from "@/lib/services/accessControl";

await enforceClubAction({
  clubId,
  action: "CLUB_EXPORT_PARTICIPANTS_CSV",
});
```

---

### 7. Мигрировать Club Members

**Файл:** `src/components/clubs/club-members-list.tsx`

**Раскомментировать и обновить:**
```typescript
const { showPaywall, PaywallModalComponent } = usePaywall();

const handleExportCSV = async () => {
  try {
    const res = await fetch(`/api/clubs/${clubId}/export`);
    
    if (!res.ok) {
      if (res.status === 402) {
        const data = await res.json();
        showPaywall(data.error.details);
        return;
      }
      throw new Error("Export failed");
    }
    
    // Download CSV
  } catch (err) {
    toast.error(getErrorMessage(err));
  }
};
```

---

## 📋 Checklist: What Needs to Be Done

### Backend Tasks:

- [ ] **API:** `GET /api/clubs/[id]/current-plan` (новый endpoint)
  - Использовать `getClubCurrentPlan()` (уже есть)
  - Вернуть plan + limits + subscription status

- [ ] **API:** `GET /api/clubs/[id]/export` (мигрировать)
  - Удалить stub `checkPaywall`
  - Добавить `enforceClubAction("CLUB_EXPORT_PARTICIPANTS_CSV")`

- [ ] **Schema:** `src/lib/types/event.ts`
  - Убрать `.max(500)` из `maxParticipants`
  - Backend проверит через `enforceClubAction()`

---

### Frontend Tasks:

- [ ] **Hook:** `src/hooks/use-club-plan.ts` (создать)
  - Загружает план клуба из API
  - Кэширует результат
  - Возвращает `{ plan, limits, loading }`

- [ ] **Component:** `src/components/events/event-form.tsx` (обновить)
  - Использовать `useClubPlan(club?.id)`
  - Динамическая валидация (1 - limits.maxEventParticipants)
  - Динамический `<Input max={...} />`
  - Показать hint с текущим лимитом
  - Подключить `usePaywall()` hook
  - Ловить 402 и показывать PaywallModal

- [ ] **Component:** `src/components/clubs/club-members-list.tsx` (мигрировать)
  - Раскомментировать paywall логику
  - Использовать `usePaywall()` hook
  - Обработать 402 при CSV export

- [ ] **Type:** `src/lib/types/billing.ts` (опционально)
  - Можно оставить FREE_LIMITS для reference
  - Или загружать из `/api/plans`

---

## 🧪 Testing Plan

### 1. Free Plan Tests:

- [ ] Попытка создать событие на 10 участников → OK
- [ ] Попытка создать событие на 16 участников → Frontend блокирует
- [ ] Попытка создать платное событие → Backend 402 PaywallError
- [ ] Попытка экспорта CSV → Backend 402 PaywallError

---

### 2. Club 50 Tests:

- [ ] Попытка создать событие на 30 участников → OK
- [ ] Попытка создать событие на 50 участников → OK
- [ ] Попытка создать событие на 51 участника → Backend 402 (требует Club 500)
- [ ] Экспорт CSV → OK
- [ ] Создание платного события → OK

---

### 3. Unlimited Tests:

- [ ] Создание события на 1000 участников → OK
- [ ] Создание события на 10000 участников → OK (нет лимита)
- [ ] Все features доступны → OK

---

### 4. Grace Period Tests:

- [ ] Subscription status = "grace"
- [ ] Действия по `billing_policy_actions` → разрешены/запрещены
- [ ] PaywallModal показывает правильное сообщение

---

### 5. Expired Subscription Tests:

- [ ] Subscription status = "expired"
- [ ] Создание события → Backend 402 (SUBSCRIPTION_EXPIRED)
- [ ] Экспорт CSV → Backend 402
- [ ] PaywallModal с CTA "Продлить подписку"

---

## 📊 Summary

### Что работает:

✅ Backend enforcement через `enforceClubAction()`  
✅ PaywallError класс и формат  
✅ PaywallModal компонент  
✅ API `/api/plans` возвращает все тарифы  
✅ Event creation проверяет лимиты (если проходит validation)

### Что НЕ работает:

❌ Frontend блокирует >15 участников (hardcoded)  
❌ Zod schema блокирует >500 участников  
❌ Event form не показывает лимиты текущего плана  
❌ CSV export использует stub вместо real check  
❌ Club members list не обрабатывает paywall

### Что нужно сделать:

1. **Backend:** Добавить `GET /api/clubs/[id]/current-plan`
2. **Frontend:** Создать `useClubPlan()` hook
3. **Frontend:** Обновить Event Form (динамические лимиты)
4. **Backend:** Убрать `.max(500)` из Zod schema
5. **Frontend:** Подключить PaywallModal в формах
6. **Backend:** Мигрировать CSV export на `enforceClubAction()`
7. **Frontend:** Мигрировать Club members на новый paywall

### Оценка работы:

- Backend API: **2 часа**
- useClubPlan hook: **1 час**
- Event Form updates: **2 часа**
- CSV + Members migration: **2 часа**
- Testing: **2 часа**

**Total: ~9 часов работы**

---

## 🎯 Priority

### P0 (Critical - блокирует использование):

1. Event Form - убрать hardcoded лимит 15
2. Event Form - динамические лимиты из API
3. Zod schema - убрать max(500)

### P1 (Important - улучшает UX):

4. Показать текущий лимит в UI
5. PaywallModal при превышении лимита
6. CSV export реальная проверка

### P2 (Nice to have):

7. Оптимизация: кэширование планов
8. Loading states для useClubPlan
9. Error boundaries для paywall

---

**Статус анализа:** ✅ Complete  
**Готов к реализации:** ✅ Yes  
**Следующий шаг:** Начать с P0 задач
