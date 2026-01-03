-- Script to FIX existing incorrect next_payment_due_date for affected members
-- Run this AFTER applying the trigger migration
-- This will recalculate and fix dates for members with incorrect due dates

-- ============================================================================
-- STEP 1: Create a function to recalculate dates for a specific member
-- ============================================================================

CREATE OR REPLACE FUNCTION fix_member_due_date(p_member_id UUID)
RETURNS TABLE(
  member_name TEXT,
  old_due_date DATE,
  new_due_date DATE,
  fixed BOOLEAN
) AS $$
DECLARE
  v_member RECORD;
  v_plan RECORD;
  v_total_months INTEGER;
  v_joining_day INTEGER;
  v_payment_count INTEGER;
  v_expected_due_date DATE;
  v_membership_end_date DATE;
  v_last_day_of_month INTEGER;
BEGIN
  -- Get member details
  SELECT 
    m.id,
    m.full_name,
    m.joining_date,
    m.plan_id,
    m.next_payment_due_date,
    m.membership_plan
  INTO v_member
  FROM gym_members m
  WHERE m.id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found: %', p_member_id;
  END IF;

  -- Get plan details
  SELECT 
    COALESCE(base_duration_months, duration_months, 1) as base_months,
    COALESCE(bonus_duration_months, 0) as bonus_months
  INTO v_plan
  FROM gym_membership_plans
  WHERE id = v_member.plan_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Plan not found for member %. Cannot fix dates.', v_member.full_name;
    RETURN;
  END IF;

  -- Calculate total months
  v_total_months := v_plan.base_months + v_plan.bonus_months;

  -- Get joining day
  v_joining_day := EXTRACT(DAY FROM v_member.joining_date::DATE);

  -- Count payments made
  SELECT COUNT(*) INTO v_payment_count
  FROM gym_payments
  WHERE member_id = p_member_id;

  -- Calculate expected next due date
  -- Formula: joining_date + (total_months * payment_count)
  v_expected_due_date := (v_member.joining_date::DATE + (v_total_months * v_payment_count || ' months')::INTERVAL)::DATE;

  -- Adjust to maintain joining day
  v_last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('MONTH', v_expected_due_date) + INTERVAL '1 MONTH' - INTERVAL '1 DAY')::DATE);
  v_expected_due_date := DATE_TRUNC('MONTH', v_expected_due_date)::DATE + (LEAST(v_joining_day, v_last_day_of_month) - 1);

  -- Membership end date is 1 day before
  v_membership_end_date := v_expected_due_date - INTERVAL '1 day';

  -- Update the member
  UPDATE gym_members
  SET 
    next_payment_due_date = v_expected_due_date,
    membership_end_date = v_membership_end_date,
    updated_at = NOW()
  WHERE id = p_member_id;

  -- Return the result
  RETURN QUERY
  SELECT 
    v_member.full_name::TEXT,
    v_member.next_payment_due_date,
    v_expected_due_date,
    TRUE;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Fix specific members (Ravi and Pandira)
-- ============================================================================

-- NOTE: Replace these member IDs with actual IDs from your database
-- You can find them by running:
-- SELECT id, full_name, phone FROM gym_members WHERE full_name ILIKE '%ravi%' OR full_name ILIKE '%pandira%';

-- Example usage (replace with actual member IDs):
-- SELECT * FROM fix_member_due_date('PASTE_RAVI_MEMBER_ID_HERE'::UUID);
-- SELECT * FROM fix_member_due_date('PASTE_PANDIRA_MEMBER_ID_HERE'::UUID);

-- ============================================================================
-- STEP 3: OR Fix ALL active members (use with caution!)
-- ============================================================================

-- Uncomment this to fix ALL active members at once:
/*
DO $$
DECLARE
  v_member RECORD;
  v_result RECORD;
BEGIN
  FOR v_member IN 
    SELECT id, full_name 
    FROM gym_members 
    WHERE status = 'active' 
      AND plan_id IS NOT NULL
  LOOP
    BEGIN
      SELECT * INTO v_result FROM fix_member_due_date(v_member.id);
      RAISE NOTICE 'Fixed: % | Old: % → New: %', 
        v_result.member_name, 
        v_result.old_due_date, 
        v_result.new_due_date;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to fix member %: %', v_member.full_name, SQLERRM;
    END;
  END LOOP;
END $$;
*/

-- ============================================================================
-- STEP 4: Verification query
-- ============================================================================

-- Run this to verify the fixes:
SELECT 
  m.full_name,
  m.joining_date,
  p.name as plan_name,
  COALESCE(p.base_duration_months, p.duration_months) as base_months,
  COALESCE(p.bonus_duration_months, 0) as bonus_months,
  (COALESCE(p.base_duration_months, p.duration_months) + COALESCE(p.bonus_duration_months, 0)) as total_months,
  (SELECT COUNT(*) FROM gym_payments WHERE member_id = m.id) as payment_count,
  m.next_payment_due_date,
  -- Expected date calculation for verification:
  (m.joining_date::DATE + ((COALESCE(p.base_duration_months, p.duration_months) + COALESCE(p.bonus_duration_months, 0)) * (SELECT COUNT(*) FROM gym_payments WHERE member_id = m.id) || ' months')::INTERVAL)::DATE as expected_due_date,
  CASE 
    WHEN m.next_payment_due_date = (m.joining_date::DATE + ((COALESCE(p.base_duration_months, p.duration_months) + COALESCE(p.bonus_duration_months, 0)) * (SELECT COUNT(*) FROM gym_payments WHERE member_id = m.id) || ' months')::INTERVAL)::DATE
    THEN '✅ Correct'
    ELSE '❌ Needs Fix'
  END as status
FROM gym_members m
LEFT JOIN gym_membership_plans p ON m.plan_id = p.id
WHERE m.status = 'active'
  AND m.plan_id IS NOT NULL
ORDER BY m.full_name;
