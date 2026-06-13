-- =============================================================================
-- Migration 010: Hybrid get_my_brand_id()
--
-- Problem (introduced by migration 009):
--   get_my_brand_id() only reads from the x-brand-id HTTP header.
--   But middleware needs to look up the brand BEFORE that header exists,
--   creating a circular dependency:
--     brands_select RLS → get_my_brand_id() → x-brand-id header
--     → requires knowing the brand first
--
-- Fix: try x-brand-id header first (fast path, used by server/browser clients),
--   then fall back to the profile-based lookup (original migration-001 behavior).
--   The middleware brand lookup is separately fixed to use the service role key
--   so it bypasses RLS entirely.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_brand_id()
RETURNS UUID
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(
    -- 1. Prefer explicit x-brand-id header (set by server/browser Supabase clients)
    NULLIF(
      TRIM(COALESCE(current_setting('request.headers', true)::json->>'x-brand-id', '')),
      ''
    )::UUID,
    -- 2. Fall back to the authenticated user's profile brand_id.
    --    Ensures RLS policies work even when the header is absent.
    --    For multi-brand users the header always takes precedence (path 1).
    (
      SELECT brand_id
      FROM   public.profiles
      WHERE  id        = (SELECT auth.uid())
        AND  brand_id IS NOT NULL
      LIMIT  1
    )
  )
$$;
