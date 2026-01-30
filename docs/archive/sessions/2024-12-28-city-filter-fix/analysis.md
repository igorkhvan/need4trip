# City Filter Bug Fix — Session Analysis

**Date:** 2024-12-28  
**Status:** ✅ RESOLVED  
**Priority:** P0 (Production Bug)

---

## 🔴 Problem Statement

**Error:** `GET /api/events?cityId=Алматы` → **400 Bad Request** (VALIDATION_ERROR)

**Root Cause:** Frontend passes **city name** (`"Алматы"`), Backend expects **city UUID**.

---

## 📍 Technical Analysis

### Backend Contract (Strict)

**Files:**
- `src/app/api/events/route.ts:21`
- `src/app/api/events/stats/route.ts:93`

**Zod Schema:**
```typescript
const eventsListQuerySchema = z.object({
  cityId: z.string().uuid().optional(),  // ❌ Expects UUID, receives name
  // ...
});
```

**Behavior:** Returns 400 if `cityId` is not a valid UUID.

---

### Frontend Implementation (Incorrect)

**File:** `src/components/events/events-grid.tsx`

**Before (WRONG):**
```typescript
// Line 92-98
const uniqueCities = useMemo(() => {
  const cities = events
    .map((e) => e.city?.name)  // ❌ Extracting NAME instead of ID
    .filter((c): c is string => c !== null && c !== undefined && c.trim() !== "");
  return Array.from(new Set(cities)).sort();
}, [events]);

// Line 196-199
{uniqueCities.map((city) => (
  <SelectItem key={city} value={city}>  {/* ❌ value = NAME */}
    {city}
  </SelectItem>
))}
```

**Result:** `onCityChange("Алматы")` → URL: `?cityId=Алматы` → Backend rejects (not UUID).

---

## ✅ Solution Implemented

**Approach:** Use `city.id` (UUID) instead of `city.name` from events array.

**Changes in `src/components/events/events-grid.tsx`:**

```typescript
// Line 92-101 (AFTER)
const uniqueCities = useMemo(() => {
  const citiesMap = new Map<string, { id: string; name: string }>();
  events.forEach((e) => {
    if (e.city?.id && e.city?.name) {
      citiesMap.set(e.city.id, { id: e.city.id, name: e.city.name });
    }
  });
  return Array.from(citiesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}, [events]);

// Line 196-201 (AFTER)
{uniqueCities.map((city) => (
  <SelectItem key={city.id} value={city.id}>  {/* ✅ value = UUID */}
    {city.name}
  </SelectItem>
))}
```

**Result:** `onCityChange(uuid)` → URL: `?cityId=<uuid>` → Backend accepts ✅

---

## 🎯 Why This Solution

### ✅ Advantages
1. **Minimal changes** — only 1 file modified
2. **No additional API calls** — reuses data from events
3. **Type-safe** — `cityId` parameter now correctly contains UUID
4. **Consistent with backend contract** — matches Zod schema
5. **Handles duplicate city names** — different cities with same name work correctly

### ❌ Alternative Rejected
**Option:** Load cities from `/api/cities?popular=true`

**Rejected because:**
- Adds extra API call
- Shows cities WITHOUT events (confusing UX)
- Overkill for this use case

---

## 🧪 Verification

### TypeScript Check
```bash
npx tsc --noEmit
```
**Result:** ✅ No new errors (existing test errors unrelated)

### Production Build
```bash
npm run build
```
**Result:** ✅ Compiled successfully (668.6ms)

### Manual Testing
1. Open `/events` page
2. Select city from filter dropdown
3. Verify URL: `?cityId=<uuid>` (not city name)
4. Verify API calls: `GET /api/events?cityId=<uuid>` → 200 OK

---

## 📝 Files Modified

1. `src/components/events/events-grid.tsx` (lines 92-101, 196-201)

---

## 🚀 Deployment

**Status:** Ready for production  
**Risk:** Low (isolated change, backward compatible)  
**Testing:** Build ✅, TypeScript ✅

---

## 📚 Related Documents

- **SSOT:** `docs/ARCHITECTURE.md` § 10 (API contracts)
- **DB Schema:** `docs/DATABASE.md` (cities table)

---

**Session closed:** 2024-12-28  
**Resolution:** Production bug fixed, ready to commit + deploy.

