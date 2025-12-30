# Need4Trip — Clubs & Events Access Model (SSOT)
**Status:** LOCKED / Production-target  
**Version:** 1.0  
**Last Updated:** 2025-12-30  
**Owner SSOT:** This document defines the ONLY authoritative rules for:
- Club roles & permissions
- Club selection rules for events
- Paid modes (personal credit vs club subscription)
- Publish enforcement & validation

This SSOT must be read and followed for any changes in:
- Clubs (memberships, roles, club page management)
- Events create/update/publish flows
- Billing enforcement for paid events

Related SSOTs:
- ARCHITECTURE.md (layering, ownership map, service boundaries)
- DATABASE.md (schema, constraints, RLS)
- BILLING_SYSTEM_ANALYSIS.md (billing products, paywall rules)

---

## 1. Definitions (Canonical)

### 1.1 Club Context & Multi-club Roles
A user may belong to multiple clubs and have different roles per club.

Role is ALWAYS evaluated in the context of the selected `club_id`:
`effectiveRole = club_members.role WHERE club_id = selectedClubId AND user_id = currentUserId`.

No global club role exists.

### 1.2 Event Clubness (Canonical)
Event is club event iff `club_id IS NOT NULL`.

DB invariant:
- `is_club_event = TRUE` iff `club_id IS NOT NULL`
- `is_club_event` is synchronized by DB trigger
- DB constraint enforces equivalence

Therefore:
- UI “Club event” mode exists only to set/unset `club_id`
- Backend must treat `club_id` as the source of truth

### 1.3 Paid Modes (No Mixing)
There are exactly two paid modes:

A) Personal paid (one-off):
- Event has `club_id = NULL`
- Paid capability is determined by user-owned `billing_credits`
- Credit is consumed at publish and bound to the event (consumed_event_id)

B) Club paid (subscription):
- Event has `club_id != NULL`
- Paid capability is determined exclusively by club subscription + club plan capability
- Personal credits MUST NOT be offered or consumed for club events

No mixing is allowed:
- Club event cannot use personal credits.
- Personal event cannot use club subscription.

---

## 2. Roles (Simplified RBAC)

Canonical club roles (and ONLY these values):
- **owner** — Full control, billing authority
- **admin** — Content & operations (events, club page), NO member management, NO paid event publish
- **member** — Read-only access to club content
- **pending** — Invited but not yet accepted; NO elevated permissions (treated as non-member for all authorization checks)

`organizer` is deprecated and must not exist.

Guest is not a club role (it is unauthenticated state).

Trusted Partner is NOT a role:
- It is a per-club badge + scoped permissions limited to partner directories only.
- Trusted Partner never gains event creation/publish rights by the badge alone.

**Authorization Rules for `pending`:**
- `pending` has NO elevated permissions (same effective permissions as non-member or guest)
- `pending` MUST NOT grant club event creation/publish rights
- All authorization checks treat `pending` as insufficient for any club operations
- Example: `if (role !== "owner" && role !== "admin") throw 403` — this rejects `pending` and `member`

---

## 3. Ownership & Billing Authority

### 3.1 Club Owner (Business Rule)
The club owner is the user who holds the club subscription responsibility (billing authority).
Implementation must ensure consistency between:
- club subscription ownership/authority
- club_members role = owner

(How ownership transfer is implemented is out of scope; the invariant is in scope.)

### 3.2 Admin Scope
Admin is a content & operations role inside a club:
- Can manage club page content
- Can create and manage club events (free)
- Cannot manage club members (invite/remove/role changes)
- Cannot publish paid club events (default policy)

---

## 4. Event Creation UI Rules (Canonical)

### 4.1 Club Event Checkbox Visibility
IF the current user has NO memberships with role ∈ {owner, admin} in any club
THEN the "Club event" checkbox MUST NOT be shown in the UI.

Backend MUST still enforce permissions (UI is not authoritative).

### 4.2 Single Club Dropdown
There is exactly ONE club dropdown.

IF "Club event" checkbox is ON
THEN:
- show club dropdown
- dropdown is REQUIRED
- options = clubs where user role ∈ {owner, admin}
- if options count == 1 -> auto-select it
- else require explicit selection

IF "Club event" checkbox is OFF
THEN:
- hide club dropdown
- do not send club_id (or send null)

### 4.3 Validation
IF "Club event" checkbox is ON
THEN both client and server validation MUST require a valid `club_id`.

IF "Club event" checkbox is OFF
THEN `club_id` MUST be null/absent.

---

## 5. Backend Authorization Rules (IF–THEN)

### 5.1 Create/Update Club Event
IF request creates/updates an event with `club_id = X`
THEN:
- membership must exist for (X, currentUser)
- role must be in {owner, admin}
ELSE -> 403

### 5.2 Create/Update Personal Event
IF event has `club_id = NULL`
THEN:
- only event owner (created_by_user_id == currentUser.id) can update/delete
ELSE -> 403

### 5.3 Publish — Personal Paid via Credit
IF event has `club_id = NULL` AND `is_paid = true`
THEN:
- require user has an AVAILABLE credit of required type
- require explicit confirmation (confirm_credit=1) when applicable
- consume credit transactionally and bind it to event (consumed_event_id)
ELSE -> paywall / error

### 5.4 Publish — Club Paid via Subscription (No Credits)
IF event has `club_id = X` AND `is_paid = true`
THEN:
- require club X has subscription in status {active, pending, grace}
- require plan allows paid events (canonical flag planAllowsPaidEvents)
- credits MUST NOT be used or accepted in this flow

DEFAULT PUBLISH PERMISSION:
- ONLY role=owner in club X may publish paid club events.
- admin may create/update events but may not publish paid club events.

### 5.5 Publish — Club Free
IF event has `club_id = X` AND `is_paid = false`
THEN role in {owner, admin} may publish.

---

## 6. Club Page & Members Management

### 6.1 Club Page Content
Owner and Admin may edit club page content:
- about/description
- FAQ
- contacts
- rules
- partner directories (subject to partner constraints)

### 6.2 Members Management (Owner-only)
Only Owner may:
- invite/remove members
- change roles

Admin may NOT manage members.

---

## 7. Partner Directories (Trusted Partner Badge)

Trusted Partner badge grants scoped rights:
- can edit ONLY their partner entry (or partner entries they are assigned to)
- cannot edit general club content unless they also have role owner/admin
- cannot create/publish events by badge alone

---

## 8. Canonical Matrices

### 8.1 Events (Create/Update/Publish)
| Context | Role in selected club | Create/Update | Publish Free | Publish Paid |
|---|---|---:|---:|---:|
| Personal (club_id=null) | n/a | Creator only | Creator only | Creator only (requires credit) |
| Club (club_id=X) | owner | ✅ | ✅ | ✅ (requires subscription+planAllowsPaidEvents) |
| Club (club_id=X) | admin | ✅ | ✅ | ❌ (default policy) |
| Club (club_id=X) | member/none | ❌ | ❌ | ❌ |

### 8.2 Club Operations
| Action | Owner | Admin | Member | Trusted Partner (badge only) |
|---|---:|---:|---:|---:|
| Edit club page content | ✅ | ✅ | ❌ | ❌ |
| Manage members | ✅ | ❌ | ❌ | ❌ |
| Manage partner directories | ✅ | ✅ | ❌ | ✅ (scoped) |

---

## 9. Non-negotiable Consistency Checks
Any implementation change MUST ensure:

1) DB roles do not contain `organizer`
2) UI shows club checkbox only if user has {owner/admin} in any club
3) Exactly one club dropdown, shown only when club checkbox is ON
4) Club selection validation is enforced in backend
5) No personal credits used for club-paid events
6) Paid club publish is owner-only (default policy)
7) Documentation (SSOT) updated in same commit as code/schema changes

---

## Appendix A — Negative Test Cases & Edge Cases (MANDATORY)

This appendix defines MUST-PASS scenarios. Any implementation is considered invalid if any scenario behaves differently.

### A0. Notation
- User U
- Clubs: A, B, C
- Roles per club: owner/admin/member/pending
- `pending` = invited but not accepted, has NO permissions (treated as none/insufficient for all checks)
- "Club event checkbox" refers to UI toggle that enables club mode (i.e., sets club_id)
- "Dropdown" refers to the SINGLE club dropdown shown only when club mode is enabled.

---

## A1. UI Visibility & Club Dropdown Scenarios

### A1.1 User has no clubs at all
Given: U has no club_members records
Then:
- Club event checkbox is NOT visible
- No club dropdown is shown
- Any attempt to create event with club_id != null must be rejected server-side (403)

### A1.2 User is member-only in all clubs
Given: U is member in A, member in B
Then:
- Club event checkbox is NOT visible
- Any attempt to create/update/publish with club_id in {A,B} must be rejected (403)

### A1.3 User is admin in exactly one club
Given: U is admin in A
Then:
- Club event checkbox IS visible
- When checkbox ON: dropdown shows exactly 1 option (A) and is auto-selected
- When checkbox OFF: dropdown hidden and club_id must be null/absent

### A1.4 User is admin/owner in multiple clubs
Given: U is admin in A, owner in B, member in C
Then:
- Club event checkbox IS visible
- When checkbox ON: dropdown shows only {A,B} (NOT C)
- No default selection if >1 option; selection is required

### A1.5 Club selection must be validated (UI + backend)
Given: U is admin in A and checkbox ON but does not choose club
Then:
- Client validation must block submit (422 in UI)
- Server must also reject (422) if request somehow arrives without club_id

---

## A2. Multi-club Role Correctness (No Role Leakage)

### A2.1 Owner role must not "leak" between clubs
Given: U is owner in B, member in A
When: U tries to create/update/publish event with club_id=A
Then:
- DENY (403) for create/update/publish (U is not owner/admin in A)

### A2.2 Admin role must be evaluated per selected club
Given: U is admin in A, member in B
When: U selects B in dropdown and tries to create club event
Then:
- DENY (403)

---

## A3. Event Type Integrity (club_id is source of truth)

### A3.1 Club mode ON implies club_id non-null
Given: UI club checkbox ON
Then:
- request MUST include club_id (selected)
- server must not accept "club event" without club_id

### A3.2 Club mode OFF implies club_id null
Given: UI club checkbox OFF
Then:
- request MUST NOT set club_id
- server must treat club_id presence as club context regardless of any client-side flags

---

## A4. Publish Rules: Personal vs Club (No Mixing)

### A4.1 Personal paid must NOT require club selection
Given: U creates personal event (club checkbox OFF / club_id null), is_paid=true
Then:
- No club dropdown required or shown
- Publish uses user credits (if available) with explicit confirmation
- Backend must not require club_id

### A4.2 Club paid must NEVER use personal credits
Given: U is owner in A, A has active subscription+planAllowsPaidEvents=true
And: U has personal credits available
When: U publishes club event with club_id=A and is_paid=true
Then:
- Publish must be governed exclusively by club subscription/plan
- Any confirm_credit or credit usage in request must be ignored or rejected (consistent behavior must be defined and documented; recommended: reject with 422 if credit parameters are present in club context)

### A4.3 Club paid publish is owner-only (default policy)
Given: U is admin in A, A has active subscription+planAllowsPaidEvents=true
When: U attempts to publish club event with is_paid=true
Then:
- DENY (403 or paywall-style error, but MUST be non-success)
- UI must indicate "Owner action required" (exact wording out of scope)

### A4.4 Club free publish allowed for admin
Given: U is admin in A
When: U publishes club event with is_paid=false
Then:
- ALLOW

---

## A5. Member Management (Owner-only)

### A5.1 Admin cannot manage members
Given: U is admin in A
When: U tries to invite/remove/change role for members in A
Then:
- DENY (403)
- Ensure no DB RLS or API route allows this implicitly

### A5.2 Owner can manage members
Given: U is owner in A
Then:
- invite/remove/role changes are allowed

---

## A6. Organizer Role Removal Regression

### A6.1 No 'organizer' role exists post-migration
Then:
- DB constraint/check does not permit 'organizer'
- No code paths reference 'organizer'
- No docs mention 'organizer' as an active role

---

## A7. Documentation Consistency Checks

### A7.1 club_plans paid flag naming is consistent
Then:
- DATABASE.md uses a single canonical field naming for paid capability (reflecting actual DB schema)
- All code uses one semantic helper: planAllowsPaidEvents
- No other docs define conflicting field names for the same capability

### A7.2 ARCHITECTURE / DATABASE reference this SSOT
Then:
- ARCHITECTURE.md and DATABASE.md reference this SSOT without duplicating rules
- No contradictory rules remain in other docs
