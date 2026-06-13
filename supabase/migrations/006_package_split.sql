-- ============================================================
-- FitnessPlace SaaS — Package Category Split
-- Migration: 006_package_split.sql
--
-- Extends membership_packages and memberships to support
-- independent Gym Access / PT Sessions / Bundled categories
-- with separate expiry dates and credit tracking.
-- ============================================================

-- ============================================================
-- SECTION 1A — membership_packages: new columns
-- ============================================================

ALTER TABLE membership_packages
  ADD COLUMN IF NOT EXISTS package_category TEXT NOT NULL DEFAULT 'gym_access'
    CHECK (package_category IN ('gym_access', 'pt_sessions', 'bundled'));

ALTER TABLE membership_packages
  ADD COLUMN IF NOT EXISTS gym_access_days INTEGER
    CHECK (gym_access_days IS NULL OR gym_access_days > 0);

ALTER TABLE membership_packages
  ADD COLUMN IF NOT EXISTS pt_session_credits INTEGER
    CHECK (pt_session_credits IS NULL OR pt_session_credits > 0);

ALTER TABLE membership_packages
  ADD COLUMN IF NOT EXISTS pt_session_expiry_days INTEGER
    CHECK (pt_session_expiry_days IS NULL OR pt_session_expiry_days > 0);

-- Backfill gym_access_days from duration_days for all existing packages
UPDATE membership_packages
  SET gym_access_days = duration_days
  WHERE duration_days IS NOT NULL AND gym_access_days IS NULL;

-- Packages that are session-only (no duration_days) become pt_sessions
UPDATE membership_packages
  SET package_category      = 'pt_sessions',
      pt_session_credits    = COALESCE(session_credits, NULLIF(pt_sessions_included, 0), 10),
      pt_session_expiry_days = 365
  WHERE duration_days IS NULL
    AND (session_credits IS NOT NULL OR pt_sessions_included > 0)
    AND package_category = 'gym_access';

-- Packages with both gym access AND PT sessions become bundled
UPDATE membership_packages
  SET package_category       = 'bundled',
      pt_session_credits     = COALESCE(NULLIF(pt_sessions_included, 0), session_credits),
      pt_session_expiry_days = GREATEST(duration_days, 30)
  WHERE duration_days IS NOT NULL
    AND pt_sessions_included > 0
    AND package_category = 'gym_access';

-- Composite CHECK constraint (added after backfills to avoid violations)
ALTER TABLE membership_packages
  ADD CONSTRAINT chk_package_category_fields CHECK (
    CASE package_category
      WHEN 'gym_access'  THEN gym_access_days IS NOT NULL
      WHEN 'pt_sessions' THEN pt_session_credits IS NOT NULL
                              AND pt_session_expiry_days IS NOT NULL
      WHEN 'bundled'     THEN gym_access_days IS NOT NULL
                              AND pt_session_credits IS NOT NULL
                              AND pt_session_expiry_days IS NOT NULL
      ELSE true
    END
  );

-- ============================================================
-- SECTION 1B — memberships: new columns
-- ============================================================

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS package_category TEXT;

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS gym_access_expires_at TIMESTAMPTZ;

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS pt_sessions_expires_at TIMESTAMPTZ;

-- pt_sessions_remaining was added in migration 004; use IF NOT EXISTS for safety
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS pt_sessions_remaining INTEGER
    CHECK (pt_sessions_remaining >= 0);

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS gym_access_status TEXT NOT NULL DEFAULT 'active'
    CHECK (gym_access_status IN ('active', 'expired', 'frozen', 'cancelled'));

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS pt_sessions_status TEXT NOT NULL DEFAULT 'active'
    CHECK (pt_sessions_status IN ('active', 'expired', 'exhausted', 'cancelled'));

-- Backfill existing memberships: treat all as gym_access, copy expires_at
UPDATE memberships
  SET gym_access_expires_at = expires_at,
      package_category       = 'gym_access'
  WHERE package_category IS NULL;

-- Index for expiry lookups
CREATE INDEX IF NOT EXISTS idx_memberships_gym_expires
  ON memberships (brand_id, gym_access_expires_at)
  WHERE gym_access_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_pt_expires
  ON memberships (brand_id, pt_sessions_expires_at)
  WHERE pt_sessions_expires_at IS NOT NULL;

-- ============================================================
-- SECTION 1C — brands: per-brand reminder schedule
-- ============================================================

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS expiry_reminder_days INTEGER[] NOT NULL DEFAULT '{7,3}';

-- ============================================================
-- SECTION 1D — checkins: staff override tracking
-- ============================================================

ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS staff_override BOOLEAN;

ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS warning_message TEXT;

-- ============================================================
-- SECTION 1E — membership_reminders_sent (new dedup table)
-- Replaces the simpler membership_notifications from migration 002
-- with a typed (gym_expiry / pt_expiry / pt_low_sessions) model.
-- ============================================================

CREATE TABLE IF NOT EXISTS membership_reminders_sent (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id  UUID        NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  reminder_type  TEXT        NOT NULL
    CHECK (reminder_type IN ('gym_expiry', 'pt_expiry', 'pt_low_sessions')),
  reminder_day   INTEGER,
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT membership_reminders_unique
    UNIQUE (membership_id, reminder_type, reminder_day)
);

CREATE INDEX IF NOT EXISTS idx_reminders_membership
  ON membership_reminders_sent (membership_id);

ALTER TABLE membership_reminders_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders_sent_select" ON membership_reminders_sent FOR SELECT USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.id = membership_reminders_sent.membership_id
      AND m.brand_id = get_my_brand_id()
      AND get_my_role() = 'admin'
  )
);

CREATE POLICY "reminders_sent_write" ON membership_reminders_sent FOR ALL USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.id = membership_reminders_sent.membership_id
      AND m.brand_id = get_my_brand_id()
      AND get_my_role() = 'admin'
  )
);

GRANT ALL ON membership_reminders_sent TO authenticated;

-- ============================================================
-- SECTION 1F — Postgres views
-- ============================================================

-- v_active_memberships: updated to expose new category + expiry fields
CREATE OR REPLACE VIEW v_active_memberships AS
SELECT
  p.id                     AS member_id,
  p.full_name              AS member_name,
  p.phone                  AS member_phone,
  p.brand_id,
  b.name                   AS brand_name,
  m.id                     AS membership_id,
  mp.name                  AS package_name,
  mp.package_category,
  m.starts_at,
  m.expires_at,
  m.gym_access_expires_at,
  m.pt_sessions_expires_at,
  m.pt_sessions_remaining,
  m.gym_access_status,
  m.pt_sessions_status,
  m.status                 AS membership_status,
  m.auto_renew,
  CASE
    WHEN m.gym_access_expires_at IS NOT NULL
    THEN GREATEST(0, EXTRACT(DAY FROM (m.gym_access_expires_at - NOW()))::INTEGER)
    ELSE NULL
  END                      AS days_until_gym_expiry,
  CASE
    WHEN m.pt_sessions_expires_at IS NOT NULL
    THEN GREATEST(0, EXTRACT(DAY FROM (m.pt_sessions_expires_at - NOW()))::INTEGER)
    ELSE NULL
  END                      AS days_until_pt_expiry
FROM profiles p
JOIN brands b ON b.id = p.brand_id
JOIN memberships m
  ON m.member_id = p.id AND m.status = 'active'
JOIN membership_packages mp
  ON mp.id = m.package_id
WHERE p.role = 'member'
  AND p.brand_id IS NOT NULL;

-- v_expiry_report: all dimensions needed for the expiry report page
CREATE OR REPLACE VIEW v_expiry_report AS
SELECT
  p.brand_id,
  p.id                                                        AS member_id,
  p.full_name                                                 AS member_name,
  p.phone                                                     AS member_phone,
  mp.name                                                     AS package_name,
  mp.package_category,
  m.id                                                        AS membership_id,
  m.gym_access_expires_at,
  EXTRACT(DAY FROM (m.gym_access_expires_at - NOW()))::INTEGER
                                                              AS days_until_gym_expiry,
  m.pt_sessions_expires_at,
  EXTRACT(DAY FROM (m.pt_sessions_expires_at - NOW()))::INTEGER
                                                              AS days_until_pt_expiry,
  m.pt_sessions_remaining,
  m.gym_access_status,
  m.pt_sessions_status,
  (
    m.gym_access_expires_at IS NOT NULL
    AND EXTRACT(DAY FROM (m.gym_access_expires_at - NOW()))::INTEGER <= 7
    AND EXTRACT(DAY FROM (m.gym_access_expires_at - NOW()))::INTEGER >= 0
  )                                                           AS is_gym_expiring_soon,
  (
    m.pt_sessions_expires_at IS NOT NULL
    AND EXTRACT(DAY FROM (m.pt_sessions_expires_at - NOW()))::INTEGER <= 7
    AND EXTRACT(DAY FROM (m.pt_sessions_expires_at - NOW()))::INTEGER >= 0
  )                                                           AS is_pt_expiring_soon,
  (
    m.pt_sessions_remaining IS NOT NULL
    AND m.pt_sessions_remaining <= 3
    AND m.pt_sessions_status = 'active'
  )                                                           AS is_pt_sessions_low,
  (
    m.pt_sessions_expires_at IS NOT NULL
    AND m.gym_access_expires_at IS NOT NULL
    AND m.pt_sessions_expires_at < m.gym_access_expires_at
  )                                                           AS is_pt_expiring_before_gym
FROM profiles p
JOIN brands b ON b.id = p.brand_id
JOIN memberships m
  ON m.member_id = p.id
  AND m.status = 'active'
JOIN membership_packages mp
  ON mp.id = m.package_id
WHERE p.role = 'member'
  AND p.brand_id IS NOT NULL;

GRANT SELECT ON v_active_memberships TO authenticated;
GRANT SELECT ON v_expiry_report       TO authenticated;
