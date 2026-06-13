-- Add brand customization fields referenced by the settings module
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS secondary_color TEXT,
  ADD COLUMN IF NOT EXISTS timezone        TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  ADD COLUMN IF NOT EXISTS currency        TEXT NOT NULL DEFAULT 'IDR';
