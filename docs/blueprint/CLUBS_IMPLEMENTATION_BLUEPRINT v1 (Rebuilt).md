# Clubs Implementation Blueprint (v1)

**Status:** LOCKED (Clubs Settings v1 — COMPLETE & FROZEN)  
**Phase 8 — Membership Requests v1:** COMPLETE & FROZEN  
**Phase 9 — Club Profile v1:** COMPLETE & FROZEN
**Authority:** SSOT-aligned execution contract
**Scope:** Clubs domain end-to-end (UI → API → Service → DB)

---

## 0. Purpose & Governance

This document is a **single execution contract** for implementing the Clubs domain.
It is **not** a replacement for SSOT documents and **must not duplicate** their rules.

This Blueprint:
- references SSOTs as the authoritative source of truth,
- defines page structure, states, and behaviors,
- constrains AI executors (KiloCode / Gemini) to deterministic, non-creative execution.

If any implementation conflicts with this Blueprint, the implementation is wrong.
If this Blueprint conflicts with SSOTs, this Blueprint must be corrected.

---

## 1. Scope & Non‑Goals

### 1.1 In Scope
- All Clubs-related user-facing pages
- Data loading, caching, and revalidation rules
- UI states (loading / empty / forbidden / archived / paywall)
- Cross-page consistency rules
- Service & API alignment requirements
- Billing integration in **contextual form** (not as standalone pages)

### 1.2 Explicitly Out of Scope
- Redesign or reinterpretation of SSOT rules
- Introduction of new domain concepts or roles
- UI experiments, A/B tests, or visual redesign
- Performance micro-optimizations not explicitly required

---

## 2. Global Invariants (Non‑Negotiable)

These invariants apply to **all pages, states, and actions**:

- Club context is identified **only** by `club_id`.
- Effective role is resolved **only** from `club_members.role`.
- Role `pending` has **no elevated permissions** and is treated as non-member.
- `archived_at != NULL` enforces **club read-only behavior**, except an explicit SSOT whitelist.
- Frontend **never** decides RBAC, limits, or billing outcomes.
- Backend errors are the **only trigger** for forbidden / paywall UI.
- Billing is a **single domain with contextual projections** (user-context vs club-context).
- There is **no standalone Billing page** in primary navigation.
- **Club Billing MUST remain accessible to the billing authority (club owner)** even when the subscription is `pending`, `grace`, or `expired`, **unless the club is archived**.

Violations are considered defects.

---

## 3. Global Concepts (Shared by All Pages)

### 3.1 Club Context Resolution

Canonical resolution flow:
1. Route resolves `club_id`
2. Server-side fetch resolves:
   - club entity
   - archived state
   - effective role (if authenticated)
3. UI consumes a **resolved context object**, not raw DB rows

Forbidden:
- inferring role from UI state
- caching role across different clubs

---

### 3.2 Loading Model (Unified)

Every Clubs page MUST support these layers:

1. **Initial Page Load**
   - Server Component skeleton
   - No partial rendering of protected sections

2. **Section-Level Loading**
   - Independent loaders per section
   - Section failure must not blank the entire page

3. **Action-in-Progress**
   - Button-level loading indicators
   - No optimistic updates for billing or membership mutations

4. **Blocked States**
   - forbidden
   - archived
   - paywall

---

### 3.3 Error & Abort Model

Canonical error mapping:
- 401 / 403 → forbidden state
- 402 → paywall state (upgrade / renewal)
- 404 → not found shell
- 409 → explicit confirmation flow (credits)

Aborted / interrupted actions:
- No implicit retries
- No partial UI commits
- UI must return to last known consistent state

Critical distinction:
- **Archived club** = domain lifecycle state (administrative)
- **Expired subscription** = billing state (financial)

Expired subscription MAY block content actions but MUST NOT block billing access for the owner.

---

### 3.4 Caching & Revalidation Rules

Cacheable:
- club public profile
- aggregated counters / previews

Non-cacheable / short-lived:
- effective role
- billing / subscription state
- join requests and invites

All write actions MUST trigger explicit revalidation.

---

## 4. Page Inventory (Canonical)

The Clubs domain consists of **exactly** the following pages:

1. Club Directory / Discovery
2. Club Profile (Public)
3. Club Home (Member View)
4. Club Members
5. Club Join Requests & Invites
6. Club Events
7. Club Settings
8. Club Archived Shell

Billing is **not** a page in this list.

---

## 5. Page Contracts (Binding)

Each page below defines a **normative contract**. Implementation MUST follow it verbatim.

---

### 5.1 Club Directory / Discovery

**Purpose**
- Discover public, non-archived clubs

**Audience**
- Guest
- Authenticated non-member

**Sections**
1. Header
2. Filters / Search
3. Clubs List

**States**
- Loading
- Empty
- Error

**Forbidden**
- Showing private or archived clubs

---

### 5.2 Club Profile (Public)

**Purpose**
- Present a club to non-members

**Audience**
- Guest
- Authenticated non-member
- Pending member

**Sections**
1. Header (name, visibility, badges)
2. About
3. Rules / FAQ
4. Members Preview (if enabled)
5. Events Preview
6. Join / Request CTA

**Events Preview — Viewer-Dependent Behavior:**
- **Members** (authenticated club members with role ∈ {owner, admin, member}) see all upcoming club events regardless of event visibility settings.
- **Guests and non-members** viewing a **private club**: Events Preview is hidden or empty (no events shown).
- **Guests and non-members** viewing a **public club**: Events Preview shows only events with `visibility = 'public'`.
- Pending members are treated as non-members for this purpose.

**Canonical reference:** SSOT_CLUBS_DOMAIN.md § 4.5 (Event Visibility Within Club Context)

**States**
- Loading
- Forbidden (private visibility)
- Archived (read-only shell)

**Forbidden**
- Auto-join
- Content editing

**Implementation status:** COMPLETE (Phase 9B)  
**Version:** v1  
**Design note:** Club Profile is a read-only aggregator. Management actions live only in Members (`/clubs/[id]/members`) and Settings (`/clubs/[id]/settings`) pages.  
**Freeze rule:** Any changes require a new versioned contract (v2) and explicit unlock.

---

### 5.3 Club Home (Member View)

**Purpose**
- Primary dashboard for members

**Audience**
- Member
- Admin
- Owner

**Sections**
1. Header
2. Summary / Announcements
3. Upcoming Events
4. Quick Navigation

**States**
- Loading
- Archived (read-only)

---

### 5.4 Club Members

**Purpose**
- View and manage membership

**Audience**
- Member (read-only)
- Admin (read-only)
- Owner (full control)

**Sections**
1. Header
2. Members List
3. Pending Members (owner only)

**States**
- Loading
- Forbidden
- Archived (read-only)

---

### 5.5 Club Join Requests & Invites

**Purpose**
- Manage inbound and outbound join flows

**Audience**
- Owner only

**Sections**
1. Join Requests
2. Active Invites

**States**
- Loading
- Empty
- Archived (read-only)

**Implementation status:** COMPLETE (Phase 8A–8C)  
**Freeze rule:** Any changes require a new versioned contract (v2).

---

### 5.6 Club Events

**Purpose**
- View and manage club events

**Audience**
- Member (read-only)
- Admin (manage free events)
- Owner (full access)

**Sections**
1. Header
2. Events List
3. Create Event CTA

**States**
- Loading
- Paywall
- Archived (read-only)

---

### 5.7 Club Settings

**Purpose**
- Administrative configuration

**Audience**
- Owner only

**Sections**
1. General Settings
2. Visibility & Privacy
3. Billing (Club Context)
4. Danger Zone (archive)

**States**
- Loading
- Archived (limited actions)

**Implementation status:** COMPLETE (Phase 4–7)  
**Freeze rule:** Any changes require a new versioned contract (v2).

---

### 5.8 Club Archived Shell

**Purpose**
- Safe read-only fallback when club is archived

**Audience**
- All roles

**Sections**
1. Archived Banner
2. Read-only Summary

---

## 6. Billing (Contextual Domain)

Billing is a **single domain** rendered in different contexts.

### 6.1 Personal Billing View (User Context)

- Location: User Profile
- Shows:
  - one-off credits
  - personal purchases
- Never shows club subscriptions

### 6.2 Club Billing View (Club Context)

- Location: Club Settings
- Audience: Club owner
- Shows:
  - current plan
  - limits
  - subscription state
  - renewal / upgrade actions

**Critical rule:**
- Accessible even when subscription is `pending`, `grace`, or `expired`
- Not accessible only when club is archived

---

## 7. Cross‑Page Consistency Rules

- Header layout and badges are consistent across all club pages
- Archived banner behavior is identical everywhere
- Paywall always routes to the correct billing context
- Loading indicators follow one visual pattern

---

## 8. Service & API Alignment

- All data access goes through Service layer
- UI never accesses repositories directly
- Billing enforcement is server-side only

---

## 9. AI Executor Rules (KiloCode / Gemini)

AI executor MUST:
- Read this Blueprint and referenced SSOTs first
- Not introduce new concepts or flows
- Implement page-by-page
- Provide a mismatch analysis before coding
- Perform self-check against this Blueprint after implementation

Failure to comply is incorrect execution.

