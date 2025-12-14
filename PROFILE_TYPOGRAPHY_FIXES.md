# 🎨 Профиль — Исправления типографики

## ❌ Текущие проблемы

### Нестандартные размеры шрифтов
```tsx
// ❌ НЕПРАВИЛЬНО (кастомные размеры)
text-[13px]  // 17 использований
text-[14px]  // 3 использования  
text-[15px]  // 5 использований
text-[16px]  // 1 использование
text-[24px]  // 3 использования
text-[32px]  // 3 использования
```

### Дизайн-система требует:
```css
/* Стандартные классы */
.text-xs: 12px   /* Мелкий текст */
.text-sm: 13px   /* Маленький текст */
body, p: 15px    /* Основной текст */
.text-lg: 16px   /* Крупный текст */

/* Заголовки */
h1: 32px (desktop) / 36px (mobile), font-weight: 700
h2: 28px (desktop) / 24px (mobile), font-weight: 700
h3: 20px (desktop) / 18px (mobile), font-weight: 600
h4: 18px (desktop) / 16px (mobile), font-weight: 600
```

---

## ✅ План исправлений

### 1. **Статистические карточки (3 шт)**
```tsx
// ❌ Сейчас
<div className="text-[24px] md:text-[32px] text-[var(--color-primary)] mb-1">{stats.totalEvents}</div>
<div className="text-[12px] md:text-[13px] text-[var(--color-text-muted)]">Всего событий</div>

// ✅ Должно быть
<div className="text-2xl md:text-3xl font-bold text-[var(--color-primary)] mb-1">{stats.totalEvents}</div>
<div className="text-xs md:text-sm text-[var(--color-text-muted)]">Всего событий</div>
```

### 2. **Табы (3 шт)**
```tsx
// ❌ Сейчас
className={`px-4 md:px-5 py-3 text-[14px] md:text-[15px] border-b-2 transition-colors`}

// ✅ Должно быть
className={`px-4 md:px-5 py-3 text-sm md:text-base border-b-2 transition-colors`}
```

### 3. **Лейблы форм (8 шт)**
```tsx
// ❌ Сейчас
<label className="block text-[13px] text-[var(--color-text-muted)] mb-1.5">

// ✅ Должно быть
<label className="block text-sm text-[var(--color-text-muted)] mb-1.5">
```

### 4. **Значения полей (3 шт в Email/Телефон/О себе)**
```tsx
// ❌ Сейчас
<div className="text-[13px] text-[var(--color-text-muted)] mb-0.5">Email</div>
<div className="text-[15px]">{userData.email}</div>

// ✅ Должно быть
<div className="text-sm text-[var(--color-text-muted)] mb-0.5">Email</div>
<div className="text-base">{userData.email}</div>
```

### 5. **Карточки автомобилей**
```tsx
// ❌ Сейчас
<h4 className="text-[16px]">{car.carBrand?.name}</h4>
<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--color-text-muted)]">

// ✅ Должно быть
<h4 className="text-base font-semibold">{car.carBrand?.name}</h4>
<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-text-muted)]">
```

### 6. **User info overlay (имя, локация)**
```tsx
// ❌ Сейчас
<div className="flex flex-wrap items-center gap-2 md:gap-3 text-[13px] md:text-[14px] text-white/90">

// ✅ Должно быть
<div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm md:text-base text-white/90">
```

### 7. **Счётчик автомобилей**
```tsx
// ❌ Сейчас
<span className="text-[13px] text-[var(--color-text-muted)]">

// ✅ Должно быть
<span className="text-sm text-[var(--color-text-muted)]">
```

### 8. **Опциональные метки**
```tsx
// ❌ Сейчас
<span className="text-[12px]">(опционально)</span>

// ✅ Должно быть
<span className="text-xs text-[var(--color-text-muted)]">(опционально)</span>
```

---

## 📊 Маппинг размеров

| Старый кастомный | Новый стандартный | Tailwind класс |
|------------------|-------------------|----------------|
| `text-[12px]`    | 12px              | `text-xs`      |
| `text-[13px]`    | 13px              | `text-sm`      |
| `text-[14px]`    | 14px              | `text-sm`      |
| `text-[15px]`    | 15px              | `text-base`    |
| `text-[16px]`    | 16px              | `text-base`    |
| `text-[24px]`    | 24px (1.5rem)     | `text-2xl`     |
| `text-[32px]`    | 32px (2rem)       | `text-3xl`     |

---

## 🎯 Дополнительные правила

### Font Weight
- Числа в карточках: `font-bold` (700)
- Заголовки секций (h3): `font-semibold` (600) — уже есть через globals.css
- Названия автомобилей: `font-semibold` (600)
- Остальной текст: `font-normal` (400) — default

### Line Height
- Уже правильно настроен через globals.css:
  - Заголовки: `line-height: 1.2`
  - Текст: `line-height: 1.6`

---

## ✅ Итого: 46 замен

Все кастомные `text-[Npx]` заменить на стандартные Tailwind классы согласно дизайн-системе.
