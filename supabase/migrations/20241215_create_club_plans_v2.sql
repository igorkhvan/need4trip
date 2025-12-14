-- ============================================================================
-- Migration: Create club_plans table (v2.0)
-- Date: 2024-12-15
-- Purpose: Club subscription plans with billing v2.0 spec
-- Source: docs/BILLING_AND_LIMITS.md
-- ============================================================================

-- Create club_plans table
CREATE TABLE IF NOT EXISTS public.club_plans (
  id TEXT PRIMARY KEY,                          -- club_50 | club_500 | unlimited
  title TEXT NOT NULL,
  
  price_monthly_kzt NUMERIC(10,2) NOT NULL,     -- Price in Kazakhstani Tenge
  currency TEXT NOT NULL DEFAULT 'KZT',
  
  max_members INT NULL,                         -- NULL = unlimited
  max_event_participants INT NULL,              -- NULL = unlimited
  
  allow_paid_events BOOLEAN NOT NULL,
  allow_csv_export BOOLEAN NOT NULL,
  
  is_public BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments for documentation
COMMENT ON TABLE public.club_plans IS 'Club subscription plans with pricing and limits (v2.0)';
COMMENT ON COLUMN public.club_plans.id IS 'Plan ID: club_50, club_500, unlimited';
COMMENT ON COLUMN public.club_plans.price_monthly_kzt IS 'Monthly price in Kazakhstani Tenge';
COMMENT ON COLUMN public.club_plans.max_members IS 'Max club members. NULL = unlimited';
COMMENT ON COLUMN public.club_plans.max_event_participants IS 'Max participants per event. NULL = unlimited';
COMMENT ON COLUMN public.club_plans.allow_paid_events IS 'Can create paid events';
COMMENT ON COLUMN public.club_plans.allow_csv_export IS 'Can export participants to CSV';
COMMENT ON COLUMN public.club_plans.is_public IS 'Show on /pricing page';

-- Index for public plans query
CREATE INDEX IF NOT EXISTS idx_club_plans_public ON public.club_plans(is_public, price_monthly_kzt);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_club_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_club_plans_updated_at
BEFORE UPDATE ON public.club_plans
FOR EACH ROW
EXECUTE FUNCTION update_club_plans_updated_at();
