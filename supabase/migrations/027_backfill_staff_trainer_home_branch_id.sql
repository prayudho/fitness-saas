-- =============================================================================
-- Migration 027: Backfill home_branch_id for staff and trainer profiles
--
-- Migration 023 seeded staff_branches and trainer_branches from Main Branch
-- but never wrote back to profiles.home_branch_id for those roles.
-- As a result the branch manager team page (which filters by home_branch_id)
-- returned an empty list for all existing staff and trainers.
--
-- inviteTeamMember already sets home_branch_id correctly for new staff/trainers,
-- so this migration only fixes rows that were created before that logic existed.
-- =============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN

  -- Staff: derive primary branch from staff_branches
  UPDATE profiles p
  SET    home_branch_id = sb.branch_id
  FROM   staff_branches sb
  WHERE  sb.profile_id = p.id
    AND  sb.is_primary  = true
    AND  p.role::text   = 'staff'
    AND  p.home_branch_id IS NULL
    AND  p.brand_id IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled home_branch_id for % staff profiles', v_count;

  -- Trainers: derive primary branch from trainer_branches
  -- trainers.id = profiles.id (both are auth.users.id)
  UPDATE profiles p
  SET    home_branch_id = tb.branch_id
  FROM   trainer_branches tb
  WHERE  tb.trainer_id  = p.id
    AND  tb.is_primary  = true
    AND  p.role::text   = 'trainer'
    AND  p.home_branch_id IS NULL
    AND  p.brand_id IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled home_branch_id for % trainer profiles', v_count;

END;
$$;
