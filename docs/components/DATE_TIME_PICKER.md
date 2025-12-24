# DateTimePicker Component

Современный datetime picker, следующий паттернам дизайн-системы Need4Trip и shadcn/ui.

---

## 🎯 Архитектура

### Compound Components Pattern

```
DateTimePicker (Root)
├── DateTimePickerTrigger (styled как Input)
└── DateTimePickerContent (Popover/Sheet responsive)
    ├── Calendar (month grid 7×6)
    ├── TimeSelector (scrollable list)
    └── QuickActions (Now, +1h, Clear)
```

### Layered Approach

```
DateTimeField (Form Adapter)
    ↓ converts Date ↔ string
DateTimePicker (UI Component)
    ↓ uses
Calendar + TimeSelector
    ↓ powered by
date-time utils
```

---

## 📦 Компоненты

### 1. DateTimePicker (UI Core)

**Файл:** `src/components/ui/date-time-picker.tsx`

**Controlled component** - работает с `Date | null`:

```tsx
import { DateTimePicker } from "@/components/ui/date-time-picker";

<DateTimePicker
  value={selectedDate}         // Date | null
  onChange={setSelectedDate}   // (date: Date | null) => void
  minuteStep={15}              // 5 | 10 | 15 | 30
  minDateTime={new Date()}     // optional
  maxDateTime={...}            // optional
  disabled={false}
  placeholder="Выберите дату и время"
/>
```

**Props:**
- `value?: Date | null` - выбранное значение
- `onChange?: (date: Date | null) => void` - callback при изменении
- `minuteStep?: 5 | 10 | 15 | 30` - шаг выбора минут (default: 15)
- `minDateTime?: Date` - минимальная доступная дата/время
- `maxDateTime?: Date` - максимальная доступная дата/время
- `disabled?: boolean` - disabled состояние
- `placeholder?: string` - placeholder текст
- `className?: string` - CSS класс для триггера
- `id?: string` - ID для accessibility

**Особенности:**
- ✅ **Standalone** - работает без привязки к формам
- ✅ **Responsive** - auto-switch Popover/Sheet
- ✅ **Controlled** - полный контроль через value/onChange
- ✅ **Styled** - триггер идентичен Input (48px, 12px radius)

---

### 2. Calendar (Month Grid)

**Файл:** `src/components/ui/calendar.tsx`

**Month-grid календарь** с русской локализацией:

```tsx
import { Calendar } from "@/components/ui/calendar";

<Calendar
  selected={selectedDate}
  onSelect={setSelectedDate}
  minDate={new Date()}
  maxDate={new Date(2025, 11, 31)}
  disabled={false}
/>
```

**Props:**
- `selected?: Date | null` - выбранная дата
- `onSelect?: (date: Date) => void` - callback при выборе
- `minDate?: Date` - минимальная дата
- `maxDate?: Date` - максимальная дата
- `disabled?: boolean` - disabled состояние

**UI:**
- Grid 7×6 (всегда 7 колонок, 6 рядов)
- Навигация: ◀ Декабрь 2025 ▶
- Дни недели: Пн, Вт, Ср, Чт, Пт, Сб, Вс
- Сегодня: ring-1 ring-primary
- Выбранный: bg-primary text-white
- Min-width: 280px (предотвращает схлопывание)

---

### 3. DateTimeField (Form Adapter)

**Файл:** `src/components/ui/date-time-field.tsx`

**Адаптер для форм** - конвертирует `Date ↔ string`:

```tsx
import { DateTimeField } from "@/components/ui/date-time-field";

<DateTimeField
  id="eventDateTime"
  label="Дата и время события"
  value={dateTimeString}    // "YYYY-MM-DDTHH:mm"
  onChange={setString}      // (value: string) => void
  required
  error={errors.dateTime}
  onErrorClear={() => clearError("dateTime")}
  hint="Событие должно быть в будущем"
  minDateTime={new Date()}
  minuteStep={15}
/>
```

**Props:**
- `id: string` - ID поля
- `label: string` - текст label
- `value: string` - значение в формате `"YYYY-MM-DDTHH:mm"`
- `onChange: (value: string) => void` - callback при изменении
- `required?: boolean` - обязательное поле
- `error?: string` - текст ошибки
- `onErrorClear?: () => void` - callback для очистки ошибки
- `hint?: string` - дополнительный hint
- ...все props от `DateTimePicker`

**Конвертация:**
- `parseDateTime(string)` → `Date | null`
- `serializeDateTime(Date)` → `"YYYY-MM-DDTHH:mm"`

---

## 🛠️ Утилиты

**Файл:** `src/lib/utils/date-time.ts`

### Parsing & Serialization

```tsx
import { parseDateTime, serializeDateTime } from "@/lib/utils/date-time";

// Form string → Date
const date = parseDateTime("2025-12-24T14:30"); // Date object

// Date → Form string
const str = serializeDateTime(new Date()); // "2025-12-24T14:30"
```

### Formatting

```tsx
import { formatDateTime, formatDate, formatTime } from "@/lib/utils/date-time";

formatDateTime(date);  // "24 дек 2025, 14:30"
formatDate(date);      // "24 дек 2025"
formatTime(date);      // "14:30"
```

### Time Operations

```tsx
import {
  roundMinutes,
  extractTime,
  combineDateTime,
  generateTimeSlots
} from "@/lib/utils/date-time";

// Округление минут
roundMinutes(new Date(), 15);  // 14:33 → 14:30

// Извлечение времени
extractTime(date);  // "14:30"

// Комбинирование даты и времени
combineDateTime(date, "14:30");  // Date with time set

// Генерация слотов
generateTimeSlots(15);  // [{ value: "00:00", label: "00:00" }, ...]
```

### Validation

```tsx
import { isDateInRange, isInFuture } from "@/lib/utils/date-time";

// Проверка диапазона
isDateInRange(date, minDate, maxDate);  // boolean

// Проверка будущего (с допуском)
isInFuture(date, 5);  // true если дата > now - 5 мин
```

### Quick Actions

```tsx
import { getNowRounded, addHours } from "@/lib/utils/date-time";

// Сейчас (округлённо)
getNowRounded(15);  // Date с минутами кратными 15

// +N часов
addHours(date, 1);  // Date + 1 час
```

---

## 🎨 Design System Compliance

### Триггер (как Input)

```css
height: 48px               /* h-12 */
border-radius: 12px        /* rounded-xl */
border: 1px solid var(--color-border)
hover: border-[#D1D5DB]
focus: border-[var(--color-primary)]
```

### Calendar

```css
grid: 7 columns × 6 rows   /* grid-cols-7 */
min-width: 280px           /* предотвращает схлопывание */
selected: bg-[var(--color-primary)]
today: ring-1 ring-[var(--color-border)]
```

### TimeSelector

```css
max-height: 200px          /* scrollable */
selected: bg-[var(--color-primary)]
hover: bg-[var(--color-bg-subtle)]
```

### Colors (CSS Variables)

```css
--color-primary: #FF6F2C
--color-text: #1F2937
--color-border: #E5E7EB
--color-bg-subtle: #F9FAFB
```

---

## 📱 Responsive Behavior

### Desktop (≥ 768px)

```tsx
<Popover>
  <PopoverTrigger>DateTimePicker Trigger</PopoverTrigger>
  <PopoverContent className="min-w-[320px]">
    <Calendar + TimeSelector + QuickActions />
  </PopoverContent>
</Popover>
```

### Mobile (< 768px)

```tsx
<Sheet>
  <SheetTrigger>DateTimePicker Trigger</SheetTrigger>
  <SheetContent side="bottom" className="h-[85vh]">
    <SheetTitle>Выберите дату и время</SheetTitle>
    <Calendar + TimeSelector + QuickActions />
  </SheetContent>
</Sheet>
```

**Auto-detection:**
```tsx
function useIsMobile() {
  // window.innerWidth < 768 ? Sheet : Popover
}
```

---

## 📝 Примеры использования

### В форме события (текущая интеграция)

```tsx
// src/components/events/event-form/sections/EventBasicInfoSection.tsx
import { DateTimeField } from "@/components/ui/date-time-field";

<DateTimeField
  id="dateTime"
  label="Дата и время"
  value={dateTime}                    // "YYYY-MM-DDTHH:mm"
  onChange={onDateTimeChange}
  required
  error={fieldErrors.dateTime}
  onErrorClear={() => clearFieldError("dateTime")}
  disabled={disabled}
  minuteStep={15}
  minDateTime={new Date(Date.now() - 5 * 60 * 1000)} // 5 мин назад
  placeholder="Выберите дату и время события"
/>
```

### Standalone использование

```tsx
import { DateTimePicker } from "@/components/ui/date-time-picker";

function MyComponent() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <DateTimePicker
      value={date}
      onChange={setDate}
      minuteStep={30}
      minDateTime={new Date()}
    />
  );
}
```

### Фильтры "От/До"

```tsx
function EventFilters() {
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  return (
    <div className="grid grid-cols-2 gap-4">
      <DateTimePicker
        value={dateFrom}
        onChange={setDateFrom}
        maxDateTime={dateTo ?? undefined}
        placeholder="От"
      />
      <DateTimePicker
        value={dateTo}
        onChange={setDateTo}
        minDateTime={dateFrom ?? undefined}
        placeholder="До"
      />
    </div>
  );
}
```

---

## ✅ Quality Checklist

### Функциональность
- ✅ Controlled (value + onChange)
- ✅ Responsive (Popover/Sheet)
- ✅ Min/max validation
- ✅ Minute step (5/10/15/30)
- ✅ Quick actions (Now, +1h, Clear)
- ✅ Keyboard navigation
- ✅ Clear button (X icon)

### Дизайн
- ✅ Триггер = Input (48px, 12px radius)
- ✅ CSS variables для цветов
- ✅ Grid 7 колонок (min-width)
- ✅ Typography согласована
- ✅ Spacing из design system
- ✅ Transitions 200ms

### Код
- ✅ TypeScript полная типизация
- ✅ 0 linter errors
- ✅ JSDoc комментарии
- ✅ Pure functions (utils)
- ✅ No external dependencies
- ✅ Compound components pattern

### Accessibility
- ✅ Radix primitives (A11y из коробки)
- ✅ Keyboard navigation
- ✅ Focus states visible
- ✅ ARIA attributes
- ✅ Screen reader friendly

---

## 🔄 Migration Guide

### От native datetime-local:

**Было:**
```tsx
<FormField id="dateTime" label="Дата и время" required error={...}>
  <Input
    type="datetime-local"
    value={dateTime}
    onChange={(e) => onDateTimeChange(e.target.value)}
  />
</FormField>
```

**Стало:**
```tsx
<DateTimeField
  id="dateTime"
  label="Дата и время"
  value={dateTime}
  onChange={onDateTimeChange}
  required
  error={fieldErrors.dateTime}
  onErrorClear={() => clearFieldError("dateTime")}
  minDateTime={new Date()}
  minuteStep={15}
/>
```

**Что изменилось:**
- ✅ Формат данных сохранён (`"YYYY-MM-DDTHH:mm"`)
- ✅ API контракт совместим
- ✅ Добавлены новые возможности (min/max, quick actions)
- ✅ Единый UX на всех платформах

---

## 📊 Files Structure

```
src/
├── components/ui/
│   ├── calendar.tsx              (260 строк)
│   ├── date-time-picker.tsx      (345 строк)
│   └── date-time-field.tsx       (95 строк)
│
└── lib/utils/
    └── date-time.ts              (332 строки)
```

**Total:** ~1032 строки нового кода

---

## 🚀 Performance

- ✅ `useMemo` для тяжёлых вычислений (calendarDays, timeSlots)
- ✅ `useCallback` для стабильных callbacks
- ✅ Auto-scroll к выбранному времени
- ✅ Lazy rendering (не рендерим невидимые элементы)
- ✅ No unnecessary re-renders

---

**Версия:** 1.0  
**Дата:** 24 декабря 2024  
**Commit:** `bc71faa`

