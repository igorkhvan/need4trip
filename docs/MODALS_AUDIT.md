# 🔍 Полный Аудит: Все Модальные Окна

**Дата:** 21 декабря 2024  
**Охват:** Все Dialog, AlertDialog, Sheet, и кастомные модалы  
**Статус:** ⚠️ **ТРЕБУЕТСЯ СТАНДАРТИЗАЦИЯ**

---

## 📊 Найденные модальные окна

### ✅ Уже оптимизированы (Phase 5):
1. ✅ **AuthModal** — `heading-h3`, `text-body-small`, `py-3 sm:py-4`
2. ✅ **PaywallModal** (PaywallModal.tsx) — `heading-h3`, `text-body-small`, `py-3 sm:py-4`
3. ✅ **Sheet** — `p-4 sm:p-6`, `heading-h3`, `text-body-small`
4. ✅ **Dialog** (base) — `p-4 sm:p-6`

### ⚠️ Требуют оптимизации:
5. ❌ **AlertDialog** (base component) — `p-6` фиксированный
6. ❌ **ConfirmDialog** — использует AlertDialog (наследует проблемы)
7. ❌ **ParticipantModal** — кастомный, `p-6 md:p-8`, `text-2xl`
8. ❌ **MapPreviewModal** — `p-0` (спец. случай), но header `px-6 py-4` не адаптивен
9. ❌ **paywall-modal.tsx** (дубликат?) — нужно проверить

---

## 🚨 Критичные проблемы

### 1. AlertDialog — не адаптивен
**Файл:** `src/components/ui/alert-dialog.tsx:39`

**Проблема:**
```tsx
className={cn(
  "... p-6 shadow-lg duration-200 ...",
  className
)}
```

**Что не так:**
- `p-6` = 24px фиксированный
- Нет адаптивности
- Используется во многих местах (ConfirmDialog, DeleteActions, etc.)

**Ожидается:**
```tsx
className={cn(
  "... p-4 sm:p-6 shadow-lg duration-200 ...",
  className
)}
```

**Эффект:**
- Mobile: 16px (вместо 24px) — экономия 16px
- Desktop: 24px (сохраняется)

---

### 2. AlertDialogTitle — не использует стандартную типографику
**Файл:** `src/components/ui/alert-dialog.tsx:82`

**Проблема:**
```tsx
className={cn("text-lg font-semibold", className)}
```

**Что не так:**
- `text-lg` = 18px фиксированный
- Не использует `heading-h3`

**Ожидается:**
```tsx
className={cn("heading-h3", className)}
```

**Эффект:**
- Mobile: 18px (сохраняется)
- Desktop: 20px (улучшение)
- Консистентность с Dialog

---

### 3. AlertDialogDescription — не использует стандартную типографику
**Файл:** `src/components/ui/alert-dialog.tsx:94`

**Проблема:**
```tsx
className={cn("text-sm text-muted-foreground", className)}
```

**Что не так:**
- `text-sm` = 14px (ок)
- Но не использует `text-body-small` (с правильным line-height)

**Ожидается:**
```tsx
className={cn("text-body-small text-muted-foreground", className)}
```

---

### 4. ParticipantModal — полностью кастомный, не стандартизирован
**Файл:** `src/components/events/participant-modal.tsx:92`

**Проблемы:**
```tsx
// Content padding
<div className="... p-6 shadow-2xl md:p-8">
  {/* Title */}
  <h3 className="text-2xl font-semibold leading-tight text-[#111827]">
  {/* Description */}
  <p className="text-sm text-[#6B7280]">{description}</p>
</div>
```

**Что не так:**
1. `p-6 md:p-8` — не консистентно с `p-4 sm:p-6`
2. `text-2xl` — не использует `heading-h2` (24px → 28px)
3. `text-sm` — должен быть `text-body-small`
4. Кастомный modal вместо использования Dialog
5. Hardcoded colors вместо CSS variables

**Ожидается:**
Переписать на базе Dialog:
```tsx
<Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
  <DialogContent className="sm:max-w-3xl">
    <DialogHeader>
      <DialogTitle className="heading-h2">{title}</DialogTitle>
      <DialogDescription className="text-body-small">{description}</DialogDescription>
    </DialogHeader>
    <ParticipantForm ... />
  </DialogContent>
</Dialog>
```

**Эффект:**
- Консистентность с другими модалами
- Автоматический адаптивный padding
- Стандартная типографика
- Accessibility из коробки
- Меньше кастомного кода

---

### 5. MapPreviewModal — частично оптимизирован
**Файл:** `src/components/events/locations/MapPreviewModal.tsx:130-137`

**Проблемы:**
```tsx
<DialogContent className="max-w-2xl p-0">
  <DialogHeader className="border-b border-[#E5E7EB] px-6 py-4">
    <DialogTitle className="text-xl font-semibold text-[#111827]">
```

**Что не так:**
1. Header padding `px-6 py-4` — не адаптивен
2. Title `text-xl` — не использует `heading-h3`
3. Description `text-sm` — должен быть `text-body-small`
4. Hardcoded colors

**Ожидается:**
```tsx
<DialogContent className="max-w-2xl p-0">
  <DialogHeader className="border-b border-[#E5E7EB] px-4 py-3 sm:px-6 sm:py-4">
    <DialogTitle className="heading-h3">
      {location.title}
    </DialogTitle>
    <p className="text-body-small text-[var(--color-text-muted)] mt-1">
      {coordsText}
    </p>
  </DialogHeader>
```

**Эффект:**
- Mobile: 16px padding (вместо 24px)
- Desktop: 24px padding (сохраняется)
- Стандартная типографика

---

### 6. paywall-modal.tsx — возможный дубликат
**Файл:** `src/components/billing/paywall-modal.tsx`

**Статус:** ⚠️ Нужно проверить, не дубликат ли PaywallModal.tsx

Если это дубликат — удалить один из них для консистентности.

---

## 📋 Сводная таблица проблем

| Компонент | Файл | Padding | Typography | Приоритет |
|-----------|------|---------|------------|-----------|
| **AlertDialog** | alert-dialog.tsx:39 | ❌ p-6 fixed | ⚠️ не стандарт | 🔴 Высокий |
| **AlertDialogTitle** | alert-dialog.tsx:82 | - | ❌ text-lg | 🟡 Средний |
| **AlertDialogDescription** | alert-dialog.tsx:94 | - | ⚠️ text-sm | 🟢 Низкий |
| **ParticipantModal** | participant-modal.tsx:92 | ❌ p-6 md:p-8 | ❌ text-2xl | 🔴 Высокий |
| **MapPreviewModal** | MapPreviewModal.tsx:132 | ❌ px-6 py-4 | ❌ text-xl | 🟡 Средний |
| **ConfirmDialog** | confirm-dialog.tsx | ✅ (наследует AlertDialog) | ✅ (наследует) | - |

---

## 🎯 План стандартизации

### Task 1: AlertDialog (base component)
**Приоритет:** 🔴 Критичный (используется везде)

**Изменения:**
1. Content padding: `p-6` → `p-4 sm:p-6`
2. Title: `text-lg font-semibold` → `heading-h3`
3. Description: `text-sm` → `text-body-small`

**Влияние:**
- ConfirmDialog автоматически получит оптимизацию
- Все AlertDialog в проекте станут консистентными

---

### Task 2: ParticipantModal (полная переписывание)
**Приоритет:** 🔴 Высокий (критичный UX, кастомный код)

**Изменения:**
1. Переписать на базе Dialog (вместо кастомного)
2. Title: `text-2xl` → `heading-h2`
3. Description: `text-sm` → `text-body-small`
4. Убрать hardcoded colors
5. Использовать DialogContent автоматический padding

**Преимущества:**
- -50 строк кастомного кода
- Автоматический Escape handler
- Accessibility из коробки
- Консистентность

---

### Task 3: MapPreviewModal
**Приоритет:** 🟡 Средний (редко используется)

**Изменения:**
1. Header padding: `px-6 py-4` → `px-4 py-3 sm:px-6 sm:py-4`
2. Title: `text-xl` → `heading-h3`
3. Description: `text-sm` → `text-body-small`
4. Footer padding: `px-6 py-4` → `px-4 py-3 sm:px-6 sm:py-4`

---

### Task 4: Проверить дубликат paywall-modal
**Приоритет:** 🟢 Низкий (организационный)

**Действие:**
- Сравнить paywall-modal.tsx и PaywallModal.tsx
- Удалить дубликат если есть
- Обновить импорты

---

## 📊 Ожидаемые улучшения

### Экономия space на mobile:
- AlertDialog: 16px per modal
- ParticipantModal: 32px + улучшенная типографика
- MapPreviewModal: 12px + улучшенная типографика
- **Общая:** ~60px на самых используемых модалах

### Консистентность:
- **До:** 4 разных стиля модальных окон
- **После:** 1 единый стандарт

### Код:
- **-70 строк** кастомного кода (ParticipantModal)
- **+accessibility** автоматически
- **+типобезопасность** через Dialog API

---

## 🎯 Стандарт для ВСЕХ модалов

### Base Dialog (уже оптимизирован):
```tsx
<Dialog>
  <DialogContent className="sm:max-w-md"> {/* или sm:max-w-lg, sm:max-w-3xl */}
    <DialogHeader>
      <DialogTitle className="heading-h3">{title}</DialogTitle>
      <DialogDescription className="text-body-small">{description}</DialogDescription>
    </DialogHeader>
    
    {/* Content */}
    <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
      {children}
    </div>
    
    <DialogFooter>
      <Button>Action</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### AlertDialog (после оптимизации):
```tsx
<AlertDialog>
  <AlertDialogContent> {/* автоматический p-4 sm:p-6 */}
    <AlertDialogHeader>
      <AlertDialogTitle> {/* heading-h3 */}
      <AlertDialogDescription> {/* text-body-small */}
    </AlertDialogHeader>
    
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Confirm</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Sheet (уже оптимизирован):
```tsx
<Sheet>
  <SheetContent> {/* автоматический p-4 sm:p-6 */}
    <SheetHeader>
      <SheetTitle> {/* heading-h3 */}
      <SheetDescription> {/* text-body-small */}
    </SheetHeader>
    {children}
  </SheetContent>
</Sheet>
```

---

## 🚀 Рекомендация

**Внедрить Phase 6.5: Modal Standardization**

**Время:** 1-1.5 часа  
**Приоритет:** 🔴 Высокий  
**Сложность:** Средняя

**Эффект:**
- Все модалы консистентны ✅
- ~60px экономии на mobile
- -70 строк кастомного кода
- Улучшенная accessibility
- **Оценка:** 99 → **99.5/100** (+0.5)

---

**Автор:** AI Assistant  
**Дата:** 21 декабря 2024  
**Статус:** ⚠️ Требуется стандартизация

