-- =============================================================================
-- Migration 011: Restore PostgREST join relationships
--
-- Problem introduced by migration 008:
--   All FKs that previously pointed from brand tables (memberships, trainers,
--   classes, etc.) to profiles(id) were redirected to auth.users(id).
--   This broke every PostgREST auto-join between those tables and profiles.
--
-- Fix: Add composite FKs (member_id, brand_id) → profiles(id, brand_id) for
--   tables that have both columns.  class_bookings has no brand_id column, so
--   its profile join is handled manually in application code instead.
--
-- All FKs added as NOT VALID — enforced on new rows, not scanned retroactively.
-- =============================================================================

-- 1. Add a non-partial unique CONSTRAINT on profiles(id, brand_id).
--    Required as the target for the composite FKs below.
--    NULLS NOT DISTINCT (PG 15+) treats NULL brand_id as equal, preventing
--    duplicate shell profiles while still allowing one profile per user per brand.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_brand_uq
  UNIQUE NULLS NOT DISTINCT (id, brand_id);

-- Drop the partial unique indexes now superseded by the constraint above.
DROP INDEX IF EXISTS public.profiles_user_brand_uq;
DROP INDEX IF EXISTS public.profiles_user_null_brand_uq;

-- 2. memberships → profiles
ALTER TABLE public.memberships
  ADD CONSTRAINT memberships_member_brand_fkey
  FOREIGN KEY (member_id, brand_id)
  REFERENCES public.profiles (id, brand_id)
  NOT VALID;

-- 3. invoices → profiles
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_member_brand_fkey
  FOREIGN KEY (member_id, brand_id)
  REFERENCES public.profiles (id, brand_id)
  NOT VALID;

-- 4. trainer_sessions → profiles (member side)
ALTER TABLE public.trainer_sessions
  ADD CONSTRAINT trainer_sessions_member_brand_fkey
  FOREIGN KEY (member_id, brand_id)
  REFERENCES public.profiles (id, brand_id)
  NOT VALID;

-- 5. checkins → profiles
ALTER TABLE public.checkins
  ADD CONSTRAINT checkins_member_brand_fkey
  FOREIGN KEY (member_id, brand_id)
  REFERENCES public.profiles (id, brand_id)
  NOT VALID;

-- 6. trainers → profiles
--    Restores the trainers↔profiles relationship severed by migration 008.
ALTER TABLE public.trainers
  ADD CONSTRAINT trainers_id_brand_fkey
  FOREIGN KEY (id, brand_id)
  REFERENCES public.profiles (id, brand_id)
  NOT VALID;

-- 7. classes → profiles (instructor side)
--    instructor_id is nullable; NULL values skip the FK check automatically.
ALTER TABLE public.classes
  ADD CONSTRAINT classes_instructor_brand_fkey
  FOREIGN KEY (instructor_id, brand_id)
  REFERENCES public.profiles (id, brand_id)
  NOT VALID;

-- NOTE: class_bookings has no brand_id column, so no composite FK is added.
--   The member_profile join for class_bookings is handled with a separate
--   profiles query in application code (getClass / getClassBookings actions).
