-- Add contact fields to brands table (used by the admin settings page)
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS business_email TEXT,
  ADD COLUMN IF NOT EXISTS phone          TEXT,
  ADD COLUMN IF NOT EXISTS address        TEXT;
