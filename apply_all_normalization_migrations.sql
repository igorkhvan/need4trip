-- ============================================================================
-- CONSOLIDATED MIGRATION: Database Normalization
-- Date: 2024-12-13
-- Purpose: Apply all normalization migrations in one script
-- 
-- INSTRUCTIONS:
-- 1. Open: https://supabase.com/dashboard/project/djbqwsipllhdydshuokg/sql
-- 2. Copy-paste this entire file
-- 3. Click "Run"
-- 4. Check console for success messages
-- ============================================================================

-- ============================================================================
-- MIGRATION 1/6: Create cities table + seed data
-- File: 20241213_normalize_cities.sql
-- ============================================================================

\echo 'Applying: 20241213_normalize_cities.sql'

\ir supabase/migrations/20241213_normalize_cities.sql

-- ============================================================================
-- MIGRATION 2/6: Migrate events.city → events.city_id
-- File: 20241213_migrate_events_city_to_fk.sql
-- ============================================================================

\echo 'Applying: 20241213_migrate_events_city_to_fk.sql'

\ir supabase/migrations/20241213_migrate_events_city_to_fk.sql

-- ============================================================================
-- MIGRATION 3/6: Migrate users.city → users.city_id
-- File: 20241213_migrate_users_city_to_fk.sql
-- ============================================================================

\echo 'Applying: 20241213_migrate_users_city_to_fk.sql'

\ir supabase/migrations/20241213_migrate_users_city_to_fk.sql

-- ============================================================================
-- MIGRATION 4/6: Migrate clubs.city → clubs.city_id
-- File: 20241213_migrate_clubs_city_to_fk.sql
-- ============================================================================

\echo 'Applying: 20241213_migrate_clubs_city_to_fk.sql'

\ir supabase/migrations/20241213_migrate_clubs_city_to_fk.sql

-- ============================================================================
-- MIGRATION 5/6: Add users.car_brand_id + car_model_text
-- File: 20241213_normalize_car_brands_in_users.sql
-- ============================================================================

\echo 'Applying: 20241213_normalize_car_brands_in_users.sql'

\ir supabase/migrations/20241213_normalize_car_brands_in_users.sql

-- ============================================================================
-- MIGRATION 6/6: Create currencies + migrate events.currency
-- File: 20241213_normalize_currencies.sql
-- ============================================================================

\echo 'Applying: 20241213_normalize_currencies.sql'

\ir supabase/migrations/20241213_normalize_currencies.sql

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Migration complete! Verification:' as message;

SELECT 
  'cities' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE is_popular = true) as popular_count
FROM cities
UNION ALL
SELECT 
  'currencies',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active = true)
FROM currencies
UNION ALL
SELECT
  'events with city_id',
  COUNT(*),
  COUNT(*) FILTER (WHERE city_id IS NOT NULL)
FROM events
UNION ALL
SELECT
  'users with city_id',
  COUNT(*),
  COUNT(*) FILTER (WHERE city_id IS NOT NULL)
FROM users;

SELECT '✅ All normalization migrations applied successfully!' as status;

