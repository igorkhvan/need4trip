-- ============================================================================
-- Migration: Create feedback table
-- Date: 2026-02-09
-- Purpose: User feedback system (ideas, bugs, general feedback)
-- SSOT Reference: SSOT_DATABASE.md — Feedback Tables section
-- ============================================================================

-- 1. Create feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('idea', 'bug', 'feedback')),
  message TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id),
  page_path TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance indexes
CREATE INDEX idx_feedback_created_at ON public.feedback (created_at DESC);
CREATE INDEX idx_feedback_type ON public.feedback (type);

-- 3. RLS: service role only (no direct user access — all via API)
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 4. Comment for documentation
COMMENT ON TABLE public.feedback IS 'User feedback: ideas, bug reports, general feedback. Write via API only.';
COMMENT ON COLUMN public.feedback.type IS 'Feedback type: idea | bug | feedback';
COMMENT ON COLUMN public.feedback.message IS 'Feedback message (20-2000 chars, validated server-side)';
COMMENT ON COLUMN public.feedback.page_path IS 'Page path where feedback was submitted (optional)';
COMMENT ON COLUMN public.feedback.user_agent IS 'Browser user-agent string (captured server-side)';
