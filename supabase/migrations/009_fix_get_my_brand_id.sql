-- =============================================================================
-- Migration 009: Fix get_my_brand_id() to read x-brand-id UUID header
--
-- Before (migration 008): read x-tenant-subdomain slug, then look up UUID.
-- Problem: browser Supabase client never forwarded this header, so
--   get_my_brand_id() returned NULL for all client-side queries, breaking
--   every RLS policy that used it.
--
-- Fix: read x-brand-id (the UUID itself) which is now forwarded by both
--   the server client (from middleware headers) and the browser client
--   (from the __fp_brand_id cookie).  No extra brands table lookup needed.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_brand_id()
RETURNS UUID
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT (
    NULLIF(
      TRIM(COALESCE(current_setting('request.headers', true)::json->>'x-brand-id', '')),
      ''
    )
  )::UUID
$$;
