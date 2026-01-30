# Глубокий Анализ: UX Проблемы при Создании/Редактировании События

**Дата:** 31 декабря 2024  
**Статус:** 🔴 3 критичных UX проблемы  
**Источник:** User feedback  
**Scope:** Event create/edit flow + credit confirmation

---

## 📋 Executive Summary

Обнаружено **3 критичных UX проблемы** в flow создания/редактирования события:

1. **Race Condition**: Кнопка сохранения становится активной между завершением save и редиректом → возможно создание дубликата события
2. **Missing Loading State**: После подтверждения кредита модалка закрывается, но кнопка остаётся активной → пользователь может нажать повторно
3. **Incorrect Limit Display**: При редактировании события с кредитом показывается базовый лимит (15) вместо увеличенного лимита (500) → пользователя просят потратить ещё один кредит

**Критичность:** 
- Проблема #1 → Возможное создание дубликатов (data integrity)
- Проблема #2 → Возможная двойная попытка use credit (billing integrity)
- Проблема #3 → Очень плохой UX + waste of credits (user frustration + billing confusion)

---

## 🔍 Проблема #1: Race Condition в Save Button State

### Описание

При сохранении события:
1. Кнопка становится disabled с текстом "Сохраняем..."
2. После успешного сохранения кнопка становится АКТИВНОЙ (enabled)
3. Только ПОСЛЕ этого происходит редирект

В этот промежуток времени пользователь может успеть нажать кнопку повторно → создаётся второе событие.

### Root Cause Analysis

#### 1. EventForm Component State Management

**Файл:** `src/components/events/event-form.tsx`

```typescript:434-488
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const { issues, parsedDate, trimmedTitle, trimmedDescription, trimmedPrice } = validate();
  
  if (Object.keys(issues).length) {
    setFieldErrors(issues);
    setTimeout(() => { scrollToFirstError({ offset: 100 }); }, 100);
    return;
  }
  
  setIsSubmitting(true);  // ✅ Button disabled
  setErrorMessage(null);
  setFieldErrors({});
  
  const payload = { /* ... */ };
  
  try {
    await onSubmit(payload);  // ⚠️ Parent handles redirect
    // Редирект делает родительский компонент (после onSubmit)
  } catch (err: any) {
    setErrorMessage(getErrorMessage(err, "Не удалось сохранить событие. Попробуйте ещё раз."));
  } finally {
    setIsSubmitting(false);  // ❌ Button re-enabled BEFORE redirect!
  }
};
```

**Проблема:**
- `finally` block выполняется СРАЗУ после `onSubmit` resolve
- Но `onSubmit` не ждёт редирект — он делается в parent component
- Между `setIsSubmitting(false)` и реальным редиректом проходит 50-200ms
- В это время кнопка активна!

#### 2. Parent Component (Create Flow)

**Файл:** `src/app/(app)/events/create/create-event-client.tsx`

```typescript:69-139
const handleSubmit = async (payload: Record<string, unknown>, retryWithCredit = false) => {
  const url = retryWithCredit ? "/api/events?confirm_credit=1" : "/api/events";
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  // Handle 409 CREDIT_CONFIRMATION_REQUIRED
  if (res.status === 409) {
    // ... show confirmation modal
    return;
  }
  
  // Handle 402 PAYWALL
  if (res.status === 402) {
    // ... show paywall modal
    return;
  }
  
  // Handle other errors
  if (!res.ok) {
    await handleApiError(res);
    return;
  }
  
  // ✅ Success - redirect to created event page
  const response = await res.json();
  const createdEvent = response.data?.event || response.event;
  
  if (createdEvent?.id) {
    router.push(`/events/${createdEvent.id}`);  // ⚠️ Async redirect!
  } else {
    router.push('/events');
    router.refresh();
  }
  
  // ❌ Function returns BEFORE redirect completes!
};
```

**Проблема:**
- `router.push()` — асинхронная операция
- Функция `handleSubmit` завершается СРАЗУ после вызова `router.push()`
- EventForm's `finally` block срабатывает → `setIsSubmitting(false)`
- Редирект ещё не произошёл → кнопка активна!

### Timeline (Race Condition Window)

```
Time  | EventForm          | Parent           | Button State | User Can Click?
------|--------------------|-----------------|--------------|-----------------
  0ms | handleSubmit()     |                 | Disabled     | ❌ No
      | setIsSubmitting(true)                                              
      |                    |                 |              |
 50ms | await onSubmit()   | handleSubmit()  | Disabled     | ❌ No
      |                    | fetch POST      |              |
      |                    |                 |              |
300ms |                    | res.ok === true | Disabled     | ❌ No
      |                    | router.push()   |              |
      |                    |                 |              |
305ms | finally block!     |                 | ❌ ENABLED!  | ✅ YES! (RACE WINDOW)
      | setIsSubmitting(false)                                             
      |                    |                 |              |
350ms |                    | redirect start  | Enabled      | ✅ YES!
      |                    |                 |              |
500ms |                    | redirect done   | (unmounted)  | ❌ No
```

**Race Window:** ~50-200ms между `setIsSubmitting(false)` и реальным редиректом.

### Impact

- **Severity:** 🔴 HIGH
- **Frequency:** LOW (требует быстрого двойного клика), но ВОЗМОЖНО
- **User Impact:** Создание дубликата события → confusion, wasted effort cleaning up
- **Data Impact:** Duplicate event records in DB

### Evidence in Code

**EventForm button:**
```typescript:786-788
<Button type="submit" disabled={isSubmitting || isGeneratingRules || disabled}>
  {isSubmitting ? "Сохраняем..." : submitLabel}
</Button>
```

Button становится enabled СРАЗУ после `setIsSubmitting(false)`, даже если редирект ещё не произошёл.

---

## 🔍 Проблема #2: Missing Loading State после Credit Confirmation

### Описание

Flow:
1. Пользователь создаёт событие на 150 участников
2. Система показывает CreditConfirmationModal (409)
3. Пользователь нажимает "Подтвердить и опубликовать"
4. Модалка МОМЕНТАЛЬНО закрывается
5. Страница НЕ показывает loading state
6. Кнопка "Создать событие" АКТИВНА
7. Пользователь может нажать на неё → повторная попытка создания

### Root Cause Analysis

#### 1. Credit Confirmation Modal

**Файл:** `src/components/billing/credit-confirmation-modal.tsx`

```typescript:98-114
<DialogFooter>
  <Button
    variant="outline"
    onClick={onCancel}
    disabled={isLoading}
    className="w-full sm:w-auto"
  >
    Отмена
  </Button>
  <Button
    onClick={onConfirm}
    disabled={isLoading}
    className="w-full sm:w-auto bg-[var(--color-primary)]"
  >
    {isLoading ? 'Публикация...' : 'Подтвердить и опубликовать'}
  </Button>
</DialogFooter>
```

**Проблема:**
- Modal имеет `isLoading` prop
- Но parent НЕ ПЕРЕДАЁТ этот prop!
- Modal закрывается СРАЗУ при клике, без ожидания результата

#### 2. Parent Component (Create Flow)

**Файл:** `src/app/(app)/events/create/create-event-client.tsx`

```typescript:204-218
{modalState.open && modalState.creditCode && (
  <CreditConfirmationModal
    open={modalState.open}
    onOpenChange={hideConfirmation}
    creditCode={modalState.creditCode}
    eventId={modalState.eventId!}
    requestedParticipants={modalState.requestedParticipants!}
    onConfirm={async () => {
      if (pendingPayload) {
        hideConfirmation();  // ❌ Close modal IMMEDIATELY
        await handleSubmit(pendingPayload, true);  // ⚠️ Async operation
      }
    }}
    onCancel={hideConfirmation}
  />
)}
```

**Проблема:**
1. `hideConfirmation()` вызывается СРАЗУ при клике
2. Modal закрывается
3. `handleSubmit()` выполняется АСИНХРОННО
4. Пока `handleSubmit()` работает, EventForm НЕ знает об этом
5. `isSubmitting` state в EventForm === `false`
6. Кнопка активна!

### Timeline (Missing Loading State)

```
Time  | User Action          | Modal State | EventForm State | Button
------|----------------------|-------------|-----------------|--------
  0ms | Click "Подтвердить"  | Open        | isSubmitting=false | Enabled
      | onConfirm() called   |             |                 |
      |                      |             |                 |
  5ms | hideConfirmation()   | Closing     | isSubmitting=false | Enabled
      |                      |             |                 |
 10ms |                      | Closed      | isSubmitting=false | ✅ ENABLED
      | handleSubmit() start |             |                 | (RACE!)
      |                      |             |                 |
 50ms | fetch POST           | Closed      | isSubmitting=false | ✅ ENABLED
      |                      |             |                 |
300ms | Response received    | Closed      | isSubmitting=false | ✅ ENABLED
      | router.push()        |             |                 |
      |                      |             |                 |
500ms | Redirect complete    | (unmounted) | (unmounted)     | (unmounted)
```

**Critical Gap:** 0-500ms после закрытия модалки → кнопка активна, но операция выполняется!

### Impact

- **Severity:** 🔴 HIGH
- **Frequency:** MEDIUM (пользователь видит активную кнопку, может кликнуть из-за непонимания что происходит)
- **User Impact:** Confusion ("Я нажал подтвердить, почему ничего не происходит?") → повторный клик на кнопку
- **Billing Impact:** Возможная попытка создать второе событие с кредитом → может сработать если кредитов несколько

### Evidence in Code

**CreditConfirmationModal Usage:**
```typescript:211-214
onConfirm={async () => {
  if (pendingPayload) {
    hideConfirmation();  // ❌ Instant close
    await handleSubmit(pendingPayload, true);  // Async work
  }
}}
```

Нет передачи loading state из `handleSubmit` обратно в modal.

---

## 🔍 Проблема #3: Incorrect Limit Display при Редактировании Апгрейженного События

### Описание

Сценарий:
1. Пользователь создаёт **personal event** на 150 участников
2. Подтверждает расход `EVENT_UPGRADE_500` credit
3. Событие создаётся успешно с `max_participants = 150`
4. Credit consumed и привязан к событию
5. Пользователь редактирует это событие
6. В поле "Количество экипажей" показывается подсказка: **"Ваш лимит 15"**
7. При попытке сохранить → система снова просит потратить кредит (409)

### Root Cause Analysis

#### 1. Event Edit Page — Plan Limits Loading

**Файл:** `src/app/(app)/events/[id]/edit/page.tsx`

```typescript:70-94
// 6. Load plan limits based on event type
let planLimits: ClubPlanLimits;

if (event.clubId) {
  // Club event → load club plan
  const { plan } = await getClubCurrentPlan(event.clubId);
  planLimits = {
    maxMembers: plan.maxMembers,
    maxEventParticipants: plan.maxEventParticipants,
    allowPaidEvents: plan.allowPaidEvents,
    allowCsvExport: plan.allowCsvExport,
  };
} else {
  // ❌ Regular event → load FREE plan (INCORRECT!)
  const freePlan = await getPlanById("free");
  planLimits = {
    maxMembers: freePlan.maxMembers,
    maxEventParticipants: freePlan.maxEventParticipants,  // ← 15
    allowPaidEvents: freePlan.allowPaidEvents,
    allowCsvExport: freePlan.allowCsvExport,
  };
}
```

**Проблема:**
- Personal events ВСЕГДА получают FREE план (15 participants)
- Но событие УЖЕ ИСПОЛЬЗУЕТ кредит → фактический лимит 500!
- Система НЕ проверяет consumed credits для события

#### 2. EventForm — Hint Display

**Файл:** `src/components/events/event-form.tsx`

```typescript:127-128
// Determine max participants based on plan limits (default to 15 for Free)
const maxAllowedParticipants = planLimitsProp?.maxEventParticipants ?? 15;
```

EventForm получает `planLimits` от parent и показывает hint:
```
"Ваш лимит: {maxAllowedParticipants}"  // ← 15 для personal events
```

Но РЕАЛЬНЫЙ лимит для этого события — 500 (из consumed credit)!

#### 3. Backend Enforcement — Credit Check

**Файл:** `src/lib/services/accessControl.ts`

```typescript:765-771
await enforceEventPublish({
  userId: currentUser.id,
  clubId: existing.club_id,  // NULL для personal events
  maxParticipants: finalMaxParticipants,  // 150
  isPaid: finalIsPaid,
  eventId: id,  // Existing event ID
}, confirmCredit);
```

**Enforcement logic:**
```typescript:422-448
// Decision 1: Within free limits
if (maxParticipants === null || maxParticipants <= freeLimit) {
  return;  // ✅ Allow
}

// Decision 2: Exceeds one-off limit (> 500)
if (maxParticipants > oneOffLimit) {
  throw new PaywallError({ /* CLUB_REQUIRED */ });
}

// Decision 3-5: Between free and one-off limit (16-500)
const creditAvailable = await hasAvailableCredit(userId, "EVENT_UPGRADE_500");

if (!creditAvailable) {
  // ❌ Decision 3: No credit available → PAYWALL
  throw new PaywallError({ /* PUBLISH_REQUIRES_PAYMENT */ });
}

// Decision 4: Has credit, but not confirmed
if (!confirmCredit) {
  // ❌ Return 409 - need confirmation
  throw new CreditConfirmationRequiredError({ /* ... */ });
}
```

**Проблема:**
- Backend НЕ проверяет, что событие УЖЕ ИСПОЛЬЗУЕТ кредит!
- `hasAvailableCredit()` смотрит ТОЛЬКО на **новые** available credits
- Consumed credit для этого события НЕ учитывается
- Система считает что нужен ещё один кредит!

#### 4. Credit Consumption Logic

**Файл:** `src/lib/db/billingCreditsRepo.ts`

Credit consumption работает правильно:
```typescript:148-196
export async function consumeCredit(
  userId: string,
  creditCode: CreditCode,
  eventId: string
): Promise<BillingCredit> {
  // Lock one available credit
  const { data: availableCredit } = await db
    .from("billing_credits")
    .select("*")
    .eq("user_id", userId)
    .eq("credit_code", creditCode)
    .eq("status", "available")  // ← Only NEW credits
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  
  // Mark as consumed
  const { data: consumedCredit } = await db
    .from("billing_credits")
    .update({
      status: "consumed",
      consumed_event_id: eventId,  // ✅ Linked to event
      consumed_at: new Date().toISOString(),
    })
    .eq("id", availableCredit.id)
    .select("*")
    .single();
  
  return mapDbRowToCredit(consumedCredit);
}
```

**НО:**
- При EDIT существующего события, система НЕ проверяет `consumed_event_id`!
- Нет query: "Does this event already have a consumed credit?"

### Missing Logic

Нужен check:
```typescript
// Before enforceEventPublish for existing events
if (eventId) {
  const consumedCredit = await getConsumedCreditForEvent(eventId);
  
  if (consumedCredit) {
    // Event already uses credit → allow edit up to credit limit (500)
    if (maxParticipants <= 500) {
      return;  // ✅ Allow edit
    }
  }
}
```

Но этого НЕТ!

### Impact

- **Severity:** 🔴 CRITICAL
- **Frequency:** HIGH (каждый пользователь с upgraded event столкнётся)
- **User Impact:** 
  - Confusion ("Почему лимит 15? Я же апгрейдил!")
  - Frustration ("Система просит ещё один кредит для моего же события!")
  - Возможная потеря кредитов (если подтвердят повторно)
- **Billing Impact:** 
  - User может потратить ВТОРОЙ кредит на то же событие
  - Система не предотвращает это!

### Evidence in Code

**1. Edit page loads FREE plan для personal events:**
```typescript:83-91
// src/app/(app)/events/[id]/edit/page.tsx
else {
  // Regular event → load FREE plan
  const freePlan = await getPlanById("free");
  planLimits = {
    maxEventParticipants: freePlan.maxEventParticipants,  // ← 15
  };
}
```

**2. Backend НЕ проверяет consumed credits для existing events:**
```typescript
// src/lib/services/accessControl.ts
// NO CHECK for consumed_event_id in enforceEventPublish!
```

**3. Available query:**
```typescript:232-248
export async function getConsumedCreditsForEvent(
  eventId: string
): Promise<BillingCredit[]> {
  // ✅ Function EXISTS but NOT USED in edit flow!
  const { data } = await db
    .from("billing_credits")
    .select("*")
    .eq("consumed_event_id", eventId)
    .eq("status", "consumed");
  
  return data.map(mapDbRowToCredit);
}
```

Функция существует, но НЕ вызывается в edit page или enforcement!

---

## 🔧 Root Cause Summary

| Проблема | Root Cause | Missing Logic |
|----------|-----------|---------------|
| **#1: Save Button Race** | `finally` block в EventForm re-enables button BEFORE parent redirect completes | No "redirect in progress" state propagation from parent |
| **#2: Credit Modal Gap** | Modal closes IMMEDIATELY on confirm, but async save happens after close | No loading state passed from parent back to modal |
| **#3: Wrong Limit Display** | Edit page loads FREE plan for personal events, ignores consumed credits | No check for consumed credits when loading plan limits |

---

## 📊 Impact Matrix

| Проблема | Severity | Frequency | User Impact | Data Integrity Risk |
|----------|----------|-----------|-------------|---------------------|
| #1: Save Button Race | 🔴 HIGH | 🟡 LOW | Confusion, duplicate events | 🔴 HIGH (duplicates) |
| #2: Credit Modal Gap | 🔴 HIGH | 🟠 MEDIUM | Confusion, repeat clicks | 🟠 MEDIUM (wasted clicks) |
| #3: Wrong Limit Display | 🔴 CRITICAL | 🔴 HIGH | Frustration, wasted credits | 🔴 HIGH (billing integrity) |

**Overall Priority:** 🔴 CRITICAL — все три проблемы требуют немедленного исправления.

---

## 📝 Next Steps

1. ✅ **ANALYSIS COMPLETE** — Root causes identified
2. ⏳ **SOLUTION DESIGN** — Design fixes for all 3 issues
3. ⏳ **IMPLEMENTATION** — Apply fixes
4. ⏳ **TESTING** — Verify fixes work
5. ⏳ **DOCUMENTATION** — Update SSOT

**Expected Fixes:**
- **Fix #1:** Disable button until redirect starts (add "redirecting" state)
- **Fix #2:** Keep modal open with loading state until save completes
- **Fix #3:** Check consumed credits when loading plan limits for edit

---

## 🎯 Definition of Done

Проблемы считаются решёнными когда:

**#1: Save Button Race**
- [ ] EventForm button остаётся disabled до начала редиректа
- [ ] No race window для double-click
- [ ] Manual test: быстрый double-click НЕ создаёт дубликат

**#2: Credit Modal Gap**
- [ ] Modal остаётся открытой с loading state до завершения save
- [ ] Button в modal disabled во время save
- [ ] No gap между подтверждением и началом save

**#3: Wrong Limit Display**
- [ ] Edit page проверяет consumed credits для события
- [ ] Hint показывает правильный лимит (500 для upgraded events)
- [ ] Backend НЕ просит повторное подтверждение кредита для edit

**All:**
- [ ] TypeScript ✅
- [ ] Build ✅
- [ ] Manual testing ✅
- [ ] SSOT updated ✅

---

**Prepared by:** AI Assistant  
**Date:** 31 декабря 2024  
**Status:** 🔴 CRITICAL ISSUES IDENTIFIED — Awaiting solution design

