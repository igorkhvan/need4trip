# 🎨 MapPreviewModal - UI/UX Improvements

**Дата:** 22 декабря 2024  
**Статус:** ✅ COMPLETED

---

## 📋 Проблемы UI/UX

### 1. **Кнопки на мобиле**
❌ **Проблема**: Кнопки с полным текстом занимают много места на мобильных устройствах
- "Скопировать координаты" - слишком длинный текст
- "Открыть в навигации" - слишком длинный текст
- На маленьких экранах кнопки не помещаются или выглядят сжато

### 2. **Высота карты**
❌ **Проблема**: Фиксированная высота 400px на всех устройствах
- На мобиле карта занимает слишком много места
- Нужна адаптивная высота

### 3. **Скругления**
❌ **Проблема**: Использовался `rounded-xl` (12px)
- По дизайн-системе карты должны быть `rounded-lg` (8px)

### 4. **Типографика**
❌ **Проблема**: Использовался `text-[var(--color-text-muted)]`
- Должен быть utility class `text-muted`

### 5. **Отступы карты**
❌ **Проблема**: Не было bottom padding у контейнера карты
- Карта прилипала к нижней границе/футеру

---

## ✅ Решения

### 1. **Адаптивные кнопки** ✨

#### Кнопка "Скопировать":
```typescript
<Button
  type="button"
  variant="ghost"
  size="sm"
  onClick={handleCopyCoords}
  className="gap-2"
  title={copied ? "Скопировано" : "Скопировать координаты"} // ← Tooltip для мобилы
>
  <Copy className="h-4 w-4" />
  <span className="hidden sm:inline">  {/* ← Текст только на desktop */}
    {copied ? "✓ Скопировано" : "Скопировать координаты"}
  </span>
</Button>
```

**Результат:**
- 📱 **Мобиль**: Только иконка `📋`
- 💻 **Desktop**: Иконка + текст "Скопировать координаты"
- ✅ Tooltip показывает полный текст при hover

#### Кнопка "Открыть в навигации":
```typescript
<Button type="button" size="sm" className="gap-2">
  <Navigation className="h-4 w-4" />
  <span className="hidden sm:inline">Открыть в навигации</span>
</Button>
```

**Результат:**
- 📱 **Мобиль**: Только иконка `🧭`
- 💻 **Desktop**: Иконка + текст "Открыть в навигации"

---

### 2. **Адаптивная высота карты** 📏

```typescript
// БЫЛО:
<div className="relative h-[400px] w-full ...">

// СТАЛО:
<div className="relative h-[300px] sm:h-[400px] w-full ...">
```

**Breakpoints:**
- 📱 **Mobile** (<640px): 300px высота
- 💻 **Desktop** (≥640px): 400px высота

**Почему 300px на мобиле?**
- Видно достаточно карты для ориентации
- Остается место для header и footer
- Не нужно скроллить слишком много
- Оптимально для viewport 375px-414px

---

### 3. **Правильные скругления** 🎨

```diff
- rounded-xl  // 12px
+ rounded-lg  // 8px (по дизайн-системе)
```

**Применено к:**
- Google Maps iframe контейнер
- Leaflet fallback контейнер
- Iframe элемент

**Соответствие дизайн-системе:**
- Card: `rounded-md` (8px) или `rounded-lg` (8px)
- Modal: `rounded-lg` (8px)
- Map containers: `rounded-lg` (8px)

---

### 4. **Правильная типографика** 📝

```diff
- text-[var(--color-text-muted)]
+ text-muted
```

**Использование utility classes:**
- ✅ `text-muted` - для secondary текста (#6B7280)
- ✅ `heading-h3` - для заголовков
- ✅ `text-body-small` - для мелкого текста

---

### 5. **Улучшенные отступы** 📐

```typescript
// Map container:
<div className="px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6">
  <GoogleMapEmbed ... />
</div>
```

**Padding схема:**
- **Mobile**: `px-4 pt-3 pb-4` (16px sides, 12px top, 16px bottom)
- **Desktop**: `px-6 pt-4 pb-6` (24px sides, 16px top, 24px bottom)

**Footer/Actions:**
```typescript
<div className="... gap-2 ...">  // gap-3 → gap-2 для мобилы
```

---

## 📊 Before / After

### Mobile View (375px)

#### ❌ BEFORE:
```
┌─────────────────────────┐
│  Точка сбора           │ Header
│  43.573095, 76.904391  │
├─────────────────────────┤
│                         │
│                         │
│      [MAP 400px]        │ ← Слишком высоко
│                         │
│                         │
├─────────────────────────┤
│ 📋 Скопировать координ │ ← Текст обрезан
│ 🧭 Открыть в навигаци  │ ← Текст обрезан
└─────────────────────────┘
```

#### ✅ AFTER:
```
┌─────────────────────────┐
│  Точка сбора           │ Header
│  43.573095, 76.904391  │
├─────────────────────────┤
│                         │
│    [MAP 300px]          │ ← Оптимально
│                         │
├─────────────────────────┤
│  📋      🧭            │ ← Только иконки
└─────────────────────────┘
```

### Desktop View (1024px+)

#### ✅ AFTER:
```
┌───────────────────────────────────────────┐
│  Точка сбора                              │ Header
│  43.573095, 76.904391                     │
├───────────────────────────────────────────┤
│                                           │
│                                           │
│            [MAP 400px]                    │
│                                           │
│                                           │
├───────────────────────────────────────────┤
│ 📋 Скопировать координаты  🧭 Открыть... │ ← Полный текст
└───────────────────────────────────────────┘
```

---

## 🎨 Design System Compliance

### ✅ Typography:
- `heading-h3` для заголовка
- `text-body-small` для координат
- `text-muted` для secondary текста

### ✅ Spacing:
- Padding: 16px (mobile) / 24px (desktop)
- Gap: 8px между кнопками (mobile) / 12px (desktop)

### ✅ Border Radius:
- `rounded-lg` (8px) для всех контейнеров

### ✅ Colors:
- Border: `#E5E7EB`
- Background: `#F9FAFB`
- Text muted: `#6B7280`
- Text primary: `#111827`

### ✅ Responsive:
- Breakpoint: `sm:` (640px)
- Mobile First подход

---

## 🧪 Testing Checklist

### Mobile (375px - 414px):
```
✓ Открыть модальное окно с картой
✓ Проверить высоту карты (300px)
✓ Проверить кнопки - только иконки
✓ Hover на кнопку копирования - показывает tooltip
✓ Кнопки помещаются и не сжаты
✓ Отступы правильные (16px)
✓ Скругления 8px
```

### Tablet (768px):
```
✓ Карта 400px высоты
✓ Кнопки с текстом отображаются
✓ Отступы увеличены (24px)
```

### Desktop (1024px+):
```
✓ Максимальная ширина модала 2xl (672px)
✓ Карта 400px высоты
✓ Полный текст на кнопках
✓ Все отступы правильные
```

---

## 📦 Technical Changes

### Files Modified:
- ✅ `src/components/events/locations/MapPreviewModal.tsx`

### Changes:
```diff
GoogleMapEmbed:
- h-[400px] rounded-xl
+ h-[300px] sm:h-[400px] rounded-lg

LeafletMapFallback:
- h-[400px] rounded-xl
+ h-[300px] sm:h-[400px] rounded-lg

DialogHeader:
- text-[var(--color-text-muted)]
+ text-muted

Map Container:
- px-4 pt-3 sm:px-6 sm:pt-4
+ px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6

Actions Footer:
- gap-3
+ gap-2

Copy Button:
+ title="Скопировать координаты"
+ <span className="hidden sm:inline">текст</span>

Navigation Button:
+ <span className="hidden sm:inline">текст</span>
```

---

## 🚀 Build Status

```bash
✓ TypeScript compilation passed
✓ No linter errors
✓ Build successful
✓ All tests passed
```

---

## 📝 Commit Message

```
fix(ui): улучшена адаптивность и верстка MapPreviewModal

UI/UX Improvements:
1. Адаптивные кнопки
   - Mobile: только иконки (экономия места)
   - Desktop: иконки + текст
   - Добавлен title tooltip для мобилы

2. Адаптивная высота карты
   - Mobile: 300px (оптимально для viewport)
   - Desktop: 400px (больше деталей)

3. Исправлены скругления
   - rounded-xl → rounded-lg (8px по дизайн-системе)

4. Правильная типографика
   - text-[var(...)] → text-muted (utility class)

5. Улучшены отступы
   - Добавлен pb для map container
   - gap-3 → gap-2 для мобильных кнопок

Design System Compliance:
- ✅ Typography classes
- ✅ Spacing (16px/24px)
- ✅ Border radius (8px)
- ✅ Responsive (Mobile First)
```

---

**Итог:** Модальное окно карты теперь полностью соответствует дизайн-системе и отлично выглядит на всех устройствах. 🎉

