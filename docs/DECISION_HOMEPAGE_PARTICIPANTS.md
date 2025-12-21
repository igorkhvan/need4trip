# 🤔 АНАЛИЗ: Должны ли участники видеть unlisted события на homepage?

**Вопрос:** Почему участник unlisted события НЕ видит его на homepage?

---

## 📋 ЧАСТЬ 1: Текущая логика

### **Homepage назначение:**
```
Homepage = "Предстоящие поездки" (публичная витрина)
```

**Текущая философия:**
- Показывать **публично интересные** события
- Показывать **свои собственные** события (владелец)
- НЕ показывать **чужие закрытые** события (даже если участник)

---

## 📋 ЧАСТЬ 2: Аргументы ЗА и ПРОТИВ

### **ПРОТИВ показа участникам (текущая реализация):**

**Аргумент 1: Приватность**
- Unlisted событие = "скрытое" (не в публичных списках)
- Если участник видит на homepage → раскрывается его участие
- Другие пользователи могут видеть экран участника

**Аргумент 2: Семантика homepage**
- Homepage = "публичные предстоящие поездки"
- Unlisted события НЕ публичны по определению
- Для личных событий есть `/events` (персональный список)

**Аргумент 3: Консистентность с дизайном**
- Unlisted = "скрыто из списков, доступно по ссылке"
- Homepage = список → unlisted не показывается

---

### **ЗА показ участникам:**

**Аргумент 1: UX удобство**
- Участник зарегистрировался → хочет видеть событие
- Homepage = быстрый доступ к предстоящим поездкам
- Неудобно идти в `/events` для каждого события

**Аргумент 2: Ожидания пользователя**
- "Я зарегистрировался, почему не вижу событие?"
- Unlisted ≠ restricted (не требует специального доступа)
- Раз зарегистрировался → имею право видеть

**Аргумент 3: Аналогия с владельцем**
- Владелец видит свои unlisted на homepage
- Участник тоже "имеет отношение" к событию
- Почему разные правила?

---

## 📋 ЧАСТЬ 3: Варианты решения

### **Вариант A: Участники НЕ видят (текущий)** ⚠️

```typescript
export function isVisibleOnHomepage(
  event: Event,
  currentUser: CurrentUser | null
): boolean {
  // Public → всем
  if (isPubliclyVisible(event)) return true;
  
  // Owner → видит свои
  if (currentUser && event.createdByUserId === currentUser.id) {
    return true;
  }
  
  // Participants → НЕ видят unlisted на homepage
  return false;
}
```

**Логика:**
- Homepage = публичная витрина
- Личные события → в `/events`

---

### **Вариант B: Участники ВИДЯТ** ⭐ РЕКОМЕНДУЕТСЯ

```typescript
export function isVisibleOnHomepage(
  event: Event,
  currentUser: CurrentUser | null,
  participantEventIds: Set<string> // ← Добавили параметр
): boolean {
  // Public → всем
  if (isPubliclyVisible(event)) return true;
  
  // Owner → видит свои
  if (currentUser && event.createdByUserId === currentUser.id) {
    return true;
  }
  
  // Participant → видит события где зарегистрирован
  if (participantEventIds.has(event.id)) {
    return true;
  }
  
  return false;
}
```

**Логика:**
- Homepage = "мои предстоящие поездки"
- Показываем всё, к чему у пользователя есть отношение

---

## 📋 ЧАСТЬ 4: Рекомендация

**Использовать Вариант B: Участники ВИДЯТ**

**Причины:**

1. **UX улучшается:**
   - Участник сразу видит свои события
   - Меньше кликов для доступа
   - Интуитивно понятно

2. **Консистентно с `/events`:**
   - `/events` показывает события участника
   - Homepage должен показывать то же самое (filtered)
   - Единая логика

3. **Приватность не нарушается:**
   - Событие показывается **только** самому участнику
   - Другие пользователи его НЕ видят (unlisted скрыт)
   - Владелец уже видит всех участников

4. **Аналогия с владельцем:**
   - Владелец видит свои unlisted
   - Участник тоже "имеет отношение"
   - Справедливо

---

## 📋 ЧАСТЬ 5: Реализация Варианта B

### **Изменение 1: Функция isVisibleOnHomepage()**

```typescript
// src/lib/utils/eventVisibility.ts

/**
 * Check if event should be visible on homepage
 * 
 * Homepage shows:
 * - Public events (everyone)
 * - User's own events (owner, including unlisted/restricted)
 * - Events where user is participant (including unlisted)
 * 
 * @param event Event to check
 * @param currentUser Current user (or null if anonymous)
 * @param participantEventIds Set of event IDs where user is participant
 * @returns true if event should appear on homepage
 */
export function isVisibleOnHomepage(
  event: Event,
  currentUser: CurrentUser | null,
  participantEventIds?: Set<string>
): boolean {
  // 1. Public events → everyone
  if (isPubliclyVisible(event)) return true;
  
  // 2. Owner sees their own events
  if (currentUser && event.createdByUserId === currentUser.id) {
    return true;
  }
  
  // 3. Participant sees events they're registered for
  if (participantEventIds && participantEventIds.has(event.id)) {
    return true;
  }
  
  return false;
}
```

### **Изменение 2: Homepage компонент**

```typescript
// src/app/(marketing)/_components/upcoming-events-async.tsx

export async function UpcomingEventsAsync() {
  const currentUser = await getCurrentUserSafe();
  const eventsData = await listVisibleEventsForUser(currentUser?.id ?? null);
  
  // Для фильтрации нужны participant IDs
  const participantEventIds = new Set(
    eventsData
      .filter(e => /* check if user is participant */)
      .map(e => e.id)
  );
  
  const upcomingEvents = eventsData
    .filter((e) => {
      const eventDate = new Date(e.dateTime);
      return isVisibleOnHomepage(e, currentUser, participantEventIds) && eventDate >= now;
    })
    .sort(...)
    .slice(0, 3);
```

**ПРОБЛЕМА:** Нужно передать `participantEventIds` в homepage.

---

## 📋 ЧАСТЬ 6: Упрощённое решение ⭐

**Проблема:** `participantEventIds` не доступны в homepage без дополнительного запроса.

**Решение:** Полагаться на то, что `listVisibleEventsForUser()` уже вернула правильные события.

```typescript
export function isVisibleOnHomepage(
  event: Event,
  currentUser: CurrentUser | null
): boolean {
  // 1. Public events → everyone
  if (isPubliclyVisible(event)) return true;
  
  // 2. If user is authenticated and event is in the list
  // it means they have access (owner, participant, or explicit access)
  if (currentUser) {
    return true; // Trust listVisibleEventsForUser() filtering
  }
  
  return false;
}
```

**Логика:**
- `listVisibleEventsForUser()` уже отфильтровала события
- Если пользователь авторизован и событие в списке → показываем
- Анонимы видят только public (т.к. `listVisibleEventsForUser(null)` вернёт только public)

---

## 🎯 ФИНАЛЬНАЯ РЕКОМЕНДАЦИЯ

**Использовать упрощённое решение:**

```typescript
export function isVisibleOnHomepage(
  event: Event,
  currentUser: CurrentUser | null
): boolean {
  // Public events visible to everyone
  if (isPubliclyVisible(event)) return true;
  
  // For authenticated users: trust listVisibleEventsForUser()
  // If event is in the list, user has relationship to it
  // (owner, participant, or explicit access)
  if (currentUser) {
    return true;
  }
  
  return false;
}
```

**Результат:**
- ✅ Участники **ВИДЯТ** свои unlisted события на homepage
- ✅ Владельцы **ВИДЯТ** свои события
- ✅ Анонимы **ВИДЯТ** только public
- ✅ Простое решение (не нужны дополнительные параметры)

---

**Что выбираем?**
1. **Вариант A:** Участники НЕ видят unlisted (текущий план)
2. **Вариант B:** Участники ВИДЯТ unlisted (рекомендуемый)
