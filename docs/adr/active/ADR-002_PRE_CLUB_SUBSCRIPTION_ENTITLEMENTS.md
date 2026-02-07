# ADR-002 — Pre-Club Subscription Entitlements

---
Status: ACTIVE
Created: 2026-02-07
Author: Cursor AI
Supersedes: N/A
---

## Context

The current schema cannot represent subscription purchase before club creation: `club_subscriptions` has `club_id` as primary key and NOT NULL, and has no `user_id` column. Thus no unlinked (pre-club) entitlement can exist at user level. Policy and UX contracts require: 1 subscription → 1 club; subscription must be purchasable before club creation; at creation time the subscription is permanently bound to the club; paywall reason remains `CLUB_CREATION_REQUIRES_PLAN`. STEP 1 (Phase P2) added `hasUnlinkedActiveSubscriptionForUser()` in `createClub()`, but due to schema limitations that check always returns false and club creation is blocked for everyone until the schema supports user-scoped, unlinked entitlements.

## Decision

Introduce a user-level table **`club_subscription_entitlements`** as the record for pre-club subscription purchase. **`club_subscriptions`** remains club-level and is created/bound at club creation. Entitlement validity: **1 month from purchase**. Binding rule: the entitlement is **consumed exactly once** and **permanently** (binding at club creation is atomic and irreversible).

## Invariants

- 1 entitlement → 1 club.
- Entitlement cannot be reused after binding to a club.
- Binding is atomic within the club-creation transaction.
- Deletion (club or subscription) does not "refund" the entitlement to the user.
- UI does not decide billing eligibility; only backend based on entitlement/subscription data.
- Paywall reason for club creation remains **CLUB_CREATION_REQUIRES_PLAN**.

## Alternatives Considered

- **Candidate A:** Modify `club_subscriptions` (surrogate PK, nullable `club_id`, add `user_id`) — rejected due to migration risk (PK change, backfill, constraint updates) and added complexity for existing code paths and RLS.
- **Candidate B:** New entitlement table — **accepted**: additive migration, clear separation of "right to create club" (entitlements) vs "club plan state" (club_subscriptions).
- **Candidate C:** Extend `billing_transactions` for pre-club purchases — rejected: transaction table is audit-only; SSOT states "Transaction logs ≠ entitlement"; using it as entitlement store violates separation of responsibilities.

## Consequences

- Additive migration with minimal blast radius on existing code and data.
- Clear separation: entitlement = right to create club; club_subscriptions = club plan state.
- New enforcement query required to check unlinked entitlements at club creation and to bind in the same transaction (with row lock when consuming entitlement).
- SSOT_DATABASE drift with actual `club_subscriptions` schema must be resolved in a later doc update (not in this ADR).

## References

- docs/DOCUMENT_GOVERNANCE.md
- docs/phase/p1/PHASE_P1_CLUB_CREATION_DIAGNOSTIC_REPORT.md
- docs/phase/p2/PHASE_P2_FIX_IMPLEMENTATION.md
- docs/phase/p2.1/PHASE_P2.1-1_SUBSCRIPTION_SCHEMA_EVOLUTION_DIAGNOSTIC.md
- docs/ui-contracts/system/UX_CONTRACT_CLUB_CREATION.md
- docs/ui-contracts/system/UX_COPY_CONTRACT_CLUB_CREATION_v1.1.md
- docs/ssot/SSOT_BILLING_SYSTEM_ANALYSIS.md
- docs/ssot/SSOT_DATABASE.md
- docs/ssot/SSOT_API.md
- docs/ssot/SSOT_ARCHITECTURE.md
