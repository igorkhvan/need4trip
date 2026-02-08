# Need4Trip — Design System (SSOT)

**Версия:** 1.5  
**Дата обновления:** 1 января 2026  
**Статус:** Production Ready ✅

---

## 🎯 ГЛАВНЫЙ ПРИНЦИП

> **Этот документ — ЕДИНСТВЕННЫЙ источник истины для всех UI/UX решений в Need4Trip.**

**ОБЯЗАТЕЛЬНО:**
- ✅ Читай этот SSOT **ПЕРЕД** любыми изменениями в UI
- ✅ Обновляй этот SSOT **ПОСЛЕ** успешных изменений дизайна
- ✅ Синхронизируй с Memory правилами и `.cursor/rules/need4trip-ssot-rules.mdc`

---

## 📐 АРХИТЕКТУРА ДИЗАЙНА

### Слои компонентов

```
Primitives (Radix UI)
    ↓
shadcn/ui Components (src/components/ui/)
    ↓
Feature Components (src/components/[feature]/)
    ↓
Pages (src/app/)
```

**Правила:**
- ❌ НЕ создавай прямые зависимости от Radix UI в feature компонентах
- ✅ Используй shadcn/ui обёртки из `src/components/ui/`
- ✅ Все UI primitives должны быть обёрнуты в shadcn/ui компоненты

---

## 🎨 ЦВЕТОВАЯ СИСТЕМА

### Основная палитра

```css
/* Primary (Orange) */
--color-primary: #FF6F2C
--color-primary-hover: #E65A1A
--color-primary-bg: #FFF4E6
--color-primary-border: #FFD9B3

/* Success (Green) */
--color-success: #22C55E
--color-success-hover: #16A34A
--color-success-bg: #F0FDF4
--color-success-border: #BBF7D0

/* Warning (Yellow) */
--color-warning: #F59E0B
--color-warning-hover: #D97706
--color-warning-bg: #FFFBEB
--color-warning-border: #FDE68A
--color-warning-text: #92400E

/* Danger (Red) */
--color-danger: #EF4444
--color-danger-hover: #DC2626
--color-danger-bg: #FEF2F2
--color-danger-border: #FECACA
--color-danger-text: #991B1B

/* Info (Blue) */
--color-info: #3B82F6
--color-info-hover: #2563EB
--color-info-bg: #EFF6FF
--color-info-border: #BFDBFE

/* Text */
--color-text: #1F2937        /* Primary text */
--color-text-muted: #6B7280  /* Secondary text */
--color-text-light: #9CA3AF  /* Tertiary text */
```

### Использование цветов

```tsx
// ✅ Primary action
<Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
  Создать
</Button>

// ✅ Destructive action
<Button className="bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)]">
  Удалить
</Button>

// ✅ Alert/Warning box
<div className="bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]">
  <p className="text-[var(--color-warning-text)]">Warning message</p>
</div>
```

**Правило:** Всегда используй CSS variables, НЕ hardcode hex значения.

---

## 🔤 ТИПОГРАФИКА

### Шрифт

**Шрифт:** Inter (Google Fonts)

```tsx
// pages/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });
```

### Заголовки

```css
/* h1 */
.heading-h1 {
  font-size: 36px;     /* mobile */
  font-size: 48px;     /* desktop */
  font-weight: 700;
  line-height: 1.2;
}

/* h2 */
.heading-h2 {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.3;
}

/* h3 (модалки, карточки) */
.heading-h3 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}
```

### Body текст

```css
/* Body (основной) */
.text-body {
  font-size: 15px;
  line-height: 1.5;
}

/* Body Small (descriptions) */
.text-body-small {
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-muted);
}

/* Caption (мелкий текст) */
.text-caption {
  font-size: 12px;
  line-height: 1.4;
  color: var(--color-text-light);
}
```

---

## 🪟 МОДАЛЬНЫЕ ОКНА (Dialog/AlertDialog)

### ⚡ КРИТИЧНО: Production-Ready Паттерн

**Дата обновления:** 27 декабря 2024  
**Статус:** ✅ Применён ко всем модалкам

### Структура модалки

```tsx
<Dialog>
  <DialogContent className="sm:max-w-lg">
    {/* 1. Header (fixed) */}
    <DialogHeader>
      <DialogTitle>Заголовок</DialogTitle>
      <DialogDescription>Описание</DialogDescription>
    </DialogHeader>

    {/* 2. Body (scrollable) */}
    <DialogBody className="space-y-4">
      {/* Весь контент модалки */}
    </DialogBody>

    {/* 3. Footer (fixed) */}
    <DialogFooter>
      <Button variant="outline">Отмена</Button>
      <Button>Подтвердить</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Анатомия DialogContent

```
┌─────────────────────────────────┐
│ DialogHeader (fixed)            │ ← px-4 pt-6 pb-4, border-b
│  - Title                        │
│  - Description (optional)       │
├─────────────────────────────────┤
│                                 │
│ DialogBody (scrollable)         │ ← flex-1, overflow-y-auto
│   - Единственная зона скролла   │   px-4 py-4
│   - Любой контент               │
│   - Forms, lists, alerts        │
│                                 │
├─────────────────────────────────┤
│ DialogFooter (fixed)            │ ← px-4 py-4, border-t
│   [Cancel] [Primary Action]     │   flex gap-2/3
└─────────────────────────────────┘

max-h-[90vh] - DialogContent
```

### Технические требования

#### 1. DialogContent классы

```tsx
<DialogContent className={cn(
  // Layout
  "flex flex-col",
  // Size
  "w-full max-h-[90vh]",
  // Width variants
  "max-w-md",   // small (default)
  "max-w-lg",   // medium
  "max-w-xl",   // large
  "max-w-3xl",  // extra large (forms)
)}>
```

**ВАЖНО:** НЕ используй `overflow-y-auto` на DialogContent — только на DialogBody!

#### 2. Анимации (КРИТИЧНО!)

```tsx
// ✅ ПРАВИЛЬНО: fade + zoom без translateY конфликта
className={cn(
  "fixed left-[50%] top-[50%]",
  "translate-x-[-50%] translate-y-[-50%]", // Центрирование
  "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
  "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
)}

// ❌ НЕПРАВИЛЬНО: slide-in-from-top создаёт конфликт с translate-y
"slide-in-from-top-[48%]"  // НЕ ИСПОЛЬЗОВАТЬ!
```

**Причина:** `slide-in-from-top` + `translate-y-[-50%]` создают конфликт центрирования, модалка "плавает" при открытии.

#### 3. DialogHeader

```tsx
<DialogHeader className={cn(
  "px-4 pt-6 pb-4 sm:px-6",
  "border-b border-gray-100", // Разделитель (опционально)
)}>
  <DialogTitle className="heading-h3">Title</DialogTitle>
  <DialogDescription className="text-body-small">
    Description
  </DialogDescription>
</DialogHeader>
```

#### 4. DialogBody (ОБЯЗАТЕЛЬНО!)

```tsx
<DialogBody className={cn(
  "space-y-4",  // Отступы между элементами
  // Дополнительные классы по необходимости
)}>
  {/* Content */}
</DialogBody>
```

**Встроенные стили DialogBody:**
- `flex-1` — занимает всё доступное пространство
- `overflow-y-auto` — скроллится при переполнении
- `px-4 py-4 sm:px-6` — адаптивные отступы

#### 5. DialogFooter

```tsx
<DialogFooter>
  {/* Secondary action (left/top) */}
  <Button variant="outline" className="w-full sm:w-auto">
    Отмена
  </Button>
  
  {/* Primary action (right/bottom) */}
  <Button className="w-full sm:w-auto">
    Подтвердить
  </Button>
</DialogFooter>
```

**Встроенные стили DialogFooter:**
- `flex flex-col-reverse` (mobile) → `sm:flex-row` (desktop)
- `gap-2 sm:gap-3` — отступы между кнопками
- `px-4 py-4 sm:px-6` — адаптивные отступы
- `border-t border-gray-100` — верхний разделитель

### CTA паттерны

#### Confirm Modal

```tsx
<DialogFooter>
  <Button variant="outline">Отмена</Button>
  <Button className="bg-[var(--color-primary)]">
    Подтвердить
  </Button>
</DialogFooter>
```

#### Destructive Action

```tsx
<DialogFooter>
  <Button variant="outline">Отмена</Button>
  <Button className="bg-[var(--color-danger)]">
    Удалить
  </Button>
</DialogFooter>
```

#### Multi-option (Paywall)

```tsx
<DialogBody>
  {/* Options as buttons */}
  <button className="flex items-start gap-3 p-3 border rounded-lg hover:border-primary">
    <Icon />
    <div>
      <p className="font-medium">Option 1</p>
      <p className="text-sm text-muted">Description</p>
    </div>
  </button>
</DialogBody>

<DialogFooter>
  <Button variant="ghost">Отмена</Button>
</DialogFooter>
```

### AlertDialog vs Dialog

**AlertDialog** — для критических действий (требует явного подтверждения):
- Удаление
- Необратимые операции
- Блокирует ESC и клик вне модалки

**Dialog** — для обычных модалок:
- Формы
- Просмотр информации
- Редактирование
- Можно закрыть ESC или кликом вне модалки

### Размеры модалок

```tsx
// Small (default)
<DialogContent className="sm:max-w-md">  // 448px

// Medium (confirm, alerts)
<DialogContent className="sm:max-w-lg">  // 512px

// Large (forms с полями)
<DialogContent className="sm:max-w-xl">  // 576px

// Extra Large (сложные формы, карта)
<DialogContent className="sm:max-w-3xl"> // 768px
```

### Адаптивность

```tsx
// Mobile first
<DialogContent className="w-full sm:max-w-lg">
  {/* На mobile: w-full (с padding по краям от overlay) */}
  {/* На desktop: max-w-lg центрировано */}
</DialogContent>

// Buttons
<Button className="w-full sm:w-auto">
  {/* На mobile: full width */}
  {/* На desktop: auto width */}
</Button>
```

### Примеры использования

#### 1. Confirm Modal (Credit Confirmation)

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="heading-h3 flex items-center gap-3">
        <Icon />
        Подтверждение
      </DialogTitle>
      <DialogDescription>
        Описание действия
      </DialogDescription>
    </DialogHeader>

    <DialogBody className="space-y-4">
      {/* Alert */}
      <div className="flex gap-3 p-4 bg-[var(--color-warning-bg)]">
        <AlertCircle />
        <p>Warning message</p>
      </div>

      {/* Details */}
      <dl className="grid grid-cols-[auto_1fr] gap-2 text-sm">
        <dt>Опция:</dt>
        <dd className="font-medium">Event Upgrade 500</dd>
      </dl>
    </DialogBody>

    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>
        Отмена
      </Button>
      <Button onClick={onConfirm}>
        Подтвердить и опубликовать
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 2. Form Modal (Participant Registration)

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-3xl">
    <DialogHeader>
      <DialogTitle>Регистрация на событие</DialogTitle>
      <DialogDescription>
        Заполните данные для регистрации
      </DialogDescription>
    </DialogHeader>

    <DialogBody>
      <ParticipantForm onSuccess={handleSuccess} />
    </DialogBody>
    
    {/* Footer в форме (внутри ParticipantForm) */}
  </DialogContent>
</Dialog>
```

#### 3. Info Modal (Map Preview)

```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>{location.title}</DialogTitle>
      <p className="text-sm text-muted-foreground">
        {coordinates}
      </p>
    </DialogHeader>

    <DialogBody className="space-y-4">
      <GoogleMapEmbed />
      
      <div className="flex justify-between">
        <Button variant="ghost">Copy</Button>
        <Button>Open in Navigation</Button>
      </div>
    </DialogBody>
  </DialogContent>
</Dialog>
```

### ЗАПРЕЩЕНО

```tsx
// ❌ НЕ используй grid layout
<DialogContent className="grid gap-4"> 

// ❌ НЕ ставь padding на DialogContent
<DialogContent className="p-4">

// ❌ НЕ используй slide-in-from-top анимации
className="slide-in-from-top-[48%]"

// ❌ НЕ ставь overflow-y-auto на DialogContent
<DialogContent className="overflow-y-auto">

// ❌ НЕ используй content напрямую без DialogBody
<DialogContent>
  <DialogHeader />
  <div className="space-y-4"> {/* ❌ Не скроллится! */}
    Content
  </div>
  <DialogFooter />
</DialogContent>

// ❌ НЕ ставь max-h на DialogContent + DialogBody одновременно
<DialogContent className="max-h-[80vh]"> {/* ❌ */}
  <DialogBody className="max-h-[60vh]">  {/* ❌ Конфликт! */}
```

### ОБЯЗАТЕЛЬНО

```tsx
// ✅ Всегда используй DialogBody для контента
<DialogContent>
  <DialogHeader />
  <DialogBody> {/* ✅ */}
    Content
  </DialogBody>
  <DialogFooter />
</DialogContent>

// ✅ max-h только на DialogContent
<DialogContent className="max-h-[90vh]"> {/* ✅ */}
  <DialogBody> {/* flex-1 + overflow-y-auto */}
    Content
  </DialogBody>
</DialogContent>

// ✅ Кнопки w-full sm:w-auto
<Button className="w-full sm:w-auto"> {/* ✅ */}

// ✅ Primary кнопка справа/снизу
<DialogFooter>
  <Button variant="outline">Cancel</Button>
  <Button>Primary</Button> {/* ✅ Справа */}
</DialogFooter>
```

---

## 🔘 BUTTONS

### Варианты

```tsx
// Primary (default)
<Button>Primary Action</Button>

// Secondary (outline)
<Button variant="outline">Secondary</Button>

// Ghost (subtle)
<Button variant="ghost">Subtle Action</Button>

// Destructive
<Button variant="destructive">Delete</Button>

// Link
<Button variant="link">Link Action</Button>
```

### Размеры

```tsx
<Button size="sm">Small</Button>     // h-8 text-sm
<Button size="default">Default</Button> // h-10 text-base
<Button size="lg">Large</Button>     // h-12 text-lg
<Button size="icon">Icon</Button>    // h-10 w-10
```

### Loading state

```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Spinner size="sm" className="mr-2" />
      Загрузка...
    </>
  ) : (
    'Отправить'
  )}
</Button>
```

### Адаптивный текст (десктоп/мобильная)

```tsx
// Пример: AI кнопка генерации (event-form.tsx)
<Button
  variant="secondary"
  disabled={disabled || isGeneratingRules}
  className="whitespace-nowrap"
>
  {isGeneratingRules ? (
    <>
      <Spinner size="sm" className="mr-2" />
      <span className="hidden sm:inline">Генерируем правила...</span>
      <span className="sm:hidden">Генерация...</span>
    </>
  ) : (
    <>
      <span className="hidden sm:inline">✨ Сгенерировать правила с помощью ИИ</span>
      <span className="sm:hidden">✨ ИИ генерация</span>
    </>
  )}
</Button>
```

**Принципы:**
- ✅ `hidden sm:inline` — скрыть на мобильной, показать на десктопе
- ✅ `sm:hidden` — показать на мобильной, скрыть на десктопе
- ✅ `whitespace-nowrap` — предотвратить перенос строки
- ✅ Spinner только в loading state
- ✅ Короткий текст для мобильной (< 15 символов)

---

## 🎴 CARDS

### Структура Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  
  <CardContent>
    {/* Main content */}
  </CardContent>
  
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Размеры

```css
/* Small card */
.card-sm {
  padding: 12px;
  border-radius: 8px;
}

/* Medium card (default) */
.card {
  padding: 16px;
  border-radius: 12px;
}

/* Large card */
.card-lg {
  padding: 24px;
  border-radius: 16px;
}
```

---

## 🏷️ BADGES

```tsx
// Default
<Badge>Default</Badge>

// Success
<Badge variant="success">Active</Badge>

// Warning
<Badge variant="warning">Pending</Badge>

// Danger
<Badge variant="destructive">Cancelled</Badge>

// Info
<Badge variant="secondary">Draft</Badge>
```

---

## 📱 АДАПТИВНОСТЬ

### Breakpoints

```css
/* Mobile first approach */
/* xs: 0-479px    (default) */
/* sm: 480-767px  (small tablets) */
/* md: 768-1023px (tablets) */
/* lg: 1024+px    (desktop) */
```

### Tailwind breakpoints

```tsx
<div className="
  p-4           /* Mobile: 16px */
  sm:p-6        /* Tablet: 24px */
  lg:p-8        /* Desktop: 32px */
">
```

### Типичные паттерны

```tsx
// Responsive layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Responsive spacing
<div className="space-y-4 sm:space-y-6">

// Responsive text
<h1 className="text-2xl sm:text-3xl lg:text-4xl">

// Responsive width
<div className="w-full sm:w-auto">
```

---

## ✨ АНИМАЦИИ

### Принципы

1. **Быстрые и ненавязчивые** — 200-300ms
2. **Fade + Scale** для модалок
3. **Slide** для drawer/sheet
4. **NO BOUNCE** — слишком игриво для B2B

### Типичные анимации

```css
/* Dialog/Modal */
.dialog-animation {
  animation: fadeIn 200ms ease-out,
             zoomIn 200ms ease-out;
}

/* Hover effects */
.button:hover {
  transition: background-color 150ms ease-in-out;
}

/* Loading spinner */
.spinner {
  animation: spin 1s linear infinite;
}
```

### Tailwind utilities

```tsx
// Transition
<div className="transition-all duration-200">

// Hover
<div className="hover:bg-gray-100">

// Active
<button className="active:scale-95">
```

---

## 📏 SPACING SYSTEM

### Scale (4px base)

```
0.5 = 2px
1   = 4px
2   = 8px
3   = 12px
4   = 16px  ← Default component padding
5   = 20px
6   = 24px  ← Section padding
8   = 32px  ← Page padding
12  = 48px
16  = 64px
```

### Использование

```tsx
// Component padding
<div className="p-4">          /* 16px */

// Section spacing
<div className="space-y-6">    /* 24px между элементами */

// Page container
<div className="px-4 py-8">    /* 16px horizontal, 32px vertical */
```

---

## 🔍 BORDERS & SHADOWS

### Border radius

```css
rounded-sm   = 4px   /* Small elements */
rounded      = 8px   /* Default (buttons, inputs) */
rounded-lg   = 12px  /* Cards */
rounded-xl   = 16px  /* Large cards */
rounded-2xl  = 24px  /* Modals */
```

### Shadows

```css
shadow-sm  /* Subtle */
shadow     /* Default (cards) */
shadow-md  /* Elevated */
shadow-lg  /* Modals, popovers */
```

---

## 📊 LOADING STATES

### LoadingBar — Фоновая загрузка данных

**Компонент:** `src/components/ui/loading-bar.tsx`

**Назначение:** Тонкая полоска загрузки для stale-while-revalidate паттерна (когда данные уже показаны, но обновляются в фоне).

**Использование:**

```tsx
import { LoadingBar } from "@/components/ui/loading-bar";

<div className="relative">
  {refetching && <LoadingBar />}
  <Card>Content</Card>
</div>
```

**Props:**

```typescript
interface LoadingBarProps {
  position?: "top" | "bottom";  // default: "top"
  height?: number;               // default: 2 (px)
  className?: string;            // optional
}
```

**Визуал:**

```
┌─────────────────────────┐
│ ━━━━━━━ (animate)       │  ← LoadingBar (2px, primary color)
│                         │
│   Card Content          │
│   (data visible)        │
│                         │
└─────────────────────────┘
```

**Правила:**

- ✅ Используй для background refetch (когда данные уже показаны)
- ✅ Height 2-3px (тонкая, ненавязчивая)
- ✅ Primary color с shimmer анимацией
- ❌ НЕ используй для initial load (используй Skeleton)
- ❌ НЕ используй для блокирующих операций (используй Spinner)

**Примеры использования:**

```tsx
// Stats cards при фоновом обновлении
<Card className="relative">
  {statsRefetching && <LoadingBar />}
  <CardContent>{stats.total}</CardContent>
</Card>

// Events list при пагинации
<div className="relative">
  {listRefetching && events.length > 0 && <LoadingBar height={3} />}
  <EventsGrid events={events} />
</div>

// Bottom position для карточек
<Card className="relative">
  {refetching && <LoadingBar position="bottom" />}
  <CardContent>Content</CardContent>
</Card>
```

**Pattern: Stale-While-Revalidate**

LoadingBar используется в паре с хуками, которые реализуют SWR паттерн:

```typescript
// Hook implementation
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);      // Initial load
const [refetching, setRefetching] = useState(false); // Background update

useEffect(() => {
  if (data === null) {
    setLoading(true);  // Show skeleton
  } else {
    setRefetching(true);  // Show LoadingBar
  }
  
  // Fetch data...
  
  setLoading(false);
  setRefetching(false);
}, [params]);

// UI
{loading ? <Skeleton /> : (
  <div className="relative">
    {refetching && <LoadingBar />}
    <Content data={data} />
  </div>
)}
```

---

## 🚨 ERROR STATES & MESSAGING (SSOT)

**Статус:** CANONICAL (v1.2)

**Ссылка:** Error taxonomy и surface mapping → `docs/ssot/SSOT_ARCHITECTURE.md` § 20.2 и § 22.5

Этот раздел определяет КАНОНИЧЕСКИЕ UI паттерны для отображения ошибок.

### Принципы отображения ошибок

1. **Ошибки ВНУТРИ layout** — никаких "panic" full-page blank экранов
2. **Toast НЕ для ошибок** — toast только для success/info
3. **Retry только где уместно** — не для 401, 403, 404, 422
4. **Persistent до разрешения** — ошибка видна пока не исправлена

### PageErrorState — Ошибка уровня страницы

**Когда использовать:**
- Page-level fetch fail (500, network, timeout)
- Route access denied (403)
- Resource not found (404)

**Где появляется:** Main content area, ВНУТРИ layout wrapper

**Визуальная семантика:**
- Danger color (`--color-danger`) для критических (500)
- Warning color (`--color-warning`) для 403/404
- Icon: AlertTriangle или XCircle

**Действия:**
- "Попробовать снова" — для 500, network, timeout
- "Вернуться назад" — для 403, 404 (NO retry)

**Структура:**

```tsx
// src/components/ui/page-error-state.tsx (recommended)
interface PageErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;      // если undefined, кнопка retry не показывается
  onBack?: () => void;       // опционально
  variant?: 'error' | 'warning' | 'info';
}

<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
  <Icon className="w-12 h-12 text-[var(--color-danger)] mb-4" />
  <h2 className="heading-h2 mb-2">{title}</h2>
  <p className="text-body-small text-[var(--color-text-muted)] mb-6 max-w-md">
    {message}
  </p>
  <div className="flex gap-3">
    {onBack && <Button variant="outline" onClick={onBack}>Назад</Button>}
    {onRetry && <Button onClick={onRetry}>Попробовать снова</Button>}
  </div>
</div>
```

**Copy Intent (RU):**

| Ситуация | Title | Message |
|----------|-------|---------|
| 500 Server Error | "Ошибка сервера" | "Не удалось загрузить данные. Попробуйте обновить страницу." |
| Network Error | "Нет подключения" | "Проверьте интернет-соединение и попробуйте снова." |
| Timeout | "Превышено время ожидания" | "Сервер не ответил вовремя. Попробуйте позже." |
| 403 Forbidden | "Доступ запрещён" | "У вас нет прав для просмотра этой страницы." |
| 404 Not Found | "Страница не найдена" | "Запрошенная страница не существует или была удалена." |

---

### SectionErrorState — Ошибка в секции/карточке

**Когда использовать:**
- Независимая секция/карточка не загрузилась (stats card, sidebar widget)
- Остальной контент страницы работает

**Где появляется:** Внутри Card/section container

**Визуальная семантика:**
- Меньший масштаб чем PageErrorState
- Danger/warning background (`--color-danger-bg`)
- Compact layout

**Действия:**
- "Повторить" — если уместно (500, network)
- Нет кнопки — для 403, 422

**Структура:**

```tsx
// src/components/ui/section-error-state.tsx (recommended)
<div className="p-4 bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] rounded-lg">
  <div className="flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-[var(--color-danger)] mt-0.5" />
    <div className="flex-1">
      <p className="text-sm font-medium text-[var(--color-danger-text)]">
        {message}
      </p>
      {onRetry && (
        <Button variant="link" size="sm" onClick={onRetry} className="mt-2 p-0">
          Повторить
        </Button>
      )}
    </div>
  </div>
</div>
```

**Copy Intent (RU):**

| Ситуация | Message |
|----------|---------|
| Stats load fail | "Не удалось загрузить статистику" |
| Widget fail | "Ошибка загрузки данных" |
| Partial load fail | "Некоторые данные недоступны" |

---

### InlineErrorBanner — Информационный баннер

**Когда использовать:**
- Non-blocking предупреждения
- Rate limit notice (429)
- Degraded functionality notice
- Требуется действие пользователя

**Где появляется:** Above affected content, within flow

**Визуальная семантика:**
- Warning color (`--color-warning-bg`) или Info color (`--color-info-bg`)
- Full-width banner
- Dismissible (опционально)

**Действия:**
- "Повторить" — для 429 после `Retry-After`
- "Закрыть" — если dismissible

**Структура:**

```tsx
// src/components/ui/inline-error-banner.tsx (recommended)
<div className="p-3 bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-lg">
  <div className="flex items-center gap-3">
    <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
    <p className="flex-1 text-sm text-[var(--color-warning-text)]">
      {message}
    </p>
    {onRetry && (
      <Button variant="ghost" size="sm" onClick={onRetry}>
        Повторить
      </Button>
    )}
    {onDismiss && (
      <Button variant="ghost" size="sm" onClick={onDismiss}>
        <X className="w-4 h-4" />
      </Button>
    )}
  </div>
</div>
```

**Copy Intent (RU):**

| Ситуация | Message |
|----------|---------|
| 429 Rate Limited | "Слишком много запросов. Подождите минуту и попробуйте снова." |
| Degraded | "Некоторые функции временно недоступны." |
| Conflict | "Кто-то уже редактирует эти данные." |

---

### FormFieldError — Ошибка поля формы

**Когда использовать:**
- Client-side validation fail
- Server-side validation fail (422) для конкретного поля

**Где появляется:** Beneath input field

**Визуальная семантика:**
- Danger color
- Small text (12-13px)
- Icon опционально

**Структура:**

```tsx
// Integrated into form components
<div className="space-y-2">
  <Input className={error ? "border-[var(--color-danger)]" : ""} />
  {error && (
    <p className="text-xs text-[var(--color-danger)]">
      {error}
    </p>
  )}
</div>
```

**Copy Intent (RU):**

| Ситуация | Message |
|----------|---------|
| Required empty | "Обязательное поле" |
| Invalid email | "Введите корректный email" |
| Too short | "Минимум {n} символов" |
| Too long | "Максимум {n} символов" |
| Invalid format | "Неверный формат" |
| Unique constraint | "Такое значение уже существует" |

---

### FormSummaryError — Общая ошибка формы

**Когда использовать:**
- Multiple field errors (summary)
- Form-level server error (не привязанная к полю)
- General submission failure

**Где появляется:** Top of form, before first field

**Структура:**

```tsx
// Above form fields
{formError && (
  <div className="p-3 bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] rounded-lg mb-4">
    <p className="text-sm text-[var(--color-danger-text)]">
      {formError}
    </p>
  </div>
)}
```

**Copy Intent (RU):**

| Ситуация | Message |
|----------|---------|
| General submit fail | "Не удалось сохранить данные. Попробуйте позже." |
| Multiple errors | "Пожалуйста, исправьте ошибки в форме" |
| Server validation | "Проверьте введённые данные" |

---

### BlockingModalError — Ошибка внутри модалки

**Когда использовать:**
- Modal action fail
- Needs user decision before modal close

**Где появляется:** Inside modal body, above actions (DialogBody)

**ВАЖНО:** Это НЕ отдельная модалка. Это ошибка ВНУТРИ существующей модалки.

**Структура:**

```tsx
<DialogBody>
  {error && (
    <div className="p-3 bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] rounded-lg mb-4">
      <p className="text-sm text-[var(--color-danger-text)]">{error}</p>
    </div>
  )}
  {/* Rest of modal content */}
</DialogBody>
```

---

### EmptyState — Пустое состояние

**Когда использовать:**
- Successful fetch with zero results
- New user with no data
- Filtered list with no matches

**Где появляется:** Main content area or section container

**Визуальная семантика:**
- Info/neutral color
- Illustration or icon
- Helpful message + action

**Структура:**

```tsx
// src/components/ui/empty-state.tsx (recommended)
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
  {icon && <div className="mb-4 text-[var(--color-text-light)]">{icon}</div>}
  <h3 className="heading-h3 mb-2">{title}</h3>
  <p className="text-body-small text-[var(--color-text-muted)] mb-6 max-w-sm">
    {message}
  </p>
  {action && (
    <Button onClick={action.onClick}>{action.label}</Button>
  )}
</div>
```

**Copy Intent (RU):**

| Ситуация | Title | Message | Action |
|----------|-------|---------|--------|
| No events | "Нет событий" | "Создайте своё первое событие" | "Создать событие" |
| No search results | "Ничего не найдено" | "Попробуйте изменить параметры поиска" | "Сбросить фильтры" |
| No participants | "Пока нет участников" | "Поделитесь ссылкой на событие" | "Скопировать ссылку" |
| No clubs | "Вы не состоите в клубах" | "Вступите в клуб или создайте свой" | "Найти клубы" |

---

### System Errors (Internal / DB / Infrastructure) — UI Rules

**Status:** CANONICAL (v1.3)

**Reference:** Backend mapping → `docs/ssot/SSOT_ARCHITECTURE.md` § 20.7

Этот раздел определяет как системные ошибки (DB, инфраструктура, внутренние исключения) отображаются в UI.

#### Core Principle

> **System errors are displayed ONLY via canonical error state components. No dedicated "DB error" UI exists.**

#### Canonical Error States for System Errors

| Error Type | UI Component | Copy Intent |
|------------|--------------|-------------|
| 500 Internal Server Error | `PageErrorState` / `SectionErrorState` | `GENERIC_INTERNAL_ERROR` |
| Database failure | `PageErrorState` / `SectionErrorState` | `GENERIC_INTERNAL_ERROR` |
| Infrastructure failure | `PageErrorState` / `SectionErrorState` | `GENERIC_INTERNAL_ERROR` |
| Network error | `PageErrorState` / `SectionErrorState` | `NETWORK_ERROR` |
| Timeout | `PageErrorState` / `SectionErrorState` | `TIMEOUT_ERROR` |

#### UI Behavior Rules (LOCKED)

| Rule | Description |
|------|-------------|
| **Single error surface** | All system errors use the same PageErrorState or SectionErrorState. No special "DB error screen". |
| **Intent-based copy** | Text comes from Canonical Error Message Intents table (below), NOT from backend message. |
| **No technical details** | Never display constraint names, SQL errors, stack traces, or error codes. |
| **Retry for all system errors** | PageErrorState/SectionErrorState MUST show "Попробовать снова" button for 500/network/timeout. |
| **Scope determines surface** | Page-scoped failure → PageErrorState. Section-scoped → SectionErrorState. |

#### Forbidden Technical Wording

The following words/phrases MUST NEVER appear in user-facing error messages:

- `database`, `база данных` (as error cause)
- `constraint`, `ограничение` (technical)
- `SQL`, `SQLSTATE`, `Postgres`, `Supabase`
- `index`, `foreign key`, `primary key`
- `internal error code`, `код ошибки`
- `exception`, `stack trace`
- `driver`, `connection pool`
- `timeout` (as raw technical term — use user-friendly "время ожидания")

**Allowed:** Generic, calming phrases like "Ошибка сервера", "Попробуйте позже", "Что-то пошло не так".

---

### Canonical Error Message Intents (SSOT)

**Status:** CANONICAL (v1.3)

This table defines the ONLY allowed error message intents for user-facing copy. Frontend MUST select intent based on error type, NOT based on raw backend message.

| Intent ID | When Used | RU Title | RU Message | Allowed Action | Notes |
|-----------|-----------|----------|------------|----------------|-------|
| `GENERIC_INTERNAL_ERROR` | 500, DB errors, unhandled exceptions | "Ошибка сервера" | "Что-то пошло не так. Попробуйте позже." | Retry (manual) | **Default for ALL unmapped errors** |
| `NETWORK_ERROR` | Fetch failed, no response | "Нет подключения" | "Проверьте интернет-соединение и попробуйте снова." | Retry (manual) | Includes DNS, SSL errors |
| `TIMEOUT_ERROR` | Request timeout (gateway, server) | "Превышено время ожидания" | "Сервер не ответил вовремя. Попробуйте позже." | Retry (manual) | 504, client-side timeout |
| `NOT_FOUND_ERROR` | 404, resource missing | "Страница не найдена" | "Запрошенная страница не существует или была удалена." | Back (no retry) | |
| `FORBIDDEN_ERROR` | 403, access denied | "Доступ запрещён" | "У вас нет прав для просмотра этой страницы." | Back (no retry) | |
| `RATE_LIMITED` | 429 | "Слишком много запросов" | "Подождите минуту и попробуйте снова." | Retry (wait) | Show `Retry-After` if available |
| `VALIDATION_ERROR` | 422, field errors | "Проверьте данные" | "Пожалуйста, исправьте ошибки в форме." | Fix input (no retry) | Use FormFieldError for specific fields |
| `CONFLICT_ERROR` | 409 (not credit-related) | "Конфликт данных" | "Кто-то уже изменил эти данные. Обновите страницу." | Refresh/Retry | |

**CRITICAL:** 
- `GENERIC_INTERNAL_ERROR` is used **regardless of internal cause** (DB constraint, service failure, null pointer, memory error).
- Intent selection happens in UI code based on HTTP status, NOT based on `error.message` parsing.
- If backend returns unrecognized status → default to `GENERIC_INTERNAL_ERROR`.

---

### FORBIDDEN UI BEHAVIOR (Error Handling)

**Status:** CANONICAL (v1.3)

The following patterns are **STRICTLY PROHIBITED** and constitute a compliance violation:

| Forbidden Pattern | Problem | Correct Approach |
|-------------------|---------|------------------|
| **Displaying raw backend error messages** | Exposes internals, confusing UX | Use Canonical Error Message Intents |
| **Showing DB/infrastructure terminology** | Technical jargon, user cannot act on it | Generic user-friendly copy only |
| **Differentiating UI based on DB constraint names** | Coupling to implementation details | Map to 422 ValidationError on backend |
| **Toast notifications for system errors** | Disappears, no context, no retry | Use PageErrorState/SectionErrorState |
| **Parsing `error.message` for DB keywords** | Fragile, language-dependent | Use HTTP status + error code only |
| **Special "database error" screen** | Exposes architecture, no user action | Same PageErrorState as other 500s |
| **Showing SQLSTATE or error codes to user** | Meaningless to user | Log internally, show intent-based copy |
| **Alert/confirm dialogs for API errors** | Blocks UI, poor UX | Use error surface in place |

**Audit Checkpoint:** Search codebase for words: `database`, `constraint`, `SQL`, `internal error message` in UI strings. Any occurrence (except SSOT docs) is a violation.

---

### Aborted User-Initiated Flows

**Status:** CANONICAL (v1.4)

**SSOT Authority:** SSOT_ARCHITECTURE.md § 26 is the primary source of truth for aborted/incomplete action behavior. This section defines UI-specific patterns without duplicating architectural rules.

**Reference:** See SSOT_ARCHITECTURE.md § 26 for full definitions, invariants, and scenario table.

#### Core UI Principles for Aborted Flows

| Principle | Description |
|-----------|-------------|
| **User cancel ≠ error** | User closing paywall, cancelling payment, or navigating away MUST NOT trigger error UI (toast, alert, error banner). |
| **Silent return to context** | When user cancels, UI returns to previous state (form, page) without any notification. Form data is preserved. |
| **No "Payment cancelled" toast** | Toast notifications are FORBIDDEN for user-initiated cancellations. Toast is ONLY for success/info. |
| **No "Processing payment" blocking state** | UI MUST NOT display indefinite "Payment is processing..." mode without backend confirmation. |

#### Canonical UI Behavior by Scenario

| Scenario | User Action | UI Outcome | Forbidden |
|----------|-------------|------------|-----------|
| User closes PaywallModal (X, ESC, click outside) | Cancel | Modal closes. Form visible. No message. | ❌ Error toast/alert |
| User clicks "Cancel" in CreditConfirmationModal | Cancel | Modal closes. Return to form. Data preserved. | ❌ Error toast/alert |
| User navigates back from external payment page | Implicit cancel | On return: normal form state. No "interrupted" message. | ❌ "Payment was interrupted" banner |
| User closes tab during payment polling | Leave | N/A (user left). On return: fresh state. | ❌ localStorage-based "resume payment" UI |
| Network error during save (after paywall closed) | N/A | Error shown via PageErrorState/SectionErrorState. Retry allowed. | ❌ Toast for error |

#### Allowed Neutral Messages (Non-Error)

In specific cases, a neutral informational banner MAY be shown. These are NOT errors.

| Scenario | Allowed | Component | Copy Intent |
|----------|---------|-----------|-------------|
| User returns after implicit network drop | ✅ Optional | InlineInfoBanner | "Предыдущее действие не было завершено. Попробуйте снова." |
| Page reload during flow | ✅ Optional | None (fresh state) | N/A |

**Note:** "InlineInfoBanner" uses `--color-info-bg` (blue), NOT `--color-danger-bg` or `--color-warning-bg`. It is NOT an error surface.

#### What NOT to Build

The following UI patterns are FORBIDDEN and MUST NOT be implemented:

| Forbidden Pattern | Reason |
|-------------------|--------|
| "Payment is processing, please wait..." as persistent modal/overlay | Blocks UI indefinitely; backend may never confirm |
| Countdown timer "Payment expires in X:XX" | TTL is backend concern; UI has no authority over time limits |
| "Resume payment" button with stored transaction ID | Each action is independent; no cross-session payment state |
| "Are you sure you want to cancel payment?" confirmation dialog | User cancel is allowed without friction |
| Toast "Payment cancelled" on paywall close | User cancel is not an error |
| Red/warning styling for cancelled flows | Cancellation is neutral, not failure |

#### Implementation Examples

**PaywallModal close handler:**

```tsx
// ✅ CORRECT: Silent close
<PaywallModal
  open={showPaywall}
  onClose={() => setShowPaywall(false)}  // Just close, nothing else
  error={paywallError}
/>

// ❌ WRONG: Error feedback on cancel
<PaywallModal
  onClose={() => {
    setShowPaywall(false);
    showToast({ type: 'warning', message: 'Оплата отменена' });  // FORBIDDEN
  }}
/>
```

**CreditConfirmationModal cancel:**

```tsx
// ✅ CORRECT: Cancel returns to form
<CreditConfirmationModal
  onCancel={() => {
    controller.reset();  // Reset to idle
    hideConfirmation();  // Close modal
    // Form data preserved, no message shown
  }}
/>

// ❌ WRONG: Cancel triggers error state
<CreditConfirmationModal
  onCancel={() => {
    controller.setError('User cancelled');  // FORBIDDEN
    hideConfirmation();
  }}
/>
```

#### Cross-References

| Topic | SSOT Location |
|-------|---------------|
| Full invariants & scenario table | SSOT_ARCHITECTURE.md § 26 |
| UI Behavior Rules (Explicit vs Implicit Abort) | SSOT_ARCHITECTURE.md § 26.4 |
| Transaction state rules | SSOT_BILLING_SYSTEM_ANALYSIS.md § Aborted Purchase Attempts |
| ActionController phases | SSOT_ARCHITECTURE.md § 15 |
| Error surfaces (for actual errors) | This document § Error States & Messaging |
| Toast usage policy | This document § Error Taxonomy → UI Pattern Mapping |

---

### Neutral Informational Hint (Implicit Abort Only)

**Status:** CANONICAL (v1.5)

**SSOT Authority:** SSOT_ARCHITECTURE.md § 26.4 defines when this pattern is used. This section defines the UI implementation details.

**Purpose:** Reassure user after non-explicit interruption (network drop, tab close, browser crash) — NOT after explicit user cancellation.

#### When to Use

| Scenario | Show Hint |
|----------|-----------|
| User returns to form after tab was closed during payment | ✅ On next save attempt (OPTIONAL) |
| User returns after network dropped mid-flow | ✅ On next save attempt (OPTIONAL) |
| User explicitly cancelled paywall | ❌ NEVER |
| User clicked Cancel button | ❌ NEVER |
| User pressed ESC on modal | ❌ NEVER |
| Fresh page load with no prior interrupted state | ❌ NEVER |

#### Component Specification

**Component Name:** `InlineInfoBanner` (neutral informational variant)

**Location:** Inside existing context (above form, inside card) — NOT modal, NOT toast, NOT blocking overlay

**Visual Specification:**

```tsx
// ✅ CORRECT Implementation
<div className={cn(
  "p-3 rounded-lg mb-4",
  "bg-[var(--color-info-bg)]",        // Blue background, NOT danger/warning
  "border border-[var(--color-info-border)]"
)}>
  <div className="flex items-center gap-3">
    <Info className="w-5 h-5 text-[var(--color-info)]" />  // Info icon, NOT AlertTriangle/XCircle
    <p className="text-sm text-[var(--color-info)]">
      {message}
    </p>
  </div>
</div>
```

**Tone:** Calm, neutral, non-blaming — NOT alarming, NOT apologetic

**Copy Intent (RU):**
> "Действие не было завершено. Вы можете попробовать снова."

**Copy Intent (EN):**
> "The action was not completed. You can try again."

#### Behavior Rules (MUST)

| Rule | Description |
|------|-------------|
| **NOT an error** | Uses informational styling (`--color-info-bg`), NOT danger/warning colors |
| **NOT a toast** | Inline banner inside context, NOT floating toast notification |
| **NOT persistent** | Shown only once per interaction cycle; dismissed after user action |
| **NOT blocking** | Does not prevent user from interacting with form |
| **NOT automatic** | Shown ONLY on next user action (save/submit), NOT on page load |
| **OPTIONAL** | Detection of implicit interruption is UX enhancement, not requirement |

#### Forbidden Variations

| Forbidden | Reason |
|-----------|--------|
| Red/warning background | Implies error; interruption is neutral |
| AlertTriangle or XCircle icon | Implies failure; use Info icon |
| "Error" or "Failed" in copy | Not a failure; just incomplete |
| Toast notification | Disappears, creates anxiety |
| Modal/dialog | Blocking, implies critical issue |
| "Payment was interrupted" | Too specific; may not be payment |
| Auto-dismiss after timeout | User may not have time to read |
| Sound notification | Alarming, not appropriate |

#### Implementation Note

Detection of implicit interruption (vs explicit cancellation) is complex and may require:
- Session state tracking (was user in payment flow?)
- Browser visibility API (was tab closed?)
- Network state monitoring

**Many implementations choose to simply re-run enforcement on next save without hint.** This is acceptable. The hint is a UX enhancement to reduce user confusion, not a requirement.

If implemented, the hint MUST follow these rules exactly. Partial implementation (e.g., showing hint on explicit cancel) is WORSE than no hint.

---

### Consistency Audit Results (2026-01-01)

**Audit Date:** 1 января 2026  
**Status:** ⚠️ Technical Debt Identified

#### Forbidden Terms in UI Strings

✅ **PASS:** No occurrences of `database`, `constraint`, `SQL`, `internal error message` found in `src/components/`.

#### Raw Error Message Exposure

⚠️ **WARNING:** The following components show raw `error.message` to users, which MAY expose technical details if backend doesn't properly map errors:

| Component | Location | Issue | Severity |
|-----------|----------|-------|----------|
| `event-form.tsx` | Line 440 | AI generation error fallback shows `error.message` | Medium |
| `profile-page-client.tsx` | Lines 365-390, 463-486 | Vehicle CRUD shows `errorData.error.message` | Medium |
| `auth-modal.tsx` | Line 158 | Telegram auth error shows `err.message` | Medium |
| `error-boundary.tsx` | Lines 80, 133 | Error boundary shows raw `error.message` | Low (dev info) |
| `event-danger-zone.tsx` | Line 56 | Toast with `err.message` | Medium |
| `event-registration-control.tsx` | Line 73 | Toast with `err.message` | Medium |

**Note:** These are NOT immediate violations if backend properly maps all errors to user-friendly messages (per § 20.7 Backend Mapping Responsibility). However, they represent technical debt and coupling to backend message format.

**Recommended Fix (Future):** Replace `error.message` fallbacks with Canonical Error Message Intents based on HTTP status/error code. Example:

```tsx
// ❌ Current (fragile)
setError(err instanceof Error ? err.message : "Произошла ошибка");

// ✅ Recommended (intent-based)
setError(getErrorIntent(err.status).message); // Uses GENERIC_INTERNAL_ERROR for 500
```

**Backend Compliance (2026-01-01):**
- `src/app/api/auth/telegram/route.ts` returns messages containing "database" — these are NOT exposed to UI because frontend should use intent-based copy.
- No other API routes found with technical DB terminology in error messages.

---

### Error Taxonomy → UI Pattern Mapping (Сводная таблица)

**Reference:** `docs/ssot/SSOT_ARCHITECTURE.md` § 20.2 (Error Taxonomy — LOCKED)

| HTTP | Code | UI Pattern | Component | Retry | RU Copy Intent |
|------|------|------------|-----------|-------|----------------|
| 401 | `UNAUTHORIZED` | AuthModal / redirect | `AuthModal` | N/A | "Войдите в аккаунт" |
| 402 | `PAYWALL` | PaywallModal | `PaywallModal` | N/A | "Требуется подписка" |
| 403 | `FORBIDDEN` | PageErrorState | `PageErrorState` | ❌ | "Доступ запрещён" |
| 404 | `NotFound` | PageErrorState | `PageErrorState` / `not-found.tsx` | ❌ | "Страница не найдена" |
| 409 | `CREDIT_CONFIRMATION_REQUIRED` | CreditConfirmationModal | `CreditConfirmationModal` | N/A | "Подтвердите списание кредита" |
| 409 | `Conflict` / `REQUEST_IN_PROGRESS` | InlineErrorBanner | `InlineErrorBanner` | ✅ | "Запрос обрабатывается" |
| 422 | `ValidationError` | FormFieldError + FormSummaryError | Field + Form errors | ❌ | "Проверьте введённые данные" |
| 429 | `RateLimited` | InlineErrorBanner | `InlineErrorBanner` | ✅ (wait) | "Слишком много запросов" |
| 500 | `InternalError` | PageErrorState / SectionErrorState | `PageErrorState` / `SectionErrorState` | ✅ | "Ошибка сервера" |
| N/A | Network | PageErrorState / SectionErrorState | `PageErrorState` / `SectionErrorState` | ✅ | "Нет подключения" |
| N/A | Timeout | PageErrorState / SectionErrorState | `PageErrorState` / `SectionErrorState` | ✅ | "Превышено время ожидания" |

---

## 📥 SCREEN LOADING PATTERNS (SSOT)

**Статус:** CANONICAL (v1.2)

**Ссылка:** Loading taxonomy и decision matrix → `docs/ssot/SSOT_ARCHITECTURE.md` § 22.6-22.7

Этот раздел стандартизирует выбор UI инструментов для loading states.

### Loading Scenarios → UI Instrument (Canonical)

| Сценарий | UI Инструмент | Примечание |
|----------|---------------|------------|
| **Page initial load** | Skeleton layout | NEVER spinner-only blank |
| **List initial load** | Skeleton grid (`*SkeletonGrid`) | Показывает структуру |
| **Background refetch** | LoadingBar (2-3px) | Stale data visible |
| **List pagination** | Skeleton rows append | NOT inline spinner |
| **Button submit** | Spinner in button + disabled | Button-scoped |
| **Form submit** | Button spinner + form disabled | Form-scoped |
| **Route navigation** | `app/loading.tsx` | Branded loader |
| **Modal action** | Spinner in modal footer button | Modal-scoped |
| **Optimistic update** | No indicator | Instant UI update |

### Skeleton Components (Inventory)

**Location:** `src/components/ui/skeletons/`

| Component | Use Case |
|-----------|----------|
| `EventCardSkeleton` | Single event card |
| `EventCardSkeletonGrid` | Events list initial load |
| `ClubCardSkeleton` | Single club card |
| `ClubCardSkeletonGrid` | Clubs list initial load |
| `ProfileSkeleton` | Profile page |
| `TableSkeleton` | Data tables |
| `FormSkeleton` | Form initial load |

### LoadingBar (Background Refetch)

**Component:** `src/components/ui/loading-bar.tsx`

**Когда:** Данные уже показаны, обновление в фоне (SWR pattern)

```tsx
<div className="relative">
  {refetching && <LoadingBar />}
  <Content data={data} />
</div>
```

**Характеристики:**
- Height: 2-3px
- Primary color с shimmer animation
- Position: top of container (default)
- Non-blocking (stale data visible)

### Spinner in Button (Mutation Submit)

**Когда:** Form/action submit в процессе

```tsx
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Spinner size="sm" className="mr-2" />
      Сохранение...
    </>
  ) : (
    'Сохранить'
  )}
</Button>
```

**Характеристики:**
- Small spinner (16px)
- Button disabled
- Text изменяется на "Сохранение..." / "Загрузка..."

### Route Navigation (`app/loading.tsx`)

**Когда:** Route change (Next.js navigation)

**Рекомендация:** Create branded loading component

```tsx
// app/loading.tsx (recommended)
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-body-small text-[var(--color-text-muted)]">
          Загрузка...
        </p>
      </div>
    </div>
  );
}
```

---

## 🚫 FORBIDDEN PATTERNS (Error & Loading)

| Pattern | Problem | Correct Approach |
|---------|---------|------------------|
| **Toast for API errors** | Disappears, context lost | PageErrorState / SectionErrorState |
| **Toast for validation errors** | User can't see which field | FormFieldError + FormSummaryError |
| **Full-page blank error** | Panic UX, no navigation | PageErrorState INSIDE layout |
| **Full-page spinner** | No structure hint | Skeleton layout |
| **Spinner for initial list load** | No visual structure | Skeleton grid |
| **Skeleton for background refetch** | Flashing, loses scroll | LoadingBar |
| **Multiple loading indicators** | Confusing | One indicator per scope |
| **Error modal for API errors** | Blocks entire UI | Error surface in place |
| **Retry for 403/404/422** | Access won't change / input error | No retry button |

---

## ✅ CHECKLIST ПЕРЕД КОММИТОМ

При изменении UI компонентов проверь:

### Общие требования
- [ ] Компонент следует паттерну из SSOT
- [ ] Используются CSS variables для цветов
- [ ] Адаптивность (mobile first)
- [ ] Модалки используют DialogBody (если применимо)
- [ ] Анимации без translateY конфликтов
- [ ] Кнопки имеют правильные variants

### Error Handling (CRITICAL)
- [ ] **NO toast для ошибок** — только success/info
- [ ] API ошибки показываются через PageErrorState / SectionErrorState
- [ ] Validation ошибки через FormFieldError + FormSummaryError
- [ ] 401 → AuthModal, 402 → PaywallModal, 409 credit → CreditConfirmationModal
- [ ] Retry кнопка ТОЛЬКО для 500/network/timeout
- [ ] Error render INSIDE layout (no blank panic screens)

### Loading States (CRITICAL)
- [ ] Initial load → Skeleton (NEVER spinner-only)
- [ ] Background refetch → LoadingBar (NEVER skeleton)
- [ ] Pagination → Skeleton rows append
- [ ] Submit → Spinner in button + disabled
- [ ] One loading indicator per scope

### Build & Docs
- [ ] TypeScript ✅
- [ ] Build ✅
- [ ] SSOT обновлён (если добавлен новый паттерн)
- [ ] Cross-reference с SSOT_ARCHITECTURE.md (если error/loading изменения)

---

## 📚 РЕФЕРЕНСЫ

### Компоненты

- **shadcn/ui**: `src/components/ui/`
- **Дизайн-система Figma**: `/figma/src/DESIGN_SYSTEM.md`
- **Стили**: `src/app/globals.css`

### Связанные SSOT

- `docs/ssot/SSOT_ARCHITECTURE.md` — архитектура, ownership, UI State Model (§22), Error Taxonomy (§20.2)
- `docs/ssot/SSOT_DATABASE.md` — структура БД
- `docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md` — биллинг, PaywallError структура
- `docs/ssot/SSOT_CLUBS_EVENTS_ACCESS.md` — access rules, RBAC
- `docs/ssot/SSOT_API.md` — API endpoints, error responses

---

## 🔄 ИСТОРИЯ ИЗМЕНЕНИЙ

### v1.5 — 1 января 2026

**Добавлено:**
- ✅ **Neutral Informational Hint (Implicit Abort Only)** — новый канонический паттерн для implicit interruptions:
  - Компонент: `InlineInfoBanner` (informational variant)
  - Когда использовать: ТОЛЬКО implicit interruption (network drop, tab close), НИКОГДА для explicit cancel
  - Визуал: `--color-info-bg` (синий), Info icon, нейтральный тон
  - Поведение: NOT error, NOT toast, NOT blocking, NOT persistent
  - Copy intent (RU): "Действие не было завершено. Вы можете попробовать снова."
  - Forbidden variations: красный/warning фон, AlertTriangle, "Error/Failed" в тексте
- ✅ Updated Cross-References — добавлен SSOT_ARCHITECTURE.md § 26.4

### v1.4 — 1 января 2026

**Добавлено:**
- ✅ **Aborted User-Initiated Flows** — канонические UI правила для прерванных/отменённых действий:
  - User cancel ≠ error (закрытие paywall не показывает ошибку)
  - Silent return to context (форма сохраняется, нет уведомлений)
  - No "Payment cancelled" toast (toast только для success/info)
  - No countdown timers (TTL — backend concern)
  - Canonical behavior table for all cancel scenarios
  - Implementation examples (PaywallModal, CreditConfirmationModal)
  - Forbidden patterns list (no "resume payment", no blocking "processing" state)

**Cross-references added:**
- SSOT_ARCHITECTURE.md § 26 (Aborted / Incomplete Actions)
- SSOT_BILLING_SYSTEM_ANALYSIS.md § Aborted Purchase Attempts

### v1.3 — 1 января 2026

**Добавлено:**
- ✅ **System Errors (Internal / DB / Infrastructure) — UI Rules** — правила отображения системных ошибок:
  - Все системные ошибки используют PageErrorState/SectionErrorState (нет отдельного "DB error" UI)
  - Forbidden Technical Wording — запрещённые технические термины в UI
- ✅ **Canonical Error Message Intents (SSOT)** — таблица канонических интентов ошибок:
  - GENERIC_INTERNAL_ERROR, NETWORK_ERROR, TIMEOUT_ERROR, NOT_FOUND_ERROR, FORBIDDEN_ERROR, RATE_LIMITED, VALIDATION_ERROR, CONFLICT_ERROR
  - RU title/message для каждого интента
  - Правила: интент выбирается по HTTP статусу, НЕ по тексту ошибки
- ✅ **FORBIDDEN UI BEHAVIOR (Error Handling)** — запрещённые паттерны:
  - Показ raw backend messages
  - Toast для системных ошибок
  - Parsing error.message для DB keywords
  - Специальные "database error" экраны
- ✅ Audit checkpoint для compliance проверки

**Cross-references added:**
- SSOT_ARCHITECTURE.md § 20.7 (System Errors & Low-Level Failures)

### v1.2 — 1 января 2026

**Добавлено:**
- ✅ **ERROR STATES & MESSAGING (SSOT)** — канонические UI паттерны для ошибок:
  - PageErrorState, SectionErrorState, InlineErrorBanner, FormFieldError, FormSummaryError, BlockingModalError, EmptyState
  - Copy intent (RU) для каждого сценария
  - Error Taxonomy → UI Pattern mapping table (все HTTP статусы)
- ✅ **SCREEN LOADING PATTERNS (SSOT)** — стандартизированный выбор loading instruments:
  - Scenario → UI Instrument canonical mapping
  - Skeleton inventory, LoadingBar usage, Spinner patterns
  - Route navigation (`app/loading.tsx`) рекомендации
- ✅ **FORBIDDEN PATTERNS** — запрещённые паттерны error/loading
- ✅ Updated CHECKLIST с error/loading compliance items
- ✅ Updated References с canonical SSOT paths (`/docs/ssot/SSOT_*.md`)

**Cross-references added:**
- SSOT_ARCHITECTURE.md § 20.2 (Error Taxonomy — LOCKED)
- SSOT_ARCHITECTURE.md § 22.5-22.8 (UI Error Surface Model, Loading Taxonomy)

### v1.1 — 27 декабря 2024

**Добавлено:**
- ✅ LoadingBar компонент для stale-while-revalidate паттерна
- ✅ Pattern для фоновой загрузки данных (без skeleton flashing)
- ✅ Примеры использования в stats cards и events list

**Применено к:**
- EventsPageClient (stats cards + events list refetching)

### v1.0 — 27 декабря 2024

**Добавлено:**
- ✅ Production-ready паттерн модалок (Dialog/AlertDialog)
- ✅ Исправлены анимации (no translateY conflicts)
- ✅ Структура header/body/footer для всех модалок
- ✅ DialogBody компонент
- ✅ CTA паттерны
- ✅ Адаптивность mobile/desktop

**Применено к:**
- CreditConfirmationModal
- PaywallModal
- ParticipantModal
- AuthModal
- MapPreviewModal
- ConfirmDialog (AlertDialog)

**Commit:** `b9c1fe9` — refactor: исправлены все модалки

---

---

## 17. Rich Text Editor & Renderer

**Added:** 8 февраля 2026

### Компоненты

| Компонент | Файл | Назначение |
|---|---|---|
| `RichTextEditor` | `src/components/ui/rich-text-editor.tsx` | WYSIWYG-редактор (Tiptap) |
| `RichTextContent` | `src/components/ui/rich-text-content.tsx` | Санитизированный HTML-рендерер |

### RichTextEditor

- Базируется на **Tiptap** (ProseMirror)
- `'use client'` компонент
- Расширения: StarterKit (bold, italic, lists), Link, Placeholder
- Тулбар: Bold, Italic, BulletList, OrderedList, Link, Emoji
- Стилизация: rounded-xl border, соответствует дизайну `Textarea`
- Props: `value`, `onChange`, `placeholder`, `minHeight`, `disabled`, `error`, `className`

```tsx
<RichTextEditor
  value={description}
  onChange={(html) => setDescription(html)}
  placeholder="Расскажите о маршруте..."
  error={!!fieldErrors.description}
/>
```

### RichTextContent

- Принимает `html: string`
- Санитизирует через лёгкий allowlist-based санитайзер (без DOM-зависимостей, работает на Vercel)
- **Обратная совместимость**: plain text (без HTML тегов) автоматически конвертируется в `<p>` теги
- Разрешенные HTML теги: `p, br, strong, b, em, i, ul, ol, li, a, span`

```tsx
<RichTextContent html={event.description} />
```

### Хранение

- Формат: **HTML** в TEXT колонках БД (description, rules)
- Без миграции (TEXT уже поддерживает HTML)
- AI-генерация: plain text конвертируется в HTML при вставке

### Зависимости

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/pm`
- Санитизация: встроенный lightweight sanitizer (без внешних зависимостей, без jsdom)

---

**Помни:** Дизайн-система существует чтобы ускорить разработку и обеспечить консистентность UI, а не усложнить жизнь.

**Single Source of Truth = Меньше решений = Быстрее разработка.**

