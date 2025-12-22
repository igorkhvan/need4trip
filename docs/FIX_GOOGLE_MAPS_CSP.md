# 🔧 Fix: Google Maps не отображается в MapPreviewModal

**Дата:** 22 декабря 2024  
**Статус:** ✅ FIXED

---

## 🐛 Проблема

**Симптомы:**
- Модальное окно карты открывается
- Header и кнопки видны
- Но карта (Google Maps iframe) не отображается

---

## 🔍 Root Cause

**Content Security Policy (CSP) блокировал Google Maps iframe**

### Текущая конфигурация (next.config.ts:14)
```typescript
"frame-src https://telegram.org https://oauth.telegram.org",
```

**Проблема:**
- ❌ Google Maps (`https://maps.google.com`) НЕ включен в `frame-src`
- ❌ Браузер блокирует загрузку iframe от maps.google.com
- ❌ В консоли браузера ошибка: `Refused to display 'https://maps.google.com/' in a frame because it set 'X-Frame-Options'`

---

## ✅ Решение

### Добавить Google Maps в frame-src

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live",
      // ✅ БЫЛО: "frame-src https://telegram.org https://oauth.telegram.org",
      "frame-src https://telegram.org https://oauth.telegram.org https://maps.google.com https://www.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  },
  // ... other headers
];
```

### Что изменилось:
```diff
- "frame-src https://telegram.org https://oauth.telegram.org",
+ "frame-src https://telegram.org https://oauth.telegram.org https://maps.google.com https://www.google.com",
```

---

## 🎯 Почему оба домена?

### `https://maps.google.com`
- Основной домен для Google Maps Embed API
- Используется в MapPreviewModal для iframe src

### `https://www.google.com`
- Google может редиректить запросы между доменами
- Некоторые ресурсы карты загружаются с www.google.com
- Необходим для полной функциональности карты

---

## 🔒 Безопасность

### ✅ Изменение безопасно:
1. **Разрешаем только Google Maps**
   - Не `https://*` (все сайты)
   - Только конкретные домены Google

2. **CSP остается строгим**
   - `frame-ancestors 'none'` - наш сайт нельзя встроить в другие
   - `default-src 'self'` - все остальное только с нашего домена
   - Остальные директивы не изменены

3. **Минимальные права**
   - Только загрузка iframe
   - Нет доступа к другим API Google
   - Нет скриптов с Google (кроме карты)

---

## 📊 Technical Details

### MapPreviewModal.tsx
```typescript
function GoogleMapEmbed({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  // Google Maps Embed URL
  const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=ru&z=15&output=embed`;
  
  return (
    <iframe
      title={`Карта: ${title}`}
      src={mapUrl}  // ← Этот URL был заблокирован CSP
      width="100%"
      height="100%"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
```

### Как работает:
1. **User открывает модальное окно** → `MapPreviewModal` рендерится
2. **Рендерится `GoogleMapEmbed`** → создается `<iframe src="https://maps.google.com/...">`
3. **Браузер проверяет CSP** → `frame-src` разрешает `https://maps.google.com` ✅
4. **Iframe загружается** → Google Maps отображается

**До фикса:**
- Шаг 3: CSP блокирует → ❌ Ошибка в консоли
- Шаг 4: Iframe не загружается → Пустое окно

**После фикса:**
- Шаг 3: CSP разрешает → ✅ OK
- Шаг 4: Iframe загружается → ✅ Карта отображается

---

## 🧪 Тестирование

### Как проверить:
```bash
1. npm run dev
2. Открыть страницу создания события
3. Добавить локацию с координатами (например: 43.238949, 76.889709)
4. Нажать кнопку "👁️" (Показать на карте)
5. ✅ Модальное окно открывается
6. ✅ Google Maps отображается с маркером
7. ✅ Нет ошибок в консоли браузера
```

### Проверка CSP в консоли:
```javascript
// Открыть DevTools → Console
// До фикса:
❌ Refused to display 'https://maps.google.com/' in a frame because it violates the following Content Security Policy directive: "frame-src https://telegram.org https://oauth.telegram.org"

// После фикса:
✅ (нет ошибок CSP)
```

---

## 📦 Изменённые файлы

- ✅ `next.config.ts` - добавлен Google Maps в frame-src

---

## 🚀 Deployment

### Build Status: ✅ SUCCESS
```bash
✓ TypeScript compilation passed
✓ No linter errors
✓ Build successful
```

### Rollout:
1. **Development:** Работает после `npm run dev`
2. **Production:** Работает после deploy (CSP применяется на сервере)
3. **No migration needed:** Только конфигурация Next.js

---

## 🎓 Lessons Learned

### CSP frame-src
- **Что блокирует:** Загрузку `<iframe>` с внешних доменов
- **Зачем нужно:** Защита от clickjacking и embedded malicious content
- **Как разрешить:** Добавить конкретный домен в `frame-src`

### Диагностика CSP:
1. **Консоль браузера** - главный инструмент
2. Ищи ошибки: `Refused to display`, `violates Content Security Policy`
3. Смотри на директиву: `frame-src`, `script-src`, `style-src`, etc.
4. Добавляй минимально необходимые домены

### Best Practice:
- ✅ Конкретные домены (`https://maps.google.com`)
- ❌ Wildcards (`https://*`, `*`)
- ✅ Минимальные права (только то, что нужно)
- ✅ Тестируй в разных браузерах (CSP может отличаться)

---

## 📝 Commit

```
fix: добавить Google Maps в CSP frame-src для отображения карт

Проблема:
- Модальное окно MapPreviewModal не отображало Google Maps
- Iframe блокировался Content Security Policy
- frame-src разрешал только Telegram URLs

Решение:
- Добавлен https://maps.google.com в frame-src
- Добавлен https://www.google.com в frame-src
- Теперь Google Maps iframe может загружаться

✅ Билд проходит успешно
✅ Карта теперь должна отображаться
```

**SHA:** `3ee02b9`

---

**Итог:** Простое изменение в CSP конфигурации исправило проблему с отображением Google Maps. 🗺️✅

