# SSOT_UX_NORMALIZATION_MATRIX.md

> **Single Source of Truth — UX Normalization Matrix**
>
> Version: 1.0
> Status: Canonical
> Scope: Cross-page UX consistency
>
> This document normalizes UI/UX behavior across all product pages by mapping:
> - layout width
> - loading strategy
> - async feedback
> - empty / error / forbidden states
> - copy source
> - structural patterns
>
---

## 1. Matrix Purpose

The UX Normalization Matrix serves as:
- a **verification tool** (audit & violations)
- a **design contract** between product, design, and engineering
- a **Cursor / Kilo execution reference**

No page may define its own UX behavior outside this matrix.

---

## 2. Canonical Page Categories

All pages MUST belong to exactly one category.

| Category | Description |
|--------|-------------|
| LIST | Browsing, discovery, search results |
| DETAIL | Read-only entity view |
| FORM | Create / edit / input-heavy flows |
| MANAGEMENT | Settings, members, admin control |
| ACTION | Narrow, goal-focused action pages |

---

## 3. Canonical Layout Rules (Global)

| Rule | Canonical Value |
|----|----------------|
| Container | `.page-container` |
| Max width (default) | `max-w-7xl` |
| Narrow width | ❌ Forbidden |
| Vertical spacing | `space-y-6` |
| Section card | `rounded-xl border bg-white p-6 shadow-sm` |

❗ **Exception**: Narrow width (`max-w-3xl`) is forbidden globally.

---

## 4. Normalization Matrix

### 4.1 LIST Pages

| Property | Canonical |
|-------|-----------|
| Width | max-w-7xl |
| Initial load | Skeleton grid |
| Transition | Content preserved + delayed spinner |
| Empty | Empty State Card |
| Error | Inline section error + Retry |
| Forbidden | Full-page Forbidden |
| Copy | SSOT_UI_COPY |
| Async pattern | Client-side fetch + transition |

**Pages**:
- `/clubs`

---

### 4.2 DETAIL Pages

| Property | Canonical |
|-------|-----------|
| Width | max-w-7xl |
| Initial load | Server blocking + partial streaming |
| Async sections | Suspense per section |
| Empty | Section-level empty states |
| Error | Section-level error |
| Forbidden | Full-page Forbidden |
| Copy | SSOT_UI_COPY |
| Async pattern | Server + Suspense |

**Pages**:
- `/clubs/[id]`

---

### 4.3 FORM Pages

| Property | Canonical |
|-------|-----------|
| Width | max-w-7xl |
| Layout | Single-column form cards |
| Initial load | Blocking (data required) |
| Submit loading | Button-level spinner |
| Error | Inline form error |
| Success | Toast or inline success |
| Empty | ❌ Not applicable |
| Forbidden | Redirect or full-page |
| Copy | SSOT_UI_COPY |

**Pages**:
- `/clubs/create`
- `/events/[id]/edit`

---

### 4.4 MANAGEMENT Pages

| Property | Canonical |
|-------|-----------|
| Width | max-w-7xl |
| Layout | Sectioned cards |
| Initial load | Blocking header + skeleton sections |
| Async | Per-section loading |
| Error | Per-section error |
| Forbidden | Full-page Forbidden |
| Archived | Banner + disabled actions |
| Copy | SSOT_UI_COPY |

**Pages**:
- `/clubs/[id]/members`
- `/clubs/[id]/events`
- `/clubs/[id]/settings`

---

### 4.5 ACTION Pages

| Property | Canonical |
|-------|-----------|
| Width | max-w-7xl |
| Layout | Focused card |
| Initial load | Blocking |
| Loading | Button-level only |
| Error | Inline |
| Success | Redirect or confirmation |
| Empty | ❌ Not applicable |
| Forbidden | Full-page |
| Copy | SSOT_UI_COPY |

**Pages**:
- (future payment / confirmation flows)

---

## 5. Cross-Cutting Normalizations

### 5.1 Loading

| Context | Rule |
|------|-----|
| Page | Skeleton, no text |
| Section | Skeleton |
| Button | Spinner + loading copy |
| Inline | Spinner only |

Source of truth: **SSOT_UI_ASYNC_PATTERNS**

---

### 5.2 Errors

| Level | Handling |
|----|----------|
| Page | Forbidden or full error |
| Section | Inline error block |
| Action | Inline error message |

Source of truth: **SSOT_UI_STATES** + **SSOT_UI_COPY**

---

### 5.3 Empty States

| Scope | Rule |
|----|-----|
| Page | Empty card centered |
| Section | Section empty placeholder |
| Form | ❌ Forbidden |

---

## 6. Enforcement Rules

- Every page MUST be mapped to this matrix
- Any deviation is a **UX violation**
- Violations must be fixed OR the SSOT updated
- Cursor / Kilo prompts MUST reference:
  - page category
  - normalization row

---

## 7. Next Step

👉 **UX Violations Audit**
- Map existing pages → matrix
- List deviations
- Generate refactor backlog

---

END OF DOCUMENT

