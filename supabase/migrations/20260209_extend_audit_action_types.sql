-- ============================================================================
-- Migration: Extend admin_audit_log action_type CHECK constraint
-- Date: 2026-02-09
-- Purpose: Add ADMIN_USER_STATUS_CHANGED and _REJECTED to allowed action types
-- ============================================================================

-- Drop old constraint
ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT admin_audit_log_action_type_check;

-- Add extended constraint with new action types
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_type_check
  CHECK (action_type IN (
    'ADMIN_GRANT_CREDIT',
    'ADMIN_EXTEND_SUBSCRIPTION',
    'ADMIN_GRANT_CREDIT_REJECTED',
    'ADMIN_EXTEND_SUBSCRIPTION_REJECTED',
    'ADMIN_USER_STATUS_CHANGED',
    'ADMIN_USER_STATUS_CHANGE_REJECTED'
  ));
