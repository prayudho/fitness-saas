-- =============================================================================
-- Migration 015: Backfill package_category on memberships from linked package
--
-- When the package_category column was introduced on memberships, older rows
-- (created before activateMembership started denormalising the category) were
-- left with NULL.  As a result, the member portal cannot distinguish PT/bundled
-- memberships from gym-access ones — the PT Sessions card is never rendered and
-- the assigned trainer is never fetched.
--
-- Fix: copy package_category from the linked membership_packages row for every
-- membership row that currently has it NULL.
-- =============================================================================

UPDATE public.memberships AS m
SET    package_category = mp.package_category
FROM   public.membership_packages AS mp
WHERE  m.package_id  = mp.id
  AND  m.package_category IS NULL
  AND  mp.package_category IS NOT NULL;
