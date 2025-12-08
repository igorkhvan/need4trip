# Badge System Documentation

## Overview

Система Badge компонентов согласно Figma Design System. Используется для отображения статусов событий, категорий и других меток.

## Компоненты

### 1. Badge Component (`src/components/ui/badge.tsx`)

Переиспользуемый компонент для отображения меток.

#### Props

```typescript
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 
    // Subtle Badges (фон + цветной текст)
    | "registration-open"    // Зеленый - открыта регистрация
    | "starting-soon"        // Желтый - скоро начало
    | "almost-full"          // Желтый - почти заполнено
    | "completed"            // Красный - завершено
    | "neutral"              // Серый - нейтральный
    | "attention"            // Оранжевый - внимание
    | "success"              // Зеленый - успех
    | "warning"              // Желтый - предупреждение
    | "danger"               // Красный - опасность
    | "info"                 // Голубой - информация
    | "secondary"            // Оранжевый - вторичный
    
    // Solid Badges (заполненный фон + белый текст)
    | "solid-orange"         // Оранжевый - выезд на выходные
    | "solid-blue"           // Синий - техническая покатушка
    | "solid-purple"         // Фиолетовый - встреча
    | "solid-yellow"         // Желтый - тренировка
    | "solid-cyan"           // Голубой - сервис-день
    | "solid-gray"           // Серый - другое
    
    // Тип участия (платное/бесплатное)
    | "paid"                 // Фиолетовый - платное
    | "free"                 // Зеленый - бесплатное
    
    // Специальные
    | "club"                 // Зеленый - клубное событие
    | "outline";             // С границей
    
  size?: "sm" | "md" | "lg";
}
```

#### Размеры

| Размер | font-size | padding | Использование |
|--------|-----------|---------|---------------|
| `sm` | 12px | 10px/5px | Компактные карточки, таблицы |
| `md` | 13px | 12px/8px | Основной размер (default) |
| `lg` | 14px | 14px/8px | Заголовки, акценты |

#### Примеры использования

**Статусы событий (Subtle)**

```tsx
import { Badge } from "@/components/ui/badge";

// Открыта регистрация
<Badge variant="registration-open" size="md">
  Открыта регистрация
</Badge>

// Скоро начало
<Badge variant="starting-soon" size="md">
  Скоро начало
</Badge>

// Почти заполнено
<Badge variant="almost-full" size="md">
  Почти заполнено
</Badge>
```

**Категории событий (Solid)**

```tsx
import { Badge } from "@/components/ui/badge";
import { getCategoryBadgeVariant, getCategoryLabel } from "@/lib/utils/eventCategories";

const category: EventCategory = "weekend_trip";

<Badge 
  variant={getCategoryBadgeVariant(category)} 
  size="md"
>
  {getCategoryLabel(category)}
</Badge>
```

**С иконками**

```tsx
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

<Badge variant="club" size="md">
  <Calendar className="h-4 w-4" />
  Клубное событие
</Badge>
```

**В таблицах**

```tsx
<Badge variant="neutral" size="sm">
  Пользователь
</Badge>
<Badge variant="attention" size="sm">
  Владелец
</Badge>
```

### 2. Event Categories Utils (`src/lib/utils/eventCategories.ts`)

Утилиты для работы с категориями событий.

#### Exports

```typescript
// Маппинг категорий на названия
export const CATEGORY_LABELS: Record<EventCategory, string>;

// Маппинг категорий на Badge варианты
export const CATEGORY_BADGE_VARIANTS: Record<EventCategory, BadgeProps["variant"]>;

// Опции для Select компонента
export const CATEGORY_OPTIONS: Array<{ value: EventCategory; label: string }>;

// Получить badge вариант для категории
export function getCategoryBadgeVariant(category: EventCategory): BadgeProps["variant"];

// Получить label для категории
export function getCategoryLabel(category: EventCategory): string;
```

#### Категории событий

| Категория | Label | Badge Variant | Цвет |
|-----------|-------|---------------|------|
| `weekend_trip` | Выезд на выходные | `solid-orange` | Оранжевый |
| `technical_ride` | Техническая покатушка | `solid-blue` | Синий |
| `meeting` | Встреча | `solid-purple` | Фиолетовый |
| `training` | Тренировка | `solid-yellow` | Желтый |
| `service_day` | Сервис-день | `solid-cyan` | Голубой |
| `other` | Другое | `solid-gray` | Серый |

## Цветовая палитра

### Subtle Badges (фон + цветной текст)

| Variant | Background | Text Color |
|---------|-----------|------------|
| `registration-open` / `success` | `#F0FDF4` | `#16A34A` |
| `starting-soon` / `almost-full` / `warning` | `#FFFBEB` | `#D97706` |
| `completed` / `danger` | `#FEF2F2` | `#DC2626` |
| `info` | `#E5F6FF` | `#0F4C75` |
| `attention` / `secondary` | `#FFF4EF` | `#E86223` |
| `neutral` | `#F3F4F6` | `#6B7280` |

### Solid Badges (заполненный фон + белый текст)

| Variant | Background | Text Color |
|---------|-----------|------------|
| `solid-orange` | `#FF6F2C` | `#FFFFFF` |
| `solid-blue` | `#3B82F6` | `#FFFFFF` |
| `solid-purple` | `#A855F7` | `#FFFFFF` |
| `solid-yellow` | `#F59E0B` | `#FFFFFF` |
| `solid-cyan` | `#06B6D4` | `#FFFFFF` |
| `solid-gray` | `#374151` | `#FFFFFF` |
| `paid` | `#8B5CF6` | `#FFFFFF` |
| `free` | `#10B981` | `#FFFFFF` |
| `club` | `#10B981` | `#FFFFFF` |

## Best Practices

### ✅ DO

- Используйте `Badge` вместо кастомных `<span>` с цветами
- Используйте утилиты из `eventCategories.ts` для категорий
- Выбирайте правильный размер для контекста
- Используйте семантические варианты (`success`, `warning`, `danger`)

### ❌ DON'T

- Не дублируйте `CATEGORY_LABELS` в компонентах
- Не используйте кастомные цвета через `className`
- Не смешивайте `Badge` и `Chip` для одинаковых целей
- Не создавайте новые варианты без документации

## Миграция с Chip на Badge

Если вы использовали `Chip` компонент, замените его на `Badge`:

**Было:**
```tsx
<Chip className="bg-[#FF6F2C] text-white">
  Выезд на выходные
</Chip>
```

**Стало:**
```tsx
<Badge variant="solid-orange" size="md">
  Выезд на выходные
</Badge>
```

## Examples по контексту

### Event Card

```tsx
{event.category && (
  <Badge 
    variant={getCategoryBadgeVariant(event.category)} 
    size="sm"
  >
    {getCategoryLabel(event.category)}
  </Badge>
)}
```

### Event Details Page

```tsx
{event.category && (
  <Badge 
    variant={getCategoryBadgeVariant(event.category)} 
    size="md"
  >
    {getCategoryLabel(event.category)}
  </Badge>
)}

{event.isClubEvent && (
  <Badge variant="club" size="md">
    Клубное событие
  </Badge>
)}

<Badge variant={event.isPaid ? "paid" : "free"} size="md">
  {event.isPaid ? "Платное" : "Бесплатное"}
</Badge>
```

### Events Grid

```tsx
const getStatusBadge = (event: Event) => {
  const daysUntil = getDaysUntil(event.dateTime);
  const fillPercentage = event.maxParticipants
    ? ((event.participantsCount ?? 0) / event.maxParticipants) * 100
    : 0;

  if (daysUntil <= 7 && daysUntil >= 0) {
    return <Badge variant="starting-soon" size="md">Скоро начало</Badge>;
  }

  if (fillPercentage >= 90) {
    return <Badge variant="almost-full" size="md">Почти заполнено</Badge>;
  }

  return <Badge variant="registration-open" size="md">Открыта регистрация</Badge>;
};
```

### Participants Table

```tsx
{participant.userId ? (
  <Badge variant="neutral" size="sm">Пользователь</Badge>
) : (
  <Badge variant="neutral" size="sm">Гость</Badge>
)}

{participant.userId === event.createdByUserId && (
  <Badge variant="attention" size="sm">Владелец</Badge>
)}
```

## Testing

Убедитесь что:
- Все badges имеют правильные цвета согласно Figma
- Размеры соответствуют спецификации
- С иконками: gap между иконкой и текстом = 6px (`gap-1.5`)
- Badges адаптивны и не ломают layout на мобильных

## Changelog

### v1.1.0 (Current)
- ✨ Добавлены варианты для типа участия:
  - `paid` - Платное (фиолетовый #8B5CF6)
  - `free` - Бесплатное (зеленый #10B981)
- ♻️ Заменен Chip на Badge для отображения платности события

### v1.0.0
- ✨ Создана полная система Badge компонентов
- ✨ Добавлены Subtle и Solid варианты
- ✨ Добавлены размеры (sm, md, lg)
- ✨ Создан `eventCategories.ts` utils
- ♻️ Заменены все кастомные spans на Badge
- ♻️ Мигрировано с Chip на Badge для категорий
- 📚 Создана документация

