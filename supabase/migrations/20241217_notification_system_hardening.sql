-- ============================================================================
-- Notification System Hardening & Extensibility
-- ============================================================================
-- Part 1: Normalize notification types (enum alignment)
-- Part 2: Future-proof settings (explicit columns)
-- Part 3: Queue hardening (dedupe, locks, parallel-safe)
-- Part 4: Event versioning (for update notifications)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: Notification Types Enum
-- ----------------------------------------------------------------------------

-- Extend notification_trigger enum with all current + near-future types
DO $$ 
BEGIN
  -- Add new values if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'event_updated' 
    AND enumtypid = 'notification_trigger'::regtype
  ) THEN
    ALTER TYPE notification_trigger ADD VALUE 'event_updated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'new_event_published' 
    AND enumtypid = 'notification_trigger'::regtype
  ) THEN
    ALTER TYPE notification_trigger ADD VALUE 'new_event_published';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'new_participant_joined' 
    AND enumtypid = 'notification_trigger'::regtype
  ) THEN
    ALTER TYPE notification_trigger ADD VALUE 'new_participant_joined';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'event_cancelled' 
    AND enumtypid = 'notification_trigger'::regtype
  ) THEN
    ALTER TYPE notification_trigger ADD VALUE 'event_cancelled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'event_reminder' 
    AND enumtypid = 'notification_trigger'::regtype
  ) THEN
    ALTER TYPE notification_trigger ADD VALUE 'event_reminder';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'organizer_message' 
    AND enumtypid = 'notification_trigger'::regtype
  ) THEN
    ALTER TYPE notification_trigger ADD VALUE 'organizer_message';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PART 2: User Notification Settings (Future-proof)
-- ----------------------------------------------------------------------------

-- Add explicit column for each notification type (1 column = 1 type)
-- Easy to extend, no JSON magic
ALTER TABLE user_notification_settings
  ADD COLUMN IF NOT EXISTS notify_event_updated BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_new_event_published BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_new_participant_joined BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_event_cancelled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_event_reminder BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_organizer_message BOOLEAN DEFAULT TRUE;

-- Add telegram enabled flag
ALTER TABLE user_notification_settings
  ADD COLUMN IF NOT EXISTS is_telegram_enabled BOOLEAN DEFAULT TRUE;

-- Index for common query pattern (city-based notifications)
CREATE INDEX IF NOT EXISTS idx_users_city_telegram 
  ON users(city_id) 
  WHERE telegram_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- PART 3: Queue Hardening (Deduplication + Parallel Safe)
-- ----------------------------------------------------------------------------

-- A) Deduplication key
ALTER TABLE notification_queue
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- Unique index for dedupe (allows NULL for backwards compatibility)
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_queue_dedupe
  ON notification_queue(dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- B) Processing lock (parallel-safe workers)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'processing' 
    AND enumtypid = 'notification_status'::regtype
  ) THEN
    ALTER TYPE notification_status ADD VALUE 'processing';
  END IF;
END $$;

ALTER TABLE notification_queue
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by TEXT;

-- Index for efficient claim query
CREATE INDEX IF NOT EXISTS idx_notification_queue_claim
  ON notification_queue(status, scheduled_for)
  WHERE status = 'pending';

-- C) Payload as JSONB (structured data)
ALTER TABLE notification_queue
  ADD COLUMN IF NOT EXISTS payload JSONB;

-- D) Dead letter tracking
ALTER TABLE notification_queue
  ADD COLUMN IF NOT EXISTS moved_to_dlq_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notification_queue_dlq
  ON notification_queue(moved_to_dlq_at)
  WHERE moved_to_dlq_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- PART 4: Event Versioning (for update dedupe)
-- ----------------------------------------------------------------------------

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- Trigger to auto-increment version on update
CREATE OR REPLACE FUNCTION increment_event_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_event_version ON events;
CREATE TRIGGER trigger_increment_event_version
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION increment_event_version();

-- ----------------------------------------------------------------------------
-- PART 5: Notification Queue Helper Functions
-- ----------------------------------------------------------------------------

-- Function to claim notifications (parallel-safe)
CREATE OR REPLACE FUNCTION claim_pending_notifications(
  p_batch_size INT,
  p_worker_id TEXT
)
RETURNS SETOF notification_queue AS $$
  WITH picked AS (
    SELECT id
    FROM notification_queue
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
    ORDER BY scheduled_for
    FOR UPDATE SKIP LOCKED
    LIMIT p_batch_size
  )
  UPDATE notification_queue q
  SET status = 'processing',
      locked_at = NOW(),
      locked_by = p_worker_id
  FROM picked
  WHERE q.id = picked.id
  RETURNING q.*;
$$ LANGUAGE sql;

-- Function to move failed notifications to DLQ
CREATE OR REPLACE FUNCTION move_to_dead_letter_queue(
  p_notification_id UUID,
  p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE notification_queue
  SET status = 'failed',
      last_error = p_error_message,
      moved_to_dlq_at = NOW()
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset stuck processing notifications (recovery)
CREATE OR REPLACE FUNCTION reset_stuck_notifications(
  p_timeout_minutes INT DEFAULT 30
)
RETURNS INT AS $$
  WITH reset AS (
    UPDATE notification_queue
    SET status = 'pending',
        locked_at = NULL,
        locked_by = NULL
    WHERE status = 'processing'
      AND locked_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*)::INT FROM reset;
$$ LANGUAGE sql;

-- ----------------------------------------------------------------------------
-- PART 6: Cleanup & Comments
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN notification_queue.dedupe_key IS 
  'Unique key for deduplication. Pattern: {type}:{eventId}:{version?}:{userId}';

COMMENT ON COLUMN notification_queue.payload IS 
  'Structured notification data as JSON (event details, URLs, etc.)';

COMMENT ON COLUMN notification_queue.locked_by IS 
  'Worker ID that claimed this notification (for debugging)';

COMMENT ON COLUMN events.version IS 
  'Auto-incremented on every update. Used for notification deduplication.';

COMMENT ON FUNCTION claim_pending_notifications IS 
  'Safely claim pending notifications for processing (parallel-safe with SKIP LOCKED)';

COMMENT ON FUNCTION move_to_dead_letter_queue IS 
  'Move a notification to dead letter queue after max retries';

COMMENT ON FUNCTION reset_stuck_notifications IS 
  'Reset notifications stuck in processing state (run periodically)';
