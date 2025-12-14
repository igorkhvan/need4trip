-- ============================================================================
-- Migration: Seed billing_policy_actions
-- Date: 2024-12-15
-- Purpose: Define allowed actions baseline
-- Source: docs/BILLING_AND_LIMITS.md (section 3, 6.2)
-- ============================================================================

-- Canonical list of action codes (from spec):
-- CLUB_CREATE_EVENT
-- CLUB_UPDATE_EVENT
-- CLUB_EXPORT_PARTICIPANTS_CSV
-- CLUB_CREATE_PAID_EVENT
-- CLUB_INVITE_MEMBER
-- CLUB_REMOVE_MEMBER
-- CLUB_UPDATE

-- ============================================================================
-- GRACE: Allow most actions (SaaS best practice - don't break workflow)
-- ============================================================================
INSERT INTO public.billing_policy_actions (policy_id, status, action, is_allowed)
VALUES 
  ('default', 'grace', 'CLUB_CREATE_EVENT', true),
  ('default', 'grace', 'CLUB_UPDATE_EVENT', true),
  ('default', 'grace', 'CLUB_CREATE_PAID_EVENT', true),
  ('default', 'grace', 'CLUB_EXPORT_PARTICIPANTS_CSV', true),
  ('default', 'grace', 'CLUB_INVITE_MEMBER', true),
  ('default', 'grace', 'CLUB_REMOVE_MEMBER', true),
  ('default', 'grace', 'CLUB_UPDATE', true)
ON CONFLICT (policy_id, status, action) DO UPDATE SET
  is_allowed = EXCLUDED.is_allowed;

-- ============================================================================
-- EXPIRED: Read-only, no modifications
-- ============================================================================
INSERT INTO public.billing_policy_actions (policy_id, status, action, is_allowed)
VALUES 
  ('default', 'expired', 'CLUB_CREATE_EVENT', false),
  ('default', 'expired', 'CLUB_UPDATE_EVENT', false),
  ('default', 'expired', 'CLUB_CREATE_PAID_EVENT', false),
  ('default', 'expired', 'CLUB_EXPORT_PARTICIPANTS_CSV', false),
  ('default', 'expired', 'CLUB_INVITE_MEMBER', false),
  ('default', 'expired', 'CLUB_REMOVE_MEMBER', false),
  ('default', 'expired', 'CLUB_UPDATE', false)
ON CONFLICT (policy_id, status, action) DO UPDATE SET
  is_allowed = EXCLUDED.is_allowed;

-- ============================================================================
-- PENDING: Everything forbidden (payment not completed)
-- ============================================================================
INSERT INTO public.billing_policy_actions (policy_id, status, action, is_allowed)
VALUES 
  ('default', 'pending', 'CLUB_CREATE_EVENT', false),
  ('default', 'pending', 'CLUB_UPDATE_EVENT', false),
  ('default', 'pending', 'CLUB_CREATE_PAID_EVENT', false),
  ('default', 'pending', 'CLUB_EXPORT_PARTICIPANTS_CSV', false),
  ('default', 'pending', 'CLUB_INVITE_MEMBER', false),
  ('default', 'pending', 'CLUB_REMOVE_MEMBER', false),
  ('default', 'pending', 'CLUB_UPDATE', false)
ON CONFLICT (policy_id, status, action) DO UPDATE SET
  is_allowed = EXCLUDED.is_allowed;
