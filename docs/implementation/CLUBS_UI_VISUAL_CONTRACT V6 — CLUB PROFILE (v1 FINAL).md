# Clubs UI Visual Contract — Club Profile (v1 Final)

**Status:** LOCKED  
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

## 1. Role of the Page (Non-Negotiable)

The Club Profile page is an **aggregation and navigation surface**.

It MUST:
- reflect the user’s current state relative to the club,
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

---

## 4. Archived State

If `club.archivedAt !== null`:

- Archived banner MUST be shown at the top.
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
  - external links (telegram, website)
- No edit affordances.

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

- 403 / 404 → redirect or standard forbidden page (existing behavior).
- Partial data failures MUST NOT break layout.
- No inline error messaging on this page.

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
- “Coming soon” placeholders

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
This document is LOCKED for Club Profile v1 Final.  
Any changes require a new versioned contract (v2) and SSOT alignment.