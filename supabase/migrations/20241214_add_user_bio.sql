-- =====================================================
-- Migration: Add bio field to users table
-- Created: 2024-12-14
-- Description: Добавляет поле "О себе" в таблицу users
-- =====================================================

-- 1. Add bio column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Add comment
COMMENT ON COLUMN public.users.bio IS 'О себе (произвольный текст)';

-- 3. Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'bio'
  ) THEN
    RAISE NOTICE '✅ Added bio column to users table';
  ELSE
    RAISE EXCEPTION '❌ Failed to add bio column';
  END IF;
END $$;

