-- ============================================================================
-- Migration: Enforce club_id immutability via DB trigger (FIXED)
-- Date: 2024-12-31
-- Purpose: SSOT_CLUBS_EVENTS_ACCESS.md §5.7 — Club ID is immutable after event creation
--          Defense in depth: prevent club_id changes even if service layer bypassed
-- ============================================================================

-- Drop old trigger and function if exists (from previous attempt)
DROP TRIGGER IF EXISTS events_prevent_club_id_change ON public.events;
DROP FUNCTION IF EXISTS prevent_club_id_change();

-- Function: Prevent club_id changes on UPDATE (SIMPLIFIED LOGIC)
CREATE OR REPLACE FUNCTION prevent_club_id_change()
RETURNS TRIGGER AS $$
BEGIN
  -- SSOT §5.7: club_id is immutable after event creation
  -- NO exceptions: if club_id changes, block it
  IF OLD.club_id IS DISTINCT FROM NEW.club_id THEN
    RAISE EXCEPTION 'club_id is immutable after event creation (SSOT §5.7)'
      USING HINT = 'club_id must be set at creation time and cannot be changed. Create a new event if you need different club association.',
            ERRCODE = '23514'; -- check_violation
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Apply immutability check on every UPDATE
CREATE TRIGGER events_prevent_club_id_change
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_club_id_change();

-- Comment for documentation
COMMENT ON TRIGGER events_prevent_club_id_change ON public.events IS 
'SSOT §5.7: Prevents ANY club_id changes after event creation (immutability enforcement). No exceptions.';

COMMENT ON FUNCTION prevent_club_id_change() IS
'Enforces club_id immutability for events table. Blocks ALL club_id changes:
- Changing club_id from one value to another (club transfer)
- Clearing club_id (value → NULL)
- Setting club_id after creation (NULL → value)
Rationale: club_id must be set at creation time and is permanent to prevent unauthorized transfers and maintain audit trail.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ club_id immutability trigger created successfully (FIXED)';
  RAISE NOTICE 'SSOT §5.7: club_id is now immutable at DB level (NO exceptions)';
  RAISE NOTICE 'Defense in depth: Service layer + DB constraint';
END $$;

