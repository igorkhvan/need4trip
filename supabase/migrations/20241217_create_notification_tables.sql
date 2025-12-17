-- ============================================================================
-- Notification System - Base Tables & Types
-- ============================================================================
-- Creates foundational notification infrastructure
-- Run BEFORE: 20241217_notification_system_hardening.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: Create ENUM types
-- ----------------------------------------------------------------------------

-- Notification trigger types
CREATE TYPE notification_trigger AS ENUM (
  'event_updated',
  'new_event_published',
  'new_participant_joined',
  'event_cancelled',
  'event_reminder',
  'organizer_message'
);

-- Notification status
CREATE TYPE notification_status AS ENUM (
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled'
);

-- ----------------------------------------------------------------------------
-- PART 2: User Notification Settings
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Telegram enabled flag
  is_telegram_enabled BOOLEAN DEFAULT TRUE,
  
  -- Event update triggers (for participants)
  notify_event_updated BOOLEAN DEFAULT TRUE,
  notify_new_event_published BOOLEAN DEFAULT FALSE,
  notify_event_cancelled BOOLEAN DEFAULT TRUE,
  notify_new_participant_joined BOOLEAN DEFAULT TRUE,
  notify_event_reminder BOOLEAN DEFAULT TRUE,
  notify_organizer_message BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own settings
CREATE POLICY user_settings_select ON user_notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_settings_update ON user_notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY user_settings_insert ON user_notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- PART 3: Notification Queue
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification details
  trigger_type notification_trigger NOT NULL,
  message TEXT NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  
  -- Payload (structured data as JSONB)
  payload JSONB,
  
  -- Status tracking
  status notification_status DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,
  
  -- Deduplication
  dedupe_key TEXT,
  
  -- Parallel-safe processing
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  
  -- Dead letter queue
  moved_to_dlq_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_status 
  ON notification_queue(status);

CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled 
  ON notification_queue(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_notification_queue_event 
  ON notification_queue(event_id);

CREATE INDEX IF NOT EXISTS idx_notification_queue_user 
  ON notification_queue(user_id);

-- Index for efficient claim query
CREATE INDEX IF NOT EXISTS idx_notification_queue_claim
  ON notification_queue(status, scheduled_for)
  WHERE status = 'pending';

-- Unique index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_queue_dedupe
  ON notification_queue(dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- Index for DLQ
CREATE INDEX IF NOT EXISTS idx_notification_queue_dlq
  ON notification_queue(moved_to_dlq_at)
  WHERE moved_to_dlq_at IS NOT NULL;

-- Enable RLS (service role only)
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PART 4: Notification Logs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type notification_trigger NOT NULL,
  
  status notification_status NOT NULL,
  message TEXT NOT NULL,
  error_message TEXT,
  
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_notification_logs_event 
  ON notification_logs(event_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user 
  ON notification_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_trigger 
  ON notification_logs(trigger_type);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status 
  ON notification_logs(status);

CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at 
  ON notification_logs(sent_at);

-- Enable RLS: Users can view their own notification history
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_logs_select ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- PART 5: Event Versioning
-- ----------------------------------------------------------------------------

-- Add version column to events table
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
-- PART 6: Helper Functions
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
-- PART 7: Indexes for City-based Queries
-- ----------------------------------------------------------------------------

-- Index for city-based notifications
CREATE INDEX IF NOT EXISTS idx_users_city_telegram 
  ON users(city_id) 
  WHERE telegram_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- PART 8: Updated_at Trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON user_notification_settings;
CREATE TRIGGER update_user_notification_settings_updated_at 
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- PART 9: Comments
-- ----------------------------------------------------------------------------

COMMENT ON TABLE user_notification_settings IS 
  'User preferences for notification types. One column per notification type for easy extension.';

COMMENT ON TABLE notification_queue IS 
  'Queue for pending notifications. Supports deduplication, parallel processing, and dead letter queue.';

COMMENT ON TABLE notification_logs IS 
  'Historical log of sent/failed notifications for analytics and debugging.';

COMMENT ON COLUMN notification_queue.dedupe_key IS 
  'Unique key for deduplication. Pattern: {type}:{eventId}:{version?}:{userId}';

COMMENT ON COLUMN notification_queue.payload IS 
  'Structured notification data as JSON (event details, URLs, etc.)';

COMMENT ON COLUMN notification_queue.locked_by IS 
  'Worker ID that claimed this notification (for debugging parallel workers)';

COMMENT ON COLUMN events.version IS 
  'Auto-incremented on every update. Used for notification deduplication.';

COMMENT ON FUNCTION claim_pending_notifications IS 
  'Safely claim pending notifications for processing (parallel-safe with SKIP LOCKED)';

COMMENT ON FUNCTION move_to_dead_letter_queue IS 
  'Move a notification to dead letter queue after max retries';

COMMENT ON FUNCTION reset_stuck_notifications IS 
  'Reset notifications stuck in processing state (run periodically for recovery)';
