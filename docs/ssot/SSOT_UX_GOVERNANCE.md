# SSOT_UX_GOVERNANCE.md

Single Source of Truth — UI/UX Governance  
Status: **CANONICAL**  
Version: **1.0**  
Last updated: 2026-01-21  
Applies to: Web App (App Router, Server + Client Components)

---

## 0. Purpose & Scope

This document defines **canonical UI/UX rules** for the application.

It governs:
- page width and layout strategy
- loading & async UX behavior
- error, empty, forbidden, archived states
- cross-page consistency rules
- AI enforcement constraints

This document:
- **does NOT describe current implementation**
- **does NOT guarantee backward compatibility**
- **OVERRIDES any previous design or UX SSOT**

All UI/UX decisions MUST be derived from this document.

---

## 1. Page Taxonomy (Authoritative)

Every page MUST be classified into exactly ONE type.

### 1.1 Page Types

| Type | Description |
|-----|-------------|
| **BROWSE** | Discovery, lists, catalogs, feeds |
| **DETAIL** | Read-only entity view |
| **MANAGEMENT** | Forms, settings, admin, control surfaces |
| **ACTION** | Single-purpose flows (create, join, confirm) |
| **SYSTEM** | Forbidden, not-found, error, maintenance |

Page type MUST be declared implicitly by route purpose.  
No hybrid types are allowed.

---

## 2. Content Width & Layout Rules

### 2.1 Canonical Width Modes

| Mode | Max Width | Usage |
|----|----------|------|
| **STANDARD** | `max-w-7xl (1280px)` | Default for almost all pages |
| **NARROW** | `max-w-3xl (768px)` | **DISALLOWED** by default |
| **FULL** | 100% viewport | Only for special visual cases |

---

### 2.2 Mandatory Width Mapping

| Page Type | Allowed Width |
|----------|---------------|
| BROWSE | STANDARD |
| DETAIL | STANDARD |
| MANAGEMENT | **STANDARD (MANDATORY)** |
| ACTION | STANDARD |
| SYSTEM | STANDARD |

**RULE (HARD):**  
> MANAGEMENT pages MUST NOT use narrow layouts.

Narrow layouts are considered a **legacy anti-pattern** and are forbidden unless explicitly approved in SSOT.

---

### 2.3 Containers

- All pages MUST be wrapped in `page-container`
- Internal cards MAY NOT redefine page width
- Cards control **density**, not **page geometry**

---

## 3. Loading & Async UX Taxonomy

### 3.1 Async Responsibility Model

| Layer | Responsibility |
|------|----------------|
| Server Component | Structural skeleton, access gating |
| Client Component | Data fetching, transitions, mutations |

Client-side fetch WITHOUT visible loading feedback is **FORBIDDEN**.

---

### 3.2 Canonical Loading States

Each async surface MUST implement **exactly one** of:

| State | Usage |
|-----|------|
| **Skeleton** | Initial load, list fetch, page sections |
| **Inline Spinner** | Small localized mutation |
| **Top Loading Bar** | Background refetch / transition |
| **Delayed Spinner** | Transitions > 300ms |

---

### 3.3 Skeleton Rules

Skeletons MUST:
- match final layout geometry
- avoid spinners-only screens
- use neutral, non-branded visuals
- appear immediately on first load

Skeletons MUST NOT:
- shift layout on resolve
- be reused across incompatible layouts

---

### 3.4 Transitions

- `useTransition` or equivalent MUST be used for:
  - pagination
  - filters
  - tab switches
- Spinner delay MUST be ≥ 300ms
- Content MUST remain visible during refetch

---

## 4. Error, Empty & Forbidden State Taxonomy

### 4.1 Canonical States (Non-Negotiable)

| State | Meaning |
|------|--------|
| **EMPTY** | Valid request, no data |
| **ERROR** | Recoverable failure |
| **FORBIDDEN** | Access denied |
| **ARCHIVED** | Entity exists but frozen |
| **NOT FOUND** | Entity does not exist |

States MUST NOT be mixed.

---

### 4.2 Empty State Rules

Empty states MUST:
- explain *why* there is no content
- provide next action (if applicable)
- never look like an error

Empty states MUST NOT:
- show red/danger styling
- include technical language

---

### 4.3 Error State Rules

Error states MUST:
- be scoped (section-level > page-level)
- allow retry if recoverable
- preserve surrounding layout

Error states MUST NOT:
- collapse content
- redirect silently
- hide actionable context

---

### 4.4 Forbidden State Rules

Forbidden states MUST:
- use canonical SYSTEM layout
- explain access restriction
- provide navigation exit

Forbidden states MUST NOT:
- reuse empty state visuals
- be embedded inline inside content lists

---

### 4.5 Archived State Rules

Archived is **NOT** an error.

Archived states MUST:
- preserve read-only visibility
- disable actions explicitly
- visually indicate frozen status

Archived states MUST NOT:
- hide content
- redirect automatically
- reuse forbidden styling

---

## 5. Cross-Page Normalization Rules

### 5.1 Consistency Guarantees

Across all pages:
- loading patterns are predictable
- error states behave consistently
- widths do not change unexpectedly
- actions are never silently disabled

---

### 5.2 Anti-Patterns (Explicitly Forbidden)

- Narrow layouts for management pages
- Spinner-only loading screens
- Client fetch without skeleton
- Inline forbidden states inside lists
- Error-as-empty visual reuse
- Hidden disabled actions without explanation

---

## 6. AI Enforcement Rules (Cursor / Kilo)

AI tools MUST treat this document as **authoritative**.

### 6.1 Enforcement Examples

- If page type = MANAGEMENT → width = STANDARD
- If client fetch exists → skeleton REQUIRED
- If error state exists → retry or explanation REQUIRED
- If forbidden → SYSTEM layout REQUIRED

Deviation from SSOT requires:
- explicit SSOT amendment
- version bump

---

## 7. Versioning & Change Control

- Any UX rule change requires SSOT version increment
- Temporary exceptions are **NOT ALLOWED**
- Implementation MAY lag behind SSOT, but SSOT must not bend

---

## 8. Status

This document is **CANONICAL**.

All UI/UX decisions, refactors, audits, and AI executions MUST comply with it.

