# CLUBS_UI_VISUAL_CONTRACT v1 — EVENTS

**Status:** DRAFT → LOCK AFTER REVIEW  
**Applies to:** Club Events (Member / Admin / Owner view)  
**Depends on:** SSOT_API.md v1.7.0, CLUBS_IMPLEMENTATION_BLUEPRINT v1 (Rebuilt)

---

## 1. Purpose & Authority

This document defines the **visual and behavioral contract** for the Club Events UI (v1).

It:
- fixes page structure and section order,
- defines visible actions per role,
- defines loading / error / archived / paywall states,
- forbids UI patterns not allowed in v1 scope.

This document does **NOT**:
- redefine API behavior,
- introduce new domain rules,
- specify implementation details.

---

## 2. Page Inventory (Events)

### 2.1 Pages Covered

1. **Club Events List**  
   Route: `/clubs/[id]/events`

2. **Event Details (Read / Manage)**  
   Route: `/events/[id]` (existing global page, behavior constrained here)

No other pages are allowed in Events v1.

---

## 3. Global Invariants (Events)

These apply to **all Events UI**:

- Event data is authoritative from API only
- No optimistic UI
- No frontend role inference
- No inline editing
- One action → one explicit screen or confirm
- Archived clubs are **read-only**
- Paywall is triggered only by backend (402)

Violations are defects.

---

## 4. Club Events List Page

### 4.1 Page Layout (Top → Bottom)

1. **Page Header (Blocking)**
2. **Archived Banner (Conditional, Blocking)**
3. **Events List Section (Blocking)**
4. **Empty State (Conditional)**

---

### 4.2 Page Header

**Contents:**
- Page title: "Events"
- Create Event button (right-aligned)

**Visibility Rules:**
| Role | Create Button |
|-----|---------------|
| Owner | Visible |
| Admin | Visible |
| Member | Hidden |
| Guest | Not applicable |

**Archived Club:**
- Button disabled
- Tooltip: "Club is archived"

---

### 4.3 Archived Banner

Displayed if:
- `club.archivedAt !== null`

Behavior:
- Informational only
- No actions

---

### 4.4 Events List Section

**Data Source:**
- API-057 `GET /api/clubs/[id]/events`

**Rendering Rules:**
- Sorted by `startAt`
- Each event rendered as a card

**Event Card Fields:**
- Title
- Start date/time
- Status
- Participants count (read-only)

**Interactions:**
- Click → navigate to Event Details

---

### 4.5 Empty State

Shown when:
- Events list is empty

Text:
- "No events yet"

Action:
- Create Event button (owner/admin only)

---

## 5. Event Details Page (Constraints)

### 5.1 Allowed Sections

1. Event Header (Blocking)
2. Event Details (Read-only)
3. Management Actions (Conditional)

---

### 5.2 Management Actions

**Allowed Actions:**

| Action | Owner | Admin | Member |
|------|------|-------|--------|
| Edit Event | Yes | Yes | No |
| Delete Event | Yes | Yes | No |

**Archived Club:**
- All actions disabled
- Tooltip shown

---

## 6. Loading Model

### 6.1 Blocking Load

- Page-level skeleton
- No partial rendering

### 6.2 Section Load

- Events list may load independently
- Header waits for club context

---

## 7. Error & State Handling

### 7.1 Forbidden (403)

- Full forbidden screen
- No partial UI

### 7.2 Paywall (402)

- Modal or full-screen paywall
- Triggered only by backend

### 7.3 Archived (403 CLUB_ARCHIVED)

- Read-only mode
- Banner shown
- Actions disabled

---

## 8. Explicitly Forbidden Patterns

The following are **NOT allowed** in Events v1:

- Inline editing
- Optimistic updates
- RSVP / Join Event flows
- Billing management UI
- Guest preview logic
- Drag & drop
- Bulk actions

---

## 9. Versioning

- **v1** — Initial Events UI contract
- Changes require new version

---

**END OF DOCUMENT**

