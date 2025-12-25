-- Migration: Create billing_products table
-- Purpose: Store purchasable products (one-off credits, future expansions)
-- Spec: Billing v4 - single source of truth for product pricing and constraints

CREATE TABLE public.billing_products (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit')),
  price_kzt NUMERIC(10,2) NOT NULL CHECK (price_kzt > 0),
  currency_code TEXT NOT NULL DEFAULT 'KZT',
  is_active BOOLEAN NOT NULL DEFAULT true,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_products_is_active ON public.billing_products(is_active);
CREATE INDEX idx_billing_products_type ON public.billing_products(type);

-- Comments
COMMENT ON TABLE public.billing_products IS 'Purchasable products (one-off credits). Single source of truth for pricing.';
COMMENT ON COLUMN public.billing_products.code IS 'Unique product code (e.g., EVENT_UPGRADE_500)';
COMMENT ON COLUMN public.billing_products.type IS 'Product type (currently only credit)';
COMMENT ON COLUMN public.billing_products.price_kzt IS 'Price in KZT (Kazakhstani Tenge)';
COMMENT ON COLUMN public.billing_products.constraints IS 'Product constraints (e.g., {"scope":"personal","max_participants":500})';
COMMENT ON COLUMN public.billing_products.is_active IS 'Whether product is available for purchase';

-- Seed: EVENT_UPGRADE_500 (one-off credit for events up to 500 participants)
INSERT INTO public.billing_products (
  code,
  title,
  type,
  price_kzt,
  currency_code,
  constraints,
  is_active
) VALUES (
  'EVENT_UPGRADE_500',
  'Event Upgrade (до 500 участников)',
  'credit',
  1000.00,
  'KZT',
  '{"scope":"personal","max_participants":500}'::jsonb,
  true
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_billing_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_billing_products_updated_at
BEFORE UPDATE ON public.billing_products
FOR EACH ROW
EXECUTE FUNCTION update_billing_products_updated_at();

-- RLS (align with existing billing patterns)
ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;

-- Public read for active products
CREATE POLICY billing_products_public_read_active
  ON public.billing_products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Service role full access
CREATE POLICY billing_products_service_full_access
  ON public.billing_products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

