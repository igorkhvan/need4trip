# Clubs UI Visual Contract — Membership Requests (v1)

**Status:** LOCKED  
**Supersedes:** N/A (new)  
**Aligned with:**
- SSOT_API.md v1.7.3
- SSOT_CLUBS_DOMAIN.md §6.3 (Membership Requests v1)
- CLUBS_IMPLEMENTATION_BLUEPRINT v1 (Rebuilt)

**Scope:** Membership Requests UI (v1)

This document is a **binding visual execution contract** for *Membership Requests UI*.  
It defines **visual structure, section behavior, UI states, and interaction rules**.  
It does **NOT** define business logic, persistence, or API semantics.

---

## 1. Global Invariants

These rules are mandatory and non-negotiable.

- UI reflects backend state only; no frontend inference.
- All permissions are enforced by backend responses.
- No optimistic UI for membership mutations.
- No UI behavior may contradict SSOT_API.md or SSOT_CLUBS_DOMAIN.md.
- Membership Requests exist **only** when `settings.openJoinEnabled = false`.
- If `archivedAt !== null`, the UI is **globally read-only**.

---

## 2. Page Applicability

This contract applies **only** to:

- **Club Members → Requests**

It does NOT apply to:
- Club Profile (Public)
- Club Settings
- Club Billing
- Club Events
- User Profile

---

## 3. Section Placement (Strict)

Membership Requests are rendered as a **dedicated section** inside:

Club → Members

Fixed order:

[ Header ]
────────────────────────
[ Members List ]
────────────────────────
[ Pending Join Requests ] ← this contract

- Section order is **fixed**.
- Requests section MUST NOT appear anywhere else.

---

## 4. Section Visibility

### Visibility Rules

| Viewer Role | Section Visible |
|------------|-----------------|
| Guest | ❌ No |
| Pending user | ❌ No |
| Member | ❌ No |
| Admin | ✅ Yes |
| Owner | ✅ Yes |

- Section is **completely hidden** for non-admin/non-owner users.
- Section is hidden when `settings.openJoinEnabled = true`.

---

## 5. Data Source

- `GET /api/clubs/[id]/join-requests` (API-054)

UI MUST rely exclusively on this endpoint.

---

## 6. Section States

### Loading
- Section-level skeleton
- Layout matches final table dimensions

### Empty
- Placeholder text:
  > “No pending join requests”

### Archived
- Section remains visible
- All actions disabled
- Inline hint:
  > “Club is archived. Membership changes are disabled.”

---

## 7. Join Request List

### Layout

[ Avatar ] Display Name Requested at [Approve] [Reject]

### Required Columns

Each row MUST display:
- User avatar
- User display name
- Request creation date

No additional metadata is allowed.

---

## 8. Actions (Owner/Admin Only)

### Approve

| Property | Rule |
|-------|------|
| Style | Primary |
| API | POST API-055 |
| Behavior | User becomes member, row removed |
| Loading | Per-row loading state |
| Success | Explicit refetch required |

---

### Reject (Silent)

| Property | Rule |
|-------|------|
| Style | Destructive (secondary) |
| API | DELETE API-056 |
| Behavior | Row removed |
| Loading | Per-row loading state |
| Success | Explicit refetch required |

---

## 9. Error → UI Mapping

| Error | UI Behavior |
|-----|-------------|
| 401 | Redirect to login |
| 403 (archived) | Disable actions + archived hint |
| 404 | Remove row + refetch |
| 409 | Inline message + refetch |

Errors MUST NOT expose backend details.

---

## 10. Explicitly Forbidden UI

The following are strictly forbidden:

- Messages from applicants
- Rejection reasons
- Status labels (e.g. “Rejected”)
- Request history
- Pagination
- Bulk actions
- Notifications
- Auto-approval
- Any join/request UI outside Members page

---

## 11. Archived Club Rules (Global)

If `archivedAt !== null`:

- Approve button disabled
- Reject button disabled
- Section visually marked as read-only
- No mutation requests allowed

---

## 12. AI Executor Rules

AI executors (Cursor, etc.) MUST:

- Follow this contract verbatim
- Bind UI strictly to documented APIs
- STOP if API responses contradict this contract
- NOT introduce additional states or UX shortcuts
- NOT change section order or visibility rules

Any deviation from this document is considered an implementation defect.

---

**LOCK NOTICE**  
This document is LOCKED for Membership Requests v1.  
Any changes require a new version (v2) and explicit SSOT updates.