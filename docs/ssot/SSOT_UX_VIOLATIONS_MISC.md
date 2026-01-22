# SSOT_UX_VIOLATIONS_MISC.md

**Scope:** App-level, Profile, Pricing, Marketing, System  
**SSOT Version:** UX v1.0  
**Status:** Canonical  
**Purpose:** Consolidated UX Violations Audit for all non-domain-specific pages, strictly evaluated against SSOT v1.0. No new rules introduced.

---

## 1. `/profile`

### Classification
- **Page Type:** PROFILE (READ / PARTIAL MANAGEMENT)
- **Canonical Width:** STANDARD (`max-w-7xl`)
- **Async Pattern:** SSR + Client Hydration
- **Required States:** Loading, Empty, Error, Forbidden

### Violations

#### ❌ Structural Anchoring Missing
- Content rendered directly in flow without section/card framing
- Visual weight too weak for a “personal hub” page

**SSOT reference:**  
`SSOT_UI_STRUCTURE §2.1` — Management-like pages require sectioned layout.

#### ❌ Missing Explicit Empty States
- Optional profile fields render silently when empty
- User cannot distinguish “not filled” vs “not loaded”

**SSOT reference:**  
`SSOT_UI_STATES §3.2` — Empty state must be explicit.

#### ⚠️ Hydration Without Acknowledgement
- No skeleton or placeholder during client hydration
- Content appears abruptly

**SSOT reference:**  
`SSOT_UI_ASYNC_PATTERNS §1.2`

### Severity
- ❌ Structural
- ❌ State handling
- ⚠️ Async UX

---

## 2. `/profile/edit`

### Classification
- **Page Type:** FORM / MANAGEMENT
- **Canonical Width:** STANDARD
- **Async Pattern:** Client-heavy
- **States:** Loading, Error, Success

### Violations

#### ❌ Narrow Width (Critical)
- Uses visually narrow layout (≈ `max-w-3xl`)
- Conflicts with canonical decision: management pages are NOT narrow

**SSOT reference:**  
`SSOT_UI_STRUCTURE §1.3`

#### ❌ CTA Grouping Weak
- Save / Cancel not visually grouped as a primary action zone
- No sticky or emphasized footer

**SSOT reference:**  
`SSOT_UI_STRUCTURE §4.2`

#### ⚠️ Copy Drift
- Loading copy varies (`"Сохраняем…"`, `"Сохранение…"`)
- Not aligned with canonical verb forms

**SSOT reference:**  
`SSOT_UI_COPY §1`

### Severity
- ❌ Critical width violation
- ❌ Action hierarchy
- ⚠️ Copy inconsistency

---

## 3. `/pricing`

### Classification
- **Page Type:** COMMERCE / DECISION
- **Canonical Width:** STANDARD → WIDE
- **Async Pattern:** Mostly static + client actions
- **States:** Loading, Disabled, Error, Success

### Violations

#### ❌ Mixed Page Intent
- Marketing, billing, and management semantics mixed in one flow
- No clear visual zoning

**SSOT reference:**  
`SSOT_UI_STRUCTURE §0.2` — One page, one dominant intent.

#### ❌ Disabled State Without Explanation
- Disabled CTAs not always accompanied by tooltip or inline explanation

**SSOT reference:**  
`SSOT_UI_STATES §2.3`

#### ⚠️ Async Pattern Drift
- Payment waiting handled inconsistently (spinner vs text-only)

**SSOT reference:**  
`SSOT_UI_ASYNC_PATTERNS §3`

### Severity
- ❌ Semantic violation
- ❌ Disabled-state UX
- ⚠️ Async inconsistency

---

## 4. `/events/create`

### Classification
- **Page Type:** FORM (CREATION)
- **Canonical Width:** STANDARD
- **Async Pattern:** Client-heavy
- **States:** Loading, Validation, Error

### Violations

#### ❌ Structural Divergence from `/events/[id]/edit`
- Create and Edit flows differ in:
  - Header layout
  - Spacing
  - CTA placement
- Despite identical form nature

**SSOT reference:**  
`SSOT_UX_NORMALIZATION_MATRIX` — Same page type → same skeleton.

#### ❌ Late Validation Feedback
- Errors appear only after submit
- No proactive inline hints

**SSOT reference:**  
`SSOT_UI_STATES §4.1`

### Severity
- ❌ Structural normalization violation
- ❌ Form UX degradation

---

## 5. `/` (Marketing Root)

### Classification
- **Page Type:** MARKETING
- **Canonical Width:** WIDE / FLUID
- **Async Pattern:** Minimal

### Observations (Non-blocking)

#### ⚠️ Abrupt Transition to App
- No visual or structural bridge between marketing and app experience

**SSOT reference:**  
`SSOT_UX_GOVERNANCE §3` — Perceived continuity

#### ℹ️ Copy Tone Divergence
- Marketing vs App tone clearly different
- Acceptable, but not formally declared

---

## 6. System Pages (`403`, `404`, `500`)

### Classification
- **Page Type:** SYSTEM STATE
- **Canonical Width:** STANDARD
- **Async Pattern:** None

### Violations

#### ❌ Inconsistent Structure
- Different padding, icon sizes, and layout patterns
- Some pages use cards, others bare layouts

**SSOT reference:**  
`SSOT_UI_STATES §1.1`

#### ❌ Missing Escape Consistency
- Back / Home / CTA varies per page
- No guaranteed escape action

**SSOT reference:**  
`SSOT_UI_STATES §1.4`

### Severity
- ❌ Structural inconsistency
- ❌ Navigation clarity violation

---

## 7. Cross-Cutting Violations (Global)

### ❌ Button Size Drift
- `h-10`, `h-11`, `h-12` used without semantic reason

**SSOT reference:**  
`SSOT_UI_STRUCTURE §4.1`

### ❌ Excessive Nesting
- Management pages contain 5–7 wrapper levels
- Reduces readability and maintainability

**SSOT reference:**  
`SSOT_UI_STRUCTURE §5`

### ❌ Async Pattern Fragmentation
- Loading, refetching, pending handled differently across pages

**SSOT reference:**  
`SSOT_UI_ASYNC_PATTERNS §0`

---

## Severity Summary

| Severity | Count | Description |
|--------|-------|-------------|
| ❌ Critical | 7 | Width, structure, semantics |
| ⚠️ Medium | 6 | Async, copy, disabled states |
| ℹ️ Info | 4 | Tone, continuity |

---

## Status

- **Diagnosis:** COMPLETE  
- **SSOT v1.0 Compliance:** ❌ (expected)  
- **Next Logical Artifact:** `SSOT_UI_REFACTOR_BACKLOG.md`

This document is final, canonical, and ready for versioning.
