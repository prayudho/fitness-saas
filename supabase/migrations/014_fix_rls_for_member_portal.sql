-- =============================================================================
-- Migration 014: Fix RLS policies for member portal and trainer clients
--
-- Two access gaps identified after adding PT assignments:
--
-- 1. profiles_select: members could only see their own profile.
--    Members need to see their assigned trainer's name/avatar on the dashboard.
--    Fix: allow members to read trainer/staff/admin profiles in the same brand.
--
-- 2. memberships_select: trainers were excluded from the policy.
--    getTrainerActiveMembers joins memberships; without access the join silently
--    returns NULL, making the trainer clients page appear empty.
--    Fix: add 'trainer' to the allowed roles for brand-scoped membership reads.
-- =============================================================================

-- ─── 1. profiles: allow members to read trainer/staff/admin profiles in brand ──

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  id = auth.uid()
  OR is_superadmin()
  OR (
    get_my_role() IN ('admin', 'staff', 'trainer')
    AND brand_id = get_my_brand_id()
  )
  OR (
    -- members can see trainer/staff/admin profiles in their own brand
    -- (needed to display assigned trainer name on member dashboard)
    get_my_role() = 'member'
    AND brand_id = get_my_brand_id()
    AND role IN ('trainer', 'admin', 'staff')
  )
);

-- ─── 2. memberships: add trainer to brand-scoped read access ──────────────────

DROP POLICY IF EXISTS "memberships_select" ON public.memberships;

CREATE POLICY "memberships_select" ON public.memberships FOR SELECT USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff', 'trainer'))
  OR member_id = auth.uid()
);
