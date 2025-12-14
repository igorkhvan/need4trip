/**
 * SAFE Migration: ALTER club_subscriptions v2.0
 * 
 * ВАЖНО: Эта миграция безопасно мигрирует существующие данные!
 * 
 * Текущая структура:
 *   - club_id (uuid, PK)
 *   - plan (text) - "club_free", "club_50", etc.
 *   - valid_until (timestamptz)
 *   - active (boolean)
 * 
 * Новая структура v2.0:
 *   - club_id (uuid, PK)
 *   - plan_id (text, FK) - "club_50", "club_500", "club_unlimited"
 *   - status (text) - "pending", "active", "grace", "expired"
 *   - current_period_start (timestamptz)
 *   - current_period_end (timestamptz)
 *   - grace_until (timestamptz)
 * 
 * Миграция данных:
 *   - "club_free" → DELETE (Free = no subscription в v2.0)
 *   - Остальные планы → мигрируются в новый формат
 * 
 * Source: docs/BILLING_AND_LIMITS.md v2.0
 */

-- ===========================================================================
-- STEP 1: Backup existing data
-- ===========================================================================

CREATE TABLE IF NOT EXISTS club_subscriptions_backup_20241215 AS 
SELECT * FROM club_subscriptions;

COMMENT ON TABLE club_subscriptions_backup_20241215 IS 
'Backup before v2.0 migration. Safe to drop after verification.';

-- ===========================================================================
-- STEP 2: Add new columns (nullable first)
-- ===========================================================================

ALTER TABLE club_subscriptions
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_until TIMESTAMPTZ;

-- ===========================================================================
-- STEP 3: Migrate existing data
-- ===========================================================================

-- Delete "club_free" subscriptions (Free = no subscription in v2.0)
DELETE FROM club_subscriptions WHERE plan = 'club_free';

-- Migrate remaining paid plans (if any exist)
-- Note: Currently only "club_free" exists, so this won't affect anything
-- But keeps migration safe for future
UPDATE club_subscriptions
SET 
  plan_id = plan,  -- Copy plan → plan_id
  status = CASE 
    WHEN active = true AND (valid_until IS NULL OR valid_until > now()) 
      THEN 'active'
    WHEN active = true AND valid_until <= now() 
      THEN 'grace'
    ELSE 'expired'
  END,
  current_period_start = created_at,
  current_period_end = valid_until,
  grace_until = NULL  -- Will be set by backend when transitioning to grace
WHERE plan != 'club_free';

-- ===========================================================================
-- STEP 4: Add constraints after data migration
-- ===========================================================================

-- Make plan_id NOT NULL (safe because we deleted club_free rows)
-- Note: If table is empty after deleting club_free, this is safe
ALTER TABLE club_subscriptions
  ALTER COLUMN plan_id SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

-- Add CHECK constraint for status
ALTER TABLE club_subscriptions
  ADD CONSTRAINT club_subscriptions_status_check 
  CHECK (status IN ('pending', 'active', 'grace', 'expired'));

-- ===========================================================================
-- STEP 5: Add Foreign Key to club_plans
-- ===========================================================================

-- This will be added AFTER club_plans table is created
-- For now, just a comment as a reminder
-- ALTER TABLE club_subscriptions
--   ADD CONSTRAINT club_subscriptions_plan_id_fkey 
--   FOREIGN KEY (plan_id) REFERENCES club_plans(id);

-- ===========================================================================
-- STEP 6: Drop old columns
-- ===========================================================================

ALTER TABLE club_subscriptions
  DROP COLUMN IF EXISTS plan,
  DROP COLUMN IF EXISTS valid_until,
  DROP COLUMN IF EXISTS active;

-- ===========================================================================
-- STEP 7: Create indexes
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_club_subscriptions_plan_id 
  ON club_subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_club_subscriptions_status 
  ON club_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_club_subscriptions_period_end 
  ON club_subscriptions(current_period_end) 
  WHERE current_period_end IS NOT NULL;

-- ===========================================================================
-- STEP 8: Update comments
-- ===========================================================================

COMMENT ON TABLE club_subscriptions IS 
'Club subscriptions v2.0. Free plan = no record (NULL). Paid plans have status: pending/active/grace/expired.';

COMMENT ON COLUMN club_subscriptions.club_id IS 
'Club ID (PK). One subscription per club.';

COMMENT ON COLUMN club_subscriptions.plan_id IS 
'Plan ID: club_50 | club_500 | club_unlimited. FK to club_plans(id).';

COMMENT ON COLUMN club_subscriptions.status IS 
'Subscription status: pending (payment pending) | active (paid & current) | grace (expired but in grace period) | expired (fully expired)';

COMMENT ON COLUMN club_subscriptions.current_period_start IS 
'Current billing period start. NULL for pending subscriptions.';

COMMENT ON COLUMN club_subscriptions.current_period_end IS 
'Current billing period end. NULL for pending subscriptions.';

COMMENT ON COLUMN club_subscriptions.grace_until IS 
'Grace period expiration date. NULL if not in grace period. Set when transitioning from active → grace.';

-- ===========================================================================
-- VERIFICATION QUERIES (run manually after migration)
-- ===========================================================================

-- Check backup was created:
-- SELECT COUNT(*) FROM club_subscriptions_backup_20241215;

-- Check new structure:
-- SELECT * FROM club_subscriptions;

-- Verify no club_free subscriptions remain:
-- SELECT * FROM club_subscriptions_backup_20241215 WHERE plan = 'club_free';

-- Safe to drop backup after verification:
-- DROP TABLE club_subscriptions_backup_20241215;
