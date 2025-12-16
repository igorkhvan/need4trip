-- ============================================================================
-- Migration: Add FREE plan to club_plans
-- Date: 2024-12-16
-- Purpose: Move FREE_LIMITS from code to database
-- Source: Caching strategy & billing system unification
-- ============================================================================

-- Add FREE plan to club_plans table
INSERT INTO public.club_plans (
  id,
  title,
  price_monthly_kzt,
  currency,
  max_members,
  max_event_participants,
  allow_paid_events,
  allow_csv_export,
  is_public
) VALUES (
  'free',
  'Free',
  0.00,
  'KZT',
  NULL,              -- personal events only (no club members concept)
  15,                -- max 15 participants per event
  false,             -- paid events NOT allowed
  false,             -- CSV export NOT allowed
  true               -- show on pricing page
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  price_monthly_kzt = EXCLUDED.price_monthly_kzt,
  currency = EXCLUDED.currency,
  max_members = EXCLUDED.max_members,
  max_event_participants = EXCLUDED.max_event_participants,
  allow_paid_events = EXCLUDED.allow_paid_events,
  allow_csv_export = EXCLUDED.allow_csv_export,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();

-- Add comment
COMMENT ON TABLE public.club_plans IS 'Club subscription plans including FREE (v2.1). FREE plan = personal events without club.';
