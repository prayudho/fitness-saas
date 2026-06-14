-- =============================================================================
-- Migration 019: Billing integrity fixes
--
-- L7  : Add updated_at + refunded_at audit columns to invoices
-- H6  : Add pt_credits_applied to track stacked credits for correct refund reversal
-- L5  : Unique partial index — one pending invoice per membership at a time
-- M7  : Fix v_active_members view to use pt_sessions_remaining (not the removed sessions_remaining)
-- =============================================================================

-- H4: add 'cancelled' to invoice_status enum for soft-delete
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'cancelled';

-- ── Audit columns ─────────────────────────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS refunded_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pt_credits_applied INT;

COMMENT ON COLUMN public.invoices.pt_credits_applied IS
  'Number of PT session credits this invoice contributed. Set during payment activation for PT/bundled packages so refunds subtract the correct amount instead of cancelling the whole membership.';

-- Auto-maintain updated_at on every row change
CREATE OR REPLACE FUNCTION public.invoices_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.invoices_set_updated_at();

-- ── Idempotency guard ─────────────────────────────────────────────────────────
-- Prevent two pending invoices for the same membership from being created.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_one_pending_per_membership
  ON public.invoices (membership_id)
  WHERE status = 'pending' AND membership_id IS NOT NULL;

-- ── Fix v_active_members ──────────────────────────────────────────────────────
-- The original view referenced the removed sessions_remaining column.
-- Replace with pt_sessions_remaining and also expose package_category.
CREATE OR REPLACE VIEW public.v_active_members AS
SELECT
  p.id,
  p.full_name,
  p.phone,
  p.gender,
  p.brand_id,
  b.name               AS brand_name,
  b.slug               AS brand_slug,
  m.id                 AS membership_id,
  m.status             AS membership_status,
  m.starts_at,
  m.expires_at,
  m.pt_sessions_remaining,
  m.auto_renew,
  mp.name              AS package_name,
  mp.package_category,
  mp.price             AS package_price,
  mp.currency,
  CASE
    WHEN m.expires_at IS NOT NULL
    THEN GREATEST(0, EXTRACT(DAY FROM (m.expires_at - NOW()))::INTEGER)
    ELSE NULL
  END AS days_until_expiry
FROM profiles p
JOIN brands b ON b.id = p.brand_id
LEFT JOIN memberships m
  ON m.member_id = p.id AND m.status = 'active'
LEFT JOIN membership_packages mp
  ON mp.id = m.package_id
WHERE p.role = 'member'
  AND p.brand_id IS NOT NULL;
