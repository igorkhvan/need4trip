# Clubs Domain Audit Report

## Summary
- Total items found: 11
- Count by SSOT alignment category:
  - ALIGNED: 5
  - PARTIALLY_ALIGNED: 3
  - VIOLATES_SSOT: 3
  - OUT_OF_SCOPE: 0
- Count by risk level:
  - LOW: 5
  - MEDIUM: 2
  - HIGH: 4

## Backend

### Club Lifecycle

**1. createClub**
- **LOCATION:**
  - File: [`src/lib/services/clubs.ts`](src/lib/services/clubs.ts)
  - Function: `createClub`
- **PURPOSE:**
  - Creates a new club record in the `clubs` table.
  - Automatically sets the creator as the `owner` via a database trigger.
- **SSOT ALIGNMENT:** ALIGNED
- **SSOT REFERENCES:**
  - §2.1 `clubs` (Entity)
  - §3.1 `Exactly One Owner`
  - §9.1 `CLUB_CREATED` (Implicitly via trigger)
- **RISK LEVEL:** LOW
- **ACTION RECOMMENDATION:** KEEP_AS_IS
- **NOTES:** The function correctly enforces that a user must be authenticated to create a club. The ownership assignment is handled by a database trigger, which is an implementation detail but aligns with the SSOT's invariant of having exactly one owner.

**2. updateClub**
- **LOCATION:**
  - File: [`src/lib/services/clubs.ts`](src/lib/services/clubs.ts)
  - Function: `updateClub`
- **PURPOSE:**
  - Updates the content fields of a club (name, description, etc.).
- **SSOT ALIGNMENT:** PARTIALLY_ALIGNED
- **SSOT REFERENCES:**
  - §8.1 `Club profile editable fields`
  - §8.3.2 `Archived State — Forbidden Operations`
  - §A1 `Who can do what`
- **RISK LEVEL:** MEDIUM
- **ACTION RECOMMENDATION:** REFACTOR_REQUIRED
- **NOTES:** The function correctly checks for an archived state before allowing updates. It also correctly checks that the user is an `owner` or `admin`. However, the code contains comments indicating that owner-only fields (like `visibility` and `settings`) are not yet implemented in the validation schema (`clubUpdateSchema`). This creates a risk that these fields could be added to the schema without the corresponding owner-only permission check being added to the service, violating SSOT §8.1.

**3. archiveClub**
- **LOCATION:**
  - File: [`src/lib/services/clubs.ts`](src/lib/services/clubs.ts)
  - Function: `archiveClub`
- **PURPOSE:**
  - Soft-deletes a club by setting the `archived_at` timestamp.
- **SSOT ALIGNMENT:** ALIGNED
- **SSOT REFERENCES:**
  - §8.3 `Archiving / Deletion`
  - §3.2 `Owner authority boundaries`
  - §A1 `Who can do what`
- **RISK LEVEL:** LOW
- **ACTION RECOMMENDATION:** KEEP_AS_IS
- **NOTES:** The function correctly enforces that only an `owner` can archive a club. It also includes a check to prevent archiving a club that has active events, which is a reasonable business rule although not explicitly required by the SSOT. The database repository correctly implements this as an idempotent operation.

**4. unarchiveClub**
- **LOCATION:**
  - File: [`src/lib/services/clubs.ts`](src/lib/services/clubs.ts)
  - Function: `unarchiveClub`
- **PURPOSE:**
  - Restores a soft-deleted club by setting `archived_at` to `NULL`.
- **SSOT ALIGNMENT:** ALIGNED
- **SSOT REFERENCES:**
  - §8.3.1 `Archived State — Allowed Operations (Whitelist)`
  - §3.2 `Owner authority boundaries`
- **RISK LEVEL:** LOW
- **ACTION RECOMMENDATION:** KEEP_AS_IS
- **NOTES:** The function correctly enforces that only an `owner` can unarchive a club. The database repository correctly implements this as an idempotent operation.

### Membership Management

**1. addClubMember**
- **LOCATION:**
  - File: [`src/lib/services/clubs.ts`](src/lib/services/clubs.ts)
  - Function: `addClubMember`
- **PURPOSE:**
  - Adds a user to a club with a specified role (`member` or `admin`).
- **SSOT ALIGNMENT:** VIOLATES_SSOT
- **SSOT REFERENCES:**
  - §5.1 `Entry method: Owner Direct Invite (canonical)`
  - §7.4 `Ownership transfer (NORMATIVE)`
  - §A1 `Who can do what`
- **RISK LEVEL:** HIGH
- **ACTION RECOMMENDATION:** REFACTOR_REQUIRED
- **NOTES:** This function directly inserts a user into `club_members`, completely bypassing the canonical invite flow defined in SSOT §5.1. It also allows an `admin` role to be assigned upon creation, which contradicts the SSOT flow (users should become `member` by default). The function does correctly prevent assigning the `owner` role, which aligns with §7.4, and it correctly enforces owner-only permissions for this action. The billing enforcement check is also present. This is a direct violation of the defined membership entry process.

**2. updateClubMemberRole**
- **LOCATION:**
  - File: [`src/lib/services/clubs.ts`](src/lib/services/clubs.ts)
  - Function: `updateClubMemberRole`
- **PURPOSE:**
  - Changes the role of an existing club member.
- **SSOT ALIGNMENT:** ALIGNED
- **SSOT REFERENCES:**
  - §7.3 `Changing roles`
  - §7.4 `Ownership transfer (NORMATIVE)`
  - §A1 `Who can do what`
- **RISK LEVEL:** LOW
- **ACTION RECOMMENDATION:** KEEP_AS_IS
- **NOTES:** The function correctly enforces owner-only permissions. It explicitly prevents changing a user's role *to* `owner` and prevents changing the role *of* the current owner, which fully aligns with the SSOT's requirement that ownership transfer must be a separate, dedicated command.

**3. removeClubMember**
- **LOCATION:**
  - File: [`src/lib/services/clubs.ts`](src/lib/services/clubs.ts)
  - Function: `removeClubMember`
- **PURPOSE:**
  - Removes a member from a club. Handles both self-removal (leaving) and removal by an owner.
- **SSOT ALIGNMENT:** ALIGNED
- **SSOT REFERENCES:**
  - §7.1 `Leaving club`
  - §7.2 `Removing a member`
  - §8.3.1 & §8.3.2 (Archived state handling)
  - §A1 `Who can do what`
- **RISK LEVEL:** LOW
- **ACTION RECOMMENDATION:** KEEP_AS_IS
- **NOTES:** The logic correctly distinguishes between self-removal and owner-initiated removal. It properly enforces that an owner cannot leave their own club without transferring ownership first. It also correctly implements the nuanced rules for archived clubs: self-leave is permitted, but owner-initiated removal is forbidden.

**4. approveClubMember**
- **LOCATION:**
  - File: [`src/lib/services/clubs.ts`](src/lib/services/clubs.ts)
  - Function: `approveClubMember`
- **PURPOSE:**
  - Changes a member's role from `pending` to `member`.
- **SSOT ALIGNMENT:** VIOLATES_SSOT
- **SSOT REFERENCES:**
  - §5.2 `Entry method: Invite Link (token)`
  - §5.3 `Entry method: Request to Join (user-initiated)`
- **RISK LEVEL:** HIGH
- **ACTION RECOMMENDATION:** DELETE_ENTIRELY
- **NOTES:** This function appears to be part of a join-request flow that does not exist in the SSOT-defined manner. The SSOT specifies that `club_join_requests` should be used for this flow. This implementation manipulates the `club_members.role` directly from `pending` to `member`, which suggests an incomplete or non-standard implementation of the join request pattern. There is no corresponding `rejectClubMember` or `requestToJoin` function, indicating this is likely a remnant of a deprecated or flawed implementation.

## Database / Schema

**1. `clubs` table**
- **LOCATION:**
  - File: [`src/lib/db/types.ts:530`](src/lib/db/types.ts:530)
  - Table: `clubs`
- **PURPOSE:**
  - Stores the core information for each club.
- **SSOT ALIGNMENT:** PARTIALLY_ALIGNED
- **SSOT REFERENCES:**
  - §2.1 `clubs`
- **RISK LEVEL:** MEDIUM
- **ACTION RECOMMENDATION:** REFACTOR_REQUIRED
- **NOTES:** The table is missing several fields required by the SSOT: `slug`, `visibility`, `owner_user_id`, and `settings`. The absence of `owner_user_id` is a significant deviation, as it is the canonical reference for ownership. The `created_by` field is present but is not the same as the owner reference. The lack of `visibility` and `settings` fields means critical domain logic defined in the SSOT cannot be implemented.

**2. `club_members` table**
- **LOCATION:**
  - File: [`src/lib/db/types.ts:369`](src/lib/db/types.ts:369)
  - Table: `club_members`
- **PURPOSE:**
  - Stores the membership relationship between users and clubs, including their roles.
- **SSOT ALIGNMENT:** PARTIALLY_ALIGNED
- **SSOT REFERENCES:**
  - §2.2 `club_members`
- **RISK LEVEL:** HIGH
- **ACTION RECOMMENDATION:** REFACTOR_REQUIRED
- **NOTES:** The `role` column is a `string` and not a proper enum, which violates the SSOT's strict definition of roles (`owner`, `admin`, `member`, `pending`). This allows for invalid roles to be inserted into the database, posing a data integrity risk. The `created_at` and `updated_at` timestamps are also missing, which are required for auditing and tracking membership changes.

**3. Missing Tables**
- **LOCATION:** N/A
- **PURPOSE:** N/A
- **SSOT ALIGNMENT:** VIOLATES_SSOT
- **SSOT REFERENCES:**
  - §2.3 `club_invites`
  - §2.4 `club_join_requests`
  - §2.6 `club_audit_log`
- **RISK LEVEL:** HIGH
- **ACTION RECOMMENDATION:** REFACTOR_REQUIRED
- **NOTES:** The database schema is missing the `club_invites`, `club_join_requests`, and `club_audit_log` tables. These tables are normative and essential for implementing the SSOT-defined flows for joining clubs and for maintaining a proper audit trail of actions. Their absence explains why the backend service (`addClubMember`) bypasses the invite flow entirely.

## Frontend / UI

**1. Club Management Page (`[id]/manage/page.tsx`)**
- **LOCATION:**
  - File: [`src/app/(app)/clubs/[id]/manage/page.tsx`](src/app/(app)/clubs/[id]/manage/page.tsx)
  - Component: `ClubManagePage`
- **PURPOSE:**
  - Provides a form to edit club details and a "danger zone" for club deletion.
- **SSOT ALIGNMENT:** VIOLATES_SSOT
- **SSOT REFERENCES:**
  - §1.3 `Roles (Canonical)`
- **RISK LEVEL:** HIGH
- **ACTION RECOMMENDATION:** REFACTOR_REQUIRED
- **NOTES:** The page performs an authorization check using a hardcoded role `organizer` (line 55), which is not a role defined in the SSOT (§1.3). This introduces an undocumented and non-standard permission level that directly contradicts the canonical roles. Furthermore, the "Delete Club" button in the "danger zone" does not appear to be wired to the `archiveClub` service function, suggesting it may perform a hard delete, which is discouraged by the SSOT (§8.3.3).

**2. Club Members List (`members-client.tsx`)**
- **LOCATION:**
  - File: [`src/app/(app)/clubs/[id]/_components/members-client.tsx`](src/app/(app)/clubs/[id]/_components/members-client.tsx)
  - Component: `ClubMembersClient`
- **PURPOSE:**
  - Displays the list of club members and provides controls for managing them.
- **SSOT ALIGNMENT:** ALIGNED
- **SSOT REFERENCES:**
  - §7.2 `Removing a member`
  - §7.3 `Changing roles`
- **RISK LEVEL:** LOW
- **ACTION RECOMMENDATION:** KEEP_AS_IS
- **NOTES:** This component correctly implements the UI for role changes (`member` ↔ `admin`) and member removal. The actions are correctly delegated to the backend API, and the component relies on the `canManage` prop, which is derived from the user's role determined on the server, aligning with the SSOT's permission model.

## Cross-Cutting Concerns

**1. Derived `is_club_event` Flag**
- **LOCATION:**
  - File: [`src/lib/db/eventRepo.ts:30`](src/lib/db/eventRepo.ts:30)
  - Table: `events`
  - Field: `is_club_event`
- **PURPOSE:**
  - A denormalized boolean flag on the `events` table that is `true` if `club_id` is not null. It is maintained by a database trigger (`sync_event_club_flag`).
- **SSOT ALIGNMENT:** VIOLATES_SSOT
- **SSOT REFERENCES:**
  - §0.2 `Single Source of Truth`: "Club context is identified by `club_id` only... Any cached/derived fields must not be used for business decisions."
- **RISK LEVEL:** MEDIUM
- **ACTION RECOMMENDATION:** REFACTOR_REQUIRED
- **NOTES:** The existence and use of this derived flag directly contradicts the SSOT's explicit rule against using derived fields for business decisions. While the repo code indicates a move away from writing to this field, its continued existence in the database schema and its use in client-side logic (e.g., `eventPermissions.ts`) presents a risk of inconsistent behavior and makes the codebase harder to maintain. The logic should be refactored to rely solely on the presence of `club_id` as the source of truth for "clubness".
