# Billing v4 Migrations — Apply to Production

⚠️ **Tests are failing because Billing v4 migrations are NOT applied in production Supabase**

---

## 📋 Required Migrations (in order):

1. `20241225_add_published_at_to_events.sql`
2. `20241225_extend_billing_transactions.sql`
3. `20241225_add_user_id_to_billing_transactions.sql`
4. `20241225_create_billing_credits.sql`
5. `20241226_create_billing_products.sql`
6. `20241226_add_billing_credits_fk.sql`

---

## 🚀 Apply Migrations

### Option 1: Supabase CLI (Recommended)

```bash
# Link to production (if not linked yet)
supabase link --project-ref djbqwsipllhdydshuokg

# Push all pending migrations
supabase db push --linked
```

**Expected output:**
```
✓ Applied migration 20241225_add_published_at_to_events.sql
✓ Applied migration 20241225_extend_billing_transactions.sql
✓ Applied migration 20241225_add_user_id_to_billing_transactions.sql
✓ Applied migration 20241225_create_billing_credits.sql
✓ Applied migration 20241226_create_billing_products.sql
✓ Applied migration 20241226_add_billing_credits_fk.sql
```

---

### Option 2: Supabase Dashboard (Manual)

1. Open https://supabase.com/dashboard
2. Select project → **SQL Editor**
3. Copy-paste each migration file content (in order!)
4. Click **Run** for each

---

## ✅ Verify Migrations Applied

```sql
-- In Supabase SQL Editor, run:
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('billing_credits', 'billing_products');

-- Should return 2 rows:
-- billing_credits
-- billing_products
```

---

## 🧪 Run Tests After Migrations

```bash
npm run test:billing
```

**Expected: 8/8 PASS** ✅

---

## 🔍 Why Tests Failed

Error: `Could not find the 'amount' column of 'billing_transactions' in the schema cache`

**Root cause:** Production database schema is outdated. Billing v4 tables/columns don't exist yet.

**Solution:** Apply migrations above.

---

## ⚠️ Important Notes

- Migrations are **idempotent** (safe to re-run)
- No data loss (only ADD columns/tables)
- Seeds `EVENT_UPGRADE_500` product (1000 KZT)
- RLS policies included

---

After applying migrations, return here and run tests again! 🚀

