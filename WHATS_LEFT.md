# 📋 ЧТО ОСТАЛОСЬ СДЕЛАТЬ

**Обновлено:** 14 декабря 2025  
**Текущий статус:** 8.2/10 → Цель: 9.0/10

---

## 🎯 P0 CRITICAL - Осталось 1 задача

### ⬜ #1: Регенерация Supabase типов (2 часа)

**Проблема:**
- Сейчас в коде 5+ мест с `(supabase as any)` из-за устаревших типов
- Новые таблицы (`clubs`, `club_members`, `club_subscriptions`, etc.) отсутствуют в типах

**Решение:**
```bash
# Шаг 1: Login
supabase login

# Шаг 2: Генерация типов
npx supabase gen types typescript \
  --project-id djbqwsipllhdydshuokg \
  > src/lib/types/supabase.ts

# Шаг 3: Verify
git diff src/lib/types/supabase.ts

# Шаг 4: Remove 'as any'
# Убрать 5+ случаев '(supabase as any)' из файлов:
# - clubRepo.ts
# - clubMemberRepo.ts  
# - subscriptionRepo.ts
# - clubPlanRepo.ts
# - cityRepo.ts

# Шаг 5: Build
npm run build
```

**Impact:** +0.8 к Code Quality (8.2 → 9.0) ✨

---

## 🔥 P1 HIGH - 5 задач (опционально, но желательно)

### ⬜ #7: Remove debug UI elements (30 минут)

**Где:**
```bash
src/app/profile/page.tsx:      console.error('[loadProfileData] Error:', error);
src/app/profile/page.tsx:      console.error('[loadCars] Error:', error);
src/app/profile/page.tsx:      console.error('[loadBrands] Error:', error);
src/app/profile/page.tsx:      console.error('[handleSave] Error:', error);
src/app/profile/edit/page.tsx:        console.error("Failed to load brands:", err);
src/app/profile/edit/page.tsx:        console.error("Failed to load profile:", err);
src/app/profile/edit/page.tsx:      console.error("Failed to update profile:", err);
src/app/clubs/[id]/manage/page.tsx:    console.error("[getClubDetails] Failed", err);
src/app/clubs/[id]/page.tsx:    console.error("[getClubDetails] Failed", err);
src/app/clubs/page.tsx:      console.error("[loadClubs] Failed", err);
```

**Что делать:**
1. Заменить все `console.error` в `src/app/` на `log.error`
2. Добавить импорт logger
3. Улучшить error handling в UI компонентах

**Файлы (4 шт):**
- `src/app/profile/page.tsx` (4 места)
- `src/app/profile/edit/page.tsx` (3 места)
- `src/app/clubs/[id]/manage/page.tsx` (1 место)
- `src/app/clubs/[id]/page.tsx` (1 место)
- `src/app/clubs/page.tsx` (1 место)

---

### ⬜ #8: Unify mapper naming (1 час)

**Проблема:** Inconsistent naming
```typescript
// ❌ Разные стили:
mapRowToCity()
mapUserCar()
mapDbCurrencyToDomain()
mapDbClubPlanToDomain()
mapDbToEventCategory()
```

**Решение:** Единый паттерн `mapDb{Entity}ToDomain`
```typescript
// ✅ Consistent:
mapDbCityToDomain()
mapDbUserCarToDomain()
mapDbCurrencyToDomain()
mapDbClubPlanToDomain()
mapDbEventCategoryToDomain()
```

**Файлы:**
- `src/lib/db/cityRepo.ts`
- `src/lib/db/userCarRepo.ts`
- `src/lib/db/eventCategoryRepo.ts`

---

### ⬜ #9: Clean up TODO comments (30 минут)

**Найдено:** 12 TODO/FIXME/HACK комментариев

**Что делать:**
```bash
# Найти все
grep -r "TODO\|FIXME\|HACK" src/lib/

# Варианты:
# 1. Исправить (если быстро)
# 2. Создать GitHub Issues
# 3. Удалить устаревшие
```

**Примеры:**
```typescript
// TODO: Need4Trip: Regenerate supabase types after DB migration
// FIXME: Add pagination
// HACK: Temporary workaround
```

---

### ⬜ #10: Add error boundaries (2 часа)

**Где:**
- `src/app/error.tsx` (global error boundary)
- `src/app/profile/error.tsx` (profile error boundary)
- `src/app/clubs/error.tsx` (clubs error boundary)

**Что добавить:**
```typescript
'use client';

import { useEffect } from 'react';
import { log } from '@/lib/utils/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.errorWithStack('Page error', error);
  }, [error]);

  return (
    <div className="error-boundary">
      <h2>Что-то пошло не так!</h2>
      <button onClick={reset}>Попробовать снова</button>
    </div>
  );
}
```

---

### ⬜ #11: Optimize database queries (2 часа)

**Проблемы:**
- N+1 queries в некоторых местах
- Нет индексов на часто используемых колонках
- Можно добавить batch loading где его нет

**Примеры:**
```typescript
// ❌ N+1 problem
for (const event of events) {
  const participants = await getParticipants(event.id);
}

// ✅ Batch loading
const eventIds = events.map(e => e.id);
const participantsMap = await getParticipantsByEventIds(eventIds);
```

---

## 📊 P2 MEDIUM - 6 задач (можно потом)

### ⬜ #12: Add input validation (1 час)
- Zod schemas для всех API endpoints
- Валидация на клиенте и сервере

### ⬜ #13: Improve error messages (1 час)
- User-friendly сообщения
- Локализация errors
- Better error context

### ⬜ #14: Add request logging (1 час)
- Log all API requests
- Add request ID tracking
- Performance metrics

### ⬜ #15: Security audit (2 часа)
- Check RLS policies
- Validate permissions
- Test auth flows

### ⬜ #16: Performance optimization (2 часа)
- Add caching where needed
- Optimize heavy queries
- Add pagination everywhere

### ⬜ #17: Code coverage (3 часа)
- Add unit tests for repositories
- Add integration tests
- Target: 80% coverage

---

## 🎨 P3 LOW - 4 задачи (nice to have)

### ⬜ #18: Documentation (2 часа)
- API documentation
- Code comments
- README updates

### ⬜ #19: Refactor long functions (1 час)
- Split functions > 100 LOC
- Extract reusable logic
- Improve readability

### ⬜ #20: Add TypeScript strict mode (2 часа)
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### ⬜ #21: Setup CI/CD (3 часа)
- GitHub Actions
- Auto tests on PR
- Auto deploy to staging

---

## 📈 ROADMAP К 9.0/10

### Immediate (сегодня/завтра):
```
1. ⬜ P0 #1: Supabase types (2h) → 9.0/10 ✨
2. ⬜ P1 #7: Remove debug logs (30min)
3. ⬜ P1 #8: Unify mappers (1h)
───────────────────────────────────────
Total: ~3.5 hours → Code Quality 9.0+
```

### This Week (Week 2):
```
4. ⬜ P1 #9: Clean TODO (30min)
5. ⬜ P1 #10: Error boundaries (2h)
6. ⬜ P1 #11: Optimize queries (2h)
7. ⬜ P2 #12-14: Validation + Errors + Logging (3h)
───────────────────────────────────────
Total: ~7.5 hours
```

### Next Week (Week 3):
```
8. ⬜ P2 #15-17: Security + Performance + Tests (7h)
───────────────────────────────────────
Total: ~7 hours
```

### Later (Week 4):
```
9. ⬜ P3 #18-21: Docs + Refactoring + Strict + CI/CD (8h)
───────────────────────────────────────
Total: ~8 hours
```

---

## 🎯 PRIORITY RECOMMENDATION

### Must Do Now (для 9.0/10):
1. **Supabase types** - блокирует все остальное
2. **Remove debug logs** - быстро и важно
3. **Unify mappers** - consistency

### Should Do This Week:
4. **Error boundaries** - production safety
5. **Optimize queries** - performance

### Nice to Have:
6. Everything else 😊

---

## 📊 ТЕКУЩИЙ СТАТУС

```
Completed:
  ✅ P0 #2-5: Critical bugs (4 tasks)
  ✅ P1 #6: Logging migration (1 task)
  
Remaining to 9.0:
  ⬜ P0 #1: Supabase types (1 task)
  
Optional but good:
  ⬜ P1 #7-11: High priority (5 tasks)
  ⬜ P2: Medium priority (6 tasks)
  ⬜ P3: Low priority (4 tasks)

Total: 1 must-do, 15 optional
```

---

## 💡 QUICK WINS (можно сделать быстро)

### 15 минут:
- ⬜ Clean obvious TODOs
- ⬜ Fix simple 'as any' cases

### 30 минут:
- ⬜ Remove debug console logs from UI
- ⬜ Add error boundary to one page

### 1 час:
- ⬜ Unify mapper naming
- ⬜ Add request logging helper

---

## 🚀 NEXT COMMAND

```bash
# Главное - сделай Supabase types!
supabase login
npx supabase gen types typescript \
  --project-id djbqwsipllhdydshuokg \
  > src/lib/types/supabase.ts

# После этого убери '(supabase as any)' и готово! 🎉
```

---

**Итого осталось:**
- 🔴 **Must:** 1 задача (2h) → 9.0/10
- 🟡 **Should:** 5 задач (7.5h)
- 🟢 **Nice:** 10 задач (15h)

**Рекомендация:** Сделай P0 #1 сейчас, остальное потом! 🚀
