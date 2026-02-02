# Need4Trip — Admin Audit Rules (SSOT)

**Status:** DRAFT → CANONICAL (after approval)  
**Version:** **1.0**  
**Scope:** Admin Actions — Audit & Compliance  
**Applies to:** All `/api/admin/*` mutations and service-layer admin operations  

**Depends on:**
- SSOT_ADMIN_DOMAIN.md v1.0
- SSOT_BILLING_ADMIN_RULES.md v1.0
- SSOT_DATABASE.md
- SSOT_ARCHITECTURE.md
- ADR-001, ADR-001.5

---

## 0. Purpose & Positioning

This document defines **mandatory audit and traceability rules** for all Admin actions.

Audit rules exist to:
- ensure accountability of Admin interventions,
- provide post-factum explainability,
- prevent silent or ambiguous state changes,
- support operational, security, and compliance reviews.

> **No Admin mutation is valid without an audit record.**

This SSOT is the **single authoritative source** for:
- what must be audited,
- how audit records are structured,
- when actions must be rejected due to audit violations.

---

## 1. Core Audit Principles (Non-Negotiable)

### 1.1 Audit Is Mandatory
Any Admin action that mutates state:
- MUST produce an audit record,
- MUST do so atomically with the mutation,
- MUST fail if audit recording fails.

No “best effort” logging is allowed.

---

### 1.2 Immutability
Audit records:
- MUST be immutable after creation,
- MUST NOT be edited, deleted, or rewritten,
- MUST NOT be reused for multiple actions.

---

### 1.3 Actor Attribution
Every audit record MUST unambiguously identify:
- the Admin actor,
- the context in which the action occurred.

Anonymous or inferred attribution is forbidden.

---

## 2. Audit Coverage (What Must Be Audited)

Audit records are REQUIRED for **all Admin mutations**, including but not limited to:

### 2.1 Billing Grants
- one-off credit grants to users,
- subscription extensions for clubs.

---

### 2.2 Administrative Overrides
Any Admin action that:
- changes persisted state,
- affects billing inputs,
- influences downstream access decisions indirectly.

---

### 2.3 Failed Attempts (Partial)
The following MUST also be audited:
- rejected Admin actions due to validation failure,
- aborted actions due to invariant violations.

> Failed attempts are security-relevant events.

---

## 3. Audit Record Structure (Canonical)

Each audit record MUST contain the following fields.

### 3.1 Mandatory Fields

| Field | Description |
|-----|------------|
| `id` | Unique audit record identifier |
| `actor_type` | Always `admin` |
| `actor_id` | Stable Admin identifier |
| `action_type` | Canonical action code |
| `target_type` | `user` \| `club` \| other |
| `target_id` | Identifier of affected entity |
| `reason` | Human-readable justification (mandatory) |
| `result` | `success` \| `rejected` |
| `created_at` | Timestamp (UTC) |

---

### 3.2 Optional / Contextual Fields

| Field | Description |
|------|------------|
| `metadata` | Structured JSON with contextual details |
| `related_entity_id` | e.g. credit_id, subscription_id |
| `error_code` | If `result = rejected` |

Optional fields MUST NOT replace mandatory ones.

---

## 4. Action Type Taxonomy (Canonical)

Admin actions MUST use **predefined action codes**.

### 4.1 Billing-Related Actions

| Action Code | Description |
|-----------|-------------|
| `ADMIN_GRANT_CREDIT` | One-off credit grant to user |
| `ADMIN_EXTEND_SUBSCRIPTION` | Subscription expiration extension |

No free-form action names are allowed.

---

### 4.2 Failure Actions

| Action Code | Description |
|-----------|-------------|
| `ADMIN_GRANT_CREDIT_REJECTED` | Credit grant rejected |
| `ADMIN_EXTEND_SUBSCRIPTION_REJECTED` | Extension rejected |

---

## 5. Atomicity & Failure Rules

### 5.1 Atomic Execution
Admin mutations and audit creation:
- MUST occur in a single atomic operation,
- MUST either both succeed or both fail.

If audit write fails:
- the mutation MUST be rolled back,
- the Admin request MUST fail.

---

### 5.2 No Partial Persistence
The following is forbidden:
- mutation without audit,
- audit without mutation (for success cases),
- mutation with mismatched audit data.

---

## 6. Read Access to Audit Logs

Audit logs:
- are **read-only**,
- MUST NOT be exposed to regular users,
- MAY be exposed to Admin UI in read-only mode.

Filtering, searching, and export are implementation details and out of scope.

---

## 7. Retention & Lifecycle

### 7.1 Retention Policy
Audit records:
- MUST be retained indefinitely,
- MUST NOT be subject to automatic cleanup.

---

### 7.2 Migration & Backfill
If audit rules are introduced after Admin features:
- missing historical audit data MUST be explicitly documented,
- no silent backfill is allowed.

---

## 8. Security & Abuse Considerations

- Repeated rejected Admin attempts SHOULD be monitored,
- Audit logs MUST be protected from tampering,
- Direct DB access to audit tables MUST be restricted.

Security enforcement mechanisms are implementation details, but **violations are not acceptable**.

---

## 9. Governance & Change Control

- Any change to audit rules requires:
  - SSOT version bump,
  - changelog entry,
  - review against Admin and Billing SSOTs.

Temporary exceptions are **not allowed**.

---

## 10. Versioning

- **v1.0** — Initial Admin Audit Rules (Admin V0)

Future versions MAY:
- introduce new action codes,
- add structured metadata requirements,

but MUST NOT weaken v1 guarantees.

---

**END OF DOCUMENT — SSOT_ADMIN_AUDIT_RULES v1.0**
