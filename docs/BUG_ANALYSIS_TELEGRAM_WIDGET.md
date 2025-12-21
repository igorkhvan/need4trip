# 🔍 АНАЛИЗ: Проблемы с отображением Telegram виджета в модалке

**Дата**: 2025-12-22  
**Проблема**: Telegram виджет иногда не отображается в auth модалке (нет паттерна поведения)

---

## 🐛 СИМПТОМЫ

**Описание:**
- Telegram Login Widget периодически не отображается в модалке авторизации
- Нет явного паттерна (иногда работает, иногда нет)
- Пользователь видит пустое место вместо кнопки "Login with Telegram"

**Когда происходит:**
- ❓ Нестабильно (race conditions suspected)
- ❓ Может зависеть от скорости загрузки
- ❓ Может зависеть от timing открытия модалки

---

## 🔍 АНАЛИЗ ТЕКУЩЕЙ РЕАЛИЗАЦИИ

### **auth-modal.tsx (Главный компонент)**

#### ✅ Правильно реализованные аспекты:

1. **Retry mechanism:**
```tsx
let retryCount = 0;
const maxRetries = 10;

const initWidget = () => {
  if (!container) {
    if (retryCount < maxRetries) {
      retryCount++;
      timeoutId = setTimeout(initWidget, 50);
    }
    return;
  }
  // ... init widget
};
```
✅ Хорошо: Есть retry логика для ожидания монтирования контейнера

2. **Cleanup:**
```tsx
return () => {
  clearTimeout(timeoutId);
  const container = containerRef.current;
  if (container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }
};
```
✅ Хорошо: Корректный cleanup при unmount

3. **Debug logging:**
```tsx
if (process.env.NODE_ENV === 'development') {
  console.log("[auth-modal] Widget init attempt:", {
    open,
    hasContainer: !!container,
    username,
    authUrl,
    isAuthed,
    retryCount,
  });
}
```
✅ Хорошо: Есть debug информация

---

### ❌ ПРОБЛЕМНЫЕ АСПЕКТЫ

#### 1. **Race Condition: Script загружается, но iframe не успевает рендериться**

```tsx
// Текущий код:
const script = document.createElement("script");
script.src = "https://telegram.org/js/telegram-widget.js?22";
script.async = true; // ← ПРОБЛЕМА: async загрузка
script.setAttribute("data-telegram-login", username);
// ...
container.appendChild(script);
```

**Проблема:**
- `script.async = true` → скрипт загружается асинхронно
- Telegram Widget создаёт iframe динамически **после** загрузки скрипта
- Если модалка быстро открывается/закрывается → iframe не успевает создаться
- Cleanup может удалить script до того, как iframe был создан

**Решение:**
```tsx
script.onload = () => {
  console.log("[auth-modal] Telegram widget script loaded");
};
script.onerror = () => {
  console.error("[auth-modal] Failed to load Telegram widget script");
};
```

---

#### 2. **Нет проверки загрузки iframe**

```tsx
// Текущий код просто добавляет script и надеется, что всё сработает
container.appendChild(script);
// Нет проверки, что iframe действительно создался
```

**Проблема:**
- Telegram Widget создаёт iframe со следующей структурой:
```html
<script src="https://telegram.org/js/telegram-widget.js?22"></script>
<iframe src="https://oauth.telegram.org/embed/..."></iframe>
```
- Нет проверки, что iframe появился в DOM
- Если iframe не создался → виджет невидим

**Решение:**
```tsx
// Добавить MutationObserver для отслеживания появления iframe
const observer = new MutationObserver((mutations) => {
  const iframe = container.querySelector('iframe');
  if (iframe) {
    console.log("[auth-modal] Telegram iframe loaded");
    observer.disconnect();
  }
});
observer.observe(container, { childList: true, subtree: true });
```

---

#### 3. **Multiple cleanup race conditions**

```tsx
// useEffect зависимости:
}, [open, authUrl, username, isAuthed]);
```

**Проблема:**
- При каждом изменении `open`, `authUrl`, `username`, `isAuthed` → cleanup → re-init
- Если `open` меняется быстро (false → true → false) → race condition
- Cleanup может удалить script/iframe до того, как пользователь увидел виджет

**Сценарий:**
1. Modal opens → `open = true` → useEffect запускается
2. `initWidget()` начинает загрузку script
3. Script загружается через 100ms
4. Modal закрывается (пользователь нажал ESC) → `open = false`
5. Cleanup удаляет script ДО того, как iframe был создан
6. Modal открывается снова → пустой контейнер
7. Script загружается заново, но может не сработать

---

#### 4. **Telegram Widget кеширование**

Telegram Widget использует глобальное состояние:
```tsx
window.onTelegramAuthModal = (user) => { ... };
```

**Проблема:**
- Если script загружается несколько раз → Telegram Widget может "думать", что уже инициализирован
- Глобальный callback может быть перезаписан
- Telegram Widget может не создать iframe повторно

---

#### 5. **Нет минимальной высоты для контейнера**

```tsx
<div ref={containerRef} aria-label="Telegram Login" className="min-h-[46px]" />
```

✅ Есть `min-h-[46px]`, НО:
- Telegram iframe имеет фиксированную высоту 46px (large size)
- Если контейнер collapse или скрыт → iframe не рендерится

---

## 📚 TELEGRAM WIDGET BEST PRACTICES

### **Официальные рекомендации:**

1. **HTTPS обязателен**
   - ✅ Выполнено (код использует HTTPS)

2. **data-auth-url должен быть на том же домене**
   - ✅ Выполнено (используется `window.location.origin`)

3. **Callback должен быть глобальной функцией**
   - ✅ Выполнено (`window.onTelegramAuthModal`)

4. **Script должен загружаться один раз**
   - ❌ **НЕ выполнено** (script переинициализируется при каждом открытии модалки)

5. **iframe создаётся асинхронно**
   - ❌ Нет проверки загрузки iframe

---

## 🎯 ИЗВЕСТНЫЕ ПРОБЛЕМЫ TELEGRAM WIDGET

### 1. **CSP (Content Security Policy) блокировка**

**Проблема:**
- Если CSP не разрешает `telegram.org` и `oauth.telegram.org` → iframe блокируется

**Проверка:**
```tsx
// В next.config.ts или в HTTP headers
contentSecurityPolicy: {
  'frame-src': ['telegram.org', 'oauth.telegram.org'],
  'script-src': ['telegram.org'],
}
```

**Текущий статус:** ❓ Нужно проверить `next.config.ts`

---

### 2. **Ad blockers / Privacy extensions**

**Проблема:**
- uBlock Origin, Privacy Badger, AdGuard блокируют iframe от `oauth.telegram.org`
- Пользователь не видит виджет

**Решение:**
- Добавить fallback UI с инструкцией

---

### 3. **Browser iframe loading delay**

**Проблема:**
- В медленных сетях iframe загружается дольше
- Пользователь может не дождаться и закрыть модалку

**Решение:**
- Показать skeleton loader или спиннер до появления iframe

---

### 4. **Multiple script loads**

**Проблема:**
- Если script загружается несколько раз быстро подряд
- Telegram Widget может "зависнуть"

**Решение:**
- Кешировать скрипт глобально (загружать один раз)
- Переиспользовать iframe между открытиями модалки

---

## 🔧 РЕКОМЕНДОВАННЫЕ УЛУЧШЕНИЯ

### **Priority 1: Критичные (решают основную проблему)**

#### 1.1 **Добавить проверку загрузки script**

```tsx
const script = document.createElement("script");
script.src = "https://telegram.org/js/telegram-widget.js?22";
script.async = true;

script.onload = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log("[auth-modal] ✅ Telegram widget script loaded");
  }
};

script.onerror = (error) => {
  console.error("[auth-modal] ❌ Failed to load Telegram widget script:", error);
  setError("Не удалось загрузить виджет Telegram. Проверьте интернет-соединение.");
};
```

---

#### 1.2 **Добавить MutationObserver для отслеживания iframe**

```tsx
// После добавления script
container.appendChild(script);

// Watch for iframe creation
const iframeTimeout = setTimeout(() => {
  const iframe = container.querySelector('iframe');
  if (!iframe) {
    console.warn("[auth-modal] ⚠️ Telegram iframe not created after 3s");
    // Optionally retry or show error
  }
}, 3000);

const observer = new MutationObserver(() => {
  const iframe = container.querySelector('iframe');
  if (iframe) {
    if (process.env.NODE_ENV === 'development') {
      console.log("[auth-modal] ✅ Telegram iframe detected");
    }
    clearTimeout(iframeTimeout);
    observer.disconnect();
  }
});

observer.observe(container, { 
  childList: true, 
  subtree: true 
});

// Cleanup
return () => {
  clearTimeout(iframeTimeout);
  observer.disconnect();
};
```

---

#### 1.3 **Глобальное кеширование script**

```tsx
// В отдельном файле: src/lib/telegram-widget.ts
let scriptLoaded = false;
let scriptLoading = false;
const scriptLoadPromises: Array<(value: boolean) => void> = [];

export function ensureTelegramWidgetScript(): Promise<boolean> {
  if (scriptLoaded) {
    return Promise.resolve(true);
  }

  if (scriptLoading) {
    return new Promise((resolve) => {
      scriptLoadPromises.push(resolve);
    });
  }

  scriptLoading = true;

  return new Promise((resolve) => {
    const existingScript = document.querySelector(
      'script[src^="https://telegram.org/js/telegram-widget.js"]'
    );

    if (existingScript) {
      scriptLoaded = true;
      scriptLoading = false;
      resolve(true);
      scriptLoadPromises.forEach((r) => r(true));
      scriptLoadPromises.length = 0;
      return;
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;

    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve(true);
      scriptLoadPromises.forEach((r) => r(true));
      scriptLoadPromises.length = 0;
    };

    script.onerror = () => {
      scriptLoading = false;
      resolve(false);
      scriptLoadPromises.forEach((r) => r(false));
      scriptLoadPromises.length = 0;
    };

    document.head.appendChild(script);
  });
}
```

**Использование в auth-modal.tsx:**
```tsx
useEffect(() => {
  if (!open || !username || isAuthed) return;

  const initWidget = async () => {
    const container = containerRef.current;
    if (!container) return;

    // Ensure script is loaded globally
    const loaded = await ensureTelegramWidgetScript();
    if (!loaded) {
      setError("Не удалось загрузить виджет Telegram");
      return;
    }

    // Clear container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Create widget container (NOT script - script already loaded globally)
    const widgetDiv = document.createElement("div");
    widgetDiv.id = `telegram-login-${Date.now()}`;
    widgetDiv.setAttribute("data-telegram-login", username);
    widgetDiv.setAttribute("data-size", "large");
    if (authUrl) {
      widgetDiv.setAttribute("data-auth-url", authUrl);
    }
    widgetDiv.setAttribute("data-request-access", "write");
    widgetDiv.setAttribute("data-onauth", "onTelegramAuthModal(user)");
    
    container.appendChild(widgetDiv);

    // Trigger widget initialization
    if (window.Telegram?.Login) {
      window.Telegram.Login.init(widgetDiv);
    }
  };

  initWidget();
}, [open, username, isAuthed, authUrl]);
```

---

### **Priority 2: Улучшение UX**

#### 2.1 **Добавить skeleton loader**

```tsx
const [isWidgetLoading, setIsWidgetLoading] = useState(true);

// В MutationObserver:
const iframe = container.querySelector('iframe');
if (iframe) {
  setIsWidgetLoading(false);
  // ...
}

// В JSX:
<div className="flex justify-center">
  {isWidgetLoading && (
    <div className="flex h-[46px] w-full max-w-[200px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"></div>
    </div>
  )}
  <div 
    ref={containerRef} 
    className={cn(
      "min-h-[46px]",
      isWidgetLoading && "hidden"
    )}
  />
</div>
```

---

#### 2.2 **Добавить fallback для заблокированных iframe**

```tsx
const [isBlocked, setIsBlocked] = useState(false);

// После 5 секунд без iframe:
setTimeout(() => {
  const iframe = container.querySelector('iframe');
  if (!iframe) {
    setIsBlocked(true);
  }
}, 5000);

// В JSX:
{isBlocked && (
  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
    <div className="mb-2 font-semibold text-yellow-800">
      ⚠️ Виджет Telegram заблокирован
    </div>
    <div className="text-sm text-yellow-700">
      <p className="mb-2">Возможные причины:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Ad blocker (uBlock Origin, AdGuard)</li>
        <li>Privacy extensions (Privacy Badger)</li>
        <li>Корпоративный firewall</li>
      </ul>
      <p className="mt-2">
        Попробуйте отключить блокировщики или обратитесь к администратору.
      </p>
    </div>
  </div>
)}
```

---

### **Priority 3: Мониторинг и диагностика**

#### 3.1 **Добавить Sentry tracking**

```tsx
import * as Sentry from '@sentry/nextjs';

// При ошибке загрузки:
script.onerror = (error) => {
  Sentry.captureException(new Error('Telegram widget script failed to load'), {
    extra: {
      username,
      authUrl,
      scriptSrc: script.src,
    },
  });
};

// При timeout iframe:
setTimeout(() => {
  const iframe = container.querySelector('iframe');
  if (!iframe) {
    Sentry.captureMessage('Telegram iframe not created after 5s', {
      level: 'warning',
      extra: { username, authUrl },
    });
  }
}, 5000);
```

---

#### 3.2 **Добавить performance tracking**

```tsx
const startTime = Date.now();

const observer = new MutationObserver(() => {
  const iframe = container.querySelector('iframe');
  if (iframe) {
    const loadTime = Date.now() - startTime;
    console.log(`[auth-modal] Telegram widget loaded in ${loadTime}ms`);
    
    // Track slow loads
    if (loadTime > 2000) {
      Sentry.captureMessage('Slow Telegram widget load', {
        level: 'info',
        extra: { loadTime, username },
      });
    }
    
    observer.disconnect();
  }
});
```

---

## 🧪 ТЕСТИРОВАНИЕ

### **Manual Testing Checklist:**

- [ ] Открыть модалку → виджет появляется через < 1s
- [ ] Закрыть модалку → открыть снова → виджет появляется
- [ ] Быстро открыть/закрыть/открыть (< 500ms) → виджет появляется
- [ ] Проверить в медленной сети (Network throttling: Slow 3G)
- [ ] Проверить с uBlock Origin включенным
- [ ] Проверить в разных браузерах (Chrome, Firefox, Safari)
- [ ] Проверить на мобильных (iOS Safari, Chrome Android)
- [ ] Проверить в приватном режиме (Incognito/Private)

---

## 📊 ПРИОРИТИЗАЦИЯ ИСПРАВЛЕНИЙ

### **Phase 1: Quick Wins (1-2 часа)**
1. ✅ Добавить `script.onload` / `script.onerror`
2. ✅ Добавить MutationObserver для iframe
3. ✅ Добавить skeleton loader

### **Phase 2: Structural Improvements (2-3 часа)**
1. ✅ Глобальное кеширование script (`ensureTelegramWidgetScript`)
2. ✅ Улучшить retry logic
3. ✅ Добавить fallback для блокировок

### **Phase 3: Monitoring (1 час)**
1. ✅ Sentry tracking
2. ✅ Performance metrics

---

## 📄 ИТОГ

**Основная причина проблемы:**
- Race conditions при быстром открытии/закрытии модалки
- Нет проверки загрузки script и iframe
- Script переинициализируется каждый раз

**Рекомендованное решение:**
1. **Глобальное кеширование script** (загружать один раз)
2. **MutationObserver** для отслеживания iframe
3. **Skeleton loader** для улучшения UX
4. **Fallback UI** для заблокированных виджетов

**Ожидаемый результат:**
✅ Виджет появляется стабильно в 99% случаев  
✅ Улучшенный UX с skeleton loader  
✅ Понятные ошибки для пользователей с блокировщиками

---

**Жду подтверждения для реализации исправлений.**
