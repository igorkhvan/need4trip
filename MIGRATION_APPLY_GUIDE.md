# 📋 Guide: Applying Database Normalization Migrations

> **Date:** 2024-12-13  
> **Status:** Ready to Apply  
> **Priority:** CRITICAL

---

## 🎯 Overview

This guide provides step-by-step instructions for applying database normalization migrations that replace TEXT fields with normalized Foreign Keys.

### **What's Being Changed:**

| Table | Old Field | New Field | Change |
|-------|-----------|-----------|--------|
| `events` | `city TEXT` | `city_id UUID` | FK → `cities` |
| `users` | `city TEXT` | `city_id UUID` | FK → `cities` |
| `clubs` | `city TEXT` | `city_id UUID` | FK → `cities` |
| `users` | `car_model TEXT` | `car_brand_id UUID` + `car_model_text TEXT` | FK → `car_brands` |
| `events` | `currency TEXT` | `currency_code TEXT(3)` | FK → `currencies` |

---

## 📦 Migration Files

All migration files are located in: `supabase/migrations/`

### **Priority 1: Cities (CRITICAL)**
1. ✅ `20241213_normalize_cities.sql` — Create cities table + seed 45 cities
2. ✅ `20241213_migrate_events_city_to_fk.sql` — Migrate events.city → city_id
3. ✅ `20241213_migrate_users_city_to_fk.sql` — Migrate users.city → city_id
4. ✅ `20241213_migrate_clubs_city_to_fk.sql` — Migrate clubs.city → city_id

### **Priority 2: Car Brands (MEDIUM)**
5. ✅ `20241213_normalize_car_brands_in_users.sql` — Add car_brand_id + car_model_text

### **Priority 3: Currencies (LOW)**
6. ✅ `20241213_normalize_currencies.sql` — Create currencies + migrate events.currency

---

## 🚀 Step-by-Step Instructions

### **STEP 1: Backup Database**

Before applying ANY migrations, create a backup:

```bash
# Option A: Supabase CLI
supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql

# Option B: PostgreSQL direct
pg_dump -h <your-host> -U postgres -d postgres > backup.sql
```

---

### **STEP 2: Apply Cities Migrations**

Apply migrations **IN ORDER**:

```bash
# 1. Create cities table
psql -h <your-host> -U postgres -d postgres -f supabase/migrations/20241213_normalize_cities.sql

# 2. Migrate events
psql -h <your-host> -U postgres -d postgres -f supabase/migrations/20241213_migrate_events_city_to_fk.sql

# 3. Migrate users
psql -h <your-host> -U postgres -d postgres -f supabase/migrations/20241213_migrate_users_city_to_fk.sql

# 4. Migrate clubs
psql -h <your-host> -U postgres -d postgres -f supabase/migrations/20241213_migrate_clubs_city_to_fk.sql
```

**Expected Output:**

```
✅ Cities table created successfully
   - Total cities: 45
   - Popular cities: 25
   - Ready for data migration

✅ Events migration completed
   - Total events: X
   - With city_id: X (100%)
   - Ready for application update

✅ Users migration completed
   - Total users: X
   - With city_id: X (100%)

✅ Clubs migration completed
   - Total clubs: X
   - With city_id: X (100%)
```

---

### **STEP 3: Verify Cities Migration**

```sql
-- Check cities table
SELECT COUNT(*) FROM cities;
SELECT * FROM cities WHERE is_popular = true ORDER BY population DESC LIMIT 10;

-- Check events migration
SELECT COUNT(*) as total,
       COUNT(city_id) as with_city_id,
       COUNT(city) as with_old_city
FROM events;

-- Check users migration
SELECT COUNT(*) as total,
       COUNT(city_id) as with_city_id,
       COUNT(city) as with_old_city
FROM users;

-- Check clubs migration
SELECT COUNT(*) as total,
       COUNT(city_id) as with_city_id,
       COUNT(city) as with_old_city
FROM clubs;
```

**✅ Success Criteria:**
- `with_city_id` should equal `with_old_city` (100% migration)
- No errors in console output

---

### **STEP 4: Apply Car Brands Migration**

```bash
psql -h <your-host> -U postgres -d postgres -f supabase/migrations/20241213_normalize_car_brands_in_users.sql
```

**Expected Output:**

```
✅ Car model normalization completed
   - Total users: X
   - With car_brand_id: X
   - With car_model_text: X
   - Ready for application update
```

---

### **STEP 5: Apply Currencies Migration**

```bash
psql -h <your-host> -U postgres -d postgres -f supabase/migrations/20241213_normalize_currencies.sql
```

**Expected Output:**

```
✅ Currencies normalization completed
   - Total currencies: 14
   - Events with currency_code: X
   - Ready for application update
```

---

### **STEP 6: Verify All Migrations**

```sql
-- Check all new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('cities', 'currencies');

-- Check all new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('events', 'users', 'clubs')
  AND column_name IN ('city_id', 'car_brand_id', 'car_model_text', 'currency_code');

-- Check all indexes exist
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%_city_id%'
   OR indexname LIKE '%_car_brand_id%'
   OR indexname LIKE '%_currency_code%';
```

---

### **STEP 7: Test Application**

After migrations are applied, **restart your Next.js app** and test:

#### **Test 1: City Autocomplete**
1. Go to `/events/create`
2. Click "Город" field
3. ✅ Should see popular cities list
4. ✅ Type "Мос" → should show "Москва"
5. ✅ Select a city → should save correctly

#### **Test 2: Event Filtering by City**
1. Go to `/events`
2. ✅ Should see city filter buttons at top
3. ✅ Click "Москва" → should filter events
4. ✅ Click "Все города" → should show all events

#### **Test 3: Currency Select**
1. Go to `/events/create`
2. Enable "Платное событие"
3. ✅ Currency dropdown should show "₽ Российский рубль", "$  Доллар США", etc.

---

## ⚠️ Rollback Instructions

If something goes wrong, you can rollback:

### **Rollback Cities Migration:**

```sql
-- Events
ALTER TABLE events DROP COLUMN IF EXISTS city_id;
-- Old city column is still there (not deleted by migration)

-- Users
ALTER TABLE users DROP COLUMN IF EXISTS city_id;

-- Clubs
ALTER TABLE clubs DROP COLUMN IF EXISTS city_id;

-- Drop cities table
DROP TABLE IF EXISTS cities CASCADE;
```

### **Restore from Backup:**

```bash
psql -h <your-host> -U postgres -d postgres < backup.sql
```

---

## 📊 Migration Statistics

After all migrations are applied, run this query to get statistics:

```sql
SELECT
  'cities' as table_name,
  (SELECT COUNT(*) FROM cities) as total_rows,
  (SELECT COUNT(*) FROM cities WHERE is_popular = true) as popular_count
UNION ALL
SELECT
  'currencies',
  (SELECT COUNT(*) FROM currencies),
  (SELECT COUNT(*) FROM currencies WHERE is_active = true)
UNION ALL
SELECT
  'events with city_id',
  (SELECT COUNT(*) FROM events WHERE city_id IS NOT NULL),
  (SELECT COUNT(*) FROM events)
UNION ALL
SELECT
  'users with city_id',
  (SELECT COUNT(*) FROM users WHERE city_id IS NOT NULL),
  (SELECT COUNT(*) FROM users)
UNION ALL
SELECT
  'users with car_brand_id',
  (SELECT COUNT(*) FROM users WHERE car_brand_id IS NOT NULL),
  (SELECT COUNT(*) FROM users)
UNION ALL
SELECT
  'events with currency_code',
  (SELECT COUNT(*) FROM events WHERE currency_code IS NOT NULL),
  (SELECT COUNT(*) FROM events WHERE is_paid = true);
```

---

## ✅ Success Checklist

- [ ] Backup created
- [ ] Cities table created (45 cities)
- [ ] events.city_id migration (100%)
- [ ] users.city_id migration (100%)
- [ ] clubs.city_id migration (100%)
- [ ] users.car_brand_id + car_model_text added
- [ ] Currencies table created (14 currencies)
- [ ] events.currency_code migration completed
- [ ] All indexes created
- [ ] Application restarted
- [ ] City autocomplete works
- [ ] Event filtering by city works
- [ ] Currency select works
- [ ] No linter errors
- [ ] No runtime errors

---

## 🎉 Post-Migration Cleanup (Future)

After confirming everything works in production for 1-2 weeks, you can:

### **Drop Old Columns:**

```sql
-- ⚠️ ONLY AFTER CONFIRMING EVERYTHING WORKS!
ALTER TABLE events DROP COLUMN IF EXISTS city;
ALTER TABLE users DROP COLUMN IF EXISTS city;
ALTER TABLE clubs DROP COLUMN IF EXISTS city;
ALTER TABLE users DROP COLUMN IF EXISTS car_model;
ALTER TABLE events DROP COLUMN IF EXISTS currency;

-- Drop old indexes
DROP INDEX IF EXISTS idx_events_city;
DROP INDEX IF EXISTS idx_users_city;
DROP INDEX IF EXISTS idx_clubs_city;
```

---

## 🆘 Troubleshooting

### **Issue: Migration fails with "column already exists"**
**Solution:** Some columns might already exist from previous attempts. Check with:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'events' AND column_name = 'city_id';
```

### **Issue: City not found in catalog during migration**
**Solution:** The migration will log unknown cities. Add them manually:
```sql
INSERT INTO cities (name, country, is_popular)
VALUES ('Новый Город', 'RU', false);
```

### **Issue: Application shows compilation errors**
**Solution:** Regenerate Supabase types:
```bash
supabase gen types typescript --local > src/lib/types/supabase.ts
```

---

## 📞 Support

If you encounter any issues:
1. Check the console output for specific error messages
2. Verify the database connection
3. Ensure all previous migrations are applied
4. Review the rollback instructions above

---

**Ready to apply?** Start with **STEP 1: Backup Database** ✅

