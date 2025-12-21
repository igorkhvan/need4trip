-- Add unique constraint to prevent duplicate registrations for authenticated users
-- This ensures one user can only register once per event at the database level
-- Complements existing guest registration protection (idx_event_participants_guest_unique)

-- First, remove any existing duplicate registrations (if any)
-- Keep only the earliest registration for each user+event combination
WITH duplicates AS (
  SELECT 
    id,
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

-- Add unique index for authenticated users
-- This prevents duplicate registrations at the database level (atomic operation)
CREATE UNIQUE INDEX idx_event_participants_user_unique 
ON event_participants(event_id, user_id)
WHERE user_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_event_participants_user_unique IS 
  'Предотвращает повторную регистрацию одного пользователя на одно событие. '
  'Работает атомарно на уровне БД, защищая от race conditions.';

