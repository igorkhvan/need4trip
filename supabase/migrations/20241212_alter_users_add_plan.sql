-- ============================================================================
-- Migration: Alter users table - Add personal subscription plan
-- Date: 2024-12-12
-- Purpose: Add personal subscription plan (free, pro) to users
-- ============================================================================

-- Step 1: Add plan column with default 'free'
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free' 
  CHECK (plan IN ('free', 'pro'));

-- Step 2: Create index for querying pro users (for analytics/features)
CREATE INDEX IF NOT EXISTS idx_users_plan ON public.users(plan) WHERE plan = 'pro';

-- Step 3: Update existing users to 'free' (idempotent, safe if already set)
DO $$
BEGIN
  UPDATE public.users
  SET plan = 'free'
  WHERE plan IS NULL OR plan NOT IN ('free', 'pro');
  
  IF FOUND THEN
    RAISE NOTICE 'Updated % users to plan=free', (SELECT COUNT(*) FROM public.users WHERE plan = 'free');
  END IF;
END $$;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.users.plan IS 'Личный тарифный план: free (макс 1 событие, без платных) или pro (безлимит, все возможности)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Users table successfully altered:';
  RAISE NOTICE '   - Added plan column (free, pro)';
  RAISE NOTICE '   - All existing users set to plan=free';
  RAISE NOTICE '   - Created index for pro users';
END $$;

