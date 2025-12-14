-- Migration: Add bio field to users table
-- Description: Add 'bio' column for user profile description

-- Add bio column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comment
COMMENT ON COLUMN public.users.bio IS 'О себе (произвольный текст для профиля)';

-- No RLS changes needed (users table already has RLS configured)
