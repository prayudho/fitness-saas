-- =============================================================================
-- Migration 026: Backfill trainer_branches for trainers added after migration 023
-- =============================================================================
-- Migration 023 seeded trainer_branches only for trainers that existed at the
-- time. Any trainer created after that migration has no trainer_branches row
-- and will not appear in branch-filtered queries.
--
-- Fix: for each trainer without any trainer_branches entry, assign them to
-- the branch stored in their profile's home_branch_id. Fall back to the
-- brand's earliest branch if home_branch_id is null.
-- =============================================================================

INSERT INTO trainer_branches (trainer_id, branch_id, is_primary)
SELECT
  t.id,
  COALESCE(
    p.home_branch_id,
    (SELECT id FROM branches WHERE brand_id = t.brand_id ORDER BY created_at LIMIT 1)
  ),
  true
FROM trainers t
JOIN profiles p ON p.id = t.id
WHERE NOT EXISTS (
  SELECT 1 FROM trainer_branches tb WHERE tb.trainer_id = t.id
)
AND COALESCE(
  p.home_branch_id,
  (SELECT id FROM branches WHERE brand_id = t.brand_id ORDER BY created_at LIMIT 1)
) IS NOT NULL
ON CONFLICT (trainer_id, branch_id) DO NOTHING;
