# Need4Trip — Clubs Domain (SSOT)

**Status:** LOCKED / Production-target  
**Version:** 1.4  
**Last Updated:** 2026-01-27  
**Owner SSOT:** This document defines the ONLY authoritative rules for:

---

### ⚠️ Clubs Settings v1 — COMPLETE & FROZEN

| Property | Value |
|----------|-------|
| **Status** | COMPLETE |
| **Freeze Date** | 2026-01-21 |
| **Scope** | §8.4 Club Settings (`public_members_list_enabled`, `public_show_owner_badge`, `open_join_enabled` reserved) |
| **Freeze Rule** | Any changes to Clubs Settings MUST be versioned as v2 with a new contract |

---
- Club entity domain model (lifecycle, visibility, settings)
- Membership model (entry methods, invites, join requests, transitions)
- Trust & Partner model (badges, scoped permissions)
- Club content domain (non-event content types)
- Club monetization boundaries (owner-only financial authority; integration points)
- Club network model (directory, discovery, relationships)
- Audit, security invariants, idempotency rules for club operations
- User profile visibility rules (cross-club)
- Telegram link exposure rules

This SSOT must be read and followed for any changes in:
- Clubs (entity lifecycle, visibility, settings)
- Memberships (invites, join requests, roles, transitions)
- Club page content (profile, FAQ, rules)
- Trust badges and partner directories
- User profile visibility across clubs
- Telegram link display policy

Related SSOTs:
- SSOT_CLUBS_EVENTS_ACCESS.md — RBAC + events access + paid modes separation + club_id canonical clubness
- SSOT_BILLING_SYSTEM_ANALYSIS.md — billing products, paywall rules, subscription enforcement, credits behavior, **cancellation policy (§ 11)**
- SSOT_ARCHITECTURE.md — layering, error taxonomy, aborted/incomplete actions canonical behavior
- SSOT_DATABASE.md — schema, constraints, RLS, state machines

---

## Change Log (SSOT)

### 2026-01-27 (v1.4)
- Clarified owner membership invariant: owner is a member with role = `owner` in `club_members` (§3.4)
- Clarified `club_members` as single source of truth for membership, roles, visibility, and preview eligibility (§2.2)
- Added Access vs Aggregation Semantics section (§4.4): aggregated fields represent absolute state, viewer-facing data is access-controlled
- Added Authentication Context dependency for access-controlled data (§0.5)

### 2026-01-24 (v1.3)
- Clarified inline error handling rules for Club Profile (§8.5): inline errors allowed for data fetch and inline operations; toast reserved for form submission flows
- Documented Back Button as canonical Club page element (§8.6): required navigation element with standard placement and styling
- Canonicalized external links placement in Club Header (§8.7): telegramUrl and websiteUrl rendered in Club Header ONLY

### 2026-01-22 (v1.2)
- Clarified §4.2: private clubs may expose a membership entry CTA to non-members
  while all descriptive, social, and activity-related content remains hidden.

### 2026-01-02 (v1.1 — D1–D9 Decisions)
- **D1:** Added `clubs.settings.public_members_list_enabled` flag (§8.4)
- **D2:** Added `clubs.settings.public_show_owner_badge` flag (§8.4)
- **D3:** Defined guest-visible member fields explicitly (§8.4.3)
- **D4:** Hardened invite link policy — auto-accept forbidden except Open Join (§5.2)
- **D5:** Archived club behavior now explicit whitelist + forbidden list (§8.3)
- **D7:** Ownership transfer hardened — separate command, atomic, idempotent (§7.4)
- **D8:** Added User Profile Visibility section (§18) — enum, access matrix, field exposure
- **D9:** Added Telegram Link Policy section (§19) — enabled flag, context limitations
- **Updated decision tables (A2)** to reflect optional guest members list

### 2026-01-01 (v1.0 — Initial)
- **Initial SSOT document** — Consolidated clubs domain model
- **Defined entities** — clubs, club_members, club_invites, club_join_requests, club_audit_log
- **Defined invariants** — exactly one owner, pending = no privileges, slug uniqueness
- **Defined entry methods** — direct invite, invite link, join request, open join (reserved)
- **Defined transitions** — leaving, removal, role changes, ownership transfer
- **Defined audit actions** — 15 canonical action codes
- **Added decision tables** — Appendix A (who can do what, visibility access)

---

## 0. SSOT Governance

### 0.1 SSOT-first
If any implementation conflicts with this SSOT, implementation is wrong.

### 0.2 Single Source of Truth
- Club context is identified by `club_id` only.
- Membership role is determined only by `club_members.role` for `(club_id, user_id)`.
- Any cached/derived fields must not be used for business decisions.

### 0.3 No Magic / No Implicit Behavior
- No silent fallback permissions.
- No automatic approvals.
- No automatic financial actions.
- Critical actions require explicit user intent (confirmations where relevant).

### 0.4 Normative vs Planned Sections
- Sections marked **NORMATIVE** are binding.
- Sections marked **RESERVED / PLANNED** define future extension slots and invariants, but may not require immediate implementation.

### 0.5 Authentication Context (NORMATIVE)

Access-controlled club data relies on a resolved authentication context.

**Invariants:**
- Absence of authentication context implies non-member access (guest).
- Authentication context MUST be resolved consistently for all access-controlled operations.
- This SSOT does not prescribe transport mechanism (cookies, headers, tokens); only the requirement that authentication context is resolved before evaluating access rules.

---

## 1. Definitions (Canonical)

### 1.1 Club
A club is a long-lived entity representing a community group with:
- identity (name/slug),
- membership list,
- governance (roles),
- content (events and other content),
- optionally monetization (subscription),
- optionally network presence (directory/discovery).

### 1.2 Membership
Membership is a relationship between a user and a club with a role.

### 1.3 Roles (Canonical)
Roles are ONLY:
- **owner** — full control, billing authority
- **admin** — content & operations (no member management, no financial authority)
- **member** — read access, participation
- **pending** — invited/requested but not accepted; no elevated permissions

No other roles exist. "Trusted Partner" is NOT a role.

### 1.4 Club Visibility
Club visibility affects what non-members can see:
- **public** — discoverable, public profile visible
- **private** — not discoverable; limited profile visibility

### 1.5 Trust Badge (Not a Role)
Trust badges are per-club labels with scoped permissions limited to partner directories and do not grant event creation/publish rights.

---

## 2. Domain Entities (NORMATIVE)

### 2.1 clubs

**Minimal canonical fields:**
- `id` (uuid)
- `name`
- `slug` (unique, case-insensitive)
- `visibility` (public | private)
- `owner_user_id` (canonical owner reference; must match club_members role invariant)
- `created_by_user_id`
- `created_at`, `updated_at`
- `archived_at` (nullable, soft-delete)
- `settings` (jsonb, see §8.4)

**Invariants:**
- `slug` unique (case-insensitive)
- Club has exactly one owner (see §3)
- Archived club behavior is defined by explicit whitelist (see §8.3)

### 2.2 club_members

**Fields:**
- `club_id`
- `user_id`
- `role` (owner|admin|member|pending)
- `joined_at` (nullable; set on acceptance)
- `created_at`, `updated_at`

**Invariants:**
- Unique `(club_id, user_id)`
- Exactly one owner per club
- `pending` implies `joined_at IS NULL`
- non-pending implies `joined_at IS NOT NULL`

**Single Source of Truth:**

`club_members` is the single source of truth for:
- membership existence (a user is a member iff a record exists with non-pending role)
- member roles (including owner)
- member visibility eligibility (who appears in members list)
- members preview eligibility (who appears in preview)

### 2.3 club_invites

Represents an invitation to join a club.

**Fields (canonical):**
- `id`
- `club_id`
- `invited_by_user_id` (MUST be owner; see §5)
- `invitee_user_id` (optional if target is known)
- `invitee_contact` (optional; e.g., Telegram handle/id; format defined by implementation)
- `token` (if invite is link-based)
- `status` (pending|accepted|expired|cancelled)
- `expires_at`
- `created_at`, `updated_at`

**Invariants:**
- Only one active invite per `(club_id, invitee_user_id)` may be pending
- Token-based invites must be unguessable and treated as secrets

### 2.4 club_join_requests (optional; recommended)

Represents "request to join" initiated by user.

**Fields:**
- `id`
- `club_id`
- `requester_user_id`
- `status` (pending|approved|rejected|cancelled|expired)
- `message` (optional, user-provided)
- `created_at`, `updated_at`, `expires_at` (optional)

**Invariants:**
- At most one pending request per `(club_id, requester_user_id)`

### 2.5 club_trust_badges (RESERVED / PLANNED)

**Fields (slot):**
- `club_id`
- `user_id` or `partner_entity_id`
- `badge_type` (e.g., trusted_partner)
- `scope` (permissions scope, strictly limited)
- `created_at`

### 2.6 club_audit_log (NORMATIVE)

**Fields:**
- `id`
- `club_id`
- `actor_user_id`
- `action_code` (see §9)
- `target_user_id` (nullable)
- `target_entity_type` (nullable)
- `target_entity_id` (nullable)
- `meta` (json)
- `created_at`

**Invariant:**
- Audit log is append-only.

---

## 3. Ownership & Role Invariants (NORMATIVE)

### 3.1 Exactly One Owner
Each club MUST have exactly one owner at all times.

### 3.2 Owner authority boundaries

Only owner may:
- manage members (invite/remove/role changes),
- change visibility (public/private),
- manage monetization/subscription decisions (integration with billing SSOT),
- transfer ownership,
- archive/delete club (subject to billing constraints),
- manage club settings (§8.4).

Admin must never be allowed to perform owner-only actions by any implicit path.

### 3.3 Pending has no privileges
`pending` is treated as non-member for all authorization decisions.

### 3.4 Owner is a member (NORMATIVE)

Owner is not a separate entity from membership. Owner is a role within membership.

**Invariants:**
- For every club, the owner MUST have a corresponding record in `club_members` with `role = 'owner'`.
- `clubs.owner_user_id` and the `club_members` record with `role = 'owner'` MUST reference the same user.
- There is no "ownership without membership" — owner always appears in the members list.

---

## 4. Visibility Model (NORMATIVE)

### 4.1 Visibility states

- **public**: club appears in discovery/directory (if enabled) and has a public profile page.
- **private**: club does not appear in discovery/directory; profile exposure is limited.

### 4.2 Public profile data (minimum)

For both public and private clubs, the server may return a minimal profile:
- name,
- slug,
- avatar and/or banner (if used),
- visibility indicator.

For private clubs, non-members may additionally see:
- a membership entry CTA (request to join).

All descriptive, social, and activity-related content MUST be hidden from non-members
of private clubs, including but not limited to:
- description / about text,
- cities and location metadata,
- members count and events count,
- members preview,
- events preview,
- external links (e.g., website, club-level Telegram),
- any other club internal or activity-derived data.

### 4.3 Access matrix for visibility

| Actor | Public club profile | Private club minimal profile | Club internal content |
|-------|---------------------|------------------------------|----------------------|
| Guest | ✅ | ✅ (minimal) | ❌ |
| Member | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| Owner | ✅ | ✅ | ✅ |

### 4.4 Access vs Aggregation Semantics (NORMATIVE)

Aggregated fields and viewer-facing data have different semantics:

**Aggregated fields** (e.g., memberCount, eventsCount):
- Represent absolute club state
- Not access-controlled
- Always reflect the true count

**Viewer-facing data** (e.g., members preview, events preview):
- Viewer-dependent
- Subject to access control rules (§4.3)
- May be hidden or filtered based on viewer's access level

**Valid state:**

It is valid and expected for:
- `memberCount > 0` while members preview is empty or hidden
- `eventsCount > 0` while events preview is empty or hidden

This occurs when the viewer lacks access to view member/event details but aggregated counts are exposed. This is an expected and supported state, not an error.

---

## 5. Membership Entry Methods (NORMATIVE)

This section defines ALL allowed ways a user can become a member.

### 5.1 Entry method: Owner Direct Invite (canonical)

**Flow:**
1. Owner creates invite targeting a specific user.
2. Invitee accepts.
3. Membership becomes `member` (default) unless owner explicitly assigns `admin` after acceptance.

**Rules:**
- Owner-only invite creation.
- Invite acceptance is user-only.
- Acceptance is idempotent.

### 5.2 Entry method: Invite Link (token) (NORMATIVE)

**Flow:**
1. Owner generates invite link (token).
2. User opens link while authenticated.
3. System creates a `club_join_request` with status `pending`.
4. Owner approves or rejects the request.

**Invariants:**
- Invite link ALWAYS creates a `club_join_request` pending owner approval.
- Auto-accept via invite link is **FORBIDDEN** unless Open Join is explicitly enabled (see §5.4).
- There is no "alternative" or "not recommended" auto-accept path — it does not exist outside Open Join.

**Rationale:** Invite links are shareable and may leak. Owner approval provides security gate.

### 5.3 Entry method: Request to Join (user-initiated)

**Flow:**
1. User requests to join a club (only if club is public OR has a known link).
2. Owner approves/rejects.
3. On approve: membership created as `member`.

**Rules:**
- Only owner may approve/reject.
- Requests are idempotent (one pending per user per club).

### 5.4 Entry method: Open Join (RESERVED / PLANNED)

A club may allow open join:
- users can join without owner approval.

**Invariant:**
- Open join must never grant admin/owner.
- Open join must be explicitly enabled by owner via `clubs.settings.open_join_enabled` (RESERVED).
- Open Join is the ONLY mechanism that allows instant membership without owner approval.

### 5.5 Entry method: Partner / Trust onboarding (RESERVED / PLANNED)

Partner directory may onboard "trusted partners" with scoped rights.

**Invariant:** Trust badge is not a role; it does not grant event rights.

---

## 6. Invite & Join Request State Machines (NORMATIVE)

### 6.1 Invite state machine

**States:** `pending` → `accepted`  
**Terminal:** `expired`, `cancelled`

**Rules:**
- TTL: default 7 days (configurable, but must exist)
- Resend behavior:
  - if pending exists for same (club, invitee), return existing invite and refresh `expires_at` (idempotent)
  - else create new invite

### 6.2 Join request state machine

**States:** `pending` → `approved` → (membership active)  
**Terminal:** `rejected`, `cancelled`, `expired`

**Rules:**
- one pending request per user per club
- user can cancel own pending request
- owner can reject; user can retry after rejection (creates new request)

### 6.3 Membership Requests v1 (NORMATIVE)

**Status:** LOCKED / Production-ready  
**Version:** v1  
**Last Updated:** 2026-01-22

This section defines the v1 implementation of membership requests for private clubs.

#### 6.3.1 Definition

A "membership request" is:
- NOT a role
- NOT a UI concept  
- A pending relationship between User and Club

#### 6.3.2 Preconditions (HARD)

A join request MAY be created ONLY IF:
- User is authenticated
- User is NOT already a club member (any role)
- User is NOT owner or admin of the club
- `club.settings.openJoinEnabled === false`

If `openJoinEnabled === true`:
- Join requests MUST NOT be used (user joins directly)

#### 6.3.3 Pending State (v1 Semantic)

- Pending state is **implicit**: a row exists in `club_join_requests`
- Status column exists in DB but v1 logic treats `status='pending'` + row existence as the pending state
- No explicit status tracking beyond pending in v1

#### 6.3.4 Operations

**User Actions:**

1. **Submit Join Request**
   - Effect: insert into `club_join_requests`
   - Errors: 409 if request already exists, 409 if user already a member

2. **Cancel Join Request** (OPTIONAL)
   - Effect: delete join request
   - RBAC: requester only

**Admin Actions (Owner | Admin only):**

3. **List Join Requests**
   - Returns pending requests for the club
   - Minimal payload only

4. **Approve Join Request**
   - MUST BE TRANSACTIONAL:
     1. insert into `club_members` with role='member'
     2. delete join request
   - Must be race-safe and idempotent

5. **Reject Join Request** (SILENT)
   - Effect: delete join request
   - NO messages, NO status stored, NO feedback

#### 6.3.5 RBAC Rules (HARD)

- Owner/Admin NEVER submit join requests
- Only Owner/Admin may list, approve, reject
- RBAC enforced in SERVICE layer ONLY
- Frontend must NOT decide permissions

#### 6.3.6 v1 Limitations (OUT OF SCOPE)

The following are explicitly NOT supported in v1:
- Messages or notes on rejection
- Rejection reasons
- Notifications
- History / audit (beyond audit_log)
- Pagination of requests
- Status column usage beyond 'pending'

---

## 7. Membership Transitions (NORMATIVE)

### 7.1 Leaving club
- `member` may leave.
- `admin` may leave.
- `owner` may not leave unless ownership transfer completed first (see §7.4).

Leaving is explicit user action; it must not be triggered by implicit behavior.

### 7.2 Removing a member
Owner-only. Removal is immediate and logged.

### 7.3 Changing roles

Owner-only.

**Allowed transitions:**
- `member` ↔ `admin`

**Disallowed:**
- Any self-escalation by non-owner.
- Assigning owner via "role change" endpoint; ownership transfer is separate (see §7.4).

### 7.4 Ownership transfer (NORMATIVE)

**Command type:** Ownership transfer is a **separate command/endpoint** (not a "role change" operation).

**Constraints:**
1. Owner-only action.
2. Target must be active member or admin (`role IN ('member', 'admin')`, NOT `pending`).
3. Must be explicitly confirmed by owner.

**Behavior:**
- **Atomic:** The operation either fully completes or fully fails — no partial state.
- **Idempotent:** Repeating the same transfer request (same owner → same target) returns success without side effects if already transferred.

**After transfer:**
- Target becomes `owner`.
- Previous owner becomes `admin` (default).

**Audit:** `OWNERSHIP_TRANSFERRED` is logged with `actor_user_id` (previous owner) and `target_user_id` (new owner).

---

## 8. Club Page & Settings (NORMATIVE)

### 8.1 Club profile editable fields

**Owner + Admin may edit:**
- description/about
- rules
- FAQ
- contacts
- media (avatar/banner) — if used

**Owner-only:**
- visibility (public/private)
- slug change (if allowed)
- archive/delete
- all settings in `clubs.settings` (§8.4)

### 8.2 Slug changes

**Preferred rule:**
- slug change is owner-only, rate-limited, and logged.
- old slug may remain reserved for a cooldown window (RESERVED / PLANNED).

### 8.3 Archiving / Deletion (NORMATIVE)

**Archive (soft-delete):** Owner-only.

When `archived_at IS NOT NULL`, the club is in archived state.

#### 8.3.1 Archived State — Allowed Operations (Whitelist)

| Operation | Actor | Notes |
|-----------|-------|-------|
| View billing status (read-only) | Owner | Check subscription state |
| Cancel auto-renew / cancel at period end | Owner | See SSOT_BILLING § 11 |
| Unarchive | Owner | If supported by implementation |
| Export data | Owner | If supported by implementation |
| Read club profile | Any with access | Read-only |

#### 8.3.2 Archived State — Forbidden Operations

All other write operations are **FORBIDDEN** when club is archived:
- ❌ Create/edit invites
- ❌ Approve/reject join requests
- ❌ Role changes
- ❌ Edit club profile/content
- ❌ Create/edit events
- ❌ Member removal (other than natural leave)
- ❌ Any setting changes except cancellation

**Implementation note:** API must return error code `CLUB_ARCHIVED` for any forbidden operation.

#### 8.3.3 Deletion (Hard-delete)

Deletion (hard-delete) is discouraged. If supported, must require:
- no active subscription (or cancelled at period end),
- irreversible confirmation.

### 8.4 Club Settings (NORMATIVE)

Club settings are stored in `clubs.settings` (jsonb) with the following canonical fields:

#### 8.4.1 public_members_list_enabled

| Property | Value |
|----------|-------|
| **Type** | boolean |
| **Default** | `false` |
| **Who can change** | Owner only |
| **Effect** | When `true`, unauthenticated guests can view members list for public clubs |

**Constraints:**
- Only applies to clubs with `visibility = 'public'`.
- Private clubs: guests cannot view members list regardless of this flag.
- When enabled, guests see only the fields defined in §8.4.3.

#### 8.4.2 public_show_owner_badge

| Property | Value |
|----------|-------|
| **Type** | boolean |
| **Default** | `false` |
| **Who can change** | Owner only |
| **Effect** | When `true` AND `public_members_list_enabled = true`, guests see "Owner" badge next to owner's entry |

**Constraints:**
- Only meaningful when `public_members_list_enabled = true`.
- If `public_members_list_enabled = false`, this flag has no effect.
- Guests still see only the minimal fields (§8.4.3); the badge is the only additional information.

#### 8.4.3 Guest-Visible Member Fields (NORMATIVE)

When guests view the members list (enabled via `public_members_list_enabled`), they see ONLY:

| Field | Included | Notes |
|-------|----------|-------|
| displayName | ✅ | Or public handle |
| Avatar | ✅ | If available |
| **Contact info** | ❌ | NEVER exposed |
| **Internal IDs** | ❌ | user_id, etc. |
| **telegram_id** | ❌ | NEVER exposed |
| **telegram_username** | ❌ | See §19 for authenticated contexts |
| **Role** | ❌ | NOT shown (except Owner badge if §8.4.2 enabled) |

**Rationale:** Data minimization — guests have no legitimate need for contact info or internal identifiers.

#### 8.4.4 Settings Decision Table

| Setting | Default | Who Changes | Dependency |
|---------|---------|-------------|------------|
| `public_members_list_enabled` | `false` | Owner | — |
| `public_show_owner_badge` | `false` | Owner | Requires `public_members_list_enabled = true` |
| `open_join_enabled` | `false` | Owner | RESERVED / PLANNED |

### 8.5 Club Page Error Handling (NORMATIVE)

**Inline error handling** is a canonical pattern across all Club pages, including Club Profile.

| Error Type | Handling | Notes |
|------------|----------|-------|
| Data fetch errors | Inline error message | Displayed within page content area |
| Inline operation errors | Inline error message | E.g., membership actions, follow/unfollow |
| Form submission errors | Toast notification | Create/edit flows (profile editing, settings) |
| Unauthorized (401) | Redirect to login | Standard auth flow |
| Not Found (404) | notFound() | Standard Next.js pattern |

**Clarification:** Club Profile page follows the same error handling patterns as other Club pages.

### 8.6 Back Button (NORMATIVE)

Back Button is a **canonical, required** element for all Club pages.

| Property | Value |
|----------|-------|
| **Placement** | First element in page container |
| **Behavior** | Navigational only (no side effects) |
| **Styling** | Muted text with ArrowLeft icon |
| **Target** | Context-dependent (e.g., clubs list, previous page) |

**Club Profile** follows the same Back Button pattern as other Club pages.

### 8.7 External Links Placement (NORMATIVE)

Club-level external links are rendered in **Club Header ONLY**.

| Field | Render Location | Notes |
|-------|-----------------|-------|
| `telegramUrl` | Club Header | Icon/link in header actions |
| `websiteUrl` | Club Header | Icon/link in header actions |

**Canonical placement rule:**
- External links (telegramUrl, websiteUrl) are NOT rendered in About section.
- External links are NOT rendered on other Club pages.
- Club Header is the single canonical location for club-level external links.

---

## 9. Audit Log (NORMATIVE)

### 9.1 Required audit actions

Must log:
- `CLUB_CREATED`
- `CLUB_UPDATED`
- `CLUB_VISIBILITY_CHANGED`
- `CLUB_ARCHIVED` / `CLUB_UNARCHIVED`
- `CLUB_SETTINGS_CHANGED`
- `INVITE_CREATED`
- `INVITE_CANCELLED`
- `INVITE_ACCEPTED`
- `INVITE_EXPIRED`
- `JOIN_REQUEST_CREATED`
- `JOIN_REQUEST_CANCELLED`
- `JOIN_REQUEST_APPROVED`
- `JOIN_REQUEST_REJECTED`
- `MEMBER_LEFT`
- `MEMBER_REMOVED`
- `ROLE_CHANGED`
- `OWNERSHIP_TRANSFERRED`

### 9.2 Audit principles

- Append-only
- Actor/target/meta captured
- Must not contain secrets (invite tokens, payment payloads)

---

## 10. Security & Anti-Abuse (NORMATIVE)

### 10.1 Idempotency rules

- Creating invite for same target while pending exists is idempotent.
- Accepting the same invite twice returns success without duplicating membership.
- Creating join request while pending exists is idempotent.
- Ownership transfer is idempotent (see §7.4).

### 10.2 Rate limits (policy-level)

- Invite creation: per club per day limit (value configurable)
- Join requests: per user per day limit
- Slug changes: low frequency

### 10.3 Token safety

Invite tokens are secrets:
- unguessable
- stored hashed if feasible
- short TTL and revocable

Token must not be logged.

### 10.4 Data minimization (NORMATIVE)

**Default:** Guests cannot access members list or internal content.

**Exception:** Guest access to members list is allowed ONLY when ALL of:
1. Club `visibility = 'public'`
2. `clubs.settings.public_members_list_enabled = true`
3. Fields exposed are limited to §8.4.3

Private clubs: members list is NEVER exposed to guests regardless of settings.

---

## 11. Events Integration (NORMATIVE by reference)

All event-related RBAC and paid modes are defined by:
**SSOT_CLUBS_EVENTS_ACCESS.md**

This document MUST NOT duplicate those rules. It only defines club domain foundations used by the event system.

---

## 12. Trust (RESERVED / PLANNED, with invariants)

### 12.1 Trusted Partner badge

- Not a role.
- Grants only scoped rights to partner directory entries.
- Cannot create/publish events.

### 12.2 Verification signals

May include:
- verified business profile
- partner category tags
- reputation metrics (future)

**Invariant:** trust signals must not alter RBAC for events/membership.

---

## 13. Club Content (RESERVED / PLANNED, with invariants)

**Content types (examples):**
- routes / tracks
- posts / announcements
- media galleries
- guidelines / docs

**Access baseline:**
- owner/admin manage content
- members read
- guests read only if club is public and content is public-marked

---

## 14. Monetization (NORMATIVE boundaries + RESERVED mechanisms)

### 14.1 Authority

Owner is the only actor who can:
- start/confirm purchases
- manage subscription decisions
- access billing settings

Admin must receive "owner action required" outcome for financial operations.

### 14.2 No mixing paid modes

Personal credits are never used for club events; club subscription never applies to personal events.

> See SSOT_CLUBS_EVENTS_ACCESS.md § 1.3, SSOT_BILLING_SYSTEM_ANALYSIS.md § 5.

### 14.3 Subscription lifecycle (by reference)

Billing logic is defined in **SSOT_BILLING_SYSTEM_ANALYSIS.md**.

This SSOT defines only:
- what UI/actions are owner-only
- what states should lock down club admin operations (as outcomes, not HTTP codes)

### 14.4 Subscription cancellation policy (by reference)

Cancellation policy (no proration, cancel at period end, no partial refunds) is defined in:
**SSOT_BILLING_SYSTEM_ANALYSIS.md § 11**

---

## 15. Network (RESERVED / PLANNED, with invariants)

### 15.1 Club discovery & directory

- Public clubs may appear in directory.
- Private clubs must never appear.

### 15.2 Relationships

Possible future relationships:
- club-to-club partnerships
- shared events
- federated directories

**Invariant:** network relationships must not implicitly grant membership or roles.

---

## 16. Error Codes (NORMATIVE)

This SSOT defines error codes as outcomes; HTTP mapping is owned by SSOT_API.md / SSOT_ARCHITECTURE.md.

**Canonical codes:**
- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CLUB_ARCHIVED`
- `INVITE_EXPIRED`
- `INVITE_CANCELLED`
- `INVITE_ALREADY_ACCEPTED`
- `JOIN_REQUEST_ALREADY_PENDING`
- `OWNER_ACTION_REQUIRED`
- `RATE_LIMITED`
- `CONFLICT`

---

## 17. Phase Coverage Map (NORMATIVE)

This section maps roadmap phases to domain capabilities and what MUST be implemented before moving on.

| Phase | Capabilities |
|-------|-------------|
| **Foundation** | entities, invariants, visibility, membership entry methods, audit, idempotency |
| **Club Page** | profile read/edit rules; public/private exposure |
| **Members** | invites, join requests, leave/kick, role changes, ownership transfer |
| **Events** | by SSOT_CLUBS_EVENTS_ACCESS (already LOCKED) |
| **Trust** | badges as scoped permissions (no RBAC inflation) |
| **Content** | content types, visibility flags, moderation slots |
| **Monetization** | owner-only billing authority + subscription hooks by reference |
| **Network** | discovery + relationships without implicit membership |

---

## 18. User Profile Visibility (NORMATIVE)

This section defines how user profiles are visible across the system, independent of club membership.

### 18.1 Visibility Enum

| Value | Description |
|-------|-------------|
| `public` | Profile visible to anyone (authenticated or guest) |
| `members_only` | Profile visible only to users who share at least one club |
| `private` | Profile visible only to self |

**Default:** `members_only`

**Storage:** `users.settings.profile_visibility` (enum)

### 18.2 Access Matrix

| Viewer | `public` profile | `members_only` profile | `private` profile |
|--------|-----------------|------------------------|-------------------|
| Self | ✅ | ✅ | ✅ |
| Shared club member | ✅ | ✅ | ❌ |
| Authenticated, no shared club | ✅ | ❌ | ❌ |
| Guest | ✅ | ❌ | ❌ |

**"Shared club member"** = viewer and profile owner are both non-pending members of at least one common club.

### 18.3 Field Exposure

| Field | `public` | `members_only` | `private` |
|-------|----------|----------------|-----------|
| displayName | ✅ | ✅ | ✅ (self only) |
| avatar | ✅ | ✅ | ✅ (self only) |
| short bio (if any) | ✅ | ✅ | ❌ |
| Contact info | ❌ | ❌ | ❌ |
| telegram_id | ❌ | ❌ | ❌ |
| Internal IDs | ❌ | ❌ | ❌ |

**Invariant:** Contact info and internal IDs are NEVER exposed via profile visibility. Telegram link is governed separately (§19).

### 18.4 No "Show Profile" Boolean

There is no separate `show_profile` boolean. The `profile_visibility` enum is the single control.

---

## 19. Telegram Link Policy (NORMATIVE)

This section defines when and how a user's Telegram link is shown.

### 19.1 Enabled Flag

| Property | Value |
|----------|-------|
| **Field** | `users.settings.telegram_link_enabled` |
| **Type** | boolean |
| **Default** | `false` |
| **Who can change** | User only (self) |

### 19.2 Link Source

- Link is constructed from `telegram_username` ONLY.
- `telegram_id` is NEVER exposed or used for links.
- If `telegram_username` is NULL or empty, no link is shown regardless of `telegram_link_enabled`.

### 19.3 Context Limitations (NORMATIVE)

Telegram link is shown ONLY when ALL conditions are met:
1. `telegram_link_enabled = true`
2. `telegram_username` exists and is non-empty
3. Viewer has access to the user's profile per §18.2
4. Context is in the allowed list (below)

**Allowed contexts (initial):**

| Context | Viewers | Notes |
|---------|---------|-------|
| User profile page | Per §18.2 access rules | Main profile view |
| Club members list | Authenticated members only | Viewer must be member/admin/owner of the club |

**Forbidden contexts:**

| Context | Reason |
|---------|--------|
| Guest viewing members list | Even with `public_members_list_enabled`, guests do not see Telegram links |
| Search results | Too broad exposure |
| Event participant lists (public) | Privacy concern |

### 19.4 Decision Table

| telegram_link_enabled | telegram_username | Viewer access | Context | Link shown |
|-----------------------|-------------------|---------------|---------|------------|
| `false` | any | any | any | ❌ |
| `true` | NULL/empty | any | any | ❌ |
| `true` | exists | Guest | any | ❌ |
| `true` | exists | No profile access | any | ❌ |
| `true` | exists | Has access | profile page | ✅ |
| `true` | exists | Club member | club members list | ✅ |

---

## Appendix A — Decision Tables (NORMATIVE)

### A1. Who can do what (club operations)

| Operation | Owner | Admin | Member | Pending | Guest |
|-----------|-------|-------|--------|---------|-------|
| Edit club profile | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change visibility | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite member | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve join request | ✅ | ❌ | ❌ | ❌ | ❌ |
| Remove member | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change club settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Leave club | ❌ (transfer first) | ✅ | ✅ | ✅ (cancel/decline only) | n/a |

### A2. Visibility access (updated for optional guest members list)

| Club visibility | Guest profile | Guest content | Guest members list |
|-----------------|---------------|---------------|-------------------|
| public | ✅ | Optional (public-marked only) | **Optional** (if `public_members_list_enabled`) |
| private | minimal only | ❌ | ❌ |

**A2.1 Guest Members List Conditions:**

| Condition | Guest sees members list |
|-----------|------------------------|
| `visibility = 'private'` | ❌ Never |
| `visibility = 'public'` AND `public_members_list_enabled = false` | ❌ |
| `visibility = 'public'` AND `public_members_list_enabled = true` | ✅ (minimal fields per §8.4.3) |

---

## Appendix B — Planned Extensions (NON-NORMATIVE)

> This appendix lists future ideas and is not binding until promoted to NORMATIVE.

- open join (`open_join_enabled` flag in settings)
- club-to-club partnerships
- advanced moderation queues
- reputation scoring

---

**END OF DOCUMENT**
