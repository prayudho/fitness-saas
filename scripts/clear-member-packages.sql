-- clear-member-packages.sql
-- Wipes all per-member subscription, transaction, and package template data.
-- Keeps: profiles (accounts), brands, trainers, trainer_availability,
--        class_types, classes, promo_codes.
--
-- Run via Supabase dashboard SQL editor, or:
--   npx supabase db query --linked --file scripts/clear-member-packages.sql

-- Commissions and sessions (depend on pt_assignments)
DELETE FROM pt_commission_payouts;
DELETE FROM trainer_sessions;

-- PT assignments (depend on memberships)
DELETE FROM pt_assignments;

-- Class bookings (depend on memberships)
DELETE FROM class_bookings;

-- Membership support tables
DELETE FROM membership_reminders_sent;
DELETE FROM membership_freezes;

-- Invoices and check-ins (depend on memberships)
DELETE FROM checkins;
DELETE FROM invoices;

-- Member subscriptions
DELETE FROM memberships;

-- Package templates (must be after memberships)
DELETE FROM membership_packages;
