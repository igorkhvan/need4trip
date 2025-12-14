# 🎯 ИНСТРУКЦИЯ: Применить миграцию club_plans

## Что нужно сделать

Применить миграцию `20241213_create_club_plans.sql` в Supabase Dashboard.

## Почему это нужно

- Таблица `club_plans` **отсутствует в БД**
- Миграция была упущена при развёртывании
- Без этой таблицы `clubPlanRepo` не может работать
- После применения миграции и регенерации типов - уберём все `@ts-expect-error`

## 📋 Шаги

### Шаг 1: Открой Supabase Dashboard
```
https://supabase.com/dashboard/project/YOUR_PROJECT
→ SQL Editor
```

### Шаг 2: Скопируй содержимое миграции
Файл: `supabase/migrations/20241213_create_club_plans.sql`

Или используй команду:
```bash
cat supabase/migrations/20241213_create_club_plans.sql
```

### Шаг 3: Вставь в SQL Editor и выполни
```sql
-- Создаст таблицу club_plans
-- Добавит 3 плана: free, basic, pro
-- Создаст индексы и триггеры
-- Установит FK constraints
```

### Шаг 4: Проверь результат
```sql
SELECT id, name, price_monthly FROM club_plans ORDER BY price_monthly;
```

Должно вернуть:
```
club_free  | Free  | 0
club_basic | Basic | 990
club_pro   | Pro   | 4990
```

### Шаг 5: Регенерируй типы Supabase
```bash
export SUPABASE_ACCESS_TOKEN=your_token
supabase gen types typescript --project-id YOUR_REF > src/lib/types/supabase.ts
```

### Шаг 6: Проверь что типы обновлены
```bash
grep -c "club_plans" src/lib/types/supabase.ts
```

Должно быть > 0 (сейчас 0)

## ✅ После выполнения

Сообщи мне "миграция применена, типы регенерированы" и я:

1. 🔍 Найду все `@ts-expect-error` связанные с club_plans
2. 🗑️ Удалю их из кода
3. ✅ Проверю что TypeScript компиляция проходит
4. 📦 Закоммичу финальный fix
5. 🚀 Запушу всё

## 📁 Файл миграции

`supabase/migrations/20241213_create_club_plans.sql` содержит:
- CREATE TABLE club_plans (id, name, description, price_monthly, max_active_events, max_organizers, feature flags)
- INSERT 3 plans (free, basic, pro)
- CREATE indexes and triggers
- ADD FK constraint to club_subscriptions

---

**После этого всё будет работать без `@ts-expect-error` костылей!** ✨
