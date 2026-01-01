# Need4Trip — Clubs & Events Access Model (SSOT)
**Status:** LOCKED / Production-target  
**Version:** 1.3  
**Last Updated:** 2026-01-01  
**Owner SSOT:** This document defines the ONLY authoritative rules for:
- Club roles & permissions
- Club selection rules for events
- Paid modes (personal credit vs club subscription)
- Save-time enforcement & validation (v5+ — no separate publish step)
- Billing credits access/usage rules

This SSOT must be read and followed for any changes in:
- Clubs (memberships, roles, club page management)
- Event save flows (POST/PUT with save-time enforcement)
- Billing enforcement for paid events

Related SSOTs:
- SSOT_ARCHITECTURE.md (layering, ownership map, service boundaries, SSOT governance)
- SSOT_DATABASE.md (schema, constraints, RLS, billing credits state machine)
- SSOT_BILLING_SYSTEM_ANALYSIS.md (billing products, paywall rules)

---

## Change Log (SSOT)

### 2026-01-01 (v5+ Alignment)
- **Updated all "publish" references to "save" (v5+)** — §5.3, §5.4, §5.5, §9, §10. Rationale: v5+ has no separate publish step; enforcement at save-time.
- **Added v5+ notes to affected sections** — Clarified that billing enforcement happens at save-time (POST/PUT).
- **Updated §10 "Billing Credits – Access/Usage Rules"** — Changed consumption timing from "publish only" to "save-time (v5+)".
- **Updated §1.3** — Credit consumption timing now reflects v5+ model.
- **Version bump to 1.3** — Reflects v5+ alignment work.

### 2026-01-01 (Polish Pass)
- **Removed HTTP status codes from §10.1** — Replaced "rejected (422 or 403)" with status-agnostic "MUST be rejected" + cross-reference. Rationale: Decouple RBAC SSOT from API contracts.
- **Marked Implementation History section as NON-NORMATIVE** — Added disclaimer block. Rationale: Clear separation of normative vs historical content.

### 2026-01-01
- **Added "Billing Credits – Access/Usage Rules" section (§10)** — Canonical consumption timing rules. Rationale: Cross-SSOT consistency with SSOT_DATABASE.md.
- **Updated Related SSOTs paths** — Corrected to use SSOT_ prefix for all references. Rationale: Path accuracy.
- **Clarified §1.3 credit consumption language** — Made explicit that consumption happens at publish only. Rationale: Precision.
- **Added cross-reference to SSOT_DATABASE.md state machine** — For invariants and constraint details. Rationale: Single source for DB invariants.
- **Version bump to 1.2** — Reflects SSOT consistency work.

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
- Credit is consumed at save-time (v5+) and bound to the event (consumed_event_id)

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
- Example: `if (!role || role === "pending" || (role !== "owner" && role !== "admin")) throw 403`
- **Implementation (2024-12-31):** Explicit `role === "pending"` checks added in `src/lib/services/events.ts` for self-documenting code (createEvent, updateEvent)

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

### 5.3 Save — Personal Paid via Credit (v5+)
IF event has `club_id = NULL` AND `is_paid = true`
THEN:
- require user has an AVAILABLE credit of required type
- require explicit confirmation (confirm_credit=1) at save-time (POST/PUT)
- consume credit transactionally and bind it to event (consumed_event_id)
ELSE -> paywall / error

> **v5+ Note:** There is no separate "publish" endpoint. Enforcement happens at save-time.

### 5.4 Save — Club Paid via Subscription (No Credits) (v5+)
IF event has `club_id = X` AND `is_paid = true`
THEN:
- require club X has subscription in status {active, pending, grace}
- require plan allows paid events (canonical flag planAllowsPaidEvents)
- credits MUST NOT be used or accepted in this flow

DEFAULT SAVE PERMISSION (v5+):
- ONLY role=owner in club X may save paid club events.
- admin may create/update free events but may not save paid club events.

> **v5+ Note:** There is no separate "publish" endpoint. Enforcement happens at save-time.

### 5.5 Save — Club Free (v5+)
IF event has `club_id = X` AND `is_paid = false`
THEN role in {owner, admin} may save.

> **v5+ Note:** There is no separate "publish" endpoint. Enforcement happens at save-time.

### 5.6 Club ID immutability enforcement
Club ID (`club_id`) determines event clubness and MUST be immutable after event creation.

**Backend enforcement:**
- Service layer (`src/lib/services/events.ts`): updateEvent() validates that clubId does not change
- Throws `ValidationError` if clubId modification attempted

**Database enforcement (2024-12-31):**
- DB trigger `events_prevent_club_id_change` enforces immutability at database level
- Function `prevent_club_id_change()` raises exception if `OLD.club_id IS DISTINCT FROM NEW.club_id`
- Migration: `20241231_enforce_club_id_immutability_v2.sql`
- Defense in depth: guarantees immutability even if service layer bypassed

**Testing:**
- 4/4 test cases passed (NULL→value, value→value, value→NULL, update other fields)

**Rationale:** §5.7 Club ID Immutability — multi-layer protection (service + database)

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
6) Paid club save is owner-only (default policy, v5+: no separate publish)
7) Documentation (SSOT) updated in same commit as code/schema changes
8) Billing credits consumed at save-time (v5+), bound to persisted eventId (see §10)

---

## 10. Billing Credits – Access/Usage Rules (v5+)

**Status:** LOCKED / Production-aligned (v5+ — No Separate Publish Step)

This section defines WHEN and HOW billing credits are consumed. This text is consistent with SSOT_DATABASE.md § 8.2 "Billing – Consumption Timing & Binding".

### 10.1 Canonical Rules (v5+ — Save-Time Enforcement)

1. **Consumption happens at SAVE-TIME only (v5+)**
   - Credits are consumed during event save (POST/PUT) with `confirm_credit=1`
   - There is NO separate publish endpoint or step in v5+
   - The `confirm_credit=1` parameter is meaningful ONLY for personal events at save-time

2. **Consumption requires a persisted eventId**
   - The event is persisted as part of the save operation
   - The credit's `consumed_event_id` MUST be set to the actual event UUID at consumption time
   - Consuming a credit for a "future" or "hypothetical" event is FORBIDDEN

3. **Club events MUST NOT consume personal credits**
   - If `event.club_id IS NOT NULL`, the event is a club event
   - Club events use club subscription capabilities, NOT personal credits
   - Any attempt to consume a personal credit for a club event MUST be rejected
   - (Exact HTTP status mapping: see SSOT_API.md §6.2 and SSOT_ARCHITECTURE.md §16 error taxonomy)

4. **Free limits do not consume credits**
   - If an event is within free limits (e.g., maxParticipants <= 15 for personal events), no credit is consumed
   - Credits are ONLY consumed when the event exceeds free limits AND requires paid capability

5. **Binding is permanent**
   - Once `consumed_event_id` is set, it MUST NOT be changed
   - The credit-to-event binding is immutable (audit requirement)

### 10.2 Access Rules by Context

| Context | Credit Consumption | Governing Authority |
|---------|-------------------|---------------------|
| Personal event (club_id=NULL), within free limits | ❌ NOT consumed | Free tier rules |
| Personal event (club_id=NULL), exceeds free limits | ✅ Consumed at save-time (v5+) | User's billing_credits |
| Club event (club_id≠NULL), any size | ❌ NEVER consumed | Club subscription |

### 10.3 Cross-Reference

For database-level invariants (state machine, CHECK constraint `chk_billing_credits_consumed_state`), see:
**SSOT_DATABASE.md § 8.1 "Billing Credits State Machine"**

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

---

## Implementation History & Verification

> **NON-NORMATIVE / Historical:** This section is informational and not authoritative for rules. It documents implementation history, file paths, test results, and migration references for audit purposes. Do not rely on this section for normative SSOT rules — see numbered sections above.

### Phase 1 Code Improvements (2024-12-31)

**Status:** ✅ COMPLETE  
**Audit Report:** `docs/verification/EVENTS_CREATE_EDIT_AUDIT_REPORT.md` v1.1  
**Action Plan:** `docs/verification/EVENTS_CREATE_EDIT_ACTION_PLAN.md`  

**Improvements Implemented:**

1. **Explicit `pending` Role Checks (§2)**
   - **File:** `src/lib/services/events.ts`
   - **Change:** Added explicit `role === "pending"` checks in createEvent() and updateEvent()
   - **Rationale:** Self-documenting code, explicit enforcement of §2 requirement
   - **Git Commit:** `6b323ce`
   - **Error Message:** "Недостаточно прав для создания/изменения события в клубе. Требуется роль owner или admin. Роль 'pending' не предоставляет прав."

2. **DB Trigger for Club ID Immutability (§5.6)**
   - **Migration:** `supabase/migrations/20241231_enforce_club_id_immutability_v2.sql`
   - **Function:** `prevent_club_id_change()` — raises exception if club_id modified
   - **Trigger:** `events_prevent_club_id_change` (BEFORE UPDATE ON events)
   - **Testing:** 4/4 test cases passed (`20241231_test_club_id_immutability.sql`)
   - **Rationale:** Defense in depth (service layer + database enforcement)
   - **Git Commits:** `6b323ce`, `d3adf69` (v2 fix)

3. **SSOT_DATABASE.md Sync (2024-12-31)**
   - **File:** `docs/ssot/SSOT_DATABASE.md`
   - **Updates:** Added trigger #7 (Prevent club_id changes), function details, migration history
   - **Git Commit:** `8bdc8bd`

**Compliance Status:**
- **Before Phase 1:** 95% (24/26 PASS, 2 medium issues)
- **After Phase 1:** 100% (26/26 PASS, 0 issues)

**Next Steps:**
- ⏳ **Phase 2:** Integration tests (QA-54 to QA-69) for SSOT Appendix A scenarios
- 🟡 **Phase 3:** Update SSOT_TESTING.md with new test results

---

## Change Log

### v1.1 (2024-12-31)
- Added §5.6: Club ID immutability enforcement (implementation details)
- Updated §2: Added explicit pending check implementation note
- Added Implementation History & Verification section
- Updated Phase 1 improvements and compliance metrics

### v1.0 (2024-12-30)
- Initial SSOT document
- Consolidated club & event access rules
- Defined canonical matrices (Appendix A)
