-- Remove soft-deleted cancelled invoices and their orphaned memberships.
-- These were created by the old cancelPendingPackage() which set status='cancelled'
-- instead of hard-deleting. Going forward, cancellations are hard-deleted.

-- Step 1: collect membership IDs linked only to cancelled invoices (no paid/pending/etc.)
-- Then delete those memberships only if they have no checkins.
DO $$
DECLARE
  orphan_membership_id uuid;
BEGIN
  FOR orphan_membership_id IN
    SELECT m.id
    FROM memberships m
    WHERE m.status = 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM checkins c WHERE c.membership_id = m.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM trainer_sessions ts WHERE ts.membership_id = m.id
      )
  LOOP
    -- Delete any cancelled invoices linked to this membership first
    DELETE FROM invoices
    WHERE membership_id = orphan_membership_id
      AND status = 'cancelled';

    -- Delete the membership
    DELETE FROM memberships WHERE id = orphan_membership_id;
  END LOOP;
END $$;

-- Step 2: delete any remaining cancelled invoices not linked to a membership
DELETE FROM invoices
WHERE status = 'cancelled'
  AND membership_id IS NULL;
