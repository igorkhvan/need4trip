# Миграция: Add RLS Policy for Currencies

## Проблема
API `/api/currencies` возвращает пустой массив `[]`, хотя таблица существует и заполнена.

## Причина
Включен Row Level Security (RLS) на таблице `currencies`, но нет политик доступа.

## Решение
Создана политика для публичного чтения:
- `Enable read access for all users` - разрешает SELECT для всех

## Применение через Supabase Dashboard

1. Перейдите в **SQL Editor** в Supabase Dashboard
2. Вставьте содержимое файла `20241213_add_currencies_rls.sql`
3. Нажмите **Run**

## Проверка

После применения миграции:
```bash
# В консоли браузера должны появиться логи:
✅ [currencyRepo] Fetched 8 currencies from DB
Sample currency: {code: "RUB", symbol: "₽", ...}
```

## Альтернативный способ (через psql)

```bash
psql $DATABASE_URL -f supabase/migrations/20241213_add_currencies_rls.sql
```

