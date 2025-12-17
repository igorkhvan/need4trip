# Remaining TODOs

**Last Updated:** 2024-12-17  
**Status:** Documented & Prioritized

This document tracks all remaining TODO comments in the codebase after the Type Safety & TODO Cleanup sprint.

---

## Summary

| Category | Count | Priority | Status |
|----------|-------|----------|--------|
| Backend Optimization | 1 | P2 | Documented |
| Frontend Features | 2 | P3 | Backlog |
| Infrastructure | 1 | P3 | Future |
| **Total** | **4** | - | - |

---

## Backend Optimization (P2)

### 1. Club Participant Counting

**File:** `src/lib/services/clubs.ts:649`

**TODO:**
```typescript
// TODO: Need4Trip: Add countClubParticipants() in participantRepo
// This requires either:
// 1. A dedicated countClubParticipants() function in participantRepo
// 2. Or enhancing listClubEvents() to include participant counts via JOIN
// For now, return 0 to avoid type errors
```

**Context:**
`getClubStatistics()` function needs to calculate total participant count across all club events. Currently returns 0 as a placeholder.

**Impact:**
- **User-facing:** Club statistics page shows incorrect participant count
- **Performance:** N/A (not implemented)
- **Security:** None

**Recommended Solution:**

**Option A (Recommended):** Add dedicated function in `participantRepo.ts`:
```typescript
export async function countClubParticipants(clubId: string): Promise<number> {
  const { count, error } = await supabase
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
    .in('event_id', (await listClubEvents(clubId, 1, 1000)).data.map(e => e.id));
  
  return count ?? 0;
}
```

**Option B:** Enhance `listClubEvents()` to include participant counts:
```typescript
.select('*, participants:event_participants(count)')
```

**Effort:** 30 minutes  
**Priority:** P2 (Nice to have, but low urgency)  
**Assigned:** Unassigned

---

## Frontend Features (P3)

### 2. Club Events Timeline

**File:** `src/app/clubs/[id]/page.tsx:208`

**TODO:**
```tsx
{/* TODO: Последние события клуба */}
```

**Context:**
Club detail page should display recent/upcoming events for the club.

**Impact:**
- **User-facing:** Users can't see club events on club page (must navigate separately)
- **Performance:** N/A (not implemented)
- **Security:** None

**Recommended Solution:**
Create `<ClubEventsTimeline>` component:
```tsx
<ClubEventsTimeline
  clubId={club.id}
  limit={5}
  showUpcoming
  showPast={false}
/>
```

**Effort:** 2-3 hours (component + API integration)  
**Priority:** P3 (UI enhancement)  
**Assigned:** Unassigned

---

### 3. Club Join Button

**File:** `src/app/clubs/[id]/page.tsx:209`

**TODO:**
```tsx
{/* TODO: Кнопка "Вступить в клуб" для не-членов */}
```

**Context:**
Non-members should see a "Join Club" button on club detail page.

**Impact:**
- **User-facing:** Users can't join clubs directly from club page
- **Performance:** N/A (not implemented)
- **Security:** Requires proper authorization checks

**Recommended Solution:**
Create `<ClubJoinButton>` component with:
- Check if user is already a member
- Handle join request (pending approval flow)
- Show appropriate state (Join / Pending / Member)
- Respect club membership policies

**Effort:** 3-4 hours (component + backend + authorization)  
**Priority:** P3 (UI enhancement)  
**Assigned:** Unassigned

---

## Infrastructure (P3 - Future)

### 4. Logger Migration to Pino

**File:** `src/lib/utils/logger.ts:19`

**TODO:**
```typescript
/**
 * Simple logger that works without external dependencies
 * TODO: Replace with Pino for production when available
 */
```

**Context:**
Currently using a custom logger implementation. Pino is a fast, structured logger for Node.js with better performance and features.

**Impact:**
- **User-facing:** None (internal)
- **Performance:** Pino is 2-3x faster than custom logger
- **Security:** None
- **Observability:** Better structured logging, log levels, child loggers

**Recommended Solution:**
1. Install Pino: `npm install pino pino-pretty`
2. Replace `Logger` class with Pino instance
3. Migrate all log calls to Pino API
4. Configure log levels per environment
5. Add log rotation for production

**Effort:** 1 day (migration + testing)  
**Priority:** P3 (Nice to have, current logger works fine)  
**Assigned:** Unassigned  
**Blocked by:** None (but should be done after test infrastructure is ready)

**Why not now:**
- Current logger is functional and well-tested
- No performance issues reported
- Migration requires careful testing (all log calls)
- Better to wait until test infrastructure is in place

---

## Cleanup History

### Removed TODOs (2024-12-17)

| File | Line | TODO | Status |
|------|------|------|--------|
| `src/app/api/ai/events/generate-rules/route.ts` | 9 | Rate limiting | ✅ Implemented |
| `src/lib/db/clubRepo.ts` | 9 | Regenerate Supabase types | ✅ Completed |
| `src/lib/db/clubMemberRepo.ts` | 9, 64 | Regenerate Supabase types | ✅ Completed |
| `src/lib/services/clubs.ts` | 49 | Migrate to billing v2.0 | ✅ Completed |

---

## Maintenance Guidelines

### When adding new TODOs:

1. **Always provide context:**
   ```typescript
   // TODO: Brief description
   // Why: Explanation of why this is needed
   // Impact: User-facing / Performance / Security
   // Effort: Estimate
   ```

2. **Update this document** when:
   - Adding new TODOs
   - Removing completed TODOs
   - Changing TODO priority

3. **Prefer GitHub Issues for:**
   - Large features (>1 day effort)
   - User-facing bugs
   - Security issues
   - Items requiring discussion

4. **Use inline TODOs for:**
   - Code improvements (<2 hours effort)
   - Optimization opportunities
   - Refactoring candidates
   - Technical debt

---

## Next Steps

**Immediate (P2):**
- [ ] Implement `countClubParticipants()` function (30 min)

**Backlog (P3):**
- [ ] Add Club Events Timeline component (2-3 hours)
- [ ] Add Club Join Button (3-4 hours)

**Future (P3):**
- [ ] Migrate to Pino logger (1 day) - After test infrastructure

---

**Document Version:** 1.0  
**Maintained by:** Development Team  
**Next Review:** After each sprint
