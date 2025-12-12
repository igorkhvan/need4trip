-- ============================================================================
-- Migration: Create clubs table
-- Date: 2024-12-12
-- Purpose: Club system foundation - create clubs table with basic info
-- ============================================================================

-- Create clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  description TEXT,
  city TEXT CHECK (city IS NULL OR char_length(city) <= 100),
  logo_url TEXT CHECK (logo_url IS NULL OR char_length(logo_url) <= 500),
  telegram_url TEXT CHECK (telegram_url IS NULL OR char_length(telegram_url) <= 500),
  website_url TEXT CHECK (website_url IS NULL OR char_length(website_url) <= 500),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clubs_created_by ON public.clubs(created_by);
CREATE INDEX IF NOT EXISTS idx_clubs_city ON public.clubs(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clubs_created_at ON public.clubs(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE public.clubs IS 'Клубы и сообщества организаторов мероприятий';
COMMENT ON COLUMN public.clubs.name IS 'Название клуба (2-100 символов)';
COMMENT ON COLUMN public.clubs.description IS 'Описание клуба, markdown поддерживается';
COMMENT ON COLUMN public.clubs.city IS 'Город/регион базирования клуба';
COMMENT ON COLUMN public.clubs.logo_url IS 'URL логотипа клуба (Supabase Storage или внешний)';
COMMENT ON COLUMN public.clubs.telegram_url IS 'Ссылка на Telegram канал/группу клуба';
COMMENT ON COLUMN public.clubs.website_url IS 'Веб-сайт клуба';
COMMENT ON COLUMN public.clubs.created_by IS 'User ID основателя клуба';

