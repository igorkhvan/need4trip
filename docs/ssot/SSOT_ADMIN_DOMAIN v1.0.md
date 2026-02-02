# Need4Trip — Admin Domain (SSOT)

**Status:** DRAFT → CANONICAL (after approval)  
**Version:** **1.0**  
**Scope:** Platform Admin (Billing Observation & Grant)  
**Applies to:** `/api/admin/*`, internal admin tooling  

**Depends on:**
- SSOT_ARCHITECTURE.md  
- SSOT_BILLING_SYSTEM_ANALYSIS.md  
- SSOT_DATABASE.md  
- ADR-001  
- ADR-001.5  

---

## 0. Purpose & Positioning

This document defines the **canonical Admin domain** for Need4Trip.

Admin domain exists to:
- observe billing and subscription state,
- perform **strictly limited manual grants**,
- support operational and support scenarios,

**without redefining or replacing the Billing domain.**

> **Admin is an exception handler, not a billing authority.**

This SSOT is the **only authoritative source** for:
- what Admin *is*,
- what Admin *may do*,
- what Admin *must never do*.

Any behavior not explicitly allowed here is **forbidden by default**.

---

## 1. Core Principles (Non-Negotiable)

### 1.1 Admin Is Not a Product Actor
Admin is:
- not a User,
- not a Club Owner,
- not a participant in purchase flows.

Admin actions **must never be interpreted as user intent**.

---

### 1.2 Billing Domain Supremacy
Billing rules defined in `SSOT_BILLING_SYSTEM_ANALYSIS.md`:
- remain authoritative,
- are not overridden by Admin actions.

Admin actions **may only adjust inputs**, never outcomes.

---

### 1.3 No Silent State Changes
Any Admin mutation:
- MUST be explicit,
- MUST be auditable,
- MUST be attributable to an Admin actor.

Silent or implicit mutations are forbidden.

---

## 2. Admin Definition (Canonical)

**Admin** is a **platform-level operator** acting via:
- dedicated admin authentication context,
- isolated admin API surface (`/api/admin/*`),
- explicit administrative intent.

Admin context:
- is not resolved via standard user auth,
- MUST NOT reuse user sessions,
- MUST NOT rely on implicit cookies.

---

## 3. Scope of Responsibility

Admin domain covers **only**:
1. Observation of billing and subscription state  
2. Manual **grant-type** interventions  

Admin domain explicitly excludes:
- billing enforcement logic,
- purchase lifecycle management,
- access decision logic.

---

## 4. Allowed Operations — READ (Read-Only)

### 4.1 User Context (Read-Only)

Admin MAY view:
- user identity (id, email, status),
- one-off billing credits:
  - available
  - consumed
- billing transaction history (immutable),
- aggregated billing state.

Admin MUST NOT:
- infer access decisions,
- reinterpret limits or entitlements.

---

### 4.2 Club Context (Read-Only)

Admin MAY view:
- current subscription plan (identifier only),
- subscription state:
  - `pending`
  - `active`
  - `grace`
  - `expired`
- subscription dates:
  - `started_at`
  - `expires_at`
- plan limits (read-only, from billing products).

Admin MUST NOT:
- modify plan configuration,
- modify limits,
- initiate billing flows.

---

## 5. Allowed Operations — GRANT (Limited Mutations)

### 5.1 One-Off Credit Grant (User)

Admin MAY:
- create a new one-off billing credit,
- with status `available`,
- not bound to any event,
- marked as `source = admin`.

**Required conditions:**
- explicit `reason` (mandatory),
- audit log entry (mandatory),
- no immediate access side-effects.

Granting a credit **does not guarantee usage**.

---

### 5.2 Subscription Extension (Club)

Admin MAY:
- extend an existing subscription by **N days**,
- by modifying `expires_at` only.

**Strict constraints:**
- subscription plan MUST remain unchanged,
- subscription state MUST remain unchanged,
- no renewal or activation is implied.

Allowed states for extension:
- `active`
- `grace`
- `expired` (date extension only).

> Extension ≠ purchase  
> Extension ≠ activation  
> Extension ≠ renewal  

---

## 6. Explicitly Forbidden Operations

Admin MUST NOT perform the following actions under any circumstances:

### 6.1 Subscription Control
- ❌ create a subscription from scratch  
- ❌ activate a subscription  
- ❌ change subscription state  
- ❌ upgrade or downgrade plan  
- ❌ cancel subscription  

---

### 6.2 Billing & Transactions
- ❌ create or modify purchase intents  
- ❌ modify billing transactions  
- ❌ emulate payment or settlement  
- ❌ issue refunds  

---

### 6.3 Access & Enforcement
- ❌ override billing enforcement  
- ❌ directly grant access or limits  
- ❌ bypass backend billing checks  

---

## 7. Audit & Accountability (Mandatory)

Every Admin mutation:
- MUST be recorded in audit logs,
- MUST include:
  - admin actor identifier,
  - target entity (user / club),
  - action type,
  - reason,
  - timestamp,
- MUST be immutable after creation.

Audit requirements are further specified in:
- `SSOT_ADMIN_AUDIT_RULES.md` (v1).

---

## 8. Non-Goals (Explicit)

This Admin domain does **not** attempt to:
- replace user billing flows,
- introduce admin-side billing UI parity,
- support financial reconciliation,
- support refunds or accounting.

Such capabilities require a **separate, versioned SSOT**.

---

## 9. Enforcement & Governance

- Any implementation conflicting with this SSOT is invalid.
- Any extension of Admin capabilities requires:
  - SSOT version bump,
  - explicit changelog entry,
  - impact analysis on Billing SSOT.

No temporary exceptions are allowed.

---

## 10. Versioning

- **v1.0** — Initial Admin V0 scope (READ + GRANT ONLY)

Future versions MAY:
- extend allowed grant types,
- introduce controlled lifecycle overrides,

but MUST NOT retroactively change v1 semantics.

---

**END OF DOCUMENT — SSOT_ADMIN_DOMAIN v1.0**
