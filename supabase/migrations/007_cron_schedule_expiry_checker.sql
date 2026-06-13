-- Schedule the membership-expiry-checker edge function to run daily at 08:00 WIB (01:00 UTC).
-- Requires pg_cron and pg_net extensions (both enabled by default on Supabase).
--
-- To update the CRON_SECRET: run this migration again after changing the secret,
-- or unschedule + reschedule via:
--   SELECT cron.unschedule('membership-expiry-checker-daily');
--   then re-push this migration with the new secret.

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing schedule with this name to allow idempotent re-runs
SELECT cron.unschedule('membership-expiry-checker-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'membership-expiry-checker-daily'
);

-- Schedule: every day at 01:00 UTC = 08:00 WIB
SELECT cron.schedule(
  'membership-expiry-checker-daily',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://kfpnsmgyotiunvjzqapw.supabase.co/functions/v1/membership-expiry-checker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer a8f3k2m9x1q7w4e6r5t0y2u8i3o9p1l5"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
