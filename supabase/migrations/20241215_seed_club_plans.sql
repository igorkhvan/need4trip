-- ============================================================================
-- Migration: Seed club_plans (v2.0)
-- Date: 2024-12-15
-- Purpose: Insert club subscription plans
-- Source: docs/BILLING_AND_LIMITS.md (section 14)
-- ============================================================================

-- Insert club plans (FREE is NOT stored in DB - it's hardcoded in code)
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
) VALUES
-- Club 50: 5000 KZT/month
(
  'club_50',
  'Club 50',
  5000.00,
  'KZT',
  50,               -- max 50 club members
  50,               -- max 50 participants per event
  true,             -- paid events allowed
  true,             -- CSV export allowed
  true              -- show on pricing page
),
-- Club 500: 15000 KZT/month
(
  'club_500',
  'Club 500',
  15000.00,
  'KZT',
  500,              -- max 500 club members
  500,              -- max 500 participants per event
  true,             -- paid events allowed
  true,             -- CSV export allowed
  true              -- show on pricing page
),
-- Unlimited: 30000 KZT/month
(
  'club_unlimited',
  'Unlimited',
  30000.00,
  'KZT',
  NULL,             -- unlimited members
  NULL,             -- unlimited participants
  true,             -- paid events allowed
  true,             -- CSV export allowed
  true              -- show on pricing page
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
