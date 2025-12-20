# API Security Checklist Template

**Use this template when creating or modifying ANY API endpoint.**

Copy this to your PR description or commit message:

---

## API Endpoint: `[METHOD] /api/your/path`

### Security Configuration

- [ ] **Authentication Required?**
  - [ ] Yes - Added to `PROTECTED_ROUTES` in middleware
  - [ ] No - Documented why (public data, guest allowed, etc.)
  - [ ] Admin only - Added to `ADMIN_ROUTES`
  - [ ] Cron only - Added to `CRON_ROUTES`

- [ ] **HTTP Methods Protected:**
  - [ ] GET (if requires auth)
  - [ ] POST (if exists)
  - [ ] PUT (if exists)
  - [ ] PATCH (if exists)
  - [ ] DELETE (if exists)

- [ ] **Middleware Configuration:**
  - [ ] Path added to `PROTECTED_ROUTES` array
  - [ ] Methods specified correctly (if not all methods)
  - [ ] Subpaths handled explicitly (if applicable)
  - [ ] Comments added explaining protection

- [ ] **Route Handler Security:**
  - [ ] Uses `getCurrentUserFromMiddleware(request)`
  - [ ] Checks `if (!currentUser)` and throws `UnauthorizedError`
  - [ ] Authorization implemented (owner/admin/member checks)
  - [ ] Guest handling documented (if applicable)

- [ ] **Documentation:**
  - [ ] Route file has security comment header
  - [ ] Explains auth requirements
  - [ ] Documents guest handling (if applicable)
  - [ ] `API_SECURITY_AUDIT.md` updated

- [ ] **Testing:**
  - [ ] Tested unauthorized access → 401
  - [ ] Tested authorized access → success
  - [ ] Tested authorization → 403 for non-owner/non-admin
  - [ ] Tested guest access (if applicable)

### Security Review Notes

**Why is this endpoint public/protected?**
> [Explain reasoning here]

**What authorization checks are performed?**
> [List checks: owner, admin, member, etc.]

**Any special security considerations?**
> [Edge cases, guest handling, rate limiting, etc.]

---

## Example Usage

### Example 1: Protected Write Endpoint

```markdown
## API Endpoint: `DELETE /api/events/[id]`

### Security Configuration

- [x] **Authentication Required?**
  - [x] Yes - Added to `PROTECTED_ROUTES` in middleware
  - [ ] No
  - [ ] Admin only
  - [ ] Cron only

- [x] **HTTP Methods Protected:**
  - [ ] GET
  - [ ] POST
  - [ ] PUT
  - [ ] PATCH
  - [x] DELETE

- [x] **Middleware Configuration:**
  - [x] Path added: `{ path: '/api/events/', methods: ['DELETE'] }`
  - [x] Methods specified: DELETE only
  - [x] Comments added

- [x] **Route Handler Security:**
  - [x] Uses `getCurrentUserFromMiddleware(request)`
  - [x] Checks `if (!currentUser)` → `UnauthorizedError`
  - [x] Authorization: Checks event ownership
  - [x] No guest handling (auth required)

- [x] **Documentation:**
  - [x] Security comment added to route file
  - [x] Auth requirements documented
  - [x] `API_SECURITY_AUDIT.md` updated

- [x] **Testing:**
  - [x] 401 without auth_token
  - [x] 403 for non-owner
  - [x] 200 for owner

### Security Review Notes

**Why is this endpoint protected?**
> Only event owner should be able to delete their event.

**What authorization checks are performed?**
> 1. Authentication via middleware
> 2. Ownership check: `event.createdByUserId === currentUser.id`

**Any special security considerations?**
> Cascade deletes all participants and related data. RLS policies ensure proper cleanup.
```

### Example 2: Guest-Friendly Endpoint

```markdown
## API Endpoint: `POST /api/events/[id]/participants`

### Security Configuration

- [x] **Authentication Required?**
  - [ ] Yes
  - [x] No - Guest registration allowed via `guest_session_id`
  - [ ] Admin only
  - [ ] Cron only

- [x] **HTTP Methods Protected:**
  - [ ] GET
  - [x] POST - NOT protected by middleware (guests allowed)
  - [ ] PUT
  - [ ] PATCH
  - [ ] DELETE

- [x] **Middleware Configuration:**
  - [x] Intentionally NOT added to `PROTECTED_ROUTES`
  - [x] Documented in route file why unprotected
  - [x] Comments explain guest handling

- [x] **Route Handler Security:**
  - [x] Handles both `currentUser` and `guestSessionId`
  - [x] Uses `canRegisterForEvent` permission helper
  - [x] Authorization in service layer
  - [x] Guest handling fully implemented

- [x] **Documentation:**
  - [x] Security comment explains guest support
  - [x] Auth requirements documented (optional)
  - [x] Guest session handling explained
  - [x] `API_SECURITY_AUDIT.md` updated

- [x] **Testing:**
  - [x] Works without auth_token (guest)
  - [x] Works with auth_token (user)
  - [x] Proper permission checks in service layer
  - [x] Guest session persistence verified

### Security Review Notes

**Why is this endpoint unprotected?**
> Guests can register for events without creating an account.
> This is a core business requirement for user-friendly onboarding.

**What authorization checks are performed?**
> Authorization handled in service layer via `canRegisterForEvent()`:
> - Event not in past
> - Participant limit not reached
> - Anonymous registration allowed (if guest)
> - Club membership (if club event)
> - No duplicate registration

**Any special security considerations?**
> Guest sessions tracked via `guest_session_id` cookie.
> Guests can later claim registrations by logging in with same session.
```
