-- =============================================================================
-- Migration 013: PT Assignment System
--
-- Adds the full PT assignment and dual commission model:
--   1A. Brand-level PT commission settings
--   1B. Package-level commission amounts
--   1C. pt_assignments table
--   1D. trainer_sessions commission columns
--   1E. pt_commission_payouts table
--   1F. v_pt_assignments and v_trainer_commission_summary views
--
-- Note on FK references to profiles:
--   After migration 008 the profiles PK became `profile_id` (surrogate).
--   `profiles.id` has no standalone unique constraint — only the composite
--   UNIQUE (id, brand_id) added by migration 011 exists.  Therefore any FK
--   that needs to reference a profile row must use the composite form:
--     FOREIGN KEY (col, brand_id) REFERENCES profiles(id, brand_id)
--   added as NOT VALID (enforced on new rows, not scanned retroactively),
--   matching the pattern established in migration 011.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1A. Brand-level PT settings
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS pt_assignment_grace_days      INTEGER      NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS pt_sales_commission_enabled   BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pt_sales_commission_percent   NUMERIC(5,2) NOT NULL DEFAULT 10.00;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1B. Package-level commission overrides
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.membership_packages
  ADD COLUMN IF NOT EXISTS session_commission_amount           NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sales_commission_override_percent   NUMERIC(5,2);

COMMENT ON COLUMN public.membership_packages.session_commission_amount IS
  'Fixed amount paid to the assigned PT for each completed session under this package';
COMMENT ON COLUMN public.membership_packages.sales_commission_override_percent IS
  'If set, overrides the brand-level pt_sales_commission_percent for this package only';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1C. pt_assignments table
--
-- member_id and assigned_by reference profiles by (col, brand_id) composite FK
-- added below — NOT inline — because profiles.id has no standalone unique index.
-- trainer_id references trainers(id) which IS the trainers primary key.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.pt_assignments (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id                 UUID         NOT NULL REFERENCES public.brands(id)      ON DELETE CASCADE,
  member_id                UUID         NOT NULL,
  trainer_id               UUID         NOT NULL REFERENCES public.trainers(id)    ON DELETE CASCADE,
  membership_id            UUID         NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  status                   TEXT         NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'grace_period', 'released', 'reassigned')),
  assigned_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  assigned_by              UUID,
  grace_started_at         TIMESTAMPTZ,
  released_at              TIMESTAMPTZ,
  sales_commission_claimed BOOLEAN      NOT NULL DEFAULT false,
  sales_commission_percent NUMERIC(5,2),
  sales_commission_amount  NUMERIC(10,2),
  notes                    TEXT,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Composite FKs to profiles — uses profiles_id_brand_uq constraint (migration 011)
ALTER TABLE public.pt_assignments
  ADD CONSTRAINT pt_assignments_member_brand_fkey
  FOREIGN KEY (member_id, brand_id)
  REFERENCES public.profiles (id, brand_id)
  NOT VALID;

ALTER TABLE public.pt_assignments
  ADD CONSTRAINT pt_assignments_assigned_by_brand_fkey
  FOREIGN KEY (assigned_by, brand_id)
  REFERENCES public.profiles (id, brand_id)
  NOT VALID;

-- Only one active or grace_period assignment per member + membership at a time
CREATE UNIQUE INDEX unique_active_pt_assignment
  ON public.pt_assignments(member_id, membership_id)
  WHERE status IN ('active', 'grace_period');

CREATE INDEX idx_pt_assignments_brand_id    ON public.pt_assignments(brand_id);
CREATE INDEX idx_pt_assignments_trainer_id  ON public.pt_assignments(trainer_id);
CREATE INDEX idx_pt_assignments_member_id   ON public.pt_assignments(member_id);
CREATE INDEX idx_pt_assignments_status      ON public.pt_assignments(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1D. trainer_sessions — commission tracking columns
--
-- commission_approved_by references profiles via composite FK added below.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.trainer_sessions
  ADD COLUMN IF NOT EXISTS pt_assignment_id          UUID         REFERENCES public.pt_assignments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_commission_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS commission_status         TEXT         DEFAULT 'pending'
                             CHECK (commission_status IN ('pending', 'approved', 'paid', 'cancelled')),
  ADD COLUMN IF NOT EXISTS commission_approved_by    UUID,
  ADD COLUMN IF NOT EXISTS commission_approved_at    TIMESTAMPTZ;

ALTER TABLE public.trainer_sessions
  ADD CONSTRAINT trainer_sessions_commission_approved_by_brand_fkey
  FOREIGN KEY (commission_approved_by, brand_id)
  REFERENCES public.profiles (id, brand_id)
  NOT VALID;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1E. pt_commission_payouts table
--
-- approved_by references profiles via composite FK added below.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.pt_commission_payouts (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id           UUID          NOT NULL REFERENCES public.brands(id)       ON DELETE CASCADE,
  trainer_id         UUID          NOT NULL REFERENCES public.trainers(id)     ON DELETE CASCADE,
  payout_type        TEXT          NOT NULL CHECK (payout_type IN ('session', 'sales')),
  pt_assignment_id   UUID          REFERENCES public.pt_assignments(id)        ON DELETE SET NULL,
  trainer_session_id UUID          REFERENCES public.trainer_sessions(id)      ON DELETE SET NULL,
  amount             NUMERIC(10,2) NOT NULL,
  status             TEXT          NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'paid')),
  period_start       DATE,
  period_end         DATE,
  approved_by        UUID,
  approved_at        TIMESTAMPTZ,
  paid_at            TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pt_commission_payouts
  ADD CONSTRAINT pt_commission_payouts_approved_by_brand_fkey
  FOREIGN KEY (approved_by, brand_id)
  REFERENCES public.profiles (id, brand_id)
  NOT VALID;

CREATE INDEX idx_pt_commission_payouts_brand_id   ON public.pt_commission_payouts(brand_id);
CREATE INDEX idx_pt_commission_payouts_trainer_id ON public.pt_commission_payouts(trainer_id);
CREATE INDEX idx_pt_commission_payouts_status     ON public.pt_commission_payouts(status);
CREATE INDEX idx_pt_commission_payouts_type       ON public.pt_commission_payouts(payout_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1F. Views
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_pt_assignments AS
  SELECT
    pa.id,
    pa.brand_id,
    pa.member_id,
    mp.full_name           AS member_name,
    mp.phone               AS member_phone,
    mp.avatar_url          AS member_avatar_url,
    pa.trainer_id,
    tp.full_name           AS trainer_name,
    tp.avatar_url          AS trainer_avatar_url,
    pa.membership_id,
    pkg.name               AS package_name,
    pkg.package_category,
    m.pt_sessions_remaining,
    m.pt_sessions_expires_at,
    pa.status,
    pa.assigned_at,
    pa.assigned_by,
    pa.grace_started_at,
    pa.released_at,
    pa.sales_commission_claimed,
    pa.sales_commission_amount,
    pa.notes
  FROM public.pt_assignments pa
  JOIN public.profiles    mp  ON mp.id  = pa.member_id  AND mp.brand_id  = pa.brand_id
  JOIN public.profiles    tp  ON tp.id  = pa.trainer_id AND tp.brand_id  = pa.brand_id
  JOIN public.memberships m   ON m.id   = pa.membership_id
  JOIN public.membership_packages pkg ON pkg.id = m.package_id;

-- Replace the existing v_trainer_commission_summary with the new version
DROP VIEW IF EXISTS public.v_trainer_commission_summary;

CREATE VIEW public.v_trainer_commission_summary AS
  SELECT
    pcp.trainer_id,
    tp.full_name                                                   AS trainer_name,
    pcp.brand_id,
    TO_CHAR(DATE_TRUNC('month', pcp.created_at), 'YYYY-MM')        AS period,
    COUNT(CASE WHEN pcp.payout_type = 'session' THEN 1 END)        AS total_sessions_completed,
    COALESCE(SUM(CASE WHEN pcp.payout_type = 'session' AND pcp.status = 'pending'  THEN pcp.amount END), 0) AS total_session_commission_pending,
    COALESCE(SUM(CASE WHEN pcp.payout_type = 'session' AND pcp.status = 'approved' THEN pcp.amount END), 0) AS total_session_commission_approved,
    COALESCE(SUM(CASE WHEN pcp.payout_type = 'session' AND pcp.status = 'paid'     THEN pcp.amount END), 0) AS total_session_commission_paid,
    COALESCE(SUM(CASE WHEN pcp.payout_type = 'sales'   AND pcp.status = 'pending'  THEN pcp.amount END), 0) AS total_sales_commission_pending,
    COALESCE(SUM(CASE WHEN pcp.payout_type = 'sales'   AND pcp.status = 'approved' THEN pcp.amount END), 0) AS total_sales_commission_approved,
    COALESCE(SUM(CASE WHEN pcp.payout_type = 'sales'   AND pcp.status = 'paid'     THEN pcp.amount END), 0) AS total_sales_commission_paid,
    COALESCE(SUM(pcp.amount), 0)                                   AS total_commission_all
  FROM public.pt_commission_payouts pcp
  JOIN public.profiles tp ON tp.id = pcp.trainer_id AND tp.brand_id = pcp.brand_id
  GROUP BY pcp.trainer_id, tp.full_name, pcp.brand_id, DATE_TRUNC('month', pcp.created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.pt_assignments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_commission_payouts ENABLE ROW LEVEL SECURITY;

-- pt_assignments: brand-scoped read/write; trainers see their own assignments
CREATE POLICY "pt_assignments_select" ON public.pt_assignments
  FOR SELECT USING (brand_id = get_my_brand_id());

CREATE POLICY "pt_assignments_insert" ON public.pt_assignments
  FOR INSERT WITH CHECK (brand_id = get_my_brand_id());

CREATE POLICY "pt_assignments_update" ON public.pt_assignments
  FOR UPDATE USING (brand_id = get_my_brand_id());

-- pt_commission_payouts: admins see all; trainers see only their own
CREATE POLICY "pt_commission_payouts_select" ON public.pt_commission_payouts
  FOR SELECT USING (
    brand_id = get_my_brand_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE  id       = auth.uid()
          AND  brand_id = pt_commission_payouts.brand_id
          AND  role IN ('admin', 'staff')
      )
      OR trainer_id = auth.uid()
    )
  );

CREATE POLICY "pt_commission_payouts_insert" ON public.pt_commission_payouts
  FOR INSERT WITH CHECK (brand_id = get_my_brand_id());

CREATE POLICY "pt_commission_payouts_update" ON public.pt_commission_payouts
  FOR UPDATE USING (brand_id = get_my_brand_id());
