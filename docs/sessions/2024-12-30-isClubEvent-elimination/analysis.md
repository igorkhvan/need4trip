# isClubEvent Elimination — Analysis Report

**Date:** 2024-12-30  
**Goal:** Полное приведение backend к SSOT_CLUBS_EVENTS_ACCESS.md (clubId only, no isClubEvent in API contract)  
**SSOT Authority:** `docs/ssot/SSOT_CLUBS_EVENTS_ACCESS.md`

---

## PHASE 0 — SSOT Compliance Check

### Ненарушаемые правила из SSOT (релевантные для backend):

**§1.2 Event Clubness (Canonical):**
- ✅ Event is club event iff `club_id IS NOT NULL`
- ✅ DB invariant: `is_club_event = TRUE` iff `club_id IS NOT NULL`
- ✅ `is_club_event` is synchronized by DB trigger (автоматически)
- ✅ DB constraint enforces equivalence
- **ПРАВИЛО:** Backend MUST treat `club_id` as the source of truth
- **ЗАПРЕЩЕНО:** UI/backend НЕ должны писать `is_club_event` напрямую

**§1.3 Paid Modes (No Mixing):**
- Personal paid: `club_id = NULL`, uses `billing_credits`
- Club paid: `club_id != NULL`, uses club subscription
- **ЗАПРЕЩЕНО:** Mixing credits vs subscription

**§5.1 Create/Update Club Event:**
- IF `club_id = X` THEN role MUST be {owner, admin}
- ELSE 403

**§5.2 Create/Update Personal Event:**
- IF `club_id = NULL` THEN only owner (`created_by_user_id == currentUser.id`) can update

**§5.7 (implied from SSOT §5.7 reference):**
- Club ID immutable after creation (cannot change club context after event created)

---

## PHASE 1 — Техдолг Inventory

### A) API Contract (Route Handlers / Input Schemas)

**ПРОБЛЕМА:** `isClubEvent` присутствует в input schemas и принимается как валидное поле

| File | Line | Violation | Severity |
|------|------|-----------|----------|
| `src/lib/types/event.ts` | 173, 199 | `EventCreateInput.isClubEvent`, `EventUpdateInput.isClubEvent` | P0 |
| `src/lib/types/event.ts` | 227, 258 | `eventCreateSchema.isClubEvent`, `eventUpdateSchema.isClubEvent` | P0 |
| `src/app/api/events/route.ts` | 94 | POST принимает payload с `isClubEvent` без валидации | P0 |
| `src/app/api/events/[id]/route.ts` | 45 | PUT принимает payload с `isClubEvent` без валидации | P0 |

**Вывод:** API contract НЕ соответствует SSOT §1.2 ("clubId is source of truth"). Backend принимает `isClubEvent` от клиента, что нарушает принцип "derived/cache field".

---

### B) Service Layer (Валидация, ветвление, billing enforcement)

**ПРОБЛЕМА:** Service layer протаскивает `isClubEvent` из input в repo, хотя должен полагаться только на `clubId`

| File | Line | Violation | Severity |
|------|------|-----------|----------|
| `src/lib/services/events.ts` | 418 | `isClubEvent: parsed.isClubEvent ?? false` — протаскивает в `EventCreateInput` | P0 |
| `src/lib/services/events.ts` | 668 | `isClubEvent: parsed.isClubEvent !== undefined ? parsed.isClubEvent : undefined` — протаскивает в `EventUpdateInput` | P0 |

**Хорошая новость:** Service layer УЖЕ правильно использует `clubId` для авторизации (строки 427, 696):
```typescript
if (validated.clubId) {
  const role = await getUserClubRole(validated.clubId, currentUser.id);
  // Check role...
}
```

**Вывод:** Service layer НЕ использует `isClubEvent` для бизнес-логики (только протаскивает в repo). Это технический долг, но НЕ логическая ошибка.

---

### C) Repo/Mappers (Запись/чтение из events таблицы)

**ПРОБЛЕМА:** Repo ПИШЕТ `is_club_event` в БД напрямую, хотя это поле derived (trigger-maintained)

| File | Line | Violation | Severity |
|------|------|-----------|----------|
| `src/lib/db/eventRepo.ts` | 190 | `is_club_event: payload.isClubEvent` в `createEventRecord` | P0 |
| `src/lib/db/eventRepo.ts` | 248 | `...(payload.isClubEvent !== undefined ? { is_club_event: payload.isClubEvent } : {})` в `updateEvent` | P0 |

**Хорошая новость:** Repo ЧИТАЕТ `is_club_event` из БД (строка 65) — это **OK**, т.к. поле существует в БД и синхронизируется trigger'ом.

**Вывод:** Repo НЕ должен писать `is_club_event` (trigger сделает это автоматически на основе `club_id`). Текущий код создаёт риск рассинхронизации.

---

### D) Domain Types/DTO

**ПРОБЛЕМА:** `isClubEvent` присутствует как source field в domain types рядом с `clubId`

| File | Line | Violation | Severity |
|------|------|-----------|----------|
| `src/lib/types/event.ts` | 120 | `Event.isClubEvent: boolean` | P1 (может быть computed) |
| `src/lib/db/eventRepo.ts` | 30 | `EventListItem.isClubEvent: boolean` | P1 (может быть computed) |

**Хорошая новость:** В mapper'ах `isClubEvent` вычисляется из БД (строка 65: `isClubEvent: row.is_club_event ?? false`). Это **OK** для чтения.

**Вывод:**  
- `isClubEvent` в response types (Event, EventListItem) — **ДОПУСТИМО**, если используется ТОЛЬКО для UI удобства и вычисляется как `Boolean(clubId)` или читается из БД (где trigger гарантирует синхронность).
- Проблема: domain types EventCreateInput/EventUpdateInput содержат `isClubEvent` как **input field** — это **ЗАПРЕЩЕНО** по SSOT §1.2.

---

### E) Tests

**Поиск:** Нужно проверить integration tests на использование `isClubEvent`

```bash
grep -r "isClubEvent" tests/
```

*Результат grep показал 0 совпадений в tests/* — интеграционные тесты НЕ используют `isClubEvent`.*

**Вывод:** Tests уже используют `clubId` (good!). Нужно добавить тесты:
1. Попытка изменить `clubId` в update → 400
2. Payload с `isClubEvent` → 400 (после enforcement)

---

### F) Docs (VERIFICATION, NOT SSOT)

**Файл:** `docs/verification/CLUBS_EVENTS_ACCESS_VERIFICATION.md`

**ПРОБЛЕМА (гипотеза):** Verification doc может содержать claims beyond SSOT (например, упоминание ролей pending/organizer, которых нет в SSOT)

*Нужно прочитать файл и сверить с SSOT.*

---

## PHASE 1 Summary — Found Violations

### P0 (Critical — Breaks SSOT Contract):

1. **API Contract:** `isClubEvent` принимается в create/update input schemas  
   - `src/lib/types/event.ts`: EventCreateInput, EventUpdateInput, eventCreateSchema, eventUpdateSchema
   - API routes НЕ валидируют/отклоняют `isClubEvent` в payload

2. **Service Layer:** протаскивает `isClubEvent` из input в repo write  
   - `src/lib/services/events.ts`: строки 418, 668

3. **Repo Layer:** пишет `is_club_event` в БД напрямую (нарушает trigger-maintained invariant)  
   - `src/lib/db/eventRepo.ts`: строки 190, 248

### P1 (Medium — Type System Inconsistency):

1. **Domain Types:** `Event.isClubEvent` и `EventListItem.isClubEvent` как source fields  
   - Можно оставить как computed для response (UI удобство)
   - НО: нужно убрать из input types (EventCreateInput, EventUpdateInput)

### ✅ Что уже хорошо:

1. **Service layer authorization** использует `clubId` (НЕ `isClubEvent`) — CORRECT  
2. **UI (EventForm)** использует `clubId` для dropdown и checkbox state — CORRECT  
3. **Integration tests** НЕ используют `isClubEvent` — CORRECT  
4. **DB trigger** автоматически синхронизирует `is_club_event` с `club_id` — CORRECT

---

## SSOT Gap / Divergence Check

**Вопрос:** Найдены ли правила в коде/БД/тестах, которых НЕТ в SSOT?

### Проверка:

1. **Роли pending/organizer (SSOT §2):**  
   - SSOT: {owner, admin, member, pending}, organizer deprecated  
   - БД (club_members.role): CHECK constraint includes 'organizer' (см. DATABASE.md строка 599)  
   - Код: нужно проверить `getUserClubRole` и `club_members` RLS policies

2. **Club ID immutability (SSOT §5.7 implied):**  
   - SSOT: не явно задокументирован в §5, только в appendix A3.2  
   - Код: `src/lib/services/events.ts` строка 684 — уже enforced!  
   - **ВЫВОД:** Код соответствует SSOT (implicit rule enforced)

3. **is_club_event trigger (DATABASE.md):**  
   - Описан в DATABASE.md (строки 147-150)  
   - Соответствует SSOT §1.2 (trigger = implementation of "synchronized by DB")

### ⚠️ FOUND DIVERGENCE:

**Database Schema vs SSOT — club_members.role**

| Source | Allowed Roles | Location |
|--------|--------------|----------|
| SSOT §2 | owner, admin, member, pending (organizer deprecated) | docs/ssot/SSOT_CLUBS_EVENTS_ACCESS.md line 66-72 |
| DATABASE.md | owner, admin, organizer, member | docs/ssot/SSOT_DATABASE.md line 599 |
| Supabase Schema | CHECK (role IN ('owner', 'admin', 'organizer', 'member')) | Actual DB constraint |

**КРИТИЧНО:** SSOT говорит "organizer deprecated and must not exist", но БД constraint ALLOWS 'organizer'.

**Recommended Action:**  
- STOP: Нужен explicit sign-off от user  
- Либо: обновить SSOT (добавить organizer как valid role)  
- Либо: создать миграцию для удаления 'organizer' из DB constraint  
- **В этом PR:** НЕ трогаем club_members (out of scope для isClubEvent elimination)

---

## PHASE 1 Conclusion

**Готов к PHASE 2 (план миграции)?** ✅ Да

**Блокеры:** ❌ Нет (divergence по 'organizer' role — out of scope для данной задачи)

**Next Step:** PHASE 2 — Детальный план изменений (см. analysis.md → implementation.md)


