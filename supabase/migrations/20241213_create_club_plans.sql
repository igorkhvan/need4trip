-- Create club_plans reference table
-- This table defines available club subscription plans and their limits

CREATE TABLE IF NOT EXISTS public.club_plans (
  id TEXT PRIMARY KEY,  -- 'club_free', 'club_basic', 'club_pro'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Event limits
  max_active_events INT,  -- NULL = unlimited
  
  -- Member limits
  max_organizers INT NOT NULL DEFAULT 1,
  
  -- Feature flags
  allow_paid_events BOOLEAN NOT NULL DEFAULT false,
  allow_csv_export BOOLEAN NOT NULL DEFAULT false,
  allow_telegram_bot_pro BOOLEAN NOT NULL DEFAULT false,
  allow_analytics_basic BOOLEAN NOT NULL DEFAULT false,
  allow_analytics_advanced BOOLEAN NOT NULL DEFAULT false,
  allow_white_label BOOLEAN NOT NULL DEFAULT false,
  allow_subdomain BOOLEAN NOT NULL DEFAULT false,
  allow_api_access BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.club_plans IS 'Reference table for club subscription plans and their limits';
COMMENT ON COLUMN public.club_plans.max_active_events IS 'Maximum number of active (future) events. NULL means unlimited';
COMMENT ON COLUMN public.club_plans.max_organizers IS 'Maximum number of organizers (excluding owner)';

-- Seed initial plans
INSERT INTO public.club_plans (
  id, 
  name, 
  description,
  price_monthly, 
  max_active_events, 
  max_organizers,
  allow_paid_events,
  allow_csv_export,
  allow_telegram_bot_pro,
  allow_analytics_basic,
  allow_analytics_advanced,
  allow_white_label,
  allow_subdomain,
  allow_api_access
) VALUES 
(
  'club_free',
  'Free',
  'Базовый план для начинающих клубов',
  0,
  1,  -- 1 событие
  1,  -- 1 организатор
  false, false, false, false, false, false, false, false
),
(
  'club_basic',
  'Basic',
  'Для растущих клубов с регулярными событиями',
  990,
  3,  -- 3 события
  3,  -- 3 организатора
  true,  -- платные события
  true,  -- CSV export
  false, 
  true,  -- базовая аналитика
  false, false, false, false
),
(
  'club_pro',
  'Pro',
  'Полный функционал для профессиональных клубов',
  4990,
  NULL,  -- unlimited events
  10,    -- 10 организаторов
  true, true, true, true, true, true, true, true  -- все фичи
)
ON CONFLICT (id) DO NOTHING;

-- Add FK constraint to club_subscriptions (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_club_subscriptions_plan'
  ) THEN
    ALTER TABLE public.club_subscriptions
    ADD CONSTRAINT fk_club_subscriptions_plan
    FOREIGN KEY (plan) REFERENCES public.club_plans(id);
  END IF;
END $$;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_club_plans_price ON public.club_plans(price_monthly);

-- Add trigger for updated_at
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

