# SSOT_UI_ASYNC_PATTERNS

> **Single Source of Truth — Async & Loading UX Patterns**
>
> Version: **v1.0 (SKELETON)**  
> Status: **DRAFT / GOVERNANCE**  
> Scope: **Cross-application**  
> Depends on: `SSOT_UX_GOVERNANCE.md`, `SSOT_UI_STRUCTURE.md`

---

## 0. Purpose & Positioning

This document defines **canonical async UX patterns** used across the application.

It standardizes:
- how data is loaded
- how loading is communicated
- how transitions behave
- how perceived performance is preserved

This SSOT **does not** define implementation details (framework hooks, APIs, or components).

---

## 1. Core Principles

### 1.1 No Blank States
The UI must never render a blank screen during async operations.

### 1.2 Perceived Performance > Raw Speed
Async UX is evaluated by user perception, not network metrics.

### 1.3 Deterministic Patterns
Each async scenario must map to exactly one canonical pattern.

### 1.4 Stability Over Motion
Avoid layout shifts and visual jumps during loading and refetch.

---

## 2. Async Lifecycle Taxonomy

Each async operation MUST be classified into one of the following phases:

- **Initial Load** — first render of data
- **Background Refetch** — data refresh without blocking UI
- **User-Triggered Action** — mutation initiated by the user
- **Transition Load** — navigation or filter change
- **Partial Load** — independent section loads

No custom phases are allowed.

---

## 3. Canonical Async Patterns

### Pattern A — Blocking SSR

**Description:**
Data is required to render the page. Rendering is blocked until data is available.

**Allowed UI:**
- Full page shell
- Static header

**Forbidden UI:**
- Skeletons
- Spinners

**Typical Use Cases:**
- Permission-gated pages
- Critical page identity data

---

### Pattern B — SSR + Suspense Streaming

**Description:**
Page shell renders immediately; independent sections stream later.

**Allowed UI:**
- Section-level skeletons
- Stable layout placeholders

**Forbidden UI:**
- Global spinners
- Layout collapse

**Typical Use Cases:**
- Profile pages
- Detail pages with secondary data

---

### Pattern C — Client Fetch with Skeleton

**Description:**
Client component fetches data after mount.

**Allowed UI:**
- Skeletons matching final layout

**Forbidden UI:**
- Spinners without context
- Content flicker

**Typical Use Cases:**
- Lists
- Dashboards

---

### Pattern D — Background Refetch

**Description:**
Data refreshes without blocking interaction.

**Allowed UI:**
- Subtle loading indicators
- Existing data remains visible

**Forbidden UI:**
- Full skeleton replacement
- Clearing content

**Typical Use Cases:**
- Filters
- Pagination

---

### Pattern E — User-Triggered Mutation

**Description:**
User initiates an action that changes state.

**Allowed UI:**
- Localized loading indicators
- Disabled action controls

**Forbidden UI:**
- Global loading overlays
- Page-level spinners

**Typical Use Cases:**
- Form submission
- Join / Leave actions

---

## 4. Loading Indicator Taxonomy

### 4.1 Skeletons

Rules:
- Must structurally match final content
- Must not animate excessively
- Must reserve space

### 4.2 Spinners

Rules:
- Allowed only for localized actions
- Must not replace content
- Must include accessible labels

### 4.3 Loading Bars

Rules:
- Allowed for background refetch
- Must be non-blocking

---

## 5. Transition Behavior

### 5.1 Delayed Indicators

- Loading indicators may appear only after a short delay
- Fast operations must not flash loading UI

### 5.2 Content Persistence

- Existing content must remain visible during refetch
- UI must not reset scroll position unless explicitly required

---

## 6. Suspense Usage Rules

- Suspense boundaries must be section-scoped
- Nested Suspense boundaries are discouraged
- Suspense must not wrap the entire page unless explicitly justified

---

## 7. Error Interaction with Async Patterns

Async patterns must integrate with state handling:

- Loading → Error → Retry
- Loading → Empty

Async UI must not collapse on error.

---

## 8. Accessibility Requirements

- All loading indicators must be accessible
- Screen readers must be notified of loading state
- Repeated announcements are forbidden

---

## 9. Forbidden Patterns

- Spinner-only pages
- Clearing content during refetch
- Multiple loading indicators for one operation
- Indefinite loading without feedback

---

## 10. Enforcement Model

- Each async operation must declare its pattern
- Mixing patterns without justification is forbidden
- Violations block merge

---

## 11. Versioning & Evolution

- v1.0 — Skeleton
- v1.1 — Pattern → page mapping
- v2.0 — Implementation alignment

---

## 12. Non-Goals

This SSOT does **not**:
- define network retries
- define caching strategy
- define framework-specific APIs

---

**END OF SSOT_UI_ASYNC_PATTERNS v1.0 (SKELETON)**

