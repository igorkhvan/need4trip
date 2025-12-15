# 📋 План унификации Input элементов

## Дата: 15 декабря 2025

---

## ⚠️ ПРОБЛЕМА: Неполная унификация

### Текущая ситуация:

В приложении **используются два подхода** к созданию полей ввода:

#### 1. ✅ **Правильный подход** - Унифицированные компоненты:
```tsx
import { Input } from "@/components/ui/input";

<Input 
  type="text"
  placeholder="Введите текст"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

**Преимущества:**
- ✅ Все стили встроены в компонент
- ✅ Консистентный внешний вид
- ✅ Легкая поддержка
- ✅ Изменения в одном месте

**Где используется:**
- ✅ `src/app/profile/page.tsx` - полностью на компонентах

---

#### 2. ❌ **Неправильный подход** - Нативные элементы с локальными стилями:
```tsx
<input 
  type="text"
  placeholder="Поиск..."
  className="h-12 rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] ..."
/>
```

**Проблемы:**
- ❌ Стили дублируются в каждом месте
- ❌ Легко сделать ошибку/забыть стиль
- ❌ Сложно поддерживать
- ❌ Изменения нужно делать в нескольких местах

**Где используется:**
- ❌ `src/app/clubs/page.tsx` - search input (строка 144)
- ❌ `src/components/events/events-grid.tsx` - search input (строка 276)
- ⚠️ `src/components/events/event-form.tsx` - смесь
- ⚠️ `src/components/clubs/club-form.tsx` - смесь

---

## 📊 Аудит текущего состояния

### Страницы и компоненты:

| Файл | Нативные `<input>` | Компонент `<Input>` | Статус |
|------|-------------------|---------------------|--------|
| **src/app/profile/page.tsx** | 0 | ✅ Все | ✅ Идеально |
| **src/app/clubs/page.tsx** | ❌ 1 (search) | 0 | ❌ Нужна замена |
| **src/components/events/events-grid.tsx** | ❌ 0 (был заменен на Input с className) | 1 | ⚠️ Частично |
| **src/components/events/event-form.tsx** | ❌ 0 (были, убрали классы) | ✅ Много | ⚠️ Работает, но нужна проверка |
| **src/components/clubs/club-form.tsx** | ❌ 0 (были, убрали классы) | ✅ Все | ⚠️ Работает, но нужна проверка |

---

## 🎯 ПЛАН ДЕЙСТВИЙ

### Этап 1: Заменить нативные `<input>` на `<Input>`

#### 1.1 **src/app/clubs/page.tsx** (строка 144)

**Было:**
```tsx
<input
  type="search"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Поиск клубов..."
  className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-[15px] placeholder:text-[#6B7280] transition-colors hover:border-[#D1D5DB] focus:border-[var(--color-primary)] focus:outline-none"
  disabled={!!selectedCityId}
/>
```

**Должно быть:**
```tsx
import { Input } from "@/components/ui/input";

<Input
  type="search"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Поиск клубов..."
  className="pl-12"  // Только для иконки слева
  disabled={!!selectedCityId}
/>
```

---

#### 1.2 **src/components/events/events-grid.tsx** (строка 276)

**Текущее состояние:**
```tsx
<Input
  type="text"
  placeholder="Поиск по названию, организатору или месту..."
  value={searchQuery}
  onChange={(e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }}
  className="h-12 rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] focus:border-[var(--color-primary)] focus:outline-none transition-colors pl-12 text-[15px] placeholder:text-[#6B7280]"
/>
```

**Должно быть:**
```tsx
<Input
  type="text"
  placeholder="Поиск по названию, организатору или месту..."
  value={searchQuery}
  onChange={(e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }}
  className="pl-12"  // Только для иконки слева
/>
```

**Проблема:** Добавлены избыточные стили в `className`, которые уже есть в компоненте `Input`.

---

### Этап 2: Убрать избыточные `className` из `<Input>`

#### 2.1 Найти все случаи:
```bash
grep -r "Input.*className.*h-12\|Input.*className.*border\|Input.*className.*rounded-xl" src/
```

#### 2.2 Убрать избыточные стили:

**❌ НЕПРАВИЛЬНО:**
```tsx
<Input className="h-12 rounded-xl border border-[#E5E7EB] text-[15px]" />
```

**✅ ПРАВИЛЬНО:**
```tsx
<Input />  // Или только spacing/layout утилиты
<Input className="pl-12" />  // Только для иконки
<Input className="mb-4" />  // Только margin
```

---

### Этап 3: Создать специализированные компоненты

#### 3.1 **SearchInput** - компонент для поиска с иконкой

**Файл:** `src/components/ui/search-input.tsx`

```tsx
"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function SearchInput({
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
      <Input
        type="search"
        className={cn("pl-12", className)}
        {...props}
      />
    </div>
  );
}
```

#### 3.2 Использование:

**Было (в clubs/page.tsx):**
```tsx
<form onSubmit={handleSearchSubmit} className="relative md:col-span-6">
  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
  <input
    type="search"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Поиск клубов..."
    className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-white pl-12 pr-4 text-[15px] placeholder:text-[#6B7280] transition-colors hover:border-[#D1D5DB] focus:border-[var(--color-primary)] focus:outline-none"
    disabled={!!selectedCityId}
  />
</form>
```

**Станет:**
```tsx
import { SearchInput } from "@/components/ui/search-input";

<form onSubmit={handleSearchSubmit} className="md:col-span-6">
  <SearchInput
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Поиск клубов..."
    disabled={!!selectedCityId}
  />
</form>
```

---

## 📋 Чеклист задач

### Задача 1: Создать SearchInput компонент
- [ ] Создать `src/components/ui/search-input.tsx`
- [ ] Добавить экспорт в `src/components/ui/index.ts` (если есть)

### Задача 2: Заменить нативные input на SearchInput
- [ ] `src/app/clubs/page.tsx` - строка 142-152
- [ ] `src/components/events/events-grid.tsx` - строка 273-287

### Задача 3: Убрать избыточные className из Input
- [ ] Проверить `src/components/events/events-grid.tsx`
- [ ] Проверить все файлы с `grep -r "Input.*className.*h-12" src/`

### Задача 4: Документировать паттерны
- [ ] Добавить примеры в `INPUT_STYLING_RULES.md`
- [ ] Создать guidelines для SearchInput

---

## 🎨 Стандарты использования

### ✅ DO - Правильно:

```tsx
// 1. Простой Input без стилей
<Input 
  type="text"
  placeholder="Введите текст"
  value={value}
  onChange={handleChange}
/>

// 2. Input с только spacing/layout
<Input 
  placeholder="Email"
  className="mb-4"
/>

// 3. SearchInput для поиска
<SearchInput 
  placeholder="Поиск..."
  value={search}
  onChange={handleSearch}
/>

// 4. Input с error состоянием через className (если нужно)
<Input 
  placeholder="Имя"
  className={errors.name ? "border-red-500 focus:border-red-500" : ""}
/>
```

### ❌ DON'T - Неправильно:

```tsx
// ❌ 1. Нативный input вместо компонента
<input 
  type="text"
  className="h-12 rounded-xl border ..."
/>

// ❌ 2. Дублирование стилей из компонента
<Input 
  className="h-12 rounded-xl border border-[#E5E7EB] text-[15px]"
/>

// ❌ 3. Ручное добавление иконки поиска
<div className="relative">
  <Search className="absolute ..." />
  <Input className="pl-12" />
</div>
// Вместо этого используй SearchInput!

// ❌ 4. Переопределение базовых стилей
<Input 
  className="h-10 border-2"  // Меняет стандарты!
/>
```

---

## 📚 Референсы

### Документы для изучения:
1. **`INPUT_STYLING_RULES.md`** - Правила стилизации
2. **`src/components/ui/input.tsx`** - Базовый компонент
3. **`src/app/profile/page.tsx`** - Эталонное использование

### Примеры компонентов для создания:
- `SearchInput` - Поиск с иконкой (приоритет #1)
- `PasswordInput` - С toggle видимости (будущее)
- `NumberInput` - С +/- кнопками (будущее)

---

## 🚀 Следующие шаги

1. **Срочно:** Создать `SearchInput` компонент
2. **Срочно:** Заменить все нативные `<input type="search">` на `<SearchInput>`
3. **Срочно:** Убрать избыточные `className` из всех `<Input>`
4. Провести финальный аудит
5. Обновить документацию

---

## ✅ Критерии готовности

Унификация считается завершенной когда:

- [ ] Нет нативных `<input>` с локальными стилями
- [ ] Нет нативных `<textarea>` с локальными стилями
- [ ] Все `<Input>` используют только spacing/layout классы
- [ ] Создан и используется `SearchInput` компонент
- [ ] Документация обновлена

---

**Статус:** 🟡 В процессе  
**Приоритет:** 🔴 Высокий  
**Deadline:** ASAP

---

**Последнее обновление:** 15 декабря 2025
