# 🚀 Quick Start: Применение миграций

## 📋 Предварительные требования

✅ Supabase CLI установлен (`brew install supabase/tap/supabase`)  
✅ У вас есть доступ к Supabase проекту

---

## ⚡ Быстрый старт (1 команда)

### **ШАГ 1: Получите credentials**

1. **Access Token:**  
   → https://supabase.com/dashboard/account/tokens  
   → Создайте новый token

2. **Database Password:**  
   → https://supabase.com/dashboard/project/djbqwsipllhdydshuokg/settings/database  
   → Скопируйте "Database password"

### **ШАГ 2: Запустите скрипт**

```bash
cd /Users/igorkhvan/Git/need4trip

# Экспортируйте credentials
export SUPABASE_ACCESS_TOKEN='ваш-токен'
export DB_PASSWORD='ваш-пароль'

# Запустите скрипт
./apply_migrations.sh
```

**ИЛИ** одной командой:

```bash
SUPABASE_ACCESS_TOKEN='токен' DB_PASSWORD='пароль' ./apply_migrations.sh
```

---

## 🔧 Альтернативный вариант (вручную)

### 1. Login и Link

```bash
export SUPABASE_ACCESS_TOKEN='ваш-токен'

/opt/homebrew/bin/supabase link \
  --project-ref djbqwsipllhdydshuokg \
  --password 'ваш-пароль'
```

### 2. Применить миграции одну за другой

```bash
/opt/homebrew/bin/supabase db execute --file supabase/migrations/20241213_normalize_cities.sql
/opt/homebrew/bin/supabase db execute --file supabase/migrations/20241213_migrate_events_city_to_fk.sql
/opt/homebrew/bin/supabase db execute --file supabase/migrations/20241213_migrate_users_city_to_fk.sql
/opt/homebrew/bin/supabase db execute --file supabase/migrations/20241213_migrate_clubs_city_to_fk.sql
/opt/homebrew/bin/supabase db execute --file supabase/migrations/20241213_normalize_car_brands_in_users.sql
/opt/homebrew/bin/supabase db execute --file supabase/migrations/20241213_normalize_currencies.sql
```

### 3. Проверить результат

```bash
# Проверить количество городов (должно быть 45)
/opt/homebrew/bin/supabase db remote exec "SELECT COUNT(*) FROM cities;"

# Проверить количество валют (должно быть 14)
/opt/homebrew/bin/supabase db remote exec "SELECT COUNT(*) FROM currencies;"

# Проверить миграцию events
/opt/homebrew/bin/supabase db remote exec "
  SELECT 
    COUNT(*) as total,
    COUNT(city_id) as with_city_id,
    COUNT(currency_code) as with_currency_code
  FROM events;
"
```

---

## ✅ После применения миграций

### 1. Перезапустите приложение

```bash
npm run dev
```

### 2. Протестируйте новую функциональность

**Автокомплит городов:**
- Откройте: http://localhost:3000/events/create
- Кликните поле "Город"
- Должны увидеть популярные города
- Начните вводить "Мос" → должна показаться "Москва"

**Фильтрация событий:**
- Откройте: http://localhost:3000/events
- Должны увидеть кнопки фильтров по городам

**Выбор валюты:**
- Откройте: http://localhost:3000/events/create
- Включите "Платное событие"
- Должен появиться dropdown с валютами (₽, $, €)

---

## 🆘 Troubleshooting

### "Access token not provided"
```bash
export SUPABASE_ACCESS_TOKEN='ваш-токен'
```

### "Password authentication failed"
```bash
# Сбросьте пароль на:
# https://supabase.com/dashboard/project/djbqwsipllhdydshuokg/settings/database
```

### "Migration already applied"
```bash
# Пропустите эту миграцию, это нормально
```

### "Table already exists"
```bash
# Проверьте какие миграции уже применены:
/opt/homebrew/bin/supabase db remote exec "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;"
```

---

## 📞 Дополнительная информация

- Полная документация: `MIGRATION_APPLY_GUIDE.md`
- Архитектура: `docs/DB_NORMALIZATION_COMPLETE.md`

---

**Готовы начать? Запустите:** `./apply_migrations.sh` 🚀

