-- Step 1: Add 'support' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'support';

-- Step 2: Create custom_roles table (must exist before FK on profiles)
CREATE TABLE IF NOT EXISTS custom_roles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  permissions  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_by   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT custom_roles_brand_name_unique UNIQUE (brand_id, name)
);

-- Step 3: Add new columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS custom_role_id     UUID    REFERENCES custom_roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active           BOOLEAN NOT NULL DEFAULT true;

-- Step 4: Indexes
CREATE INDEX IF NOT EXISTS idx_custom_roles_brand    ON custom_roles (brand_id);
CREATE INDEX IF NOT EXISTS idx_profiles_custom_role  ON profiles (custom_role_id) WHERE custom_role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_active    ON profiles (brand_id, is_active);

-- Step 5: RLS for custom_roles
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_roles_select" ON custom_roles FOR SELECT USING (
  is_superadmin() OR brand_id = get_my_brand_id()
);
CREATE POLICY "custom_roles_insert" ON custom_roles FOR INSERT WITH CHECK (
  is_superadmin() OR (brand_id = get_my_brand_id() AND get_my_role() = 'admin')
);
CREATE POLICY "custom_roles_update" ON custom_roles FOR UPDATE USING (
  is_superadmin() OR (brand_id = get_my_brand_id() AND get_my_role() = 'admin')
);
CREATE POLICY "custom_roles_delete" ON custom_roles FOR DELETE USING (
  is_superadmin() OR (brand_id = get_my_brand_id() AND get_my_role() = 'admin')
);

-- Step 6: Update handle_new_user trigger to honour must_change_password from app_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_app_meta_data ->> 'role')::public.user_role, 'member'::public.user_role),
    COALESCE((NEW.raw_app_meta_data ->> 'must_change_password')::boolean, true)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
