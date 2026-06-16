-- =============================================================================
-- Migration 023: Multi-Branch Support
--
-- Adds first-class branch support to FitnessPlace SaaS:
--   - new `branches` table under each brand
--   - `branch_manager` role with scoped portal access
--   - branch_id columns on memberships, classes, checkins, trainer_sessions, invoices
--   - home_branch_id on profiles for member management ownership
--   - is_multi_branch flag on brands (gates branch UI for single-location gyms)
--   - junction tables for staff/trainer multi-branch assignment
--   - RLS policies for the new branch_manager role
--
-- NULL = all-branch access convention:
--   membership_packages.branch_id  NULL = package available at all branches
--   memberships.branch_id          NULL = member can check in at any branch
-- =============================================================================

-- =============================================================================
-- STEP 1: New enum value (must be first — cannot be done inside a transaction)
-- =============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'branch_manager';

-- =============================================================================
-- STEP 2: New tables (CREATE before any backfill references them)
-- =============================================================================

-- Core branch entity
CREATE TABLE IF NOT EXISTS branches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  address    TEXT,
  phone      TEXT,
  timezone   TEXT,       -- overrides brand timezone when set
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE branches IS 'Physical locations under a brand. Each brand has at least one (Main Branch).';
COMMENT ON COLUMN branches.timezone IS 'Optional per-branch timezone override. Falls back to brand timezone when NULL.';

-- KPI targets per branch per month (used by branch manager dashboard Revenue vs Target chart)
CREATE TABLE IF NOT EXISTS branch_targets (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id      UUID         NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  period         TEXT         NOT NULL, -- 'YYYY-MM'
  revenue_target NUMERIC(12,2),
  member_target  INTEGER,
  session_target INTEGER,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT branch_targets_branch_period_unique UNIQUE (branch_id, period)
);

-- Staff → branch assignment (many-to-many, one primary per staff member)
-- profile_id stores auth.users.id (profiles.id) — references auth.users directly
-- because profiles.id lacks a standalone unique constraint after migration 008
-- introduced a surrogate PK (profile_id) with a composite unique on (id, brand_id).
CREATE TABLE IF NOT EXISTS staff_branches (
  profile_id UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id  UUID    NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (profile_id, branch_id)
);

-- Only one primary branch per staff member
CREATE UNIQUE INDEX IF NOT EXISTS staff_branches_primary_idx
  ON staff_branches (profile_id) WHERE is_primary = true;

-- Trainer → branch assignment (many-to-many, one primary per trainer)
CREATE TABLE IF NOT EXISTS trainer_branches (
  trainer_id UUID    NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  branch_id  UUID    NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (trainer_id, branch_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS trainer_branches_primary_idx
  ON trainer_branches (trainer_id) WHERE is_primary = true;

-- Audit log for membership branch scope changes (admin/branch_manager action)
CREATE TABLE IF NOT EXISTS membership_scope_changes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID        NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  changed_by    UUID        NOT NULL REFERENCES auth.users(id),
  old_branch_id UUID        REFERENCES branches(id) ON DELETE SET NULL,
  new_branch_id UUID        REFERENCES branches(id) ON DELETE SET NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN membership_scope_changes.old_branch_id IS 'NULL means was all-branch before this change';
COMMENT ON COLUMN membership_scope_changes.new_branch_id IS 'NULL means changed to all-branch access';

-- =============================================================================
-- STEP 3: Add columns to existing tables (all nullable first to avoid breaking data)
-- =============================================================================

-- brands: flag to gate branch UI for single-location gyms
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS is_multi_branch BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN brands.is_multi_branch IS
  'When false, all branch-related UI (filters, branch cards, Home Branch field) is hidden. '
  'Set to true by admin when the brand operates multiple physical locations.';

-- profiles:
--   branch_id       = for branch_manager role: which branch they administer (NULL for all other roles)
--   home_branch_id  = for member role: management ownership (which branch manager "owns" this member)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS home_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

COMMENT ON COLUMN profiles.branch_id IS
  'For branch_manager role only: UUID of the branch this user administers. NULL for all other roles.';
COMMENT ON COLUMN profiles.home_branch_id IS
  'For member role: management ownership. Determines which branch manager can see and manage this member. '
  'Does NOT control check-in access — use memberships.branch_id for that.';

-- membership_packages: NULL = available at all branches; UUID = single-branch only
ALTER TABLE membership_packages
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

COMMENT ON COLUMN membership_packages.branch_id IS
  'NULL = all-branch package (available everywhere). UUID = single-branch package only.';

-- memberships: NULL = all-branch access; UUID = single-branch check-in only
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

COMMENT ON COLUMN memberships.branch_id IS
  'NULL = all-branch membership (can check in at any branch). '
  'UUID = single-branch membership (check-in enforced to that branch only).';

-- classes: every class belongs to a branch (nullable now; NOT NULL after backfill below)
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;

-- checkins: every check-in records which branch (nullable now; NOT NULL after backfill below)
ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE CASCADE;

-- trainer_sessions: branch where the session takes place (nullable — some sessions are remote)
ALTER TABLE trainer_sessions
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- invoices: branch attribution for per-branch revenue reporting
-- Attribution rule: enrollment branch (member's home_branch_id at invoice creation time)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

COMMENT ON COLUMN invoices.branch_id IS
  'Revenue attribution branch. Set to the member''s home_branch_id at invoice creation. '
  'Enrollment branch = revenue branch (standard accounting model).';

-- =============================================================================
-- STEP 4: RLS helper function for branch_manager
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_branch_id()
RETURNS UUID
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = ''
AS $$
  -- Returns the branch this user administers (branch_manager role only).
  -- For all other roles this returns NULL, which correctly excludes them
  -- from branch-scoped RLS policies that use this function.
  SELECT branch_id FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

COMMENT ON FUNCTION public.get_my_branch_id() IS
  'Returns the branch UUID for the current branch_manager. NULL for all other roles.';

-- =============================================================================
-- STEP 5: Seed Main Branch for every existing brand (transactional)
-- =============================================================================

DO $$
BEGIN
  INSERT INTO branches (brand_id, name, is_active)
  SELECT id, 'Main Branch', true
  FROM   brands
  ON CONFLICT DO NOTHING;
END;
$$;

-- =============================================================================
-- STEP 6: Backfill existing data (all wrapped in one transaction)
-- =============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 6a. Set home_branch_id for all existing members (management ownership)
  UPDATE profiles p
  SET    home_branch_id = (
    SELECT b.id FROM branches b WHERE b.brand_id = p.brand_id AND b.name = 'Main Branch' LIMIT 1
  )
  WHERE  p.home_branch_id IS NULL
    AND  p.brand_id IS NOT NULL
    AND  p.role = 'member';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled home_branch_id for % members', v_count;

  -- 6b. Set memberships.branch_id — all existing memberships start as Main Branch (single-branch).
  --     Admins can upgrade individuals to all-branch (NULL) after migration.
  UPDATE memberships m
  SET    branch_id = (
    SELECT b.id FROM branches b WHERE b.brand_id = m.brand_id AND b.name = 'Main Branch' LIMIT 1
  )
  WHERE  m.branch_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled branch_id for % memberships', v_count;

  -- 6c. Set classes.branch_id to their brand's Main Branch
  UPDATE classes c
  SET    branch_id = (
    SELECT b.id FROM branches b WHERE b.brand_id = c.brand_id AND b.name = 'Main Branch' LIMIT 1
  )
  WHERE  c.branch_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled branch_id for % classes', v_count;

  -- 6d. Set checkins.branch_id to their brand's Main Branch
  UPDATE checkins ch
  SET    branch_id = (
    SELECT b.id FROM branches b WHERE b.brand_id = ch.brand_id AND b.name = 'Main Branch' LIMIT 1
  )
  WHERE  ch.branch_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled branch_id for % checkins', v_count;

  -- 6e. Set trainer_sessions.branch_id to their brand's Main Branch
  UPDATE trainer_sessions ts
  SET    branch_id = (
    SELECT b.id FROM branches b WHERE b.brand_id = ts.brand_id AND b.name = 'Main Branch' LIMIT 1
  )
  WHERE  ts.branch_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled branch_id for % trainer_sessions', v_count;

  -- 6f. Set invoices.branch_id using member's home_branch_id (enrollment branch = revenue branch)
  UPDATE invoices i
  SET    branch_id = p.home_branch_id
  FROM   profiles p
  WHERE  p.id = i.member_id
    AND  p.home_branch_id IS NOT NULL
    AND  i.branch_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled branch_id for % invoices', v_count;

  -- 6g. Seed staff_branches: insert Main Branch as primary for all staff
  -- Cast role to text to avoid "unsafe use of new enum value in same transaction" error
  -- (branch_manager was just added by ALTER TYPE above; text cast bypasses PG's compile-time check)
  INSERT INTO staff_branches (profile_id, branch_id, is_primary)
  SELECT p.id, b.id, true
  FROM   profiles p
  JOIN   branches b ON b.brand_id = p.brand_id AND b.name = 'Main Branch'
  WHERE  p.role::text IN ('staff', 'branch_manager')
    AND  p.brand_id IS NOT NULL
  ON CONFLICT (profile_id, branch_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Seeded staff_branches for % staff/branch_manager profiles', v_count;

  -- 6h. Seed trainer_branches: insert Main Branch as primary for all trainers
  INSERT INTO trainer_branches (trainer_id, branch_id, is_primary)
  SELECT t.id, b.id, true
  FROM   trainers t
  JOIN   branches b ON b.brand_id = t.brand_id AND b.name = 'Main Branch'
  ON CONFLICT (trainer_id, branch_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Seeded trainer_branches for % trainers', v_count;
END;
$$;

-- =============================================================================
-- STEP 7: Add NOT NULL constraints after backfill completes
-- =============================================================================

-- Verify backfill before constraining (fail loudly if any rows still NULL)
DO $$
DECLARE
  v_null_classes  INTEGER;
  v_null_checkins INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_classes  FROM classes  WHERE branch_id IS NULL;
  SELECT COUNT(*) INTO v_null_checkins FROM checkins WHERE branch_id IS NULL;

  IF v_null_classes > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % classes still have NULL branch_id', v_null_classes;
  END IF;
  IF v_null_checkins > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % checkins still have NULL branch_id', v_null_checkins;
  END IF;
END;
$$;

ALTER TABLE classes  ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE checkins ALTER COLUMN branch_id SET NOT NULL;

-- =============================================================================
-- STEP 8: Indexes on new hot columns (T9)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_branches_brand_id
  ON branches (brand_id);

-- Memberships by branch — partial index (NULL = all-branch rows excluded, no index needed for those)
CREATE INDEX IF NOT EXISTS idx_memberships_branch_id
  ON memberships (branch_id) WHERE branch_id IS NOT NULL;

-- Profiles home_branch_id — for branch_manager member list queries
CREATE INDEX IF NOT EXISTS idx_profiles_home_branch_id
  ON profiles (home_branch_id) WHERE home_branch_id IS NOT NULL;

-- Profiles branch_id — for get_my_branch_id() lookups on branch_manager login
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id
  ON profiles (branch_id) WHERE branch_id IS NOT NULL;

-- Checkins by branch — high-volume table, full index
CREATE INDEX IF NOT EXISTS idx_checkins_branch_id
  ON checkins (branch_id);

-- Classes by branch
CREATE INDEX IF NOT EXISTS idx_classes_branch_id
  ON classes (branch_id);

-- Invoices by branch — partial (NULL rare after backfill)
CREATE INDEX IF NOT EXISTS idx_invoices_branch_id
  ON invoices (branch_id) WHERE branch_id IS NOT NULL;

-- Trainer sessions by branch
CREATE INDEX IF NOT EXISTS idx_trainer_sessions_branch_id
  ON trainer_sessions (branch_id) WHERE branch_id IS NOT NULL;

-- Staff branches lookup
CREATE INDEX IF NOT EXISTS idx_staff_branches_branch_id
  ON staff_branches (branch_id);

-- Trainer branches lookup
CREATE INDEX IF NOT EXISTS idx_trainer_branches_branch_id
  ON trainer_branches (branch_id);

-- =============================================================================
-- STEP 9: Row Level Security for new tables
-- =============================================================================

ALTER TABLE branches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_targets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_branches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_branches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_scope_changes ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- branches
-- ----------------------------------------
CREATE POLICY "branches_select" ON branches FOR SELECT USING (
  is_superadmin()
  OR brand_id = get_my_brand_id()
);
CREATE POLICY "branches_insert" ON branches FOR INSERT WITH CHECK (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() = 'admin')
);
CREATE POLICY "branches_update" ON branches FOR UPDATE USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() = 'admin')
  OR (id = get_my_branch_id() AND get_my_role()::text = 'branch_manager')
);
CREATE POLICY "branches_delete" ON branches FOR DELETE USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() = 'admin')
);

-- ----------------------------------------
-- branch_targets
-- ----------------------------------------
CREATE POLICY "branch_targets_select" ON branch_targets FOR SELECT USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM branches b
    WHERE b.id = branch_targets.branch_id AND b.brand_id = get_my_brand_id()
  )
);
CREATE POLICY "branch_targets_write" ON branch_targets FOR ALL USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM branches b
    WHERE b.id = branch_targets.branch_id
      AND b.brand_id = get_my_brand_id()
      AND get_my_role()::text IN ('admin', 'branch_manager')
  )
);

-- ----------------------------------------
-- staff_branches
-- ----------------------------------------
CREATE POLICY "staff_branches_select" ON staff_branches FOR SELECT USING (
  is_superadmin()
  OR profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM branches b
    WHERE b.id = staff_branches.branch_id AND b.brand_id = get_my_brand_id()
  )
);
CREATE POLICY "staff_branches_write" ON staff_branches FOR ALL USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM branches b
    WHERE b.id = staff_branches.branch_id
      AND b.brand_id = get_my_brand_id()
      AND get_my_role() = 'admin'
  )
);

-- ----------------------------------------
-- trainer_branches
-- ----------------------------------------
CREATE POLICY "trainer_branches_select" ON trainer_branches FOR SELECT USING (
  is_superadmin()
  OR trainer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM trainers t
    JOIN branches b ON b.id = trainer_branches.branch_id
    WHERE t.id = trainer_branches.trainer_id AND b.brand_id = get_my_brand_id()
  )
);
CREATE POLICY "trainer_branches_write" ON trainer_branches FOR ALL USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM branches b
    WHERE b.id = trainer_branches.branch_id
      AND b.brand_id = get_my_brand_id()
      AND get_my_role() = 'admin'
  )
);

-- ----------------------------------------
-- membership_scope_changes
-- ----------------------------------------
CREATE POLICY "scope_changes_select" ON membership_scope_changes FOR SELECT USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.id = membership_scope_changes.membership_id
      AND m.brand_id = get_my_brand_id()
      AND get_my_role()::text IN ('admin', 'branch_manager')
  )
);
CREATE POLICY "scope_changes_insert" ON membership_scope_changes FOR INSERT WITH CHECK (
  is_superadmin()
  OR get_my_role()::text IN ('admin', 'branch_manager')
);

-- =============================================================================
-- STEP 10: Update existing RLS policies to include branch_manager role
-- =============================================================================

-- ----------------------------------------
-- profiles: branch_manager can see members in their branch
-- ----------------------------------------
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid()
  OR is_superadmin()
  OR (
    get_my_role() IN ('admin', 'staff', 'trainer')
    AND brand_id = get_my_brand_id()
  )
  OR (
    -- branch_manager: see members whose home_branch_id is their branch
    get_my_role()::text = 'branch_manager'
    AND brand_id = get_my_brand_id()
    AND home_branch_id = get_my_branch_id()
  )
);

-- ----------------------------------------
-- membership_packages: branch_manager can see their branch's packages + all-branch packages (T10)
-- NULL branch_id = all-branch package — always visible to branch managers (D10)
-- ----------------------------------------
DROP POLICY IF EXISTS "mpackages_select" ON membership_packages;
CREATE POLICY "mpackages_select" ON membership_packages FOR SELECT USING (
  is_superadmin()
  OR brand_id = get_my_brand_id()
);

-- membership_packages write: admin only (branch_manager cannot create packages)
DROP POLICY IF EXISTS "mpackages_write" ON membership_packages;
CREATE POLICY "mpackages_write" ON membership_packages FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() = 'admin')
);

-- ----------------------------------------
-- memberships: branch_manager can see members in their branch (via home_branch_id on profiles)
-- ----------------------------------------
DROP POLICY IF EXISTS "memberships_select" ON memberships;
CREATE POLICY "memberships_select" ON memberships FOR SELECT USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR member_id = auth.uid()
  OR (
    -- branch_manager: see memberships of members in their branch
    get_my_role()::text = 'branch_manager'
    AND brand_id = get_my_brand_id()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = memberships.member_id
        AND p.home_branch_id = get_my_branch_id()
    )
  )
);

DROP POLICY IF EXISTS "memberships_write" ON memberships;
CREATE POLICY "memberships_write" ON memberships FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR (
    -- branch_manager can update scope for members in their branch
    get_my_role()::text = 'branch_manager'
    AND brand_id = get_my_brand_id()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = memberships.member_id
        AND p.home_branch_id = get_my_branch_id()
    )
  )
);

-- ----------------------------------------
-- classes: branch_manager can see classes at their branch
-- ----------------------------------------
DROP POLICY IF EXISTS "classes_select" ON classes;
CREATE POLICY "classes_select" ON classes FOR SELECT USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff', 'trainer', 'member'))
  OR (
    get_my_role()::text = 'branch_manager'
    AND brand_id = get_my_brand_id()
    AND branch_id = get_my_branch_id()
  )
);

DROP POLICY IF EXISTS "classes_write" ON classes;
CREATE POLICY "classes_write" ON classes FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR (instructor_id = auth.uid() AND brand_id = get_my_brand_id())
);

-- ----------------------------------------
-- checkins: branch_manager can see checkins at their branch
-- ----------------------------------------
DROP POLICY IF EXISTS "checkins_select" ON checkins;
CREATE POLICY "checkins_select" ON checkins FOR SELECT USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR member_id = auth.uid()
  OR (
    get_my_role()::text = 'branch_manager'
    AND brand_id = get_my_brand_id()
    AND branch_id = get_my_branch_id()
  )
);

-- ----------------------------------------
-- trainer_sessions: branch_manager can see sessions at their branch
-- ----------------------------------------
DROP POLICY IF EXISTS "tsessions_select" ON trainer_sessions;
CREATE POLICY "tsessions_select" ON trainer_sessions FOR SELECT USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR trainer_id = auth.uid()
  OR member_id  = auth.uid()
  OR (
    get_my_role()::text = 'branch_manager'
    AND brand_id = get_my_brand_id()
    AND branch_id = get_my_branch_id()
  )
);

DROP POLICY IF EXISTS "tsessions_write" ON trainer_sessions;
CREATE POLICY "tsessions_write" ON trainer_sessions FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR (trainer_id = auth.uid() AND get_my_role() = 'trainer')
);

-- ----------------------------------------
-- invoices: branch_manager can see invoices attributed to their branch
-- ----------------------------------------
DROP POLICY IF EXISTS "invoices_select" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR member_id = auth.uid()
  OR (
    get_my_role()::text = 'branch_manager'
    AND brand_id = get_my_brand_id()
    AND branch_id = get_my_branch_id()
  )
);

-- invoices write: admin/staff only (branch_manager cannot create invoices directly)
DROP POLICY IF EXISTS "invoices_write" ON invoices;
CREATE POLICY "invoices_write" ON invoices FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
);

-- =============================================================================
-- STEP 11: v_branch_summary view for branch manager dashboard and admin reporting
-- =============================================================================

CREATE OR REPLACE VIEW v_branch_summary AS
SELECT
  b.id                                                   AS branch_id,
  b.brand_id,
  b.name                                                 AS branch_name,
  b.is_active,
  COUNT(DISTINCT ch.id)
    FILTER (WHERE ch.checked_in_at >= date_trunc('month', NOW()))
                                                         AS checkins_this_month,
  COUNT(DISTINCT ch.id)
    FILTER (WHERE ch.checked_in_at >= CURRENT_DATE)         AS checkins_today,
  COUNT(DISTINCT m.id)
    FILTER (WHERE m.gym_access_status = 'active')        AS active_members,
  COALESCE(SUM(inv.amount)
    FILTER (WHERE inv.status = 'paid'
              AND inv.created_at >= date_trunc('month', NOW())), 0)
                                                         AS revenue_this_month,
  COUNT(DISTINCT ts.id)
    FILTER (WHERE ts.status = 'completed'
              AND ts.created_at >= date_trunc('month', NOW()))
                                                         AS sessions_this_month
FROM branches b
-- Checkins always have branch_id (NOT NULL after migration)
LEFT JOIN checkins ch ON ch.branch_id = b.id
-- Memberships: count both single-branch (branch_id = this branch) and all-branch (NULL) members
-- whose home_branch_id points here
LEFT JOIN memberships m ON (
  m.brand_id = b.brand_id
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = m.member_id AND p.home_branch_id = b.id
  )
)
-- Invoices attributed to this branch
LEFT JOIN invoices inv ON inv.branch_id = b.id
-- Sessions at this branch
LEFT JOIN trainer_sessions ts ON ts.branch_id = b.id
GROUP BY b.id, b.brand_id, b.name, b.is_active;

COMMENT ON VIEW v_branch_summary IS
  'Per-branch KPI summary. Used by admin consolidated reporting and branch manager dashboard.';

-- =============================================================================
-- STEP 12: updated_at trigger for new tables
-- =============================================================================

CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
