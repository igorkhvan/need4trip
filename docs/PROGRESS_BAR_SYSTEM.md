# Progress Bar System Documentation

## Overview

Переиспользуемый компонент Progress Bar согласно Figma Design System. Используется для отображения заполненности событий и других прогресс-индикаторов.

## Компонент

### ProgressBar (`src/components/ui/progress-bar.tsx`)

#### Props

```typescript
interface ProgressBarProps {
  /** Процент заполненности (0-100) */
  value: number;
  
  /** Показывать ли процент и label сверху (default: true) */
  showLabel?: boolean;
  
  /** Текст label (default: "Заполненность") */
  label?: string;
  
  /** Размер прогресс-бара (default: "md") */
  size?: "sm" | "md";
  
  /** Дополнительный класс для контейнера */
  className?: string;
}
```

#### Размеры

| Размер | Высота | Использование |
|--------|--------|---------------|
| `sm` | 6px (1.5) | Компактные элементы |
| `md` | 8px (2) | Основной размер (default) |

## Цветовая схема заполненности

Согласно Figma, цвет прогресс-бара зависит от процента заполненности:

| Диапазон | Цвет | HEX | Статус |
|----------|------|-----|--------|
| **0-59%** | Зелёный | `#22C55E` | Много мест |
| **60-84%** | Оранжевый | `#FF6F2C` | Заполняется |
| **85-100%** | Красный | `#EF4444` | Почти заполнено / Критично мало мест |

### Логика цветов

```typescript
function getProgressColor(value: number): string {
  if (value >= 85) return "bg-[#EF4444]"; // Красный
  if (value >= 60) return "bg-[#FF6F2C]"; // Оранжевый
  return "bg-[#22C55E]"; // Зелёный
}
```

## Использование

### Базовый пример

```tsx
import { ProgressBar } from "@/components/ui/progress-bar";

<ProgressBar value={65} />
```

Результат:
```
Заполненность                   65%
[████████████████░░░░░░░░░░░░]
```

### Без label

```tsx
<ProgressBar value={45} showLabel={false} />
```

Результат:
```
[████████████░░░░░░░░░░░░░░░░]
```

### Кастомный label

```tsx
<ProgressBar value={90} label="Прогресс" />
```

Результат:
```
Прогресс                         90%
[████████████████████████████]
```

### Компактный размер

```tsx
<ProgressBar value={30} size="sm" />
```

### С вспомогательной функцией

Для расчета процента заполненности события используйте `calculateEventFillPercentage`:

```tsx
import { 
  ProgressBar, 
  calculateEventFillPercentage 
} from "@/components/ui/progress-bar";

const fillPercentage = calculateEventFillPercentage(
  event.participantsCount ?? 0,
  event.maxParticipants
);

<ProgressBar value={fillPercentage} />
```

## Примеры по контексту

### Event Grid (Сетка событий)

```tsx
// src/components/events/events-grid.tsx

import { ProgressBar, calculateEventFillPercentage } from "@/components/ui/progress-bar";

const fillPercentage = calculateEventFillPercentage(
  event.participantsCount ?? 0,
  event.maxParticipants
);

{event.maxParticipants && (
  <ProgressBar value={fillPercentage} />
)}
```

### Event Card

```tsx
const fillPercentage = calculateEventFillPercentage(
  event.participantsCount ?? 0,
  event.maxParticipants
);

<ProgressBar 
  value={fillPercentage}
  label="Участники"
  size="sm"
/>
```

### Dashboard Statistics

```tsx
<ProgressBar 
  value={75} 
  label="Заполненность событий"
  className="w-full"
/>
```

## Accessibility

Компонент включает ARIA атрибуты для доступности:

```tsx
<div
  role="progressbar"
  aria-valuenow={normalizedValue}
  aria-valuemin={0}
  aria-valuemax={100}
/>
```

## Best Practices

### ✅ DO

- Используйте `calculateEventFillPercentage` для событий
- Показывайте label для важных метрик
- Используйте `size="sm"` в компактных карточках
- Передавайте значения в диапазоне 0-100

### ❌ DON'T

- Не создавайте кастомные прогресс-бары с hardcoded цветами
- Не используйте прогресс-бар для не-процентных значений
- Не переопределяйте цвета через className

## Visual Examples

### 15% - Много мест (зелёный)
```
Заполненность                   15%
[███░░░░░░░░░░░░░░░░░░░░░░░░░]
```

### 40% - Ещё зелёный
```
Заполненность                   40%
[██████████░░░░░░░░░░░░░░░░░░]
```

### 60% - Заполняется (оранжевый)
```
Заполненность                   60%
[███████████████░░░░░░░░░░░░░]
```

### 75% - Ещё оранжевый
```
Заполненность                   75%
[██████████████████░░░░░░░░░░]
```

### 85% - Почти заполнено (красный)
```
Заполненность                   85%
[█████████████████████░░░░░░░]
```

### 95% - Критично мало мест (красный)
```
Заполненность                   95%
[██████████████████████████░░]
```

## Migration from Custom Progress Bars

**Было:**
```tsx
const getProgressColor = (fillPercentage: number) => {
  if (fillPercentage >= 80) return "bg-[#EF4444]";
  if (fillPercentage >= 50) return "bg-[#FF6F2C]";
  return "bg-[#22C55E]";
};

<div>
  <div className="mb-2 flex items-center justify-between text-[13px]">
    <span className="text-[#6B7280]">Заполненность</span>
    <span className="text-[#111827]">{fillPercentage}%</span>
  </div>
  <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
    <div
      className={`h-full rounded-full transition-all duration-300 ${getProgressColor(fillPercentage)}`}
      style={{ width: `${fillPercentage}%` }}
    />
  </div>
</div>
```

**Стало:**
```tsx
import { ProgressBar } from "@/components/ui/progress-bar";

<ProgressBar value={fillPercentage} />
```

## API Reference

### `ProgressBar` Component

Основной компонент для отображения прогресс-бара.

### `calculateEventFillPercentage(participantsCount, maxParticipants)`

Вспомогательная функция для расчета процента заполненности события.

**Parameters:**
- `participantsCount: number` - Текущее количество участников
- `maxParticipants: number | null | undefined` - Максимальное количество участников

**Returns:** `number` - Процент заполненности (0-100)

**Example:**
```typescript
const fillPercentage = calculateEventFillPercentage(3, 5); // 60
const fillPercentage = calculateEventFillPercentage(10, null); // 0
```

## Changelog

### v1.0.0 (Current)
- ✨ Создан переиспользуемый компонент ProgressBar
- ✨ Цветовая схема согласно Figma (зелёный/оранжевый/красный)
- ✨ Размеры: sm (6px), md (8px)
- ✨ Поддержка label и процента
- ✨ Вспомогательная функция `calculateEventFillPercentage`
- ✨ ARIA атрибуты для доступности
- ♻️ Заменены все кастомные прогресс-бары на компонент
- 📚 Создана документация

