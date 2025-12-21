# 🔍 ГЛУБОКИЙ АНАЛИЗ: Unlisted события не видны владельцу на главной

**Дата:** 22 декабря 2024  
**Проблема:** Владелец не видит свое unlisted событие на главной странице

---

## 📋 ЧАСТЬ 1: Воспроизведение проблемы

**Шаги:**
1. Пользователь создаёт событие
2. Меняет visibility на `unlisted` (доступно по ссылке)
3. Заходит на главную страницу → **событие исчезло**
4. Заходит в "Список событий" → **событие видно**

**Ожидаемое поведение:** Владелец должен видеть **все свои события**, включая unlisted.

---

## 📋 ЧАСТЬ 2: Анализ потока данных

### **2.1. Главная страница (Homepage)**

```tsx
// src/app/(marketing)/_components/upcoming-events-async.tsx

const eventsData = await listVisibleEventsForUser(currentUser?.id ?? null);

// Фильтр для homepage:
const upcomingPublicEvents = eventsData
  .filter((e) => {
    const eventDate = new Date(e.dateTime);
    return isPubliclyVisible(e) && eventDate >= now; // ← ПРОБЛЕМА!
  })
```

**Проблема:** Использует `isPubliclyVisible()` — проверяет только `visibility === "public"`.

### **2.2. Функция isPubliclyVisible()**

```typescript
// src/lib/utils/eventVisibility.ts:134

export function isPubliclyVisible(event: Event): boolean {
  return event.visibility === "public" && !event.isClubEvent;
}
```

**Логика:**
- ✅ `visibility === "public"` → `true`
- ❌ `visibility === "unlisted"` → `false` (даже для владельца!)
- ❌ `visibility === "restricted"` → `false`

**Вывод:** `isPubliclyVisible()` предназначена для **анонимных пользователей**, не для владельцев.

---

### **2.3. Функция listVisibleEventsForUser()**

```typescript
// src/lib/services/events.ts:85

export async function listVisibleEventsForUser(userId: string | null) {
  if (!userId) {
    // Anonymous: only public events
    const result = await listPublicEvents(1, 100);
  }
  
  // Authenticated: load multiple types
  const [publicResult, ownedResult, ...] = await Promise.all([
    listPublicEvents(1, 100),        // ← только visibility='public'
    listEventsByCreator(userId, 1, 100), // ← ВСЕ события владельца (public + unlisted + restricted)
    ...
  ]);
  
  const allEvents = [
    ...publicResult.data,
    ...ownedResult.data,  // ← unlisted события ЕСТЬ здесь!
  ];
  
  // Remove duplicates
  const uniqueEvents = Array.from(
    new Map(allEvents.map((e) => [e.id, e])).values()
  );
  
  // Filter by visibility
  const filtered = uniqueEvents.filter(e => 
    canViewInList(e, currentUser, participantIds, accessIds) // ← ПРАВИЛЬНАЯ фильтрация
  );
  
  return filtered; // ← unlisted события владельца ВКЛЮЧЕНЫ
}
```

**Вывод:** `listVisibleEventsForUser()` **ПРАВИЛЬНО** возвращает unlisted события владельца.

---

### **2.4. Функция canViewInList()**

```typescript
// src/lib/utils/eventVisibility.ts:156

export function canViewInList(
  event: Event,
  currentUser: CurrentUser | null,
  participantEventIds: Set<string>,
  accessEventIds: Set<string>
): boolean {
  // 1. Public events visible to everyone
  if (event.visibility === "public") return true;
  
  // 2. Owner's events always visible
  if (currentUser && event.createdByUserId === currentUser.id) {
    return true; // ← ПРАВИЛЬНО: владелец видит unlisted события
  }
  
  // 3. Participant/Access check
  if (participantEventIds.has(event.id) || accessEventIds.has(event.id)) {
    return true;
  }
  
  return false;
}
```

**Вывод:** `canViewInList()` **ПРАВИЛЬНО** возвращает `true` для владельца unlisted события.

---

## 📋 ЧАСТЬ 3: Локализация бага

### **3.1. Homepage фильтрует ДВАЖДЫ**

```typescript
// upcoming-events-async.tsx

const eventsData = await listVisibleEventsForUser(currentUser?.id);
// ↑ eventsData включает unlisted события владельца (ПРАВИЛЬНО)

const upcomingPublicEvents = eventsData
  .filter((e) => {
    return isPubliclyVisible(e) && eventDate >= now; 
    // ↑ ВТОРОЙ ФИЛЬТР убирает unlisted события (НЕПРАВИЛЬНО!)
  });
```

**Проблема:** 
1. `listVisibleEventsForUser()` правильно возвращает unlisted события владельца
2. НО homepage применяет **дополнительный фильтр** `isPubliclyVisible()`
3. `isPubliclyVisible()` возвращает `false` для unlisted
4. Результат: unlisted события исчезают

---

### **3.2. Почему в "Списке событий" работает?**

Список событий (страница `/events`) **НЕ ИСПОЛЬЗУЕТ** `isPubliclyVisible()`:

```typescript
// Предположительно, /events использует:
const events = await listVisibleEventsForUser(currentUser?.id);

// И НЕ применяет дополнительный фильтр isPubliclyVisible()
// Поэтому unlisted события видны
```

---

## 📋 ЧАСТЬ 4: Корневая причина

**Проблема:** `isPubliclyVisible()` используется в **неправильном контексте**.

### **Назначение `isPubliclyVisible()`:**
```typescript
/**
 * Check if event is publicly visible (lightweight, no DB)
 * 
 * Used when loading event lists without full access check.
 * Lightweight check without database queries.
 * 
 * Rules:
 * - visibility === "public" → true
 * - isClubEvent === true → false
 */
export function isPubliclyVisible(event: Event): boolean {
  return event.visibility === "public" && !event.isClubEvent;
}
```

**Назначение:** Проверить "видно ли событие **ВСЕМ** (включая анонимов)".

**НЕ предназначена для:** Проверки "видно ли событие **ТЕКУЩЕМУ ПОЛЬЗОВАТЕЛЮ**".

---

### **Правильная функция для homepage:**

Для фильтрации событий с учётом текущего пользователя должна использоваться:

```typescript
export function canViewInList(
  event: Event,
  currentUser: CurrentUser | null,
  participantEventIds: Set<string>,
  accessEventIds: Set<string>
): boolean {
  // Учитывает:
  // - Public события (для всех)
  // - События владельца (включая unlisted и restricted)
  // - События где пользователь participant/access
}
```

НО `canViewInList()` уже применена в `listVisibleEventsForUser()`.

**Вывод:** Homepage не должна фильтровать повторно, т.к. `listVisibleEventsForUser()` уже отфильтровала корректно!

---

## 📋 ЧАСТЬ 5: Решение

### **Вариант 1: Убрать isPubliclyVisible() с homepage** ⭐ РЕКОМЕНДУЕТСЯ

```typescript
// upcoming-events-async.tsx

const upcomingEvents = eventsData
  .filter((e) => {
    const eventDate = new Date(e.dateTime);
    return eventDate >= now; // ← ТОЛЬКО фильтр по дате
    // isPubliclyVisible() убран — listVisibleEventsForUser() уже отфильтровала
  })
  .sort(...)
  .slice(0, 3);
```

**Плюсы:**
- ✅ Простое решение
- ✅ Не нарушает существующую логику
- ✅ Владелец видит свои unlisted события
- ✅ Анонимы видят только public (т.к. `listVisibleEventsForUser(null)` вернёт только public)

**Минусы:**
- ❌ Homepage будет показывать unlisted/restricted события владельцам

**Вопрос:** Должен ли владелец видеть unlisted события на главной?

---

### **Вариант 2: Использовать canViewInList() на homepage**

```typescript
// upcoming-events-async.tsx

const upcomingEvents = eventsData
  .filter((e) => {
    const eventDate = new Date(e.dateTime);
    
    // Для homepage показываем только:
    // - Public события (для всех)
    // - ИЛИ unlisted/restricted события владельца
    const isPublicOrOwned = 
      isPubliclyVisible(e) || 
      (currentUser && e.createdByUserId === currentUser.id);
    
    return isPublicOrOwned && eventDate >= now;
  })
```

**Плюсы:**
- ✅ Владелец видит свои unlisted события
- ✅ Анонимы видят только public

**Минусы:**
- ⚠️ Дублирует логику из `canViewInList()`

---

### **Вариант 3: Новая функция isVisibleOnHomepage()**

```typescript
// eventVisibility.ts

export function isVisibleOnHomepage(
  event: Event,
  currentUser: CurrentUser | null
): boolean {
  // Public события видны всем
  if (isPubliclyVisible(event)) return true;
  
  // Владелец видит свои unlisted/restricted события
  if (currentUser && event.createdByUserId === currentUser.id) {
    return true;
  }
  
  return false;
}
```

**Плюсы:**
- ✅ Централизованная логика
- ✅ Явное назначение функции
- ✅ Легко тестировать

**Минусы:**
- ⚠️ Дополнительная функция (но оправдана)

---

## 📋 ЧАСТЬ 6: Рекомендация

**Использовать Вариант 3: isVisibleOnHomepage()**

**Причины:**
1. ✅ Явная семантика — "видно на главной"
2. ✅ Учитывает контекст пользователя
3. ✅ Не дублирует `canViewInList()` (разные назначения)
4. ✅ Легко расширить логику в будущем

**Логика:**
- Public события → видны **всем** (включая анонимов)
- Unlisted/Restricted события владельца → видны **только владельцу**
- Unlisted/Restricted события НЕ владельца → **не видны** на главной (но доступны по прямой ссылке)

---

## 🎯 ПЛАН ДЕЙСТВИЙ

1. ✅ Создать `isVisibleOnHomepage()` в `eventVisibility.ts`
2. ✅ Заменить `isPubliclyVisible()` на `isVisibleOnHomepage()` в `upcoming-events-async.tsx`
3. ✅ Добавить unit тесты для новой функции
4. ✅ Проверить:
   - Homepage для анонима → только public
   - Homepage для владельца → public + свои unlisted
   - Homepage для НЕ владельца → только public (unlisted НЕ видны)

---

**Следующий шаг:** Реализовать Вариант 3.
