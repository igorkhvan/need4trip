# Phase B3-5: Micro-Audit for Class A Backend Gaps

---
Status: ACCEPTED  
Created: 2026-01-30  
Author: Cursor AI  
Phase: B3  
Scope: READ-ONLY analysis — no code modified
---

## 1. Purpose

This document provides a **COMPLETE audit** of Class A backend gaps that violate:
- Billing limits
- Subscription enforcement
- Role-based access
- Lifecycle constraints (archived, expired, etc.)

**Scope Lock:** This is READ-ONLY analysis. No code modifications.

---

## 2. Authoritative References Consulted

| Document | Version | Sections |
|----------|---------|----------|
| PHASE_B3-1_ENFORCEMENT_TOUCHPOINT_INVENTORY.md | ✅ COMPLETE | Full document |
| SSOT_BILLING_SYSTEM_ANALYSIS.md | v5.9.2 | §4 Enforcement, §7 Event Save Enforcement |
| SSOT_CLUBS_DOMAIN.md | v1.5.1 | §3 Ownership, §5 Membership Entry, §8.3 Archived State |
| SSOT_ARCHITECTURE.md | v5.3 | §8.3 Auth Context Types, §15 Aborted Actions |
| SSOT_CLUBS_EVENTS_ACCESS.md | v1.7.1 | §5 Backend Authorization, §10 Billing Credits |
| CLUBS_IMPLEMENTATION_BLUEPRINT v1 | FROZEN | §3.3 Error & Abort Model, §5.6 Club Events |

---

## 3. Audit Results (Class A Gaps)

| Gap ID | Area | Invariant Violated | Affected Endpoint(s) | Why This Is Dangerous | Evidence | Severity |
|--------|------|-------------------|---------------------|----------------------|----------|----------|
| GAP-B3.5-1 | Club Membership — Join Request Approval | SSOT_BILLING §4: `enforceClubAction(CLUB_INVITE_MEMBER)` MUST check `MAX_CLUB_MEMBERS_EXCEEDED` before adding member | `POST /api/clubs/[id]/join-requests/[rid]/approve` | Clubs can exceed their plan's member limit. Owner can approve unlimited join requests, bypassing billing enforcement. Subscription revenue leakage. | `src/lib/services/clubs.ts` → `approveClubJoinRequest()` (lines 892-943): Calls `assertClubNotArchived()` and `requireClubOwnerOrAdmin()` but **does NOT call** `enforceClubAction({ action: "CLUB_INVITE_MEMBER", context: { clubMembersCount } })` before `approveJoinRequestTransactionalRepo()`. | **HIGH** |
| GAP-B3.5-2 | Club Membership — Invite Creation | SSOT_BILLING §4: Write operations affecting billing limits SHOULD enforce at operation time | `createClubInvite()` (service layer, no public API) | Invites can be created for clubs already at member limit. When invite acceptance is implemented, this will create confusing UX (invite exists but cannot be accepted). Defensive enforcement missing. | `src/lib/services/clubs.ts` → `createClubInvite()` (lines 747-778): Checks `assertClubNotArchived()` and `requireClubOwner()` but **does NOT call** `enforceClubAction({ action: "CLUB_INVITE_MEMBER" })`. Note: Invite acceptance flow is NOT implemented, reducing immediate impact. | **MEDIUM** |

---

## 4. Detailed Gap Analysis

### 4.1 GAP-B3.5-1: approveClubJoinRequest() Missing Billing Enforcement

**File:** `src/lib/services/clubs.ts`

**Function:** `approveClubJoinRequest()` (lines 892-943)

**Current flow:**
1. ✅ Verifies join request exists and belongs to club
2. ✅ Verifies request status is 'pending'
3. ✅ Calls `assertClubNotArchived(clubId, ...)`
4. ✅ Calls `requireClubOwnerOrAdmin(clubId, currentUser.id, ...)`
5. ❌ **MISSING:** `enforceClubAction({ clubId, action: "CLUB_INVITE_MEMBER", context: { clubMembersCount } })`
6. Calls `approveJoinRequestTransactionalRepo()` — adds member to club

**Why dangerous:**
- Club on `club_50` plan (max 50 members) can have 100+ members if owner approves all join requests
- No billing paywall shown, no upgrade prompt
- Direct violation of billing contract and subscription limits

**Canonical fix location:** Before step 6, add:

```typescript
const memberCount = await countMembers(clubId);
await enforceClubAction({
  clubId,
  action: "CLUB_INVITE_MEMBER",
  context: { clubMembersCount: memberCount },
});
```

---

### 4.2 GAP-B3.5-2: createClubInvite() Missing Billing Check

**File:** `src/lib/services/clubs.ts`

**Function:** `createClubInvite()` (lines 747-778)

**Current flow:**
1. ✅ Calls `assertClubNotArchived(clubId, ...)`
2. ✅ Calls `requireClubOwner(clubId, ...)`
3. ✅ Checks user not already member
4. ❌ **MISSING:** `enforceClubAction({ clubId, action: "CLUB_INVITE_MEMBER", context: { clubMembersCount } })`
5. Creates invite record

**Mitigating factor:**
- Invite acceptance API is **NOT IMPLEMENTED** (no `acceptClubInvite()` function)
- Invites can be created but not accepted through the system
- This reduces severity from HIGH to MEDIUM

**Why still a gap:**
- When acceptance is implemented, billing enforcement will be needed there OR here
- Creating invites for clubs at limit creates confusing admin UX
- Defensive enforcement is architectural best practice

---

## 5. Verified Non-Gaps (Compliant Areas)

The following areas were audited and found **compliant**:

| Area | Enforcement Point | Status |
|------|------------------|--------|
| Event creation (club) | `createEvent()` → `enforceEventPublish()` | ✅ OK |
| Event update (club) | `updateEvent()` → `enforceEventPublish()` | ✅ OK |
| Participant registration (club event) | `registerParticipant()` → `enforceClubAction(CLUB_CREATE_EVENT)` | ✅ OK |
| CSV Export | `/api/clubs/[id]/export` → `enforceClubAction(CLUB_EXPORT_PARTICIPANTS_CSV)` | ✅ OK |
| Subscription purchase | `/api/billing/purchase-intent` → owner-only check | ✅ OK |
| Archived club — event operations | `createEvent()`, `updateEvent()`, `deleteEvent()` → `assertClubNotArchived()` | ✅ OK |
| Archived club — join request operations | `approveClubJoinRequest()`, `rejectClubJoinRequest()` → `assertClubNotArchived()` | ✅ OK |
| Archived club — member management | `updateClubMemberRole()`, `removeClubMember()` → `assertClubNotArchived()` | ✅ OK |
| Paid club event publish | `enforceEventPublish()` → owner-only check for `isPaid=true` | ✅ OK |
| Role changes | `updateClubMemberRole()` → `requireClubOwner()` | ✅ OK |
| Member removal | `removeClubMember()` → `requireClubOwner()` for non-self | ✅ OK |

---

## 6. Audit Areas Covered

Per task specification, the following areas were audited:

### 6.1 Club Membership Flows

| Flow | Endpoint/Function | Billing Enforced | Archived Check | RBAC |
|------|-------------------|-----------------|----------------|------|
| Invite | `createClubInvite()` | ❌ **MISSING** | ✅ | ✅ |
| Approve join request | `approveClubJoinRequest()` | ❌ **MISSING** | ✅ | ✅ |
| Direct add | `POST /api/clubs/[id]/members` | N/A (disabled 503) | N/A | N/A |
| Role changes | `updateClubMemberRole()` | N/A | ✅ | ✅ |
| Removal / leave | `removeClubMember()` | N/A | ✅ (for removal) | ✅ |

### 6.2 Event Lifecycle

| Flow | Endpoint/Function | Billing Enforced | Archived Check | RBAC |
|------|-------------------|-----------------|----------------|------|
| Create | `createEvent()` | ✅ `enforceEventPublish()` | ✅ | ✅ |
| Update | `updateEvent()` | ✅ `enforceEventPublish()` | ✅ | ✅ |
| Delete | `deleteEvent()` | N/A | ✅ | ✅ |
| Participant registration | `registerParticipant()` | ✅ `enforceClubAction()` | N/A | ✅ |

### 6.3 Billing-Related Actions

| Flow | Endpoint/Function | Owner-Only | Billing Enforced |
|------|-------------------|-----------|-----------------|
| Subscription purchase | `POST /api/billing/purchase-intent` | ✅ | ✅ |
| CSV export | `GET /api/clubs/[id]/export` | Admin+ | ✅ `enforceClubAction(CSV_EXPORT)` |
| Paid event creation | `createEvent()` | Owner-only for paid | ✅ `enforceEventPublish()` |
| Credit consumption | `createEvent()`/`updateEvent()` | N/A | ✅ (confirm_credit flow) |

### 6.4 Lifecycle Constraints

| Constraint | Enforcement | Status |
|------------|-------------|--------|
| Archived club — write ops | `assertClubNotArchived()` | ✅ Enforced |
| Expired subscription | `enforceClubAction()` / `enforceEventPublish()` | ✅ Enforced |
| Grace period | `isActionAllowed()` | ✅ Enforced |

---

## 7. Correlation with PHASE_B3-1

PHASE_B3-1 identified the following gaps. This audit confirms and extends:

| B3-1 Gap ID | Description | B3.5 Confirmation |
|-------------|-------------|-------------------|
| GAP-B3-1 | `approveClubJoinRequest()` missing max members check | ✅ Confirmed as **GAP-B3.5-1** (HIGH) |
| GAP-B3-2 | `POST /api/clubs/[id]/members` disabled (503) | ✅ Confirmed (by design, not a gap) |
| GAP-B3-3 | Inconsistent error types for archived club | ✅ Confirmed (LOW, out of scope for Class A) |
| GAP-B3-4 | Participant registration uses `CLUB_CREATE_EVENT` action | ✅ Confirmed (TRIVIAL, semantically ok) |

**New gap found in B3.5:**
- **GAP-B3.5-2**: `createClubInvite()` missing billing check (MEDIUM)

---

## 8. Audit Conclusion

**Total Class A gaps found:** 2

| Severity | Count | Gap IDs |
|----------|-------|---------|
| **HIGH** | 1 | GAP-B3.5-1 |
| **MEDIUM** | 1 | GAP-B3.5-2 |

### Phase B4/B5 Status

⚠️ **BLOCKED**

GAP-B3.5-1 is a **HIGH severity billing enforcement gap** that allows subscription limit bypass. This MUST be fixed before proceeding to Phase B4/B5.

### Recommended Actions

| Priority | Gap | Action |
|----------|-----|--------|
| **P0** | GAP-B3.5-1 | Add `enforceClubAction(CLUB_INVITE_MEMBER)` to `approveClubJoinRequest()` |
| **P1** | GAP-B3.5-2 | Add billing check to `createClubInvite()` OR defer to invite acceptance flow |

---

## 9. Cross-References

| Topic | Document | Section |
|-------|----------|---------|
| Billing enforcement algorithm | SSOT_BILLING_SYSTEM_ANALYSIS.md | §4 Система enforcement |
| Member limit enforcement | SSOT_BILLING_SYSTEM_ANALYSIS.md | §4.3 CLUB_INVITE_MEMBER |
| Club membership flows | SSOT_CLUBS_DOMAIN.md | §5 Membership Entry Methods |
| Archived club whitelist | SSOT_CLUBS_DOMAIN.md | §8.3.1 Allowed Operations |
| Enforcement touchpoints | PHASE_B3-1_ENFORCEMENT_TOUCHPOINT_INVENTORY.md | Full document |

---

**Phase B3.5 micro-audit complete. No code was modified.**
