# 🔐 Настройка Environment Variables в Vercel

## Проблема
Приложение использует Supabase, но переменные окружения не настроены в Vercel.

---

## ✅ Решение: Добавить переменные в Vercel Dashboard

### 1. Откройте Vercel Project Settings
```
https://vercel.com/igorkhvan/need4trip/settings/environment-variables
```

### 2. Добавьте следующие переменные

#### Обязательные (Required)

**NEXT_PUBLIC_SUPABASE_URL**
```
https://djbqwsipllhdydshuokg.supabase.co
```
- Environment: ✅ Production, ✅ Preview, ✅ Development

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqYnF3c2lwbGxoZHlkc2h1b2tnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODg1NjEsImV4cCI6MjA4MDI2NDU2MX0.G2-GzlN_WiaMC657BWcqiMtwzMyW1Qd5YBiVkrymOuw
```
- Environment: ✅ Production, ✅ Preview, ✅ Development

#### Опционально (Optional)

**SUPABASE_SERVICE_ROLE_KEY**
```
(получите из Supabase Dashboard > Settings > API)
```
- Environment: ✅ Production, ⚠️ Preview (осторожно!), ❌ Development
- **Важно:** Этот ключ **обходит RLS** (Row Level Security), используйте осторожно!

**OPENAI_API_KEY** (для AI-генерации правил)
```
sk-proj-your-key-here
```
- Environment: ✅ Production, ✅ Preview, ✅ Development

**OPENAI_MODEL** (опционально)
```
gpt-4o-mini
```
- Environment: ✅ Production, ✅ Preview, ✅ Development

---

## 🔍 Где найти ключи Supabase

### 1. Откройте Supabase Dashboard
```
https://supabase.com/dashboard/project/djbqwsipllhdydshuokg
```

### 2. Settings → API
- **URL:** Project URL
- **anon/public key:** `anon` (публичный, безопасно показывать)
- **service_role key:** `service_role` (секретный, НЕ показывать!)

---

## 🚀 После добавления переменных

### 1. Redeploy приложения
```bash
# Vercel автоматически создаст новый деплой при git push
git commit --allow-empty -m "trigger redeploy with env vars"
git push origin main
```

ИЛИ в Vercel Dashboard:
```
Deployments → Latest Deployment → ... → Redeploy
```

### 2. Проверьте что переменные применились
```bash
# Откройте production сайт
https://need4trip.app

# Проверьте консоль браузера (F12)
# Не должно быть ошибок Supabase
```

---

## ⚠️ Важные замечания

### `NEXT_PUBLIC_*` переменные
- **Видны в браузере** (в bundle)
- **Безопасно:** Anon key защищен Row Level Security (RLS)
- **Обязательны** для работы приложения

### `SUPABASE_SERVICE_ROLE_KEY`
- **Секретный ключ** - НИКОГДА не начинается с `NEXT_PUBLIC_`
- **Обходит RLS** - полный доступ к БД
- **Используется только server-side** (API routes)
- ❌ **Не добавляйте** если не уверены что он нужен

### Текущее состояние
Сейчас приложение **не использует** `SERVICE_ROLE_KEY`:
- Все операции с БД через **anon key** + **RLS**
- Это **безопаснее** и правильнее
- SERVICE_ROLE_KEY закомментирован в коде

---

## 🧪 Проверка после настройки

### 1. Build успешный
```bash
# В Vercel Deployment Logs не должно быть:
# "Supabase configuration incomplete"
# "URL or anon key is missing"
```

### 2. Runtime работает
```bash
# Откройте https://need4trip.app
# Должны загружаться:
# - События
# - Профиль пользователя
# - Клубы
```

### 3. Нет ошибок в консоли
```javascript
// F12 → Console
// Не должно быть:
// "Supabase client is not initialized"
```

---

## 📝 Checklist

- [ ] Добавить `NEXT_PUBLIC_SUPABASE_URL` в Vercel
- [ ] Добавить `NEXT_PUBLIC_SUPABASE_ANON_KEY` в Vercel
- [ ] (Опционально) Добавить `OPENAI_API_KEY` для AI-функций
- [ ] Redeploy приложения
- [ ] Проверить что сайт работает
- [ ] Проверить что нет ошибок в консоли

---

## 🆘 Troubleshooting

### Проблема: "Supabase client is not initialized"
**Решение:** Проверьте что переменные добавлены в Vercel и redeploy сделан

### Проблема: "Invalid JWT token"
**Решение:** Перепроверьте `NEXT_PUBLIC_SUPABASE_ANON_KEY` - он должен быть точно таким же как в Supabase Dashboard

### Проблема: Переменные не применяются
**Решение:** 
1. Проверьте что выбрали правильные Environments (Production/Preview/Development)
2. Сделайте Redeploy (не просто git push, а именно Redeploy)

---

## 📚 Документация

**Vercel Env Vars:** https://vercel.com/docs/projects/environment-variables  
**Supabase Keys:** https://supabase.com/docs/guides/api/api-keys  
**Next.js Env:** https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
