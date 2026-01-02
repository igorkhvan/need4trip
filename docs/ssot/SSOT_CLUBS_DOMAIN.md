# Need4Trip — Clubs Domain (SSOT)

**Status:** LOCKED / Production-target  
**Version:** 1.0  
**Last Updated:** 2026-01-01  
**Owner SSOT:** This document defines the ONLY authoritative rules for:
- Club entity domain model (lifecycle, visibility, settings)
- Membership model (entry methods, invites, join requests, transitions)
- Trust & Partner model (badges, scoped permissions)
- Club content domain (non-event content types)
- Club monetization boundaries (owner-only financial authority; integration points)
- Club network model (directory, discovery, relationships)
- Audit, security invariants, idempotency rules for club operations

This SSOT must be read and followed for any changes in:
- Clubs (entity lifecycle, visibility, settings)
- Memberships (invites, join requests, roles, transitions)
- Club page content (profile, FAQ, rules)
- Trust badges and partner directories

Related SSOTs:
- SSOT_CLUBS_EVENTS_ACCESS.md — RBAC + events access + paid modes separation + club_id canonical clubness
- SSOT_BILLING_SYSTEM_ANALYSIS.md — billing products, paywall rules, subscription enforcement, credits behavior
- SSOT_ARCHITECTURE.md — layering, error taxonomy, aborted/incomplete actions canonical behavior
- SSOT_DATABASE.md — schema, constraints, RLS, state machines

---

## Change Log (SSOT)

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

**Invariants:**
- `slug` unique (case-insensitive)
- Club has exactly one owner (see §3)
- If `archived_at` is set, all write operations are rejected except owner-only "unarchive" (if supported) or billing resolution flows (if any)

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
- archive/delete club (subject to billing constraints).

Admin must never be allowed to perform owner-only actions by any implicit path.

### 3.3 Pending has no privileges
`pending` is treated as non-member for all authorization decisions.

---

## 4. Visibility Model (NORMATIVE)

### 4.1 Visibility states

- **public**: club appears in discovery/directory (if enabled) and has a public profile page.
- **private**: club does not appear in discovery/directory; profile exposure is limited.

### 4.2 Public profile data (minimum)

For both public and private, the server may return minimal profile:
- name, slug, avatar/banner if used.

For private, any additional content is hidden from non-members.

### 4.3 Access matrix for visibility

| Actor | Public club profile | Private club minimal profile | Club internal content |
|-------|---------------------|------------------------------|----------------------|
| Guest | ✅ | ✅ (minimal) | ❌ |
| Member | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| Owner | ✅ | ✅ | ✅ |

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

### 5.2 Entry method: Invite Link (token)

**Flow:**
1. Owner generates invite link (token).
2. User opens link while authenticated.
3. System creates/uses join request or direct acceptance policy (see below).

**Owner approval policy:**
- Default (recommended): link creates a `club_join_request` pending owner approval.
- Alternative (not recommended for security): auto-accept as member.

**Preferred rule (best practice):**
Invite link results in owner approval required, unless club explicitly enables "open join" (see §5.4).

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
- Open join must be explicitly enabled by owner.

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

### 7.4 Ownership transfer

Owner-only. Atomic operation:
1. target must be active member/admin (not pending)
2. after transfer:
   - target becomes owner
   - previous owner becomes admin (default)

Must be explicitly confirmed by owner.

---

## 8. Club Page & Settings (NORMATIVE for current + RESERVED slots)

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

### 8.2 Slug changes

**Preferred rule:**
- slug change is owner-only, rate-limited, and logged.
- old slug may remain reserved for a cooldown window (RESERVED / PLANNED).

### 8.3 Archiving / Deletion

**Preferred:**
- archive (soft-delete) owner-only.
- Deletion (hard-delete) is discouraged; if supported, must require:
  - no active subscription,
  - irreversible confirmation.

---

## 9. Audit Log (NORMATIVE)

### 9.1 Required audit actions

Must log:
- `CLUB_CREATED`
- `CLUB_UPDATED`
- `CLUB_VISIBILITY_CHANGED`
- `CLUB_ARCHIVED` / `CLUB_UNARCHIVED`
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

### 10.4 Data minimization

Guests cannot access members list or internal content unless explicitly allowed.

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
| Leave club | ❌ (transfer first) | ✅ | ✅ | ✅ (cancel/decline only) | n/a |

### A2. Visibility access

| Club visibility | Guest profile | Guest content | Guest members list |
|-----------------|---------------|---------------|-------------------|
| public | ✅ | Optional (public-marked only) | ❌ |
| private | minimal only | ❌ | ❌ |

---

## Appendix B — Planned Extensions (NON-NORMATIVE)

> This appendix lists future ideas and is not binding until promoted to NORMATIVE.

- open join
- club-to-club partnerships
- advanced moderation queues
- reputation scoring

---

**END OF DOCUMENT**
