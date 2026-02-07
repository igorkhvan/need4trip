UX CONTRACT — Club Creation (FINAL)

Status: CANONICAL  
Authority: NORMATIVE  
Scope: User-facing UX (Web / App)  
Policy: 1 subscription → 1 club  
Billing model: Club-centric subscription  
Paywall reason: CLUB_CREATION_REQUIRES_PLAN  
Governing doc: DOCUMENT_GOVERNANCE.md  
Placement: docs/ui-contracts/system/

────────────────────────────────────────────
1. PURPOSE
────────────────────────────────────────────

This contract defines the ONLY allowed UX behavior for creating a club.

It specifies:
- when the club creation form is shown,
- when paywall must be shown,
- how subscription entitlement is used,
- how the system behaves on retries, inactivity, and returns.

This contract is binding for:
- all entry points,
- all clients,
- all future implementations.

UI must follow backend decisions.
UI must NOT implement billing logic.

────────────────────────────────────────────
2. NON-NEGOTIABLE INVARIANTS
────────────────────────────────────────────

1. A club CANNOT be created without a subscription.
2. One subscription grants the right to create EXACTLY ONE club.
3. Subscription is permanently associated with the club at creation time.
4. An unused subscription preserves the right to create a club.
5. Paywall is NOT an error; it is a rights check.
6. UI NEVER decides billing eligibility.

Violating any invariant is a contract breach.

────────────────────────────────────────────
3. CANONICAL USER STATES
────────────────────────────────────────────

S1 — NO SUBSCRIPTION  
- User is authenticated
- No active or grace club subscription exists

S2 — SUBSCRIPTION PURCHASED, CLUB NOT CREATED  
- Active or grace subscription exists
- Subscription is NOT linked to any club

S3 — SUBSCRIPTION USED  
- Subscription is linked to a club (club_id is set)

S4 — SUBSCRIPTION EXPIRED OR CANCELLED  
- Club may exist
- No right to create a new club

These states are derived from backend data only.

────────────────────────────────────────────
4. ENTRY POINTS (UNIFIED BEHAVIOR)
────────────────────────────────────────────

This contract applies equally to:
- /clubs/create
- “Create club” buttons
- Profile CTAs
- Pricing CTAs
- Any future club creation entry point

Entry point MUST NOT affect behavior.

────────────────────────────────────────────
5. CREATE CLUB FLOW — BEHAVIOR MATRIX
────────────────────────────────────────────

5.1 State S1 — No Subscription

Action:
User attempts to create a club.

UX result:
- Club creation form is NOT shown
- Generic error is NOT shown
- PaywallModal IS shown

Paywall reason:
CLUB_CREATION_REQUIRES_PLAN

────────────────────────────────────────────
5.2 Subscription Purchase

After successful payment:
- User enters state S2
- No club is created automatically
- UX MAY redirect to /clubs/create

Purchase confirms entitlement ONLY.

────────────────────────────────────────────
5.3 State S2 — Subscription Active, Club Not Created

Action:
User attempts to create a club (immediately or later).

UX result:
- Club creation form IS shown
- No paywall
- No warnings or confirmations

Inactivity, logout, browser close, refresh
DO NOT affect entitlement.

────────────────────────────────────────────
5.4 Club Creation (S2 → S3)

Action:
User submits club creation form.

System result:
- Club is created successfully
- Subscription becomes permanently linked to this club
- User becomes club owner
- State transitions to S3

UX result:
- Redirect to /clubs/{id}
- Standard success flow

────────────────────────────────────────────
5.5 State S3 — Subscription Used

Action:
User attempts to create another club.

UX result:
- Club creation form is NOT shown
- Generic error is NOT shown
- PaywallModal IS shown

Paywall reason:
CLUB_CREATION_REQUIRES_PLAN

────────────────────────────────────────────
5.6 State S4 — Subscription Expired / Cancelled

Action:
User attempts to create a club.

UX result:
- PaywallModal IS shown

────────────────────────────────────────────
6. ERROR HANDLING RULES
────────────────────────────────────────────

- HTTP 402 MUST always trigger PaywallModal
- HTTP 5xx / network errors trigger standard error UX
- Cancelled payment returns user to S1
- Refresh / Back relies only on current backend state

UI must not infer or cache eligibility.

────────────────────────────────────────────
7. FORBIDDEN UX PATTERNS
────────────────────────────────────────────

- Showing club form without subscription
- Creating draft or temporary clubs
- Mixing purchase and creation in one screen
- Re-showing paywall in state S2
- Using one-off credits as eligibility
- Implementing client-side billing checks

────────────────────────────────────────────
8. CANONICAL UX MATRIX
────────────────────────────────────────────

State → Create Club Result

S1 → Paywall  
S2 → Club creation form  
S3 → Paywall  
S4 → Paywall  

────────────────────────────────────────────
9. CORE CONTRACT FORMULA
────────────────────────────────────────────

The right to create a club is defined by billing state,
not by UI flow, navigation history, or timing.

────────────────────────────────────────────
END OF UX CONTRACT — Club Creation
