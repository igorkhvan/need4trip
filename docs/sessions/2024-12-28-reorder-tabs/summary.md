# Резюме: Изменение порядка вкладок на странице "Все события"

**Дата:** 2024-12-28  
**Статус:** ✅ Анализ завершен, готово к реализации

---

## Цель

Изменить порядок вкладок и default значение на странице `/events`:

**Текущее состояние:**
- Порядок: Все события → Предстоящие → Мои события
- Default: `tab=all`

**Целевое состояние:**
- Порядок: Предстоящие → Мои события → Все события
- Default: `tab=upcoming`

---

## Файлы для изменения

### Code Changes (5 файлов)

1. **`src/app/api/events/route.ts`** (Backend API)
   - Строка 16: `default('all')` → `default('upcoming')`

2. **`src/components/events/events-grid.tsx`** (UI Layer)
   - Строки 108-113: Переупорядочить массив `tabs`
   - Строка 57: `|| "all"` → `|| "upcoming"`

3. **`src/components/events/events-page-client.tsx`** (Client State)
   - Строка 34: `|| "all"` → `|| "upcoming"`
   - Строка 58: `value === "all"` → `value === "upcoming"`

### SSOT Documentation (2 файла)

4. **`docs/ARCHITECTURE.md`** (§ 10)
   - Добавить раздел "Default Tab Behavior (UI)"
   - Обновить версию документа

5. **`docs/ssot/api-ssot.md`** (API-025)
   - Обновить: `default: all` → `default: upcoming`
   - Обновить версию документа

---

## Ключевые находки

### ✅ Безопасность изменения

1. **Integration tests:** НЕ затронуты (нет тестов для `GET /api/events`)
2. **E2E tests:** В статусе TODO (QA-46 to QA-53)
3. **Обратная совместимость:** Explicit URL параметры (`?tab=all`) продолжают работать
4. **SSOT принципы:** Все изменения соответствуют архитектурным правилам

### ⚡ Побочные эффекты

1. **Deep Links (`/events` без параметров):**
   - До: Показывает все события (past + future)
   - После: Показывает предстоящие события (only future)
   - **Эффект:** ✅ Позитивный (более релевантный контент)

2. **SEO:**
   - Индекс изменится с "все события" на "предстоящие события"
   - **Эффект:** ✅ Позитивный (лучше для новых посетителей)

3. **User Bookmarks:**
   - Закладки `/events?tab=all` продолжают работать
   - **Эффект:** ✅ Нет риска

---

## Сложность реализации

**Оценка:** ✅ **Низкая**

- 5 файлов для изменения (2 компонента + 1 API route + 2 SSOT документа)
- Локальные изменения без сайд-эффектов
- Нет breaking changes
- Соответствие SSOT принципам

---

## План реализации

### Этап 1: Code Changes
1. Backend: `src/app/api/events/route.ts` (default value)
2. UI: `src/components/events/events-grid.tsx` (tab order + activeTab)
3. Client: `src/components/events/events-page-client.tsx` (currentTab + URL cleanup)

### Этап 2: SSOT Updates
4. `docs/ARCHITECTURE.md` § 10 (новая секция + версия)
5. `docs/ssot/api-ssot.md` API-025 (default value + версия)

### Этап 3: Verification
6. TypeScript check (`npx tsc --noEmit`)
7. Production build (`npm run build`)
8. Manual testing (tab switching, URL updates)

### Этап 4: Git Commit & Push
9. Commit с описанием изменений
10. Push to main

---

## Проверка корректности отображения

### ✅ Карточки событий

**Вопрос:** Будут ли карточки событий отображать данные корректно?

**Ответ:** ✅ **ДА, полностью корректно**

**Причины:**
1. **Фильтрация на уровне БД:** `tab=upcoming` корректно фильтрует события через `date_time >= NOW()`
2. **Hydration независима от tab:** Batch loading (cities, currencies, categories, participants count) происходит ПОСЛЕ фильтрации
3. **UI компонент не зависит от tab:** `EventCardDetailed` отображает `EventListItemHydrated` одинаково для всех вкладок
4. **Все необходимые поля присутствуют:** `title`, `dateTime`, `city`, `participantsCount`, `maxParticipants`, `category`, `isPaid`, `priceAmount`, `priceCurrency`

### ✅ Пагинация

**Вопрос:** Будет ли пагинация работать корректно?

**Ответ:** ✅ **ДА, полностью корректно**

**Причины:**
1. **total вычисляется правильно:** `count="exact"` учитывает все фильтры (`tab`, `search`, `cityId`, `categoryId`)
2. **totalPages и hasMore корректны:** Вычисляются на основе реального `total` и `limit`
3. **Offset-based pagination независима:** Работает одинаково для всех вкладок
4. **URL параметры синхронизированы:** `page` сбрасывается при смене вкладки (через `resetPage: true`)

### Примеры корректного поведения

**Сценарий 1:** `/events` (без параметров)
- Backend default: `tab=upcoming`
- БД: `visibility='public' AND date_time >= NOW()`
- Результат: Предстоящие события, страница 1 ✅

**Сценарий 2:** `/events?tab=all`
- Backend explicit: `tab=all`
- БД: `visibility='public'` (все события)
- Результат: Все публичные события (past + future) ✅

**Сценарий 3:** `/events?page=2` (tab не указан)
- Backend default: `tab=upcoming`, `page=2`
- БД: Предстоящие события, offset = 12
- Результат: Вторая страница предстоящих событий ✅

**Сценарий 4:** Переключение "Все события" → "Предстоящие"
- Client: `setParam('tab', 'upcoming', { resetPage: true })`
- URL: `/events` (tab default, page reset to 1)
- Результат: Первая страница предстоящих событий ✅

### Edge Cases (все покрыты)

1. **Нет предстоящих событий:** Empty state ("Ничего не найдено") ✅
2. **Пользователь на странице 5, переключился на вкладку с 2 страницами:** Page reset to 1 ✅
3. **Midnight boundary:** События фильтруются корректно по `date_time >= NOW()` ✅

---

## Рекомендация

✅ **Изменение безопасно для реализации**

**Причины:**
- Локальное изменение без сайд-эффектов
- Обратная совместимость
- Улучшение UX (предстоящие события более релевантны)
- Соответствие SSOT принципам
- Integration tests НЕ затронуты
- **✅ Карточки событий и пагинация будут работать корректно (проверено на всех уровнях: БД → Service → API → UI)**

**Следующий шаг:** Начать реализацию по плану.

