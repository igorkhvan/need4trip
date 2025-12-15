# 📋 Billing v2.0 Migration Guide — БЕЗОПАСНОЕ ПРИМЕНЕНИЕ

## 🎯 Текущее состояние БД

### ✅ Существующие таблицы:
- `club_subscriptions` (1 запись: `club_free` для клуба `99eb12f8...`)
- `clubs`, `club_members`, `club_cities` (остальные в порядке)

### ❌ Отсутствующие таблицы:
- `club_plans`
- `billing_policy`
- `billing_policy_actions`
- `billing_transactions`

---

## ⚠️ ВАЖНО: Про "club_free"

В v2.0 **Free plan больше не хранится в БД**:
- Free = отсутствие записи в `club_subscriptions`
- Платные планы = есть запись (`club_50`, `club_500`, `club_unlimited`)

**Ваша текущая подписка `club_free` будет удалена** — это нормально и безопасно.

---

## 🔧 Порядок выполнения миграций

### 1️⃣ CREATE club_plans (ОБЯЗАТЕЛЬНО ПЕРВЫМ!)

**Файл:** `supabase/migrations/20241215_create_club_plans_v2.sql`

Создаёт таблицу тарифов. **Выполни ПЕРЕД всеми остальными!**

```sql
-- Скопируй весь файл в Supabase Dashboard → SQL Editor → New Query → Run
```

✅ **Проверка:**
```sql
SELECT * FROM club_plans ORDER BY price_monthly_kzt;
```
Должно быть пусто (seed будет следующим).

---

### 2️⃣ SEED club_plans

**Файл:** `supabase/migrations/20241215_seed_club_plans.sql`

Заполняет тарифы: Club 50, Club 500, Unlimited.

✅ **Проверка:**
```sql
SELECT id, title, price_monthly_kzt, max_event_participants FROM club_plans;
```
Ожидаем 3 строки:
- `club_50` — 15,000 ₸ — 50 участников
- `club_500` — 50,000 ₸ — 500 участников
- `club_unlimited` — 150,000 ₸ — unlimited

---

### 3️⃣ ALTER club_subscriptions (БЕЗОПАСНАЯ МИГРАЦИЯ)

**Файл:** `supabase/migrations/20241215_alter_club_subscriptions_v2_SAFE.sql`

**⚠️ Что произойдёт:**
1. Создаст backup таблицу `club_subscriptions_backup_20241215`
2. Добавит новые колонки (`plan_id`, `status`, `grace_until`, etc.)
3. **УДАЛИТ** строку с `club_free` (это нормально!)
4. Мигрирует остальные данные (если есть платные подписки)
5. Удалит старые колонки (`plan`, `valid_until`, `active`)

✅ **Проверка ДО:**
```sql
-- Сохрани это для сравнения
SELECT * FROM club_subscriptions;
```

✅ **Проверка ПОСЛЕ:**
```sql
-- Должно быть пусто (club_free удалён)
SELECT * FROM club_subscriptions;

-- Проверь backup
SELECT * FROM club_subscriptions_backup_20241215;
-- Должен содержать старую строку с club_free

-- Проверь структуру
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'club_subscriptions'
ORDER BY ordinal_position;
```

---

### 4️⃣ DROP старый триггер автосоздания подписок

**Файл:** `supabase/migrations/20241215_drop_auto_subscription_trigger.sql`

**⚠️ КРИТИЧНО!** Старый триггер пытается создать `club_free` с колонками `plan`, `valid_until`, `active` — которые больше не существуют!

**Что произойдёт:**
1. Удалит триггер `trigger_create_club_subscription`
2. Удалит функцию `create_default_club_subscription()`
3. Новые клубы НЕ будут автоматически получать подписку (это правильно для v2.0!)

✅ **Проверка:**
```sql
-- Триггер должен отсутствовать
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_club_subscription';
-- Ожидаем 0 строк

-- Функция должна отсутствовать
SELECT proname 
FROM pg_proc 
WHERE proname = 'create_default_club_subscription';
-- Ожидаем 0 строк
```

---

### 5️⃣ ADD Foreign Key club_subscriptions → club_plans

**После предыдущих шагов выполни:**

```sql
-- Добавляем FK (теперь безопасно, т.к. club_plans существует)
ALTER TABLE club_subscriptions
  ADD CONSTRAINT club_subscriptions_plan_id_fkey 
  FOREIGN KEY (plan_id) REFERENCES club_plans(id);
```

---

### 6️⃣ CREATE billing_policy + SEED

**Файлы:**
- `20241215_create_billing_policy.sql`
- `20241215_seed_billing_policy.sql`

Создаёт политику биллинга (grace period = 7 дней, pending TTL = 60 мин).

✅ **Проверка:**
```sql
SELECT * FROM billing_policy;
```
Ожидаем 1 строку: `id='default'`, `grace_period_days=7`, `pending_ttl_minutes=60`.

---

### 7️⃣ CREATE billing_policy_actions + SEED

**Файлы:**
- `20241215_create_billing_policy_actions.sql`
- `20241215_seed_billing_policy_actions.sql`

Определяет разрешённые действия для каждого статуса подписки.

✅ **Проверка:**
```sql
SELECT status, action, is_allowed 
FROM billing_policy_actions 
ORDER BY status, action;
```

Ожидаем ~21 строку (7 actions × 3 statuses: pending/grace/expired).

---

### 8️⃣ CREATE billing_transactions

**Файл:** `20241215_create_billing_transactions.sql`

Создаёт audit trail для платежей.

✅ **Проверка:**
```sql
SELECT COUNT(*) FROM billing_transactions;
```
Должно быть 0 (пустая таблица для будущих транзакций).

---

## 🧪 Финальная проверка

После всех миграций выполни:

```sql
-- 1. Все новые таблицы созданы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'club_plans', 
    'billing_policy', 
    'billing_policy_actions', 
    'billing_transactions'
  )
ORDER BY table_name;
-- Ожидаем 4 строки

-- 2. club_subscriptions обновлена
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'club_subscriptions'
ORDER BY ordinal_position;
-- Ожидаем: club_id, plan_id, status, current_period_*, grace_until, created_at, updated_at

-- 3. club_subscriptions пуста (club_free удалён)
SELECT COUNT(*) FROM club_subscriptions;
-- Ожидаем 0

-- 4. Backup сохранён
SELECT COUNT(*) FROM club_subscriptions_backup_20241215;
-- Ожидаем 1 (старая club_free подписка)
```

---

## 🔄 Регенерация типов

После всех миграций выполни:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/lib/types/supabase.ts
```

Затем удали все `@ts-expect-error` комментарии из репозиториев.

---

## 📦 Итоговый чеклист

- [ ] 1. CREATE club_plans
- [ ] 2. SEED club_plans (3 тарифа)
- [ ] 3. ALTER club_subscriptions (безопасная миграция)
- [ ] 4. **DROP старый триггер** ⚠️ КРИТИЧНО!
- [ ] 5. ADD FK club_subscriptions → club_plans
- [ ] 6. CREATE + SEED billing_policy
- [ ] 7. CREATE + SEED billing_policy_actions
- [ ] 8. CREATE billing_transactions
- [ ] 9. Финальная проверка (4 таблицы созданы)
- [ ] 10. Регенерация типов
- [ ] 11. Удаление @ts-expect-error

---

## ⚠️ Если что-то пошло не так

### Откат ALTER club_subscriptions:

```sql
-- 1. Восстановить из backup
DROP TABLE club_subscriptions;
ALTER TABLE club_subscriptions_backup_20241215 RENAME TO club_subscriptions;

-- 2. Или оставить backup и продолжить
-- (backup можно удалить позже после проверки)
```

### Удаление всех изменений (полный откат):

```sql
DROP TABLE IF EXISTS club_plans CASCADE;
DROP TABLE IF EXISTS billing_policy CASCADE;
DROP TABLE IF EXISTS billing_policy_actions CASCADE;
DROP TABLE IF EXISTS billing_transactions CASCADE;
-- НЕ трогаем club_subscriptions (восстанови из backup выше)
```

---

## 🚀 После успешной миграции

1. ✅ Удали backup:
   ```sql
   DROP TABLE club_subscriptions_backup_20241215;
   ```

2. ✅ Выполни `git push origin main` (коммиты уже готовы)

3. ✅ Протестируй API:
   - GET /api/plans
   - POST /api/events (с разными maxParticipants)

**Готово!** 🎉
