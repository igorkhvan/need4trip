# Billing v4 — PostgREST Schema Cache Issue

⚠️ **Tests are failing because Supabase PostgREST cached OLD schema**

**Error:** `Could not find the 'amount' column of 'billing_transactions' in the schema cache (PGRST204)`

**Root Cause:** Migrations applied ✅, but PostgREST API layer didn't reload schema cache.

---

## ✅ Verification Complete

**Schema status (via `tests/verify-schema.js`):**
- ✅ billing_transactions table exists
- ✅ billing_credits table exists
- ✅ billing_products table exists (EVENT_UPGRADE_500 seeded)
- ✅ events.published_at column exists
- ❌ PostgREST can't see new columns (cache issue)

---

## 🔧 Solution: Reload Schema Cache

### Option 1: SQL Command (Fastest! ⚡)

Open Supabase Dashboard → SQL Editor, run:

```sql
NOTIFY pgrst, 'reload schema';
```

**Done!** Schema cache reloaded instantly.

---

### Option 2: Restart Project (Slower but guaranteed)

**Via Dashboard:**
1. https://supabase.com/dashboard
2. Select project → **Settings** → **General**
3. Scroll down → **Pause project**
4. Wait 10 seconds
5. **Resume project**

**Via CLI:**
```bash
supabase projects pause --project-ref djbqwsipllhdydshuokg
# Wait 30 seconds
supabase projects resume --project-ref djbqwsipllhdydshuokg
```

---

## 🧪 Test After Reload

```bash
# Verify schema cache updated
node tests/verify-schema.js

# Should show:
# ✅ Test insert transaction: Insert successful

# Then run tests
npm run test:billing

# Expected: 8/8 PASS ✅
```

---

## 📊 What Was Wrong

**Timeline:**
1. ✅ Migrations applied to PostgreSQL database
2. ✅ Tables/columns created successfully
3. ❌ PostgREST (Supabase API) still using old cached schema
4. ❌ Tests fail with "column not found in schema cache"

**Fix:** Force PostgREST to reload schema from database.

---

## 🔍 Debug Script

Created: `tests/verify-schema.js`

Tests actual database state vs PostgREST API:
- Checks table existence
- Checks column existence  
- Attempts INSERT to trigger cache error

Run: `node tests/verify-schema.js`

---

After reloading schema cache, return here and run tests! 🚀

