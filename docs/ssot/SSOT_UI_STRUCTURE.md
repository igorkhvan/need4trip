# SSOT_UI_STRUCTURE

> **Single Source of Truth — UI Structure & Visual Semantics**
>
> Version: **v1.0 (SKELETON)**  
> Status: **DRAFT / GOVERNANCE**  
> Scope: **Cross-application**  
> Depends on: `SSOT_UX_GOVERNANCE.md`

---

## 0. Purpose & Positioning

This document defines **structural UI rules** for the application.

It is **not** a design system, **not** a Tailwind reference, and **not** a component library.

It governs:
- structural consistency
- semantic roles
- size taxonomy
- spacing hierarchy
- nesting limits

This SSOT exists to:
- normalize UI across pages
- reduce layout entropy
- enable deterministic refactoring
- provide enforceable rules for Cursor / Kilo

---

## 1. Scope & Applicability

This SSOT applies to:
- all `page.tsx`
- all layout shells
- all shared UI components
- all interactive controls

This SSOT does **not**:
- define colors or themes
- define animations
- define Tailwind utility classes

---

## 2. Core Principles

### 2.1 Semantic > Visual
UI elements are governed by **role**, not appearance.

### 2.2 Deterministic Structure
The same semantic role must always map to the same structural pattern.

### 2.3 Limited Vocabulary
Only explicitly allowed UI roles and layout patterns may exist.

---

## 3. Button & Action Size Taxonomy

### 3.1 Canonical Sizes

| Size | Purpose |
|-----|--------|
| XS | Inline / row actions (icon-only) |
| SM | Secondary actions in dense layouts |
| MD | Default actions |
| LG | Primary page-level actions |

### 3.2 Mandatory Rules

- Page primary CTA **MUST** be `LG`
- Form submit actions **MUST** be `MD`
- Icon-only actions **MUST** be `XS`
- Mixed sizes inside one action group are **FORBIDDEN**
- Touch target < 44px is **FORBIDDEN**

---

## 4. Action Roles (Semantic)

| Role | Description |
|----|-------------|
| PrimaryAction | Main intent of the page |
| SecondaryAction | Supporting action |
| DestructiveAction | Irreversible or dangerous |
| InlineAction | Row-level or contextual |

Rules:
- Each page **MUST** have at most one PrimaryAction
- DestructiveAction **MUST NOT** be PrimaryAction

---

## 5. Typography Roles (Not Styles)

| Role | Description |
|-----|-------------|
| PageTitle | Single main title per page |
| SectionTitle | Section-level heading |
| CardTitle | Title inside cards |
| Body | Primary content |
| Meta | Secondary info |
| Hint | Helper / guidance text |
| Error | Error messages |

Rules:
- Exactly one `PageTitle` per page
- `SectionTitle` must not visually dominate `PageTitle`
- `Error` must be visually distinct from `Hint`

---

## 6. Spacing Taxonomy

| Level | Usage |
|------|------|
| XS | Inline spacing |
| SM | Inside components |
| MD | Between components |
| LG | Between sections |

Rules:
- Section-to-section spacing **MUST** be `LG`
- Card internal spacing **MUST** be `SM` or `MD`
- Mixing `SM` and `LG` inside same container is **FORBIDDEN**

---

## 7. Layout Pattern Taxonomy

### 7.1 Allowed Patterns

- Page Header
- Section Card
- Dense List
- Action Footer
- Empty State Container
- Error State Container

### 7.2 Forbidden Patterns

- Ad-hoc flex + gap combinations without semantic wrapper
- Page-unique layout structures

---

## 8. Structural Nesting Rules

### 8.1 Nesting Limits

- Max nesting depth inside content sections: **4**
- Wrapper-only `div` without semantic role: **FORBIDDEN**

### 8.2 Canonical Example

❌ `section → div → div → div → Card → CardContent → div`

✅ `section → Card → CardContent`

---

## 9. Page Width Strategy

### 9.1 Canonical Page Widths

| Page Type | Width |
|--------|-------|
| Content / Lists | Standard (max-w-7xl) |
| Management / Settings | Standard (max-w-7xl) |
| Forms / Editors | Standard (max-w-7xl) |

Narrow containers are **FORBIDDEN** unless explicitly justified.

---

## 10. Empty / Error Container Structure

All Empty & Error states must:
- Use a canonical container
- Respect spacing levels
- Never collapse layout

No inline ad-hoc error blocks allowed.

---

## 11. Enforcement Model

### 11.1 Cursor / Kilo Rules

- Any new UI must reference this SSOT
- Structural violations block merge
- Ad-hoc layout patterns are rejected

---

## 12. Versioning & Evolution

- v1.0 — Skeleton
- v1.1 — Page mapping & violations
- v2.0 — Component alignment

---

## 13. Non-Goals

This SSOT does **not**:
- define color palette
- define Tailwind utilities
- define animations
- define branding

---

**END OF SSOT_UI_STRUCTURE v1.0 (SKELETON)**