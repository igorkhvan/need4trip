# Clubs UI Visual Contract — Members (v4)

**Status:** LOCKED
**Supersedes:** CLUBS_UI_VISUAL_CONTRACT V3 MEMBERS.md
**Aligned with:**
- SSOT_API.md v1.6.0
- CLUBS_IMPLEMENTATION_BLUEPRINT v1 (Rebuilt)

**Scope:** Club Members (Member View)

This document is a **binding visual execution contract** for the *Club Members* page.  
It defines **visual structure, section behavior, UI states, and interaction rules**.  
It does **NOT** define business logic or API semantics.

---

## 1. Global Invariants

These rules are mandatory and non-negotiable.

- UI reflects backend state only; no frontend inference.
- All permissions are enforced by backend responses.
- No UI behavior may contradict SSOT_API v1.6.0.
- If `archivedAt !== null`, the page is **globally read-only**.
- No optimistic UI for membership mutations.

---

## 2. Page Applicability

This contract applies **only** to:

- **Club Members (Member View)**

It does NOT apply to:
- Club Profile (Public)
- Club Settings
- Club Billing
- Club Events

---

## 3. Page Layout (Strict, Fixed Order)

```
[ Header ]                      (blocking)
────────────────────────
[ Members List ]               (blocking)
────────────────────────
[ Pending Join Requests ]      (blocking, owner only)
```

- Section order is **fixed**.
- No additional sections are permitted.
- No conditional re-ordering based on role or viewport.

---

## 4. Header

### Visibility
- Visible to: member, admin, owner

### Content
- Club name
- Visibility badge (public / private)
- Archived badge (if `archivedAt !== null`)

### Behavior
- Header is always rendered.
- No actions, buttons, or menus are allowed.

---

## 5. Members List

### Data Source
- `GET /api/clubs/[id]/members` (API-019)

### Visibility
- Visible to: member, admin, owner

### Content Rules
Each row must display:
- User avatar
- Display name
- Role label
- Joined date

### Interaction Rules

| Viewer Role | Behavior |
|------------|----------|
| Member | Read-only |
| Admin | Read-only |
| Owner | May remove member (if not archived) |

### Archived Behavior
- Remove action is disabled
- Tooltip or inline hint: "Club is archived"

---

## 6. Pending Join Requests (Owner Only)

### Data Source
- `GET /api/clubs/[id]/join-requests` (API-054)

### Visibility
- Visible to: owner only
- Entire section is hidden for non-owners

### States

| State | Visual Behavior |
|------|------------------|
| Loading | Section-level skeleton |
| Empty | Placeholder: "No pending join requests" |
| Archived | Section visible, all actions disabled |

### Item Content
Each request row must display:
- User avatar
- User display name
- Request creation date

### Actions (Owner Only)

| Action | API | Result |
|------|-----|--------|
| Approve | API-055 | User becomes member; list refresh |
| Reject | API-056 | Request removed; list refresh |

### Interaction Rules
- No optimistic UI
- Buttons show per-item loading state
- On success: **explicit refresh / revalidation required**

### Error → UI Mapping

| Error | UI Behavior |
|------|-------------|
| 401 | Redirect to login |
| 403 (archived) | Disable actions + archived hint |
| 409 (already processed) | Inline message + refresh |

---

## 7. Archived Club Rules (Global)

If `archivedAt !== null`:

- Approve button is disabled
- Reject button is disabled
- Remove member action is disabled
- Page is visually marked as read-only
- No mutation requests may be triggered

---

## 8. Explicitly Forbidden UI

The following are strictly forbidden on this page:

- Billing or subscription UI
- Products / services / marketplace
- Events or event-related UI
- Role switching UI
- Auto-approval or bulk approval
- Bulk member actions
- Inline editing of member data

---

## 9. Loading & Skeleton Rules

- Full-page skeleton for initial page load
- Section-level skeletons allowed only inside defined sections
- Skeleton layout must match final layout dimensions

---

## 10. AI Executor Rules

AI executors (Cursor, etc.) MUST:

- Follow this contract verbatim
- Bind UI strictly to the specified APIs
- STOP if API responses contradict this contract
- NOT introduce additional UI states or shortcuts
- NOT change section order or visibility rules

Any deviation from this document is considered an implementation defect.

---

**LOCK NOTICE**  
This document is LOCKED and may only be changed when the Clubs domain is explicitly expanded.

