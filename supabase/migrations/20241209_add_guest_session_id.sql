-- Add guest_session_id column to event_participants table
-- This allows tracking guest users for duplicate prevention and edit/delete permissions

ALTER TABLE event_participants
ADD COLUMN guest_session_id TEXT;

-- Add index for faster lookups
CREATE INDEX idx_event_participants_guest_session ON event_participants(event_id, guest_session_id)
WHERE guest_session_id IS NOT NULL;

-- Add unique constraint for guest registrations (displayName + guestSessionId per event)
-- This prevents guests from registering twice with the same session
CREATE UNIQUE INDEX idx_event_participants_guest_unique 
ON event_participants(event_id, guest_session_id, display_name)
WHERE guest_session_id IS NOT NULL AND user_id IS NULL;

COMMENT ON COLUMN event_participants.guest_session_id IS 'Session ID для незарегистрированных пользователей (гостей). Используется для проверки дублей и прав на редактирование/удаление.';

