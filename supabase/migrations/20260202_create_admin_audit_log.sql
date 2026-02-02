-- =============================================================================
-- Migration: Create admin_audit_log table
-- Date: 2026-02-02
-- Purpose: Support admin audit records with proper actor attribution (Option B)
-- 
-- SSOT References:
-- - SSOT_ADMIN_AUDIT_RULES v1.0 §3 (Audit Record Structure)
-- - SSOT_ADMIN_DOMAIN v1.0 §7 (Audit & Accountability)
-- - PHASE_A1.1.D_ADMIN_BACKEND_DIAGNOSTIC_REPORT.md (GAP-2, GAP-7)
--
-- Design Rationale (Option B chosen over Option A):
-- 1. club_audit_log has club_id NOT NULL — doesn't fit user-scoped admin actions
-- 2. club_audit_log has actor_user_id NOT NULL — admin has no user_id
-- 3. Separation of concerns: admin audit vs club audit
-- 4. Lower risk of breaking existing club audit functionality
--
-- This table is append-only and records are retained indefinitely (§7.1).
-- =============================================================================

-- =============================================================================
-- 1. Create ENUM for admin audit result
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE admin_audit_result AS ENUM ('success', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. Create admin_audit_log table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  -- Primary key (BIGSERIAL for high-volume append-only table)
  id BIGSERIAL PRIMARY KEY,
  
  -- Actor attribution (SSOT §3.1 - Mandatory)
  -- actor_type is always 'admin' for this table
  actor_type TEXT NOT NULL DEFAULT 'admin' CHECK (actor_type = 'admin'),
  actor_id TEXT NOT NULL,  -- Stable admin identifier (from AdminContext.actorId)
  
  -- Action classification (SSOT §3.1 - Mandatory)
  action_type TEXT NOT NULL CHECK (action_type IN (
    'ADMIN_GRANT_CREDIT',
    'ADMIN_EXTEND_SUBSCRIPTION',
    'ADMIN_GRANT_CREDIT_REJECTED',
    'ADMIN_EXTEND_SUBSCRIPTION_REJECTED'
  )),
  
  -- Target information (SSOT §3.1 - Mandatory)
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'club')),
  target_id TEXT NOT NULL,  -- UUID of user or club
  
  -- Justification (SSOT §3.1 - Mandatory)
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  
  -- Result (SSOT §3.1 - Mandatory)
  result admin_audit_result NOT NULL,
  
  -- Contextual data (SSOT §3.2 - Optional)
  -- e.g. { "creditCode": "EVENT_UPGRADE_500", "daysExtended": 30 }
  metadata JSONB,
  
  -- Related entity (SSOT §3.2 - Optional)
  -- e.g. credit_id or subscription_id created by the action
  related_entity_id TEXT,
  
  -- Error information for rejected actions (SSOT §3.2 - Optional)
  error_code TEXT,
  
  -- Timestamp (SSOT §3.1 - Mandatory, auto-set)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. Add comments for documentation
-- =============================================================================
COMMENT ON TABLE public.admin_audit_log IS 
  'Immutable audit log for admin actions. SSOT: SSOT_ADMIN_AUDIT_RULES v1.0';

COMMENT ON COLUMN public.admin_audit_log.actor_type IS 
  'Always ''admin'' for this table. Discriminator for context type.';

COMMENT ON COLUMN public.admin_audit_log.actor_id IS 
  'Stable admin identifier from AdminContext.actorId. Not a user_id.';

COMMENT ON COLUMN public.admin_audit_log.action_type IS 
  'Canonical action code from SSOT_ADMIN_AUDIT_RULES v1.0 §4.';

COMMENT ON COLUMN public.admin_audit_log.reason IS 
  'Human-readable justification. Required per §3.1.';

COMMENT ON COLUMN public.admin_audit_log.metadata IS 
  'Structured JSON with contextual details. Optional per §3.2.';

-- =============================================================================
-- 4. Create indexes for common queries
-- =============================================================================

-- Index for querying by actor
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_id 
  ON public.admin_audit_log(actor_id);

-- Index for querying by target
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target 
  ON public.admin_audit_log(target_type, target_id);

-- Index for querying by action type
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type 
  ON public.admin_audit_log(action_type);

-- Index for time-based queries (newest first)
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at 
  ON public.admin_audit_log(created_at DESC);

-- Composite index for filtering by result
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_result 
  ON public.admin_audit_log(result, created_at DESC);

-- =============================================================================
-- 5. RLS policies
-- =============================================================================

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for admin operations)
CREATE POLICY admin_audit_log_service_role_all
  ON public.admin_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No policies for authenticated/anon users (admin-only access)
-- Regular users MUST NOT have access to admin audit logs

-- =============================================================================
-- End of migration
-- =============================================================================
