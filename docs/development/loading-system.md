# Loading States & Skeleton Patterns

**Дата:** 8 декабря 2025  
**Проект:** Need4Trip

---

## 📋 Обзор

Единая система отображения loading состояний и skeleton screens для консистентного UX.

---

## 🎨 Компоненты загрузки

### 1. `Spinner` - Базовый спиннер

**Расположение:** `src/components/ui/spinner.tsx`

```typescript
import { Spinner } from "@/components/ui/spinner";

// Размеры
<Spinner size="sm" />  // 16x16px (для inline)
<Spinner size="md" />  // 32x32px (по умолчанию)
<Spinner size="lg" />  // 48x48px (для страниц)
```

**Дизайн:**
- Цвет: `#FF6F2C` (primary orange)
- Анимация: `animate-spin`
- Прозрачная правая граница для эффекта вращения

---

### 2. `PageLoader` - Для секций страниц

**Использование:** Client-side загрузка частей страницы

```typescript
import { PageLoader } from "@/components/ui/spinner";

function MyComponent() {
  const [loading, setLoading] = useState(true);
  
  if (loading) return <PageLoader />;
  
  return <div>Content</div>;
}
```

**Визуал:**
```
┌─────────────────┐
│                 │
│   ⟳ (spinner)   │  ← 48px спиннер
│   Загрузка...   │  ← Текст снизу
│                 │
│  (min-h-400px)  │
│                 │
└─────────────────┘
```

---

### 3. `FullPageLoader` - Для полной страницы

**Использование:** Root `loading.tsx`, критичные загрузки

```typescript
import { FullPageLoader } from "@/components/ui/spinner";

export default function Loading() {
  return <FullPageLoader />;
}
```

**Визуал:**
```
┌─────────────────┐
│                 │
│                 │
│   ⟳ + logo      │  ← Спиннер с градиентом
│   Need4Trip     │  ← Название проекта
│ Загружаем...    │  ← Сообщение
│                 │
│  (full screen)  │
└─────────────────┘
```

---

## 🏗️ Skeleton Screens

### Принципы дизайна

1. **Цвет:** `bg-[#F7F7F8]` (светло-серый)
2. **Анимация:** `animate-pulse`
3. **Закругления:** Соответствуют реальным элементам
4. **Пропорции:** Максимально близки к финальному контенту

---

### Типовые skeleton элементы

#### Заголовок страницы
```typescript
<div className="h-10 w-64 animate-pulse rounded-lg bg-[#F7F7F8]" />
```

#### Описание
```typescript
<div className="h-6 w-96 animate-pulse rounded-lg bg-[#F7F7F8]" />
```

#### Кнопка
```typescript
<div className="h-12 w-32 animate-pulse rounded-xl bg-[#F7F7F8]" />
```

#### Поле ввода
```typescript
<div className="h-12 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
```

#### Карточка
```typescript
<div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
  <div className="space-y-4">
    <div className="h-6 w-3/4 animate-pulse rounded bg-[#F7F7F8]" />
    <div className="h-4 w-full animate-pulse rounded bg-[#F7F7F8]" />
    <div className="h-4 w-2/3 animate-pulse rounded bg-[#F7F7F8]" />
  </div>
</div>
```

---

## 📂 Паттерны использования

### 1. SSR (Server-Side Rendering)

**Для App Router страниц**

Создайте `loading.tsx` рядом с `page.tsx`:

```
app/
├── events/
│   ├── page.tsx        ← Страница событий
│   └── loading.tsx     ← Автоматический loading UI
```

**Пример:** `app/events/loading.tsx`

```typescript
import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="space-y-8 py-12">
      {/* Детальный скелетон структуры страницы */}
      
      {/* Заголовок */}
      <div className="h-10 w-48 animate-pulse rounded-lg bg-[#F7F7F8]" />
      
      {/* Карточки */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-[#F7F7F8]" />
        ))}
      </div>
      
      {/* Центральный спиннер */}
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-base text-[#6B7280]">Загружаем события...</p>
        </div>
      </div>
    </div>
  );
}
```

**✅ Когда использовать:**
- Все SSR страницы (page.tsx)
- Страницы со статическими данными
- Страницы с серверными компонентами

---

### 2. CSR (Client-Side Rendering)

**Для "use client" компонентов**

**Пример:** `app/events/[id]/edit/page.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

export default function EditPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  useEffect(() => {
    async function loadData() {
      // Загрузка...
      setLoading(false);
    }
    loadData();
  }, []);
  
  if (loading) {
    return (
      <div className="page-container space-y-6 pb-10 pt-12">
        {/* Детальный скелетон */}
        <div className="h-12 w-32 animate-pulse rounded-lg bg-[#F7F7F8]" />
        
        {/* Форма */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-[#F7F7F8]" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-[#F7F7F8]" />
            </div>
          ))}
        </div>
        
        {/* Центральный спиннер */}
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-base text-[#6B7280]">Загрузка данных...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return <div>Content</div>;
}
```

**✅ Когда использовать:**
- Client компоненты с динамической загрузкой
- Формы с асинхронной инициализацией
- Страницы с клиентским state management

---

### 3. Inline Loading (для кнопок, форм)

**Пример:** Кнопка с loading состоянием

```typescript
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button disabled={isSubmitting}>
      {isSubmitting ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Сохранение...
        </>
      ) : (
        "Сохранить"
      )}
    </Button>
  );
}
```

---

## 📋 Чеклист стандартизации

### ✅ Все loading состояния должны:

1. **Использовать компоненты** из `@/components/ui/spinner`
   - ❌ НЕ inline HTML спиннеры
   - ✅ `<Spinner />`, `<PageLoader />`, `<FullPageLoader />`

2. **Включать скелетоны** для важного контента
   - ❌ Только спиннер на пустой странице
   - ✅ Скелетон структуры + спиннер

3. **Иметь понятное сообщение**
   - ❌ "Загрузка..."
   - ✅ "Загружаем события...", "Загрузка данных события..."

4. **Использовать правильный padding**
   - SSR: `space-y-8 py-12`
   - CSR: `page-container space-y-6 pb-10 pt-12`

5. **Центрировать спиннер**
```typescript
<div className="flex items-center justify-center py-12">
  <div className="text-center">
    <Spinner size="lg" />
    <p className="mt-4 text-base text-[#6B7280]">Сообщение...</p>
  </div>
</div>
```

---

## 🎯 Текущий статус

| Файл | Тип | Статус | Паттерн |
|------|-----|--------|---------|
| `app/loading.tsx` | Root | ✅ | `FullPageLoader` |
| `app/events/loading.tsx` | SSR | ✅ | Скелетон + Spinner |
| `app/events/[id]/loading.tsx` | SSR | ✅ | Скелетон + Spinner |
| `app/events/create/loading.tsx` | SSR | ✅ | Скелетон + Spinner |
| `app/events/[id]/edit/page.tsx` | CSR | ✅ | Скелетон + Spinner |

**Все компоненты стандартизированы!** ✅

---

## 🚀 Примеры из проекта

### 1. Список событий
**Файл:** `app/events/loading.tsx`

**Что показываем:**
- Заголовок и описание (скелетон)
- 3 stat карточки (скелетон)
- Табы (скелетон)
- Поле поиска (скелетон)
- Спиннер с текстом "Загружаем события..."

### 2. Детали события
**Файл:** `app/events/[id]/loading.tsx`

**Что показываем:**
- Кнопку "Назад" (скелетон)
- Заголовок и мета-инфо (скелетон)
- Кнопки действий (скелетон)
- Прогресс-бар (скелетон)
- Спиннер с текстом "Загружаем детали события..."

### 3. Создание события
**Файл:** `app/events/create/loading.tsx`

**Что показываем:**
- Кнопку "Назад" (скелетон)
- Заголовок и описание (скелетон)
- Форму (5 полей скелетон)
- Спиннер с текстом "Подготовка формы..."

### 4. Редактирование события (CSR)
**Файл:** `app/events/[id]/edit/page.tsx`

**Что показываем:**
- Кнопку "Назад" (скелетон)
- Заголовок и описание (скелетон)
- 4 карточки формы (скелетон)
- Спиннер с текстом "Загрузка данных события..."

---

## 🎨 Визуальные примеры

### Хороший паттерн ✅

```
┌─────────────────────────────────┐
│ ← Назад                         │  ← Скелетон кнопки
│                                 │
│ ████████████                    │  ← Скелетон заголовка
│ ████████████████████            │  ← Скелетон описания
│                                 │
│ ┌─────────┐ ┌─────────┐        │  ← Скелетон карточек
│ │░░░░░░░░░│ │░░░░░░░░░│        │
│ │░░░░░░░░░│ │░░░░░░░░░│        │
│ └─────────┘ └─────────┘        │
│                                 │
│         ⟳                       │  ← Спиннер (lg)
│    Загружаем...                 │  ← Понятное сообщение
│                                 │
└─────────────────────────────────┘
```

### Плохой паттерн ❌

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │  ← Пустая страница
│         ⟳                       │  ← Только спиннер
│    Загрузка...                  │  ← Общее сообщение
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

---

## 📝 Рекомендации

### 1. Детализация скелетонов
- **Высокая:** Для сложных страниц (списки, формы)
- **Средняя:** Для простых страниц (детали)
- **Низкая:** Для быстрых операций (модалки)

### 2. Сообщения
Используйте контекстные сообщения:
- ✅ "Загружаем события..."
- ✅ "Загрузка данных события..."
- ✅ "Подготовка формы..."
- ✅ "Сохранение..."
- ❌ "Загрузка..." (слишком общее)

### 3. Timing
- **< 200ms:** Не показывать loading
- **200-500ms:** Показать спиннер
- **> 500ms:** Показать скелетон + спиннер

### 4. Accessibility
Всегда добавляйте:
```typescript
<div role="status" aria-label="Загрузка">
  <Spinner />
  <span className="sr-only">Загрузка...</span>
</div>
```

---

## 🔄 Миграция

### Если используете старый паттерн:

#### ❌ Было:
```typescript
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
```

#### ✅ Стало:
```typescript
import { Spinner } from "@/components/ui/spinner";
<Spinner size="lg" />
```

---

## 📚 Связанные документы

- [`src/components/ui/spinner.tsx`](../src/components/ui/spinner.tsx) - Исходный код компонентов
- [CODE_OPTIMIZATION_REPORT.md](./CODE_OPTIMIZATION_REPORT.md) - Отчет по оптимизации
- [BADGE_SYSTEM.md](./BADGE_SYSTEM.md) - Система badges
- [PROGRESS_BAR_SYSTEM.md](./PROGRESS_BAR_SYSTEM.md) - Система progress bars

---

**Автор:** AI Assistant (Claude Sonnet 4.5)  
**Дата:** 8 декабря 2025  
**Статус:** Все loading паттерны стандартизированы ✅

