-- =============================================================================
-- Migration 017: Add pending_payment membership status + invoice reference_number
--
-- 1. membership_status enum gains 'pending_payment' so newly-assigned packages
--    start inactive until the invoice is confirmed as paid.
-- 2. invoices.reference_number TEXT column for storing bank transfer ref / cash
--    receipt numbers entered by staff at payment confirmation.
-- =============================================================================

ALTER TYPE public.membership_status ADD VALUE IF NOT EXISTS 'pending_payment';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS reference_number TEXT;

COMMENT ON COLUMN public.invoices.reference_number IS
  'Bank transfer reference number or cash receipt ID entered at payment confirmation';
