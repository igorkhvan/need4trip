# 📋 ПЛАН МИГРАЦИИ: Custom Auth + Service Role Pattern

**Дата:** 22 декабря 2024  
**Цель:** Исправить ошибку загрузки с сохранением безопасности и архитектуры

---

## 🎯 СТРАТЕГИЯ

**Использовать `supabaseAdmin` (service role) для всех server-side операций:**
- ✅ Service role **bypass RLS**
- ✅ Authorization checks в **application layer**
- ✅ RLS остаётся как **защита от SQL injection**
- ✅ Совместимо с **custom JWT**

---

## 📦 ФАЗА 1: Рефакторинг Data Repositories (критично)

### **1.1. `eventRepo.ts`**

**Проблема:** Все SELECT queries используют `supabase` (anon), RLS блокирует.

**Решение:**
```typescript
// БЫЛО:
import { supabase, ensureClient } from "@/lib/db/client";

export async function listPublicEvents(page, limit) {
  ensureClient();
  const { data, error } = await supabase  // ← Anon client
    .from('events')
    .select('*, created_by_user:users(...)')
    .eq('visibility', 'public')
    .range(from, to);
}

// СТАЛО:
import { supabaseAdmin, ensureAdminClient } from "@/lib/db/client";

export async function listPublicEvents(page, limit) {
  ensureAdminClient();
  const { data, error } = await supabaseAdmin  // ← Admin client
    .from('events')
    .select('*, created_by_user:users(...)')
    .eq('visibility', 'public')
    .range(from, to);
}
```

**Изменения:**
- Заменить `supabase` → `supabaseAdmin`
- Заменить `ensureClient()` → `ensureAdminClient()`
- Заменить `if (!supabase)` → `if (!supabaseAdmin)`

**Функции для изменения:**
- `listPublicEvents()`
- `listEventsByCreator()`
- `getEventById()`
- `listEventsWithOwner()`

---

### **1.2. `participantRepo.ts`**

**Аналогично `eventRepo.ts`:**

```typescript
// БЫЛО:
export async function listParticipants(eventId) {
  const { data } = await supabase
    .from('event_participants')
    .select('*')
    .eq('event_id', eventId);
}

// СТАЛО:
export async function listParticipants(eventId) {
  const { data } = await supabaseAdmin
    .from('event_participants')
    .select('*')
    .eq('event_id', eventId);
}
```

**Функции:**
- `listParticipants()`
- `countParticipants()`
- `findParticipantByUser()`
- `listEventIdsForUser()`
- `listParticipantEventIds()`

---

### **1.3. `clubRepo.ts`**

**Аналогично:**

```typescript
// Заменить supabase → supabaseAdmin во всех функциях:
- listClubs()
- getClubById()
- getClubWithMembers()
- etc.
```

---

### **1.4. `eventAccessRepo.ts`**

**Аналогично:**

```typescript
// Заменить supabase → supabaseAdmin:
- listAccessibleEventIds()
- upsertEventAccess()
```

---

### **1.5. Справочные репозитории**

**Эти можно оставить на `supabase` (anon) — они публичные:**
- `cityRepo.ts` — города публичны
- `currencyRepo.ts` — валюты публичны
- `eventCategoryRepo.ts` — категории публичны
- `carBrandRepo.ts` — бренды публичны
- `vehicleTypeRepo.ts` — типы авто публичны

**НО:** Добавить GRANT для них:
```sql
GRANT SELECT ON cities TO anon, authenticated;
GRANT SELECT ON currencies TO anon, authenticated;
GRANT SELECT ON event_categories TO anon, authenticated;
GRANT SELECT ON car_brands TO anon, authenticated;
GRANT SELECT ON vehicle_types TO anon, authenticated;
```

---

## 📦 ФАЗА 2: Упростить RLS политики

### **2.1. Новый подход к RLS**

**Цель:** RLS только для защиты от SQL injection, не для authorization.

```sql
-- ============================================================================
-- НОВАЯ СТРАТЕГИЯ RLS
-- ============================================================================
--
-- ВАЖНО: Мы используем Custom JWT Auth (не Supabase Auth)
-- auth.uid() всегда возвращает NULL для наших пользователей
--
-- РЕШЕНИЕ: Service Role Key + Application-Level Authorization
-- 1. Server-side код использует supabaseAdmin (service role)
-- 2. Service role BYPASS RLS
-- 3. Authorization checks делаются в application code
-- 4. RLS защищает только от SQL injection и direct DB access
--
-- ============================================================================

-- Для событий: Разрешить SELECT всем (application делает фильтрацию)
CREATE POLICY "events_select_via_service_role"
  ON public.events
  FOR SELECT
  USING (true);  -- Application layer filters by visibility

-- Блокировать прямые INSERT/UPDATE/DELETE (только через application)
CREATE POLICY "events_insert_via_application_only"
  ON public.events
  FOR INSERT
  WITH CHECK (false);  -- Block direct inserts

CREATE POLICY "events_update_via_application_only"
  ON public.events
  FOR UPDATE
  USING (false);  -- Block direct updates

CREATE POLICY "events_delete_via_application_only"
  ON public.events
  FOR DELETE
  USING (false);  -- Block direct deletes
```

**Это:**
- ✅ Защищает от SQL injection (USING false блокирует мутации)
- ✅ Разрешает SELECT (application фильтрует)
- ✅ Service role bypass всё это
- ✅ Просто и понятно

---

### **2.2. Создать миграцию для упрощения RLS**

```sql
-- Drop старые сложные политики с auth.uid()
DROP POLICY IF EXISTS "events_select_public" ON events;
DROP POLICY IF EXISTS "events_select_unlisted" ON events;
DROP POLICY IF EXISTS "events_select_restricted_with_access" ON events;
DROP POLICY IF EXISTS "events_select_own" ON events;
DROP POLICY IF EXISTS "events_insert_authenticated" ON events;
DROP POLICY IF EXISTS "events_update_own" ON events;
DROP POLICY IF EXISTS "events_delete_own" ON events;

-- Создать простые политики
CREATE POLICY "events_select_all" ON events FOR SELECT USING (true);
CREATE POLICY "events_no_direct_insert" ON events FOR INSERT WITH CHECK (false);
CREATE POLICY "events_no_direct_update" ON events FOR UPDATE USING (false);
CREATE POLICY "events_no_direct_delete" ON events FOR DELETE USING (false);
```

---

## 📦 ФАЗА 3: Обновить документацию

### **3.1. Создать `ARCHITECTURE_AUTH.md`**

**Содержание:**
- Почему используется Custom JWT
- Как работает Service Role pattern
- Почему RLS не используется для authorization
- Примеры authorization checks в application layer

### **3.2. Создать `SECURITY_MODEL.md`**

**Содержание:**
- Defense in Depth (3 слоя)
- Middleware (rate limiting, JWT verify)
- Application (authorization checks)
- Database (RLS защита от injection)

### **3.3. Добавить комментарии в код**

```typescript
// src/lib/db/eventRepo.ts

/**
 * ⚠️ ВАЖНО: Authorization Note
 * 
 * Мы используем supabaseAdmin (service role) для всех server-side запросов
 * потому что используем Custom JWT Auth (не Supabase Auth).
 * 
 * auth.uid() в RLS политиках всегда возвращает NULL для наших пользователей.
 * 
 * Authorization checks делаются в application layer:
 * - src/lib/services/events.ts - проверяет visibility
 * - src/lib/utils/eventVisibility.ts - централизованная логика
 * 
 * RLS остаётся как защита от SQL injection и direct DB access.
 */
import { supabaseAdmin, ensureAdminClient } from "@/lib/db/client";
```

---

## 📦 ФАЗА 4: Добавить GRANT для справочных таблиц

```sql
-- Справочные таблицы должны быть доступны всем
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT SELECT ON public.currencies TO anon, authenticated;
GRANT SELECT ON public.event_categories TO anon, authenticated;
GRANT SELECT ON public.car_brands TO anon, authenticated;
GRANT SELECT ON public.vehicle_types TO anon, authenticated;
GRANT SELECT ON public.club_plans TO anon, authenticated;
```

---

## ✅ ЧЕКЛИСТ МИГРАЦИИ

### **Repositories (заменить client):**
- [ ] `eventRepo.ts` — заменить `supabase` → `supabaseAdmin`
- [ ] `participantRepo.ts` — заменить `supabase` → `supabaseAdmin`
- [ ] `clubRepo.ts` — заменить `supabase` → `supabaseAdmin`
- [ ] `eventAccessRepo.ts` — заменить `supabase` → `supabaseAdmin`
- [ ] `userRepo.ts` — заменить `supabase` → `supabaseAdmin`

### **RLS Policies:**
- [ ] Упростить политики на `events`
- [ ] Упростить политики на `event_participants`
- [ ] Упростить политики на `event_user_access`
- [ ] Упростить политики на `club_members`
- [ ] Упростить политики на `users`
- [ ] Упростить политики на `clubs`

### **GRANT:**
- [ ] Добавить GRANT SELECT на справочные таблицы

### **Документация:**
- [ ] Создать `ARCHITECTURE_AUTH.md`
- [ ] Создать `SECURITY_MODEL.md`
- [ ] Добавить комментарии в repositories

### **Тестирование:**
- [ ] Homepage загружается для анонимов
- [ ] Homepage загружается для авторизованных
- [ ] Создание событий работает
- [ ] Редактирование событий работает
- [ ] Регистрация на события работает
- [ ] Удаление событий работает

---

## 📊 ОЦЕНКА ИЗМЕНЕНИЙ

| Тип изменения | Файлов | Строк кода | Сложность | Риск |
|---------------|--------|------------|-----------|------|
| Repo refactor | 5 | ~50 | 🟢 Низкая | 🟢 Низкий |
| RLS simplify | 6 tables | ~100 SQL | 🟢 Низкая | 🟢 Низкий |
| GRANT additions | 1 migration | ~10 SQL | 🟢 Низкая | 🟢 Низкий |
| Documentation | 3 files | ~500 | 🟢 Низкая | ⚪ Нет |
| **ИТОГО** | **~15 файлов** | **~660 строк** | **🟢 НИЗКАЯ** | **🟢 НИЗКИЙ** |

---

## 🎯 РЕЗУЛЬТАТ

**После миграции:**
- ✅ Homepage загружается корректно (anon + auth)
- ✅ Authorization работает (application layer)
- ✅ RLS защищает от SQL injection
- ✅ Service Role используется последовательно
- ✅ Код чистый и понятный
- ✅ Безопасность сохранена (multi-layer)
- ✅ Нет костылей
- ✅ Архитектура правильная

---

**Следующий шаг:** Утвердить план и начать реализацию по фазам.
