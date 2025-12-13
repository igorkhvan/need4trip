-- =====================================================
-- Migration: Add is_default field to event_categories
-- Description: Add boolean field to mark default category
-- Author: AI Assistant
-- Date: 2024-12-13
-- =====================================================

-- Add is_default column
ALTER TABLE public.event_categories 
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- Set "other" category as default
UPDATE public.event_categories 
SET is_default = true 
WHERE code = 'other';

-- Create unique constraint: only one category can be default
CREATE UNIQUE INDEX idx_event_categories_default 
  ON public.event_categories (is_default) 
  WHERE is_default = true;

-- Add comment
COMMENT ON COLUMN public.event_categories.is_default IS 'Indicates if this is the default category for new events';

-- Verify
DO $$
DECLARE
  default_category_code TEXT;
BEGIN
  SELECT code INTO default_category_code
  FROM public.event_categories
  WHERE is_default = true
  LIMIT 1;
  
  IF default_category_code IS NOT NULL THEN
    RAISE NOTICE 'Default category set to: %', default_category_code;
  ELSE
    RAISE WARNING 'No default category found!';
  END IF;
END $$;

