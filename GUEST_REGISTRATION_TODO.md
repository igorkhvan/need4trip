# Guest Registration Feature - Remaining Tasks

## Completed ✅
1. Database migration - added `guest_session_id` column
2. Created `guestSession.ts` utility for managing guest sessions
3. Updated TypeScript types (participant.ts, supabase.ts)
4. Updated `createParticipant` in participantRepo.ts

## Remaining Tasks 🚧

### 1. Update Mappers
- [ ] Update `src/lib/mappers.ts` - add `guestSessionId` to `DbParticipant` type
- [ ] Update mapping function to include `guest_session_id` field

### 2. Update Services Layer (`src/lib/services/participants.ts`)
- [ ] Import `getOrCreateGuestSessionId` from guestSession utility
- [ ] Update `registerParticipant` to:
  - Get or create guestSessionId for non-authenticated users
  - Check for duplicate registration (userId OR guestSessionId + displayName)
  - Pass guestSessionId to repository
- [ ] Update `updateParticipant` to check permissions:
  - User is owner of event OR
  - User is authenticated AND userId matches OR
  - User is guest AND guestSessionId matches
- [ ] Update `deleteParticipant` with same permission logic

### 3. Update API Routes
- [ ] `src/app/api/events/[id]/participants/route.ts` (POST):
  - Call `getGuestSessionId()` for non-authenticated users
  - Pass sessionId to service layer
- [ ] Update other participant API routes as needed

### 4. Update UI Components
- [ ] `src/app/events/[id]/page.tsx`:
  - Get guestSessionId on server side
  - Check if guest is already registered (by sessionId)
  - Show "Вы зарегистрированы" badge for guests with matching sessionId
  - Pass sessionId to client components via props or context
  
- [ ] `src/components/events/participant-actions.tsx`:
  - Accept `guestSessionId` prop
  - Update `canEdit` logic: `isOwner || (userId && userId === participant.userId) || (guestSessionId && guestSessionId === participant.guestSessionId)`
  - Update `canRemove` with same logic

- [ ] `src/components/events/participant-form.tsx`:
  - For guests, get sessionId from client-side cookie using `getGuestSessionIdClient()`
  - Include sessionId in form submission

### 5. Database Query Updates
- [ ] Update `listParticipantsWithUsers` query to include `guest_session_id`
- [ ] Ensure all SELECT queries include the new field

### 6. Testing
- [ ] Test guest registration flow
- [ ] Test duplicate prevention for guests
- [ ] Test guest edit/delete permissions
- [ ] Test owner permissions on all registrations
- [ ] Test authenticated user permissions

## Technical Details

### Duplicate Prevention Logic
```typescript
// For authenticated users
if (userId) {
  // Check by userId only
  existingParticipant = await findByEventAndUserId(eventId, userId);
}
// For guests
else if (guestSessionId) {
  // Check by guestSessionId + displayName
  existingParticipant = await findByEventAndGuestSession(eventId, guestSessionId, displayName);
}
```

### Permission Check Logic
```typescript
function canEditOrDelete(participant, currentUser, guestSessionId, isOwner) {
  if (isOwner) return true;
  if (currentUser && participant.userId === currentUser.id) return true;
  if (!currentUser && guestSessionId && participant.guestSessionId === guestSessionId) return true;
  return false;
}
```

## Notes
- Guest sessions stored in HTTP-only cookie for 1 year
- Using `crypto.randomUUID()` for session ID generation (no external dependencies)
- Database unique constraint prevents duplicate guest registrations
- Session ID is UUID v4 format

