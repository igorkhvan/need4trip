# P2: Events Loading Audit

> **Phase:** P2 — Cleanup & Reduction  
> **Type:** Analysis Only (NO CODE CHANGES)  
> **Date:** 2026-01-22  
> **Scope:** Events pages only

---

## Page: /events

### A. Initial Render

- **SSR:** Empty server component wrapper (`page.tsx` returns `<EventsPageClient />`). No SSR data.
- **Client:** Full page rendered by `EventsPageClient`. Data fetched via `useEventsQuery` hook on mount.
- **First paint contains:** Static header (title, description, "Create Event" button), skeleton grid (6 cards).

### B. Data Sources

| Data | Owner | Trigger | Scope | Blocks UI |
|------|-------|---------|-------|-----------|
| Events list | Client (`useEventsQuery`) | on-mount | page | Yes (initial only) |
| Event categories | Client (`EventsGrid` useEffect) | on-mount | filter dropdown | No |
| Cities | Client (derived from events) | post-fetch | filter dropdown | No |

### C. Loading Instruments

- **Page:** `EventCardSkeletonGrid` (6 skeleton cards) — initial load only.
- **Sections:** None (single content area).
- **Controls:** `LoadingBar` (3px height, top position) — refetch/filter transitions. `DelayedSpinner` — filter transitions (300ms delay).

### D. Partial / Background Loading

- **Observed:** 
  - Initial load: Full skeleton grid, blocking.
  - Refetch (filter/tab/page change): LoadingBar + existing content preserved.
  - Categories fetch: Independent, does not block UI.

### E. State Mapping

- **Initial:** Loading = `EventCardSkeletonGrid` skeleton grid.
- **Error:** Inline red text: `<p className="text-red-500">{listError}</p>`.
- **Empty:** Custom empty state card with icon, heading "Ничего не найдено", description, reset button.
- **Retry:** No explicit retry button. Reset search provided for empty state.

### F. SSOT Alignment

- **Aligned:**
  - `SSOT_UI_ASYNC_PATTERNS §3 Pattern C` — Client Fetch with Skeleton.
  - `SSOT_UI_ASYNC_PATTERNS §3 Pattern D` — Background Refetch (LoadingBar, existing content preserved).
  - `SSOT_UX_NORMALIZATION_MATRIX §4.1 LIST` — Skeleton grid for initial load.
  
- **Violations:**
  - Error state: Inline text only. Violates `SSOT_UI_STATES §4.2` (Error container distinct from content), `SSOT_UX_GOVERNANCE §4.3` (preserve surrounding layout, allow retry if recoverable).
  - No retry action for error state.

- **Ambiguities (SSOT gap):**
  - Categories loading state not addressed (currently silent).
  - Error copy "Не удалось загрузить события" — compliant with `SSOT_UI_COPY §4.2`, but no retry.

---

## Page: /events/create

### A. Initial Render

- **SSR:** Blocking. Loads: currentUser, manageableClubs, planLimits (free plan default).
- **Client:** If unauthenticated → `return null` + auth modal triggers.
- **First paint contains:** Credit banner (if applicable), EventForm (dynamically imported, `ssr: false`).

### B. Data Sources

| Data | Owner | Trigger | Scope | Blocks UI |
|------|-------|---------|-------|-----------|
| currentUser | SSR | initial | page | Yes (redirect if null) |
| manageableClubs | SSR | initial | form | Yes |
| planLimits | SSR | initial | form validation | Yes |
| EventForm module | Client (dynamic import) | on-mount | form | Yes (code-split) |
| Event categories | Client (EventForm useEffect) | on-mount | select dropdown | No |
| Cities | Client (EventForm useEffect) | on-mount | select dropdown | No |
| Brands | Client (EventForm useEffect) | on-mount | multi-select | No |
| Currencies | Client (EventForm useEffect) | on-mount | select dropdown | No |
| Vehicle types | Client (EventForm useEffect) | on-mount | select dropdown | No |

### C. Loading Instruments

- **Page:** None (SSR blocking, then dynamic form).
- **Sections:** None.
- **Controls:** 
  - Submit button: `Spinner` + disabled state (ActionController via `isBusy`).
  - Select dropdowns: Internal loading states ("Загрузка..." text placeholder observed in EventForm).

### D. Partial / Background Loading

- **Observed:**
  - Reference data (categories, cities, brands, etc.) loads independently after form mount.
  - No skeleton for form.
  - No partial loading — form waits for SSR data.

### E. State Mapping

- **Initial:** SSR blocking → form renders immediately with SSR data.
- **Error:** Inline error display via `externalError` prop, `AlertDialog` for validation, `PaywallModal` for 402.
- **Empty:** N/A (FORM page per `SSOT_UX_NORMALIZATION_MATRIX §4.3`).
- **Retry:** No explicit retry. User resubmits.

### F. SSOT Alignment

- **Aligned:**
  - `SSOT_UX_NORMALIZATION_MATRIX §4.3 FORM` — Blocking initial load, button-level spinner.
  - `SSOT_UI_ASYNC_PATTERNS §3 Pattern E` — User-Triggered Mutation (localized loading, disabled action controls).
  
- **Violations:**
  - No page-level loading indicator during dynamic import of EventForm. First paint after SSR may show blank area briefly.
  - "Загрузка..." text placeholders in select dropdowns violate `SSOT_UI_COPY §2.2` (Page/Section: ❌ No text).

- **Ambiguities (SSOT gap):**
  - Dynamic import loading state not specified in SSOT.
  - Reference data loading behavior not covered (silent vs. skeleton vs. placeholder).

---

## Page: /events/[id]

### A. Initial Render

- **SSR:** Blocking. Loads: currentUser, guestSessionId, event (with visibility check), ownerUser, participants (for registration check).
- **Client:** Participants section loads via `Suspense` boundary.
- **First paint contains:** Back button, event header (title, badges, info grid), action buttons, progress bar, content grid (description, rules), participants skeleton, sidebar cards.

### B. Data Sources

| Data | Owner | Trigger | Scope | Blocks UI |
|------|-------|---------|-------|-----------|
| currentUser | SSR | initial | page | Yes |
| guestSessionId | SSR | initial | page | Yes |
| event (basic info) | SSR | initial | page | Yes (notFound if null) |
| ownerUser | SSR | initial | organizer card | Yes |
| participants (initial check) | SSR | initial | registration button | Yes |
| participants (list) | SSR+Suspense (`EventParticipantsAsync`) | streaming | participants section | No |

### C. Loading Instruments

- **Page:** None (SSR blocking).
- **Sections:** `EventParticipantsSkeleton` — Suspense fallback for participants card.
- **Controls:** None observed for initial load.

### D. Partial / Background Loading

- **Observed:**
  - Participants section streams independently via Suspense.
  - Other sections render with SSR data immediately.
  - No background refetches observed.

### E. State Mapping

- **Initial:** SSR blocking → full page with participants skeleton.
- **Error:** `notFound()` if event is null. No section-level error handling observed.
- **Empty:** N/A for page. Participants empty state handled in `ParticipantsTableClient`.
- **Retry:** No retry mechanisms observed.

### F. SSOT Alignment

- **Aligned:**
  - `SSOT_UX_NORMALIZATION_MATRIX §4.2 DETAIL` — Server blocking + partial streaming.
  - `SSOT_UI_ASYNC_PATTERNS §3 Pattern B` — SSR + Suspense Streaming (section-level skeleton).
  - `SSOT_UI_ASYNC_PATTERNS §6` — Suspense boundary is section-scoped.
  
- **Violations:**
  - None observed for loading behavior.

- **Ambiguities (SSOT gap):**
  - notFound() behavior not fully specified (visual vs redirect).
  - No error state for partial failures (e.g., if participants fail to load).

---

## Page: /events/[id]/edit

### A. Initial Render

- **SSR:** Blocking. Loads: currentUser (redirect if null), event (notFound if null), ownership check (redirect if not owner), hydratedEvent, manageableClubs, planLimits.
- **Client:** EventForm renders with prepared data.
- **First paint contains:** EventForm with all fields pre-filled.

### B. Data Sources

| Data | Owner | Trigger | Scope | Blocks UI |
|------|-------|---------|-------|-----------|
| currentUser | SSR | initial | page | Yes (redirect if null) |
| event | SSR | initial | form | Yes (notFound if null) |
| hydratedEvent | SSR | initial | form | Yes |
| manageableClubs | SSR | initial | form (read-only display) | Yes |
| planLimits | SSR | initial | form validation | Yes |
| Event categories | Client (EventForm useEffect) | on-mount | select dropdown | No |
| Cities | Client (EventForm useEffect) | on-mount | select dropdown | No |
| Brands | Client (EventForm useEffect) | on-mount | multi-select | No |
| Currencies | Client (EventForm useEffect) | on-mount | select dropdown | No |
| Vehicle types | Client (EventForm useEffect) | on-mount | select dropdown | No |

### C. Loading Instruments

- **Page:** None (SSR blocking).
- **Sections:** None.
- **Controls:** 
  - Submit button: `Spinner` + disabled state (ActionController).
  - Same select dropdown loading as create page.

### D. Partial / Background Loading

- **Observed:**
  - Reference data (categories, cities, etc.) loads independently after form mount.
  - No skeleton for form.
  - Form displays with initial values immediately from SSR.

### E. State Mapping

- **Initial:** SSR blocking → form renders immediately with pre-filled values.
- **Error:** Same as create: `externalError`, `AlertDialog`, `PaywallModal`.
- **Empty:** N/A (FORM page).
- **Retry:** No explicit retry. User resubmits.

### F. SSOT Alignment

- **Aligned:**
  - `SSOT_UX_NORMALIZATION_MATRIX §4.3 FORM` — Blocking initial load, button-level spinner.
  - `SSOT_UI_ASYNC_PATTERNS §3 Pattern A` — Blocking SSR (permission-gated).
  - `SSOT_UI_ASYNC_PATTERNS §3 Pattern E` — User-Triggered Mutation.
  
- **Violations:**
  - Same as create page: "Загрузка..." text placeholders in select dropdowns violate `SSOT_UI_COPY §2.2`.

- **Ambiguities (SSOT gap):**
  - Same as create page: reference data loading behavior not covered.

---

## Summary of Violations

| Page | Violation | SSOT Reference |
|------|-----------|----------------|
| /events | Error state: inline text only, no retry | `SSOT_UI_STATES §4.2`, `SSOT_UX_GOVERNANCE §4.3` |
| /events/create | "Загрузка..." text in dropdowns | `SSOT_UI_COPY §2.2` |
| /events/create | No loading indicator for dynamic import | Not specified in SSOT → ambiguous |
| /events/[id]/edit | "Загрузка..." text in dropdowns | `SSOT_UI_COPY §2.2` |

## Summary of Ambiguities (SSOT gaps)

| Topic | Affected Pages | Description |
|-------|----------------|-------------|
| Dynamic import loading | /events/create | How to handle brief blank area during code-split load |
| Reference data loading | /events/create, /events/[id]/edit | Client-side fetches for dropdowns: silent, skeleton, or placeholder? |
| Categories loading state | /events | Silent load — should there be visual feedback? |
| notFound() visual behavior | /events/[id], /events/[id]/edit | Next.js notFound() — is it SSOT-compliant? |
| Partial failure handling | /events/[id] | What if Suspense section fails? No error boundary observed |

---

**END OF AUDIT**
