-- =============================================================================
-- Migration 008: Multi-Brand Profile Support
--
-- Allows one email (auth.users row) to have profiles at multiple fitness
-- brands simultaneously, each with independent roles and data.
--
-- Core change: profiles.id was the PK (1:1 with auth.users).
-- New model: surrogate PK `profile_id`, UNIQUE(id, brand_id) per brand.
--
-- The dependent FK constraints that block the PK drop are redirected to
-- auth.users(id) — the true source of identity — with identical ON DELETE
-- semantics as the original constraints.
-- =============================================================================

-- ─── 1. Add surrogate PK column ───────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_id UUID NOT NULL DEFAULT gen_random_uuid();

-- ─── 2. Drop all FK constraints that depend on profiles_pkey ──────────────
-- (constraint names taken from the Postgres error output)
ALTER TABLE public.memberships        DROP CONSTRAINT IF EXISTS memberships_member_id_fkey;
ALTER TABLE public.membership_freezes DROP CONSTRAINT IF EXISTS membership_freezes_created_by_fkey;
ALTER TABLE public.invoices           DROP CONSTRAINT IF EXISTS invoices_member_id_fkey;
ALTER TABLE public.trainers           DROP CONSTRAINT IF EXISTS trainers_id_fkey;
ALTER TABLE public.trainer_sessions   DROP CONSTRAINT IF EXISTS trainer_sessions_member_id_fkey;
ALTER TABLE public.classes            DROP CONSTRAINT IF EXISTS classes_instructor_id_fkey;
ALTER TABLE public.class_bookings     DROP CONSTRAINT IF EXISTS class_bookings_member_id_fkey;
ALTER TABLE public.checkins           DROP CONSTRAINT IF EXISTS checkins_member_id_fkey;
ALTER TABLE public.custom_roles       DROP CONSTRAINT IF EXISTS custom_roles_created_by_fkey;

-- ─── 3. Drop the old primary key ──────────────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT profiles_pkey;

-- ─── 4. Promote profile_id as the new PK ──────────────────────────────────
ALTER TABLE public.profiles ADD PRIMARY KEY (profile_id);

-- ─── 5. Re-add all FK constraints pointing to auth.users(id) ──────────────
-- Same ON DELETE behaviour as the original constraints.

ALTER TABLE public.memberships ADD CONSTRAINT memberships_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.membership_freezes ADD CONSTRAINT membership_freezes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.invoices ADD CONSTRAINT invoices_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.trainers ADD CONSTRAINT trainers_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.trainer_sessions ADD CONSTRAINT trainer_sessions_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.classes ADD CONSTRAINT classes_instructor_id_fkey
  FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.class_bookings ADD CONSTRAINT class_bookings_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.checkins ADD CONSTRAINT checkins_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.custom_roles ADD CONSTRAINT custom_roles_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─── 6. Unique constraints for (user, brand) combinations ─────────────────
-- Non-null brand: at most one profile per (user, brand)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_brand_uq
  ON public.profiles(id, brand_id)
  WHERE brand_id IS NOT NULL;

-- Null brand: at most one unbranded shell profile per user
-- (created by the trigger before brand_id is assigned, e.g. during signUp flow)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_null_brand_uq
  ON public.profiles(id)
  WHERE brand_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_id_brand ON public.profiles(id, brand_id);

-- ─── 7. get_my_brand_id ── resolve from PostgREST request header ──────────
-- Middleware sets x-tenant-subdomain; the server Supabase client forwards it.
CREATE OR REPLACE FUNCTION public.get_my_brand_id()
RETURNS UUID
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT b.id
  FROM   public.brands b
  WHERE  b.slug = NULLIF(TRIM(
           COALESCE(
             current_setting('request.headers', true)::json->>'x-tenant-subdomain',
             ''
           )
         ), '')
    AND  b.is_active = true
  LIMIT  1
$$;

-- ─── 8. get_my_role ── use brand context ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role
  FROM   public.profiles
  WHERE  id      = (SELECT auth.uid())
    AND  brand_id IS NOT DISTINCT FROM public.get_my_brand_id()
  LIMIT  1
$$;

-- ─── 9. is_superadmin ── unchanged; superadmin has NULL brand_id ──────────
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'superadmin'
  )
$$;

-- ─── 10. is_brand_admin ── scoped to current brand ────────────────────────
CREATE OR REPLACE FUNCTION public.is_brand_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id       = (SELECT auth.uid())
      AND brand_id IS NOT DISTINCT FROM public.get_my_brand_id()
      AND role      IN ('superadmin', 'admin')
  )
$$;

-- ─── 11. Helper: look up auth user id by email (for existing-user invite) ──
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1
$$;

-- ─── 12. Update handle_new_user trigger ───────────────────────────────────
-- Reads brand_id from app_metadata. Uses IS NOT DISTINCT FROM for NULL-safety.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  v_brand_id := NULLIF(
    TRIM(COALESCE(NEW.raw_app_meta_data ->> 'brand_id', '')), ''
  )::UUID;

  INSERT INTO public.profiles (id, brand_id, full_name, role, must_change_password)
  SELECT
    NEW.id,
    v_brand_id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_app_meta_data ->> 'role')::public.user_role, 'member'::public.user_role),
    COALESCE((NEW.raw_app_meta_data ->> 'must_change_password')::boolean, false)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.id AND brand_id IS NOT DISTINCT FROM v_brand_id
  );

  RETURN NEW;
END;
$$;

-- ─── 13. RLS policies on profiles ─────────────────────────────────────────
DROP POLICY IF EXISTS profiles_select       ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own   ON public.profiles;
DROP POLICY IF EXISTS profiles_update       ON public.profiles;
DROP POLICY IF EXISTS profiles_delete       ON public.profiles;

-- SELECT: own profiles (all brands) OR superadmin OR same-brand staff
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (
  auth.uid() = id
  OR public.is_superadmin()
  OR (
    brand_id = public.get_my_brand_id()
    AND public.get_my_role() IN ('admin', 'staff', 'trainer', 'support')
  )
);

-- INSERT: users may only insert their own profile rows (service role bypasses)
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- UPDATE: own profiles OR superadmin OR brand admin
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (
  auth.uid() = id
  OR public.is_superadmin()
  OR (brand_id = public.get_my_brand_id() AND public.is_brand_admin())
);

-- DELETE: superadmin OR brand admin
CREATE POLICY profiles_delete ON public.profiles FOR DELETE USING (
  public.is_superadmin()
  OR (brand_id = public.get_my_brand_id() AND public.is_brand_admin())
);
