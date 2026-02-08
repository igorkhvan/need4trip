---
Status: CANONICAL
Version: v1.0
Owner: Product / UX
Type: UX_CONTRACT
Scope: System (cross-cutting)
AppliesTo:
  - PAYWALL_MODE=SOFT_BETA_STRICT
DependsOn:
  - SSOT_UX_GOVERNANCE.md
  - SSOT_UI_STRUCTURE.md
  - SSOT_UI_STATES.md
  - SSOT_UI_COPY.md
  - SSOT_API.md
  - SSOT_ARCHITECTURE.md
  - SSOT_BILLING_SYSTEM_ANALYSIS.md
  - SSOT_DATABASE.md
Related:
  - docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md
---

# UX CONTRACT — Paywall (SOFT_BETA_STRICT)

## 0. Authority & Precedence

This document is a **system-level UX contract**.

It is **normative** and **binding** for:
- UI implementation
- frontend refactors
- AI-assisted changes (Cursor / Kilo)

In case of conflict, the following precedence applies:

1. `SSOT_UX_GOVERNANCE.md`
2. `SSOT_UI_STATES.md`
3. `SSOT_UI_STRUCTURE.md`
4. `SSOT_UI_COPY.md`
5. This contract

This contract MUST NOT override or weaken any SSOT listed above.

---

## 1. Purpose

This contract defines the **mandatory UX behavior** of the Paywall
when the system operates in `SOFT_BETA_STRICT` mode.

Goals:
- Preserve the **production paywall UX contract** while payments are unavailable.
- Ensure users **explicitly acknowledge** a paid boundary.
- Allow the protected action to continue **only after explicit confirmation**.
- Preserve monetization-intent signals during beta.

Non-goals:
- Defining UI copy or wording.
- Defining visual styling.
- Defining pricing or payment collection.

---

## 2. Conceptual Model

### 2.1 Paywall Is a State, Not a Page

The paywall in `SOFT_BETA_STRICT` is:
- a **system-level UI state**
- rendered as a **modal overlay**
- anchored to an existing page

It is **NOT**:
- a standalone page
- a new page type
- a navigation destination

This complies with `SSOT_UX_GOVERNANCE.md` page taxonomy.

---

## 3. UI State Classification (SSOT_UI_STATES)

### 3.1 Canonical State

When paywall is triggered, the UI enters:

**State:** `PENDING`

Rationale:
- The system is awaiting **explicit user confirmation**
- No error has occurred
- The action is not forbidden
- The entity is not missing

Paywall MUST NOT be implemented as:
- `ERROR`
- `FORBIDDEN`
- `EMPTY`
- `NOT FOUND`

---

## 4. Trigger Conditions

### 4.1 Mandatory Trigger

The paywall modal MUST be displayed when the client receives a paywall
enforcement response for a protected action, including:

- HTTP 402 (`PaywallError`) as defined in `SSOT_API.md`

### 4.2 Forbidden Suppression

The paywall MUST NOT be suppressed by:
- beta flags
- feature flags unrelated to billing
- environment checks
- UI heuristics
- automatic retries

If the backend triggers paywall, the user MUST see it.

---

## 5. Modal Structure & Semantics (SSOT_UI_STRUCTURE)

### 5.1 Structural Role

The paywall modal is a **system-level modal container** with:

- semantic role: `PendingStateContainer`
- persistent page shell (no layout collapse)
- focus trapping and accessibility compliance

### 5.2 Mandatory Elements (Semantic, Not Visual)

The modal MUST contain:

- A title conveying a **paid boundary**
- An informational message explaining:
  - the restriction
  - the continuation condition
- A **primary action** with semantic role:
  - `ConfirmContinuation`
- A **secondary action** with semantic role:
  - `CancelAction`

All text MUST be sourced from `SSOT_UI_COPY.md`.

---

## 6. Copy Governance (SSOT_UI_COPY)

This contract defines **no UI copy**.

Rules:
- All user-facing text MUST come from `SSOT_UI_COPY.md`
- No hardcoded strings are allowed
- No example wording is permitted in this contract

The contract governs **behavior and structure only**.

---

## 7. User Actions & Flow Control

### 7.1 Confirm Continuation (Primary Action)

When the user activates the primary action:

The UI MUST:
1. Preserve all user-entered data.
2. Re-submit the **same protected action**.
3. Include a confirmation marker:
   - `confirm_credit = true` (or canonical equivalent).
4. Perform exactly **one** re-submission.
5. Use the same identifiers and payload.

The UI MUST NOT:
- auto-confirm without user interaction
- modify the action semantics
- create or modify billing data

---

### 7.2 Cancel Action (Secondary Action)

When the user cancels:

- The protected action is aborted.
- No side effects occur.
- No re-submission is performed.
- The user remains on the originating page.

---

## 8. Repeated Paywall & Loop Prevention

If the paywall is triggered again **after confirmation**:

- The UI MUST NOT retry automatically.
- The UI MUST present a stable failure state,
  classified as `ERROR` per `SSOT_UI_STATES.md`.
- Copy MUST come from `SSOT_UI_COPY.md`.

This prevents infinite confirmation loops.

---

## 9. Async & Pending Rules (SSOT_UX_GOVERNANCE)

During paywall confirmation and re-submission:

- The UI MUST enter a `Pending` state.
- Repeated user actions MUST be blocked.
- Loading indicators MUST follow canonical async patterns.
- The page layout MUST remain stable.

---

## 10. Telemetry (Required)

The UI MUST emit the following telemetry events
(non-admin, non-audit):

- `PAYWALL_SHOWN_BETA`
- `PAYWALL_CONFIRMED_BETA`
- `PAYWALL_CANCELLED_BETA` (optional)

Telemetry is required to preserve monetization-intent signals.

---

## 11. Protected Actions Scope

This contract applies to **all paywalled actions**.

Initial beta scope includes:
- Create / publish paid event

Any future protected action MUST comply with this same contract.

---

## 12. Invariants & Forbidden Patterns

### 12.1 Hard Invariants

- Paywall enforcement MUST execute.
- User confirmation MUST be explicit.
- Credit creation and consumption are backend-only.
- Domain logic MUST remain unchanged.

### 12.2 Explicitly Forbidden

- Early return bypassing paywall
- Automatic continuation without confirmation
- SOFT_BETA_LIGHT behavior
- Client-side credit manipulation
- Hidden paywall in beta

---

## 13. Documentation Requirement

Any implementation of this contract MUST be logged in:

`docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md`

The entry MUST specify:
- Paywall mode = SOFT_BETA_STRICT
- Confirm-based continuation
- System auto-grant + consume behavior
- Restoration condition (HARD mode)

---

## 14. Acceptance Criteria (Definition of Done)

This contract is considered correctly implemented if:

- Paywall modal appears on every paywall trigger.
- User must explicitly confirm continuation.
- No user input is lost.
- No automatic bypass occurs.
- UI states comply with SSOT_UI_STATES.
- All copy comes from SSOT_UI_COPY.
- Telemetry events are emitted.
- Beta deviation is documented.

---

## 15. Change Control

Any change to this contract requires:
- Version bump of this file
- Review against all referenced SSOTs
- Corresponding update in beta deviation ledger
