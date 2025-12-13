# Telegram Login Widget - Настройка

## 🐛 Проблема: Telegram Widget не отображается

Если виджет Telegram не отображается в модалке авторизации, проверьте следующее:

### ✅ Checklist

#### 1. Переменные окружения

**Файл:** `.env.local`

```bash
# Telegram Bot Configuration
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_BOT_TOKEN=your_bot_token

# Auth Configuration
NEXT_PUBLIC_TELEGRAM_AUTH_URL=https://your-domain.com/api/auth/telegram
# ИЛИ оставьте пустым, чтобы использовать window.location.origin
```

**Важно:**
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` - имя бота **без @** (например: `need4trip_bot`)
- `TELEGRAM_BOT_TOKEN` - токен от @BotFather
- `NEXT_PUBLIC_TELEGRAM_AUTH_URL` - опционально (по умолчанию `{origin}/api/auth/telegram`)

#### 2. Настройка Telegram Bot

**В @BotFather:**

1. Создайте бота: `/newbot`
2. Получите токен (сохраните в `TELEGRAM_BOT_TOKEN`)
3. Настройте домен для авторизации:
   ```
   /setdomain
   Выберите вашего бота
   Введите: your-domain.com
   ```

**Для локальной разработки:**
```
/setdomain
Выберите вашего бота
Введите: localhost
```

#### 3. Debug в браузере

Откройте DevTools → Console и проверьте логи:

```javascript
// При открытии модалки должны быть логи:
[auth-modal] Widget init: {
  open: true,
  hasContainer: true,
  username: "your_bot_username",
  authUrl: "https://your-domain.com/api/auth/telegram",
  isAuthed: false,
  botUsername: "your_bot_username"
}

[auth-modal] ✅ Appending Telegram Widget script
```

**Если видите:**
```javascript
❌ NEXT_PUBLIC_TELEGRAM_BOT_USERNAME not set!
```

→ Проверьте `.env.local` и перезапустите dev сервер

#### 4. Проверка загрузки скрипта

**В DevTools → Network:**
- Должен быть запрос к `https://telegram.org/js/telegram-widget.js?22`
- Статус: 200 OK

**В DevTools → Elements:**
- Найдите `<iframe>` внутри модалки
- Если iframe есть → виджет загружается
- Если iframe нет → проблема с конфигурацией

#### 5. Частые ошибки

**Ошибка:** Виджет не отображается
- ✅ Проверьте `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` в `.env.local`
- ✅ Перезапустите dev server (`npm run dev`)
- ✅ Очистите кэш браузера (Ctrl+Shift+R / Cmd+Shift+R)

**Ошибка:** "Bot domain invalid"
- ✅ Настройте `/setdomain` в @BotFather
- ✅ Убедитесь, что домен совпадает с вашим URL

**Ошибка:** Виджет есть, но авторизация не работает
- ✅ Проверьте `TELEGRAM_BOT_TOKEN` в `.env.local`
- ✅ Проверьте, что API endpoint `/api/auth/telegram` доступен

#### 6. Production Checklist

Перед деплоем на production:

1. ✅ Добавьте production домен в @BotFather (`/setdomain`)
2. ✅ Установите `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` в Vercel/hosting
3. ✅ Установите `TELEGRAM_BOT_TOKEN` в Vercel/hosting
4. ✅ Установите `NEXT_PUBLIC_TELEGRAM_AUTH_URL` (опционально)
5. ✅ Проверьте, что HTTPS включен (Telegram требует HTTPS)

---

## 🔧 Как исправить прямо сейчас

### Шаг 1: Создайте `.env.local`

```bash
cd /Users/igorkhvan/Git/need4trip
cp .env.example .env.local
```

### Шаг 2: Заполните переменные

```bash
# .env.local
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### Шаг 3: Настройте бота в @BotFather

```
/setdomain
→ Выберите вашего бота
→ Введите: localhost
```

### Шаг 4: Перезапустите dev server

```bash
npm run dev
```

### Шаг 5: Проверьте в браузере

1. Откройте приложение
2. Кликните "Создать событие" (неавторизован)
3. Откройте DevTools → Console
4. Проверьте логи `[auth-modal] Widget init`
5. Виджет Telegram должен отобразиться

---

## 📋 Пример `.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Telegram
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=need4trip_bot
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
NEXT_PUBLIC_TELEGRAM_AUTH_URL=http://localhost:3000/api/auth/telegram

# Auth
AUTH_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

---

## 🧪 Тестирование

**1. Проверка переменных в runtime:**

```javascript
// В браузере DevTools Console:
console.log({
  botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  authUrl: process.env.NEXT_PUBLIC_TELEGRAM_AUTH_URL,
});
```

**2. Проверка виджета:**

```javascript
// Должен быть элемент:
document.querySelector('script[src*="telegram-widget.js"]')
```

**3. Проверка iframe:**

```javascript
// После загрузки виджета должен быть:
document.querySelector('iframe[src*="telegram.org"]')
```

---

## 🐛 Debug режим

В `src/components/auth/auth-modal.tsx` добавлено debug логирование:

```typescript
console.log("[auth-modal] Widget init:", {
  open,
  hasContainer: !!container,
  username,
  authUrl,
  isAuthed,
  botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
});
```

Эти логи помогут диагностировать проблему!

---

## 📞 Поддержка

Если проблема не решена:

1. Проверьте все пункты checklist
2. Посмотрите логи в DevTools Console
3. Проверьте Network tab на наличие ошибок
4. Убедитесь, что перезапустили dev server после изменения `.env.local`

