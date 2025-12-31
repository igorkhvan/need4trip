-- ============================================================================
-- Migration: Enforce club_id immutability via DB trigger
-- Date: 2024-12-31
-- Purpose: SSOT_CLUBS_EVENTS_ACCESS.md §5.7 — Club ID is immutable after event creation
--          Defense in depth: prevent club_id changes even if service layer bypassed
-- ============================================================================

-- Function: Prevent club_id changes on UPDATE
CREATE OR REPLACE FUNCTION prevent_club_id_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL → value (initial set during creation, if needed)
  -- But prevent any other changes (value → value, value → NULL)
  IF OLD.club_id IS DISTINCT FROM NEW.club_id THEN
    -- Exception: Allow NULL → value ONLY if this is the first update after creation
    -- (detected by: OLD.club_id IS NULL AND NEW.club_id IS NOT NULL AND OLD.created_at = OLD.updated_at)
    IF NOT (OLD.club_id IS NULL AND NEW.club_id IS NOT NULL AND OLD.created_at = OLD.updated_at) THEN
      RAISE EXCEPTION 'club_id is immutable after event creation (SSOT §5.7)'
        USING HINT = 'Create a new event if you need to change club association',
              ERRCODE = '23514'; -- check_violation
    END IF;
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
'SSOT §5.7: Prevents club_id changes after event creation (immutability enforcement). Allows NULL → value on first update only.';

COMMENT ON FUNCTION prevent_club_id_change() IS
'Enforces club_id immutability for events table. Prevents:
- Changing club_id from one value to another
- Clearing club_id (value → NULL)
Allows:
- NULL → value on first update after creation (edge case)
Rationale: Club association is permanent to prevent unauthorized transfers and maintain audit trail.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ club_id immutability trigger created successfully';
  RAISE NOTICE 'SSOT §5.7: club_id is now immutable at DB level';
  RAISE NOTICE 'Defense in depth: Service layer + DB constraint';
END $$;

