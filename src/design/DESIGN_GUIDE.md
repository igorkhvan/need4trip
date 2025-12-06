# Need4Trip — Дизайн-гайд для разработки

## 🎨 Дизайн-система

### Цветовая палитра

**Primary (Оранжевый):**
- `--color-primary: #FF6F2C` — основной бренд-цвет
- `--color-primary-hover: #E86223` — hover состояние
- `--color-primary-light: #FFF4EF` — светлый фон для акцентов
- `--color-primary-bg: #FFF4EF` — фон для бэджей/иконок

**Background:**
- `--color-bg: #FFFFFF` — основной фон
- `--color-bg-subtle: #F7F7F8` — вторичный фон (карточки, секции)
- `--color-bg-elevated: #FAFAFA` — приподнятые элементы

**Borders & Shadows:**
- `--color-border: #E5E7EB` — основные границы
- `--color-border-light: #F3F4F6` — светлые границы
- `--color-shadow: rgba(0, 0, 0, 0.06)` — мягкая тень
- `--color-shadow-md: rgba(0, 0, 0, 0.1)` — средняя тень
- `--color-shadow-lg: rgba(0, 0, 0, 0.15)` — сильная тень

**Text:**
- `--color-text-main: #111827` — основной текст (заголовки)
- `--color-text-secondary: #374151` — вторичный текст (параграфы)
- `--color-text-muted: #6B7280` — приглушённый текст (метки, подписи)

**Status:**
- `--color-success: #22C55E` — успех/зелёный
- `--color-success-bg: #F0FDF4` — фон
- `--color-success-text: #16A34A` — текст
- `--color-warning: #FBBF24` — предупреждение/жёлтый
- `--color-warning-bg: #FFFBEB` — фон
- `--color-warning-text: #D97706` — текст
- `--color-danger: #EF4444` — ошибка/красный
- `--color-danger-bg: #FEF2F2` — фон
- `--color-danger-text: #DC2626` — текст

### Типографика

**Шрифт:** Inter (Google Fonts)
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

**Размеры заголовков:**
- `h1`: 48px / 700 / line-height: 1.15 / letter-spacing: -0.02em
  - Mobile: 36px / line-height: 1.2
- `h2`: 36px / 700 / line-height: 1.25 / letter-spacing: -0.01em
  - Mobile: 28px / line-height: 1.3
- `h3`: 24px / 600 / line-height: 1.35
  - Mobile: 20px
- `h4`: 20px / 600 / line-height: 1.4

**Основной текст:**
- `body`: 16px / 400 / line-height: 1.6
- `p`: 16px / line-height: 1.6 / color: text-secondary
- `small`: 14px / line-height: 1.5
- `label`: 14px / 500 / line-height: 1.5

### Spacing (отступы)

```css
--space-xs: 8px
--space-sm: 12px
--space-md: 16px
--space-lg: 24px
--space-xl: 32px
--space-2xl: 48px
--space-3xl: 64px
--space-4xl: 96px
```

**Типичное использование:**
- Между элементами в карточке: 16px (`space-md`)
- Между карточками: 24px (`space-lg`)
- Отступы внутри карточек: 24px (padding)
- Отступы секций: 48px - 96px (`space-2xl` - `space-4xl`)

### Border Radius

```css
--radius-sm: 8px   — мелкие элементы (бэджи)
--radius-md: 12px  — средние элементы (инпуты, кнопки)
--radius-lg: 16px  — крупные элементы (карточки)
--radius-xl: 20px  — очень крупные элементы
```

### Container

**Максимальная ширина:** 1280px
**Горизонтальные паддинги:**
- Desktop (>1024px): 32px
- Tablet (768-1024px): 24px
- Mobile (<768px): 20px

---

## 🧩 UI Компоненты

### Button (Кнопка)

**Варианты:**

1. **Primary (основная)**
   - Background: `var(--color-primary)`
   - Text: white
   - Hover: `var(--color-primary-hover)`
   - Shadow: `0 1px 2px rgba(0, 0, 0, 0.05)`
   - Padding: `12px 24px`
   - Border-radius: `12px`
   - Height: `48px`

2. **Secondary (вторичная)**
   - Background: white
   - Border: `2px solid var(--color-border)`
   - Text: `var(--color-text-main)`
   - Hover: `border-color: var(--color-text-muted)`

3. **Ghost (прозрачная)**
   - Background: transparent
   - Text: `var(--color-text-muted)`
   - Hover: `bg: var(--color-bg-subtle)`

**Размеры:**
- Default: height 48px, padding 12px 24px
- Small: height 36px, padding 8px 16px

**Иконки:**
- Размер: 16px (w-4 h-4)
- Отступ от текста: 8px (mr-2)

### Card (Карточка)

**Стили:**
- Background: white
- Border: `1px solid var(--color-border)`
- Border-radius: `16px` (--radius-lg)
- Shadow: `0 1px 3px var(--color-shadow)`
- Padding варианты:
  - Small: 16px
  - Medium: 20px
  - Large: 24px

**Hover эффект (опционально):**
- Shadow: `0 4px 12px var(--color-shadow-md)`
- Transform: `translateY(-2px)`
- Transition: `all 0.2s ease`

### Input / Textarea / Select

**Общие стили:**
- Height: 48px (для input/select)
- Border: `2px solid var(--color-border)`
- Border-radius: `12px`
- Padding: `12px 16px`
- Font-size: 15px
- Background: white

**Focus состояние:**
- Border: `var(--color-primary)`
- Ring: `4px rgba(255, 111, 44, 0.1)` (focus ring)

**Error состояние:**
- Border: `var(--color-danger)`
- Текст ошибки: 13px, `var(--color-danger-text)`
- Фиксированная высота под ошибку: 28px (чтобы не прыгала вёрстка)

**Disabled:**
- Background: `var(--color-bg-subtle)`
- Cursor: not-allowed
- Opacity: 0.6

**Label:**
- Font-size: 14px
- Font-weight: 500
- Color: `var(--color-text-main)`
- Margin-bottom: 8px

### Modal (Модальное окно)

**Overlay:**
- Background: `rgba(0, 0, 0, 0.5)`
- z-index: 50

**Content:**
- Background: white
- Border-radius: 20px (--radius-xl)
- Padding: 32px
- Max-width: 600px (для форм), 800px (для широких)
- Shadow: `0 20px 25px -5px rgba(0, 0, 0, 0.1)`

**Header:**
- Title: h3 (24px, 600)
- Margin-bottom: 24px
- Close button: absolute top-4 right-4

**Footer (кнопки):**
- Margin-top: 32px
- Gap между кнопками: 12px
- Alignment: flex justify-end

### Table (Таблица)

**Container:**
- Border: `1px solid var(--color-border)`
- Border-radius: 12px
- Overflow: hidden

**Header:**
- Background: `var(--color-bg-subtle)`
- Font-weight: 600
- Font-size: 14px
- Padding: 16px
- Color: `var(--color-text-main)`

**Row:**
- Border-bottom: `1px solid var(--color-border-light)`
- Padding: 16px
- Font-size: 15px
- Hover: `background: var(--color-bg-subtle)`

**Actions column:**
- Alignment: right
- Gap между кнопками: 8px
- Иконки: 16px

### MultiSelect

**Container:**
- Border: `2px solid var(--color-border)`
- Border-radius: 12px
- Min-height: 48px
- Padding: 8px 12px

**Selected items (бэджи):**
- Background: `var(--color-primary-bg)`
- Color: `var(--color-primary)`
- Border-radius: 8px
- Padding: 4px 8px
- Font-size: 14px
- Gap: 8px

**Dropdown:**
- Border: `1px solid var(--color-border)`
- Border-radius: 12px
- Shadow: `0 4px 12px var(--color-shadow-md)`
- Max-height: 240px
- Overflow: auto

---

## 📄 Страницы — детальное описание

## 1. Landing (Лендинг)

### Hero Section
**Структура:**
- Background: gradient от primary-light к white
- Padding: 96px 0 (py-24)
- Layout: 2 колонки на desktop, 1 на mobile

**Левая колонка:**
- h1: "Создавайте незабываемые автопутешествия"
- Paragraph: описание (18px, text-secondary)
- Margin между h1 и p: 24px
- CTA кнопки: 2 штуки, gap 16px, margin-top 32px
  - Primary: "Начать бесплатно"
  - Secondary: "Посмотреть события"

**Правая колонка:**
- Image placeholder / иллюстрация
- На mobile скрывается или идёт под текстом

### Features Section
**Структура:**
- Padding: 96px 0
- h2: "Всё для организации поездок", центрирован
- Paragraph: подзаголовок, центрирован, margin-top 16px
- Grid: 3 колонки на desktop, 2 на tablet, 1 на mobile
- Gap: 32px
- Margin-top от заголовка: 64px

**Feature Card:**
- Card component (padding: 32px)
- Иконка: 48px, rounded-xl (12px), цветной фон, центрирована
  - Background: соответствующий status-bg цвет
  - Icon color: соответствующий status цвет
- h3: название фичи, margin-top 24px
- p: описание, margin-top 12px

**Фичи:**
1. Создание событий — иконка Calendar (primary)
2. Регистрация экипажей — иконка Users (success)
3. Гибкие настройки — иконка Car (warning)

### CTA Section
**Структура:**
- Background: primary gradient
- Padding: 80px 32px
- Border-radius: 24px
- Text align: center
- Margin: 96px auto (внутри container)

**Контент:**
- h2: белый текст
- p: белый текст, opacity 0.9, margin-top 16px
- Button: white background, primary text, margin-top 32px

### Stats Section (опционально)
**Структура:**
- Padding: 64px 0
- Grid: 4 колонки на desktop, 2 на mobile
- Gap: 32px

**Stat Item:**
- Центрирован
- Число: 48px, 700, primary цвет
- Label: 16px, text-muted, margin-top 8px

---

## 2. EventsList (Список событий)

### Header
**Структура:**
- Padding-top: 48px
- h1: "Все события"
- p: описание, margin-top 8px

### Stats Cards
**Структура:**
- Grid: 3 колонки равной ширины
- Gap: 16px
- Margin: 32px 0

**Card:**
- Padding: 24px
- Flex: space-between

**Левая часть:**
- Label: 14px, text-muted, margin-bottom 8px
- Value: 36px, line-height 1

**Правая часть:**
- Иконка: 24px (w-6 h-6)
- Фон: 48px квадрат, rounded-xl
- Background: соответствующий цвет (primary-bg, success-bg)

### Tabs Navigation
**Структура:**
- Border-bottom: 1px solid border
- Gap: 4px между табами
- Margin: 32px 0

**Tab button:**
- Padding: 12px 16px
- Font-size: 15px
- Border-bottom: 2px
- Active: border primary, text primary
- Inactive: border transparent, text-muted

### Search
**Структура:**
- Max-width: 448px (28rem)
- Margin-bottom: 32px

**Input:**
- Height: 48px
- Padding-left: 48px (место под иконку)
- Icon: absolute, left 16px, top 50%, transform translateY(-50%)
- Icon size: 20px

### Events Grid
**Структура:**
- Grid: 2 колонки на desktop, 1 на mobile
- Gap: 24px

### Event Card
**Структура:**
- Card с hover эффектом
- Padding: 24px
- Cursor: pointer

**Header (внутри карточки):**
- Flex: space-between
- Gap: 16px
- Margin-bottom: 16px

**Левая часть:**
- h3: название события, margin-bottom 8px
- Meta info: flex, gap 8px, 14px, text-muted
  - Иконка типа + label
  - Разделитель: "•"
  - Организатор

**Правая часть (Status Badge):**
- Padding: 4px 12px
- Border-radius: 999px (rounded-full)
- Font-size: 13px
- Background/Text: соответствующие status цвета

**Info Grid:**
- Grid: 2 колонки
- Gap: 16px
- Padding: 16px
- Background: bg-subtle
- Border-radius: 12px
- Margin-bottom: 16px

**Info Item:**
- Label: 13px, text-muted, margin-bottom 4px
- Value: 15px, flex items-center, gap 4px
- Icon: 16px, text-muted

**Progress Bar:**
- Label row: flex space-between, 13px, margin-bottom 8px
- Bar: height 8px, border-radius full, background bg-subtle
- Fill: height 100%, border-radius full, transition
- Цвета fill:
  - 0-49%: success (зелёный)
  - 50-79%: primary (оранжевый)
  - 80-100%: danger (красный)

---

## 3. EventDetail (Детальная страница события)

### Back Button
- Variant: ghost
- Margin-bottom: 24px
- Text: "← Назад к событиям"

### Header Section
**Layout:**
- Flex: column на mobile, row на desktop
- Gap: 16px
- Margin-bottom: 32px

**Левая часть (info):**
- h1: название события, margin-bottom 16px
- Meta Grid: 2 колонки, gap 16px, text-muted
  - Calendar + дата
  - MapPin + место
  - Users + участники
  - Car + организатор

**Правая часть (actions):**
- Flex gap: 12px
- Primary button: "Присоединиться"
- Secondary button: "Редактировать" (с иконкой Edit)

### Progress Bar
- Margin-top: 24px
- Label row: flex space-between, margin-bottom 8px
- Bar: height 8px
- Логика цветов: как в EventsList

### Layout (основной контент)
**Grid:**
- Desktop: 3 колонки (2fr + 1fr) — основной контент + сайдбар
- Mobile: 1 колонка, сайдбар внизу
- Gap: 32px

### Main Content (левая колонна)

**Description Card:**
- h4: "Описание события", margin-bottom 16px
- p: текст описания

**Rules Section:**
- Margin-top: 32px
- h4: "Правила и требования"
- Collapsible: кнопка с ChevronDown/Up иконкой
- Список: маркированный (ul/li), margin-top 16px

**Participants Table:**
- Margin-top: 32px
- h4: "Участники (12/20)", margin-bottom 24px
- Table component

**Table columns:**
1. Экипаж — название
2. Роль — текст
3. Автомобиль — модель
4. Статус — зелёный текст "Подтверждён"
5. Actions — иконки Edit/Trash, показываются только для владельца/своей записи

### Sidebar (правая колонна)

**Vehicle Requirements Card:**
- h4: "Требования к авто", margin-bottom 16px
- Иконка Car + текст: тип авто (например, "Внедорожник 4x4")
- Margin-top: 16px
- h5: "Рекомендуемые марки:", 14px, 600
- Flex wrap: бэджи с марками, gap 8px, margin-top 8px
- Badge: bg-subtle, padding 6px 12px, rounded-lg

**Organizer Card:**
- Margin-top: 24px
- h4: "Организатор", margin-bottom 16px
- Flex: gap 12px
- Avatar: 48px circle, bg-subtle, initials
- Info:
  - Name: 16px, 600
  - Label: 14px, text-muted

---

## 4. CreateEvent (Создание/редактирование события)

### Header
- h1: "Создать событие" или "Редактировать событие"
- Padding-top: 48px
- Margin-bottom: 32px

### Layout
**Desktop:** 3 колонки (2fr + 1fr) — форма + превью
**Mobile:** 1 колонка

### Form Section (левая колонна)

**Разделы формы:**

1. **Основная информация**
   - h4: заголовок раздела
   - Margin-bottom: 24px между полями
   - Input fields: название, описание (textarea), дата-время, место

2. **Настройки события**
   - Max participants: number input
   - Event type: select
   - Toggle: "Событие только для участников клуба"
   - Radio group: "Тип участия" (бесплатно/платно)

3. **Требования к автомобилям**
   - Select: тип авто
   - MultiSelect: разрешённые марки
   - Textarea: дополните��ьные требования

4. **Правила события**
   - Textarea: правила (каждое с новой строки)

5. **Дополнительные поля регистрации**
   - Динамический список полей
   - Button: "+ Добавить поле" (secondary, full width)
   - Field item: flex, gap 12px, delete button

**Кнопки внизу:**
- Margin-top: 48px
- Flex: space-between
- Кнопка "Отмена" (ghost) слева
- Кнопка "Создать событие" (primary) справа

### Preview Section (правая колонна)

**Desktop:** Sticky top-8
**Структура:**
- Card
- h4: "Предпросмотр"
- Margin-bottom: 24px
- Мини-версия карточки события как в EventsList

---

## 5. Profile (Профиль пользователя)

### Header
**Layout:**
- Flex: column на mobile, row на desktop
- Gap: 24px
- Margin-bottom: 48px

**Левая часть:**
- Avatar: 96px circle, bg-primary-light, initials
- Flex direction: column, gap 4px, margin-left 24px (desktop)
- h1: Имя пользователя
- p: Email, text-muted

**Правая часть:**
- Button: "Редактировать профиль" (secondary)
- Align-self: start

### Tabs
- Структура как в EventsList
- Табы: "Мои события", "Участвую", "Избранное"

### Content Grid
- Grid: 2 колонки на desktop, 1 на mobile
- Gap: 24px
- Event cards: как в EventsList

---

## 6. Registration Modal (Модалка регистрации)

**Size:** max-width 600px

**Header:**
- h3: "Регистрация на событие"
- Subtitle: название события, text-muted, 15px

**Form fields:**
- Role select: "Роль в событии" (Участник/Ведущий/Замыкающий)
- Crew size number: "Количество человек в экипаже"
- Car model input: "Модель автомобиля"
- Gap между полями: 24px

**Footer buttons:**
- "Отмена" (secondary)
- "Зарегистрироваться" (primary)
- Gap: 12px

---

## 🎯 Общие принципы

### Адаптивность
- Desktop first подход
- Breakpoints:
  - `lg`: 1024px
  - `md`: 768px
  - `sm`: 640px

### Анимации
- Transitions: `all 0.2s ease` или `0.3s`
- Hover эффекты: subtle (лёгкий подъём, изменение тени)
- Focus ring: всегда видим для accessibility

### Иконки (Lucide React)
- Размеры: 16px (w-4 h-4), 20px (w-5 h-5), 24px (w-6 h-6)
- Обычно: text-muted цвет
- В кнопках: текущий цвет текста

### Состояния
- Hover: изменение цвета/тени
- Active: pressed эффект
- Disabled: opacity 0.6, cursor not-allowed
- Loading: opacity + cursor wait

### Шкала заполненности (Progress Bar)
**Логика цветов:**
- 0-49%: `bg-[var(--color-success)]` — много свободных мест
- 50-79%: `bg-[var(--color-primary)]` — заполняется
- 80-100%: `bg-[var(--color-danger)]` — почти все места заняты

### Пустые состояния (Empty State)
- Центрированные
- Иконка: 64px (w-16 h-16), bg-subtle, circle/rounded
- h3: заголовок
- p: описание
- Button: action (например, "Создать первое событие")

---

## 📝 Заметки по реализации

1. **Валидация форм:**
   - Ошибки показываются под полем
   - Фиксированная высота 28px под ошибку (чтобы не прыгала вёрстка)
   - Цвет: danger-text
   - Font-size: 13px

2. **Модальные окна:**
   - Overlay: клик закрывает модалку
   - ESC: закрывает модалку
   - Анимация появления: fade + scale

3. **Таблицы:**
   - Responsive: на mobile превращаются в карточки или скроллятся горизонтально
   - Sticky header на desktop (опционально)

4. **Accessibility:**
   - Все интерактивные элементы доступны с клавиатуры
   - Focus ring всегда виден
   - Alt текст для изображений
   - ARIA labels где нужно

5. **Права доступа:**
   - Организатор события может редактировать всё
   - Участник может редактировать только свою регистрацию
   - Кнопки Edit/Delete показываются только при наличии прав

---

## 🔗 Ссылки

**Иконки:** Lucide React (https://lucide.dev/)
**Шрифт:** Inter от Google Fonts
**Tailwind CSS:** v4.0

Этот документ содержит всю информацию для воссоздания дизайна Need4Trip в любом стеке.
