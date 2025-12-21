# 🔍 АНАЛИЗ: Унификация секций управления событием

**Дата:** 22 декабря 2024  
**Компоненты:**
- `EventRegistrationControl` — управление регистрацией
- `EventDangerZone` — опасные действия

---

## 📋 ЧАСТЬ 1: Текущая структура

### **1.1. EventRegistrationControl**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Управление регистрацией</CardTitle>
    <CardDescription>Контроль доступа к регистрации на событие</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="rounded-xl border bg-white p-4">  {/* ← Внутренняя карточка */}
      <div>
        <p className="font-medium">Закрыть регистрацию</p>
        <p className="text-sm text-muted">Только вы сможете добавлять участников...</p>
      </div>
      <Button>Закрыть</Button>
    </div>
  </CardContent>
</Card>
```

**Структура:**
- ✅ Внешняя `Card` (контейнер)
- ✅ `CardHeader` с заголовком и описанием
- ✅ `CardContent` с **одной** внутренней карточкой действия
- ✅ Действие: toggle кнопка (Закрыть/Открыть)

---

### **1.2. EventDangerZone**

```tsx
<Card className="border-[var(--color-border)]">
  <CardHeader>
    <CardTitle className="text-danger">⚠️ Опасная зона</CardTitle>
    <CardDescription>Необратимые действия. Используйте с осторожностью.</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="rounded-xl border border-danger bg-white p-4">  {/* ← Внутренняя карточка */}
      <div>
        <p className="font-medium text-danger">Удалить событие навсегда</p>
        <p className="text-sm text-muted">Событие и все регистрации...</p>
      </div>
      <ConfirmDialog>
        <Button variant="destructive">Удалить событие</Button>
      </ConfirmDialog>
    </div>
  </CardContent>
</Card>
```

**Структура:**
- ✅ Внешняя `Card` (контейнер)
- ✅ `CardHeader` с заголовком (danger стиль) и описанием
- ✅ `CardContent` с **одной** внутренней карточкой действия
- ✅ Действие: destructive кнопка с подтверждением

---

## 📋 ЧАСТЬ 2: Что общего?

### **2.1. Идентичная структура:**

```
Card (внешняя)
├── CardHeader
│   ├── CardTitle (заголовок секции)
│   └── CardDescription (описание секции)
└── CardContent
    └── div.rounded-xl.border.p-4 (внутренняя карточка действия)
        ├── div (текстовый блок)
        │   ├── p.font-medium (название действия)
        │   └── p.text-sm (описание действия)
        └── Button (действие)
```

### **2.2. Различия:**

| Аспект | EventRegistrationControl | EventDangerZone |
|--------|--------------------------|-----------------|
| **Цветовая схема** | Нейтральная (серая) | Опасная (красная) |
| **Иконка** | Нет | ⚠️ |
| **Бордер внутренней карточки** | `border-[var(--color-border)]` | `border-[var(--color-danger)]` |
| **Текст действия** | `text-[var(--color-text)]` | `text-[var(--color-danger)]` |
| **Кнопка** | Toggle (outline/default) | Destructive |
| **Подтверждение** | Нет | Да (ConfirmDialog) |
| **Количество действий** | 1 | 1 (но может быть больше) |

---

## 📋 ЧАСТЬ 3: Проблемы текущего подхода

### **3.1. Дублирование кода**

```tsx
// Повторяется в обоих компонентах:
<div className="rounded-xl border bg-white p-4">
  <div>
    <p className="font-medium">...</p>
    <p className="text-sm text-muted">...</p>
  </div>
  <Button>...</Button>
</div>
```

### **3.2. Отсутствие переиспользуемого компонента**

Каждая секция управления реализована с нуля:
- ❌ Нет компонента для "карточки действия"
- ❌ Сложно добавить новые действия
- ❌ Неконсистентный стиль при расширении

### **3.3. Ограниченная гибкость**

**EventDangerZone** может содержать **несколько опасных действий:**
- Удалить событие
- Экспортировать данные
- Передать права владения
- Архивировать событие

Текущая структура не поддерживает несколько действий.

---

## 📋 ЧАСТЬ 4: Решения

### **Вариант 1: Компонент ActionCard** ⭐ РЕКОМЕНДУЕТСЯ

**Создать универсальный компонент для карточки действия:**

```tsx
// src/components/ui/action-card.tsx

interface ActionCardProps {
  title: string;
  description: string;
  action: React.ReactNode;
  variant?: 'default' | 'danger' | 'warning';
}

export function ActionCard({ title, description, action, variant = 'default' }: ActionCardProps) {
  const borderClass = {
    default: 'border-[var(--color-border)]',
    danger: 'border-[var(--color-danger)]',
    warning: 'border-[var(--color-warning)]',
  }[variant];
  
  const titleClass = {
    default: 'text-[var(--color-text)]',
    danger: 'text-[var(--color-danger)]',
    warning: 'text-[var(--color-warning)]',
  }[variant];
  
  return (
    <div className={`flex flex-col gap-4 rounded-xl border ${borderClass} bg-white p-4 sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex-1">
        <p className={`font-medium ${titleClass}`}>{title}</p>
        <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
      </div>
    </div>
  );
}
```

**Использование:**

```tsx
// EventRegistrationControl
<Card>
  <CardHeader>
    <CardTitle>Управление регистрацией</CardTitle>
    <CardDescription>Контроль доступа к регистрации на событие</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <ActionCard
      variant="default"
      title={event.registrationManuallyClosed ? 'Открыть регистрацию' : 'Закрыть регистрацию'}
      description={event.registrationManuallyClosed 
        ? 'Все смогут регистрироваться на событие'
        : 'Только вы сможете добавлять участников (даже если дата не прошла)'}
      action={
        <Button onClick={handleToggle} disabled={isTogglingRegistration}>
          {event.registrationManuallyClosed ? 'Открыть' : 'Закрыть'}
        </Button>
      }
    />
  </CardContent>
</Card>

// EventDangerZone
<Card>
  <CardHeader>
    <CardTitle className="text-danger">⚠️ Опасная зона</CardTitle>
    <CardDescription>Необратимые действия. Используйте с осторожностью.</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <ActionCard
      variant="danger"
      title="Удалить событие навсегда"
      description="Событие и все регистрации участников будут удалены безвозвратно"
      action={
        <ConfirmDialog onConfirm={handleDelete}>
          <Button variant="destructive">Удалить событие</Button>
        </ConfirmDialog>
      }
    />
    
    {/* Легко добавить новые действия: */}
    <ActionCard
      variant="warning"
      title="Архивировать событие"
      description="Событие будет скрыто, но данные сохранятся"
      action={<Button variant="outline">Архивировать</Button>}
    />
  </CardContent>
</Card>
```

---

### **Вариант 2: Компонент SettingsSection** 

**Создать обёртку для секций настроек:**

```tsx
// src/components/ui/settings-section.tsx

interface SettingsSectionProps {
  title: string;
  description: string;
  variant?: 'default' | 'danger';
  icon?: React.ReactNode;
  children: React.ReactNode; // ActionCard components
}

export function SettingsSection({ 
  title, 
  description, 
  variant = 'default',
  icon,
  children 
}: SettingsSectionProps) {
  const titleClass = variant === 'danger' 
    ? 'text-[var(--color-danger)]' 
    : 'text-[var(--color-text)]';
  
  return (
    <Card className="border-[var(--color-border)]">
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${titleClass}`}>
          {icon}
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}
```

**Использование:**

```tsx
// EventRegistrationControl
<SettingsSection
  title="Управление регистрацией"
  description="Контроль доступа к регистрации на событие"
>
  <ActionCard variant="default" title="..." description="..." action={...} />
</SettingsSection>

// EventDangerZone
<SettingsSection
  title="Опасная зона"
  description="Необратимые действия. Используйте с осторожностью."
  variant="danger"
  icon={<span>⚠️</span>}
>
  <ActionCard variant="danger" title="..." description="..." action={...} />
  <ActionCard variant="warning" title="..." description="..." action={...} />
</SettingsSection>
```

---

## 📋 ЧАСТЬ 5: Рекомендация

**Использовать комбинацию Вариант 1 + Вариант 2:**

1. ✅ **ActionCard** — универсальная карточка действия
2. ✅ **SettingsSection** — обёртка для секций (опционально)

**Преимущества:**

### **1. Переиспользование**
- ActionCard можно использовать везде (события, клубы, профиль)
- Единый стиль для всех карточек действий

### **2. Гибкость**
- Легко добавить новые действия
- Легко менять стили (variant)
- Поддержка нескольких действий в одной секции

### **3. Консистентность**
- Все секции управления выглядят одинаково
- Design system compliance

### **4. Поддержка**
- Изменения в одном месте применяются везде
- Меньше дублирования кода

---

## 🎯 ПЛАН ДЕЙСТВИЙ

1. ✅ Создать `src/components/ui/action-card.tsx`
2. ✅ (Опционально) Создать `src/components/ui/settings-section.tsx`
3. ✅ Рефакторить `EventRegistrationControl` — использовать ActionCard
4. ✅ Рефакторить `EventDangerZone` — использовать ActionCard
5. ✅ Проверить на других страницах (клубы, профиль)
6. ✅ Обновить Storybook / документацию

---

## 📊 ОЦЕНКА

| Критерий | До | После |
|----------|-----|-------|
| **Строк кода** | ~100 (дублирование) | ~40 (переиспользование) |
| **Компонентов** | 2 специфичных | 1 универсальный |
| **Гибкость** | Низкая | Высокая |
| **Поддержка** | Сложная | Простая |
| **Консистентность** | Средняя | Высокая |

---

**Следующий шаг:** Реализовать ActionCard компонент?
