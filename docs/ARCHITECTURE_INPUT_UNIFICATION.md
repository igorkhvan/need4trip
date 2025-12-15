# 🏗️ Архитектура унификации Input элементов

## Дата: 15 декабря 2025

---

## 🎯 Цель

Создать единую, консистентную систему input элементов без дублирования кода и с гарантией единообразия.

---

## ⚠️ Текущие проблемы

### 1. Дублирование кода
```tsx
// Проблема: одни и те же стили повторяются везде
<input className="h-12 rounded-xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-[15px] placeholder:text-[#6B7280] transition-colors hover:border-[#D1D5DB] focus:border-[var(--color-primary)] focus:outline-none" />
```

### 2. Несогласованность
- Разные цвета placeholder (#6B7280 vs #9CA3AF)
- Разные способы центрирования иконок (top-1/2 vs top-3.5)
- Разные подходы (нативные vs компоненты)

### 3. Сложность поддержки
- Изменения нужно делать в 10+ местах
- Легко пропустить файл
- Сложно гарантировать консистентность

---

## ✅ АРХИТЕКТУРНОЕ РЕШЕНИЕ

### Принцип: **Композиция компонентов + CSS переменные**

```
┌─────────────────────────────────────┐
│   1. CSS Variables (globals.css)   │  ← Единый источник цветов
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   2. Base Components (ui/)          │  ← Базовые блоки
│   - Input, Textarea, Select         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   3. Composed Components (ui/)      │  ← Специализированные
│   - SearchInput, PasswordInput      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   4. Page/Feature Components        │  ← Использование
└─────────────────────────────────────┘
```

---

## 📁 Структура компонентов

### Уровень 1: CSS переменные

**File: `src/app/globals.css`**

```css
:root {
  /* === TEXT COLORS === */
  --color-text-primary: #111827;     /* Основной текст */
  --color-text-secondary: #6B7280;   /* Вторичный текст */
  --color-text-placeholder: #6B7280; /* Placeholder */
  --color-text-muted: #9CA3AF;       /* Приглушенный */
  --color-text-disabled: #D1D5DB;    /* Отключен */
  
  /* === BORDER COLORS === */
  --color-border-default: #E5E7EB;   /* Обычная граница */
  --color-border-hover: #D1D5DB;     /* При наведении */
  --color-border-focus: #FF6F2C;     /* При фокусе */
  --color-border-error: #EF4444;     /* Ошибка */
  
  /* === BACKGROUND COLORS === */
  --color-bg-input: #FFFFFF;         /* Фон input */
  --color-bg-disabled: #F9FAFB;      /* Фон disabled */
  
  /* === ICON COLORS === */
  --color-icon-default: #6B7280;     /* Обычная иконка */
  --color-icon-muted: #9CA3AF;       /* Приглушенная */
}
```

**Использование:**
```tsx
className="text-[var(--color-text-placeholder)]"
className="border-[var(--color-border-default)]"
```

---

### Уровень 2: Базовые компоненты

#### 2.1 Input (уже есть ✅)

**File: `src/components/ui/input.tsx`**

```tsx
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base
          "flex h-12 w-full rounded-xl bg-white px-4 text-[15px]",
          "text-[var(--color-text-primary)]",
          
          // Border
          "border border-[var(--color-border-default)]",
          "hover:border-[var(--color-border-hover)]",
          "focus:border-[var(--color-border-focus)] focus:outline-none",
          
          // Transition
          "transition-colors",
          
          // Placeholder
          "placeholder:text-[var(--color-text-placeholder)]",
          
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          "disabled:bg-[var(--color-bg-disabled)]",
          
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
```

**API:**
```tsx
<Input 
  type="text"
  placeholder="Введите текст"
  value={value}
  onChange={handleChange}
/>
```

---

#### 2.2 Textarea (уже есть ✅)

**File: `src/components/ui/textarea.tsx`**

Аналогично Input, но для многострочного текста.

---

#### 2.3 Select (уже есть ✅)

**File: `src/components/ui/select.tsx`**

Использует Radix UI + наши стили.

---

### Уровень 3: Композитные компоненты

#### 3.1 SearchInput (СОЗДАТЬ)

**File: `src/components/ui/search-input.tsx`**

```tsx
"use client";

import { Search } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  containerClassName?: string;
}

/**
 * SearchInput - Input with search icon
 * 
 * @example
 * <SearchInput 
 *   placeholder="Поиск..."
 *   value={search}
 *   onChange={(e) => setSearch(e.target.value)}
 * />
 */
export function SearchInput({
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Search 
        className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[var(--color-icon-default)]" 
        aria-hidden="true"
      />
      <Input
        type="search"
        className={cn("pl-12", className)}
        {...props}
      />
    </div>
  );
}
```

**API:**
```tsx
// Простое использование
<SearchInput placeholder="Поиск клубов..." />

// С обработчиком
<SearchInput 
  placeholder="Поиск..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
/>

// С кастомными стилями контейнера
<SearchInput 
  containerClassName="max-w-md"
  placeholder="Поиск..."
/>
```

---

#### 3.2 PasswordInput (БУДУЩЕЕ)

**File: `src/components/ui/password-input.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  containerClassName?: string;
}

/**
 * PasswordInput - Input with toggle visibility
 */
export function PasswordInput({
  className,
  containerClassName,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={cn("relative", containerClassName)}>
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("pr-12", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1 h-10 w-10 p-0"
        onClick={() => setShowPassword(!showPassword)}
        aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 text-[var(--color-icon-default)]" />
        ) : (
          <Eye className="h-4 w-4 text-[var(--color-icon-default)]" />
        )}
      </Button>
    </div>
  );
}
```

---

#### 3.3 IconInput (БУДУЩЕЕ)

**File: `src/components/ui/icon-input.tsx`**

```tsx
"use client";

import { type LucideIcon } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface IconInputProps extends InputProps {
  icon: LucideIcon;
  iconPosition?: "left" | "right";
  containerClassName?: string;
}

/**
 * IconInput - Input with custom icon
 * 
 * @example
 * <IconInput 
 *   icon={Mail}
 *   placeholder="Email"
 * />
 */
export function IconInput({
  icon: Icon,
  iconPosition = "left",
  className,
  containerClassName,
  ...props
}: IconInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Icon 
        className={cn(
          "pointer-events-none absolute top-3.5 h-5 w-5 text-[var(--color-icon-default)]",
          iconPosition === "left" ? "left-4" : "right-4"
        )}
        aria-hidden="true"
      />
      <Input
        className={cn(
          iconPosition === "left" ? "pl-12" : "pr-12",
          className
        )}
        {...props}
      />
    </div>
  );
}
```

---

### Уровень 4: Использование в страницах

#### ❌ Было (плохо):
```tsx
// clubs/page.tsx
<form className="relative">
  <Search className="absolute left-4 top-3.5 ..." />
  <input
    type="search"
    className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-[15px] placeholder:text-[#6B7280] transition-colors hover:border-[#D1D5DB] focus:border-[var(--color-primary)] focus:outline-none"
  />
</form>
```

#### ✅ Стало (хорошо):
```tsx
// clubs/page.tsx
import { SearchInput } from "@/components/ui/search-input";

<form>
  <SearchInput 
    placeholder="Поиск клубов..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
</form>
```

---

## 📋 План миграции

### Этап 1: ✅ Унификация цветов (ГОТОВО)
- [x] Исправлены все placeholder цвета на `#6B7280`
- [x] CityAutocomplete, CurrencySelect, CityMultiSelect, CitySelect

### Этап 2: 🔄 Создание композитных компонентов (СЕЙЧАС)
- [ ] Создать SearchInput
- [ ] Заменить все нативные search input
- [ ] Убрать дублированный код

### Этап 3: 🔜 CSS переменные (СКОРО)
- [ ] Добавить переменные в globals.css
- [ ] Обновить все компоненты на переменные
- [ ] Убрать хардкод цветов

### Этап 4: 🔜 Дополнительные компоненты (БУДУЩЕЕ)
- [ ] PasswordInput
- [ ] IconInput
- [ ] NumberInput (с +/- кнопками)
- [ ] FileInput (с drag&drop)

---

## 🎯 Преимущества решения

### 1. ✅ Консистентность
- Все input выглядят одинаково
- Единый источник правды
- Гарантия единообразия

### 2. ✅ DRY (Don't Repeat Yourself)
- Нет дублирования кода
- Изменения в одном месте
- Меньше вероятность ошибки

### 3. ✅ Композиция
- Базовые компоненты независимы
- Композитные строятся поверх базовых
- Легко создавать новые варианты

### 4. ✅ Типизация
- TypeScript проверяет props
- Автодополнение в IDE
- Меньше ошибок

### 5. ✅ Тестируемость
- Компоненты изолированы
- Легко писать тесты
- Можно тестировать отдельно

### 6. ✅ Масштабируемость
- Легко добавлять новые компоненты
- Не ломает существующие
- Четкая структура

---

## 🚫 Антипаттерны (избегать)

### ❌ 1. Дублирование стилей
```tsx
// ПЛОХО - стили повторяются
<input className="h-12 rounded-xl border ..." />
<input className="h-12 rounded-xl border ..." />
```

### ❌ 2. Переопределение базовых стилей
```tsx
// ПЛОХО - меняет стандарты компонента
<Input className="h-10 border-2" />
```

### ❌ 3. Несогласованные цвета
```tsx
// ПЛОХО - разные цвета
placeholder:text-[#6B7280]
placeholder:text-[#9CA3AF]
```

### ❌ 4. Хардкод значений
```tsx
// ПЛОХО - хардкод
className="text-[#6B7280]"

// ХОРОШО - переменная
className="text-[var(--color-text-placeholder)]"
```

---

## ✅ Лучшие практики

### 1. Используй базовые компоненты
```tsx
// ✅ Правильно
<Input placeholder="..." />
<Textarea placeholder="..." />
```

### 2. Создавай композитные для повторяющихся паттернов
```tsx
// ✅ Правильно - если нужен search часто
<SearchInput placeholder="..." />
```

### 3. Передавай только layout/spacing через className
```tsx
// ✅ Правильно
<Input className="mb-4" />
<SearchInput containerClassName="max-w-md" />
```

### 4. Используй CSS переменные
```tsx
// ✅ Правильно
className="text-[var(--color-text-placeholder)]"
```

---

## 📚 Документация для разработчиков

### Когда создавать новый компонент?

**✅ Создавай новый композитный компонент если:**
- Паттерн повторяется 3+ раз
- Есть специфичная логика (toggle, validation)
- Улучшает читаемость кода

**❌ НЕ создавай если:**
- Используется 1-2 раза
- Можно решить через className
- Слишком специфично для одной страницы

### Примеры:

```tsx
// ✅ Создать SearchInput - используется везде
<SearchInput />

// ✅ Создать PasswordInput - специфичная логика toggle
<PasswordInput />

// ❌ НЕ создавать ProfileNameInput - слишком специфично
<Input />  // Используй базовый
```

---

## 🔄 Обратная совместимость

### Стратегия миграции:
1. **Создаем новые компоненты** - не ломаем старые
2. **Постепенно мигрируем** - файл за файлом
3. **Убираем старое** - только после полной миграции

### Пример:
```tsx
// Шаг 1: Создали SearchInput
// Старый код продолжает работать ✅

// Шаг 2: Мигрируем страницы по одной
// clubs/page.tsx: ✅ использует SearchInput
// events/page.tsx: ⏳ еще использует старый код

// Шаг 3: После миграции всех - убираем старые примеры
```

---

## 📊 Метрики успеха

### Как понять что унификация успешна?

- [ ] **0** нативных `<input>` с локальными стилями
- [ ] **100%** использование компонентов из `ui/`
- [ ] **1** цвет placeholder везде (`#6B7280`)
- [ ] **0** дублирования стилей
- [ ] **5+** секунд экономии при создании нового input

---

## 🎓 Обучение команды

### Новые разработчики должны знать:

1. **Всегда используй компоненты из `ui/`**
   - `<Input />` вместо `<input />`
   - `<Textarea />` вместо `<textarea />`

2. **Для поиска используй `<SearchInput />`**
   - Не создавай свой каждый раз

3. **Не добавляй базовые стили через className**
   - Только spacing/layout

4. **Используй CSS переменные**
   - `var(--color-text-placeholder)`

---

**Последнее обновление:** 15 декабря 2025  
**Статус:** 🟢 Рекомендовано к применению  
**Автор:** AI Assistant
