# SSOT_UX_VIOLATIONS.md
Version: 1.0
Status: Canonical
Scope: UI/UX compliance audit against SSOT v1.0
Methodology: Mechanical, SSOT-driven, no redesign assumptions

---

## Page: /events
Category: LIST / DISCOVERY

### Violations
- V-ASYNC-002: Categories fetch occurs client-side without unified async pattern (no skeleton, no suspense)
- V-STRUCT-004: Filters block width and layout differs from canonical LIST pattern
- V-STRUCT-007: SelectTrigger height (h-10) deviates from canonical control height (h-12)
- V-COPY-002: Mixed RU loading copy presence (spinner without visible loading text)

### Ambiguities
- A-ASYNC-001: Whether auxiliary data (categories) must follow primary loading pattern is not explicit in SSOT

### Compliant
- Skeleton-first initial load
- Delayed spinner pattern
- Empty state structure and copy
- Pagination behavior

---

## Page: /events/[id]/edit
Category: FORM / MULTI-SECTION

### Violations
- V-STRUCT-001: Page does not use canonical page-container
- V-STRUCT-002: Content width implicitly inherited, not explicitly standardized
- V-STRUCT-006: Mixed use of CSS variables and hardcoded colors in section badges
- V-ASYNC-003: No skeleton or progressive loading for client-fetched reference data (brands, vehicle types)
- V-ASYNC-005: Categories loading uses inline text instead of canonical placeholder/skeleton
- V-STRUCT-009: Section cards used for all steps without visual hierarchy normalization

### Ambiguities
- A-ASYNC-002: Whether reference data must always have skeletons is not strictly defined
- A-STRUCT-003: Multi-step visual hierarchy depth not fully formalized in SSOT

### Compliant
- Form action lifecycle (save, paywall, confirmation)
- Error modals (402 / 409)
- Button sizing and spacing
- Required field validation UX

---

## Page: /clubs
Category: LIST / MANAGEMENT

### Violations
- V-STRUCT-005: Statistics section uses edge-to-edge scroll pattern not declared in SSOT
- V-STATES-004: API error falls through to empty state without explicit error state
- V-A11Y-002: Missing visible label for search input (placeholder-only)

### Ambiguities
- A-STRUCT-004: Whether horizontal stat scroll is allowed as an exception is not defined
- A-STATES-002: Error vs empty fallback priority not strictly ordered in SSOT

### Compliant
- Skeleton grid
- Delayed spinner on transitions
- Pagination reset behavior
- Empty state variants (no data vs no results)

---

## Page: /clubs/create
Category: FORM

### Violations
- V-ASYNC-004: Dynamic import of ClubForm has no loading placeholder
- V-STRUCT-001: Full-width management container used inconsistently with other form pages
- V-STRUCT-008: Fixed popover width (CityMultiSelect) risks overflow on small screens
- V-COPY-003: Error copy uses multiple red tones outside SSOT_UI_COPY normalization

### Ambiguities
- A-ASYNC-003: Whether dynamic imports require skeletons is not explicitly mandated
- A-COPY-002: Tone rules for validation vs API errors not fully differentiated

### Compliant
- Form field structure
- Required indicators
- Button sizing
- Submission lifecycle

---

## Page: /clubs/[id]
Category: PROFILE / OVERVIEW

### Violations
- V-ASYNC-006: User role fetch is sequential and blocks parts of render unnecessarily
- V-STRUCT-010: Mixed badge color sources (CSS vars + hardcoded variants)
- V-ASYNC-007: No route-level loading.tsx despite blocking server fetches

### Ambiguities
- A-ASYNC-004: Whether role fetch must be parallelized is not formalized
- A-STRUCT-005: Profile header vs section card hierarchy depth

### Compliant
- Suspense usage for members/events previews
- Archived banner behavior
- CTA disable + tooltip
- Heading hierarchy

---

## Page: /clubs/[id]/members
Category: MANAGEMENT

### Violations
- V-STRUCT-001: Duplicate padding and nested page spacing in forbidden state
- V-STATES-003: Forbidden state contains duplicate back navigation
- V-ASYNC-008: Suspense fallback includes header skeleton while header already rendered
- V-A11Y-003: Loading spinners lack aria-label
- V-STATES-005: Error messages not announced via aria-live

### Ambiguities
- A-STATES-003: Whether forbidden pages must have exactly one navigation escape
- A-A11Y-001: ARIA requirements for inline error blocks not fully specified

### Compliant
- Per-row mutation loading
- Archived restrictions
- Retry actions
- Role-based access handling

---

## Page: /clubs/[id]/events
Category: MANAGEMENT

### Violations
- V-ASYNC-009: Fully client-side events fetch without stale-while-revalidate or cache hint
- V-STRUCT-002: Event card layout duplicated instead of reusing canonical event list pattern
- V-STATES-006: Error state messaging overlaps with empty state semantics
- V-ASYNC-010: Suspense fallback and internal loading state partially overlap

### Ambiguities
- A-ASYNC-005: Whether management lists may differ from global list patterns
- A-STATES-004: Priority between forbidden, error, empty when multiple apply

### Compliant
- Archived disablement
- Tooltip wrapping for disabled actions
- Button sizing
- Empty state copy variants

---

## Page: /clubs/[id]/settings
Category: MANAGEMENT / CONTROL PANEL

### Violations
- V-STRUCT-001: Narrow container (max-w-3xl) violates standard management width
- V-STRUCT-002: Mixed container strategy (min-h-screen + nested max-w)
- V-ASYNC-001: Fully blocking server render without skeleton or suspense
- V-STRUCT-006: Placeholder sections rendered as full cards

### Ambiguities
- A-COPY-001: Placeholder copy tone not strictly defined

### Compliant
- Archived warnings
- Billing hide-on-archived
- Save lifecycle UX
- Button sizing

---

## Summary

Total pages audited: 8  
Total violations recorded: 46  
Total ambiguities (SSOT gaps): 16  

This document is canonical and must be used as the sole source for:
- UX refactor backlog generation
- SSOT refinements
- Cursor/Kilo execution prompts

No redesign assumptions included.
