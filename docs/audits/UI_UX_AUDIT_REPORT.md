# Need4Trip UI/UX AUDIT REPORT

**Date:** 2026-01-21  
**Version:** v1.0 (FINAL)  
**Audit Type:** READ-ONLY Global Assessment  
**Scope:** ALL routes under `src/app/**`

---

## 1. EXECUTIVE SUMMARY

### 1.1 Overall Assessment

The Need4Trip application demonstrates a **generally well-structured** design system with consistent use of CSS variables for colors and a unified component library. However, the audit revealed several areas requiring attention for improved UX consistency.

### 1.2 Key Metrics

| Metric | Value |
|--------|-------|
| Total Pages Audited | 14 |
| Total Layouts | 4 |
| Shared UI Components | 117+ |
| P0 Findings (Critical) | 5 |
| P1 Findings (Significant) | 12 |
| P2 Findings (Cosmetic) | 18 |

### 1.3 Strengths Identified

- ✅ Consistent CSS variable system (`--color-primary`, `--color-text`, etc.)
- ✅ Well-defined Button component with clear variants
- ✅ Comprehensive skeleton system for loading states
- ✅ Mobile-first responsive approach
- ✅ Established typography utility classes (`heading-hero`, `heading-h1`, etc.)
- ✅ Proper Suspense usage for async content

### 1.4 Critical Issues

- ❌ Inconsistent content width strategies across pages
- ❌ Mixed loading/pending text patterns (grammatical inconsistency)
- ❌ Missing heading hierarchy on some pages
- ❌ Inconsistent page load sequences
- ❌ Some hardcoded color values outside design system

---

## 2. GLOBAL CROSS-APP FINDINGS

### 2.1 Design System Foundation

**Defined in:** `src/app/globals.css`

#### Color System (CSS Variables)

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-primary` | `#FF6F2C` | Primary orange CTA |
| `--color-primary-hover` | `#E55A1A` | Hover state |
| `--color-primary-bg` | `rgba(255,111,44,0.1)` | Subtle backgrounds |
| `--color-text` | `#1F2937` | Body text |
| `--color-text-muted` | `#6B7280` | Secondary text |
| `--color-bg-main` | `#FFFFFF` | Card backgrounds |
| `--color-bg-subtle` | `#F9FAFB` | Page backgrounds |
| `--color-border` | `#E5E7EB` | Default borders |

**Finding [P1]:** Some components use hardcoded hex colors instead of CSS variables:
- `#111827` used instead of `--color-text` in several places
- `#374151` used directly in button labels
- `#F7F7F8` used in skeletons instead of `--color-bg-subtle`

#### Typography Scale

| Class | Mobile | Desktop | Usage |
|-------|--------|---------|-------|
| `.heading-hero` | 36px bold | 48px | Landing hero |
| `.heading-section` | 36px semibold | 36px | Section titles |
| `.heading-h1` | 28px/34px bold | 32px/36px | Page titles |
| `.heading-h2` | 24px/30px semibold | 28px/34px | Card titles |
| `.heading-h3` | 18px/24px semibold | 20px/26px | Subsections |
| `.text-body` | 15px/22px | 15px/22px | Body text |
| `.text-body-small` | 14px | 14px | Helper text |

**Finding [P2]:** Inconsistent heading usage — some pages use `<h3>` directly with inline styles instead of utility classes.

### 2.2 Layout System

#### Container Strategy

The app uses two layout groups:

1. **Marketing Layout** (`src/app/(marketing)/layout.tsx`):
   - Pass-through layout (no wrapper)
   - Allows full-width sections
   - Used for: Landing page

2. **App Layout** (`src/app/(app)/layout.tsx`):
   - Wraps content in `page-container py-6 md:py-10`
   - Constrains width to `max-w-7xl` (1280px)
   - Used for: Events, Clubs, Profile, Pricing

**Finding [P0]:** Club Settings page bypasses App Layout's container:
- File: `src/app/(app)/clubs/[id]/settings/page.tsx` (line 86-87)
- Uses `min-h-screen bg-[var(--color-bg-subtle)]` with custom `max-w-3xl mx-auto`
- Results in narrower width (768px vs 1280px standard)

### 2.3 Component Consistency

#### Button Sizes (from `src/components/ui/button.tsx`)

| Size | Height | Padding | Usage |
|------|--------|---------|-------|
| `default` | h-12 | px-4/px-6 | Primary actions |
| `sm` | h-11 | px-3/px-4 | Secondary |
| `lg` | h-14 | px-6/px-8 | Hero CTAs |
| `icon-xs` | h-8 w-8 | — | Compact icons |
| `icon-sm` | h-11 w-11 | — | Standard icons |
| `icon` | h-12 w-12 | — | Large icons |

**Finding [P2]:** Some inline button styling overrides canonical sizes:
- `src/app/(app)/clubs/page.tsx` line 130: Inline `h-11` with custom padding

#### Input Heights (from `src/components/ui/input.tsx`)

Standard: `h-12` (48px)

**Finding [P1]:** Select component trigger height inconsistent:
- `SelectTrigger` in EventsGrid uses `h-10` (line 169)
- Creates visual mismatch with adjacent h-12 inputs

---

## 3. CONTENT WIDTH & LAYOUT STRATEGY ANALYSIS

### 3.1 Width Strategy by Domain

| Domain | Width Strategy | Container | Max-Width |
|--------|----------------|-----------|-----------|
| Landing | Fluid sections | `page-container` per section | 1280px per section |
| Events | Standard | `page-container` (layout) | 1280px |
| Event Detail | Standard | `page-container` (layout) | 1280px |
| Event Form | Standard | `page-container` (layout) | 1280px |
| Clubs | Standard | `page-container` (layout) | 1280px |
| Club Profile | Standard | Layout + local container | 1280px |
| Club Settings | **NARROW** | Custom `max-w-3xl mx-auto` | 768px |
| Club Members | Standard | Layout + local | 1280px |
| Club Events | Standard | Layout + local | 1280px |
| Profile | Standard | `max-w-3xl` (conditional) | Mixed |
| Profile Edit | **NARROW** | `max-w-3xl mx-auto` | 768px |
| Pricing | Standard | `page-container` (layout) | 1280px |

### 3.2 Inconsistency Analysis

**[P0] Club Settings Width Anomaly:**
```
Location: src/app/(app)/clubs/[id]/settings/page.tsx:86-87
Code: <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
Impact: Page feels noticeably narrower than other Club subpages
Severity: P0 — breaks domain consistency
```

**[P1] Profile Page Mixed Width:**
```
Location: src/components/profile/profile-page-client.tsx
Issue: Profile content uses full layout width, 
       but Profile Edit uses max-w-3xl
Impact: Navigation between view/edit modes causes layout shift
```

**[P1] Club Profile Vertical Spacing:**
```
Location: src/app/(app)/clubs/[id]/page.tsx:79
Code: <div className="space-y-6 pb-10 pt-12">
Issue: Custom pt-12 overrides standard layout py-6
Impact: Extra top padding creates inconsistent spacing
```

### 3.3 UX Impact Assessment

| Issue | Pages Affected | User Impact |
|-------|----------------|-------------|
| Club Settings narrow width | 1 | Feels cramped vs other settings |
| Profile edit width change | 2 | Jarring transition view→edit |
| Club profile extra padding | 4 (all club subpages) | Vertical rhythm break |

---

## 4. LOADING & PENDING COPY AUDIT

### 4.1 Collected Loading/Pending Texts

| Text | Language | Form | Location | Context |
|------|----------|------|----------|---------|
| `Загрузка...` | RU | Noun + ellipsis | `loading.tsx:18`, `spinner.tsx:25` | Global/spinner |
| `Загрузка тарифов...` | RU | Noun | `pricing/page.tsx:41` | Initial load |
| `Загрузка категорий...` | RU | Noun | `event-basic-info-section.tsx:256` | Select loading |
| `Загрузка настроек...` | RU | Noun | `notification-settings-form.tsx:116` | Settings load |
| `Загрузка карты...` | RU | Noun | `map-preview-modal.tsx:104` | Map embed |
| `Сохраняем...` | RU | Verb 1pl | `event-form.tsx:810`, `participant-form.tsx:412` | Form submit |
| `Сохранение...` | RU | Noun | `profile-page-client.tsx:938` | Car save |
| `Удаляем...` | RU | Verb 1pl | `owner-actions.tsx:67` | Delete action |
| `Генерируем правила...` | RU | Verb 1pl | `event-form.tsx:731` | AI generation |
| `Генерация...` | RU | Noun (mobile) | `event-form.tsx:735` | AI mobile |

### 4.2 Pattern Analysis

**[P0] Inconsistent Grammatical Form:**

Three different patterns detected:
1. **Noun form:** `Загрузка...` (Loading)
2. **Verb 1st person plural:** `Сохраняем...` (We are saving)
3. **Mixed:** `Сохранение...` vs `Сохраняем...` for same action

**Examples of inconsistency:**
- Form submit: `Сохраняем...` (verb)
- Car save: `Сохранение...` (noun)
- Delete: `Удаляем...` (verb)
- AI: `Генерируем...` (verb) mobile: `Генерация...` (noun)

### 4.3 Recommended Canonical Style

**PROPOSAL (NOT implemented — audit only):**

Standardize on **Verb 1st person plural** for actions, **Noun** for passive loading:

| Context | Current | Proposed Canonical |
|---------|---------|-------------------|
| Page load | Загрузка... | Загрузка... (OK) |
| Form submit | Сохраняем.../Сохранение... | Сохраняем... |
| Delete | Удаляем... | Удаляем... (OK) |
| Generate | Генерируем.../Генерация... | Генерируем... |
| Data fetch | Загрузка... | Загружаем... |

### 4.4 Ellipsis Consistency

**Finding [P2]:** All texts use standard ellipsis (`...`) consistently. ✅

---

## 5. PAGE LOAD & PERCEIVED PERFORMANCE ANALYSIS

### 5.1 Load Sequence Patterns

#### Pattern A: Static Shell → Progressive Fill (Optimal)

**Used by:**
- Landing Page (`src/app/(marketing)/page.tsx`)
- Event Detail (`src/app/(app)/events/[id]/page.tsx`)
- Club Profile (`src/app/(app)/clubs/[id]/page.tsx`)

**Sequence:**
1. Static header + critical content (SSR)
2. Suspense boundaries reveal async sections
3. Skeletons shown during data fetch

**Assessment:** ✅ GOOD — Best UX pattern

#### Pattern B: Full Client-Side Loading

**Used by:**
- Events List (`src/app/(app)/events/page.tsx`)
- Clubs List (`src/app/(app)/clubs/page.tsx`)
- Pricing (`src/app/(app)/pricing/page.tsx`)
- Profile (`src/app/(app)/profile/page.tsx`)

**Sequence:**
1. Page mounts (minimal static content)
2. `useEffect` triggers data fetch
3. Loading state shown
4. Content renders

**Assessment:** ⚠️ ACCEPTABLE — Causes initial flash

#### Pattern C: SSR with Redirect

**Used by:**
- Profile Page (`getCurrentUser()` check → redirect)
- Club Settings (`getCurrentUser()` + role check → redirect)

**Assessment:** ✅ GOOD — Auth handled server-side

### 5.2 Suspense Boundary Audit

| Page | Suspense Used | Fallback Quality |
|------|---------------|------------------|
| Landing | ✅ `<UpcomingEventsSkeleton />` | ✅ Matching skeleton |
| Event Detail | ✅ `<EventParticipantsSkeleton />` | ✅ Matching skeleton |
| Club Profile | ✅ `<ClubMembersPreviewSkeleton />` | ✅ Matching skeleton |
| Club Members | ✅ `<ClubMembersPageSkeleton />` | ✅ Matching skeleton |
| Club Events | ✅ `<ClubEventsPageSkeleton />` | ✅ Matching skeleton |
| Events List | ❌ Client-side loading | `<EventCardSkeletonGrid />` |
| Clubs List | ❌ Client-side loading | `<ClubCardSkeleton />` |

### 5.3 Layout Stability Issues

**[P1] Events Grid Skeleton Mismatch:**
```
Location: src/components/events/events-grid.tsx
Issue: Skeleton count (6) may not match actual results
Impact: Content jump when real data loads
```

**[P2] Profile Stats Grid:**
```
Location: src/components/profile/profile-page-client.tsx:614-633
Issue: No height reservation for stats cards
Impact: Minor CLS when stats load
```

### 5.4 Cross-Page Consistency

| Aspect | Consistent? | Notes |
|--------|-------------|-------|
| Skeleton animation | ✅ Yes | `animate-pulse` everywhere |
| Skeleton colors | ✅ Yes | `#F7F7F8` / `bg-[#F7F7F8]` |
| Loading spinner | ✅ Yes | `<Spinner />` component |
| DelayedSpinner usage | ⚠️ Partial | Used in events/clubs, not forms |

---

## 6. DESIGN SYSTEM VIOLATIONS INDEX

### 6.1 Color Violations

| File | Line | Violation | Should Be |
|------|------|-----------|-----------|
| `pricing/page.tsx` | 49 | `#EF4444` | `var(--color-danger)` |
| `pricing/page.tsx` | 57,69,73 | `#1F2937` | `var(--color-text)` |
| `pricing/page.tsx` | 111 | `#FF6F2C` hardcoded | `var(--color-primary)` |
| `not-found.tsx` | 66 | `#0F172A` | `var(--color-text)` |
| `event-card-skeleton.tsx` | 11,14,21,25,45 | `#F7F7F8` | `var(--color-bg-subtle)` |
| `profile-skeleton.tsx` | 12,15,19,22,29,43,56,61-63 | `#F7F7F8` | `var(--color-bg-subtle)` |
| `clubs/page.tsx` | 267 | `#1F2937` | `var(--color-text)` |

### 6.2 Typography Violations

| File | Line | Issue |
|------|------|-------|
| `profile/edit/page.tsx` | 173 | `<h1>` without utility class |
| `profile/edit/page.tsx` | 184 | `<h3>` without utility class |
| `create-club-page-content.tsx` | 57 | Inline `text-3xl font-bold` |
| `pricing/page.tsx` | 57 | `text-3xl font-bold` inline |

### 6.3 Spacing Violations

| File | Line | Issue |
|------|------|-------|
| `clubs/[id]/page.tsx` | 79 | Custom `pt-12` breaks layout rhythm |
| `clubs/[id]/members/page.tsx` | 89 | Custom `pt-12` duplicated |
| `clubs/[id]/events/page.tsx` | 89 | Custom `pt-12` duplicated |

### 6.4 Border Radius Consistency

Standard: `rounded-xl` (12px per `--radius: 0.75rem`)

**Finding [P2]:** Generally consistent, but some components use `rounded-lg` (8px) or `rounded-2xl` (16px).

---

## 7. COMPONENT DUPLICATION INDEX

### 7.1 Near-Duplicate Components

| Component A | Component B | Similarity | Recommendation |
|-------------|-------------|------------|----------------|
| `ClubMembersPreviewAsync` | `ClubMembersContent` | ~60% | Extract shared member rendering |
| `ClubEventsPreviewAsync` | `ClubEventsContent` | ~50% | Extract shared event list |
| Car form in `profile-page-client.tsx` | Car edit form (same file) | 95% | Extract `CarForm` component |

### 7.2 Inline Reimplementations

**[P1] Car Add/Edit Forms Duplication:**
```
Location: src/components/profile/profile-page-client.tsx
Lines: 839-941 (add form), 956-1055 (edit form)
Issue: Nearly identical form structure duplicated
Recommendation: Extract <CarForm mode="create|edit" /> component
```

**[P2] Back Button Pattern:**
```
Locations:
- clubs/create/page.tsx (via CreateClubPageContent)
- clubs/[id]/page.tsx
- clubs/[id]/members/page.tsx
- clubs/[id]/events/page.tsx
- clubs/[id]/settings/page.tsx
- profile/edit/page.tsx

Issue: Each has slightly different implementation
Recommendation: Create <BackButton href="" label="" /> component
```

### 7.3 Missing Primitive Components

| Missing Component | Used Instead | Occurrences |
|-------------------|--------------|-------------|
| `<PageHeader />` | Inline div+h1+p | 8+ |
| `<StatCard />` | Inline Card+CardContent | 6+ |
| `<BackButton />` | Inline Link/Button | 6+ |
| `<EmptyState />` | Inline div | 5+ |

---

## 8. PAGE-BY-PAGE AUDIT

### 8.1 Landing Page (`/`)

**File:** `src/app/(marketing)/page.tsx`  
**Domain:** Marketing  
**Purpose:** Hero, features, upcoming events, CTA

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ✅ Correct | Full-width sections with `page-container` |
| Typography | ✅ Good | Uses `heading-hero`, `heading-section` |
| Colors | ⚠️ Minor | Some `#111827` hardcoded |
| Loading | ✅ Good | Suspense + skeleton for events |
| Responsiveness | ✅ Good | Mobile-first grid |

**Findings:** None critical

---

### 8.2 Events List (`/events`)

**File:** `src/app/(app)/events/page.tsx` → `events-page-client.tsx`  
**Domain:** Events  
**Purpose:** List all events with filters/search

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ✅ Correct | Uses layout's `page-container` |
| Typography | ✅ Good | `heading-hero` for title |
| Loading | ✅ Good | `EventCardSkeletonGrid` |
| Filters | ⚠️ P1 | SelectTrigger h-10 vs standard h-12 |
| Empty state | ✅ Good | Centered with icon + CTA |

**Findings:**
- **[P1]** Filter dropdowns use h-10 instead of h-12

---

### 8.3 Event Detail (`/events/[id]`)

**File:** `src/app/(app)/events/[id]/page.tsx`  
**Domain:** Events  
**Purpose:** Single event view with registration

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ✅ Correct | Uses layout's `page-container` |
| Typography | ✅ Good | `heading-h1` for title |
| Loading | ✅ Good | Suspense for participants |
| Layout | ✅ Good | 2-column grid on desktop |
| Mobile | ✅ Good | Stacked layout |

**Findings:** None critical

---

### 8.4 Create Event (`/events/create`)

**File:** `src/app/(app)/events/create/page.tsx` → `create-event-client.tsx`  
**Domain:** Events  
**Purpose:** Multi-step event creation form

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ✅ Correct | Uses layout |
| Form | ✅ Good | Sectioned cards with numbers |
| Typography | ⚠️ P2 | Uses `heading-hero` inline |
| Loading | ⚠️ P1 | No skeleton for initial data load |
| Submit | ✅ Good | `Сохраняем...` pending text |

**Findings:**
- **[P1]** Categories/brands load with inline "Загрузка..." text, no skeleton

---

### 8.5 Edit Event (`/events/[id]/edit`)

**File:** `src/app/(app)/events/[id]/edit/page.tsx`  
**Domain:** Events  
**Purpose:** Edit existing event

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ✅ Correct | Uses layout |
| Form | ✅ Good | Same structure as create |
| Auth | ✅ Good | Server-side redirect |

**Findings:** Same as Create Event

---

### 8.6 Clubs List (`/clubs`)

**File:** `src/app/(app)/clubs/page.tsx`  
**Domain:** Clubs  
**Purpose:** List all clubs with search/filter

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ✅ Correct | Uses layout |
| Typography | ✅ Good | `heading-h1` |
| Stats | ⚠️ P2 | Hardcoded styling |
| Loading | ✅ Good | `ClubCardSkeleton` |
| Search | ✅ Good | h-12 input |

**Findings:**
- **[P2]** Stats cards use inline styling instead of component

---

### 8.7 Create Club (`/clubs/create`)

**File:** `src/app/(app)/clubs/create/page.tsx`  
**Domain:** Clubs  
**Purpose:** Club creation form

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ⚠️ P2 | Extra wrapper with bg color |
| Typography | ⚠️ P2 | Inline `text-3xl font-bold` |
| Form | ✅ Good | Uses ClubForm component |

**Findings:**
- **[P2]** `min-h-screen bg-[var(--color-bg-subtle)]` redundant with layout
- **[P2]** Typography not using utility classes

---

### 8.8 Club Profile (`/clubs/[id]`)

**File:** `src/app/(app)/clubs/[id]/page.tsx`  
**Domain:** Clubs  
**Purpose:** Public club profile

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ⚠️ P1 | Custom `pt-12` padding |
| Typography | ✅ Good | Uses heading components |
| Loading | ✅ Good | Suspense + skeletons |
| Sections | ✅ Good | Proper structure |

**Findings:**
- **[P1]** `pt-12` breaks layout rhythm (should be handled by layout)

---

### 8.9 Club Members (`/clubs/[id]/members`)

**File:** `src/app/(app)/clubs/[id]/members/page.tsx`  
**Domain:** Clubs  
**Purpose:** Club member management

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ⚠️ P1 | Same `pt-12` issue |
| Auth | ✅ Good | Server-side check |
| Loading | ✅ Good | Section skeletons |

**Findings:**
- **[P1]** Same padding issue as Club Profile

---

### 8.10 Club Events (`/clubs/[id]/events`)

**File:** `src/app/(app)/clubs/[id]/events/page.tsx`  
**Domain:** Clubs  
**Purpose:** Club event listing

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ⚠️ P1 | Same `pt-12` issue |
| Loading | ✅ Good | Suspense + skeleton |
| Empty state | ✅ Good | With CTA |

**Findings:**
- **[P1]** Same padding issue as Club Profile

---

### 8.11 Club Settings (`/clubs/[id]/settings`)

**File:** `src/app/(app)/clubs/[id]/settings/page.tsx`  
**Domain:** Clubs/Billing  
**Purpose:** Club configuration and billing

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ❌ P0 | Custom `max-w-3xl` breaks consistency |
| Typography | ✅ Good | `text-3xl font-bold` inline |
| Sections | ✅ Good | Clear card structure |
| Billing UI | ✅ Good | Clear status badges |

**Findings:**
- **[P0]** Width dramatically narrower than other club pages
- **[P2]** Typography uses inline styles

---

### 8.12 Pricing (`/pricing`)

**File:** `src/app/(app)/pricing/page.tsx`  
**Domain:** Billing  
**Purpose:** Pricing plans display

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ✅ Correct | Uses layout |
| Typography | ⚠️ P1 | Multiple hardcoded colors |
| Loading | ⚠️ P1 | Text-only, no skeleton |
| Cards | ⚠️ P2 | Inline styling |

**Findings:**
- **[P1]** Multiple hardcoded hex colors (`#1F2937`, `#EF4444`, `#374151`)
- **[P1]** Loading state is just text, no skeleton
- **[P2]** Button uses inline bg/hover colors

---

### 8.13 Profile (`/profile`)

**File:** `src/app/(app)/profile/page.tsx` → `profile-page-client.tsx`  
**Domain:** User  
**Purpose:** User profile with cars/settings

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ✅ Correct | Uses layout |
| Loading | ✅ Good | ProfileContentSkeleton |
| Tabs | ✅ Good | Proper tab component |
| Cars | ⚠️ P1 | Duplicated form code |

**Findings:**
- **[P1]** Car add/edit forms ~95% duplicate code
- **[P2]** Some inline styling in stats grid

---

### 8.14 Profile Edit (`/profile/edit`)

**File:** `src/app/(app)/profile/edit/page.tsx`  
**Domain:** User  
**Purpose:** Edit user profile

| Aspect | Status | Notes |
|--------|--------|-------|
| Container | ⚠️ P1 | Custom `max-w-3xl` |
| Typography | ⚠️ P2 | No utility classes on headings |
| Loading | ⚠️ P2 | Spinner only, no skeleton |

**Findings:**
- **[P1]** Width change from Profile view creates jarring transition
- **[P2]** `<h1>` and `<h3>` without heading utilities

---

## 9. PRIORITIZED FINDINGS

### 9.1 P0 — Critical (Breaks UX consistency or system rules)

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| P0-1 | Club Settings uses custom max-w-3xl bypassing layout | `settings/page.tsx:86-87` | Feels cramped vs other pages |
| P0-2 | Inconsistent loading text grammar (noun vs verb) | Multiple files | User confusion |
| P0-3 | No skeleton for Pricing page loading | `pricing/page.tsx:39-43` | Poor perceived performance |
| P0-4 | Profile view→edit width change causes layout shift | `profile/page.tsx` → `profile/edit/page.tsx` | Jarring UX |
| P0-5 | Car add/edit forms ~95% code duplication | `profile-page-client.tsx:839-1055` | Maintenance burden |

### 9.2 P1 — Significant (Notable inconsistency or technical debt)

| ID | Issue | Location |
|----|-------|----------|
| P1-1 | Custom `pt-12` padding in all Club subpages | `clubs/[id]/*.tsx` |
| P1-2 | SelectTrigger h-10 vs standard h-12 inputs | `events-grid.tsx:169` |
| P1-3 | Hardcoded hex colors in Pricing | `pricing/page.tsx` |
| P1-4 | No skeleton for event form initial data | `event-form.tsx` |
| P1-5 | Hardcoded skeleton colors `#F7F7F8` | `skeletons/*.tsx` |
| P1-6 | Profile edit narrow width inconsistent | `profile/edit/page.tsx` |
| P1-7 | Back button pattern reimplemented 6+ times | Multiple files |
| P1-8 | ClubMembersPreview/Content near-duplication | Club components |
| P1-9 | No PageHeader component extracted | Multiple pages |
| P1-10 | No StatCard component extracted | Profile, Clubs |
| P1-11 | No EmptyState component extracted | Multiple pages |
| P1-12 | Create club page extra wrapper | `create-club-page-content.tsx` |

### 9.3 P2 — Cosmetic (Cleanup or minor improvements)

| ID | Issue | Location |
|----|-------|----------|
| P2-1 | Headings without utility classes | `profile/edit/page.tsx`, `create-club-page-content.tsx` |
| P2-2 | Inline button styling | `clubs/page.tsx:130` |
| P2-3 | Stats cards inline styling | `clubs/page.tsx:140-164` |
| P2-4 | Some `rounded-lg` vs standard `rounded-xl` | Various |
| P2-5 | `#111827` instead of `--color-text` | Multiple files |
| P2-6 | Profile loading spinner-only (no skeleton) | `profile/edit/page.tsx:151-157` |
| P2-7 | Mixed `space-y-6` patterns | Various pages |
| P2-8 | 404 page hardcoded colors | `not-found.tsx` |
| P2-9 | No height reservation for profile stats | `profile-page-client.tsx` |
| P2-10 | AI generation mobile text differs | `event-form.tsx:735` |
| P2-11 | Emoji in ClubCard cities | `club-card.tsx:98` |
| P2-12 | Car form label styling inconsistent | `profile-page-client.tsx` |
| P2-13 | Delete confirm button inline bg colors | `profile-page-client.tsx:1181-1182` |
| P2-14 | Form field error styling variations | Multiple files |
| P2-15 | Select placeholder styling | Various |
| P2-16 | Tooltip component usage inconsistent | Club Events |
| P2-17 | Badge variants proliferation | `badge.tsx` has 20+ variants |
| P2-18 | Icon sizes vary (h-4 to h-6) | Various |

---

## 10. RECOMMENDED NEXT STEPS

> **NOTE:** These are recommendations only. NO code changes made in this audit.

### 10.1 Immediate (P0 Issues)

1. **Unify Club Settings width** — Use standard layout container or document intentional narrow design
2. **Standardize loading text grammar** — Choose verb or noun form, apply consistently
3. **Add Pricing page skeleton** — Create `PricingPageSkeleton` component
4. **Fix Profile edit width** — Either keep same width as view or document transition
5. **Extract CarForm component** — Eliminate 95% duplication

### 10.2 Short-term (P1 Issues)

1. **Audit and fix Club subpage padding** — Remove custom `pt-12`, use layout
2. **Standardize SelectTrigger height** — h-12 everywhere
3. **Replace hardcoded colors** — CSS variables only
4. **Create shared primitives:**
   - `<BackButton />`
   - `<PageHeader />`
   - `<StatCard />`
   - `<EmptyState />`

### 10.3 Medium-term (P2 Issues)

1. **Audit heading usage** — Ensure all use utility classes
2. **Consolidate Badge variants** — Consider grouping by semantic meaning
3. **Standardize icon sizes** — Define canonical sizes (16/20/24)
4. **Create skeleton variants index** — Ensure all use CSS variables

---

## 11. ACCESSIBILITY (HIGH-LEVEL)

### 11.1 Good Practices Observed

- ✅ `sr-only` class used for spinner text
- ✅ `aria-label` on icon buttons
- ✅ Focus-visible styles on buttons
- ✅ Semantic HTML (headings, lists)

### 11.2 Potential Issues

| Issue | Location | Severity |
|-------|----------|----------|
| Missing focus styles on custom inputs | City selects | Medium |
| Icon-only buttons without labels | Some action buttons | Medium |
| Color contrast on muted text | `--color-text-muted` on white | Low |
| No skip links | All pages | Low |

---

## 12. RESPONSIVENESS (HIGH-LEVEL)

### 12.1 Good Practices Observed

- ✅ Mobile-first breakpoints
- ✅ Responsive grid patterns
- ✅ `sm:`, `md:`, `lg:` utility usage
- ✅ Horizontal scroll for stats on mobile (`overflow-x-auto`)

### 12.2 Potential Issues

| Issue | Location | Severity |
|-------|----------|----------|
| Fixed 96px avatar on all screens | Profile header | Low |
| Long table rows may overflow | Participants table | Medium |
| Club card stats grid fixed 2-col | Club card | Low |

---

## APPENDICES

### Appendix A: Files Audited

```
src/app/layout.tsx
src/app/(app)/layout.tsx
src/app/(marketing)/layout.tsx
src/app/(app)/events/[id]/layout.tsx
src/app/(marketing)/page.tsx
src/app/(app)/events/page.tsx
src/app/(app)/events/[id]/page.tsx
src/app/(app)/events/create/page.tsx
src/app/(app)/events/[id]/edit/page.tsx
src/app/(app)/clubs/page.tsx
src/app/(app)/clubs/create/page.tsx
src/app/(app)/clubs/[id]/page.tsx
src/app/(app)/clubs/[id]/members/page.tsx
src/app/(app)/clubs/[id]/events/page.tsx
src/app/(app)/clubs/[id]/settings/page.tsx
src/app/(app)/pricing/page.tsx
src/app/(app)/profile/page.tsx
src/app/(app)/profile/edit/page.tsx
src/app/loading.tsx
src/app/not-found.tsx
src/app/globals.css
+ 40+ component files
```

### Appendix B: Design System Files

```
src/app/globals.css (CSS variables, utilities)
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/badge.tsx
src/components/ui/input.tsx
src/components/ui/dialog.tsx
src/components/ui/spinner.tsx
src/components/ui/skeletons/*.tsx
```

### Appendix C: Loading Text Inventory

| Text | Count | Files |
|------|-------|-------|
| `Загрузка...` | 10 | Multiple |
| `Сохраняем...` | 2 | event-form, participant-form |
| `Сохранение...` | 1 | profile-page-client |
| `Удаляем...` | 1 | owner-actions |
| `Генерируем...` | 1 | event-form |
| `Генерация...` | 1 | event-form (mobile) |

---

**End of Report**

*This audit is READ-ONLY. No code changes were made.*
