# Need4Trip — Design System (SSOT)

**Версия:** 1.1  
**Дата обновления:** 27 декабря 2024  
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

## ✅ CHECKLIST ПЕРЕД КОММИТОМ

При изменении UI компонентов проверь:

- [ ] Компонент следует паттерну из SSOT
- [ ] Используются CSS variables для цветов
- [ ] Адаптивность (mobile first)
- [ ] Модалки используют DialogBody (если применимо)
- [ ] Анимации без translateY конфликтов
- [ ] Кнопки имеют правильные variants
- [ ] TypeScript ✅
- [ ] Build ✅
- [ ] SSOT обновлён (если добавлен новый паттерн)

---

## 📚 РЕФЕРЕНСЫ

### Компоненты

- **shadcn/ui**: `src/components/ui/`
- **Дизайн-система Figma**: `/figma/src/DESIGN_SYSTEM.md`
- **Стили**: `src/app/globals.css`

### Связанные SSOT

- `docs/ARCHITECTURE.md` — архитектура, ownership
- `docs/DATABASE.md` — структура БД
- `docs/BILLING_SYSTEM_ANALYSIS.md` — биллинг

---

## 🔄 ИСТОРИЯ ИЗМЕНЕНИЙ

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

**Помни:** Дизайн-система существует чтобы ускорить разработку и обеспечить консистентность UI, а не усложнить жизнь.

**Single Source of Truth = Меньше решений = Быстрее разработка.**

