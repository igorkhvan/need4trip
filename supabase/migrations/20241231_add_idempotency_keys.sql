-- Migration: Add idempotency keys tracking
-- Purpose: Prevent duplicate requests (e.g., double-click event creation)
-- SSOT Reference: docs/ssot/SSOT_ARCHITECTURE.md § Idempotency Standard
-- Date: 2024-12-31

-- ============================================================================
-- Table: idempotency_keys
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope: user + route + key (unique per attempt)
  user_id UUID NOT NULL,
  route TEXT NOT NULL,  -- e.g., "POST /api/events"
  key TEXT NOT NULL,    -- Client-provided idempotency key (UUID)
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  
  -- Stored response (for replay on duplicate requests)
  response_status INT,       -- HTTP status code (e.g., 201, 400)
  response_body JSONB,       -- Full response body
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Unique constraint: one key per (user, route, key) triplet
  CONSTRAINT unique_idempotency_key UNIQUE (user_id, route, key)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index for lookup by (user_id, route, key)
CREATE INDEX idx_idempotency_keys_lookup 
  ON public.idempotency_keys(user_id, route, key);

-- Index for cleanup of old keys (TTL enforcement)
CREATE INDEX idx_idempotency_keys_created_at 
  ON public.idempotency_keys(created_at);

-- Index for status queries
CREATE INDEX idx_idempotency_keys_status 
  ON public.idempotency_keys(status);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.idempotency_keys IS 
  'Idempotency tracking for side-effect operations. Prevents duplicate actions from retries/double-clicks.';

COMMENT ON COLUMN public.idempotency_keys.user_id IS 
  'User who initiated the request';

COMMENT ON COLUMN public.idempotency_keys.route IS 
  'HTTP method + path (e.g., "POST /api/events")';

COMMENT ON COLUMN public.idempotency_keys.key IS 
  'Client-provided UUID for this specific attempt (Idempotency-Key header)';

COMMENT ON COLUMN public.idempotency_keys.status IS 
  'Current status: in_progress (executing), completed (success), failed (error)';

COMMENT ON COLUMN public.idempotency_keys.response_body IS 
  'Stored response for replay on duplicate requests (only for completed status)';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own idempotency keys
CREATE POLICY idempotency_keys_user_isolation
  ON public.idempotency_keys
  FOR ALL
  USING (auth.uid() = user_id);

-- Service role bypass (for backend operations)
CREATE POLICY idempotency_keys_service_all
  ON public.idempotency_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Maintenance Function (Optional — for TTL cleanup)
-- ============================================================================

-- Function to delete old idempotency keys (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_idempotency_keys() IS 
  'Delete idempotency keys older than 7 days (call from cron or manually)';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'idempotency_keys'
  ) THEN
    RAISE EXCEPTION 'Table idempotency_keys was not created';
  END IF;
  
  RAISE NOTICE 'Idempotency keys table created successfully';
END $$;

