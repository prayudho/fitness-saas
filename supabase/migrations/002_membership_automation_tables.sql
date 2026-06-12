-- ============================================================
-- FitnessPlace SaaS — Membership Automation Support Tables
-- Migration: 002_membership_automation_tables.sql
--
-- Adds two tables consumed by the Edge Function cron jobs:
--   membership_notifications — deduplication log for expiry emails
--   renewal_log              — audit trail for auto-renewal events
-- ============================================================

-- ============================================================
-- membership_notifications
-- Records which expiry-warning emails have already been sent so
-- the daily cron job does not send duplicate notifications.
-- ============================================================

CREATE TABLE membership_notifications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id  UUID        NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  days_before    SMALLINT    NOT NULL CHECK (days_before IN (1, 3, 7)),
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT membership_notifications_unique
    UNIQUE (membership_id, days_before)
);

COMMENT ON TABLE  membership_notifications IS 'Deduplication log for membership expiry reminder emails.';
COMMENT ON COLUMN membership_notifications.days_before IS 'How many days before expiry the email was sent (1, 3, or 7).';

CREATE INDEX idx_mnotifications_membership ON membership_notifications (membership_id);
CREATE INDEX idx_mnotifications_sent_at    ON membership_notifications (sent_at DESC);

-- ============================================================
-- renewal_log
-- Audit trail written each time the auto-renew cron job extends
-- a membership. Useful for support investigations and reporting.
-- ============================================================

CREATE TABLE renewal_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id    UUID        NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  invoice_id       UUID        REFERENCES invoices(id) ON DELETE SET NULL,
  renewed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_expiry  TIMESTAMPTZ NOT NULL,
  new_expiry_date  TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE  renewal_log IS 'Audit trail for automatic membership renewals performed by the auto-renew cron job.';
COMMENT ON COLUMN renewal_log.previous_expiry IS 'The expires_at value before the renewal was applied.';
COMMENT ON COLUMN renewal_log.new_expiry_date IS 'The new expires_at value set during this renewal.';

CREATE INDEX idx_renewal_log_membership ON renewal_log (membership_id);
CREATE INDEX idx_renewal_log_invoice    ON renewal_log (invoice_id);
CREATE INDEX idx_renewal_log_renewed_at ON renewal_log (renewed_at DESC);

-- ============================================================
-- RLS — both tables are written exclusively by the service-role
-- Edge Functions. Admins and the member themselves can read.
-- ============================================================

ALTER TABLE membership_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_log              ENABLE ROW LEVEL SECURITY;

-- membership_notifications — admins/staff of the same brand can view;
-- members can see their own via the linked membership.
CREATE POLICY "mnotifications_select" ON membership_notifications FOR SELECT USING (
  public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.id = membership_notifications.membership_id
    AND (
      (m.brand_id = public.get_my_brand_id() AND public.get_my_role() IN ('admin', 'staff'))
      OR m.member_id = auth.uid()
    )
  )
);

-- Service role (used by Edge Functions) bypasses RLS entirely; no
-- additional INSERT policy needed for service role operations.

-- renewal_log — admins/staff of the same brand can view;
-- members can see their own renewal history.
CREATE POLICY "renewal_log_select" ON renewal_log FOR SELECT USING (
  public.is_superadmin()
  OR EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.id = renewal_log.membership_id
    AND (
      (m.brand_id = public.get_my_brand_id() AND public.get_my_role() IN ('admin', 'staff'))
      OR m.member_id = auth.uid()
    )
  )
);

-- ============================================================
-- GRANT — extend existing authenticated grants to new tables
-- ============================================================

GRANT ALL ON TABLE membership_notifications TO authenticated;
GRANT ALL ON TABLE renewal_log              TO authenticated;
