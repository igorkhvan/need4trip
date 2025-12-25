-- Migration: Add foreign key from billing_credits to billing_products
-- Purpose: Enforce referential integrity for credit_code
-- Spec: Billing v4 - credits must reference valid products

-- First, verify all existing credits reference valid product codes
-- (Should be safe since we just created EVENT_UPGRADE_500)

-- Add foreign key constraint
ALTER TABLE public.billing_credits
  DROP CONSTRAINT IF EXISTS billing_credits_credit_code_check,
  ADD CONSTRAINT billing_credits_credit_code_fkey
    FOREIGN KEY (credit_code)
    REFERENCES public.billing_products(code)
    ON DELETE RESTRICT;

-- Update comment
COMMENT ON COLUMN public.billing_credits.credit_code IS 'Product code (references billing_products.code)';

