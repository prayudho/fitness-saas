-- Step 1: Add PT sessions count to membership packages
ALTER TABLE membership_packages
  ADD COLUMN IF NOT EXISTS pt_sessions_included INTEGER NOT NULL DEFAULT 0
    CHECK (pt_sessions_included >= 0);

-- Step 2: Track remaining PT sessions per active membership
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS pt_sessions_remaining INTEGER
    CHECK (pt_sessions_remaining >= 0);

-- Step 3: Link trainer sessions to a membership (for package-based PT deduction)
ALTER TABLE trainer_sessions
  ADD COLUMN IF NOT EXISTS membership_id UUID
    REFERENCES memberships(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tsessions_membership
  ON trainer_sessions (membership_id) WHERE membership_id IS NOT NULL;

-- Step 4: Trigger — initialise pt_sessions_remaining when a membership is created
CREATE OR REPLACE FUNCTION public.init_pt_sessions_remaining()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_pt_sessions INTEGER;
BEGIN
  SELECT pt_sessions_included INTO v_pt_sessions
  FROM public.membership_packages
  WHERE id = NEW.package_id;

  NEW.pt_sessions_remaining := CASE WHEN v_pt_sessions > 0 THEN v_pt_sessions ELSE NULL END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_init_pt_sessions_remaining
  BEFORE INSERT ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.init_pt_sessions_remaining();

-- Step 5: Trigger — deduct/restore PT credit when trainer_session status changes
CREATE OR REPLACE FUNCTION public.sync_pt_session_credit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Deduct 1 credit when session is completed
  IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.membership_id IS NOT NULL THEN
    UPDATE public.memberships
    SET pt_sessions_remaining = GREATEST(0, COALESCE(pt_sessions_remaining, 0) - 1)
    WHERE id = NEW.membership_id;
  END IF;

  -- Restore 1 credit when a completed session is cancelled/rescheduled
  IF OLD.status = 'completed' AND NEW.status <> 'completed' AND NEW.membership_id IS NOT NULL THEN
    UPDATE public.memberships
    SET pt_sessions_remaining = COALESCE(pt_sessions_remaining, 0) + 1
    WHERE id = NEW.membership_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_pt_session_credit
  AFTER UPDATE ON public.trainer_sessions
  FOR EACH ROW EXECUTE FUNCTION public.sync_pt_session_credit();
