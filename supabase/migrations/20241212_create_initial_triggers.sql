-- ============================================================================
-- Migration: Create utility triggers and functions
-- Date: 2024-12-12
-- Purpose: Auto-update timestamps, maintain data integrity
-- ============================================================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_updated_at_column IS 'Автоматически обновляет updated_at при UPDATE записи';

-- Trigger for clubs table
DROP TRIGGER IF EXISTS trigger_clubs_updated_at ON public.clubs;
CREATE TRIGGER trigger_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for club_subscriptions table
DROP TRIGGER IF EXISTS trigger_club_subscriptions_updated_at ON public.club_subscriptions;
CREATE TRIGGER trigger_club_subscriptions_updated_at
  BEFORE UPDATE ON public.club_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create club_subscription when club is created
CREATE OR REPLACE FUNCTION public.create_default_club_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create club_free subscription for new clubs
  INSERT INTO public.club_subscriptions (club_id, plan, valid_until, active)
  VALUES (NEW.id, 'club_free', NULL, TRUE)
  ON CONFLICT (club_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.create_default_club_subscription IS 'Автоматически создает club_free подписку для новых клубов';

-- Trigger for auto-creating subscription
DROP TRIGGER IF EXISTS trigger_create_club_subscription ON public.clubs;
CREATE TRIGGER trigger_create_club_subscription
  AFTER INSERT ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_club_subscription();

-- Function to auto-add creator as owner when club is created
CREATE OR REPLACE FUNCTION public.add_creator_as_club_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add if created_by is not null
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.club_members (club_id, user_id, role, invited_by, joined_at)
    VALUES (NEW.id, NEW.created_by, 'owner', NULL, NOW())
    ON CONFLICT (club_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.add_creator_as_club_owner IS 'Автоматически добавляет создателя клуба как owner в club_members';

-- Trigger for auto-adding owner
DROP TRIGGER IF EXISTS trigger_add_club_owner ON public.clubs;
CREATE TRIGGER trigger_add_club_owner
  AFTER INSERT ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_club_owner();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Triggers and functions created:';
  RAISE NOTICE '   - update_updated_at_column (для clubs и club_subscriptions)';
  RAISE NOTICE '   - create_default_club_subscription (club_free для новых клубов)';
  RAISE NOTICE '   - add_creator_as_club_owner (автодобавление owner в club_members)';
END $$;

