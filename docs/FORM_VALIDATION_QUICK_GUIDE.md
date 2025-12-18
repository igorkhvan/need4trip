# 📝 Form Validation Quick Guide

Быстрый гайд по использованию новой системы валидации форм.

---

## 🎯 TL;DR

```tsx
import { FormField } from "@/components/ui/form-field";
import { scrollToFirstError } from "@/lib/utils/form-validation";

// 1. Оберните поля в FormField
<FormField id="title" label="Название" required error={fieldErrors.title}>
  <Input id="title" value={title} onChange={onChange} />
</FormField>

// 2. Добавьте автоскролл при ошибках
const handleSubmit = (e) => {
  e.preventDefault();
  const issues = validate();
  if (Object.keys(issues).length) {
    setFieldErrors(issues);
    setTimeout(() => scrollToFirstError({ offset: 100 }), 100);
    return;
  }
  // submit...
};
```

**Готово!** ✅ Inline ошибки + автоскролл работают.

---

## 📦 Компоненты

### FormField

Универсальная обертка для полей с валидацией.

**Пропсы:**
- `id` (required) - уникальный идентификатор поля
- `label` - текст метки
- `required` - показать звездочку `*`
- `error` - текст ошибки (если есть)
- `hint` - подсказка (всегда видна)

**Пример:**
```tsx
<FormField
  id="email"
  label="Email"
  required
  error={errors.email}
  hint="Мы не отправляем спам"
>
  <Input type="email" id="email" {...} />
</FormField>
```

### FieldCard

Карточка для динамических полей (списки).

**Пропсы:**
- `index` - номер для бейджа
- `isLocked` - заблокировано ли поле
- `isFirst` - первый элемент (нельзя удалить)
- `onDelete` - колбэк удаления
- `variant` - `"white"` (с тенью) или `"subtle"` (серый фон)

**Пример:**
```tsx
<FieldCard
  index={idx + 1}
  isLocked={lockedIds.includes(item.id)}
  onDelete={() => removeItem(item.id)}
  variant="subtle"
>
  <FormField id="name" label="Название" error={errors.name}>
    <Input {...} />
  </FormField>
</FieldCard>
```

---

## 🔧 Утилиты

### scrollToFirstError

Прокручивает к первой ошибке и фокусирует поле.

**Использование:**
```tsx
import { scrollToFirstError } from "@/lib/utils/form-validation";

// В handleSubmit после валидации
if (hasErrors) {
  setTimeout(() => {
    scrollToFirstError({ 
      offset: 100,        // отступ сверху (для header)
      behavior: 'smooth'  // плавная прокрутка
    });
  }, 100); // delay для обновления DOM
}
```

### clearFieldError

Очистить ошибку конкретного поля.

```tsx
import { clearFieldError } from "@/lib/utils/form-validation";

const handleChange = (field, value) => {
  setValue(value);
  setErrors(prev => clearFieldError(prev, field));
};
```

---

## 🎨 Стилизация ошибок

### Красная рамка у Input

```tsx
<Input
  className={error ? "border-red-500 focus:border-red-500" : ""}
  {...}
/>
```

### Красная рамка у Select

```tsx
<CityAutocomplete
  error={!!errors.cityId}  // передать boolean
  {...}
/>
```

---

## ✨ Примеры

### Простая форма

```tsx
export function SimpleForm() {
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const issues: Record<string, string> = {};
    if (!name.trim()) issues.name = "Имя обязательно";
    
    if (Object.keys(issues).length) {
      setErrors(issues);
      setTimeout(() => scrollToFirstError({ offset: 100 }), 100);
      return;
    }
    
    // Submit logic
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormField id="name" label="Имя" required error={errors.name}>
        <Input
          id="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) {
              setErrors(prev => clearFieldError(prev, 'name'));
            }
          }}
        />
      </FormField>
      
      <Button type="submit">Сохранить</Button>
    </form>
  );
}
```

### Форма с динамическими полями

```tsx
export function DynamicForm() {
  const [items, setItems] = useState([{ id: '1', name: '' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), name: '' }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {items.map((item, idx) => (
          <FieldCard
            key={item.id}
            index={idx + 1}
            isFirst={idx === 0}
            onDelete={() => removeItem(item.id)}
            variant="subtle"
          >
            <FormField
              id={`item-${item.id}`}
              label="Название"
              required
              error={errors[`items.${idx}.name`]}
            >
              <Input
                value={item.name}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[idx].name = e.target.value;
                  setItems(newItems);
                }}
              />
            </FormField>
          </FieldCard>
        ))}
      </div>
      
      <Button type="button" onClick={addItem}>
        + Добавить элемент
      </Button>
    </form>
  );
}
```

---

## 🚫 Что НЕ делать

### ❌ Не резервировать место под ошибки

```tsx
// ПЛОХО
<Input />
<div className="min-h-[28px]">{error ?? ""}</div>

// ХОРОШО
<FormField error={error}>
  <Input />
</FormField>
```

### ❌ Не передавать errorMessage в UI компоненты

```tsx
// ПЛОХО (старый API)
<CityAutocomplete errorMessage={error} />

// ХОРОШО (новый API)
<FormField error={error}>
  <CityAutocomplete error={!!error} />
</FormField>
```

### ❌ Не забывать добавлять автоскролл

```tsx
// ПЛОХО
if (hasErrors) {
  setErrors(issues);
  return; // пользователь не увидит ошибку
}

// ХОРОШО
if (hasErrors) {
  setErrors(issues);
  setTimeout(() => scrollToFirstError({ offset: 100 }), 100);
  return;
}
```

---

## 📚 Больше информации

- [Полная документация](./FORM_VALIDATION_REFACTORING.md)
- [DESIGN_REFERENCE.md](./DESIGN_REFERENCE.md)
- Примеры: `src/components/events/event-form.tsx`, `src/components/clubs/club-form.tsx`

---

**Вопросы?** Смотри примеры в существующих формах или читай полную документацию.
