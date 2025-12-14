-- Create club_plans reference table
-- This table defines available club subscription plans and their limits

CREATE TABLE IF NOT EXISTS public.club_plans (
  id TEXT PRIMARY KEY,  -- 'club_free', 'club_50', 'club_500', 'club_unlimited'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Event limits
  max_active_events INT,  -- NULL = unlimited
  
  -- Participant limits per event
  max_participants_per_event INT,  -- NULL = unlimited
  
  -- Member limits (club organizers/admins)
  max_organizers INT NOT NULL DEFAULT 1,
  
  -- Feature flags
  allow_paid_events BOOLEAN NOT NULL DEFAULT false,
  allow_email_notifications BOOLEAN NOT NULL DEFAULT false,
  allow_statistics BOOLEAN NOT NULL DEFAULT false,
  allow_csv_export BOOLEAN NOT NULL DEFAULT false,
  allow_analytics_advanced BOOLEAN NOT NULL DEFAULT false,
  allow_api_access BOOLEAN NOT NULL DEFAULT false,
  allow_white_label BOOLEAN NOT NULL DEFAULT false,
  allow_personal_manager BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.club_plans IS 'Reference table for club subscription plans and their limits';
COMMENT ON COLUMN public.club_plans.max_active_events IS 'Maximum number of active (future) events. NULL means unlimited';
COMMENT ON COLUMN public.club_plans.max_participants_per_event IS 'Maximum participants per single event. NULL means unlimited';
COMMENT ON COLUMN public.club_plans.max_organizers IS 'Maximum number of organizers (excluding owner)';

-- Seed initial plans (based on docs/BILLING_AND_LIMITS.md - source of truth)
INSERT INTO public.club_plans (
  id, 
  name, 
  description,
  price_monthly, 
  max_active_events,
  max_participants_per_event,
  max_organizers,
  allow_paid_events,
  allow_email_notifications,
  allow_statistics,
  allow_csv_export,
  allow_analytics_advanced,
  allow_api_access,
  allow_white_label,
  allow_personal_manager
) VALUES 
(
  'club_free',
  'Free',
  'Индивидуальное использование / тест / маленькие выезды',
  0,
  NULL,  -- нет лимита на количество событий для Free
  15,    -- max 15 участников на событие
  1,     -- 1 организатор (владелец)
  false, false, false, false, false, false, false, false
),
(
  'club_50',
  'Club 50',
  'Для растущих клубов с регулярными событиями',
  990,
  NULL,  -- нет лимита на количество событий
  50,    -- max 50 участников на событие
  50,    -- max 50 членов клуба
  true,  -- платные события
  true,  -- email рассылки
  true,  -- статистика
  true,  -- CSV export
  false, false, false, false
),
(
  'club_500',
  'Club 500',
  'Для активных клубов с большим комьюнити',
  2990,
  NULL,  -- нет лимита на количество событий
  500,   -- max 500 участников на событие
  500,   -- max 500 членов клуба
  true, true, true, true,
  true,  -- расширенная аналитика
  true,  -- API доступ
  false, false
),
(
  'club_unlimited',
  'Unlimited',
  'Без ограничений для профессиональных организаций',
  0,     -- индивидуально (управляется вне системы)
  NULL,  -- без ограничений на события
  NULL,  -- без ограничений на участников
  NULL,  -- без ограничений на членов клуба
  true, true, true, true, true, true,
  true,  -- white-label
  true   -- персональный менеджер
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

