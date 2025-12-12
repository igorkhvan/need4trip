-- ============================================================================
-- Migration: Create club_subscriptions table
-- Date: 2024-12-12
-- Purpose: Club subscription plans (club_free, club_basic, club_pro)
-- ============================================================================

-- Create club_subscriptions table
CREATE TABLE IF NOT EXISTS public.club_subscriptions (
  club_id UUID PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('club_free', 'club_basic', 'club_pro')),
  valid_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying active subscriptions
CREATE INDEX IF NOT EXISTS idx_club_subscriptions_active 
  ON public.club_subscriptions(active, valid_until) 
  WHERE active = TRUE;

-- Index for expiring subscriptions (for background jobs)
CREATE INDEX IF NOT EXISTS idx_club_subscriptions_expiring 
  ON public.club_subscriptions(valid_until) 
  WHERE active = TRUE AND valid_until IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE public.club_subscriptions IS 'Подписки клубов с тарифными планами';
COMMENT ON COLUMN public.club_subscriptions.plan IS 'Тарифный план: club_free (макс 1 событие), club_basic (макс 3), club_pro (безлимит)';
COMMENT ON COLUMN public.club_subscriptions.valid_until IS 'Дата окончания подписки (NULL = бессрочно для club_free)';
COMMENT ON COLUMN public.club_subscriptions.active IS 'Активна ли подписка (false если истекла или отменена)';

-- Function to auto-deactivate expired subscriptions
CREATE OR REPLACE FUNCTION public.deactivate_expired_club_subscriptions()
RETURNS VOID AS $$
BEGIN
  UPDATE public.club_subscriptions
  SET active = FALSE, updated_at = NOW()
  WHERE active = TRUE 
    AND valid_until IS NOT NULL 
    AND valid_until < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.deactivate_expired_club_subscriptions IS 'Автоматически деактивирует истекшие подписки клубов (вызывается cron job или вручную)';

-- TODO: Need4Trip: Set up cron job to run this function daily:
-- SELECT cron.schedule('deactivate-expired-club-subs', '0 2 * * *', 'SELECT public.deactivate_expired_club_subscriptions()');

