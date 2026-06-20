-- Backfill branch_id on invoices and memberships that were created before
-- assignPackage / createInvoice started setting branch_id from the member's
-- home_branch_id. Without this, branch managers cannot see these records
-- because the invoices_select RLS policy requires branch_id = get_my_branch_id().

UPDATE invoices i
SET branch_id = p.home_branch_id
FROM profiles p
WHERE i.member_id = p.id
  AND i.branch_id IS NULL
  AND p.home_branch_id IS NOT NULL;

UPDATE memberships m
SET branch_id = p.home_branch_id
FROM profiles p
WHERE m.member_id = p.id
  AND m.branch_id IS NULL
  AND p.home_branch_id IS NOT NULL;
