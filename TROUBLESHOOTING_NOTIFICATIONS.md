# Troubleshooting: Настройки уведомлений не отображаются

## Шаг 1: Откройте консоль браузера

1. Откройте DevTools (F12 или Cmd+Option+I на Mac)
2. Перейдите на вкладку **Console**
3. Перейдите на страницу профиля → вкладка "Настройки"
4. Найдите логи с префиксом `[NotificationSettingsForm]`

---

## Возможные проблемы и решения

### ❌ Ошибка: "Failed to load settings" или 401/403

**Проблема:** Пользователь не авторизован

**Решение:**
1. Проверьте что вы залогинены
2. Попробуйте выйти и войти снова
3. Очистите cookies и перелогиньтесь

---

### ❌ Ошибка: 500 Internal Server Error

**Проблема:** Таблица `user_notification_settings` не создана в БД

**Проверка:**
```sql
-- В Supabase SQL Editor выполните:
SELECT * FROM user_notification_settings LIMIT 1;
```

**Если таблицы нет:**
```bash
# Применить миграцию
supabase db push

# Или в Supabase Dashboard:
# Database → SQL Editor → Upload file
# Загрузите: supabase/migrations/20241217_create_notification_tables.sql
```

---

### ❌ Ошибка: "Failed to load notification settings"

**Проблема:** Функция `getUserNotificationSettings` не работает

**Проверка в Supabase SQL Editor:**
```sql
-- Проверить что таблица существует
\d user_notification_settings

-- Проверить что есть RLS политики
SELECT * FROM pg_policies 
WHERE tablename = 'user_notification_settings';

-- Попробовать создать настройки вручную для текущего юзера
INSERT INTO user_notification_settings (user_id, is_telegram_enabled)
VALUES ('YOUR_USER_ID', true)
ON CONFLICT (user_id) DO NOTHING;
```

---

### ❌ Бесконечная загрузка (крутится спиннер)

**Проблема:** Запрос зависает

**Диагностика:**
1. Откройте DevTools → вкладка **Network**
2. Найдите запрос к `/api/profile/notifications`
3. Проверьте статус ответа и время выполнения

**Возможные причины:**
- API route не задеплоен (проверьте Vercel)
- Supabase не отвечает (проверьте статус)
- RLS блокирует запрос

---

### ❌ Компонент вообще не рендерится

**Проблема:** Не переключается на вкладку "Настройки"

**Проверка:**
1. Убедитесь что вы на странице `/profile`
2. Кликните на вкладку "Настройки"
3. Проверьте что `activeTab === 'settings'`

**В консоли браузера:**
```javascript
// Должно быть:
console.log('[NotificationSettingsForm] Loading settings...')
```

Если этого лога нет - компонент не монтируется.

---

## Проверка базы данных

### 1. Проверить что миграция применена

```sql
-- В Supabase SQL Editor
SELECT * FROM information_schema.tables 
WHERE table_name = 'user_notification_settings';
```

**Ожидаемый результат:** 1 строка

---

### 2. Проверить структуру таблицы

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_notification_settings';
```

**Ожидаемые колонки:**
- `user_id` (uuid)
- `is_telegram_enabled` (boolean)
- `notify_event_updated` (boolean)
- `notify_new_event_published` (boolean)
- `notify_event_cancelled` (boolean)
- `notify_new_participant_joined` (boolean)
- `notify_event_reminder` (boolean)
- `notify_organizer_message` (boolean)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

---

### 3. Проверить RLS политики

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'user_notification_settings';
```

**Должно быть минимум 2 политики:**
- `user_notification_settings_select_policy` (SELECT)
- `user_notification_settings_update_policy` (UPDATE)

---

## Проверка API endpoint

### Ручной тест API

```bash
# В терминале (замените на свой домен и куки)
curl https://your-domain.vercel.app/api/profile/notifications \
  -H "Cookie: your-session-cookie"
```

**Ожидаемый ответ:**
```json
{
  "settings": {
    "userId": "...",
    "isTelegramEnabled": true,
    "notifyEventUpdated": true,
    ...
  }
}
```

---

## Быстрая проверка всего

Скопируйте этот SQL в Supabase SQL Editor:

```sql
-- 1. Проверка таблицы
SELECT 'Table exists' as check, COUNT(*) as result
FROM information_schema.tables 
WHERE table_name = 'user_notification_settings'

UNION ALL

-- 2. Проверка RLS политик
SELECT 'RLS policies' as check, COUNT(*) as result
FROM pg_policies 
WHERE tablename = 'user_notification_settings'

UNION ALL

-- 3. Проверка записей
SELECT 'Total settings' as check, COUNT(*) as result
FROM user_notification_settings;
```

**Ожидаемый результат:**
```
check            | result
-----------------+--------
Table exists     | 1
RLS policies     | 2+
Total settings   | 0+ (зависит от юзеров)
```

---

## Если ничего не помогло

1. **Проверьте Vercel Deployment Logs:**
   - Dashboard → Project → Deployments → Latest
   - Функции → `/api/profile/notifications`
   - Проверьте есть ли ошибки

2. **Проверьте Supabase Logs:**
   - Dashboard → Logs → API Logs
   - Фильтр: последние 1 час
   - Найдите ошибки с `user_notification_settings`

3. **Создайте Issue:**
   - Приложите скриншот консоли браузера
   - Приложите результат SQL проверок
   - Укажите ваш user_id

---

## Контрольный список

- [ ] Пользователь авторизован
- [ ] Миграция `20241217_create_notification_tables.sql` применена
- [ ] Таблица `user_notification_settings` существует
- [ ] RLS политики созданы
- [ ] API endpoint `/api/profile/notifications` доступен
- [ ] В консоли браузера есть логи `[NotificationSettingsForm]`
- [ ] Нет ошибок 401/403/500

---

**Дата:** 14 декабря 2025
