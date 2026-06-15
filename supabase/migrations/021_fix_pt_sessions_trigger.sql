-- 021_fix_pt_sessions_trigger.sql
--
-- The trigger created in 004 reads from pt_sessions_included (legacy column).
-- Migration 006 introduced pt_session_credits as the canonical column but did
-- not update the trigger. The trigger therefore overwrites pt_sessions_remaining
-- with NULL on every new membership insert (pt_sessions_included defaults to 0).
--
-- Fix: update the function to prefer pt_session_credits, fall back to
-- pt_sessions_included for pre-006 packages. Then backfill any rows that were
-- created with the broken trigger.

CREATE OR REPLACE FUNCTION public.init_pt_sessions_remaining()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_pt_sessions INTEGER;
BEGIN
  -- Prefer pt_session_credits (migration 006+); fall back to pt_sessions_included (legacy)
  SELECT COALESCE(pt_session_credits, NULLIF(pt_sessions_included, 0))
    INTO v_pt_sessions
  FROM public.membership_packages
  WHERE id = NEW.package_id;

  NEW.pt_sessions_remaining := CASE WHEN v_pt_sessions > 0 THEN v_pt_sessions ELSE NULL END;
  RETURN NEW;
END;
$$;

-- Backfill active and pending memberships that landed with NULL pt_sessions_remaining
-- because they were inserted while the trigger was broken.
UPDATE public.memberships m
SET    pt_sessions_remaining = mp.pt_session_credits
FROM   public.membership_packages mp
WHERE  m.package_id             = mp.id
  AND  m.pt_sessions_remaining  IS NULL
  AND  mp.pt_session_credits    IS NOT NULL
  AND  mp.pt_session_credits    > 0
  AND  m.package_category       IN ('pt_sessions', 'bundled')
  AND  m.status                 IN ('active', 'pending_payment');
