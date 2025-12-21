-- Cleanup script for duplicate participant registrations
-- This script identifies and removes duplicate registrations BEFORE applying the unique constraint
-- 
-- USE CASE: Run this BEFORE migration 20241222_add_user_registration_unique.sql
-- if you have existing duplicate data in production.
--
-- SAFETY: This script keeps the EARLIEST registration for each user+event combination
-- and removes subsequent duplicates. This preserves the original registration time.

-- Step 1: Identify duplicates (for logging/verification)
SELECT 
  event_id,
  user_id,
  COUNT(*) as duplicate_count,
  MIN(created_at) as earliest_registration,
  MAX(created_at) as latest_registration
FROM event_participants
WHERE user_id IS NOT NULL
GROUP BY event_id, user_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, earliest_registration ASC;

-- Step 2: Remove duplicates, keeping only the earliest registration
-- Uses CTE with ROW_NUMBER() to identify which records to delete
WITH duplicates AS (
  SELECT 
    id,
    event_id,
    user_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY event_id, user_id 
      ORDER BY created_at ASC
    ) as rn
  FROM event_participants
  WHERE user_id IS NOT NULL
)
DELETE FROM event_participants
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 3: Verify no duplicates remain
-- This query should return 0 rows after cleanup
SELECT 
  event_id,
  user_id,
  COUNT(*) as registration_count
FROM event_participants
WHERE user_id IS NOT NULL
GROUP BY event_id, user_id
HAVING COUNT(*) > 1;

-- Output summary
SELECT 
  'Cleanup completed' as status,
  (SELECT COUNT(*) FROM event_participants WHERE user_id IS NOT NULL) as total_auth_registrations,
  (SELECT COUNT(*) FROM event_participants WHERE user_id IS NULL AND guest_session_id IS NOT NULL) as total_guest_registrations;

