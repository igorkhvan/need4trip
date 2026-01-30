# 🎨 Design System

Дизайн система Need4Trip - UI компоненты, стилизация, типография.

---

## 📋 Содержание

### 1. [Design System](./design-system.md) ⭐
Полная дизайн система:
- Цветовая палитра
- Типография
- Spacing system
- UI компоненты
- Figma integration

### 2. [Styling Rules](./styling-rules.md)
Правила стилизации компонентов:
- Input styling (unified system)
- Button variants
- Card components
- Consistent spacing
- Responsive design

### 3. Components Guide (создать)
Гайд по всем UI компонентам:
- Base components (Button, Input, etc.)
- Complex components (Modal, Select, etc.)
- Custom components (EventCard, etc.)
- Usage examples

---

## 🎨 Color Palette

### Primary Colors:
- **Orange (Brand):** `#FF6F2C`
- **Orange Dark:** `#E86223`

### Neutral Colors:
- **Text Primary:** `#111827`
- **Text Secondary:** `#6B7280`
- **Border:** `#E5E7EB`
- **Background:** `#FFFFFF`
- **Background Secondary:** `#F9FAFB`

### Semantic Colors:
- **Success:** `#10B981` (green-500)
- **Error:** `#EF4444` (red-500)
- **Warning:** `#F59E0B` (yellow-500)
- **Info:** `#3B82F6` (blue-500)

---

## 📏 Typography

### Font Family:
```css
font-family: var(--font-inter), sans-serif;
```

### Scale:
- **Hero:** 48px / 56px line-height
- **H1:** 36px / 44px
- **H2:** 24px / 32px
- **H3:** 20px / 28px
- **Body:** 16px / 24px
- **Small:** 14px / 20px
- **Tiny:** 12px / 16px

### Weights:
- **Regular:** 400
- **Medium:** 500
- **Semibold:** 600
- **Bold:** 700

---

## 📐 Spacing System

Tailwind spacing scale (4px base):

```
1  = 4px
2  = 8px
3  = 12px
4  = 16px
5  = 20px
6  = 24px
8  = 32px
10 = 40px
12 = 48px
16 = 64px
```

### Common Patterns:
- **Button padding:** `px-5 py-2.5` (20px x 10px)
- **Input padding:** `px-4 py-2` (16px x 8px)
- **Card padding:** `p-6` (24px)
- **Section spacing:** `space-y-6` (24px между элементами)

---

## 🧩 Core Components

### Button

```tsx
<Button variant="default" size="md">
  Кнопка
</Button>
```

**Variants:** default, outline, ghost, danger  
**Sizes:** sm, md, lg

### Input

```tsx
<Input 
  type="text"
  placeholder="Введите текст"
  className="unified-input"
/>
```

### Card

```tsx
<Card className="border border-[#E5E7EB] p-6 shadow-sm">
  <CardContent>...</CardContent>
</Card>
```

### Badge

```tsx
<Badge variant="default" size="md">
  Метка
</Badge>
```

**Variants:** default, success, danger, warning, secondary  
**Sizes:** sm, md, lg

---

## 📱 Responsive Design

### Breakpoints:
```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### Mobile-First Approach:
```tsx
<div className="text-base md:text-lg lg:text-xl">
  Responsive text
</div>
```

---

## 🎨 Design Tokens

### Border Radius:
```css
rounded-sm  = 2px
rounded     = 4px
rounded-md  = 6px
rounded-lg  = 8px
rounded-xl  = 12px
rounded-2xl = 16px
```

### Shadows:
```css
shadow-sm   = subtle shadow
shadow      = default shadow
shadow-md   = medium shadow
shadow-lg   = large shadow
```

### Transitions:
```css
transition-colors  = color transitions
transition-all     = all properties
duration-200       = 200ms
duration-300       = 300ms (default)
```

---

## 🖼️ Figma Integration

### Figma Design System:
Все компоненты доступны в Figma:
- Auto-layout components
- Variants для всех состояний
- Design tokens синхронизированы с Tailwind

### Экспорт из Figma:
1. Используй Auto-layout
2. Экспортируй как SVG (для иконок)
3. Копируй стили в Tailwind классы

---

## ✨ Best Practices

### 1. Consistent Spacing
```tsx
// ✅ Good
<div className="space-y-6">
  <Card className="p-6">...</Card>
  <Card className="p-6">...</Card>
</div>

// ❌ Bad
<div className="space-y-3">
  <Card className="p-4">...</Card>
  <Card className="p-8">...</Card>
</div>
```

### 2. Semantic Colors
```tsx
// ✅ Good
<Badge variant="success">Активна</Badge>
<Badge variant="danger">Истекла</Badge>

// ❌ Bad
<Badge className="bg-green-500">Активна</Badge>
<Badge className="bg-red-500">Истекла</Badge>
```

### 3. Accessibility
```tsx
// ✅ Good
<button 
  aria-label="Закрыть"
  className="sr-only"
>
  <X className="h-4 w-4" />
  <span className="sr-only">Закрыть</span>
</button>

// ❌ Bad
<button>
  <X className="h-4 w-4" />
</button>
```

---

## 📚 Related Docs

- **[Design System](./design-system.md)** - Полная система
- **[Styling Rules](./styling-rules.md)** - Правила стилизации
- **[Figma Files](../../figma/)** - Дизайн файлы

---

**Last Updated:** 16 декабря 2024
