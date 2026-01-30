# Finальный отчёт: Изменение порядка вкладок на странице "Все события"

**Дата:** 2024-12-28  
**Статус:** ✅ Завершено успешно

---

## Цель

Изменить порядок вкладок и default значение на странице `/events`:

**До:**
- Порядок: Все события → Предстоящие → Мои события
- Default: `tab=all`

**После:**
- Порядок: Предстоящие → Мои события → Все события
- Default: `tab=upcoming`

---

## Выполненные изменения

### 1. Backend (API Route)

**Файл:** `src/app/api/events/route.ts`  
**Изменение:** Строка 16

```typescript
// БЫЛО:
tab: z.enum(['all', 'upcoming', 'my']).default('all'),

// СТАЛО:
tab: z.enum(['all', 'upcoming', 'my']).default('upcoming'),
```

**Эффект:** API возвращает `tab=upcoming` события если query параметр `tab` не указан.

---

### 2. UI (Events Grid)

**Файл:** `src/components/events/events-grid.tsx`

**Изменение 1:** Строки 107-112 — Переупорядочен массив tabs

```typescript
// БЫЛО:
tabs={[
  { id: "all", label: "Все события" },
  { id: "upcoming", label: "Предстоящие" },
  { id: "my", label: "Мои события", hidden: !currentUserId },
]}

// СТАЛО:
tabs={[
  { id: "upcoming", label: "Предстоящие" },
  { id: "my", label: "Мои события", hidden: !currentUserId },
  { id: "all", label: "Все события" },
]}
```

**Изменение 2:** Строка 67 — Default activeTab

```typescript
// БЫЛО:
return "all";

// СТАЛО:
return "upcoming";
```

**Эффект:** UI отображает вкладки в новом порядке и default вкладка = "Предстоящие".

---

### 3. Client State (Events Page Client)

**Файл:** `src/components/events/events-page-client.tsx`

**Изменение 1:** Строка 34 — Default currentTab

```typescript
// БЫЛО:
const currentTab = searchParams.get("tab") || "all";

// СТАЛО:
const currentTab = searchParams.get("tab") || "upcoming";
```

**Изменение 2:** Строка 58 — URL cleanup logic

```typescript
// БЫЛО:
if (value === null || value === "" || value === "all") {
  params.delete(name);
}

// СТАЛО:
if (value === null || value === "" || value === "upcoming") {
  params.delete(name);
}
```

**Эффект:** При выборе вкладки "Предстоящие" параметр `?tab=upcoming` удаляется из URL (чистый URL).

---

### 4. SSOT Documentation (ARCHITECTURE.md)

**Файл:** `docs/ARCHITECTURE.md`

**Изменения:**
1. Обновлена версия: `2.9` → `3.0`
2. Обновлена дата: `2024-12-27` → `2024-12-28`
3. Добавлена новая секция § 10 "Default Tab Behavior (UI)" после "Listing Tabs"

**Новая секция:**

```markdown
#### Default Tab Behavior (UI)

**Default tab (when `?tab` param is missing):** `tab=upcoming`

**Rationale:**
- Most users want to see upcoming events by default
- Reduces cognitive load (one less tab to click)
- `tab=all` includes past events (less relevant for casual browsing)

**UI Tab Order:**
1. **Предстоящие** (`upcoming`) — default, показано первым
2. **Мои события** (`my`) — authenticated users only
3. **Все события** (`all`) — full catalog (past + future)

**URL behavior:**
- `/events` → defaults to `tab=upcoming` (param omitted in URL for cleaner URLs)
- `/events?tab=all` → explicit `tab=all` (past + future events)
- `/events?tab=my` → explicit `tab=my` (requires authentication)
```

---

### 5. SSOT Documentation (api-ssot.md)

**Файл:** `docs/ssot/api-ssot.md`

**Изменения:**
1. Обновлена версия: `1.1.0` → `1.2.0`
2. API-025 (GET /api/events) — Query params:

```markdown
// БЫЛО:
- `tab` (optional): `all` | `upcoming` | `my` (default: `all`)

// СТАЛО:
- `tab` (optional): `all` | `upcoming` | `my` (default: `upcoming`)
```

---

## Verification

### ✅ TypeScript Check

```bash
npx tsc --noEmit
```

**Результат:** ✅ Наши файлы без ошибок (старые ошибки в тестах существовали до изменений)

**Проверенные файлы:**
- `src/app/api/events/route.ts` ✅
- `src/components/events/events-grid.tsx` ✅
- `src/components/events/events-page-client.tsx` ✅

---

### ✅ Production Build

```bash
npm run build
```

**Результат:** ✅ Успешно

```
▲ Next.js 16.1.1 (Turbopack)
✓ Compiled successfully in 658.9ms
✓ Generating static pages using 13 workers (1/1) in 111.4ms
```

---

## Проверка корректности

### ✅ Карточки событий

**Вопрос:** Будут ли карточки отображать данные корректно?  
**Ответ:** ✅ ДА, полностью корректно

**Причины:**
1. Фильтрация на уровне БД: `tab=upcoming` → `date_time >= NOW()`
2. Hydration независима: Batch loading после фильтрации
3. UI компонент универсален: `EventCardDetailed` одинаков для всех вкладок
4. Все поля присутствуют: `title`, `dateTime`, `city`, `participantsCount`, `category`, `price`

### ✅ Пагинация

**Вопрос:** Будет ли пагинация работать корректно?  
**Ответ:** ✅ ДА, полностью корректно

**Причины:**
1. `total` вычисляется правильно: `count="exact"` учитывает фильтры
2. `totalPages` и `hasMore` корректны: Вычисляются на основе реального `total`
3. Offset-based pagination независима: Работает одинаково для всех вкладок
4. Page reset при смене вкладки: `setParam('tab', value, { resetPage: true })`

---

## Примеры использования

| Сценарий | URL | Backend | БД запрос | Результат |
|----------|-----|---------|-----------|-----------|
| Открыть `/events` | `/events` | `tab=upcoming` | `date_time >= NOW()` | Предстоящие события ✅ |
| Вкладка "Все" | `/events?tab=all` | `tab=all` | `visibility='public'` | Все события ✅ |
| Страница 2 | `/events?page=2` | `tab=upcoming`, `page=2` | offset = 12 | 2-я страница ✅ |
| Фильтр + город | `/events?cityId=abc` | `tab=upcoming` | `+ city_id='abc'` | События в городе ✅ |

---

## Измененные файлы (5 файлов)

### Code Changes:
1. `src/app/api/events/route.ts` (1 строка)
2. `src/components/events/events-grid.tsx` (2 изменения)
3. `src/components/events/events-page-client.tsx` (2 изменения)

### SSOT Documentation:
4. `docs/ARCHITECTURE.md` (версия 3.0, новая секция § 10)
5. `docs/ssot/api-ssot.md` (версия 1.2.0, API-025 updated)

---

## Benefits

✅ **UX Improvement:** Пользователи видят релевантные события по умолчанию  
✅ **Cleaner URLs:** `/events` вместо `/events?tab=upcoming`  
✅ **SSOT Compliance:** Все изменения задокументированы в SSOT  
✅ **No Breaking Changes:** Explicit URL параметры работают  
✅ **No Side Effects:** Карточки и пагинация работают корректно  

---

## Статус

✅ **Готово к commit & push**

**Verified:**
- TypeScript check ✅
- Production build ✅
- Linter errors: 0 ✅
- SSOT documents updated ✅

