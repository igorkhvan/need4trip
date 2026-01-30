# CLUBS_UI_VISUAL_CONTRACT v1 — BILLING (Club Settings)

**Status:** LOCKED  
**Scope:** Club Billing (Owner-only, contextual)  
**Applies to:** Club Settings → Billing section  

**Aligned with:**
- CLUBS_IMPLEMENTATION_BLUEPRINT v1 (Rebuilt)
- SSOT_BILLING_SYSTEM_ANALYSIS v5.9
- SSOT_API v1.7.1
- SSOT_DESIGN_SYSTEM v1.5

---

## 1. Purpose & Authority

This document defines the **visual and behavioral execution contract** for **Club Billing UI v1**.

It:
- fixes section structure and order,
- defines states and access rules,
- defines CTA behavior,
- forbids out-of-scope UI.

It does NOT:
- redefine billing rules,
- introduce new billing concepts,
- specify payment provider UX,
- change API behavior.

If implementation conflicts with this contract, the implementation is wrong.

---

## 2. Applicability & Audience

### 2.1 Applies To
- Club Settings → Billing

### 2.2 Audience
- Owner only

### 2.3 Explicit Non-Audience
- Admin
- Member
- Guest

Non-owners MUST receive **Forbidden (403)** at page entry.

---

## 3. Global Invariants (Non-Negotiable)

- UI reflects backend state only.
- UI never computes limits, eligibility, or subscription state.
- Billing UI is contextual, not a standalone page.
- Billing UI MUST be accessible to the owner when subscription is:
  - active
  - pending
  - grace
  - expired
- Billing UI is NOT accessible when club is archived.
- All upgrade / renew actions are triggered via existing billing flow.
- No optimistic UI.

Violations are defects.

---

## 4. Page Placement & Routing

- Route: `/clubs/[id]/settings`
- Section: Billing
- Billing is a section, not a separate route.

---

## 5. Page Layout (Strict Order)

[ Header ] (blocking)
────────────────────────
[ Archived Banner ] (conditional, blocking)
────────────────────────
[ Current Plan Summary ] (blocking)
────────────────────────
[ Plan Limits (Read-only) ] (blocking)
────────────────────────
[ Subscription State & Actions ] (blocking)

Order is fixed. No additional sections allowed.

---

## 6. Header

### Data Source
- GET /api/clubs/[id] (API-016)

### Content
- Club name
- Visibility badge
- Archived badge (if applicable)

### Behavior
- Blocking render
- No actions

---

## 7. Archived Banner (Critical Rule)

### Displayed If
- club.archivedAt !== null

### Behavior
- Informational banner
- Billing section is hidden
- No billing actions allowed

Archived club ⇒ Billing UI inaccessible.

---

## 8. Current Plan Summary

### Data Sources
- Club context (plan reference)
- GET /api/plans

### Content
- Current plan name
- Short plan description (static copy)
- Plan tier label

### States
| State | Behavior |
|------|----------|
| Loading | Section skeleton |
| Active | Render plan info |
| Expired / Grace / Pending | Render plan info |

---

## 9. Plan Limits (Read-only)

### Data Source
- GET /api/plans

### Content
- List of limits:
  - max members
  - max event participants
  - paid events capability (yes/no)
  - other plan-defined limits

### Rules
- Read-only
- No progress bars
- No frontend-computed warnings

---

## 10. Subscription State & Actions

### Data Source
- Subscription state from backend context

### Displayed State Labels
- Active
- Pending payment
- Grace period
- Expired

### CTA Rules

| Subscription State | Primary CTA |
|-------------------|-------------|
| Active | Upgrade |
| Pending | Complete payment |
| Grace | Renew |
| Expired | Renew |

CTA:
- Triggers existing billing flow
- No inline payment UI
- No billing modals defined here

---

## 11. Error & State Handling

### Forbidden (403)
- Full forbidden layout
- Triggered when viewer is not owner

### Archived
- Billing section hidden
- Archived banner shown

### Paywall (402)
- Triggered only by backend
- Handled by global paywall mechanism

---

## 12. Explicitly Forbidden UI (Hard Rules)

The following are NOT allowed in Billing UI v1:

- Transaction history
- Invoices
- Payment method management
- Credit management UI
- Usage analytics
- CSV export
- Marketplace / products
- Inline pricing tables
- Any UI that computes limits or overages

---

## 13. Loading Model

- Header: blocking
- All billing sections: blocking
- No progressive rendering
- Skeletons must preserve final layout height

---

## 14. Design System Compliance (Mandatory)

- Use components ONLY from `SSOT_DESIGN_SYSTEM v1.5`
- Use shadcn/ui wrappers (no direct Radix usage)
- Colors via CSS variables (no hardcoded hex)
- Typography via defined heading/body classes
- Banners, alerts, and buttons must match existing patterns
- No custom visual language introduced

---

## 15. AI Executor Rules

AI executors (Cursor / Kilo) MUST:

- Follow section order strictly
- Bind each section only to its defined data source
- Not infer billing logic from raw data
- Not introduce new states or CTAs
- STOP and report if API responses contradict this contract
- Perform self-check against this document

Any deviation is an implementation defect.

---

## 16. Versioning

- v1 — Initial Billing UI (Club Settings)
- Any change requires v2 and explicit scope expansion

---

END OF DOCUMENT
