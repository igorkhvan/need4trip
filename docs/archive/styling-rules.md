# 📝 Правила стилизации элементов ввода

## Дата: 15 декабря 2025

---

## ⚠️ ВАЖНО: Запрет локальных стилей

**Все стили должны быть встроены в компоненты!**

❌ **НЕЛЬЗЯ:**
```tsx
<Input className="border-2 focus:ring-4 focus:ring-orange-500/20" />
<Button variant="outline" className="border-2 focus:ring-4" />
<Textarea className="border-2" />
```

✅ **ПРАВИЛЬНО:**
```tsx
<Input />  // Все стили уже внутри компонента
<Button variant="outline" />  // Без локальных переопределений
<Textarea />  // Стандартные стили встроены
```

---

## 🎨 Единый стандарт для всех элементов ввода

### Общие принципы:

| Параметр | Значение | Комментарий |
|----------|----------|-------------|
| **Border толщина** | 1px (`border`) | ❌ НЕ `border-2` |
| **Border цвет (default)** | `border-[#E5E7EB]` | Светло-серый |
| **Border цвет (hover)** | `hover:border-[#D1D5DB]` | Чуть темнее |
| **Border цвет (focus)** | `focus:border-[var(--color-primary)]` | Оранжевый |
| **Focus ring** | ❌ **НЕТ** | Убрать `focus:ring-*` |
| **Focus ring offset** | ❌ **НЕТ** | Убрать `ring-offset-*` |
| **Transition** | `transition-colors` | Плавная смена цвета |
| **Высота** | `h-12` (48px) | Стандарт |
| **Радиус** | `rounded-xl` (12px) | Стандарт |
| **Шрифт** | `text-[15px]` | Стандарт |
| **Placeholder** | `placeholder:text-[#6B7280]` | Серый |

---

## 📦 Компоненты и их стили

### 1. Input (`src/components/ui/input.tsx`)

```tsx
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-12 w-full rounded-xl bg-white px-4 text-[15px] text-[#1F2937]",
          // Border - thin and subtle (1px)
          "border border-[#E5E7EB]",
          // Hover state
          "hover:border-[#D1D5DB]",
          // Focus state - orange border only, NO ring
          "focus:border-[var(--color-primary)] focus:outline-none",
          // Transition
          "transition-colors",
          // Placeholder
          "placeholder:text-[#6B7280]",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F9FAFB]",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
```

**Использование:**
```tsx
<Input 
  type="text"
  placeholder="Введите текст"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

---

### 2. Textarea (`src/components/ui/textarea.tsx`)

```tsx
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles
          "flex min-h-[96px] w-full rounded-xl bg-white px-4 py-3 text-[15px] text-[#1F2937]",
          // Border - thin and subtle
          "border border-[#E5E7EB]",
          // Hover state
          "hover:border-[#D1D5DB]",
          // Focus state - orange border only, no ring
          "focus:border-[var(--color-primary)] focus:outline-none",
          // Transition
          "transition-colors",
          // Placeholder
          "placeholder:text-[#6B7280]",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F9FAFB]",
          // Resize
          "resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
```

**Использование:**
```tsx
<Textarea 
  rows={3}
  placeholder="Расскажите о себе"
  value={bio}
  onChange={(e) => setBio(e.target.value)}
/>
```

---

### 3. Select (`src/components/ui/select.tsx`)

**SelectTrigger обновлен:**
```tsx
const SelectTrigger = React.forwardRef<...>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
      className={cn(
        // Base styles
        "flex h-12 w-full items-center justify-between rounded-xl bg-white px-4 text-[15px] text-[#1F2937]",
        // Border - thin and subtle
        "border border-[#E5E7EB]",
        // Hover state
        "hover:border-[#D1D5DB]",
        // Focus state - orange border only, no ring
        "focus:border-[var(--color-primary)] focus:outline-none",
        // Transition
        "transition-colors",
        // Placeholder
        "placeholder:text-[#6B7280]",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F9FAFB]",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
);
```

**Использование:**
```tsx
<Select value={value} onValueChange={onChange}>
  <SelectTrigger>
    <SelectValue placeholder="Выберите опцию" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Опция 1</SelectItem>
    <SelectItem value="option2">Опция 2</SelectItem>
  </SelectContent>
</Select>
```

---

### 4. Checkbox (`src/components/ui/checkbox.tsx`)

```tsx
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        className={cn(
          // Base styles
          "h-4 w-4 rounded",
          // Border - thin
          "border border-[#E5E7EB]",
          // Accent color (checked state)
          "accent-[var(--color-primary)]",
          // Focus - no ring, just outline
          "focus:outline-[var(--color-primary)] focus:outline-offset-0",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Transition
          "transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
```

---

### 5. Button variant="outline" (`src/components/ui/button.tsx`)

**Обновлен для соответствия стандарту:**
```tsx
outline:
  "border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F7F7F8] hover:border-[#D1D5DB] focus-visible:border-[var(--color-primary)]"
```

**Изменения:**
- ✅ `border` вместо `border-2` (1px вместо 2px)
- ✅ Добавлен `hover:border-[#D1D5DB]`
- ✅ Добавлен `focus-visible:border-[var(--color-primary)]`
- ❌ Убран `focus-visible:ring-4`

**Использование:**
```tsx
<Button variant="outline">Отмена</Button>
```

---

### 6. BrandSelect (`src/components/brand-select.tsx`)

**Обновлен Button trigger:**
```tsx
<Button
  variant="outline"
  role="combobox"
  className={cn(
    "flex h-12 w-full items-center justify-between gap-2 rounded-xl bg-background px-4 text-left shadow-none hover:bg-white font-normal",
    error ? "border-red-500 focus:border-red-500" : "",
    disabled ? "cursor-not-allowed opacity-70" : ""
  )}
>
```

**Изменения:**
- ❌ Убран `border-2`
- ❌ Убран `focus-visible:ring-red-500`
- ✅ Использует стили из `Button variant="outline"`
- ✅ `text-[15px]` для consistency

---

### 7. MultiBrandSelect (`src/components/multi-brand-select.tsx`)

**Аналогично BrandSelect:**
```tsx
<Button
  variant="outline"
  role="combobox"
  className={cn(
    "flex h-12 w-full items-center justify-between gap-2 rounded-xl bg-background px-3 text-left shadow-none hover:bg-white font-normal",
    error ? "border-red-500 focus:border-red-500" : "",
    disabled ? "cursor-not-allowed opacity-70" : ""
  )}
>
```

---

### 8. CitySelect (`src/components/ui/city-select.tsx`)

**Обновлен Button trigger:**
```tsx
<Button
  variant="outline"
  role="combobox"
  className={cn(
    "h-12 w-full justify-between rounded-xl text-left font-normal",
    error && "border-red-500 focus:border-red-500",
    !selectedCity && "text-gray-500",
    className
  )}
>
```

**Изменения:**
- ❌ Убран `border-2`
- ✅ `text-[15px]` в тексте
- ✅ Использует стили из `Button variant="outline"`

---

### 9. CurrencySelect (`src/components/ui/currency-select.tsx`)

**Обновлен Button trigger:**
```tsx
<Button
  variant="outline"
  role="combobox"
  className={cn(
    "h-12 w-full justify-between rounded-xl text-left font-normal shadow-none hover:bg-white",
    error ? "border-red-500 focus:border-red-500" : "",
    !selectedCurrency && "text-[#9CA3AF]"
  )}
>
```

---

### 10. CityMultiSelect (`src/components/ui/city-multi-select.tsx`)

**Обновлен Button trigger:**
```tsx
<Button
  variant="outline"
  role="combobox"
  className={cn(
    "h-12 w-full justify-between rounded-xl text-left font-normal shadow-none hover:bg-white",
    error ? "border-red-500 focus:border-red-500" : "",
    selectedCities.length === 0 && "text-[#9CA3AF]",
    className
  )}
>
```

---

## 🎯 Визуальные состояния (для всех компонентов)

### Default:
```
┌───────────────────────────┐
│  Placeholder text...      │  ← 1px серая рамка (#E5E7EB)
└───────────────────────────┘
```

### Hover:
```
┌───────────────────────────┐
│  Placeholder text...      │  ← 1px светло-серая (#D1D5DB)
└───────────────────────────┘
```

### Focus:
```
┌───────────────────────────┐
│  User is typing...▎       │  ← 1px оранжевая рамка
└───────────────────────────┘
```
**БЕЗ СВЕЧЕНИЯ!** ✨

### Error:
```
┌───────────────────────────┐
│  Invalid input            │  ← 1px красная рамка (#EF4444)
└───────────────────────────┘
```

### Disabled:
```
╔═══════════════════════════╗
║  Disabled field           ║  ← 50% opacity, серый фон (#F9FAFB)
╚═══════════════════════════╝
```

---

## 📋 Чеклист обновлений

### ✅ Выполнено:

- [x] **Input** - border (1px), no ring, transition-colors
- [x] **Textarea** - border (1px), no ring, resize-none
- [x] **Select (SelectTrigger)** - border (1px), no ring
- [x] **Checkbox** - border (1px), no ring
- [x] **Button variant="outline"** - border (1px), hover:border, focus:border
- [x] **BrandSelect** - убран border-2, использует Button outline
- [x] **MultiBrandSelect** - убран border-2
- [x] **CitySelect** - убран border-2
- [x] **CurrencySelect** - убран border-2
- [x] **CityMultiSelect** - убран border-2

---

## 🚫 Запрещенные практики

### 1. ❌ Локальное переопределение border:
```tsx
// ПЛОХО
<Input className="border-2" />
<Button variant="outline" className="border-2" />
<BrandSelect className="border-2" />
```

### 2. ❌ Добавление focus ring:
```tsx
// ПЛОХО
<Input className="focus:ring-4 focus:ring-orange-500/20" />
<Textarea className="focus-visible:ring-2" />
```

### 3. ❌ Изменение стандартной высоты:
```tsx
// ПЛОХО
<Input className="h-10" />  // Не 12!
<Select className="h-14" />  // Не стандарт!
```

### 4. ❌ Несогласованные стили:
```tsx
// ПЛОХО - разные подходы в разных местах
<input className="border-2 focus:ring-4" />  // Страница 1
<Input />  // Страница 2
<input className="border" />  // Страница 3
```

---

## ✅ Правильные практики

### 1. Использование компонентов без изменений:
```tsx
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandSelect } from "@/components/brand-select";

// ✅ Все стили уже встроены
<Input placeholder="Имя" value={name} onChange={...} />
<Textarea placeholder="О себе" value={bio} onChange={...} />
<BrandSelect options={brands} value={brandId} onChange={...} />
```

### 2. Добавление только layout утилит:
```tsx
// ✅ OK - только spacing/layout
<Input className="mb-4" />
<Textarea className="col-span-6" />
<BrandSelect className="w-full md:w-1/2" />

// ❌ НЕ OK - изменение базовых стилей
<Input className="border-2 h-10" />
```

### 3. Error состояния через пропсы:
```tsx
// ✅ Правильно - через props
<Input error={!!errors.email} />
<BrandSelect error={!!errors.brand} />

// ❌ Неправильно - через className
<Input className="border-red-500" />
```

---

## 🔄 Миграция существующего кода

### Как найти проблемные места:

```bash
# Поиск border-2
grep -r "border-2" src/

# Поиск focus:ring
grep -r "focus:ring" src/

# Поиск focus-visible:ring
grep -r "focus-visible:ring" src/
```

### Шаблоны замены:

| Было | Стало |
|------|-------|
| `border-2 border-[#E5E7EB]` | (убрать, уже в компоненте) |
| `focus:ring-4 focus:ring-orange-500/20` | (убрать, не нужно) |
| `focus-visible:ring-2` | (убрать, не нужно) |
| `text-sm` | `text-[15px]` (для consistency) |

---

## 📚 Ссылки на компоненты

| Компонент | Файл |
|-----------|------|
| **Input** | `/src/components/ui/input.tsx` |
| **Textarea** | `/src/components/ui/textarea.tsx` |
| **Select** | `/src/components/ui/select.tsx` |
| **Checkbox** | `/src/components/ui/checkbox.tsx` |
| **Button** | `/src/components/ui/button.tsx` |
| **BrandSelect** | `/src/components/brand-select.tsx` |
| **MultiBrandSelect** | `/src/components/multi-brand-select.tsx` |
| **CitySelect** | `/src/components/ui/city-select.tsx` |
| **CurrencySelect** | `/src/components/ui/currency-select.tsx` |
| **CityMultiSelect** | `/src/components/ui/city-multi-select.tsx` |

---

## 🎨 Философия дизайна

### Ключевые принципы:

1. **Минимализм**
   - Меньше эффектов = меньше отвлечений
   - Focus ring не нужен, достаточно цветной границы

2. **Консистентность**
   - Все input-like элементы выглядят одинаково
   - Единый стандарт встроен в компоненты

3. **DRY (Don't Repeat Yourself)**
   - Стили определены один раз
   - Нет дублирования в приложении

4. **Производительность**
   - Меньше CSS = быстрее рендер
   - Нет box-shadow (ring) = меньше repaint

5. **Accessibility**
   - Focus состояние всегда видно
   - Достаточный контраст
   - Keyboard navigation работает

---

## ✅ Чеклист для code review

При добавлении новых форм проверь:

- [ ] Используются компоненты из `@/components/ui/*`
- [ ] Нет локальных `border-2` стилей
- [ ] Нет `focus:ring-*` или `focus-visible:ring-*`
- [ ] Все input'ы высотой `h-12` (48px)
- [ ] Шрифт `text-[15px]` для текста
- [ ] Placeholder `text-[#6B7280]`
- [ ] Border цвета: default `#E5E7EB`, hover `#D1D5DB`, focus `var(--color-primary)`
- [ ] Используется `transition-colors`
- [ ] Error состояния через props, не className

---

## 📊 Статистика изменений

### Обновлено компонентов: 10

| Компонент | Изменения |
|-----------|-----------|
| Input | ✅ border, no ring, transition |
| Textarea | ✅ border, no ring, resize-none |
| Select | ✅ border, no ring |
| Checkbox | ✅ border, no ring, outline |
| Button outline | ✅ border, hover:border, focus:border |
| BrandSelect | ✅ убран border-2, text-[15px] |
| MultiBrandSelect | ✅ убран border-2, text-[15px] |
| CitySelect | ✅ убран border-2, text-[15px] |
| CurrencySelect | ✅ убран border-2 |
| CityMultiSelect | ✅ убран border-2, text-[15px] |

---

**Последнее обновление:** 15 декабря 2025  
**Статус:** ✅ Стандарт утвержден и применен ко всем компонентам  
**Обязательно к применению:** Да
