# Phase B3-1: Enforcement Touchpoint Inventory

**Status:** ✅ COMPLETE  
**Date:** 2026-01-29  
**Scope:** READ-ONLY analysis and documentation  
**Author:** AI Agent (Phase B3-1)

---

## Purpose

This document provides a **COMPLETE inventory** of all backend enforcement touchpoints where:
- Plan limits
- Subscription state
- Feature availability

are enforced and can result in:
- **PAYWALL (402)**
- **FORBIDDEN (403)**
- **BLOCKED / READ-ONLY behavior**

This inventory will be used to normalize UX behavior in Phase B3-2+.

---

## Authoritative References Consulted

| Document | Version | Sections |
|----------|---------|----------|
| SSOT_BILLING_SYSTEM_ANALYSIS.md | v5.9.2 | §4 Enforcement, §7 Event Save Enforcement |
| SSOT_API.md | v1.7.7 | §5 Billing & Paywall Touchpoints, §6 Error Model |
| SSOT_ARCHITECTURE.md | v5.3 | §8.3 Auth Context Types, §15 Aborted Actions |
| Clubs Implementation Blueprint v1 | FROZEN | §3.3 Error & Abort Model, §5.6 Club Events, §6 Billing |

---

## Core Enforcement Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `enforceClubAction()` | `src/lib/services/accessControl.ts` | Club-level billing enforcement (limits, features) |
| `enforceEventPublish()` | `src/lib/services/accessControl.ts` | Event save-time billing enforcement (club + personal) |
| `assertClubNotArchived()` | `src/lib/services/clubs.ts` | Club archived state enforcement |
| `requireClubOwner()` | `src/lib/services/clubs.ts` | Owner-only RBAC enforcement |
| `requireClubOwnerOrAdmin()` | `src/lib/services/clubs.ts` | Owner/Admin RBAC enforcement |
| `requireClubMember()` | `src/lib/services/clubs.ts` | Member-level RBAC enforcement |

---

## Enforcement Inventory Table

### Billing Enforcement — Club Events

| User Action | Page / UX Context | Endpoint | Service / Enforcer | Limit / Rule | Error / Result | Expected UI State |
|-------------|-------------------|----------|-------------------|--------------|----------------|-------------------|
| Create club event with participants > plan limit | Club Events / Event Create Form | `POST /api/events` | `enforceEventPublish()` | `MAX_EVENT_PARTICIPANTS_EXCEEDED` | 402 PAYWALL | Paywall |
| Update club event to participants > plan limit | Club Events / Event Edit Form | `PUT /api/events/[id]` | `enforceEventPublish()` | `MAX_EVENT_PARTICIPANTS_EXCEEDED` | 402 PAYWALL | Paywall |
| Create/update club event when subscription expired | Club Events / Event Form | `POST/PUT /api/events[/id]` | `enforceEventPublish()` | `SUBSCRIPTION_NOT_ACTIVE` | 402 PAYWALL | Paywall |
| Create paid club event on free plan | Club Events / Event Form | `POST /api/events` | `enforceEventPublish()` | `PAID_EVENTS_NOT_ALLOWED` | 402 PAYWALL | Paywall |
| Publish paid club event (non-owner) | Club Events / Event Form | `POST/PUT /api/events[/id]` | `enforceEventPublish()` | Owner-only check | 403 AuthError | Forbidden |
| Export club members (CSV) without feature | Club Settings / Members | `GET /api/clubs/[id]/export` | `enforceClubAction(CSV_EXPORT)` | `CSV_EXPORT_NOT_ALLOWED` | 402 PAYWALL | Paywall |
| Register participant when club event at capacity | Event Page / Registration | `POST /api/events/[id]/participants` | `enforceClubAction(CLUB_CREATE_EVENT)` | `MAX_EVENT_PARTICIPANTS_EXCEEDED` | 402 PAYWALL | Paywall |

### Billing Enforcement — Personal Events

| User Action | Page / UX Context | Endpoint | Service / Enforcer | Limit / Rule | Error / Result | Expected UI State |
|-------------|-------------------|----------|-------------------|--------------|----------------|-------------------|
| Create personal event 16-500 participants (no credit) | My Events / Event Create | `POST /api/events` | `enforceEventPublish()` | `PUBLISH_REQUIRES_PAYMENT` | 402 PAYWALL | Paywall |
| Create personal event 16-500 participants (has credit, not confirmed) | My Events / Event Create | `POST /api/events` | `enforceEventPublish()` | `CREDIT_CONFIRMATION_REQUIRED` | 409 CONFLICT | Confirmation required |
| Create personal event >500 participants | My Events / Event Create | `POST /api/events` | `enforceEventPublish()` | `CLUB_REQUIRED_FOR_LARGE_EVENT` | 402 PAYWALL | Paywall |
| Update personal event to 16-500 (no credit) | My Events / Event Edit | `PUT /api/events/[id]` | `enforceEventPublish()` | `PUBLISH_REQUIRES_PAYMENT` | 402 PAYWALL | Paywall |
| Update personal event to 16-500 (has credit, not confirmed) | My Events / Event Edit | `PUT /api/events/[id]` | `enforceEventPublish()` | `CREDIT_CONFIRMATION_REQUIRED` | 409 CONFLICT | Confirmation required |
| Update personal event to >500 | My Events / Event Edit | `PUT /api/events/[id]` | `enforceEventPublish()` | `CLUB_REQUIRED_FOR_LARGE_EVENT` | 402 PAYWALL | Paywall |
| Create personal paid event | My Events / Event Form | `POST /api/events` | `enforceEventPublish()` | `PAID_EVENTS_NOT_ALLOWED` | 402 PAYWALL | Paywall |

### Billing Enforcement — Club Membership

| User Action | Page / UX Context | Endpoint | Service / Enforcer | Limit / Rule | Error / Result | Expected UI State |
|-------------|-------------------|----------|-------------------|--------------|----------------|-------------------|
| Invite member when club at max members limit | Club Settings / Members | `POST /api/clubs/[id]/members` | `enforceClubAction(CLUB_INVITE_MEMBER)` | `MAX_CLUB_MEMBERS_EXCEEDED` | 402 PAYWALL | Paywall |

### Billing — Purchase

| User Action | Page / UX Context | Endpoint | Service / Enforcer | Limit / Rule | Error / Result | Expected UI State |
|-------------|-------------------|----------|-------------------|--------------|----------------|-------------------|
| Purchase club subscription (non-owner) | Club Settings / Billing | `POST /api/billing/purchase-intent` | Direct check in route | Owner-only check | 403 ForbiddenError | Forbidden |

### Archived Club — Write Operations

| User Action | Page / UX Context | Endpoint | Service / Enforcer | Limit / Rule | Error / Result | Expected UI State |
|-------------|-------------------|----------|-------------------|--------------|----------------|-------------------|
| Create event in archived club | Club Events / Event Create | `POST /api/events` | `assertClubNotArchived()` | `CLUB_ARCHIVED` | 403 ClubArchivedError | Forbidden |
| Update event in archived club | Club Events / Event Edit | `PUT /api/events/[id]` | `assertClubNotArchived()` | `CLUB_ARCHIVED` | 403 ClubArchivedError | Forbidden |
| Delete event in archived club | Club Events / Event Details | `DELETE /api/events/[id]` | `assertClubNotArchived()` | `CLUB_ARCHIVED` | 403 ClubArchivedError | Forbidden |
| Update club settings when archived | Club Settings | `PATCH /api/clubs/[id]` | `assertClubNotArchived()` | `CLUB_ARCHIVED` | 403 ClubArchivedError | Forbidden |
| Approve join request for archived club | Club Join Requests | `POST /api/clubs/[id]/join-requests/[rid]/approve` | `assertClubNotArchived()` | `CLUB_ARCHIVED` | 403 ClubArchivedError | Forbidden |
| Reject join request for archived club | Club Join Requests | `POST /api/clubs/[id]/join-requests/[rid]/reject` | `assertClubNotArchived()` | `CLUB_ARCHIVED` | 403 ClubArchivedError | Forbidden |
| Create join request for archived club | Club Profile | `POST /api/clubs/[id]/join-requests` | Direct check in route | `CLUB_ARCHIVED` (implicit) | 403 ForbiddenError | Forbidden |
| Export members for archived club | Club Settings / Members | `GET /api/clubs/[id]/export` | `assertClubNotArchived()` | `CLUB_ARCHIVED` | 403 ClubArchivedError | Read-only |

### Role-Based Access (RBAC)

| User Action | Page / UX Context | Endpoint | Service / Enforcer | Limit / Rule | Error / Result | Expected UI State |
|-------------|-------------------|----------|-------------------|--------------|----------------|-------------------|
| Update club (visibility/settings) as admin | Club Settings | `PATCH /api/clubs/[id]` | `requireClubOwner()` | Owner-only fields | 403 ForbiddenError | Forbidden |
| Change member role as non-owner | Club Members | `PATCH /api/clubs/[id]/members/[userId]` | `requireClubOwner()` | Owner-only action | 403 ForbiddenError | Forbidden |
| Remove member as non-owner | Club Members | `DELETE /api/clubs/[id]/members/[userId]` | `requireClubOwner()` | Owner-only action | 403 ForbiddenError | Forbidden |
| Assign owner role via role change | Club Members | `PATCH /api/clubs/[id]/members/[userId]` | Direct check in `updateClubMemberRole()` | Blocked | 403 ForbiddenError | Forbidden |
| Owner tries to leave without transfer | Club Members | `DELETE /api/clubs/[id]/members/[userId]` | Direct check in `removeClubMember()` | Blocked | 403 ForbiddenError | Forbidden |
| Archive club as non-owner | Club Settings | `DELETE /api/clubs/[id]` | `requireClubOwner()` | Owner-only action | 403 ForbiddenError | Forbidden |
| Unarchive club as non-owner | Club Settings | `POST /api/clubs/[id]/unarchive` | `requireClubOwner()` | Owner-only action | 403 ForbiddenError | Forbidden |

### Visibility / Access

| User Action | Page / UX Context | Endpoint | Service / Enforcer | Limit / Rule | Error / Result | Expected UI State |
|-------------|-------------------|----------|-------------------|--------------|----------------|-------------------|
| View members list of private club (non-member) | Club Profile | `GET /api/clubs/[id]/members/preview` | Direct check in route | Private club | 403 ForbiddenError | Forbidden |
| View members list when disabled by settings | Club Profile | `GET /api/clubs/[id]/members/preview` | Direct check in route | publicMembersListEnabled=false | 403 ForbiddenError | Forbidden |
| Access restricted event (unauthenticated) | Event Page | `GET /api/events/[id]` | Visibility check | Event visibility | 403 ForbiddenError | Forbidden |

### System / Admin / Cron

| User Action | Page / UX Context | Endpoint | Service / Enforcer | Limit / Rule | Error / Result | Expected UI State |
|-------------|-------------------|----------|-------------------|--------------|----------------|-------------------|
| Access cron endpoint without secret | N/A (system) | `/api/cron/*` | `resolveSystemContext()` | Invalid auth | 403 ForbiddenError | N/A |
| Access dev billing endpoint in production | N/A (dev) | `POST /api/dev/billing/settle` | Direct env check | Production blocked | 403 ForbiddenError | N/A |

---

## Coverage Check

### 1. Enforcement points WITHOUT clear UX state

| Enforcement Point | Issue | Severity |
|-------------------|-------|----------|
| `CLUB_INVITE_MEMBER` with `MAX_CLUB_MEMBERS_EXCEEDED` | **GAP**: Defined in `accessControl.ts` but NOT called in `approveClubJoinRequest()`. When a join request is approved, there is no check against the club member limit. | **HIGH** |
| `POST /api/clubs/[id]/members` | Endpoint disabled (throws 503). Direct member invite flow unavailable, pending Phase 3 refactor. | **LOW** (by design) |
| Participant registration for club events | Uses `CLUB_CREATE_EVENT` action code (reuse), not a dedicated action code. Works but semantically imprecise. | **TRIVIAL** |

### 2. Multiple enforcement points for the SAME user action

| User Action | Enforcement Points | Assessment |
|-------------|-------------------|------------|
| Create/Update club event | 1) `enforceEventPublish()` for billing limits<br>2) `assertClubNotArchived()` for archived state<br>3) Role check (owner/admin) | ✅ OK — Distinct concerns |
| Export club members CSV | 1) Role check (owner/admin)<br>2) `enforceClubAction(CSV_EXPORT)` for feature flag<br>3) Implicit archived check in route | ✅ OK — Layered correctly |
| Purchase club subscription | 1) Auth check<br>2) Owner-only check in route | ✅ OK — Single responsibility |

### 3. Same rule resulting in DIFFERENT errors

| Rule | Error Variants | Assessment |
|------|----------------|------------|
| Archived club write blocked | `ClubArchivedError (403)` vs `ForbiddenError (403)` | ⚠️ **MINOR**: Both return 403, but error codes differ (`CLUB_ARCHIVED` vs `FORBIDDEN`). Most places use `ClubArchivedError`, but `POST /api/clubs/[id]/join-requests` uses generic `ForbiddenError`. |
| Owner-only action blocked | `ForbiddenError (403)` vs `AuthError (403)` | ⚠️ **MINOR**: Paid club event publish uses `AuthError` with 403 status, while other owner-only checks use `ForbiddenError`. |
| Subscription not active | `PaywallError (402)` always | ✅ OK — Consistent |
| Plan limits exceeded | `PaywallError (402)` always | ✅ OK — Consistent |

---

## Gaps Identified

| Gap ID | Description | Severity | Recommendation |
|--------|-------------|----------|----------------|
| **GAP-B3-1** | `approveClubJoinRequest()` does NOT enforce `CLUB_INVITE_MEMBER` — no check for max members limit when approving join request | **HIGH** | Add `enforceClubAction(CLUB_INVITE_MEMBER)` call before member creation in Phase B3-2 |
| **GAP-B3-2** | `POST /api/clubs/[id]/members` endpoint disabled (503) — direct member invite flow unavailable | **LOW** | By design; awaiting Phase 3 canonical refactor |
| **GAP-B3-3** | Inconsistent error types for archived club (ClubArchivedError vs ForbiddenError) | **LOW** | Normalize to `ClubArchivedError` in Phase B3-2 |
| **GAP-B3-4** | Participant registration uses `CLUB_CREATE_EVENT` action code instead of dedicated code | **TRIVIAL** | Document as acceptable reuse; no action required |

---

## Error Code Reference

### PaywallError Reasons (402)

| Reason Code | When Thrown | Options Offered |
|-------------|-------------|-----------------|
| `SUBSCRIPTION_NOT_ACTIVE` | Club subscription expired/grace/pending | CLUB_ACCESS (renew) |
| `PAID_EVENTS_NOT_ALLOWED` | Plan doesn't support paid events | CLUB_ACCESS (upgrade) |
| `CSV_EXPORT_NOT_ALLOWED` | Plan doesn't support CSV export | CLUB_ACCESS (upgrade) |
| `MAX_EVENT_PARTICIPANTS_EXCEEDED` | Event participants exceed plan limit | CLUB_ACCESS (upgrade) |
| `MAX_CLUB_MEMBERS_EXCEEDED` | Club members exceed plan limit | CLUB_ACCESS (upgrade) |
| `PUBLISH_REQUIRES_PAYMENT` | Personal event 16-500 needs payment | ONE_OFF_CREDIT + CLUB_ACCESS |
| `CLUB_REQUIRED_FOR_LARGE_EVENT` | Personal event >500 requires club | CLUB_ACCESS only |

### Special Errors

| Error Class | HTTP Status | Code | When Thrown |
|-------------|-------------|------|-------------|
| `CreditConfirmationRequiredError` | 409 | `CREDIT_CONFIRMATION_REQUIRED` | User has credit, needs explicit confirmation |
| `ClubArchivedError` | 403 | `CLUB_ARCHIVED` | Write operation on archived club |
| `ForbiddenError` | 403 | `FORBIDDEN` | Generic access denied (RBAC) |
| `AuthError` | 403 | `AuthError` | Authenticated but insufficient permission |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | Not authenticated |

---

## Cross-References

| Topic | Document | Section |
|-------|----------|---------|
| Billing enforcement algorithm | SSOT_BILLING_SYSTEM_ANALYSIS.md | §4 Система enforcement |
| Event save enforcement (v5) | SSOT_BILLING_SYSTEM_ANALYSIS.md | §7 Event Save Enforcement |
| PaywallError structure | SSOT_BILLING_SYSTEM_ANALYSIS.md | §4.3 PaywallError структура |
| API error model | SSOT_API.md | §6 Error Model |
| Auth context types | SSOT_ARCHITECTURE.md | §8.3 Auth Context Types |
| Error & Abort model | Clubs Implementation Blueprint v1 | §3.3 Error & Abort Model |
| Club Events billing | Clubs Implementation Blueprint v1 | §5.6 Club Events |

---

## Next Steps

This inventory is input for **Phase B3-2: UX Normalization** which will:

1. Address **GAP-B3-1** (missing max members enforcement)
2. Normalize error responses for archived clubs (**GAP-B3-3**)
3. Ensure all enforcement points have consistent UI state mapping
4. Update SSOT documents with normalized behavior

---

**Phase B3-1 inventory complete. No code was modified.**
