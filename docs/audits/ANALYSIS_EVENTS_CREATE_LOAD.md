# /events/create Load Analysis

**Date:** 2026-01-22  
**Status:** Analysis Complete ✅  
**Route:** `/events/create`

---

## Observed Symptom

- При переходе на `/events/create` сначала отображается header + footer, а в центре страницы — пустое пространство
- После задержки (обычно 200-500ms) появляется контент формы создания события
- Симптом воспроизводится при client-side навигации с других страниц

---

## Render Chain (layout → page)

| # | File | Type | Role |
|---|------|------|------|
| 1 | `src/app/layout.tsx:30-58` | Server Component | Root layout: рендерит `<MainHeader />`, `<main>{children}</main>`, `<MainFooter />`. Выполняет `await getCurrentUser()` |
| 2 | `src/app/(app)/layout.tsx:10-15` | Server Component | App layout: добавляет `page-container py-6 md:py-10` wrapper |
| 3 | `src/app/(app)/events/create/page.tsx:22-65` | Server Component | Page: выполняет 3 блокирующих `await`, затем рендерит `<CreateEventPageClient />` |
| 4 | `src/app/(app)/events/create/create-event-client.tsx:44-316` | Client Component | Форма создания события. Возвращает `null` если `!isAuthenticated` |

**Loading boundaries:**
- `src/app/loading.tsx` — существует, но применяется только к `src/app/page.tsx` (root page)
- `src/app/(app)/loading.tsx` — **НЕ СУЩЕСТВУЕТ**
- `src/app/(app)/events/loading.tsx` — **НЕ СУЩЕСТВУЕТ**
- `src/app/(app)/events/create/loading.tsx` — **НЕ СУЩЕСТВУЕТ** ❌

---

## Key Findings

### Finding 1 — Отсутствует loading.tsx для route segment

**Evidence:** `src/app/(app)/events/create/` — нет файла `loading.tsx`

**Verification:**
```
Glob search: src/app/(app)/**/loading.tsx
Result: Only src/app/(app)/events/[id]/loading.tsx exists
```

**Explanation:**  
Next.js App Router использует `loading.tsx` для автоматического создания Suspense boundary вокруг `page.tsx`. При отсутствии `loading.tsx` в сегменте роута, Next.js не показывает fallback контент во время загрузки данных страницы.

**Classification:** **D** (Layout composition — page slot not rendered until server completes)

---

### Finding 2 — Блокирующие серверные await в page.tsx

**Evidence:** `src/app/(app)/events/create/page.tsx:23-54`

```typescript
// Line 23-24
const params = await searchParams;

// Line 27
const currentUser = await getCurrentUser();

// Line 35-44 (conditional on currentUser)
const allClubs = await getUserClubs(currentUser.id);

// Line 48
const freePlan = await getPlanById("free");
```

**Explanation:**  
Страница выполняет минимум 3 последовательных `await` вызова к базе данных перед рендерингом. Общее время: ~100-300ms в зависимости от нагрузки. Пока эти вызовы выполняются, `{children}` slot в layout остается пустым.

**Classification:** **D** (Layout composition) + **E** (Blocking server data fetch)

---

### Finding 3 — Layout рендерит shell до завершения загрузки page

**Evidence:** `src/app/layout.tsx:45-49`

```typescript
<div className="flex min-h-screen flex-col">
  <MainHeader />
  <main className="flex-1">{children}</main>
  <MainFooter />
</div>
```

**Explanation:**  
Root layout рендерит header и footer **синхронно** (MainHeader — Server Component без await, MainFooter имеет свой await, но для getCurrentUser, который вероятно закэширован). `{children}` slot не обернут в `<Suspense>`, поэтому при streaming:
1. Header отправляется браузеру
2. `{children}` ждет завершения page
3. Footer отправляется браузеру
4. Браузер показывает header + пустая середина + footer

**Classification:** **D** (Layout composition)

---

### Finding 4 — CSS подтверждает пустой middle (не скрытый)

**Evidence:** `src/app/layout.tsx:41`, `src/app/globals.css:110-112`

```css
/* body */
min-h-screen bg-[#F9FAFB]

/* .page-container */
@apply mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8;
```

**Explanation:**  
CSS структура корректна — нет стилей, которые бы скрывали контент. `flex min-h-screen flex-col` с `flex-1` для main правильно растягивает пустое пространство. Пустой middle — это именно отсутствие контента, а не CSS скрытие.

**Classification:** **F** — **RULED OUT** (CSS/layout не является причиной)

---

### Finding 5 — CreateEventPageClient возвращает null для неаутентифицированных

**Evidence:** `src/app/(app)/events/create/create-event-client.tsx:228-230`

```typescript
// Show nothing while auth check happens
if (!isAuthenticated) {
  return null; // Modal will show
}
```

**Explanation:**  
Для неаутентифицированных пользователей клиентский компонент возвращает `null`, пока показывается auth modal. Это **ожидаемое поведение** для защищенных страниц, но усугубляет симптом "пустой середины".

**Classification:** Secondary contributor (не primary cause для аутентифицированных пользователей)

---

## Primary Root Cause

### **D — Layout composition: header/footer rendered in layout, page slot not rendered until server-side data fetching completes**

**Justification:**

1. **Root layout** (`src/app/layout.tsx:45-49`) рендерит shell (Header + Footer) немедленно
2. **Нет loading.tsx** для `/events/create` — Next.js не создает автоматический Suspense boundary
3. **Page выполняет блокирующие await** (`src/app/(app)/events/create/page.tsx:23-54`) — 3 последовательных запроса к БД
4. **Next.js streaming** отправляет layout в браузер до завершения page
5. Браузер рендерит: Header → empty middle → Footer → (через ~200-500ms) → Page content

**Sequence diagram:**
```
Browser          Next.js Server
   |                   |
   |--- GET /events/create --->|
   |                   |
   |                   | layout.tsx starts
   |                   | await getCurrentUser() [~50ms]
   |                   | Header renders
   |                   | {children} - WAITING for page
   |                   | Footer renders
   |                   |
   |<-- stream: HTML shell (Header + empty + Footer) --|
   |                   |
   | Browser paints    | page.tsx starts
   | Header + Footer   | await searchParams
   |                   | await getCurrentUser() [cached?]
   |                   | await getUserClubs() [~100ms]
   |                   | await getPlanById() [~50ms]
   |                   | CreateEventPageClient renders
   |                   |
   |<-- stream: Page content --|
   |                   |
   | Browser paints    |
   | full page         |
```

---

## Secondary Contributors

### 1. Blocking server-side data fetching (Cause E)

**Evidence:** `page.tsx:27, 36, 48` — три последовательных await

Не является primary cause, потому что даже с быстрыми запросами симптом проявлялся бы из-за streaming без loading boundary.

### 2. force-dynamic route config

**Evidence:** `page.tsx:16` — `export const dynamic = "force-dynamic";`

Гарантирует, что страница никогда не кэшируется, всегда выполняет server-side fetch. Усугубляет задержку, но не является root cause.

---

## SSOT Classification

| Aspect | Value |
|--------|-------|
| **Shell rendered by:** | `src/app/layout.tsx:45-49` — Root layout с Header + Footer |
| **Content delayed by:** | Отсутствие `loading.tsx` + blocking awaits в `page.tsx` |
| **SSOT Category:** | Shell-first streaming без loading boundary |
| **SSOT_UI_ASYNC_PATTERNS compliance:** | ❌ Нарушение — CREATE pages должны иметь loading state |
| **SSOT_UI_STRUCTURE compliance:** | ❌ Нарушение — page shell должен рендериться немедленно |

---

## Fix Options (NO implementation)

### Option 1 — Добавить loading.tsx для /events/create

**What changes:**  
Создать `src/app/(app)/events/create/loading.tsx` с skeleton формы или spinner

**Expected UX effect:**  
- Мгновенный переход на страницу
- Skeleton/spinner показывается вместо пустой середины
- Контент появляется после загрузки данных

**Risks/tradeoffs:**
- Требует создания skeleton компонента для формы
- Skeleton должен визуально соответствовать финальной форме
- Минимальные риски — стандартный паттерн Next.js

---

### Option 2 — Перенести data fetching в client component

**What changes:**  
- `page.tsx` становится thin wrapper, рендерит `CreateEventPageClient` немедленно
- Data fetching перемещается в client component через `useEffect` или React Query
- Форма показывает inline loading states для reference data

**Expected UX effect:**  
- Мгновенный рендер формы (shell)
- Dropdowns показывают loading state пока данные грузятся
- Оптимистичный UI — пользователь может начать заполнять форму сразу

**Risks/tradeoffs:**
- Больше клиентского кода
- Дополнительные API запросы (вместо server-side)
- Требует рефакторинга data flow
- Соответствует SSOT_UI_ASYNC_PATTERNS §3.2 (CREATE optimistic pattern)

---

### Option 3 — Streaming с Suspense boundaries

**What changes:**  
- Обернуть data-dependent части в `<Suspense>` boundaries
- Показать form shell немедленно
- Асинхронно загрузить только нужные данные (clubs dropdown, plan limits)

**Expected UX effect:**  
- Form shell рендерится мгновенно
- Только dropdown'ы показывают loading state
- Остальная форма интерактивна сразу

**Risks/tradeoffs:**
- Сложнее реализовать
- Требует разделения компонента на части
- Лучший UX, но больше architectural changes
- Наиболее соответствует современным React patterns

---

## Verification Checklist

- [x] Root cause (D) selected with evidence
- [x] 5 direct file/line references included
- [x] CSS/layout cause explicitly ruled out (Finding 4)
- [x] No code changes made
- [x] No execution steps included
- [x] Analysis is deterministic

---

## References

- `src/app/layout.tsx:30-58` — Root layout structure
- `src/app/(app)/layout.tsx:10-15` — App layout wrapper
- `src/app/(app)/events/create/page.tsx:16-65` — Page with blocking awaits
- `src/app/(app)/events/create/create-event-client.tsx:44-316` — Client component
- `src/app/loading.tsx:14-19` — Root loading (not applicable to this route)
- `src/app/(app)/events/[id]/loading.tsx:14-16` — Example of proper loading.tsx (exists for event detail)
