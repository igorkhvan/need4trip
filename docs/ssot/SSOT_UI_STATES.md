# SSOT_UI_STATES

> **Single Source of Truth — UI States (Error / Empty / Forbidden / Special)**
>
> Version: **v1.0 (SKELETON)**  
> Status: **DRAFT / GOVERNANCE**  
> Scope: **Cross-application**  
> Depends on: `SSOT_UX_GOVERNANCE.md`, `SSOT_UI_ASYNC_PATTERNS.md`, `SSOT_UI_STRUCTURE.md`

---

## 0. Purpose & Positioning

This document defines **canonical UI states** that represent non-happy-path situations.

It standardizes:
- how states are classified
- how they are presented
- how they interact with async patterns
- what is allowed and forbidden

This SSOT exists to eliminate:
- ad-hoc error blocks
- inconsistent empty screens
- collapsing layouts on failure
- state-specific UI improvisation

---

## 1. Core Principles

### 1.1 States Are First-Class UI
Error, empty, and forbidden states are **designed states**, not fallbacks.

### 1.2 Layout Must Persist
No state may remove the page shell or collapse layout structure.

### 1.3 One State at a Time
At any given moment, a UI region may represent **only one state**.

---

## 2. Canonical State Taxonomy

All UI states MUST be classified into one of the following categories:

| State | Description |
|------|-------------|
| Empty | Valid state with no data |
| Error | Failure during data fetch or action |
| Forbidden | User lacks access |
| NotFound | Entity does not exist |
| Archived | Entity exists but is inactive |
| Partial | Some data loaded, some failed |
| Pending | Action awaiting confirmation |

No custom states are allowed.

---

## 3. Empty State

### 3.1 Definition

Represents a **valid, non-error condition** where data is absent.

### 3.2 Mandatory Elements

- Clear explanation of absence
- Contextual guidance or next step
- Stable container size

### 3.3 Forbidden Patterns

- Empty screens with no explanation
- Reusing error copy for empty states
- Collapsing sections

---

## 4. Error State

### 4.1 Definition

Represents a failure to load or process data.

### 4.2 Mandatory Elements

- Clear error message
- Retry or recovery action (if applicable)
- Error container distinct from content

### 4.3 Error Scope

| Scope | Behavior |
|------|----------|
| Page-level | Content replaced, shell preserved |
| Section-level | Section replaced, page preserved |
| Inline | Allowed only for form fields |

### 4.4 Forbidden Patterns

- Silent failures
- Console-only errors
- Inline text errors for page-level failures

---

## 5. Forbidden State

### 5.1 Definition

Represents an authorization or permission failure.

### 5.2 Mandatory Elements

- Clear access explanation
- Navigation escape (back / list)
- Visual distinction from error state

### 5.3 Forbidden Patterns

- Redirect-only handling without explanation
- Multiple back buttons with conflicting destinations

---

## 6. NotFound State

### 6.1 Definition

Represents a missing or deleted entity.

### 6.2 Rules

- Must not be visually identical to Forbidden
- Must provide navigation escape

---

## 7. Archived State

### 7.1 Definition

Represents an entity that exists but is no longer active.

### 7.2 Behavior Rules

- Archived state may coexist with other states
- Mutating actions must be disabled
- Read-only access may be preserved

---

## 8. Partial State

### 8.1 Definition

Represents a mixed success scenario.

### 8.2 Rules

- Loaded data must remain visible
- Failed sections must display local state UI
- No global error takeover allowed

---

## 9. Pending State

### 9.1 Definition

Represents an action awaiting confirmation or completion.

### 9.2 Rules

- Must block repeated action
- Must communicate waiting state
- Must resolve to success or error explicitly

---

## 10. Interaction with Async Patterns

Each state must integrate with async patterns:

- Loading → Empty
- Loading → Error
- Action → Pending → Success / Error

State transitions must be explicit.

---

## 11. Accessibility Requirements

- States must be perceivable by screen readers
- Error messages must be announced
- Focus must not be lost on state change

---

## 12. Forbidden Global Patterns

- Full-page blank error screens
- Inline errors replacing sections
- Multiple conflicting state UIs

---

## 13. Enforcement Model

- Each state usage must reference this taxonomy
- Ad-hoc state rendering is forbidden
- Violations block merge

---

## 14. Versioning & Evolution

- v1.0 — Skeleton
- v1.1 — State → page mapping
- v2.0 — Visual alignment

---

## 15. Non-Goals

This SSOT does **not**:
- define exact copy
- define visuals or icons
- define framework error handling APIs

---

**END OF SSOT_UI_STATES v1.0 (SKELETON)**

