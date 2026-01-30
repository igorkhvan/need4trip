# 🏗️ Unified Transaction Patterns — Need4Trip

**Дата:** 31 декабря 2024  
**Статус:** 📘 Architecture Standard  
**Цель:** Единый подход к атомарным операциям

---

## 🎯 Принцип: Один Паттерн — Одна Задача

**ВАЖНО:** Мы НЕ используем разные подходы для одной и той же задачи.

У нас **ТРИ** unified паттерна для разных сценариев:

1. **Database Constraints** — для простой уникальности
2. **Compensating Transactions** — для бизнес-логики с откатом
3. **Postgres RPC Functions** — для сложных атомарных операций (если нужно)

---

## 📊 Когда Использовать Какой Паттерн

### Pattern 1: Database Constraints (PREFERRED для уникальности)

**Когда использовать:**
- ✅ Проверка уникальности (unique violation)
- ✅ Referential integrity (FK constraints)
- ✅ Check constraints (enum, range validation)

**Плюсы:**
- ⚡ Декларативно (одно место в DB schema)
- ⚡ Работает на любом количестве серверов
- ⚡ Защита от race conditions на уровне DB

**Пример использования:**

```sql
-- Migration
CREATE UNIQUE INDEX idx_event_participants_user 
  ON event_participants(event_id, user_id) 
  WHERE user_id IS NOT NULL;
```

```typescript
// Service (src/lib/services/participants.ts)
try {
  dbParticipant = await registerParticipantRepo(payload);
} catch (err: any) {
  if (isUniqueViolationError(err)) {
    throw new ConflictError("Вы уже зарегистрированы на это событие");
  }
  throw err;
}
```

**Использовано в:**
- ✅ Event registration (duplicate check)
- ✅ Club members (user cannot be added twice)
- ✅ Idempotency keys (duplicate API requests)

---

### Pattern 2: Compensating Transaction (CURRENT для credits)

**Когда использовать:**
- ✅ Multi-step operations с бизнес-логикой
- ✅ Требуется rollback при ошибке
- ✅ Логика слишком сложна для SQL function

**Плюсы:**
- ⚡ TypeScript код (легче читать/поддерживать)
- ⚡ 99% случаев работает (rollback при ошибке)
- ⚡ Не требует хранимых процедур

**Минусы:**
- ⚠️ НЕ 100% ACID (окно между операциями)
- ⚠️ Если rollback упадет → ручное вмешательство

**Пример использования:**

```typescript
// Service (src/lib/services/creditTransaction.ts)
export async function executeWithCreditTransaction<T extends { id: string }>(
  userId: string,
  creditCode: "EVENT_UPGRADE_500",
  eventId: string | undefined,
  operation: () => Promise<T>
): Promise<T> {
  let consumedCreditId: string | undefined;
  
  try {
    // 1️⃣ Consume credit FIRST (mark as consumed)
    const credit = await consumeCredit(userId, creditCode, eventId ?? null);
    consumedCreditId = credit.id;
    
    // 2️⃣ Execute operation (create/update event)
    const result = await operation();
    
    // 3️⃣ Update credit with actual eventId
    if (!eventId && result.id) {
      await updateCreditEventId(consumedCreditId, result.id);
    }
    
    return result;
    
  } catch (operationError: any) {
    // 4️⃣ ROLLBACK credit if operation failed
    if (consumedCreditId) {
      await rollbackCredit(consumedCreditId);
    }
    throw operationError;
  }
}
```

**Использовано в:**
- ✅ Event creation + credit consumption
- ✅ Event update + credit consumption (upgrade)

**Защита от edge cases:**
- ✅ Idempotency layer (`withIdempotency`) предотвращает дубликаты событий
- ✅ CRITICAL логирование если rollback упадет
- ✅ Monitoring alerts для ручного вмешательства

---

### Pattern 3: Postgres RPC Functions (RESERVED для будущего)

**Когда использовать:**
- ✅ Критичные операции требующие 100% ACID
- ✅ Сложная логика, которую можно выразить в SQL
- ✅ Когда compensating transaction недостаточно

**Плюсы:**
- ⚡ Настоящая ACID транзакция (BEGIN ... COMMIT)
- ⚡ Нет окна между операциями
- ⚡ Rollback автоматический (EXCEPTION блок)

**Минусы:**
- ⚠️ Логика в SQL (сложнее читать/поддерживать)
- ⚠️ Harder to test (requires DB migration)
- ⚠️ Supabase SDK coordination

**Пример (НЕ используется сейчас, но доступен если нужно):**

```sql
-- Migration
CREATE OR REPLACE FUNCTION consume_credit_and_create_event(
  p_user_id UUID,
  p_credit_code TEXT,
  p_event_data JSONB
)
RETURNS TABLE (event_id UUID, credit_id UUID) AS $$
BEGIN
  -- 1. Lock credit FOR UPDATE
  -- 2. Create event
  -- 3. Update credit with event_id
  -- 4. COMMIT (автоматически)
  
  EXCEPTION WHEN OTHERS THEN
    -- Automatic rollback
    RAISE;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// Service
const { data, error } = await db.rpc('consume_credit_and_create_event', {
  p_user_id: userId,
  p_credit_code: creditCode,
  p_event_data: eventData
});
```

**Использовано в:**
- ✅ Notification queue claiming (`claim_pending_notifications`)
- ✅ DLQ operations (`move_to_dead_letter_queue`)

**Причина использования RPC здесь:**
- Нужен `FOR UPDATE SKIP LOCKED` для параллельных воркеров
- SQL проще для lock acquisition

---

## 🚫 Что МЫ НЕ ДЕЛАЕМ (Anti-Patterns)

### ❌ Mixing Patterns для Одной Задачи

```typescript
// ❌ BAD: Иногда compensating, иногда RPC, иногда constraint
async function createEvent() {
  if (useCredit) {
    await executeWithCreditTransaction(...); // Compensating
  } else if (isClubEvent) {
    await db.rpc('create_club_event', ...); // RPC
  } else {
    // Just insert (no pattern)
  }
}
```

```typescript
// ✅ GOOD: Всегда один паттерн для event creation
async function createEvent() {
  // Always check constraints first (Pattern 1)
  // If credit needed → wrap in compensating transaction (Pattern 2)
  // RPC only if ACID is critical (Pattern 3)
}
```

---

### ❌ Manual Locking in Application Code

```typescript
// ❌ BAD: SELECT ... FOR UPDATE в TypeScript
const { data: credit } = await db
  .from('billing_credits')
  .select('*')
  .eq('user_id', userId)
  .single();

// Race condition window here!

await db
  .from('billing_credits')
  .update({ status: 'consumed' })
  .eq('id', credit.id);
```

```typescript
// ✅ GOOD: Используй Database Constraint (Pattern 1)
await db
  .from('billing_credits')
  .update({ status: 'consumed' })
  .eq('id', creditId)
  .eq('status', 'available'); // Optimistic lock

// Or: Compensating Transaction (Pattern 2)
await executeWithCreditTransaction(...);

// Or: RPC Function (Pattern 3) для FOR UPDATE SKIP LOCKED
await db.rpc('claim_credit', { p_user_id: userId });
```

---

### ❌ Silent Failures в Rollback

```typescript
// ❌ BAD: Rollback упал — молчим
try {
  await rollbackCredit(creditId);
} catch (err) {
  // Ignored — credit навсегда consumed
}
```

```typescript
// ✅ GOOD: Log CRITICAL + alert
try {
  await rollbackCredit(creditId);
} catch (rollbackError: any) {
  log.error("[CreditTransaction] CRITICAL: Credit rollback failed", {
    creditId,
    rollbackError: rollbackError.message,
    severity: "CRITICAL",
    requiresManualIntervention: true, // Alert admin
  });
}
```

---

## 📋 Decision Matrix

| Scenario | Pattern | Why |
|----------|---------|-----|
| **Duplicate registration** | Database Constraint | Простая уникальность, constraint достаточно |
| **Event + Credit** | Compensating Transaction | Multi-step бизнес-логика, rollback нужен |
| **Notification claiming** | Postgres RPC | `FOR UPDATE SKIP LOCKED` для параллельных воркеров |
| **Duplicate API request** | Database Constraint (idempotency_keys) | Уникальность key + route + user_id |
| **Club member add** | Database Constraint | Уникальность user_id + club_id |

---

## ✅ Current Implementation Status

### ✅ Pattern 1: Database Constraints

**Используется для:**
- Event participants (unique user per event)
- Club members (unique user per club)
- Idempotency keys (unique key per route per user)

**Файлы:**
- Migrations: `20241222_add_user_registration_unique.sql`, `20241231_add_idempotency_keys.sql`
- Services: `src/lib/services/participants.ts`
- Repos: `src/lib/db/idempotencyRepo.ts`

---

### ✅ Pattern 2: Compensating Transactions

**Используется для:**
- Event creation + credit consumption
- Event update + credit consumption

**Файлы:**
- Service: `src/lib/services/creditTransaction.ts`
- Used by: `src/lib/services/events.ts` (createEvent, updateEvent)
- Repos: `src/lib/db/billingCreditsRepo.ts`

**Defense in Depth:**
- Idempotency layer (`withIdempotency`) предотвращает дубликаты
- CRITICAL logging если rollback упадет
- UI ActionController предотвращает двойные клики

---

### ✅ Pattern 3: Postgres RPC Functions

**Используется для:**
- Notification queue claiming (parallel workers)
- DLQ operations

**Файлы:**
- Migration: `20241217_create_notification_tables.sql`
- Functions: `claim_pending_notifications`, `move_to_dead_letter_queue`
- Repos: `src/lib/db/notificationQueueRepo.ts`

**Не используется для:**
- ❌ Event creation (compensating transaction достаточно)
- ❌ Credit consumption (compensating transaction + idempotency)

---

## 🎯 Architecture Principles

1. **One Pattern Per Problem Type**
   - Не миксуем разные подходы для одной задачи
   - Выбираем паттерн на основе Decision Matrix

2. **Prefer Simplicity**
   - Database Constraints > Compensating Transaction > RPC Functions
   - Выбираем самый простой паттерн, который решает задачу

3. **Defense in Depth**
   - UI (ActionController) + Backend (Idempotency) + DB (Constraints)
   - Каждый слой защищает от своих edge cases

4. **Fail Loudly**
   - CRITICAL logging для сбоев rollback
   - Monitoring alerts для ручного вмешательства
   - Никогда не молчим про ошибки

5. **Test All Paths**
   - Happy path (success)
   - Sad path (operation fails → rollback succeeds)
   - Critical path (rollback fails → alert admin)

---

## 📚 References

- **Database Constraints:** `docs/FIX_DUPLICATE_REGISTRATION.md`
- **Compensating Transactions:** `src/lib/services/creditTransaction.ts`
- **Idempotency:** `docs/sessions/2024-12-31-event-save-ux-issues/IDEMPOTENCY_ACTIVATED.md`
- **ActionController:** `src/lib/ui/actionController.ts`
- **SSOT Architecture:** `docs/ssot/SSOT_ARCHITECTURE.md`

---

## 🔄 Future Considerations

**Если понадобится 100% ACID для credits (маловероятно):**
- Создай RPC function `consume_credit_and_create_event()`
- Замени `executeWithCreditTransaction` на вызов RPC
- Протестируй с нагрузкой
- Обнови этот документ

**Пока:**
- ✅ Compensating Transaction + Idempotency = достаточно
- ✅ 99%+ success rate
- ✅ Defense in Depth от дубликатов
- ✅ CRITICAL logging для edge cases

---

**Правило:** Перед добавлением нового паттерна транзакций — прочитай этот документ, убедись что существующий паттерн не подходит.

