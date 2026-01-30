# План Доработок — События Create/Edit (по результатам аудита)

**Дата:** 2024-12-31  
**Статус аудита:** ✅ ПОЛНОЕ СООТВЕТСТВИЕ (100%) — Phase 1 Complete  
**Источник:** `EVENTS_CREATE_EDIT_AUDIT_REPORT.md` v1.1  

---

## 🎯 Executive Summary

**Текущий статус:** ✅ Production-ready (0 критичных проблем, Phase 1 завершена)

**Найдено проблем (initial audit):**
- ❌ **Критичных:** 0
- 🟡 **Средних:** 2 (code clarity + defense in depth) — **ИСПРАВЛЕНО в Phase 1**
- 🟢 **Минорных:** 0

**Выполненные действия (Phase 1 — 2024-12-31):**
1. ✅ Explicit pending checks добавлены (events.ts)
2. ✅ DB trigger для club_id immutability создан и протестирован
3. ✅ SSOT_DATABASE.md обновлён

**Рекомендуемые действия:**
1. ✅ **Phase 1: Code Improvements** → COMPLETE
2. ⏳ **Phase 2: Integration Tests** → Следующий этап
3. 🟡 **Phase 3: Documentation** → Опционально

---

## 📋 Действия

### ✅ Действие 0: Публикация Отчёта (COMPLETED — 2024-12-31)

**Статус:** ✅ DONE

**Файлы:**
- `docs/verification/EVENTS_CREATE_EDIT_AUDIT_REPORT.md` — детальный отчёт (v1.1)
- `docs/verification/EVENTS_CREATE_EDIT_ACTION_PLAN.md` — этот план

**Git Commit:** `4b21ea9` — docs: Events Create/Edit SSOT compliance audit report

---

### ✅ Действие 1: Explicit Pending Role Checks (COMPLETED — 2024-12-31)

**Приоритет:** ✅ ЗАВЕРШЕНО (Phase 1)

**Проблема:**
Проверка `pending` роли работала корректно, но не была явной.

**Решение:**
Добавлены explicit проверки `role === "pending"` для self-documenting code.

**Файлы изменены:**
- `src/lib/services/events.ts` (строки 427-438, 696-707)

**Реализовано:**
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

**Результат:**
- ✅ Улучшена читаемость кода
- ✅ Явное документирование SSOT §2 requirement
- ✅ НЕ изменяет функциональность (логика уже была корректна)

**Effort:** ✅ 15 минут (выполнено)

**Git Commit:** `6b323ce` — refactor: improve club access checks and add club_id immutability (Phase 1)

---

### ✅ Действие 2: DB Constraint для Club ID Immutability (COMPLETED — 2024-12-31)

**Приоритет:** ✅ ЗАВЕРШЕНО (Phase 1)

**Проблема:**
`club_id` immutability защищена только на service layer. При bypass service layer возможно изменение club_id.

**Решение:**
Добавлен DB-level trigger для immutability enforcement.

**Файлы созданы:**
1. ✅ `supabase/migrations/20241231_enforce_club_id_immutability_v2.sql` (миграция)
2. ✅ `supabase/migrations/20241231_test_club_id_immutability.sql` (тесты)
3. ✅ `supabase/migrations/20241231_APPLY_INSTRUCTIONS_v2.md` (инструкция)

**Trigger Logic (v2 — simplified):**
```sql
CREATE OR REPLACE FUNCTION prevent_club_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.club_id IS DISTINCT FROM NEW.club_id THEN
    RAISE EXCEPTION 'club_id is immutable after event creation (SSOT §5.7)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_prevent_club_id_change
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_club_id_change();
```

**Testing:**
- ✅ Test 1: Cannot change club_id from NULL to value
- ✅ Test 2: Cannot change club_id from one value to another
- ✅ Test 3: Cannot clear club_id (value → NULL)
- ✅ Test 4: Can update other fields while club_id stays unchanged

**Результат:**
- ✅ Defense in depth (service layer + DB constraint)
- ✅ БД — последний рубеж защиты
- ✅ Гарантирует immutability даже при buggy code

**Effort:** ✅ 30 минут (выполнено: миграция + fix v2 + тесты)

**Git Commits:**
- `6b323ce` — refactor: improve club access checks (Phase 1)
- `d3adf69` — fix: simplify club_id immutability trigger logic (v2)

---

### ✅ Действие 2.1: Обновить SSOT_DATABASE.md (COMPLETED — 2024-12-31)

**Приоритет:** ✅ ЗАВЕРШЕНО

**Обновлено:**
1. ✅ Triggers section: Добавлен #7 "Prevent club_id changes"
2. ✅ Functions: Добавлена `prevent_club_id_change()`
3. ✅ Migration History: +3 миграции (81 → 84)
4. ✅ Last updated: 2024-12-31

**Git Commit:** `8bdc8bd` — docs: update SSOT_DATABASE with club_id immutability trigger

---

### ⏳ Действие 3: Integration Tests для SSOT Appendix A (СЛЕДУЮЩИЙ ЭТАП — Phase 2)

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

### ✅ Phase 1: Code Improvements (COMPLETED — 2024-12-31, 1 час)

- [x] Действие 1: Explicit pending checks (`src/lib/services/events.ts`) — 15 мин
- [x] Действие 2: DB immutability trigger (миграция v2 + fix + тесты) — 30 мин
- [x] Действие 2.1: Update SSOT_DATABASE.md — 10 мин
- [x] Code review + testing + commits — 15 мин

**Результат:** ✅ Code clarity улучшен, defense in depth усилен, SSOT compliance = 100%

**Git Commits:**
- `4b21ea9` — docs: Events Create/Edit SSOT compliance audit report
- `6b323ce` — refactor: improve club access checks and add club_id immutability (Phase 1)
- `d3adf69` — fix: simplify club_id immutability trigger logic (v2)
- `8bdc8bd` — docs: update SSOT_DATABASE with club_id immutability trigger

---

### ⏳ Phase 2: Integration Tests (СЛЕДУЮЩИЙ ЭТАП, 6 часов)

- [ ] Действие 3.1: Создать test helpers (clubs, members, subscriptions) — 1 час
- [ ] Действие 3.2: Написать тесты QA-54 to QA-61 (UI visibility, role checks) — 2 часа
- [ ] Действие 3.3: Написать тесты QA-62 to QA-66 (paid/credit logic) — 2 часа
- [ ] Действие 3.4: Написать тесты QA-67 to QA-69 (member management, organizer) — 1 час
- [ ] CI integration + documentation — 30 мин

**Результат:** SSOT Appendix A coverage = 100%, regression protection

---

### 🟡 Phase 3: Документация (ОПЦИОНАЛЬНО, 30 минут)

- [x] Обновить `docs/ssot/SSOT_DATABASE.md` с immutability trigger — ✅ DONE
- [ ] Обновить `docs/ssot/SSOT_TESTING.md` с новыми тестами (QA-54 to QA-69) — после Phase 2
- [x] Commit + push — ✅ DONE (8bdc8bd)

**Результат:** ✅ SSOT_DATABASE синхронизирован, SSOT_TESTING — ждёт Phase 2

---

## 🎯 Definition of Done

**✅ Phase 1 (опционально) — COMPLETED:**
- [x] Explicit pending checks добавлены в `events.ts`
- [x] DB trigger для club_id immutability создан и протестирован
- [x] `npm run build` проходит успешно
- [x] SSOT_DATABASE.md обновлён
- [x] Commits: `6b323ce`, `d3adf69`, `8bdc8bd`

**⏳ Phase 2 (обязательно) — TODO:**
- [ ] 16 integration tests написаны и проходят (`QA-54` to `QA-69`)
- [ ] Test coverage для SSOT Appendix A = 100%
- [ ] `npm test -- events.clubs.access` < 30 секунд
- [ ] CI pipeline зелёный
- [ ] Commit: `test: add SSOT Appendix A integration tests (QA-54 to QA-69)`

**🟡 Phase 3 (опционально) — PARTIAL:**
- [x] `SSOT_DATABASE.md` обновлён с trigger — ✅ DONE
- [ ] `SSOT_TESTING.md` обновлён с новыми тестами — после Phase 2
- [x] Commit: `docs: update SSOT_DATABASE with club_id immutability trigger` — ✅ DONE

---

## 📝 Notes

### Зависимости между действиями:
- ✅ Действие 1 и 2 — независимые, выполнены параллельно (Phase 1 complete)
- ⏳ Действие 3 — зависит от Действия 1+2, ждёт Phase 2

### Риски:
- **✅ ELIMINATED:** Все изменения Phase 1 реализованы и протестированы
- **LOW:** Тесты Phase 2 могут занять больше времени (если нужны доработки helpers)

### Альтернативы:
- ~~**Option A:** Сделать только Phase 2 (integration tests), пропустить Phase 1~~
  - ❌ Устарело — Phase 1 завершена
- **Option B:** Сделать всё (Phase 1 + 2 + 3) — ✅ В ПРОЦЕССЕ
  - Pros: Максимальное качество кода + тестирование
  - Cons: ~8 часов работы (Phase 1: 1 час ✅, Phase 2: 6 часов ⏳, Phase 3: 30 мин частично ✅)

**Рекомендация:** Option B (полная доработка) для long-term maintainability — Phase 1 complete, Phase 2 next.

---

## ✅ Sign-off

**Аудит проведён:** 2024-12-31  
**Отчёт подготовлен:** `EVENTS_CREATE_EDIT_AUDIT_REPORT.md` v1.1  
**План утверждён:** ✅ READY FOR PHASE 2  

**Phase 1 Status:** ✅ COMPLETE (2024-12-31)
- Code improvements: explicit pending checks + DB immutability trigger
- SSOT compliance: 95% → 100%
- Git commits: 4 (audit report + code + fixes + docs)

**Next Steps:**
1. ✅ ~~Review Phase 1 plan~~ → DONE
2. ✅ ~~Execute Phase 1~~ → DONE
3. ⏳ Execute Phase 2 (integration tests QA-54 to QA-69) → СЛЕДУЮЩИЙ ЭТАП
4. 🟡 Update SSOT_TESTING.md → После Phase 2

