# Инструкция: Настройка Upstash Redis для rate limiting

**Цель:** Включить rate limiting с минимальной latency для казахстанских пользователей

---

## 🚀 Шаг 1: Создать Upstash Redis Database

### 1.1 Зайти в Upstash Console

Откройте: https://console.upstash.com/

Если нет аккаунта:
- Sign up (бесплатный tier: 10K requests/day)
- Можно войти через GitHub

### 1.2 Создать новую базу

**Create Database:**
```
Name: need4trip-rate-limit
Type: Regional (НЕ Global!)
Region: EU-Central-1 (Frankfurt) ✅
Eviction: No Eviction
```

**ВАЖНО:** Выбрать именно **EU-Central-1 (Frankfurt)**!

**Почему Frankfurt?**
- Vercel functions в `fra1` (Frankfurt)
- Latency: 5-10ms ⚡
- Близко к Казахстану (4000 км vs 10000 км до US)

### 1.3 Получить credentials

После создания вы увидите:
```
REST URL:  https://eu2-xxxxx.upstash.io
REST Token: AYxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Скопируйте оба значения!**

---

## 🔧 Шаг 2: Настроить Vercel Environment Variables

### 2.1 Открыть Vercel Dashboard

```
https://vercel.com/your-username/need4trip/settings/environment-variables
```

### 2.2 Добавить переменные

**Добавить 2 новые переменные:**

**Variable 1:**
```
Name:  UPSTASH_REDIS_REST_URL
Value: https://eu2-xxxxx.upstash.io  (из шага 1.3)
Environment: Production, Preview, Development (все 3)
```

**Variable 2:**
```
Name:  UPSTASH_REDIS_REST_TOKEN
Value: AYxxxxxxxxxxxxxxxxxxxxxxxxxxxx  (из шага 1.3)
Environment: Production, Preview, Development (все 3)
```

**Нажать "Save"**

---

## 🚀 Шаг 3: Redeploy приложения

### 3.1 Запустить новый deployment

**Вариант A: Через Vercel Dashboard**
```
Deployments → ... (три точки у последнего deployment) → Redeploy
```

**Вариант B: Через git push (уже сделано)**
```bash
# Уже запушен commit 2435db2
# Vercel автоматически задеплоит
```

### 3.2 Дождаться завершения

Build займет 2-3 минуты.

Vercel покажет:
```
✓ Building
✓ Deploying
✓ Ready
```

---

## ✅ Шаг 4: Проверка

### 4.1 Проверить что rate limiting работает

**Откройте need4trip.app**

В DevTools → Console не должно быть ошибок.

### 4.2 Проверить latency

**Vercel Dashboard → Functions → Logs**

Ищите:
```
✅ Middleware без warnings (если latency < 100ms)
❌ [Middleware] ⚠️ Slow rate limit check (если > 100ms)
```

**Если НЕТ warnings → всё работает отлично!** ⚡

**Если ЕСТЬ warnings → Upstash region неправильный**, проверьте что выбрали EU-Central-1.

### 4.3 Тест rate limiting

**Проверить что защита работает:**

```bash
# Быстро обновить страницу 15 раз подряд
# На 11-м запросе должна появиться ошибка 429 (Too Many Requests)
```

---

## 📊 Ожидаемые результаты

### До настройки (без rate limiting):
```
✅ API быстрые
❌ НЕТ защиты от DDoS
❌ Уязвимость к abuse
```

### После настройки (с EU Upstash):
```
✅ API быстрые (middleware < 20ms)
✅ Защита от DDoS активна
✅ Rate limits: 10 req/10s (auth), 60 req/60s (unauth)
```

### Если Upstash в неправильном region (US):
```
⚠️ API медленные (middleware 200ms)
✅ Защита работает
❌ Плохой UX из-за latency
```

---

## 🐛 Troubleshooting

### Проблема 1: Warning "Slow rate limit check"

**Причина:** Upstash в US region, а Vercel в EU

**Решение:**
1. Удалить текущую Upstash database
2. Создать новую в **EU-Central-1**
3. Обновить credentials в Vercel
4. Redeploy

### Проблема 2: Rate limiting не работает (нет 429 errors)

**Причина:** Environment variables не применились

**Решение:**
1. Проверить что переменные добавлены для всех environments
2. Сделать **Redeploy** (не просто commit)
3. Очистить кэш Vercel

### Проблема 3: 401 Unauthorized from Upstash

**Причина:** Неправильный REST Token

**Решение:**
1. В Upstash Console → Details → REST API
2. Скопировать НОВЫЙ token
3. Обновить `UPSTASH_REDIS_REST_TOKEN` в Vercel
4. Redeploy

---

## 💰 Upstash Pricing

**Free tier (достаточно для начала):**
```
- 10,000 commands/day
- 256 MB storage
- EU region доступен
```

**Paid tier (если нужно больше):**
```
- $0.20 за 100K commands
- Unlimited storage
- Multi-region
```

Для need4trip с ~1000 users/day: **Free tier достаточно** ✅

---

## 📝 Summary

**Что сделали:**
1. ✅ Создали Upstash Redis в EU-Central-1
2. ✅ Настроили credentials в Vercel
3. ✅ Включили rate limiting в коде (commit 2435db2)
4. ✅ Redeploy приложения

**Результат:**
- Rate limiting: **ENABLED** ✅
- Latency: **< 20ms** ⚡
- Защита от DDoS: **ACTIVE** ✅

**Следующий шаг после настройки:**
Проверить новый HAR лог и убедиться что нет warnings! 🎉

---

**Создано:** 24 декабря 2024, 16:00 MSK  
**Commit:** 2435db2  
**Status:** Ready to configure Upstash

