# Need4Trip — Примеры кода

## 🚀 Быстрый старт

### Импорты Tailwind и шрифта

```css
/* globals.css или main.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;
```

### CSS Variables (обязательно!)

```css
@layer base {
  :root {
    /* Primary */
    --color-primary: #FF6F2C;
    --color-primary-hover: #E86223;
    --color-primary-light: #FFF4EF;
    --color-primary-bg: #FFF4EF;
    
    /* Background */
    --color-bg: #FFFFFF;
    --color-bg-subtle: #F7F7F8;
    --color-bg-elevated: #FAFAFA;
    
    /* Border */
    --color-border: #E5E7EB;
    --color-border-light: #F3F4F6;
    
    /* Text */
    --color-text-main: #111827;
    --color-text-secondary: #374151;
    --color-text-muted: #6B7280;
    
    /* Status */
    --color-success: #22C55E;
    --color-success-bg: #F0FDF4;
    --color-success-text: #16A34A;
    --color-warning: #FBBF24;
    --color-warning-bg: #FFFBEB;
    --color-warning-text: #D97706;
    --color-danger: #EF4444;
    --color-danger-bg: #FEF2F2;
    --color-danger-text: #DC2626;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: var(--color-bg);
    color: var(--color-text-main);
    font-size: 16px;
    line-height: 1.6;
  }
  
  h1 {
    font-size: 48px;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }
  
  h3 {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.35;
  }
}

@layer utilities {
  .container-custom {
    max-width: 1280px;
    margin-left: auto;
    margin-right: auto;
    padding-left: 32px;
    padding-right: 32px;
  }
  
  @media (max-width: 768px) {
    .container-custom {
      padding-left: 20px;
      padding-right: 20px;
    }
  }
}
```

---

## 🎨 Компоненты — готовые примеры

### Button (React пример)

```jsx
// Primary кнопка
<button className="
  h-12 px-6 
  bg-[var(--color-primary)] 
  hover:bg-[var(--color-primary-hover)]
  text-white text-[15px] font-medium
  rounded-xl
  shadow-sm
  transition-colors duration-200
  focus:outline-none focus:ring-4 focus:ring-[rgba(255,111,44,0.1)]
">
  Начать бесплатно
</button>

// Secondary кнопка
<button className="
  h-12 px-6
  bg-white
  border-2 border-[var(--color-border)]
  hover:border-[var(--color-text-muted)]
  text-[var(--color-text-main)] text-[15px] font-medium
  rounded-xl
  transition-all duration-200
  focus:outline-none focus:ring-4 focus:ring-[rgba(255,111,44,0.1)]
">
  Редактировать
</button>

// Ghost кнопка
<button className="
  px-4 py-3
  bg-transparent
  hover:bg-[var(--color-bg-subtle)]
  text-[var(--color-text-muted)] text-[15px] font-medium
  rounded-lg
  transition-colors duration-200
">
  ← Назад к событиям
</button>

// С иконкой (Lucide React)
import { Edit } from 'lucide-react';

<button className="h-12 px-6 bg-[var(--color-primary)] ...">
  <Edit className="w-4 h-4 mr-2 inline" />
  Редактировать
</button>
```

---

### Card

```jsx
// Базовая карточка
<div className="
  bg-white
  border border-[var(--color-border)]
  rounded-2xl
  p-6
  shadow-sm
">
  Контент карточки
</div>

// Кликабельная карточка с hover
<div className="
  bg-white
  border border-[var(--color-border)]
  rounded-2xl
  p-6
  shadow-sm
  hover:shadow-md
  hover:-translate-y-0.5
  transition-all duration-200
  cursor-pointer
">
  Контент карточки
</div>

// Карточка события (полный пример)
<div className="
  bg-white border border-[var(--color-border)] rounded-2xl p-6
  shadow-sm hover:shadow-md hover:-translate-y-0.5
  transition-all duration-200 cursor-pointer
">
  {/* Header */}
  <div className="flex items-start justify-between gap-4 mb-4">
    <div className="flex-1">
      <h3 className="mb-2">Зимний заезд в горы</h3>
      <div className="flex items-center gap-2 text-[14px] text-[var(--color-text-muted)]">
        <Mountain className="w-4 h-4" />
        <span>Внедорожники</span>
        <span>•</span>
        <span>OFF-ROAD Club</span>
      </div>
    </div>
    <span className="
      px-3 py-1
      bg-[var(--color-success-bg)]
      text-[var(--color-success-text)]
      rounded-full text-[13px] font-medium
    ">
      Открыта регистрация
    </span>
  </div>
  
  {/* Info Grid */}
  <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--color-bg-subtle)] rounded-xl mb-4">
    <div>
      <div className="text-[13px] text-[var(--color-text-muted)] mb-1">
        Дата и время
      </div>
      <div className="text-[15px] flex items-center gap-1">
        <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
        <span>15 дек 2025, 09:00</span>
      </div>
    </div>
    <div>
      <div className="text-[13px] text-[var(--color-text-muted)] mb-1">
        Участники
      </div>
      <div className="text-[15px]">12 / 20</div>
    </div>
  </div>
  
  {/* Progress Bar */}
  <div>
    <div className="flex items-center justify-between text-[13px] mb-2">
      <span className="text-[var(--color-text-muted)]">Заполненность</span>
      <span>60%</span>
    </div>
    <div className="h-2 bg-[var(--color-bg-subtle)] rounded-full overflow-hidden">
      <div 
        className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
        style={{ width: '60%' }}
      />
    </div>
  </div>
</div>
```

---

### Input с валидацией

```jsx
import { useState } from 'react';

function InputWithValidation() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  
  return (
    <div>
      <label className="block text-[14px] font-medium text-[var(--color-text-main)] mb-2">
        Название события
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Введите название..."
        className={`
          w-full h-12 px-4
          border-2 rounded-xl
          text-[15px]
          transition-all duration-200
          focus:outline-none
          ${error 
            ? 'border-[var(--color-danger)] focus:ring-4 focus:ring-[rgba(239,68,68,0.1)]'
            : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(255,111,44,0.1)]'
          }
          placeholder:text-[var(--color-text-muted)]
        `}
      />
      {/* ВАЖНО: Всегда резервируем место под ошибку (28px) */}
      <div className="h-7 mt-1">
        {error && (
          <p className="text-[13px] text-[var(--color-danger-text)] flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
```

---

### Select

```jsx
import { ChevronDown } from 'lucide-react';

<div>
  <label className="block text-[14px] font-medium mb-2">
    Тип автомобиля
  </label>
  <div className="relative">
    <select className="
      w-full h-12 px-4 pr-10
      border-2 border-[var(--color-border)]
      rounded-xl
      text-[15px]
      appearance-none
      bg-white
      focus:outline-none focus:border-[var(--color-primary)]
      focus:ring-4 focus:ring-[rgba(255,111,44,0.1)]
      transition-all duration-200
      cursor-pointer
    ">
      <option>Внедорожник 4x4</option>
      <option>Легковой автомобиль</option>
      <option>Спорткар</option>
      <option>Классика</option>
    </select>
    <ChevronDown className="
      absolute right-4 top-1/2 -translate-y-1/2
      w-5 h-5
      text-[var(--color-text-muted)]
      pointer-events-none
    " />
  </div>
  <div className="h-7" /> {/* Место под ошибку */}
</div>
```

---

### Textarea

```jsx
<div>
  <label className="block text-[14px] font-medium mb-2">
    Описание события
  </label>
  <textarea
    rows={5}
    placeholder="Расскажите о вашем событии..."
    className="
      w-full px-4 py-3
      border-2 border-[var(--color-border)]
      rounded-xl
      text-[15px]
      resize-vertical
      min-h-[120px]
      focus:outline-none focus:border-[var(--color-primary)]
      focus:ring-4 focus:ring-[rgba(255,111,44,0.1)]
      transition-all duration-200
      placeholder:text-[var(--color-text-muted)]
    "
  />
  <div className="h-7" />
</div>
```

---

### Progress Bar с динамическим цветом

```jsx
function ProgressBar({ current, max }) {
  const percentage = (current / max) * 100;
  
  // Логика цвета
  const getColor = (pct) => {
    if (pct >= 80) return 'var(--color-danger)';
    if (pct >= 50) return 'var(--color-primary)';
    return 'var(--color-success)';
  };
  
  return (
    <div>
      <div className="flex items-center justify-between text-[13px] mb-2">
        <span className="text-[var(--color-text-muted)]">Заполненность</span>
        <span className="text-[var(--color-text-main)]">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="h-2 bg-[var(--color-bg-subtle)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: getColor(percentage)
          }}
        />
      </div>
    </div>
  );
}

// Использование
<ProgressBar current={12} max={20} /> // 60% = оранжевый
<ProgressBar current={3} max={20} />  // 15% = зелёный
<ProgressBar current={17} max={20} /> // 85% = красный
```

---

### Status Badge

```jsx
function StatusBadge({ type, children }) {
  const styles = {
    success: 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]',
    danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]',
  };
  
  return (
    <span className={`
      px-3 py-1
      rounded-full
      text-[13px] font-medium
      ${styles[type]}
    `}>
      {children}
    </span>
  );
}

// Использование
<StatusBadge type="success">Открыта регистрация</StatusBadge>
<StatusBadge type="warning">Скоро начало</StatusBadge>
<StatusBadge type="danger">Почти заполнено</StatusBadge>
```

---

### Modal

```jsx
import { X } from 'lucide-react';

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content */}
      <div 
        className="
          relative z-10
          w-full max-w-[600px]
          bg-white
          rounded-[20px]
          p-8
          shadow-2xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4
            w-6 h-6
            text-[var(--color-text-muted)]
            hover:text-[var(--color-text-main)]
            transition-colors
          "
        >
          <X className="w-6 h-6" />
        </button>
        
        {/* Title */}
        <h3 className="mb-6">{title}</h3>
        
        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}

// Использование
<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  title="Регистрация на событие"
>
  <form>
    {/* Форма здесь */}
    <div className="flex justify-end gap-3 mt-8">
      <button 
        type="button"
        onClick={() => setIsOpen(false)}
        className="h-12 px-6 border-2 border-[var(--color-border)] rounded-xl"
      >
        Отмена
      </button>
      <button 
        type="submit"
        className="h-12 px-6 bg-[var(--color-primary)] text-white rounded-xl"
      >
        Зарегистрироваться
      </button>
    </div>
  </form>
</Modal>
```

---

### Table

```jsx
import { Edit, Trash2 } from 'lucide-react';

function ParticipantsTable({ participants, onEdit, onDelete }) {
  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-[var(--color-bg-subtle)]">
          <tr>
            <th className="px-4 py-4 text-left text-[14px] font-semibold">
              Экипаж
            </th>
            <th className="px-4 py-4 text-left text-[14px] font-semibold">
              Роль
            </th>
            <th className="px-4 py-4 text-left text-[14px] font-semibold">
              Автомобиль
            </th>
            <th className="px-4 py-4 text-left text-[14px] font-semibold">
              Статус
            </th>
            <th className="px-4 py-4 text-right text-[14px] font-semibold">
              {/* Actions */}
            </th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p, index) => (
            <tr 
              key={p.id}
              className={`
                border-t border-[var(--color-border-light)]
                hover:bg-[var(--color-bg-subtle)]
                transition-colors duration-150
              `}
            >
              <td className="px-4 py-4 text-[15px]">{p.crewName}</td>
              <td className="px-4 py-4 text-[15px]">{p.role}</td>
              <td className="px-4 py-4 text-[15px]">{p.car}</td>
              <td className="px-4 py-4 text-[15px]">
                <span className="text-[var(--color-success)]">
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(p)}
                    className="
                      p-2
                      text-[var(--color-text-muted)]
                      hover:text-[var(--color-primary)]
                      transition-colors
                    "
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(p)}
                    className="
                      p-2
                      text-[var(--color-text-muted)]
                      hover:text-[var(--color-danger)]
                      transition-colors
                    "
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Navigation Tabs

```jsx
function Tabs({ activeTab, onChange, tabs }) {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--color-border)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            px-4 py-3
            text-[15px]
            border-b-2
            transition-all duration-200
            ${activeTab === tab.id
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Использование
const [activeTab, setActiveTab] = useState('all');

<Tabs
  activeTab={activeTab}
  onChange={setActiveTab}
  tabs={[
    { id: 'all', label: 'Все события' },
    { id: 'upcoming', label: 'Предстоящие' },
    { id: 'my', label: 'Мои события' },
  ]}
/>
```

---

### Search Input

```jsx
import { Search } from 'lucide-react';

<div className="relative max-w-md">
  <Search className="
    absolute left-4 top-1/2 -translate-y-1/2
    w-5 h-5
    text-[var(--color-text-muted)]
    pointer-events-none
    z-10
  " />
  <input
    type="text"
    placeholder="Поиск по названию, организатору..."
    className="
      w-full h-12 pl-12 pr-4
      border-2 border-[var(--color-border)]
      rounded-xl
      text-[15px]
      bg-white
      focus:outline-none
      focus:border-[var(--color-primary)]
      focus:ring-4 focus:ring-[rgba(255,111,44,0.1)]
      hover:border-[var(--color-text-muted)]
      transition-all duration-200
      placeholder:text-[var(--color-text-muted)]
    "
  />
</div>
```

---

### Info Grid (в карточках)

```jsx
import { Calendar, MapPin, Users, DollarSign } from 'lucide-react';

<div className="grid grid-cols-2 gap-4 p-4 bg-[var(--color-bg-subtle)] rounded-xl">
  <div>
    <div className="text-[13px] text-[var(--color-text-muted)] mb-1">
      Дата и время
    </div>
    <div className="text-[15px] flex items-center gap-1">
      <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
      <span>15 дек 2025, 09:00</span>
    </div>
  </div>
  
  <div>
    <div className="text-[13px] text-[var(--color-text-muted)] mb-1">
      Место сбора
    </div>
    <div className="text-[15px] flex items-center gap-1">
      <MapPin className="w-4 h-4 text-[var(--color-text-muted)]" />
      <span>Сочи, Россия</span>
    </div>
  </div>
  
  <div>
    <div className="text-[13px] text-[var(--color-text-muted)] mb-1">
      Участники
    </div>
    <div className="text-[15px]">12 / 20</div>
  </div>
  
  <div>
    <div className="text-[13px] text-[var(--color-text-muted)] mb-1">
      Стоимость
    </div>
    <div className="text-[15px]">Бесплатно</div>
  </div>
</div>
```

---

### Stats Card

```jsx
import { Calendar } from 'lucide-react';

<div className="
  bg-white
  border border-[var(--color-border)]
  rounded-2xl
  p-6
  shadow-sm
">
  <div className="flex items-center justify-between">
    <div>
      <div className="text-[14px] text-[var(--color-text-muted)] mb-2">
        Всего событий
      </div>
      <div className="text-[36px] font-bold leading-none">
        5
      </div>
    </div>
    <div className="
      w-12 h-12
      bg-[var(--color-primary-bg)]
      rounded-xl
      flex items-center justify-center
    ">
      <Calendar className="w-6 h-6 text-[var(--color-primary)]" />
    </div>
  </div>
</div>
```

---

### Empty State

```jsx
import { Search } from 'lucide-react';

<div className="text-center py-16">
  <div className="
    w-16 h-16
    bg-[var(--color-bg-subtle)]
    rounded-full
    flex items-center justify-center
    mx-auto mb-4
  ">
    <Search className="w-8 h-8 text-[var(--color-text-muted)]" />
  </div>
  
  <h3 className="mb-2">Ничего не найдено</h3>
  
  <p className="text-[var(--color-text-muted)] mb-6">
    Попробуйте изменить поисковый запрос
  </p>
  
  <button className="
    px-4 py-3
    bg-transparent
    hover:bg-[var(--color-bg-subtle)]
    text-[var(--color-text-muted)]
    rounded-lg
    transition-colors
  ">
    Сбросить поиск
  </button>
</div>
```

---

## 📱 Responsive Patterns

### Container

```jsx
<div className="container-custom py-12">
  {/* Контент страницы */}
</div>

// Или без утилиты:
<div className="
  max-w-[1280px] mx-auto
  px-8 lg:px-8 md:px-6
  py-12
">
  {/* Контент */}
</div>
```

### Grid Layouts

```jsx
// 1 → 2 → 3 колонки
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Items */}
</div>

// 1 → 2 колонки (события)
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Event cards */}
</div>

// Content + Sidebar (2fr + 1fr)
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2">
    {/* Main content */}
  </div>
  <div>
    {/* Sidebar */}
  </div>
</div>
```

### Flex Direction

```jsx
// Stack на mobile, row на desktop
<div className="flex flex-col md:flex-row gap-4">
  <div>Левая часть</div>
  <div>Правая часть</div>
</div>
```

### Hide/Show Elements

```jsx
// Скрыть на mobile
<div className="hidden md:block">
  Видно только на desktop
</div>

// Показать только на mobile
<div className="block md:hidden">
  Видно только на mobile
</div>
```

---

## 🎯 Паттерны страниц

### Page Layout Template

```jsx
function PageTemplate({ children }) {
  return (
    <div className="py-12">
      <div className="container-custom">
        {children}
      </div>
    </div>
  );
}

// Использование
<PageTemplate>
  <h1 className="mb-8">Заголовок страницы</h1>
  {/* Контент */}
</PageTemplate>
```

### Header with Actions

```jsx
<div className="mb-8">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h1 className="mb-2">Все события</h1>
      <p className="text-[var(--color-text-muted)]">
        Найдите подходящую автомобильную поездку
      </p>
    </div>
    <div className="flex gap-3">
      <button className="h-12 px-6 bg-[var(--color-primary)] text-white rounded-xl">
        Создать событие
      </button>
    </div>
  </div>
</div>
```

---

## 🔐 Conditional Rendering (права доступа)

```jsx
function ParticipantRow({ participant, currentUserId, organizerId }) {
  // Проверка прав
  const canEdit = currentUserId === organizerId || currentUserId === participant.userId;
  
  return (
    <tr>
      <td>{participant.name}</td>
      <td>{participant.role}</td>
      <td>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={() => handleEdit(participant)}>
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(participant)}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
```

---

## 🎨 Utility Helpers

### Get Progress Color

```javascript
function getProgressColor(percentage) {
  if (percentage >= 80) return 'var(--color-danger)';
  if (percentage >= 50) return 'var(--color-primary)';
  return 'var(--color-success)';
}
```

### Format Date

```javascript
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
```

### Get Status Badge Props

```javascript
function getStatusBadge(event) {
  const fillPercentage = (event.participants / event.maxParticipants) * 100;
  const daysUntil = getDaysUntil(event.date);
  
  if (daysUntil <= 7) {
    return { type: 'warning', text: 'Скоро начало' };
  }
  
  if (fillPercentage >= 90) {
    return { type: 'warning', text: 'Почти заполнено' };
  }
  
  return { type: 'success', text: 'Открыта регистрация' };
}
```

---

## 📦 Установка зависимостей

```bash
# React + Tailwind (если ещё нет)
npm install react react-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init

# Иконки
npm install lucide-react
```

---

## ✅ Чек-лист перед началом

- [ ] CSS переменные добавлены в globals.css
- [ ] Шрифт Inter подключен
- [ ] Tailwind настроен (v4.0)
- [ ] lucide-react установлен
- [ ] container-custom utility добавлена
- [ ] Типографика (h1, h3, p) настроена

После этого можно начинать создавать компоненты по примерам выше! 🚀
