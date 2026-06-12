-- ============================================================
-- FitnessPlace SaaS — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role         AS ENUM ('superadmin', 'admin', 'staff', 'trainer', 'member');
CREATE TYPE subscription_plan AS ENUM ('starter', 'growth', 'enterprise');
CREATE TYPE membership_type   AS ENUM ('monthly', 'annual', 'sessions', 'day_pass');
CREATE TYPE membership_status AS ENUM ('active', 'frozen', 'expired', 'cancelled');
CREATE TYPE invoice_status    AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method    AS ENUM ('gateway', 'cash', 'transfer');
CREATE TYPE discount_type     AS ENUM ('percent', 'fixed');
CREATE TYPE commission_model  AS ENUM ('flat', 'percent', 'per_session');
CREATE TYPE session_status    AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE class_status      AS ENUM ('scheduled', 'cancelled', 'completed');
CREATE TYPE booking_status    AS ENUM ('booked', 'waitlisted', 'attended', 'cancelled', 'no_show');
CREATE TYPE checkin_method    AS ENUM ('qr', 'staff', 'gate');

-- ============================================================
-- PLATFORM FOUNDATION TABLES
-- ============================================================

CREATE TABLE brands (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT           NOT NULL,
  slug              TEXT           NOT NULL,
  logo_url          TEXT,
  primary_color     TEXT           NOT NULL DEFAULT '#3B82F6',
  owner_user_id     UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_plan subscription_plan NOT NULL DEFAULT 'starter',
  is_active         BOOLEAN        NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT brands_slug_unique  UNIQUE (slug),
  CONSTRAINT brands_slug_format  CHECK  (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

COMMENT ON TABLE  brands IS 'Top-level tenant entity. Each brand is a gym or fitness studio.';
COMMENT ON COLUMN brands.slug IS 'Subdomain slug — must be globally unique, e.g. crossfit-downtown';

CREATE TABLE profiles (
  id                      UUID       PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id                UUID       REFERENCES brands(id) ON DELETE SET NULL,
  role                    user_role  NOT NULL DEFAULT 'member',
  full_name               TEXT       NOT NULL,
  phone                   TEXT,
  avatar_url              TEXT,
  date_of_birth           DATE,
  gender                  TEXT       CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN profiles.brand_id IS 'NULL for superadmin role (platform-wide access)';

-- ============================================================
-- MEMBERSHIP MODULE
-- ============================================================

CREATE TABLE membership_packages (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID            NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name            TEXT            NOT NULL,
  description     TEXT,
  type            membership_type NOT NULL,
  duration_days   INTEGER         CHECK (duration_days > 0),
  session_credits INTEGER         CHECK (session_credits > 0),
  price           NUMERIC(12,2)   NOT NULL CHECK (price >= 0),
  currency        TEXT            NOT NULL DEFAULT 'IDR',
  is_active       BOOLEAN         NOT NULL DEFAULT true,
  allow_freeze    BOOLEAN         NOT NULL DEFAULT false,
  max_freeze_days INTEGER         DEFAULT 30 CHECK (max_freeze_days >= 0),
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  CONSTRAINT package_has_duration_or_credits
    CHECK (duration_days IS NOT NULL OR session_credits IS NOT NULL)
);

CREATE TABLE memberships (
  id                  UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            UUID              NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  member_id           UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id          UUID              NOT NULL REFERENCES membership_packages(id) ON DELETE RESTRICT,
  status              membership_status NOT NULL DEFAULT 'active',
  starts_at           TIMESTAMPTZ       NOT NULL,
  expires_at          TIMESTAMPTZ,
  sessions_remaining  INTEGER           CHECK (sessions_remaining >= 0),
  auto_renew          BOOLEAN           NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TABLE membership_freezes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id  UUID        NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  frozen_from    DATE        NOT NULL,
  frozen_until   DATE        NOT NULL,
  reason         TEXT,
  created_by     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT freeze_date_order CHECK (frozen_until > frozen_from)
);

-- ============================================================
-- PAYMENT MODULE
-- ============================================================

CREATE TABLE invoices (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id       UUID           NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  member_id      UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  membership_id  UUID           REFERENCES memberships(id) ON DELETE SET NULL,
  amount         NUMERIC(12,2)  NOT NULL CHECK (amount >= 0),
  currency       TEXT           NOT NULL DEFAULT 'IDR',
  status         invoice_status NOT NULL DEFAULT 'pending',
  payment_method payment_method,
  gateway_ref    TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  paid_at        TIMESTAMPTZ
);

CREATE TABLE promo_codes (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id       UUID          NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  code           TEXT          NOT NULL,
  discount_type  discount_type NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses       INTEGER       CHECK (max_uses > 0),
  used_count     INTEGER       NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  valid_from     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  valid_until    TIMESTAMPTZ,
  is_active      BOOLEAN       NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT promo_codes_brand_code_unique UNIQUE (brand_id, code)
);

-- ============================================================
-- PERSONAL TRAINER MODULE
-- ============================================================

CREATE TABLE trainers (
  id               UUID             PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  brand_id         UUID             NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  bio              TEXT,
  specialties      TEXT[]           NOT NULL DEFAULT '{}',
  certifications   TEXT[]           NOT NULL DEFAULT '{}',
  commission_model commission_model NOT NULL DEFAULT 'per_session',
  commission_value NUMERIC(10,2)    NOT NULL DEFAULT 0 CHECK (commission_value >= 0),
  is_active        BOOLEAN          NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE trainer_availability (
  id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id   UUID     NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME     NOT NULL,
  end_time     TIME     NOT NULL,
  is_recurring BOOLEAN  NOT NULL DEFAULT true,
  CONSTRAINT availability_time_order CHECK (end_time > start_time),
  CONSTRAINT trainer_availability_unique_slot UNIQUE (trainer_id, day_of_week, start_time)
);

COMMENT ON COLUMN trainer_availability.day_of_week IS '0 = Monday, 6 = Sunday';

CREATE TABLE trainer_sessions (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         UUID           NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  trainer_id       UUID           NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  member_id        UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_at     TIMESTAMPTZ    NOT NULL,
  duration_minutes INTEGER        NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  status           session_status NOT NULL DEFAULT 'scheduled',
  notes            TEXT,
  session_fee      NUMERIC(12,2)  CHECK (session_fee >= 0),
  commission_earned NUMERIC(12,2) CHECK (commission_earned >= 0),
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FITNESS CLASS MODULE
-- ============================================================

CREATE TABLE class_types (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  color       TEXT        NOT NULL DEFAULT '#3B82F6',
  icon        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE classes (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         UUID         NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  class_type_id    UUID         NOT NULL REFERENCES class_types(id) ON DELETE CASCADE,
  instructor_id    UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  room             TEXT,
  capacity         INTEGER      NOT NULL DEFAULT 20 CHECK (capacity > 0),
  duration_minutes INTEGER      NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  scheduled_at     TIMESTAMPTZ  NOT NULL,
  status           class_status NOT NULL DEFAULT 'scheduled',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE class_bookings (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID           NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  member_id     UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        booking_status NOT NULL DEFAULT 'booked',
  booked_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ,
  CONSTRAINT class_bookings_unique_member UNIQUE (class_id, member_id)
);

-- ============================================================
-- CHECK-IN MODULE
-- ============================================================

CREATE TABLE checkins (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id       UUID           NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  member_id      UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  membership_id  UUID           REFERENCES memberships(id) ON DELETE SET NULL,
  method         checkin_method NOT NULL DEFAULT 'staff',
  checked_in_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  notes          TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================

-- brands
CREATE INDEX idx_brands_slug        ON brands (slug);
CREATE INDEX idx_brands_owner       ON brands (owner_user_id);
CREATE INDEX idx_brands_is_active   ON brands (is_active) WHERE is_active = true;

-- profiles
CREATE INDEX idx_profiles_brand_id      ON profiles (brand_id);
CREATE INDEX idx_profiles_role          ON profiles (role);
CREATE INDEX idx_profiles_brand_role    ON profiles (brand_id, role);
CREATE INDEX idx_profiles_phone         ON profiles (phone) WHERE phone IS NOT NULL;

-- membership_packages
CREATE INDEX idx_mpackages_brand        ON membership_packages (brand_id);
CREATE INDEX idx_mpackages_brand_active ON membership_packages (brand_id, is_active);
CREATE INDEX idx_mpackages_type         ON membership_packages (brand_id, type);

-- memberships
CREATE INDEX idx_memberships_brand      ON memberships (brand_id);
CREATE INDEX idx_memberships_member     ON memberships (member_id);
CREATE INDEX idx_memberships_package    ON memberships (package_id);
CREATE INDEX idx_memberships_status     ON memberships (brand_id, status);
CREATE INDEX idx_memberships_expires    ON memberships (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_memberships_active     ON memberships (member_id, status) WHERE status = 'active';

-- membership_freezes
CREATE INDEX idx_freezes_membership ON membership_freezes (membership_id);
CREATE INDEX idx_freezes_dates      ON membership_freezes (frozen_from, frozen_until);

-- invoices
CREATE INDEX idx_invoices_brand     ON invoices (brand_id);
CREATE INDEX idx_invoices_member    ON invoices (member_id);
CREATE INDEX idx_invoices_membership ON invoices (membership_id);
CREATE INDEX idx_invoices_status    ON invoices (brand_id, status);
CREATE INDEX idx_invoices_paid_at   ON invoices (brand_id, paid_at DESC NULLS LAST);

-- promo_codes
CREATE INDEX idx_promo_brand_code   ON promo_codes (brand_id, code);
CREATE INDEX idx_promo_valid        ON promo_codes (brand_id, valid_until) WHERE is_active = true;

-- trainers
CREATE INDEX idx_trainers_brand     ON trainers (brand_id);
CREATE INDEX idx_trainers_active    ON trainers (brand_id, is_active);

-- trainer_availability
CREATE INDEX idx_availability_trainer ON trainer_availability (trainer_id);
CREATE INDEX idx_availability_day     ON trainer_availability (trainer_id, day_of_week);

-- trainer_sessions
CREATE INDEX idx_tsessions_brand      ON trainer_sessions (brand_id);
CREATE INDEX idx_tsessions_trainer    ON trainer_sessions (trainer_id);
CREATE INDEX idx_tsessions_member     ON trainer_sessions (member_id);
CREATE INDEX idx_tsessions_status     ON trainer_sessions (brand_id, status);
CREATE INDEX idx_tsessions_scheduled  ON trainer_sessions (trainer_id, scheduled_at);
CREATE INDEX idx_tsessions_brand_date ON trainer_sessions (brand_id, scheduled_at DESC);

-- class_types
CREATE INDEX idx_class_types_brand    ON class_types (brand_id);

-- classes
CREATE INDEX idx_classes_brand        ON classes (brand_id);
CREATE INDEX idx_classes_type         ON classes (class_type_id);
CREATE INDEX idx_classes_instructor   ON classes (instructor_id);
CREATE INDEX idx_classes_scheduled    ON classes (brand_id, scheduled_at);
CREATE INDEX idx_classes_status       ON classes (brand_id, status);

-- class_bookings
CREATE INDEX idx_bookings_class       ON class_bookings (class_id);
CREATE INDEX idx_bookings_member      ON class_bookings (member_id);
CREATE INDEX idx_bookings_status      ON class_bookings (class_id, status);

-- checkins
CREATE INDEX idx_checkins_brand       ON checkins (brand_id);
CREATE INDEX idx_checkins_member      ON checkins (member_id);
CREATE INDEX idx_checkins_membership  ON checkins (membership_id);
CREATE INDEX idx_checkins_date        ON checkins (brand_id, checked_in_at DESC);

-- ============================================================
-- TRIGGERS — updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_mpackages_updated_at
  BEFORE UPDATE ON membership_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_memberships_updated_at
  BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_trainers_updated_at
  BEFORE UPDATE ON trainers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tsessions_updated_at
  BEFORE UPDATE ON trainer_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_classes_updated_at
  BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER — bypass RLS for auth checks)
-- ============================================================

-- Returns the brand_id of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_my_brand_id()
RETURNS UUID
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT brand_id FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

-- Returns the role of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())
$$;

-- Returns true if the current user is a superadmin
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

-- Returns true if the current user is admin or superadmin
CREATE OR REPLACE FUNCTION public.is_brand_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('superadmin', 'admin')
  )
$$;

-- Auto-create a profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    ),
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE brands               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_packages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_freezes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_types          ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins             ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- brands
-- ----------------------------------------
CREATE POLICY "brands_select" ON brands FOR SELECT USING (
  is_superadmin()
  OR id = get_my_brand_id()
);
CREATE POLICY "brands_insert" ON brands FOR INSERT WITH CHECK (
  is_superadmin()
);
CREATE POLICY "brands_update" ON brands FOR UPDATE USING (
  is_superadmin()
  OR (id = get_my_brand_id() AND get_my_role() = 'admin')
);
CREATE POLICY "brands_delete" ON brands FOR DELETE USING (
  is_superadmin()
);

-- ----------------------------------------
-- profiles
-- Uses EXISTS sub-selects instead of helper functions to avoid recursion.
-- Helper functions are SECURITY DEFINER so they bypass RLS safely.
-- ----------------------------------------
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid()
  OR is_superadmin()
  OR (
    get_my_role() IN ('admin', 'staff', 'trainer')
    AND brand_id = get_my_brand_id()
  )
);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (
  id = auth.uid()
);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  id = auth.uid()
  OR is_superadmin()
  OR (get_my_role() = 'admin' AND brand_id = get_my_brand_id())
);
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (
  is_superadmin()
  OR (get_my_role() = 'admin' AND brand_id = get_my_brand_id())
);

-- ----------------------------------------
-- membership_packages — brand-scoped; write = admin only
-- ----------------------------------------
CREATE POLICY "mpackages_select" ON membership_packages FOR SELECT USING (
  is_superadmin() OR brand_id = get_my_brand_id()
);
CREATE POLICY "mpackages_write" ON membership_packages FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() = 'admin')
);

-- ----------------------------------------
-- memberships
-- ----------------------------------------
CREATE POLICY "memberships_select" ON memberships FOR SELECT USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR member_id = auth.uid()
);
CREATE POLICY "memberships_write" ON memberships FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
);

-- ----------------------------------------
-- membership_freezes
-- ----------------------------------------
CREATE POLICY "freezes_select" ON membership_freezes FOR SELECT USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.id = membership_freezes.membership_id
    AND (
      (m.brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
      OR m.member_id = auth.uid()
    )
  )
);
CREATE POLICY "freezes_write" ON membership_freezes FOR ALL USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.id = membership_freezes.membership_id
    AND m.brand_id = get_my_brand_id()
    AND get_my_role() IN ('admin', 'staff')
  )
);

-- ----------------------------------------
-- invoices
-- ----------------------------------------
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR member_id = auth.uid()
);
CREATE POLICY "invoices_write" ON invoices FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
);

-- ----------------------------------------
-- promo_codes
-- ----------------------------------------
CREATE POLICY "promo_select" ON promo_codes FOR SELECT USING (
  is_superadmin() OR brand_id = get_my_brand_id()
);
CREATE POLICY "promo_write" ON promo_codes FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() = 'admin')
);

-- ----------------------------------------
-- trainers
-- ----------------------------------------
CREATE POLICY "trainers_select" ON trainers FOR SELECT USING (
  is_superadmin() OR brand_id = get_my_brand_id()
);
CREATE POLICY "trainers_write" ON trainers FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() = 'admin')
  OR id = auth.uid()
);

-- ----------------------------------------
-- trainer_availability
-- ----------------------------------------
CREATE POLICY "availability_select" ON trainer_availability FOR SELECT USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM trainers t
    WHERE t.id = trainer_availability.trainer_id
    AND t.brand_id = get_my_brand_id()
  )
);
CREATE POLICY "availability_write" ON trainer_availability FOR ALL USING (
  is_superadmin()
  OR trainer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM trainers t
    WHERE t.id = trainer_availability.trainer_id
    AND t.brand_id = get_my_brand_id()
    AND get_my_role() = 'admin'
  )
);

-- ----------------------------------------
-- trainer_sessions
-- ----------------------------------------
CREATE POLICY "tsessions_select" ON trainer_sessions FOR SELECT USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR trainer_id = auth.uid()
  OR member_id  = auth.uid()
);
CREATE POLICY "tsessions_write" ON trainer_sessions FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR (trainer_id = auth.uid() AND get_my_role() = 'trainer')
);

-- ----------------------------------------
-- class_types
-- ----------------------------------------
CREATE POLICY "class_types_select" ON class_types FOR SELECT USING (
  is_superadmin() OR brand_id = get_my_brand_id()
);
CREATE POLICY "class_types_write" ON class_types FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() = 'admin')
);

-- ----------------------------------------
-- classes
-- ----------------------------------------
CREATE POLICY "classes_select" ON classes FOR SELECT USING (
  is_superadmin() OR brand_id = get_my_brand_id()
);
CREATE POLICY "classes_write" ON classes FOR ALL USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR (instructor_id = auth.uid() AND brand_id = get_my_brand_id())
);

-- ----------------------------------------
-- class_bookings
-- ----------------------------------------
CREATE POLICY "bookings_select" ON class_bookings FOR SELECT USING (
  is_superadmin()
  OR member_id = auth.uid()
  OR (
    get_my_role() IN ('admin', 'staff', 'trainer')
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_bookings.class_id AND c.brand_id = get_my_brand_id()
    )
  )
);
CREATE POLICY "bookings_insert" ON class_bookings FOR INSERT WITH CHECK (
  is_superadmin()
  OR member_id = auth.uid()
  OR (
    get_my_role() IN ('admin', 'staff')
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_bookings.class_id AND c.brand_id = get_my_brand_id()
    )
  )
);
CREATE POLICY "bookings_update" ON class_bookings FOR UPDATE USING (
  is_superadmin()
  OR member_id = auth.uid()
  OR (
    get_my_role() IN ('admin', 'staff')
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_bookings.class_id AND c.brand_id = get_my_brand_id()
    )
  )
);
CREATE POLICY "bookings_delete" ON class_bookings FOR DELETE USING (
  is_superadmin()
  OR (
    get_my_role() IN ('admin', 'staff')
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_bookings.class_id AND c.brand_id = get_my_brand_id()
    )
  )
);

-- ----------------------------------------
-- checkins
-- ----------------------------------------
CREATE POLICY "checkins_select" ON checkins FOR SELECT USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
  OR member_id = auth.uid()
);
CREATE POLICY "checkins_insert" ON checkins FOR INSERT WITH CHECK (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
);
CREATE POLICY "checkins_update" ON checkins FOR UPDATE USING (
  is_superadmin()
  OR (brand_id = get_my_brand_id() AND get_my_role() IN ('admin', 'staff'))
);

-- ============================================================
-- REPORTING VIEWS
-- ============================================================

-- Active members with their current membership status
CREATE OR REPLACE VIEW v_active_members AS
SELECT
  p.id,
  p.full_name,
  p.phone,
  p.gender,
  p.brand_id,
  b.name              AS brand_name,
  b.slug              AS brand_slug,
  m.id                AS membership_id,
  m.status            AS membership_status,
  m.starts_at,
  m.expires_at,
  m.sessions_remaining,
  m.auto_renew,
  mp.name             AS package_name,
  mp.type             AS package_type,
  mp.price            AS package_price,
  mp.currency,
  -- Days until expiry (NULL if no expiry or no membership)
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

-- Daily revenue aggregated by brand, date, and payment method
CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT
  brand_id,
  DATE(paid_at)    AS revenue_date,
  payment_method,
  currency,
  COUNT(*)         AS transaction_count,
  SUM(amount)      AS total_amount,
  AVG(amount)      AS avg_transaction
FROM invoices
WHERE status = 'paid'
  AND paid_at IS NOT NULL
GROUP BY brand_id, DATE(paid_at), payment_method, currency;

-- Class-level attendance breakdown
CREATE OR REPLACE VIEW v_class_attendance_summary AS
SELECT
  cl.brand_id,
  cl.id                AS class_id,
  ct.name              AS class_type_name,
  ct.color             AS class_type_color,
  p.full_name          AS instructor_name,
  cl.room,
  cl.scheduled_at,
  cl.capacity,
  cl.status            AS class_status,
  cl.duration_minutes,
  COUNT(cb.id)         AS total_bookings,
  COUNT(cb.id) FILTER (WHERE cb.status = 'booked')     AS booked_count,
  COUNT(cb.id) FILTER (WHERE cb.status = 'waitlisted') AS waitlist_count,
  COUNT(cb.id) FILTER (WHERE cb.status = 'attended')   AS attended_count,
  COUNT(cb.id) FILTER (WHERE cb.status = 'no_show')    AS no_show_count,
  COUNT(cb.id) FILTER (WHERE cb.status = 'cancelled')  AS cancelled_count,
  ROUND(
    COUNT(cb.id) FILTER (WHERE cb.status = 'attended')::NUMERIC
    / NULLIF(cl.capacity, 0) * 100,
    1
  )                    AS fill_rate_pct
FROM classes cl
JOIN class_types ct ON ct.id = cl.class_type_id
LEFT JOIN profiles p ON p.id = cl.instructor_id
LEFT JOIN class_bookings cb ON cb.class_id = cl.id
GROUP BY cl.brand_id, cl.id, ct.name, ct.color, p.full_name,
         cl.room, cl.scheduled_at, cl.capacity, cl.status, cl.duration_minutes;

-- Monthly trainer commission summary
CREATE OR REPLACE VIEW v_trainer_commission_summary AS
SELECT
  ts.brand_id,
  ts.trainer_id,
  p.full_name              AS trainer_name,
  DATE_TRUNC('month', ts.scheduled_at)::DATE AS month,
  COUNT(*)                 AS total_sessions,
  COUNT(*) FILTER (WHERE ts.status = 'completed')  AS sessions_completed,
  COUNT(*) FILTER (WHERE ts.status = 'cancelled')  AS sessions_cancelled,
  COUNT(*) FILTER (WHERE ts.status = 'no_show')    AS sessions_no_show,
  COALESCE(SUM(ts.session_fee)       FILTER (WHERE ts.status = 'completed'), 0) AS total_revenue,
  COALESCE(SUM(ts.commission_earned) FILTER (WHERE ts.status = 'completed'), 0) AS total_commission
FROM trainer_sessions ts
JOIN profiles p ON p.id = ts.trainer_id
GROUP BY ts.brand_id, ts.trainer_id, p.full_name,
         DATE_TRUNC('month', ts.scheduled_at)::DATE;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL   ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT ALL   ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_brand_id()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_brand_admin()    TO authenticated;
