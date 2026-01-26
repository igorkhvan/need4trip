# Clubs UI Visual Contract — Club Profile (v6.1)

**Status:** LOCKED (Phase 9B — COMPLETE & FROZEN)  
**Version:** v6.1  
**Last Updated:** 2026-01-24  
**Supersedes:** Public Club Profile (pre-v1)  
**Aligned with:**
- SSOT_CLUBS_DOMAIN.md
- SSOT_API.md
- CLUBS_IMPLEMENTATION_BLUEPRINT v1 (Rebuilt)
- CLUBS_UI_VISUAL_CONTRACT V4 — MEMBERS
- CLUBS_UI_VISUAL_CONTRACT V5 — MEMBERSHIP REQUESTS

**Scope:** Club Profile page (`/clubs/[id]`) — aggregation & UX finalization

This document is a **binding visual execution contract** for the **Club Profile page**.
It defines **visual structure, CTA rules, visibility, and navigation entry points**.
It does **NOT** define business logic, RBAC rules, API behavior, or data persistence.

---

## Change Log

### v6.1 (2026-01-24)
- Clarified inline error handling rules for Club Profile (§10): inline errors allowed for data fetch and inline operations; toast reserved for form submission flows
- Documented Back Button as canonical Club page element (§3.1): required navigation element with standard placement and styling
- Canonicalized external links placement in Club Header (§7): telegramUrl and websiteUrl rendered in Club Header ONLY

### v6 (v1 Final)
- Initial locked version for Club Profile

---

## 1. Role of the Page (Non-Negotiable)

The Club Profile page is an **aggregation and navigation surface**.

It MUST:
- reflect the user's current state relative to the club,
- expose navigation entry points for management,
- remain **read-only**.

It MUST NOT:
- perform management actions,
- contain forms,
- mutate state.

---

## 2. Global Invariants

- UI reflects backend state only.
- No frontend role inference.
- No optimistic mutations.
- No management actions on this page.
- All permissions enforced by backend responses.
- If `archivedAt !== null`, page is **globally read-only**.

---

## 3. Page Structure (Strict)

Fixed vertical order:

[ Back Button ]
[ Archived Banner (conditional) ]
[ Club Header ]
[ Primary CTA Zone ]
────────────────────────
[ About Section ]
────────────────────────
[ Members Preview ]
────────────────────────
[ Events Preview ]

- Order MUST NOT change.
- No additional sections allowed.

### 3.1 Back Button (Canonical)

Back Button is a **canonical, required** element for Club Profile.

| Property | Value |
|----------|-------|
| **Placement** | First element in page container |
| **Behavior** | Navigational only (no side effects) |
| **Styling** | Muted text with ArrowLeft icon |
| **Target** | Context-dependent (e.g., clubs list, previous page) |

Club Profile follows the same Back Button pattern as other Club pages.

---

## 4. Archived State

If `club.archivedAt !== null`:

- Archived banner MUST be shown at the top (after Back Button).
- Primary CTA Zone MUST be hidden.
- All entry points MUST be hidden or disabled.
- Page remains fully readable.

---

## 5. Primary CTA Zone (Contextual)

### General Rules
- Maximum **one CTA**.
- CTA is **state-driven**.
- CTA is the only interactive element for non-admin users.

---

### 5.1 Guest (not a member)

| Condition | CTA |
|---------|-----|
| `openJoinEnabled = true` | **Join club** |
| `openJoinEnabled = false` | **Request to join** |

- CTA is primary.
- No explanatory text.

---

### 5.2 Pending Membership

| Condition | CTA |
|---------|-----|
| pending request exists | **Pending approval** (disabled) |

- CTA disabled.
- No secondary actions.
- No cancel button on profile page.

---

### 5.3 Member

- Primary CTA Zone MUST be hidden.

---

### 5.4 Owner / Admin

- Primary CTA Zone MUST be hidden.
- Owners/Admins do NOT see join-related CTAs.

---

## 6. Owner/Admin Entry Points

### Purpose
Provide **navigation**, not actions.

### Visibility
- Visible ONLY to Owner/Admin.
- Hidden for Guest, Pending, Member.

---

### Entry Points (Inline, Secondary)

Allowed links:
- **Manage members** → `/clubs/[id]/members`
- **Club settings** → `/clubs/[id]/settings`

Rules:
- Styled as secondary actions (links or subtle buttons).
- MUST NOT look like destructive or primary CTAs.
- MUST NOT be shown when club is archived.

---

## 7. About Section

- Read-only.
- Displays:
  - description
  - cities
- No edit affordances.

### 7.1 External Links Placement (Canonical)

Club-level external links are rendered in **Club Header ONLY**.

| Field | Render Location | Notes |
|-------|-----------------|-------|
| `telegramUrl` | Club Header | Icon/link in header actions |
| `websiteUrl` | Club Header | Icon/link in header actions |

**Canonical placement rule:**
- External links (telegramUrl, websiteUrl) MUST NOT be rendered in About section.
- External links MUST NOT be rendered in other sections.
- Club Header is the single canonical location for club-level external links.

---

## 8. Members Preview

- Read-only preview.
- Displays:
  - avatars
  - total count
- Links to:
  - Members page (if user has access)
- No role badges.
- No management controls.

---

## 9. Events Preview

- Read-only preview.
- Displays:
  - upcoming events
- Links to:
  - Club Events page
- No creation or edit controls.

---

## 10. Error & Edge Handling

### 10.1 Error Handling Rules

| Error Type | Handling | Notes |
|------------|----------|-------|
| Data fetch errors | Inline error message | Displayed within page content area |
| Inline operation errors | Inline error message | E.g., membership actions, follow/unfollow |
| Form submission errors | Toast notification | Create/edit flows only (not applicable to read-only profile) |
| Unauthorized (401) | Redirect to login | Standard auth flow |
| Not Found (404) | notFound() | Standard Next.js pattern |
| Forbidden (403) | Redirect or forbidden page | Existing behavior |

### 10.2 Inline Error Clarification

- **Inline error UI** is the canonical pattern for Club Profile.
- Data fetching failures MUST display inline error messages.
- Inline operations (membership actions visible to user) MUST use inline error messages.
- **Toast notifications are reserved for form submission flows only** (create/edit pages, not Club Profile).
- Partial data failures MUST NOT break layout.

---

## 11. Explicitly Forbidden UI

The following are strictly forbidden on Club Profile:

- Approve / Reject actions
- Membership request list
- Forms or inputs
- Edit buttons
- Billing actions
- Role labels
- Debug or status chips
- "Coming soon" placeholders

---

## 12. Design System Rules

- Use existing design system components only.
- Use CSS variables exclusively.
- No hardcoded colors.
- Match typography and spacing of other club pages.

---

## 13. AI Executor Rules

AI executors (Cursor, etc.) MUST:

- Follow this contract verbatim.
- Treat this page as read-only aggregation.
- STOP if tempted to add management behavior.
- NOT infer permissions on frontend.
- NOT change section order.

Any deviation is an implementation defect.

---

**LOCK NOTICE**  
This document is LOCKED for Club Profile v6.1.  
Any changes require a new versioned contract (v6.2+) and SSOT alignment.
