# SSOT_EVENTS_UX_V1.1

## Status
- Version: 1.1
- Scope: Events domain only
- Depends on: UX SSOT v1.0
- Type: Addendum
- Authority: Extends UX SSOT v1.0 without modifying its global rules

This document resolves UX ambiguities discovered during **P2 Events Loading Audit**.
It introduces deterministic rules for Events-specific loading and failure behavior.

---

## 1. Dynamic Import Loading (Events)

### Rule
Dynamic imports used on Events pages **MUST render a visual placeholder immediately**.
Blank screens during dynamic import resolution are **FORBIDDEN**.

### Rationale
Dynamic import loading is perceptible as initial page load.
A blank render violates UX determinism and perceived performance expectations.

### Allowed
- Skeleton matching the final section layout
- Structural placeholder (non-interactive)
- Placeholder rendered only for the dynamically imported section

### Forbidden
- Blank screen during dynamic import
- Text-based loading indicators
- Spinner-only placeholders for entire page

### Notes
- This rule applies only to **initial dynamic import resolution**
- Re-entry or cached dynamic imports MAY skip placeholder

---

## 2. Reference Data Loading (Events)

### Rule
Reference data used by Events forms (categories, locations, metadata) **MUST use visual-only inline loading indicators**.

Dropdowns and selectors:
- MAY open while data is loading
- MUST NOT display loading text
- MUST NOT block the entire form

### Rationale
Reference data loading is secondary to page intent.
Blocking the form or using text-based loading introduces unnecessary friction.

### Allowed
- Spinner or visual indicator inside dropdown body
- Disabled options with visual loading state
- Silent loading when interaction is not required

### Forbidden
- Text such as “Загрузка…”, “Loading…”
- Blocking the entire page for reference data
- Conflating EMPTY and LOADING states

### Notes
- EMPTY state MUST be visually distinct from LOADING
- This rule does not mandate skeletons for dropdowns

---

## 3. Partial Failure Handling (Suspense / Streaming)

### Rule
Events pages using Suspense or streaming **MUST provide section-level failure isolation**.

A failure in a streamed section:
- MUST NOT collapse the entire page
- MUST render a local error container

### Rationale
Events pages often aggregate independent data sources.
Partial failure should degrade locally, not globally.

### Allowed
- Section-level error container
- Retry action scoped to the failed section
- Fallback UI defined per section

### Forbidden
- Global error screen for section-only failures
- Silent failure (empty section without explanation)
- Text-only error without container structure

### Notes
- Global error boundary remains authoritative for full-page failures
- This rule does not define visual styling, only behavior

---

## 4. notFound() Contract (Events)

### Rule
Events-related `notFound()` states **MUST use the canonical SYSTEM layout**.

Events notFound pages:
- MUST follow SSOT_UI_STATES system semantics
- MUST provide a clear navigation escape

### Rationale
Events notFound is a system-level state, not a domain-specific empty state.
Consistency with other SYSTEM pages preserves predictability.

### Allowed
- Navigation to Events list
- Navigation to home or dashboard
- Context-aware escape actions

### Forbidden
- Custom narrow layouts
- Inline notFound rendering inside content sections
- Domain-styled “empty” cards for notFound

### Notes
- This rule aligns Events with global SYSTEM UX
- Domain context MAY influence copy, not structure

---

## 5. Non-Goals

This SSOT addendum does NOT attempt to:

- Redesign Events UX flows
- Optimize performance metrics
- Change Events information architecture
- Define visual styling or component structure
- Introduce new global UX patterns

---

## Authority

This document:
- Is authoritative for Events domain only
- Overrides ambiguity in UX SSOT v1.0 for Events
- Does NOT modify global SSOT rules

Execution of these rules requires a separate, explicit **Execution Phase declaration**.
