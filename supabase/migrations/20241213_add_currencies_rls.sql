-- ============================================================================
-- Migration: Add RLS policy for currencies table
-- Date: 2024-12-13
-- Purpose: Enable public read access to currencies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users" 
ON public.currencies 
FOR SELECT 
USING (true);

-- Verify policy
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policy created for currencies table';
  RAISE NOTICE '   Policy: Enable read access for all users (SELECT)';
END $$;

