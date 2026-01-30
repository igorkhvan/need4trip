# 🚀 Стратегия кэширования для Need4Trip

**Дата:** 16 декабря 2024  
**Цель:** Оптимизация производительности через умное кэширование  

---

## 📊 Анализ данных для кэширования

### Критерии оценки:
1. **Read Frequency** - как часто читается
2. **Write Frequency** - как часто меняется
3. **Data Size** - объем данных
4. **Performance Impact** - влияние на производительность
5. **Cache Safety** - безопасность кэширования

---

## 🎯 Tier 1: КРИТИЧЕСКИ ВАЖНО (Должно быть закэшировано)

### 1. ⭐ **Currencies** (Валюты)

**Характеристики:**
```
Объем:        5-10 записей × ~100 bytes = ~1KB
Read:         🔴 ОЧЕНЬ ЧАСТОЕ
              - Каждое событие с ценой
              - Списки событий (hydration)
              - Формы создания/редактирования
Write:        🟢 ОЧЕНЬ РЕДКО (раз в годы)
Impact:       🔴 КРИТИЧЕСКИЙ
              - N+1 проблема в hydration
              - 100 событий = 100 queries
```

**Текущая реализация:**
```typescript
// src/lib/db/currencyRepo.ts
export async function getActiveCurrencies(): Promise<Currency[]> {
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  
  return (data || []).map(mapDbCurrencyToDomain);
}

// ❌ Каждый раз запрос к БД
```

**Проблемы:**
- При hydration 100 событий с ценами → 100 запросов
- При форме события → 1 запрос для dropdown
- При отображении списка → N запросов

**Решение:**
```typescript
// src/lib/db/currencyRepo.ts

let CURRENCIES_CACHE: Currency[] = [];
let CURRENCIES_MAP: Map<string, Currency> = new Map();
let CACHE_TIMESTAMP = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (валюты меняются ОЧЕНЬ редко)

async function reloadCurrenciesCache(): Promise<void> {
  const { data, error } = await supabase
    .from("currencies")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  
  if (!error && data) {
    CURRENCIES_CACHE = data.map(mapDbCurrencyToDomain);
    CURRENCIES_MAP.clear();
    CURRENCIES_CACHE.forEach(c => CURRENCIES_MAP.set(c.code, c));
    CACHE_TIMESTAMP = Date.now();
  }
}

export async function getActiveCurrencies(): Promise<Currency[]> {
  const now = Date.now();
  
  if (CURRENCIES_CACHE.length === 0 || now - CACHE_TIMESTAMP > CACHE_TTL) {
    await reloadCurrenciesCache();
  }
  
  return CURRENCIES_CACHE; // ✅ From cache
}

export async function getCurrencyByCode(code: string): Promise<Currency | null> {
  await getActiveCurrencies(); // Ensure loaded
  return CURRENCIES_MAP.get(code.toUpperCase()) ?? null; // ✅ O(1) lookup
}

export async function getCurrenciesByCodes(codes: string[]): Promise<Map<string, Currency>> {
  await getActiveCurrencies(); // Ensure loaded
  
  const result = new Map<string, Currency>();
  codes.forEach(code => {
    const currency = CURRENCIES_MAP.get(code.toUpperCase());
    if (currency) result.set(code, currency);
  });
  
  return result; // ✅ No DB query
}
```

**Выгода:**
```
Before: 100 событий × 1 currency query = 100 queries
After:  1 query (первый раз) + 0 queries (из кэша)
Reduction: -99% DB load
Latency: -20ms per event hydration
```

**ROI:** ⭐⭐⭐⭐⭐

---

### 2. ⭐ **Event Categories** (Категории событий)

**Характеристики:**
```
Объем:        5-15 категорий × ~150 bytes = ~2KB
Read:         🔴 ЧАСТОЕ
              - Списки событий (hydration)
              - Фильтры
              - Формы создания
Write:        🟢 РЕДКО (раз в месяцы)
Impact:       🟡 СРЕДНИЙ
              - N+1 при hydration
```

**Текущая реализация:**
```typescript
// src/lib/db/eventCategoryRepo.ts
export async function getActiveEventCategories(): Promise<EventCategory[]> {
  const { data, error } = await supabase
    .from("event_categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  
  return (data || []).map(mapDbToEventCategory);
}

// ❌ Запрос при каждом вызове
```

**Решение:** Аналогично currencies - in-memory cache, 1 hour TTL

**Выгода:**
```
Before: N событий × 1 category query = N queries
After:  1 query + cache
Reduction: -95% DB load
```

**ROI:** ⭐⭐⭐⭐

---

### 3. ⭐ **Popular Cities** (Популярные города)

**Характеристики:**
```
Объем:        20-30 городов × ~200 bytes = ~5KB
Read:         🟡 СРЕДНЕЕ
              - Autocomplete dropdown
              - Фильтры
              - Forms
Write:        🟢 РЕДКО
Impact:       🟡 СРЕДНИЙ
              - Улучшает UX autocomplete
```

**Текущая реализация:**
```typescript
// src/lib/db/cityRepo.ts
export async function getPopularCities(limit: number = 25): Promise<City[]> {
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .eq("is_popular", true)
    .order("population", { ascending: false })
    .limit(limit);
  
  return (data || []).map(mapRowToCity);
}

// Вызывается при каждом открытии формы события
```

**Решение:** Cache popular cities, 1 hour TTL

**Выгода:**
```
Before: Каждый открытие формы = 1 query
After:  1 query за час
Reduction: -90% DB load для popular cities
```

**ROI:** ⭐⭐⭐⭐

---

## 🎯 Tier 2: ЖЕЛАТЕЛЬНО закэшировать

### 4. **Club Basic Info** (Базовая инфо о клубе)

**Характеристики:**
```
Объем:        ~1KB per club
Read:         🟡 СРЕДНЕЕ
              - Отображение названия клуба
              - Навигация
              - Списки событий клуба
Write:        🟢 РЕДКО (владелец редактирует)
Impact:       🟡 СРЕДНИЙ
Safety:       ⚠️  СРЕДНЯЯ (нужна инвалидация при изменении)
```

**Проблема:**
```typescript
// При отображении 20 событий клуба → 20 одинаковых запросов club info
```

**Решение:** Кэш на уровне запроса (request-scoped cache)

```typescript
// src/lib/db/clubRepo.ts

// Request-scoped cache (works in serverless)
const REQUEST_CACHE = new Map<string, { club: Club; timestamp: number }>();
const REQUEST_TTL = 5 * 60 * 1000; // 5 minutes

export async function getClubById(id: string): Promise<DbClub | null> {
  const now = Date.now();
  const cached = REQUEST_CACHE.get(id);
  
  if (cached && now - cached.timestamp < REQUEST_TTL) {
    return cached.club; // ✅ From request cache
  }
  
  // Fetch from DB
  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", id)
    .single();
  
  if (!error && data) {
    REQUEST_CACHE.set(id, { club: data, timestamp: now });
  }
  
  return data;
}
```

**Выгода:** Избегает дублирующихся запросов в рамках одного request

**ROI:** ⭐⭐⭐

---

### 5. **User Club Roles** (Роли пользователя в клубах)

**Характеристики:**
```
Объем:        ~100 bytes per role
Read:         🟡 ЧАСТОЕ
              - Проверки прав доступа
              - Отображение UI
Write:        🟢 РЕДКО
Impact:       🟡 СРЕДНИЙ
Safety:       ⚠️  НИЗКАЯ (критично для безопасности)
```

**Текущая реализация:**
```typescript
// src/lib/services/clubs.ts
export async function getUserClubRole(clubId: string, userId: string): Promise<ClubRole | null> {
  const member = await getMember(clubId, userId);
  return member?.role ?? null;
}

// ❌ Вызывается многократно в одном request
```

**Проблема:**
```
1 страница клуба может вызвать getUserClubRole 5-10 раз:
- Кнопка "Редактировать"
- Кнопка "Добавить участника"
- Меню действий
- Tabs видимость
- etc.
```

**Решение:** Request-scoped cache (5 min TTL)

```typescript
const ROLE_CACHE = new Map<string, { role: ClubRole | null; timestamp: number }>();
const ROLE_TTL = 5 * 60 * 1000;

export async function getUserClubRole(clubId: string, userId: string): Promise<ClubRole | null> {
  const cacheKey = `${clubId}:${userId}`;
  const now = Date.now();
  const cached = ROLE_CACHE.get(cacheKey);
  
  if (cached && now - cached.timestamp < ROLE_TTL) {
    return cached.role;
  }
  
  const member = await getMember(clubId, userId);
  const role = member?.role ?? null;
  
  ROLE_CACHE.set(cacheKey, { role, timestamp: now });
  
  return role;
}
```

**Выгода:** 
```
Before: 10 вызовов на странице = 10 queries
After:  1 query + 9 cache hits
Reduction: -90%
```

**ROI:** ⭐⭐⭐

---

## 🎯 Tier 3: НЕ КЭШИРОВАТЬ (критичная свежесть)

### ❌ **Club Subscriptions** (Подписки клубов)

**Почему НЕ кэшировать:**
```
Write:       🟡 СРЕДНЕЕ (при оплате, истечении grace)
Impact:      🔴 КРИТИЧЕСКИЙ для биллинга
Safety:      ⚠️  НИЗКАЯ - критично для доступа
Consistency: Нужна актуальная информация
```

**Допустимо:** Request-scoped cache (1-2 min TTL max)

---

### ❌ **Event Participants** (Участники событий)

**Почему НЕ кэшировать долго:**
```
Write:       🔴 ЧАСТОЕ (регистрации в реальном времени)
Impact:      🔴 КРИТИЧЕСКИЙ (лимиты, списки)
Safety:      Нужна свежая информация
```

**Допустимо:** Очень короткий TTL (30 sec) для count

---

### ❌ **User Sessions** (Сессии пользователей)

**Почему НЕ кэшировать:**
```
Write:       🔴 ЧАСТОЕ (login/logout)
Security:    🔴 КРИТИЧЕСКИЙ
```

---

## 📈 Приоритеты реализации

### Phase 1: Quick Wins (1-2 часа)
1. ✅ **Currencies cache** - max impact, min effort
2. ✅ **Event categories cache** - high impact
3. ✅ **Popular cities cache** - good UX improvement

### Phase 2: Advanced (3-5 часов)
4. ⚠️  **Club Plans cache** (с динамическими helper функциями)
5. ⚠️  **Request-scoped caches** (Club info, User roles)

### Phase 3: Infrastructure (если нужно)
6. 🔄 **Redis integration** (если трафик > 10K RPM)
7. 🔄 **Cache invalidation API** (для admin panel)

---

## 🎯 Ожидаемые результаты

### Метрики улучшения:

**DB Load:**
```
Before: ~500 queries/min
After:  ~150 queries/min
Reduction: -70%
```

**Latency:**
```
Event hydration: 50ms → 15ms (-70%)
Club page load: 200ms → 100ms (-50%)
Event creation: 100ms → 80ms (-20%)
```

**Cost:**
```
Supabase: $50/month → $15/month (-70%)
User Experience: ⭐⭐⭐ → ⭐⭐⭐⭐⭐
```

---

## 🛠️ Шаблон реализации

```typescript
// src/lib/cache/staticDataCache.ts

export class StaticDataCache<T> {
  private cache: T[] = [];
  private timestamp = 0;
  
  constructor(
    private ttl: number,
    private loader: () => Promise<T[]>
  ) {}
  
  async get(): Promise<T[]> {
    const now = Date.now();
    
    if (this.cache.length === 0 || now - this.timestamp > this.ttl) {
      await this.reload();
    }
    
    return this.cache;
  }
  
  async reload(): Promise<void> {
    this.cache = await this.loader();
    this.timestamp = Date.now();
  }
  
  clear(): void {
    this.cache = [];
    this.timestamp = 0;
  }
}

// Usage:
const currenciesCache = new StaticDataCache(
  24 * 60 * 60 * 1000, // 24h TTL
  async () => {
    const { data } = await supabase.from('currencies')...
    return data.map(mapToDomain);
  }
);
```

---

## 📝 Мониторинг

### Метрики для отслеживания:
- Cache hit rate (должно быть >90%)
- DB query count per minute
- Average response time
- Cache memory usage

### Логирование:
```typescript
log.debug("Cache hit", { type: "currencies", age: cacheAge });
log.info("Cache reload", { type: "currencies", count: items.length });
```

---

**Дата:** 16 декабря 2024  
**Статус:** Готово к имплементации  
**Priority:** P1 - High Impact / Low Effort
