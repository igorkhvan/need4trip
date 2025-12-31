# План Доработок — События Create/Edit (по результатам аудита)

**Дата:** 2024-12-31  
**Статус аудита:** ✅ ВЫСОКОЕ СООТВЕТСТВИЕ (95%)  
**Источник:** `EVENTS_CREATE_EDIT_AUDIT_REPORT.md`  

---

## 🎯 Executive Summary

**Текущий статус:** Production-ready (0 критичных проблем)

**Найдено проблем:**
- ❌ **Критичных:** 0
- 🟡 **Средних:** 2 (code clarity + defense in depth)
- 🟢 **Минорных:** 0

**Рекомендуемые действия:**
1. ✅ **Опубликовать отчёт** → DONE
2. 🟡 **Опционально: Улучшения кода** → Приоритет 1
3. ✅ **Обязательно: Integration tests** → Приоритет 2

---

## 📋 Действия

### ✅ Действие 0: Публикация Отчёта (COMPLETED)

**Статус:** ✅ DONE

**Файлы:**
- `docs/verification/EVENTS_CREATE_EDIT_AUDIT_REPORT.md` — детальный отчёт
- `docs/verification/EVENTS_CREATE_EDIT_ACTION_PLAN.md` — этот план

---

### 🟡 Действие 1: Explicit Pending Role Checks (ОПЦИОНАЛЬНО)

**Приоритет:** 🟡 СРЕДНИЙ (code clarity, не блокирует production)

**Проблема:**
Проверка `pending` роли работает корректно, но не явно:
```typescript
// Текущий код (implicit)
if (!role || (role !== "owner" && role !== "admin")) {
  throw new AuthError("Недостаточно прав...");
}
```

**Решение:**
Добавить explicit проверку `pending` для self-documenting code:
```typescript
// ✅ Explicit pending check
if (!role || role === "pending" || (role !== "owner" && role !== "admin")) {
  throw new AuthError(
    "Недостаточно прав для создания/изменения события в клубе. " +
    "Требуется роль owner или admin. Роль 'pending' не предоставляет прав.",
    undefined,
    403
  );
}
```

**Файлы для изменения:**
1. `src/lib/services/events.ts` (строки 431, 701)
2. Другие места с `role !== "owner" && role !== "admin"` checks

**Обоснование:**
- Улучшает читаемость кода
- Упрощает аудит и code review
- Явно документирует SSOT §2 requirement
- **НЕ** изменяет функциональность (логика уже корректна)

**Effort:** 🟢 LOW (15 минут)

**Dependencies:** Нет

**Testing:** Существующие integration tests должны продолжать проходить

---

### 🟡 Действие 2: DB Constraint для Club ID Immutability (ОПЦИОНАЛЬНО)

**Приоритет:** 🟡 СРЕДНИЙ (defense in depth, не блокирует production)

**Проблема:**
`club_id` immutability защищена только на service layer:
```typescript
// events.ts:682-688
if (validated.clubId !== undefined && validated.clubId !== existing.club_id) {
  throw new ValidationError("Невозможно изменить принадлежность события к клубу...");
}
```

Если service layer будет обойдён (прямой DB access, buggy code path), `club_id` можно изменить.

**Решение:**
Добавить DB-level trigger для immutability enforcement:

**Файл:** `supabase/migrations/20241231_enforce_club_id_immutability.sql`

```sql
-- Function: Prevent club_id changes on UPDATE
CREATE OR REPLACE FUNCTION prevent_club_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.club_id IS DISTINCT FROM NEW.club_id THEN
    RAISE EXCEPTION 'club_id is immutable after event creation (SSOT §5.7)'
      USING HINT = 'Create a new event if you need to change club association';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Apply immutability check on every UPDATE
CREATE TRIGGER events_prevent_club_id_change
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_club_id_change();

-- Comment for documentation
COMMENT ON TRIGGER events_prevent_club_id_change ON public.events IS 
'SSOT §5.7: Prevents club_id changes after event creation (immutability enforcement)';
```

**Обоснование:**
- Defense in depth (многослойная защита)
- БД — последний рубеж защиты от data corruption
- Гарантирует immutability даже при buggy code
- Соответствует принципу "fail fast" (ошибка на уровне БД)

**Effort:** 🟢 LOW (20 минут: написать миграцию + применить + тест)

**Dependencies:** Нет

**Testing:**
1. Создать событие (personal)
2. Попробовать изменить `club_id` через UPDATE → должна быть ошибка
3. Создать событие (club)
4. Попробовать изменить `club_id` на другой клуб → должна быть ошибка

**Rollback plan:**
```sql
-- Если что-то пойдёт не так, откатить:
DROP TRIGGER IF EXISTS events_prevent_club_id_change ON public.events;
DROP FUNCTION IF EXISTS prevent_club_id_change();
```

---

### ✅ Действие 3: Integration Tests для SSOT Appendix A (ОБЯЗАТЕЛЬНО)

**Приоритет:** ✅ ВЫСОКИЙ (quality assurance для production)

**Проблема:**
SSOT Appendix A содержит 14 negative test cases (A1.1 to A6.1), но нет automated tests для их проверки.

**Решение:**
Создать integration tests для каждого сценария из Appendix A.

**Файл:** `tests/integration/events.clubs.access.test.ts` (новый)

**Scope тестирования:**

| Test ID | Сценарий | Ожидаемый результат |
|---------|----------|---------------------|
| QA-54 | A1.1: User has no clubs | manageableClubs = [], backend 403 |
| QA-55 | A1.2: User is member-only | manageableClubs = [], backend 403 |
| QA-56 | A1.3: Admin in 1 club | manageableClubs = [club1], auto-select |
| QA-57 | A1.4: Admin in multiple clubs | manageableClubs = [club1, club2], no default |
| QA-58 | A1.5: Validation required | Client 422, backend 403 if bypassed |
| QA-59 | A2.1: Owner role leakage | Backend 403 (role check per club) |
| QA-60 | A2.2: Admin role per club | Backend 403 (role check per club) |
| QA-61 | A3.1: Club mode ON → clubId required | Client 422, backend 403 |
| QA-62 | A3.2: Club mode OFF → clubId null | clubId = null in payload |
| QA-63 | A4.1: Personal paid no club | No clubId required, credit flow works |
| QA-64 | A4.2: Club paid no credit | Backend ValidationError (422) |
| QA-65 | A4.3: Paid club owner-only | Backend 403 for admin |
| QA-66 | A4.4: Free club admin allowed | Backend 200 for admin |
| QA-67 | A5.1: Admin cannot invite | RLS blocks (403) |
| QA-68 | A5.2: Owner can invite | RLS allows (200) |
| QA-69 | A6.1: No organizer role | DB rejects organizer role (constraint violation) |

**Пример теста (QA-65: A4.3 Paid club owner-only):**

```typescript
describe('SSOT Appendix A: Event Create/Edit Access Control', () => {
  describe('QA-65: A4.3 — Club paid publish is owner-only', () => {
    it('should reject admin publishing paid club event', async () => {
      // Setup: Create club (user1 = owner), add user2 as admin
      const club = await createTestClub(user1);
      await addClubMember(club.id, user2.id, 'admin');
      
      // Setup: Club has active subscription with paid events allowed
      await createClubSubscription(club.id, 'club_50', 'active');
      
      // Act: user2 (admin) tries to publish paid club event
      const payload = {
        title: 'Paid Club Event',
        clubId: club.id,
        isPaid: true,
        price: 5000,
        currencyCode: 'KZT',
        maxParticipants: 50,
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        cityId: testCityId,
      };
      
      const response = await api.post('/api/events', payload, { user: user2 });
      
      // Assert: 403 with owner-only error
      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain(
        'Только владелец клуба может публиковать платные события'
      );
    });
    
    it('should allow owner publishing paid club event', async () => {
      // Setup: Same as above
      const club = await createTestClub(user1);
      await createClubSubscription(club.id, 'club_50', 'active');
      
      // Act: user1 (owner) publishes paid club event
      const payload = { /* same as above */ };
      const response = await api.post('/api/events', payload, { user: user1 });
      
      // Assert: 201 success
      expect(response.status).toBe(201);
      expect(response.body.event.clubId).toBe(club.id);
      expect(response.body.event.isPaid).toBe(true);
    });
  });
});
```

**Test Helpers (required):**
```typescript
// tests/helpers/clubs.ts
export async function createTestClub(user: TestUser, name?: string): Promise<Club> {
  // POST /api/clubs with user auth
}

export async function addClubMember(clubId: string, userId: string, role: ClubRole): Promise<void> {
  // Direct DB insert (bypass RLS for test setup)
}

export async function createClubSubscription(
  clubId: string,
  planId: PlanId,
  status: SubscriptionStatus
): Promise<void> {
  // Direct DB insert
}
```

**Effort:** 🟡 MEDIUM (4-6 часов для 16 тестов + helpers)

**Dependencies:** 
- Test helpers для club/member/subscription setup
- Existing test infrastructure (`tests/helpers/testApi.ts`)

**Success Criteria:**
- Все 16 тестов проходят ✅
- Coverage для SSOT Appendix A = 100%
- Тесты выполняются < 30 секунд

**Rollback plan:** Нет (тесты не влияют на production)

---

## 📊 Roadmap

### Phase 1: Код-ревью (ОПЦИОНАЛЬНО, 1 час)

- [ ] Действие 1: Explicit pending checks (`src/lib/services/events.ts`) — 15 мин
- [ ] Действие 2: DB immutability trigger (миграция + тест) — 20 мин
- [ ] Code review + testing — 25 мин

**Результат:** Code clarity улучшен, defense in depth усилен

---

### Phase 2: Integration Tests (ОБЯЗАТЕЛЬНО, 6 часов)

- [ ] Действие 3.1: Создать test helpers (clubs, members, subscriptions) — 1 час
- [ ] Действие 3.2: Написать тесты QA-54 to QA-61 (UI visibility, role checks) — 2 часа
- [ ] Действие 3.3: Написать тесты QA-62 to QA-66 (paid/credit logic) — 2 часа
- [ ] Действие 3.4: Написать тесты QA-67 to QA-69 (member management, organizer) — 1 час
- [ ] CI integration + documentation — 30 мин

**Результат:** SSOT Appendix A coverage = 100%, regression protection

---

### Phase 3: Документация (ОПЦИОНАЛЬНО, 1 час)

- [ ] Обновить `docs/ssot/SSOT_TESTING.md` с новыми тестами (QA-54 to QA-69)
- [ ] Обновить `docs/ssot/SSOT_DATABASE.md` (если добавлен immutability trigger)
- [ ] Commit + push

**Результат:** SSOT документация синхронизирована с кодом

---

## 🎯 Definition of Done

**Phase 1 (опционально):**
- [ ] Explicit pending checks добавлены в `events.ts`
- [ ] DB trigger для club_id immutability создан и протестирован
- [ ] `npm run build` проходит успешно
- [ ] Commit: `refactor: improve club access checks (SSOT audit)` 

**Phase 2 (обязательно):**
- [ ] 16 integration tests написаны и проходят (`QA-54` to `QA-69`)
- [ ] Test coverage для SSOT Appendix A = 100%
- [ ] `npm test -- events.clubs.access` < 30 секунд
- [ ] CI pipeline зелёный
- [ ] Commit: `test: add SSOT Appendix A integration tests (QA-54 to QA-69)`

**Phase 3 (опционально):**
- [ ] `SSOT_TESTING.md` обновлён с новыми тестами
- [ ] `SSOT_DATABASE.md` обновлён (если был trigger)
- [ ] Commit: `docs: sync SSOT with events audit findings`

---

## 📝 Notes

### Зависимости между действиями:
- Действие 1 и 2 — независимые (можно делать параллельно)
- Действие 3 — зависит от Действия 1+2 (если они выполнены, тесты должны их проверить)

### Риски:
- **LOW:** Все изменения опциональны для production (0 критичных проблем)
- **LOW:** Тесты могут занять больше времени (если нужны доработки helpers)

### Альтернативы:
- **Option A:** Сделать только Phase 2 (integration tests), пропустить Phase 1 (code clarity)
  - Pros: Меньше изменений в production code, только QA
  - Cons: Code остаётся implicit (но функционально корректен)
- **Option B:** Сделать всё (Phase 1 + 2 + 3)
  - Pros: Максимальное качество кода + тестирование
  - Cons: 8 часов работы

**Рекомендация:** Option B (полная доработка) для long-term maintainability.

---

## ✅ Sign-off

**Аудит проведён:** 2024-12-31  
**Отчёт подготовлен:** `EVENTS_CREATE_EDIT_AUDIT_REPORT.md`  
**План утверждён:** ✅ READY FOR IMPLEMENTATION  

**Next Steps:**
1. Review этого плана с командой
2. Approve Phase 1 (опционально) или skip
3. Execute Phase 2 (обязательно)
4. Update SSOT documents

