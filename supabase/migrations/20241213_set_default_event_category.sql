-- =====================================================
-- Migration: Set default category for events
-- Description: Set "other" category as default for category_id
-- Author: AI Assistant
-- Date: 2024-12-13
-- =====================================================

-- Set default value to "other" category for category_id column
DO $$
DECLARE
  other_category_id UUID;
BEGIN
  -- Get the ID of "other" category
  SELECT id INTO other_category_id 
  FROM public.event_categories 
  WHERE code = 'other' 
  LIMIT 1;
  
  -- Set default if category exists
  IF other_category_id IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.events ALTER COLUMN category_id SET DEFAULT %L', other_category_id);
    RAISE NOTICE 'Default category_id set to: %', other_category_id;
  ELSE
    RAISE WARNING 'Category with code "other" not found. Default not set.';
  END IF;
END $$;

-- Verify the default was set
DO $$
DECLARE
  default_value TEXT;
BEGIN
  SELECT column_default INTO default_value
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'category_id';
  
  RAISE NOTICE 'Current default for category_id: %', COALESCE(default_value, 'NULL');
END $$;

