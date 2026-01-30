# Clubs UI Visual Contract (v2)

**Status:** DRAFT → LOCKED after approval
**Supersedes:** Clubs UI Visual Contract (v1)
**Scope:** Visual composition, UX invariants, and API-aware rendering rules for Clubs pages

This document complements:
- CLUBS_IMPLEMENTATION_BLUEPRINT v1 (Rebuilt)
- SSOT_DESIGN_SYSTEM.md
- SSOT_API.md (v1.5.0+)

It defines **visual, compositional, and data-binding rules**. It is not pixel-level design.

---

## 0. Why v2 Exists (Delta from v1)

Visual Contract v1 correctly defined **layout and visual hierarchy**, but it is insufficient after API expansion because it:

- did not bind sections to **specific APIs / data availability**,
- did not define **empty vs unavailable vs forbidden** rendering rules per section,
- did not explicitly constrain **progressive rendering vs blocking rendering**,
- did not define **guest vs authenticated viewer visual differences**.

v2 closes these gaps and is now **execution-complete** for Cursor-driven UI work.

---

## 1. Global Visual Invariants (All Clubs Pages)

These rules apply to **every Clubs page**, regardless of role or state.

### 1.1 Page Structure

- Single primary vertical flow only.
- No implicit multi-column layouts.
- No visual reordering based on viewport or role.

### 1.2 Header Rules

- Header is ALWAYS the first section.
- Header is visually dominant.
- Header content:
  - Club name
  - Visibility badge (public / private)
  - Archived badge (if applicable)

### 1.3 Section Rules

- Sections are visually isolated blocks.
- Sections MUST NOT overlap responsibilities.
- A section may be:
  - rendered,
  - rendered as empty,
  - hidden (only if explicitly allowed).

### 1.4 CTA Rules

- Exactly ONE primary CTA per page.
- Primary CTA location is fixed by page contract.
- Secondary actions must be visually subordinate.

---

## 2. Rendering Modes (Global)

Every page and section must operate in one of the following rendering modes.

### 2.1 Blocking Render

- Used for: Header, Forbidden, Archived banner.
- Page MUST NOT partially render without these resolved.

### 2.2 Progressive Render

- Used for: preview sections (members, events).
- Sections may stream independently.
- Failure of one section MUST NOT block the page.

### 2.3 Disabled Render

- Section is visible but non-interactive.
- Used when API exists but action is not allowed.

---

## 3. Global States → Visual Mapping

| State | Visual Behavior |
|------|-----------------|
| Loading | Skeletons preserving final layout |
| Forbidden | Full-page forbidden layout, no partial content |
| Archived | Banner + read-only content |
| Empty Data | Section placeholder, not an error |

---

## 4. Club Profile (Public) — Authoritative Contract

This section is **authoritative** for the Club Profile (Public) page.

### 4.1 Page Layout (Strict)

```
[ Header ]                 (Blocking, Primary)
──────────────
[ About ]                  (Blocking, Informational)
──────────────
[ Rules / FAQ ]            (Blocking, Informational)
──────────────
[ Members Preview ]        (Progressive, Secondary, Optional)
──────────────
[ Events Preview ]         (Progressive, Secondary)
──────────────
[ Join / Request CTA ]     (Blocking, Primary)
```

Order is STRICT and MUST NOT be changed.

---

## 5. Section-by-Section Visual + Data Contract

### 5.1 Header

- Data source: `GET /api/clubs/[id]` (API-016)
- Blocking render.
- If API-016 returns 403 → Forbidden page.
- If archived → show archived badge.

### 5.2 About

- Data source: `GET /api/clubs/[id]`
- If empty → render empty placeholder (NOT hidden).

### 5.3 Rules / FAQ

- Data source: `GET /api/clubs/[id]`
- Optional content.
- If missing → section still rendered with empty state.

### 5.4 Members Preview

- Data source: `GET /api/clubs/[id]/members/preview` (API-053)
- Progressive render.
- If API not accessible → hide entire section.
- If zero members → render empty placeholder.

### 5.5 Events Preview

- Data source: `GET /api/events?club_id=...`
- Progressive render.
- If zero events → render empty placeholder.

### 5.6 Join / Request CTA

- Data source:
  - Viewer context from `GET /api/clubs/[id]`
  - Action: `POST /api/clubs/[id]/join-requests` (API-052)
- Blocking render.
- States:
  - unauthenticated → prompt to log in
  - already member → CTA hidden
  - pending request → disabled CTA with status
  - archived → CTA hidden

---

## 6. Forbidden & Archived Rules (Strict)

### 6.1 Forbidden

- Triggered by 403 from API-016.
- No sections rendered.
- No previews rendered.

### 6.2 Archived

- Banner at top of page.
- Join CTA hidden.
- All other sections read-only.

---

## 7. Explicitly Forbidden UI (Hard Rules)

On Club Profile (Public), it is FORBIDDEN to display:

- edit buttons of any kind
- member management UI
- billing or subscription UI
- products, services, or marketplace sections
- admin-only or owner-only controls

---

## 8. AI Executor Rules (Visual)

AI executors MUST:

- follow layout and order strictly,
- bind each section to its defined API only,
- NOT infer behavior from data shape,
- STOP and report if an API response contradicts this contract,
- NOT introduce additional UI elements or states.

Any deviation is incorrect execution.

