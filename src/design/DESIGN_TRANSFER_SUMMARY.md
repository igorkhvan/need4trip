# 🎨 Need4Trip — Полный комплект для переноса дизайна

## 📦 Что готово

### 1. **Документация дизайн-системы** ✅
Три полных документа с исчерпывающей информацией:

#### `/DESIGN_GUIDE.md`
- Полная цветовая палитра с hex-кодами
- Типографика (шрифт Inter, размеры, веса, line-heights)
- Spacing система (отступы 8-96px)
- Border radius (8-20px)
- Детальное описание всех 6 страниц
- Спецификации всех UI компонентов
- Логика шкалы заполненности (зелёный→оранжевый→красный)
- Responsive breakpoints

#### `/COMPONENTS_SPEC.md`
- ASCII-диаграммы компонентов
- Точные размеры в пикселях
- Состояния (normal, hover, focus, disabled, error)
- Layout patterns (Grid, Flex, Container)
- Анимации и transitions
- Visual hierarchy

#### `/CODE_EXAMPLES.md`
- Готовые примеры React + Tailwind кода
- Копипаста CSS переменных
- Все основные компоненты с кодом
- Responsive patterns
- Utility helpers
- Чек-лист для старта

### 2. **Design Showcase (живая витрина)** ✅
Полностью функциональная страница с демонстрацией всех компонентов:

**Путь:** `/components/pages/DesignShowcase.tsx`
**Доступ:** Кнопка на странице EventsList

**Что включено:**
- ✅ Кнопки (Primary/Secondary/Ghost + все состояния)
- ✅ Поля ввода (Normal/Error/Disabled/WithIcon)
- ✅ Textarea
- ✅ Select (с иконкой)
- ✅ Progress Bars (все пороги 15%-95%)
- ✅ Status Badges (все варианты)
- ✅ Cards (базовые + hover + stats)
- ✅ Event Cards (полные примеры с 60% и 92%)
- ✅ Table (с hover и conditional actions)
- ✅ Modal (с формой)
- ✅ Empty State
- ✅ Navigation Tabs
- ✅ MultiSelect
- ✅ Icons Grid (Lucide React)
- ✅ Typography showcase
- ✅ Color Palette

### 3. **Гайд по скриншотам** ✅
**Путь:** `/SCREENSHOTS_GUIDE.md`

Детальная инструкция:
- Список всех необходимых скриншотов
- Приоритизация (Top 5 must-have)
- Инструкции по съёмке hover эффектов
- Рекомендуемые размеры и форматы
- Чек-лист перед отправкой
- Готовый текст для Codex

---

## 🚀 Как использовать

### Для вас (Design Handoff):

**Шаг 1: Откройте Design Showcase**
```
1. Запустите приложение
2. Перейдите на страницу "Все события"
3. Нажмите оранжевую кнопку "Открыть Showcase"
4. ИЛИ напрямую: onNavigate('design-showcase')
```

**Шаг 2: Сделайте скриншоты**
```
Следуйте инструкциям в SCREENSHOTS_GUIDE.md
Приоритет: Progress Bars, Event Cards, Inputs, Buttons, Modal
```

**Шаг 3: Передайте в Codex**
```
Отправьте:
1. DESIGN_GUIDE.md
2. COMPONENTS_SPEC.md  
3. CODE_EXAMPLES.md
4. Скриншоты из Showcase
5. Готовый текст из SCREENSHOTS_GUIDE.md
```

### Для Codex (Implementation):

**Что получит Codex:**
```
✅ Полная дизайн-система (цвета, шрифты, spacing)
✅ Спецификации компонентов (размеры, состояния)
✅ Примеры кода (React + Tailwind)
✅ Скриншоты всех компонентов
✅ Логика цветов Progress Bar
✅ Adaptive/Responsive patterns
```

**Что Codex должен реализовать:**
```
1. Landing (Hero + Features + CTA)
2. EventsList (Tabs + Search + Grid событий)
3. EventDetail (Header + Progress + Content+Sidebar + Table)
4. CreateEvent (Form + Preview)
5. Profile (Avatar + Tabs + Events)
6. Модалки регистрации
```

---

## 🎯 Ключевые фичи дизайна

### Primary Color: #FF6F2C (оранжевый) 🟠
Используется везде:
- Кнопки Primary
- Focus ring (rgba(255,111,44,0.1))
- Active tab underline
- Icons (некоторые)
- Progress bar (50-79%)
- MultiSelect badges background

### Progress Bar Logic (критично!)
```
0-49%:   🟢 #22C55E (success) — много мест
50-79%:  🟠 #FF6F2C (primary) — заполняется
80-100%: 🔴 #EF4444 (danger) — почти все места заняты
```

### Фиксированное место под ошибки
```css
/* После каждого input/textarea/select */
.error-container {
  height: 28px; /* ВСЕГДА! */
  margin-top: 4px;
}
```
Это предотвращает прыжки вёрстки при появлении ошибок.

### Typography (Inter)
```css
h1: 48px / 700 / -0.02em
h2: 36px / 700 / -0.01em
h3: 24px / 600
h4: 20px / 600
p:  16px / 400 / 1.6

@media (max-width: 768px) {
  h1: 36px
  h2: 28px
  h3: 20px
}
```

### Spacing Scale
```css
xs:  8px   — мелкие gaps
sm:  12px  — gaps внутри элементов
md:  16px  — между элементами в карточке
lg:  24px  — между карточками
xl:  32px  — section spacing
2xl: 48px  — large sections
3xl: 64px  — page sections
4xl: 96px  — hero spacing
```

### Border Radius
```css
sm: 8px   — badges, small elements
md: 12px  — buttons, inputs, selects (ОСНОВНОЙ)
lg: 16px  — cards (ОСНОВНОЙ)
xl: 20px  — modals
```

### Transitions
```css
Fast:   0.15s — hover на мелких элементах
Normal: 0.2s  — кнопки, inputs (СТАНДАРТ)
Smooth: 0.3s  — progress bars
```

### Focus Ring (Accessibility)
```css
Primary focus:
  border: var(--color-primary)
  ring: 4px rgba(255,111,44,0.1)

Error focus:
  border: var(--color-danger)
  ring: 4px rgba(239,68,68,0.1)
```

---

## 📐 Layout Patterns

### Container
```css
max-width: 1280px
margin: 0 auto
padding: 32px (desktop) / 24px (tablet) / 20px (mobile)
```

### Grids
```css
Events Grid:    2 cols desktop, 1 mobile
Stats Grid:     3 cols desktop, 1 mobile
Features Grid:  3 cols desktop, 2 tablet, 1 mobile
Gap: 24px (standard)
```

### Content + Sidebar
```css
Desktop: grid-cols-3 (2fr + 1fr)
Mobile:  grid-cols-1
Gap: 32px
```

---

## 🎨 Компоненты — Quick Reference

### Button
```
Height: 48px (default) / 36px (small)
Padding: 12px 24px / 8px 16px
Border-radius: 12px
Font: 15px / 500
Icon: 16px (w-4 h-4), margin-right: 8px
```

### Input / Select / Textarea
```
Height: 48px (input/select)
Padding: 12px 16px
Border: 2px solid
Border-radius: 12px
Font: 15px
Focus ring: 4px
Error height: 28px (фиксировано!)
```

### Card
```
Padding: 16px (sm) / 20px (md) / 24px (lg)
Border: 1px solid
Border-radius: 16px
Shadow: 0 1px 3px (normal) / 0 4px 12px (hover)
Hover: translateY(-2px)
```

### Progress Bar
```
Height: 8px
Border-radius: full
Background: var(--color-bg-subtle)
Fill: динамический цвет (success/primary/danger)
Transition: 0.3s
```

### Modal
```
Max-width: 600px (forms) / 800px (wide)
Padding: 32px
Border-radius: 20px
Overlay: rgba(0,0,0,0.5)
Shadow: 0 20px 25px -5px rgba(0,0,0,0.1)
```

### Badge
```
Padding: 4px 12px
Border-radius: full (9999px)
Font: 13px / 500
Background: соответствующий status-bg
```

---

## 🔗 Зависимости

### Required:
```bash
npm install lucide-react
```

### CSS Setup:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Tailwind Version:
```
v4.0 (новый формат, без config файла)
```

---

## ✅ Чек-лист перед стартом

### Для вас:
- [ ] Открыл Design Showcase
- [ ] Сделал все приоритетные скриншоты
- [ ] Скриншоты в хорошем качестве (PNG, 1920px+)
- [ ] Подготовил все три .md документа
- [ ] Готов текст для Codex

### Для Codex:
- [ ] Получил DESIGN_GUIDE.md
- [ ] Получил COMPONENTS_SPEC.md
- [ ] Получил CODE_EXAMPLES.md
- [ ] Получил скриншоты Showcase
- [ ] Понял логику Progress Bar (50/80 пороги)
- [ ] Понял фиксированное место под ошибки (28px)
- [ ] Настроил CSS переменные
- [ ] Подключил Inter font
- [ ] Установил lucide-react

---

## 📤 Готовый текст для Codex

```
Привет! Вот полный Design Handoff для Need4Trip.

📋 Документация:
✅ DESIGN_GUIDE.md — дизайн-система и все страницы
✅ COMPONENTS_SPEC.md — детальные спецификации компонентов
✅ CODE_EXAMPLES.md — готовые примеры React + Tailwind

📸 Скриншоты:
✅ Design Showcase со всеми компонентами и состояниями
✅ Progress Bars (зелёный→оранжевый→красный)
✅ Event Cards (60% и 92% заполненности)
✅ Inputs (фиксированное место под ошибку 28px)
✅ Modal, Table, Badges, Tabs, и всё остальное

🎨 Ключевые детали:
- Primary: #FF6F2C (оранжевый) — везде
- Шрифт: Inter (Google Fonts)
- Border-radius: 12px inputs, 16px cards
- Focus ring: 4px rgba(255,111,44,0.1)
- Progress Bar: 0-49% зелёный, 50-79% оранжевый, 80-100% красный
- Error container: ВСЕГДА 28px высота (не прыгает вёрстка)

📱 Страницы:
1. Landing — Hero + Features + CTA
2. EventsList — Tabs + Search + Grid
3. EventDetail — Header + Progress + Content+Sidebar + Table
4. CreateEvent — Form + Preview
5. Profile — Avatar + Tabs
6. Modals — Registration forms

🎯 Важно:
- Адаптивность (mobile-first)
- Hover эффекты (подъём карточек, смена цвета)
- Transitions (0.2s standard)
- Accessibility (focus rings, keyboard nav)

Все компоненты спроектированы независимо, можно создавать по одному.
CSS переменные в DESIGN_GUIDE.md — скопируй первыми!

Вопросы?
```

---

## 🎉 Итог

У вас есть **полный комплект** для передачи дизайна:

✅ **3 документа** с исчерпывающей информацией
✅ **Живая витрина** всех компонентов (DesignShowcase.tsx)
✅ **Гайд по скриншотам** с инструкциями
✅ **Готовый текст** для Codex
✅ **Примеры кода** на React + Tailwind

**Codex сможет точно воспроизвести дизайн** без доступа к Figma Make!

---

### 🚀 Следующие шаги:

1. Откройте Design Showcase
2. Сделайте скриншоты (следуя SCREENSHOTS_GUIDE.md)
3. Отправьте Codex:
   - DESIGN_GUIDE.md
   - COMPONENTS_SPEC.md
   - CODE_EXAMPLES.md
   - Скриншоты
   - Готовый текст
4. Codex начинает имплементацию
5. Profit! 🎯

---

**Удачи с переносом дизайна в Codex!** 🚀
