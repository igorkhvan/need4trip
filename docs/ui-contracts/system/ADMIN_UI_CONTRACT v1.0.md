# Need4Trip — ADMIN_UI_CONTRACT (V0)

**Status:** DRAFT → CANONICAL (after approval)  
**Version:** **1.0**  
**Scope:** Admin UI (MANAGEMENT pages only)  
**Applies to:** `/admin/*` UI routes  
**Depends on:**
- DOCUMENT_GOVERNANCE.md
- SSOT_ADMIN_DOMAIN v1.0
- SSOT_BILLING_ADMIN_RULES v1.0
- SSOT_ADMIN_AUDIT_RULES v1.0
- SSOT_ADMIN_UI_PAGE_INVENTORY v1.0
- SSOT_API.md v1.8.0
- SSOT_UI_GOVERNANCE.md
- SSOT_UI_STATES.md
- SSOT_UI_COPY.md

---

## 0. Purpose & Positioning

This contract defines **mandatory UI enforcement rules** for Admin UI V0.

Admin UI exists to:
- observe billing state (READ),
- perform strictly limited manual actions (GRANT),
- prevent ambiguous or unsafe interactions.

> **This is not a design or UX document.**  
> It is an enforcement contract.

Any UI behavior not explicitly allowed here is **forbidden by default**.

---

## 1. Global UI Rules (Non-Negotiable)

1. **Page Type:** MANAGEMENT  
2. **Layout:** STANDARD width (`max-w-7xl`)  
3. **Navigation:** isolated from user navigation  
4. **No optimistic updates** for any write action  
5. **No auto-submit / auto-refresh side effects**  
6. **Explicit confirmation** required for every write action  
7. **Reason is mandatory** for every write action  
8. **READ and WRITE surfaces must be visually and structurally separated**

---

## 2. Page → API Binding (Canonical)

### `/admin`
**READ:**
- none (navigation only)

**WRITE:**  
- none

**Forbidden:**  
- metrics, charts, counts, actions

---

### `/admin/users`
**READ:**
- `GET /api/admin/users`

**WRITE:**  
- none

**Forbidden:**  
- inline actions  
- mutations

---

### `/admin/users/[userId]`
**READ:**
- `GET /api/admin/users/:userId`

**WRITE:**
- `POST /api/admin/users/:userId/grant-credit`

**Forbidden:**
- any other mutation  
- inline submit

---

### `/admin/clubs`
**READ:**
- `GET /api/admin/clubs`

**WRITE:**  
- none

---

### `/admin/clubs/[clubId]`
**READ:**
- `GET /api/admin/clubs/:clubId`

**WRITE:**
- `POST /api/admin/clubs/:clubId/extend-subscription`

**Forbidden:**
- plan changes  
- state changes  
- activation/cancellation actions

---

### `/admin/audit`
**READ:**
- `GET /api/admin/audit`

**WRITE:**  
- none

**Forbidden:**  
- edit, replay, export

---

## 3. Write Action Contracts (Critical)

### 3.1 Grant One-Off Credit

**Action:** `Grant Credit`

**Required Inputs:**
- `creditCode` (non-empty)
- `reason` (non-empty)

**UI Rules:**
- explicit CTA (button)
- confirmation step required
- submit disabled while loading
- explicit success or error state

**Forbidden UI Patterns:**
- auto-submit
- optimistic update
- auto-consumption hints
- “fix billing” / “override” language

**Copy Guardrails:**
- Allowed: “Grant one-off credit”
- Forbidden: “Fix access”, “Override limits”

---

### 3.2 Extend Subscription

**Action:** `Extend Subscription`

**Required Inputs:**
- `days` (integer > 0)
- `reason` (non-empty)

**UI Rules:**
- explicit CTA
- confirmation step required
- submit disabled while loading
- explicit success or error state

**Forbidden UI Patterns:**
- editing plan/state
- implying activation or renewal
- auto-extension

**Copy Guardrails:**
- Allowed: “Extend subscription by N days”
- Forbidden: “Activate”, “Renew”, “Upgrade”

---

## 4. State Model (Mandatory)

Each Admin page MUST implement the following states:

- `loading`
- `ready`
- `error` (403, 404, 500)
- `submitting` (for write actions)
- `success` (post-mutation)

No implicit transitions are allowed.

---

## 5. Error & Feedback Rules

- Errors MUST be explicit and neutral
- No technical stack traces
- No retry without user action
- Copy must follow `SSOT_UI_COPY.md`

---

## 6. Explicitly Forbidden UI Capabilities

Admin UI MUST NOT:
- introduce new admin actions
- combine multiple write actions in one flow
- reuse user-facing billing components that imply ownership
- expose financial metrics or revenue data
- allow batch or bulk operations

---

## 7. Governance & Change Control

- Any change to Admin UI behavior requires:
  - update of this contract
  - version bump
  - alignment with Admin SSOTs

Temporary exceptions are **not allowed**.

---

## 8. Versioning

- **v1.0** — Initial Admin UI Contract (V0)

Future versions MAY:
- extend write actions **only** if Admin domain SSOT allows
- add read-only pages

---

**END OF DOCUMENT — ADMIN_UI_CONTRACT v1.0**
