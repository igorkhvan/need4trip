# ✅ Idempotency Layer Activated!

**Date:** 2024-12-31  
**Commit:** 4fe46e3  
**Status:** ✅ ACTIVE

---

## 🎯 What Changed

Migration `20241231_add_idempotency_keys.sql` has been applied to Supabase.

**Activated files:**
- `src/lib/db/idempotencyRepo.ts` — Uncommented all DB functions
- `src/lib/services/withIdempotency.ts` — Ready to use (already was)

**Fixed bugs:**
- Modal logic: показывается во время `awaiting_confirmation` AND `running_confirmed`
- Type casting: используется `(db as any)` для обхода Supabase types
- UUID generation: `crypto.randomUUID()` вместо `uuidv4`

---

## 🚀 How to Use

### In API Endpoints

```typescript
// POST /api/events
export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromMiddleware(request);
  const idempotencyKey = extractIdempotencyKey(request);
  
  // If client provides Idempotency-Key header, wrap with idempotency
  if (idempotencyKey && isValidIdempotencyKey(idempotencyKey)) {
    return withIdempotency(
      { userId: user.id, route: 'POST /api/events', key: idempotencyKey },
      async () => {
        // ... your existing logic ...
        const event = await createEvent(payload);
        
        return {
          status: 201,
          body: { success: true, data: { event } }
        };
      }
    );
  }
  
  // Fallback if no idempotency key (shouldn't happen with new UI)
  // ... existing logic ...
}
```

### Client Already Sends Idempotency-Key

Both `create-event-client.tsx` and `edit-event-client.tsx` now send:

```typescript
headers["Idempotency-Key"] = controller.correlationId; // UUID per attempt
```

**This means:**
- Same attempt (including confirm_credit retry) uses SAME key
- Different attempts (new form submission) use DIFFERENT keys

---

## 🧪 Testing

### Manual Test

1. **Open browser DevTools → Network tab**
2. **Create event requiring credit:**
   - Fill form with 50 participants
   - Click "Создать событие"
   - **Check Network:** POST /api/events with `Idempotency-Key` header
3. **Confirm credit:**
   - Click "Подтвердить и опубликовать"
   - **Check Network:** POST /api/events?confirm_credit=1 with SAME `Idempotency-Key`
4. **Simulate duplicate:**
   - In DevTools, right-click request → "Replay XHR"
   - **Expected:** Same event returned (no duplicate created)
   - **Check headers:** `X-Idempotency-Replay: true`

### Database Check

```sql
-- View stored idempotency keys
SELECT 
  key,
  route,
  status,
  response_status,
  created_at,
  completed_at
FROM idempotency_keys
WHERE user_id = '<your_user_id>'
ORDER BY created_at DESC
LIMIT 10;

-- Check for duplicates (should be 0)
SELECT key, route, COUNT(*) as count
FROM idempotency_keys
WHERE status = 'completed'
GROUP BY key, route
HAVING COUNT(*) > 1;
```

---

## 📊 Expected Behavior

### Scenario 1: Normal Flow (No Duplicate)
1. Client sends POST with `Idempotency-Key: abc-123`
2. Backend creates `in_progress` record
3. Backend executes operation
4. Backend stores `completed` record with response
5. Client receives response with `X-Idempotency-Stored: true`

### Scenario 2: Retry After Success (Replay)
1. Client sends POST with `Idempotency-Key: abc-123` (again)
2. Backend finds existing `completed` record
3. Backend returns stored response immediately (no re-execution)
4. Client receives response with `X-Idempotency-Replay: true`

### Scenario 3: Concurrent Duplicate (Race)
1. Client A sends POST with `Idempotency-Key: abc-123`
2. Client B sends POST with `Idempotency-Key: abc-123` (concurrent)
3. One creates `in_progress`, other gets 409 REQUEST_IN_PROGRESS
4. Client B receives:
   ```json
   {
     "success": false,
     "error": {
       "code": "REQUEST_IN_PROGRESS",
       "message": "Запрос уже выполняется. Пожалуйста, подождите."
     }
   }
   ```

### Scenario 4: Retry After Failure (Allow)
1. Client sends POST with `Idempotency-Key: abc-123`
2. Backend marks as `failed` (operation threw error)
3. Client sends POST with SAME key (retry)
4. Backend allows retry (creates new `in_progress`)

---

## ⚠️ Important Notes

### Type Casting

Because Supabase types don't yet include `idempotency_keys` table, we use:

```typescript
const { data, error } = await (db as any)
  .from('idempotency_keys')
  // ...
```

**To fix properly (optional):**
```bash
# Regenerate Supabase types after migration
npx supabase gen types typescript --project-id <your_project_id> > src/lib/types/database.types.ts
```

### TTL / Cleanup

Current implementation does NOT auto-delete old keys.

**Recommended cleanup policy (add later):**
```sql
-- Delete completed keys older than 7 days
DELETE FROM idempotency_keys
WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '7 days';

-- Delete failed keys older than 1 day
DELETE FROM idempotency_keys
WHERE status = 'failed'
  AND completed_at < NOW() - INTERVAL '1 day';
```

Can be implemented as:
1. Postgres cron job (pg_cron extension)
2. Supabase edge function (scheduled)
3. Backend cleanup script (runs daily)

---

## 🎯 Next Steps

### Part 5: Tests (TODO)

Write integration tests:

```typescript
// tests/integration/events.idempotency.test.ts
describe('Event Creation Idempotency', () => {
  it('same Idempotency-Key returns same event', async () => {
    const key = crypto.randomUUID();
    
    const response1 = await POST(req, { headers: { 'Idempotency-Key': key } });
    const response2 = await POST(req, { headers: { 'Idempotency-Key': key } });
    
    expect(response1.data.event.id).toBe(response2.data.event.id);
    expect(response2.headers['X-Idempotency-Replay']).toBe('true');
    
    // Verify only 1 event in DB
    const events = await db.from('events').select('*').eq('title', payload.title);
    expect(events.length).toBe(1);
  });
  
  it('concurrent requests with same key → 409', async () => {
    const key = crypto.randomUUID();
    
    const [response1, response2] = await Promise.all([
      POST(req, { headers: { 'Idempotency-Key': key } }),
      POST(req, { headers: { 'Idempotency-Key': key } }),
    ]);
    
    const statuses = [response1.status, response2.status].sort();
    expect(statuses).toEqual([201, 409]); // One success, one conflict
  });
});
```

### Part 6: SSOT Documentation (TODO)

Update `docs/ssot/SSOT_ARCHITECTURE.md`:

```markdown
## § Idempotency Standard

All mutation endpoints MUST support `Idempotency-Key` header.

**Requirements:**
- Key format: UUID v4
- Scope: (user_id, route, key)
- TTL: 7 days for completed, 1 day for failed
- Response headers: `X-Idempotency-Replay` or `X-Idempotency-Stored`

**Canonical Implementation:**
- Service: `src/lib/services/withIdempotency.ts`
- Repository: `src/lib/db/idempotencyRepo.ts`
- Migration: `supabase/migrations/20241231_add_idempotency_keys.sql`

**Usage Pattern:**
```typescript
if (idempotencyKey) {
  return withIdempotency(
    { userId, route, key: idempotencyKey },
    async () => { /* operation */ }
  );
}
```
```

---

## ✅ Summary

| Component | Status |
|-----------|--------|
| **Migration** | ✅ Applied |
| **Repository** | ✅ Active |
| **Service Wrapper** | ✅ Ready |
| **Client Integration** | ✅ Sends Idempotency-Key |
| **API Integration** | ⏸️ TODO (wrap endpoints) |
| **Tests** | ⏸️ TODO |
| **SSOT Docs** | ⏸️ TODO |

**Current State:** Infrastructure ready, API endpoints need to be wrapped.

**Completion:** ~80% (Parts 1-4 done, Part 3 activated, Parts 5-6 pending)

---

**Commits:**
- f870cc0 — feat(events): implement ActionController + effective entitlements (Parts 1-4)
- e225efd — docs(events): add completion report for Parts 1-4
- 4fe46e3 — fix: activate idempotency layer after migration

