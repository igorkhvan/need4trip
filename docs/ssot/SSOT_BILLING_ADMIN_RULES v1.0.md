# Need4Trip — Billing Admin Rules (SSOT)

**Status:** DRAFT → CANONICAL (after approval)  
**Version:** **1.0**  
**Scope:** Billing — Admin Interactions (READ + GRANT ONLY)  
**Applies to:** `/api/admin/*` billing endpoints, service-layer admin operations  

**Depends on:**
- SSOT_ADMIN_DOMAIN.md v1.0
- SSOT_BILLING_SYSTEM_ANALYSIS.md
- SSOT_DATABASE.md
- SSOT_ARCHITECTURE.md
- ADR-001, ADR-001.5

---

## 0. Purpose & Positioning

This document defines **canonical billing rules for Admin actions**.

Admin billing rules exist to:
- allow **controlled manual grants**,
- preserve **Billing domain invariants**,
- prevent Admin actions from being misinterpreted as purchases.

> **Admin billing actions adjust inputs; they never replace purchases.**

This SSOT is authoritative for:
- how Admin interacts with Billing entities,
- what mutations are allowed,
- how those mutations are represented in data.

Any behavior not explicitly allowed here is **forbidden by default**.

---

## 1. Core Invariants (Non-Negotiable)

### 1.1 Billing Domain Supremacy
All billing enforcement, limits, and access decisions:
- remain defined by `SSOT_BILLING_SYSTEM_ANALYSIS.md`,
- are evaluated exclusively by backend billing logic.

Admin actions **must not** short-circuit enforcement.

---

### 1.2 Admin ≠ Purchaser
Admin is **never** a purchaser and **never** a payment proxy.

Consequences:
- no purchase intent creation,
- no settlement,
- no refunds,
- no financial reconciliation.

---

### 1.3 Explicit Source Attribution
Every Admin-induced billing mutation MUST:
- declare `source = admin`,
- be distinguishable from `source = user | system`.

---

## 2. Admin Billing Surface (Allowed Entities)

Admin MAY interact **only** with the following Billing entities:

| Entity | Mode |
|------|------|
| `billing_credits` | CREATE (grant only) |
| `club_subscriptions` | UPDATE (`expires_at` only) |
| `billing_transactions` | READ ONLY |
| `billing_products` | READ ONLY |

All other entities are **out of scope**.

---

## 3. One-Off Credit Grant Semantics (User Context)

### 3.1 Allowed Operation

Admin MAY create a **one-off billing credit** with:

- `status = available`
- `consumed_event_id = NULL`
- `source = admin`
- no expiration unless defined by product rules

The credit behaves identically to a user-purchased credit **after creation**.

---

### 3.2 Mandatory Requirements

Each grant MUST include:
- `reason` (human-readable, mandatory),
- admin actor identifier,
- timestamp.

Creation MUST:
- write an audit entry,
- optionally create a non-financial billing transaction record
  (implementation detail; MUST NOT imply purchase).

---

### 3.3 Explicit Non-Guarantees

Granting a credit:
- does NOT guarantee access,
- does NOT bypass limits,
- does NOT force consumption.

Consumption remains subject to standard billing enforcement.

---

## 4. Subscription Extension Semantics (Club Context)

### 4.1 Allowed Operation

Admin MAY extend an **existing** club subscription by:
- modifying `expires_at` **only**,
- adding **N days** to the current value.

No other fields may be changed.

---

### 4.2 State Constraints

The following subscription states are eligible:
- `active`
- `grace`
- `expired`

The subscription state:
- MUST remain unchanged,
- MUST NOT transition as a side-effect.

> **Extension ≠ activation ≠ renewal ≠ purchase**

---

### 4.3 Prohibited Side-Effects

Admin extension MUST NOT:
- change `plan_id`,
- change limits,
- reset usage counters,
- re-enable blocked actions implicitly.

All access decisions continue to be enforced by billing logic.

---

## 5. Transactions & Accounting (Admin Perspective)

### 5.1 Billing Transactions (Read-Only)

Admin MAY:
- view billing transactions for diagnostics and support.

Admin MUST NOT:
- modify transactions,
- delete transactions,
- create purchase-like transactions.

---

### 5.2 Financial Semantics

Admin actions:
- are **non-financial**,
- must never be interpreted as payment events,
- must not appear in financial reconciliation flows.

---

## 6. Forbidden Billing Operations (Explicit)

Admin MUST NOT perform any of the following:

### 6.1 Subscription Lifecycle
- ❌ create subscription from scratch
- ❌ activate subscription
- ❌ change subscription state
- ❌ upgrade or downgrade plan
- ❌ cancel subscription

---

### 6.2 Purchase & Settlement
- ❌ create purchase intent
- ❌ emulate payment
- ❌ confirm or settle payments
- ❌ issue refunds or chargebacks

---

### 6.3 Enforcement Bypass
- ❌ bypass billing checks
- ❌ grant direct access or limits
- ❌ override backend billing decisions

---

## 7. Audit & Traceability (Mandatory)

Every Admin billing mutation MUST:
- generate an immutable audit record,
- include:
  - admin actor
  - target entity (user / club)
  - action type
  - reason
  - timestamp
- be traceable independently of billing transactions.

Canonical audit requirements are defined in:
- `SSOT_ADMIN_AUDIT_RULES.md` (v1).

---

## 8. Error Handling & Abort Rules

If an Admin billing mutation:
- fails validation,
- violates invariants,
- conflicts with current state,

then:
- **no partial mutation is allowed**,
- no side-effects may persist,
- an explicit failure must be returned.

Silent partial success is forbidden.

---

## 9. Governance & Change Control

- Any extension of Admin billing capabilities requires:
  - SSOT version bump,
  - explicit changelog,
  - review against `SSOT_BILLING_SYSTEM_ANALYSIS.md`.

Temporary exceptions are **not allowed**.

---

## 10. Versioning

- **v1.0** — Admin V0 Billing Rules (READ + GRANT ONLY)

Future versions MAY:
- add new grant types,
- add controlled lifecycle overrides,

but MUST NOT alter v1 semantics retroactively.

---

**END OF DOCUMENT — SSOT_BILLING_ADMIN_RULES v1.0**
