-- ============================================================================
-- Migration: Add soft delete support to events table
-- Date: 2026-02-08
-- Purpose: Replace hard DELETE with soft delete (set deleted_at timestamp)
--
-- Rationale:
-- 1. Hard delete of events with consumed billing_credits violates
--    chk_billing_credits_consumed_state CHECK constraint
--    (ON DELETE SET NULL sets consumed_event_id = NULL while status = 'consumed')
-- 2. Soft delete preserves audit trail for paid events
-- 3. billing_credits.consumed_event_id FK remains intact (row not deleted)
--
-- Impact: Non-breaking (additive column, NULL default = active event)
-- ============================================================================

-- Step 1: Add deleted_at column (NULL = active, timestamp = soft-deleted)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL DEFAULT NULL;

-- Step 2: Partial indexes for active events (most queries filter deleted_at IS NULL)
-- These indexes ensure all "active events" queries remain performant
CREATE INDEX IF NOT EXISTS idx_events_not_deleted
  ON public.events(id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_not_deleted_datetime
  ON public.events(date_time DESC)
  WHERE deleted_at IS NULL;

-- Step 3: Index for soft-deleted lookup (isEventSoftDeleted check)
CREATE INDEX IF NOT EXISTS idx_events_deleted
  ON public.events(id)
  WHERE deleted_at IS NOT NULL;

-- Step 4: Comment for documentation
COMMENT ON COLUMN public.events.deleted_at IS
  'Soft delete timestamp. NULL = active event, non-NULL = deleted. '
  'Hard delete is only used for rollback in credit transaction compensating pattern.';

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Events soft delete migration applied:';
  RAISE NOTICE '   - Added deleted_at column (NULL default)';
  RAISE NOTICE '   - Created partial indexes for active/deleted events';
  RAISE NOTICE '   - No existing data modified';
END $$;
