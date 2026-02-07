-- ============================================================================
-- Migration: Pre-Club Subscription Entitlements
-- Date: 2026-02-07
-- Purpose: ADR-002 — User-level entitlements for club creation before club exists
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE club_subscription_entitlements
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.club_subscription_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.club_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'consumed', 'expired', 'cancelled')),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- An entitlement can be linked to AT MOST ONE club (NULL allowed for unlinked)
  CONSTRAINT entitlements_club_id_unique UNIQUE (club_id)
);

-- Index for hasUnlinkedActiveSubscriptionForUser: user_id + active window
CREATE INDEX idx_entitlements_unlinked_active
  ON public.club_subscription_entitlements(user_id, valid_from, valid_until)
  WHERE status = 'active' AND club_id IS NULL;

-- Index for FOR UPDATE queries (time filter applied at query time, not in predicate)
CREATE INDEX idx_entitlements_user_active_unlinked
  ON public.club_subscription_entitlements(user_id)
  WHERE status = 'active' AND club_id IS NULL;

COMMENT ON TABLE public.club_subscription_entitlements IS
  'Pre-club subscription entitlements. 1 entitlement → 1 club. Consumed exactly once at club creation. ADR-002.';

COMMENT ON COLUMN public.club_subscription_entitlements.status IS
  'active = available for club creation; consumed = bound to club; expired/cancelled = no longer usable';

COMMENT ON COLUMN public.club_subscription_entitlements.club_id IS
  'Set ONLY when consumed at club creation. NULL = unlinked entitlement.';

-- ============================================================================
-- 2. RPC: Atomic club creation with entitlement consumption
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_club_consuming_entitlement(
  p_user_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_telegram_url TEXT DEFAULT NULL,
  p_website_url TEXT DEFAULT NULL,
  p_city_ids UUID[] DEFAULT '{}'
)
RETURNS SETOF public.clubs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entitlement_id UUID;
  v_plan_id TEXT;
  v_valid_from TIMESTAMPTZ;
  v_valid_until TIMESTAMPTZ;
  v_club_id UUID;
  v_slug TEXT;
  v_city_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Claim an unlinked active entitlement (row lock prevents race)
  SELECT id, plan_id, valid_from, valid_until
  INTO v_entitlement_id, v_plan_id, v_valid_from, v_valid_until
  FROM public.club_subscription_entitlements
  WHERE user_id = p_user_id
    AND status = 'active'
    AND valid_from <= v_now
    AND valid_until > v_now
    AND club_id IS NULL
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_entitlement_id IS NULL THEN
    RAISE EXCEPTION 'CLUB_CREATION_REQUIRES_PLAN'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Create slug from name
  v_slug := lower(regexp_replace(trim(p_name), '\s+', '-', 'g'));

  -- 3. Insert club (trigger_add_club_owner will add owner to club_members)
  INSERT INTO public.clubs (
    name, slug, description, logo_url, telegram_url, website_url,
    created_by, owner_user_id, created_at, updated_at
  )
  VALUES (
    trim(p_name), v_slug, NULLIF(trim(p_description), ''),
    NULLIF(trim(p_logo_url), ''), NULLIF(trim(p_telegram_url), ''), NULLIF(trim(p_website_url), ''),
    p_user_id, p_user_id, v_now, v_now
  )
  RETURNING id INTO v_club_id;

  -- 4. Consume entitlement
  UPDATE public.club_subscription_entitlements
  SET
    status = 'consumed',
    consumed_at = v_now,
    club_id = v_club_id,
    updated_at = v_now
  WHERE id = v_entitlement_id;

  -- 5. Create club_subscriptions from entitlement (sync club plan state)
  INSERT INTO public.club_subscriptions (
    club_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at
  )
  VALUES (
    v_club_id, v_plan_id, 'active', v_valid_from, v_valid_until, v_now, v_now
  );

  -- 6. Insert club_cities
  IF array_length(p_city_ids, 1) > 0 THEN
    FOREACH v_city_id IN ARRAY p_city_ids
    LOOP
      INSERT INTO public.club_cities (club_id, city_id, created_at)
      VALUES (v_club_id, v_city_id, v_now);
    END LOOP;
  END IF;

  -- 7. Return created club
  RETURN QUERY
  SELECT * FROM public.clubs WHERE id = v_club_id;
END;
$$;

COMMENT ON FUNCTION public.create_club_consuming_entitlement IS
  'Atomically claims an unlinked entitlement, creates club, consumes entitlement, creates club_subscriptions. ADR-002.';
