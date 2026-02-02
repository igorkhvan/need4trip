# Need4Trip — Admin UI Page Inventory (SSOT)

**Status:** DRAFT → CANONICAL (after approval)  
**Version:** **1.0**  
**Scope:** Admin UI — Page Inventory & Boundaries  
**Applies to:** Internal Admin UI (Management pages)  

**Depends on:**
- SSOT_ADMIN_DOMAIN.md v1.0
- SSOT_BILLING_ADMIN_RULES.md v1.0
- SSOT_ADMIN_AUDIT_RULES.md v1.0
- SSOT_UI_PAGE_INVENTORY.md
- SSOT_UX_GOVERNANCE.md
- SSOT_UI_STRUCTURE.md

---

## 0. Purpose & Positioning

This document defines the **canonical set of Admin UI pages** and their **strict responsibilities**.

Admin UI pages:
- are **MANAGEMENT** pages (per `SSOT_UX_GOVERNANCE.md`),
- are **not** part of user-facing navigation,
- exist solely to support Admin V0 scope (READ + GRANT ONLY).

> **If a page is not listed here, it must not exist.**

This SSOT is authoritative for:
- which Admin pages are allowed,
- what each page may show,
- what each page may mutate.

---

## 1. Global UI Constraints (Non-Negotiable)

### 1.1 Page Type & Layout
All Admin pages:
- MUST be classified as **MANAGEMENT** pages,
- MUST use **STANDARD width** (`max-w-7xl`),
- MUST follow `SSOT_UI_STRUCTURE.md` semantics.

Narrow layouts are **forbidden**.

---

### 1.2 Read vs Write Separation
Admin UI MUST clearly separate:
- **read-only surfaces** (observation),
- **write actions** (grant operations).

Implicit mutations (e.g. inline edits) are forbidden.

---

## 2. Admin Page Inventory (Canonical)

Admin UI consists of **exactly** the following pages.

---

### 2.1 Admin Dashboard

**Route:** `/admin`

**Purpose:**
- Entry point to Admin UI
- High-level navigation only

**Content:**
- Links to Users
- Links to Clubs
- Links to Audit Log

**States:**
- Loading
- Forbidden (non-admin access)

**Forbidden:**
- Metrics dashboards
- Aggregated financial reporting

---

### 2.2 Users — Billing View

**Route:** `/admin/users`

**Purpose:**
- Search and select users
- Observe user billing state

**Content (Read-Only):**
- User identity (id, email)
- One-off credits (available / consumed)
- Billing transactions (read-only list)

**Allowed Actions:**
- Navigate to user details
- Initiate **Grant Credit** flow

**Forbidden:**
- Editing user profile
- Editing transactions
- Any access decisions

---

### 2.3 User Detail — Billing

**Route:** `/admin/users/[user_id]`

**Purpose:**
- Detailed billing inspection for a single user

**Content:**
- One-off credits list
- Consumption history
- Related audit records (read-only)

**Allowed Actions:**
- Grant one-off credit (modal / action page)

**Forbidden:**
- Editing or revoking credits
- Forcing credit consumption

---

### 2.4 Clubs — Subscription View

**Route:** `/admin/clubs`

**Purpose:**
- Search and select clubs
- Observe subscription state

**Content (Read-Only):**
- Club identity
- Current plan (identifier)
- Subscription state
- Expiration date

**Allowed Actions:**
- Navigate to club detail
- Initiate **Extend Subscription** flow

**Forbidden:**
- Plan changes
- Subscription activation / cancellation

---

### 2.5 Club Detail — Subscription

**Route:** `/admin/clubs/[club_id]`

**Purpose:**
- Detailed subscription inspection for a single club

**Content:**
- Subscription state
- Dates (`started_at`, `expires_at`)
- Plan limits (read-only)
- Related audit records (read-only)

**Allowed Actions:**
- Extend subscription expiration

**Forbidden:**
- Plan upgrade / downgrade
- State changes
- Billing enforcement overrides

---

### 2.6 Admin Audit Log

**Route:** `/admin/audit`

**Purpose:**
- Review Admin actions and outcomes

**Content (Read-Only):**
- Audit records list
- Filters (by actor, action, target)

**Allowed Actions:**
- View audit details

**Forbidden:**
- Editing or deleting audit records
- Replaying actions

---

## 3. Write Action Surfaces (Canonical)

Admin write actions MUST be exposed **only** via:

- Explicit CTA buttons
- Confirmation dialogs
- Mandatory `reason` input

### 3.1 Grant Credit Flow
- Triggered from user detail page
- Requires:
  - credit amount / type (as applicable)
  - reason
- Confirmation step required

---

### 3.2 Extend Subscription Flow
- Triggered from club detail page
- Requires:
  - number of days
  - reason
- Confirmation step required

---

## 4. Forbidden UI Patterns (Explicit)

Admin UI MUST NOT:
- auto-save changes,
- inline-edit billing fields,
- hide mutations behind toggles,
- reuse user-facing billing UI,
- show financial summaries or revenue data.

---

## 5. Error, Forbidden & Audit UX

- All error, forbidden, and empty states MUST follow:
  - `SSOT_UI_STATES.md`
  - `SSOT_UI_COPY.md`

- Failed Admin actions MUST:
  - surface explicit failure,
  - record audit entry (rejected),
  - not partially update UI.

---

## 6. Governance & Change Control

- Any addition or modification of Admin pages requires:
  - SSOT version bump,
  - alignment with Admin & Billing SSOTs.

Temporary or experimental pages are **not allowed**.

---

## 7. Versioning

- **v1.0** — Initial Admin UI Inventory (Admin V0)

Future versions MAY:
- add new read-only pages,
- extend write actions **only if** Admin domain SSOT allows.

---

**END OF DOCUMENT — SSOT_ADMIN_UI_PAGE_INVENTORY v1.0**
