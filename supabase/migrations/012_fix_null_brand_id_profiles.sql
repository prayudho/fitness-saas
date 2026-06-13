-- =============================================================================
-- Migration 012: Fix profiles with null brand_id
--
-- Migration 008 broke profile creation, leaving some profiles with brand_id = null.
-- These cause FK violations in tables that have composite FKs (migration 011).
--
-- Strategy:
--   1. Delete null-brand_id shell profiles where the user already has a valid
--      profile for the same brand (would violate the unique constraint).
--   2. Update remaining null-brand_id profiles with the inferred brand_id.
-- =============================================================================

-- ─── Step 1: Delete redundant null-brand_id profiles ──────────────────────────

-- Delete null-brand_id trainer profiles where a valid profile already exists
DELETE FROM public.profiles p
USING public.trainers t
WHERE p.id = t.id
  AND p.brand_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id = t.id
      AND p2.brand_id = t.brand_id
  );

-- Delete null-brand_id member profiles where a valid profile already exists
DELETE FROM public.profiles p
USING public.memberships m
WHERE p.id = m.member_id
  AND p.brand_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id = m.member_id
      AND p2.brand_id = m.brand_id
  );

-- Delete null-brand_id profiles where a valid profile exists (from invoices)
DELETE FROM public.profiles p
USING public.invoices i
WHERE p.id = i.member_id
  AND p.brand_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.id = i.member_id
      AND p2.brand_id = i.brand_id
  );

-- ─── Step 2: Update remaining null-brand_id profiles ──────────────────────────

-- Fix trainer profiles with null brand_id
UPDATE public.profiles p
SET brand_id = t.brand_id
FROM public.trainers t
WHERE p.id = t.id
  AND p.brand_id IS NULL
  AND t.brand_id IS NOT NULL;

-- Fix member profiles with null brand_id (from memberships)
UPDATE public.profiles p
SET brand_id = m.brand_id
FROM public.memberships m
WHERE p.id = m.member_id
  AND p.brand_id IS NULL
  AND m.brand_id IS NOT NULL;

-- Fix remaining profiles with null brand_id (from invoices)
UPDATE public.profiles p
SET brand_id = i.brand_id
FROM public.invoices i
WHERE p.id = i.member_id
  AND p.brand_id IS NULL
  AND i.brand_id IS NOT NULL;

-- Fix any remaining via checkins
UPDATE public.profiles p
SET brand_id = c.brand_id
FROM public.checkins c
WHERE p.id = c.member_id
  AND p.brand_id IS NULL
  AND c.brand_id IS NOT NULL;
