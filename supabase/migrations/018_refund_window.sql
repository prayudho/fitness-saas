-- Add configurable refund window per brand (default 1 day)
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS refund_window_days INT NOT NULL DEFAULT 1;
