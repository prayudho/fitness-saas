-- =============================================================================
-- Migration 016: Add sales_person_id to track who sold a PT package
--
-- Previously the sales commission always went to the assigned trainer.
-- Now any staff member or trainer can be the sales representative.
--
-- Changes:
--   1. pt_assignments: add sales_person_id (who sold the package)
--   2. pt_commission_payouts: add sales_person_id (nullable), make trainer_id
--      nullable so staff (non-trainers) can receive sales commissions
--   3. Backfill: set sales_person_id = trainer_id for existing sales records
-- =============================================================================

-- 1. Track sales person on assignment
ALTER TABLE public.pt_assignments
  ADD COLUMN IF NOT EXISTS sales_person_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.pt_assignments.sales_person_id IS
  'The staff member or trainer who sold this PT package. If NULL, defaults to the assigned trainer.';

-- 2a. Make trainer_id nullable so staff can receive sales commissions
ALTER TABLE public.pt_commission_payouts
  ALTER COLUMN trainer_id DROP NOT NULL;

-- 2b. Add sales_person_id to pt_commission_payouts
ALTER TABLE public.pt_commission_payouts
  ADD COLUMN IF NOT EXISTS sales_person_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.pt_commission_payouts.sales_person_id IS
  'Profile ID of the person who receives the sales commission (trainer or staff).';

-- 3. Backfill: for existing sales-type payouts, the sales person = the trainer
UPDATE public.pt_commission_payouts
SET    sales_person_id = trainer_id
WHERE  payout_type = 'sales'
  AND  sales_person_id IS NULL
  AND  trainer_id IS NOT NULL;

-- 4. Integrity check: at least one of trainer_id / sales_person_id must be set
ALTER TABLE public.pt_commission_payouts
  DROP CONSTRAINT IF EXISTS check_commission_recipient;

ALTER TABLE public.pt_commission_payouts
  ADD CONSTRAINT check_commission_recipient
  CHECK (trainer_id IS NOT NULL OR sales_person_id IS NOT NULL);
