-- ============================================================================
-- Registration Controls Feature
-- ============================================================================
-- Adds manual registration control and anonymous registration settings
-- ============================================================================

-- Add new columns to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS allow_anonymous_registration BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_manually_closed BOOLEAN NOT NULL DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN events.allow_anonymous_registration IS 
  'Allow unregistered users (guests with guest_session_id only) to register for this event. If false, only authenticated users can register.';

COMMENT ON COLUMN events.registration_manually_closed IS 
  'Owner manually closed registration (overrides date/limit checks). Only owner can register when true.';

-- Create index for querying open events
CREATE INDEX IF NOT EXISTS idx_events_registration_status 
  ON events(registration_manually_closed, date_time) 
  WHERE registration_manually_closed = false;

COMMENT ON INDEX idx_events_registration_status IS 
  'Performance index for filtering events with open registration';
